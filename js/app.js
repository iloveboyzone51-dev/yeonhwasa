/**
 * [메인 애플리케이션 컨트롤러 - js/app.js]
 * - 3개 캔버스 (산사 경내 / 대웅전 참배 / 주지스님 다실 독대) 통합 관리
 * - 실제 스님 목소리 불교 경전 BGM 플레이어 및 볼륨 컨트롤
 * - 연령대 + 10종 헤어스타일 + 법복 컬러 커스터마이징 UI
 * - 경내 가족 연등 클릭 팝업 및 현실 공양 보시금 시스템
 * - 실제 6단계 시간대 & 자연 순환 날씨 연동
 */

class TempleAppController {
  constructor() {
    this.currentTab = "courtyard";
    this.selectedAgeGroup = "adult";
    this.selectedFaceStyle = "gentle_smile";
    this.selectedHairStyle = "chignon";
    this.selectedOutfitColor = "grey";
    this.clockTimer = null;
    this.activeDetailWish = null;

    // [개선 7] 자동 목탁 정진 상태
    this.isAutoMoktak = false;
    this.autoMoktakSpeed = 900; // ms
    this.autoMoktakInterval = null;
  }

  init() {
    // 1. 4개 캔버스 연결 (경내, 대웅전, 다실 독대, 삼성각 전각)
    const courtyardCanvas = document.getElementById("courtyard-canvas");
    const hallCanvas = document.getElementById("hall-canvas");
    const monkCanvas = document.getElementById("monk-room-canvas");
    const samCanvas = document.getElementById("samseonggak-canvas");
    window.templeGraphics.attachCanvases(courtyardCanvas, hallCanvas, monkCanvas, samCanvas);

    // 2. 상태 변경 구독
    window.templeState.subscribe(() => {
      this.renderHeaderAndStats();
      this.renderOfferingsList();
      this.renderWishesBoard();
      this.renderTempleProgressModalContent();
      this.renderFamilyActivityTicker();
    });

    // 3. [개선 5] BGM 플레이어 및 드롭다운 초기화
    this.initBgmControls();

    this.renderCustomSelectors();
    this.bindEvents();
    this.startClock();

    // 클라우드 동기화 시도
    window.templeState.pullFromCloudIfConfigured();

    // [개선 4] 세션 로그인 또는 기존 불자 분기 체크
    if (window.templeState.currentUser) {
      const checkIn = window.templeState.processDailyCheckIn(window.templeState.currentUser);
      if (checkIn.granted) {
        window.templeState.saveState();
        this.showToast(`🙏 오늘 출석 공덕 +${checkIn.merit}점과 공양 보시금 +${checkIn.donation.toLocaleString()}원이 지급되었습니다!`);
      }
      this.hideLoginOverlay();
    } else {
      this.showLoginOverlay();
    }

    this.renderHeaderAndStats();
    this.renderOfferingsList();
    this.renderWishesBoard();
    this.renderMonkQuickButtons();
    this.renderFamilyActivityTicker();
  }

  /**
   * [개선 5] 실제 스님 독경 음원 9곡 드롭다운 및 볼륨 연동 초기화
   */
  initBgmControls() {
    const trackSelect = document.getElementById("bgm-track-select");
    if (trackSelect && window.TEMPLE_CONFIG.buddhistPlaylists) {
      trackSelect.innerHTML = "";
      window.TEMPLE_CONFIG.buddhistPlaylists.forEach((track, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = `${idx + 1}. ${track.title} (${track.artist})`;
        trackSelect.appendChild(opt);
      });

      trackSelect.addEventListener("change", (e) => {
        const idx = parseInt(e.target.value, 10);
        window.templeAudio.playTrack(idx);
      });
    }

    // 볼륨 텍스트 초기화
    const volSlider = document.getElementById("bgm-volume-slider");
    const volText = document.getElementById("bgm-volume-text");
    if (volSlider && volText) {
      volText.textContent = `${Math.round(volSlider.value * 100)}%`;
      volSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        volText.textContent = `${Math.round(val * 100)}%`;
        window.templeAudio.setVolume(val);
      });
    }

    // BGM 플레이어 트랙 변경 리스너 연결
    window.templeAudio.setTrackChangeListener((track, isPlaying, index) => {
      const titleEl = document.getElementById("bgm-current-title");
      const playBtn = document.getElementById("btn-bgm-play-toggle");
      const discIcon = document.getElementById("bgm-disc-anim");

      if (titleEl && track) {
        titleEl.textContent = `${track.title} (${track.artist})`;
      }
      if (trackSelect && typeof index === "number") {
        trackSelect.value = index;
      }
      if (playBtn) {
        playBtn.innerHTML = isPlaying ? "⏸️ 멈춤" : "▶️ 재생";
      }
      if (discIcon) {
        if (isPlaying) discIcon.classList.add("spinning");
        else discIcon.classList.remove("spinning");
      }
    });
  }

  /**
   * [개선 3] 커스텀 캐릭터 선택 UI (얼굴 4종 + 10종 헤어 + 5종 법복 컬러 + 연령대 4종) 동적 생성
   */
  renderCustomSelectors() {
    // 1. 얼굴 표정 4종 선택 그리드
    const faceContainer = document.getElementById("face-style-selector");
    if (faceContainer && window.TEMPLE_CONFIG.faceStyles) {
      faceContainer.innerHTML = "";
      window.TEMPLE_CONFIG.faceStyles.forEach((fs) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `face-choice-btn ${fs.id === this.selectedFaceStyle ? "active" : ""}`;
        btn.dataset.face = fs.id;
        btn.textContent = fs.name;
        btn.title = fs.desc;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".face-choice-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.selectedFaceStyle = fs.id;
          this.updateCharacterPreview();
        });
        faceContainer.appendChild(btn);
      });
    }

    // 2. 10종 헤어스타일 선택 그리드
    const hairContainer = document.getElementById("hair-style-selector");
    if (hairContainer && window.TEMPLE_CONFIG.hairStyles) {
      hairContainer.innerHTML = "";
      window.TEMPLE_CONFIG.hairStyles.forEach((hs) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `hair-choice-btn ${hs.id === this.selectedHairStyle ? "active" : ""}`;
        btn.dataset.hair = hs.id;
        btn.title = hs.desc;
        btn.innerHTML = `<span class="hair-icon">${hs.icon}</span><span class="hair-name">${hs.name}</span>`;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".hair-choice-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.selectedHairStyle = hs.id;
          this.updateCharacterPreview();
        });
        hairContainer.appendChild(btn);
      });
    }

    // 3. 5종 법복 의상 컬러 선택 그리드
    const outfitContainer = document.getElementById("outfit-color-selector");
    if (outfitContainer && window.TEMPLE_CONFIG.outfitColors) {
      outfitContainer.innerHTML = "";
      window.TEMPLE_CONFIG.outfitColors.forEach((oc) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `outfit-choice-btn ${oc.id === this.selectedOutfitColor ? "active" : ""}`;
        btn.dataset.outfit = oc.id;
        btn.title = oc.desc;
        btn.innerHTML = `<span class="color-dot" style="background:${oc.color};"></span><span>${oc.name}</span>`;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".outfit-choice-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.selectedOutfitColor = oc.id;
          this.updateCharacterPreview();
        });
        outfitContainer.appendChild(btn);
      });
    }

    // 4. 연령대 선택 그리드
    const ageContainer = document.getElementById("age-group-selector");
    if (ageContainer && window.TEMPLE_CONFIG.ageGroups) {
      ageContainer.innerHTML = "";
      window.TEMPLE_CONFIG.ageGroups.forEach((ag) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `age-choice-btn ${ag.id === this.selectedAgeGroup ? "active" : ""}`;
        btn.dataset.age = ag.id;
        btn.textContent = ag.label;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".age-choice-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.selectedAgeGroup = ag.id;
          this.updateCharacterPreview();
        });
        ageContainer.appendChild(btn);
      });
    }

    // 초기 미리보기 1회 렌더링
    this.updateCharacterPreview();
  }

  /**
   * [개선 3] 게임 스타일 캐릭터 실시간 미리보기 미니 캔버스 업데이트
   */
  updateCharacterPreview() {
    const previewCanvas = document.getElementById("character-preview-canvas");
    if (previewCanvas && window.templeGraphics && typeof window.templeGraphics.renderCharacterPreview === "function") {
      window.templeGraphics.renderCharacterPreview(
        previewCanvas,
        this.selectedFaceStyle,
        this.selectedHairStyle,
        this.selectedOutfitColor,
        this.selectedAgeGroup
      );
    }
  }

  bindEvents() {
    // 1. [개선 3 & 4] 간편 로그인/가입 & 재접속 바로입장 이벤트
    const btnQuickEnter = document.getElementById("btn-quick-enter");
    if (btnQuickEnter) {
      btnQuickEnter.addEventListener("click", () => {
        const existingUser = window.templeState.currentUser || window.templeState.getLastActiveUser();
        if (existingUser) {
          window.templeState.quickLogin(existingUser);
          this.hideLoginOverlay();
          window.templeAudio.playWindChime();
          window.templeAudio.startNatureAmbience();
          this.showToast(`🙏 ${existingUser.name} 불자님, 도량에 평안히 머무르소서.`);
        }
      });
    }

    const btnShowFullLogin = document.getElementById("btn-show-full-login");
    if (btnShowFullLogin) {
      btnShowFullLogin.addEventListener("click", () => {
        const welcomeBackCard = document.getElementById("welcome-back-card");
        const welcomeFormCard = document.getElementById("welcome-form-card");
        if (welcomeBackCard) welcomeBackCard.style.display = "none";
        if (welcomeFormCard) {
          welcomeFormCard.style.display = "block";
          this.updateCharacterPreview();
        }
      });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("login-name").value;
        const pinInput = document.getElementById("login-pin").value;
        const res = window.templeState.loginOrRegister(
          nameInput,
          pinInput,
          this.selectedAgeGroup,
          this.selectedFaceStyle,
          this.selectedHairStyle,
          this.selectedOutfitColor
        );

        const msgEl = document.getElementById("login-error-msg");
        if (!res.success) {
          msgEl.textContent = res.message;
          msgEl.style.display = "block";
          return;
        }
        msgEl.style.display = "none";
        window.templeAudio.playTempleBell(true);
        window.templeAudio.startNatureAmbience();
        this.hideLoginOverlay();
        this.showToast(res.message);
      });
    }

    // 기존 가입 가족 칩 클릭
    document.getElementById("existing-family-chips")?.addEventListener("click", (e) => {
      const chip = e.target.closest(".family-user-chip");
      if (!chip) return;
      document.getElementById("login-name").value = chip.dataset.name;
      document.getElementById("login-pin").focus();
    });

    // 2. 하단 탭 네비게이션
    document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // 3. 실제 스님 독경 BGM 컨트롤러
    document.getElementById("btn-bgm-play-toggle")?.addEventListener("click", () => {
      window.templeAudio.toggleBgm();
    });
    document.getElementById("btn-bgm-prev")?.addEventListener("click", () => {
      window.templeAudio.playPrevTrack();
    });
    document.getElementById("btn-bgm-next")?.addEventListener("click", () => {
      window.templeAudio.playNextTrack();
    });
    // [개선 2] 사찰 전체 소리 끄기/켜기 토글
    document.getElementById("btn-toggle-sound-mute")?.addEventListener("click", () => {
      const isMuted = window.templeAudio.toggleMute();
      const muteBtn = document.getElementById("btn-toggle-sound-mute");
      if (muteBtn) {
        muteBtn.innerHTML = isMuted ? "🔇 묵언" : "🔊 소리";
      }
      this.showToast(isMuted ? "🔇 모든 사찰 소리를 껐습니다 (묵언)." : "🔊 사찰 소리를 켰습니다.");
    });
    document.getElementById("bgm-volume-slider")?.addEventListener("input", (e) => {
      window.templeAudio.setVolume(parseFloat(e.target.value));
    });

    // 4. 상단 설정 & 계정 전환
    document.getElementById("btn-switch-user")?.addEventListener("click", () => {
      this.tempActiveUser = window.templeState.currentUser;
      this.showLoginOverlay(true);
    });

    // [개선 1] 계정전환/로그인 취소하고 도량 복귀
    document.querySelectorAll(".btn-cancel-login-overlay").forEach((btn) => {
      btn.addEventListener("click", () => {
        const user = window.templeState.currentUser || this.tempActiveUser;
        if (user) {
          window.templeState.currentUser = user;
          this.hideLoginOverlay();
          this.showToast(`🙏 ${user.name} 불자님, 도량으로 돌아왔습니다.`);
        } else {
          this.showToast("이름과 비밀번호를 입력하고 도량에 첫 입산해 주세요.");
        }
      });
    });
    document.getElementById("btn-open-settings-modal")?.addEventListener("click", () => {
      this.loadSettingsForm();
      this.openModal("modal-settings");
    });
    document.getElementById("btn-open-build-modal")?.addEventListener("click", () => {
      this.openModal("modal-temple-build");
    });

    // 5. 경내 액션 버튼
    document.getElementById("btn-enter-hall")?.addEventListener("click", () => {
      this.switchTab("hall");
    });
    // [개선 5 & 개선 3] 삼성각(산신·칠성당) 전각 내부 직접 입장
    document.getElementById("btn-enter-samseonggak")?.addEventListener("click", () => {
      window.templeAudio.playWindChime();
      this.switchTab("samseonggak");
    });
    document.getElementById("btn-ring-bell")?.addEventListener("click", () => {
      window.templeAudio.playTempleBell(true);
      window.templeGraphics.addFloatingText("🔔 범종 타종 축원 (+500원)", 190, 220, "#ffd54f");
      if (window.templeState.currentUser) {
        window.templeState.currentUser.donationMoney = (window.templeState.currentUser.donationMoney || 0) + 500;
        window.templeState.state.templeMerit += 2;
        window.templeState.saveState();
      }
      this.showToast("🔔 범종 소리가 온 도량에 울려 퍼집니다. (보시금 +500원)");
    });
    document.getElementById("btn-go-monk-tea")?.addEventListener("click", () => {
      this.switchTab("monk");
    });
    document.getElementById("btn-quick-hang-wish")?.addEventListener("click", () => {
      this.switchTab("wishes");
    });

    // [개선 5] 삼성각 모달 내 촛불 공양 및 축원 핸들러
    document.getElementById("btn-samseonggak-candle")?.addEventListener("click", () => {
      const user = window.templeState.currentUser;
      if (!user) {
        this.showToast("로그인이 필요합니다.");
        return;
      }
      const price = 2000;
      if ((user.donationMoney || 0) < price) {
        this.showToast(`보시금이 부족합니다. (현재: ${(user.donationMoney || 0).toLocaleString()}원 / 필요: 2,000원)`);
        return;
      }
      user.donationMoney -= price;
      window.templeState.state.templeMerit += 10;
      window.templeState.addActivityLog(`${user.name} 불자님이 삼성각에 가족 무병장수 촛불을 올리셨습니다. 🕯️ (+10점 불사)`);
      window.templeState.saveState();
      window.templeAudio.playTempleBell(false);
      this.closeModal("modal-samseonggak");
      this.showToast("🕯️ 산신·칠성님 전에 가족 무병장수 촛불을 환하게 밝혔습니다. 성불하십시오! 🙏");
    });

    document.getElementById("btn-samseonggak-sanshin")?.addEventListener("click", () => {
      const user = window.templeState.currentUser;
      if (user) {
        user.donationMoney = (user.donationMoney || 0) + 500;
        window.templeState.state.templeMerit += 5;
        window.templeState.addActivityLog(`${user.name} 불자님이 산신령님 전에 백년건강을 축원하셨습니다. 🐯`);
        window.templeState.saveState();
      }
      window.templeAudio.playWindChime();
      this.closeModal("modal-samseonggak");
      this.showToast("🐯 산신령님과 영험한 백호께서 가족의 건강과 만수무강을 굽어살피십니다. (+500원 보시금)");
    });

    document.getElementById("btn-samseonggak-chilseong")?.addEventListener("click", () => {
      const user = window.templeState.currentUser;
      if (user) {
        user.donationMoney = (user.donationMoney || 0) + 500;
        window.templeState.state.templeMerit += 5;
        window.templeState.addActivityLog(`${user.name} 불자님이 치성광여래 칠성부처님 전에 자손번창을 발원하셨습니다. ⭐`);
        window.templeState.saveState();
      }
      window.templeAudio.playWindChime();
      this.closeModal("modal-samseonggak");
      this.showToast("⭐ 칠성부처님의 자비광명이 자손들의 앞길을 환히 비추어 주십니다. (+500원 보시금)");
    });

    // [개선 3] 대웅전 부처님 전 발원문 선택 및 직접 입력 리스너
    const bowSelect = document.getElementById("bow-wish-select");
    const bowCustomInput = document.getElementById("bow-wish-custom-input");
    if (bowSelect && bowCustomInput) {
      bowSelect.addEventListener("change", (e) => {
        if (e.target.value === "custom") {
          bowCustomInput.style.display = "block";
          bowCustomInput.focus();
        } else {
          bowCustomInput.style.display = "none";
        }
      });
    }

    // 6. 대웅전 정통 7단계 오체투지 배례 (1배, 3배, 108배)
    const r = window.TEMPLE_CONFIG.rewards;
    document.getElementById("btn-bow-1")?.addEventListener("click", () => {
      this.startBowAction(1, r.bowSingleMerit, r.bowSingleDonation, false);
    });
    document.getElementById("btn-bow-3")?.addEventListener("click", () => {
      this.startBowAction(3, r.bowThreeMerit, r.bowThreeDonation, false);
    });
    document.getElementById("btn-bow-108")?.addEventListener("click", () => {
      this.startBowAction(108, r.bow108Merit, r.bow108Donation, false);
    });

    // [개선 3] 삼성각 전각 정통 7단계 오체투지 배례 (1배, 3배, 108배)
    document.getElementById("btn-sam-bow-1")?.addEventListener("click", () => {
      this.startBowAction(1, r.bowSingleMerit, r.bowSingleDonation, true);
    });
    document.getElementById("btn-sam-bow-3")?.addEventListener("click", () => {
      this.startBowAction(3, r.bowThreeMerit, r.bowThreeDonation, true);
    });
    document.getElementById("btn-sam-bow-108")?.addEventListener("click", () => {
      this.startBowAction(108, r.bow108Merit, r.bow108Donation, true);
    });

    // 삼성각 발원문 선택기
    const samWishSelect = document.getElementById("sam-wish-select");
    const samWishCustom = document.getElementById("sam-wish-custom-input");
    if (samWishSelect) {
      samWishSelect.addEventListener("change", (e) => {
        if (e.target.value === "custom") {
          samWishCustom.style.display = "block";
          samWishCustom.focus();
        } else {
          samWishCustom.style.display = "none";
          window.templeGraphics.setBowSupplication(e.target.value);
        }
      });
    }
    if (samWishCustom) {
      samWishCustom.addEventListener("input", (e) => {
        window.templeGraphics.setBowSupplication(e.target.value.trim());
      });
    }

    // 삼성각 내부 버튼 (경내로 나가기 & 촛불 공양)
    document.getElementById("btn-sam-leave")?.addEventListener("click", () => {
      this.switchTab("courtyard");
    });
    document.getElementById("btn-sam-candle-inline")?.addEventListener("click", () => {
      const user = window.templeState.currentUser;
      if (!user) {
        this.showToast("로그인이 필요합니다.");
        return;
      }
      const price = 2000;
      if ((user.donationMoney || 0) < price) {
        this.showToast(`보시금이 부족합니다. (현재: ${(user.donationMoney || 0).toLocaleString()}원 / 필요: 2,000원)`);
        return;
      }
      user.donationMoney -= price;
      window.templeState.state.templeMerit += 10;
      window.templeState.addActivityLog(`${user.name} 불자님이 삼성각에 가족 무병장수 촛불을 올리셨습니다. 🕯️ (+10점 불사)`);
      window.templeState.saveState();
      window.templeAudio.playTempleBell(false);
      window.templeGraphics.addFloatingText("🕯️ 무병장수 촛불 공양 (+10점)", 195, 180, "#ffd54f");
      this.showToast("🕯️ 삼성각 산신령님과 칠성부처님 전에 가족 무병장수 촛불을 환하게 밝혔습니다. 성불하십시오! 🙏");
    });

    document.getElementById("btn-hit-moktak")?.addEventListener("click", () => {
      this.hitMoktak();
    });

    // [개선 7] 자동 목탁 토글 및 속도 변경 이벤트
    document.getElementById("btn-toggle-auto-moktak")?.addEventListener("click", () => {
      this.toggleAutoMoktak();
    });

    document.querySelectorAll(".speed-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".speed-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        this.autoMoktakSpeed = parseInt(chip.dataset.speed, 10) || 900;
        if (this.isAutoMoktak) {
          this.stopAutoMoktak();
          this.startAutoMoktak();
        }
      });
    });

    document.getElementById("btn-open-offering-modal")?.addEventListener("click", () => {
      this.renderOfferingsList();
      this.openModal("modal-offerings");
    });

    // 7. 주지스님 차담 대화
    const chatForm = document.getElementById("monk-chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("monk-chat-input");
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        this.sendMonkMessage(text);
      });
    }

    // 8. 가족 소원 연등 달기
    const wishForm = document.getElementById("wish-form");
    if (wishForm) {
      wishForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const category = document.getElementById("wish-category").value;
        const contentInput = document.getElementById("wish-content");
        const res = window.templeState.addWishLantern(category, contentInput.value);
        if (!res.success) {
          this.showToast(res.message);
          return;
        }
        contentInput.value = "";
        window.templeAudio.playWindChime();
        this.showToast(`🏮 가족 소원 연등을 경내에 걸었습니다! (+${res.rewardDonation.toLocaleString()}원 보시금)`);
        if (res.leveledUp) {
          window.templeAudio.playTempleBell(true);
          this.showToast(`🎉 경축! 사찰이 [${res.newLevelInfo.name}](으)로 증축되었습니다!`);
        }
      });
    }

    // 연등 상세 모달 내 합장 축원 버튼
    document.getElementById("btn-pray-in-modal")?.addEventListener("click", () => {
      if (this.activeDetailWish) {
        const res = window.templeState.prayForWish(this.activeDetailWish.id);
        if (res && res.alreadyPrayed) {
          this.showToast(res.message);
          return;
        }
        window.templeAudio.playMoktak(20);
        this.showToast(res ? res.message : `🙏 ${this.activeDetailWish.authorName}님의 소원에 함께 합장 축원하였습니다.`);
        this.closeModal("modal-wish-detail");
      }
    });

    // 9. 모달 닫기
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.closeModal(btn.dataset.closeModal);
      });
    });

    // 10. 설정 저장
    document.getElementById("settings-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      window.templeState.state.templeName = document.getElementById("setting-temple-name").value.trim() || "연화사(蓮華寺)";
      window.templeState.state.settings.geminiApiKey = document.getElementById("setting-gemini-key").value.trim();
      window.templeState.state.settings.supabaseUrl = document.getElementById("setting-supabase-url").value.trim();
      window.templeState.state.settings.supabaseKey = document.getElementById("setting-supabase-key").value.trim();
      window.templeState.saveState();
      this.closeModal("modal-settings");
      this.showToast("24시간 사찰 공유 설정이 저장되었습니다. 🙏");
    });
  }

  switchTab(tabName) {
    if (tabName !== "hall") {
      this.stopAutoMoktak();
    }
    this.currentTab = tabName;
    document.querySelectorAll(".nav-tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `panel-${tabName}`);
    });

    if (tabName === "courtyard") {
      window.templeGraphics.setScene("courtyard");
      window.templeAudio.startNatureAmbience();
    } else if (tabName === "hall") {
      window.templeGraphics.setScene("hall");
      window.templeAudio.playTempleBell(false);
    } else if (tabName === "samseonggak") {
      window.templeGraphics.setScene("samseonggak");
      window.templeAudio.playWindChime();
    } else if (tabName === "monk") {
      window.templeGraphics.setScene("monk");
      window.templeAudio.playWindChime();
    } else if (tabName === "wishes") {
      window.templeAudio.playWindChime();
      this.renderWishesBoard();
    }
  }

  getCurrentBowSupplication(isSamseong = false) {
    const sel = document.getElementById(isSamseong ? "sam-wish-select" : "bow-wish-select");
    const customInput = document.getElementById(isSamseong ? "sam-wish-custom-input" : "bow-wish-custom-input");
    if (!sel) return isSamseong ? "산신령님과 칠성부처님 전 부모님의 백년건강과 만수무강을 지성으로 발원합니다." : "부모님의 만수무강과 온 가족의 평안을 지성으로 발원합니다.";
    if (sel.value === "custom") {
      const customVal = customInput ? customInput.value.trim() : "";
      return customVal || (isSamseong ? "산신령님과 칠성부처님 전 부모님의 백년건강과 만수무강을 발원합니다." : "부모님의 건강과 온 가족의 무탈 평안을 발원합니다.");
    }
    return sel.value;
  }

  startBowAction(targetBows, meritReward, donationReward, isSamseong = false) {
    if (window.templeGraphics.bowState.isBowing) {
      this.showToast("현재 경건하게 절을 올리는 중입니다. 🙏");
      return;
    }

    const supplication = this.getCurrentBowSupplication(isSamseong);
    if (window.templeGraphics.setBowSupplication) {
      window.templeGraphics.setBowSupplication(supplication);
    }

    window.templeAudio.playTempleBell(false);
    this.showToast(`🙏 [${isSamseong ? "삼성각 " : ""}${targetBows}배 정진] "${supplication}"`);

    window.templeGraphics.startBowing(
      targetBows,
      (current, total) => {
        const floatText = isSamseong ? `${current}배 산신·칠성 축원 🙏` : `${current}배 접족례 🙏`;
        window.templeGraphics.addFloatingText(floatText, 195, 250, "#ffe082");
      },
      (completedCount) => {
        const result = window.templeState.recordBow(completedCount, meritReward, donationReward);
        const placeName = isSamseong ? "삼성각 산신령님과 칠성부처님 전에" : "대웅전 부처님 전에";
        this.showToast(`🙏 ${placeName} ${completedCount}배를 원만히 회향하셨습니다! (+${donationReward.toLocaleString()}원 보시금)`);
        if (result && result.leveledUp) {
          window.templeAudio.playTempleBell(true);
          this.showToast(`🎉 가족의 정성으로 [${result.newLevelInfo.name}] 증축이 완성되었습니다!`);
        }
      }
    );
  }

  hitMoktak(x, y) {
    window.templeAudio.playMoktak();
    window.templeGraphics.triggerMoktakHit(x, y);
    window.templeState.recordMoktakHit();
  }

  /**
   * [개선 7] 자동 목탁 정진 모드 토글
   */
  toggleAutoMoktak() {
    if (this.isAutoMoktak) {
      this.stopAutoMoktak();
      this.showToast("📿 자동 목탁 정진을 멈췄습니다.");
    } else {
      this.startAutoMoktak();
      this.showToast("📿 자동 목탁 정진을 시작합니다. 일심으로 마음을 모으소서.");
    }
  }

  startAutoMoktak() {
    this.isAutoMoktak = true;
    const btn = document.getElementById("btn-toggle-auto-moktak");
    const bar = document.getElementById("auto-moktak-controls");
    if (btn) {
      btn.classList.add("active");
      btn.innerHTML = "⏸️ 정진 멈춤";
    }
    if (bar) bar.style.display = "flex";

    this.hitMoktak();
    this.autoMoktakInterval = setInterval(() => {
      this.hitMoktak();
    }, this.autoMoktakSpeed);
  }

  stopAutoMoktak() {
    this.isAutoMoktak = false;
    if (this.autoMoktakInterval) {
      clearInterval(this.autoMoktakInterval);
      this.autoMoktakInterval = null;
    }
    const btn = document.getElementById("btn-toggle-auto-moktak");
    const bar = document.getElementById("auto-moktak-controls");
    if (btn) {
      btn.classList.remove("active");
      btn.innerHTML = "📿 자동 목탁 시작";
    }
    if (bar) bar.style.display = "none";
  }

  renderMonkQuickButtons() {
    const container = document.getElementById("monk-quick-topics");
    if (!container) return;
    container.innerHTML = "";
    window.monkAI.quickTopics.forEach((topic) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quick-topic-chip";
      btn.textContent = topic.label;
      btn.addEventListener("click", () => {
        this.sendMonkMessage(topic.prompt);
      });
      container.appendChild(btn);
    });
  }

  /**
   * 레트로 RPG 스타일 한 글자씩 타이핑되는 주지스님 대화
   */
  async sendMonkMessage(userText) {
    const chatBox = document.getElementById("monk-chat-messages");
    if (!chatBox) return;

    const user = window.templeState.currentUser;
    const userName = user ? user.name : "신도님";

    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user-bubble";
    userBubble.innerHTML = `<div class="bubble-author">${this.escapeHtml(userName)}</div><div class="bubble-text">${this.escapeHtml(userText)}</div>`;
    chatBox.appendChild(userBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

    const monkBubble = document.createElement("div");
    monkBubble.className = "chat-bubble monk-bubble";
    monkBubble.innerHTML = `<div class="bubble-author">🍵 혜안 주지스님</div><div class="bubble-text" id="typing-monk-text">차를 한 모금 드시며 말씀을 경청하고 계십니다...</div>`;
    chatBox.appendChild(monkBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

    const chatReward = window.templeState.rewardDailyMonkChat();
    const reply = await window.monkAI.generateReply(userText, user);

    // 레트로 타이핑 연출
    const textTarget = monkBubble.querySelector("#typing-monk-text");
    if (textTarget) {
      textTarget.textContent = "";
      let charIdx = 0;
      const typeInterval = setInterval(() => {
        if (charIdx < reply.length) {
          textTarget.textContent += reply[charIdx];
          charIdx++;
          chatBox.scrollTop = chatBox.scrollHeight;
        } else {
          clearInterval(typeInterval);
        }
      }, 24);
    }

    window.templeAudio.playWindChime();
    if (chatReward.granted) {
      this.showToast(`🍵 주지스님과의 차담으로 공양 보시금 +${chatReward.donation.toLocaleString()}원이 적립되었습니다!`);
    }
  }

  /**
   * [개선 2] 경내 연등 클릭 시 상세 팝업 오픈
   */
  openWishDetailModal(wish) {
    this.activeDetailWish = wish;
    document.getElementById("wish-detail-title").textContent = `🏮 [${wish.category || "소원"}] 연등`;
    document.getElementById("wish-detail-author").textContent = `${wish.authorName}님의 발원`;
    document.getElementById("wish-detail-date").textContent = `${wish.date} ${wish.time || ""}`;
    document.getElementById("wish-detail-content").textContent = wish.content;
    this.openModal("modal-wish-detail");
  }

  startClock() {
    const updateClock = () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const dayName = days[now.getDay()];
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");

      const dateEl = document.getElementById("header-date-text");
      if (dateEl) {
        dateEl.textContent = `${y}년 ${m}월 ${d}일 (${dayName}) ${hh}:${mm}`;
      }

      const timeOfDay = window.templeGraphics.getEffectiveTimeOfDay();
      const weather = window.templeGraphics.getEffectiveWeather();
      const timeBadge = document.getElementById("header-ambience-badge");
      if (timeBadge) {
        const tMap = {
          dawn: "🌅 새벽예불",
          morning: "☀️ 아침산사",
          day: "🌤️ 한낮산사",
          sunset: "🌇 저녁노을",
          night: "🌙 달빛산사",
          deep_night: "✨ 심야정적"
        };
        const wMap = { clear: "맑음", fog: "물안개", petals: "꽃비", rain: "산비", snow: "설경" };
        timeBadge.textContent = `${tMap[timeOfDay] || "산사"} · ${wMap[weather] || "맑음"}`;
      }
    };
    updateClock();
    this.clockTimer = setInterval(updateClock, 10000);
  }

  renderHeaderAndStats() {
    const state = window.templeState.state;
    const user = window.templeState.currentUser;
    const levelInfo = window.templeState.getTempleLevelInfo();

    const titleEl = document.getElementById("header-temple-name");
    if (titleEl) titleEl.textContent = state.templeName || "연화사(蓮華寺)";

    const userBadge = document.getElementById("header-user-info");
    if (userBadge) {
      if (user) {
        const donation = (user.donationMoney || 0).toLocaleString();
        userBadge.textContent = `${user.name}님 (보시금 ${donation}원 · 출석 ${user.attendanceDays || 1}일)`;
      } else {
        userBadge.textContent = "로그인 대기중";
      }
    }

    const levelTitle = document.getElementById("temple-level-name");
    const meritText = document.getElementById("temple-merit-score");
    const barFill = document.getElementById("temple-level-bar-fill");

    if (levelTitle) levelTitle.textContent = levelInfo.currentLevel.name;
    if (meritText) {
      meritText.textContent = levelInfo.nextLevel
        ? `가족 합산 불사공덕 ${levelInfo.templeMerit}점 (다음 증축까지 ${levelInfo.remaining}점)`
        : `가족 합산 불사공덕 ${levelInfo.templeMerit}점 (천년 대가람 완성!)`;
    }
    if (barFill) {
      barFill.style.width = `${levelInfo.progressPercent}%`;
    }

    const bowStatEl = document.getElementById("hall-bow-stat");
    if (bowStatEl && user) {
      const donation = (user.donationMoney || 0).toLocaleString();
      bowStatEl.textContent = `${user.name}님 누적 ${user.totalBows || 0}배 · 가족 합산 ${state.totalBowsFamily || 0}배 · 보유 보시금 ${donation}원`;
    }
  }

  renderFamilyActivityTicker() {
    const tickerEl = document.getElementById("family-activity-ticker");
    if (!tickerEl) return;
    const logs = window.templeState.state.activityLogs || [];
    if (logs.length === 0) return;
    const latest = logs[0];
    tickerEl.textContent = `📢 [${latest.time}] ${latest.text}`;
  }

  /**
   * 현실 사찰 공양 품목 및 1일 1회 제한 렌더링
   */
  renderOfferingsList() {
    const container = document.getElementById("offerings-grid");
    if (!container) return;
    const user = window.templeState.currentUser;
    const today = window.templeState.getTodayString();

    const myMeritEl = document.getElementById("offering-modal-my-merit");
    if (myMeritEl) {
      const money = user ? (user.donationMoney || 0).toLocaleString() : "0";
      myMeritEl.textContent = user ? `${user.name}님 보유 공양 보시금: ${money}원` : "로그인 필요";
    }

    container.innerHTML = "";
    window.TEMPLE_CONFIG.offerings.forEach((item) => {
      const isAlreadyDoneToday = user?.offeringHistory?.[item.id] === today;
      const card = document.createElement("div");
      card.className = `offering-card ${isAlreadyDoneToday ? "active-offering" : ""}`;
      card.innerHTML = `
        <div class="offering-icon">${item.icon}</div>
        <div class="offering-info">
          <div class="offering-title">
            ${item.name}
            ${isAlreadyDoneToday ? '<span class="lit-badge">오늘 공양완료</span>' : ""}
          </div>
          <div class="offering-desc">${item.desc}</div>
          <div class="offering-meta">
            정성 보시금: <strong>${item.priceLabel}</strong> → 사찰 불사기금 <strong>+${item.templeMeritBonus}점</strong>
          </div>
        </div>
        <button type="button" class="btn-make-offering ${isAlreadyDoneToday ? "done" : ""}" data-id="${item.id}" ${isAlreadyDoneToday ? "disabled" : ""}>
          ${isAlreadyDoneToday ? "완료" : "올리기"}
        </button>
      `;

      card.querySelector(".btn-make-offering").addEventListener("click", () => {
        if (isAlreadyDoneToday) return;
        const res = window.templeState.makeOffering(item.id);
        if (!res.success) {
          this.showToast(res.message);
          return;
        }
        window.templeAudio.playTempleBell(false);
        this.showToast(res.message);
        this.closeModal("modal-offerings");
      });
      container.appendChild(card);
    });
  }

  renderWishesBoard() {
    const listEl = document.getElementById("wishes-list");
    if (!listEl) return;
    const wishes = window.templeState.state.wishes || [];
    listEl.innerHTML = "";

    const currentUserName = window.templeState.currentUser ? window.templeState.currentUser.name : "";

    wishes.forEach((w) => {
      const alreadyPrayed = w.prayedBy && w.prayedBy.includes(currentUserName);
      const card = document.createElement("div");
      card.className = "wish-lantern-card";
      card.innerHTML = `
        <div class="wish-card-header">
          <span class="wish-tag" style="background:${w.lanternColor || "#ffca28"}; color:#1a100a;">🏮 ${this.escapeHtml(w.category || "소원")}</span>
          <span class="wish-author">${this.escapeHtml(w.authorName)}</span>
          <span class="wish-date">${w.date} ${w.time || ""}</span>
        </div>
        <div class="wish-card-body">${this.escapeHtml(w.content)}</div>
        <div class="wish-card-footer">
          <button type="button" class="btn-pray-wish ${alreadyPrayed ? "prayed-already" : ""}" data-id="${w.id}">
            ${alreadyPrayed ? `✓ 이미 합장 축원함 (${w.prayers || 1})` : `🙏 함께 지성으로 합장 축원하기 (${w.prayers || 1})`}
          </button>
        </div>
      `;
      card.querySelector(".btn-pray-wish").addEventListener("click", () => {
        const res = window.templeState.prayForWish(w.id);
        if (res && res.alreadyPrayed) {
          this.showToast(res.message);
          return;
        }
        window.templeAudio.playMoktak(20);
        this.showToast(res ? res.message : `🙏 ${w.authorName}님의 소원에 함께 합장했습니다. (+500원)`);
      });
      listEl.appendChild(card);
    });
  }

  renderTempleProgressModalContent() {
    const container = document.getElementById("temple-levels-roadmap");
    if (!container) return;
    const info = window.templeState.getTempleLevelInfo();
    const currentLv = info.currentLevel.level;

    container.innerHTML = "";
    window.TEMPLE_CONFIG.templeLevels.forEach((lv) => {
      const unlocked = lv.level <= currentLv;
      const row = document.createElement("div");
      row.className = `roadmap-item ${unlocked ? "unlocked" : "locked"}`;
      row.innerHTML = `
        <div class="roadmap-status">${unlocked ? "🪷 건립 완료" : `🔒 불사 ${lv.requiredMerit}점 필요`}</div>
        <div class="roadmap-title">${lv.name}</div>
        <div class="roadmap-desc">${lv.description}</div>
      `;
      container.appendChild(row);
    });

    const famContainer = document.getElementById("family-members-ranking");
    if (famContainer) {
      const users = window.templeState.state.users || [];
      if (users.length === 0) {
        famContainer.innerHTML = `<div class="empty-note">아직 등록된 가족이 없습니다.</div>`;
      } else {
        famContainer.innerHTML = users
          .map(
            (u) => `
          <div class="family-member-row">
            <span>🙏 <strong>${this.escapeHtml(u.name)}</strong> (${u.attendanceDays || 1}일 출석 · ${u.totalBows || 0}배)</span>
            <span class="member-merit-pill">보시금 ${(u.donationMoney || 0).toLocaleString()}원</span>
          </div>
        `
          )
          .join("");
      }
    }
  }

  showLoginOverlay() {
    const overlay = document.getElementById("login-overlay");
    if (!overlay) return;
    overlay.style.display = "flex";

    const welcomeBackCard = document.getElementById("welcome-back-card");
    const welcomeFormCard = document.getElementById("welcome-form-card");
    const welcomeBackName = document.getElementById("welcome-back-name");

    const existingUser = window.templeState.currentUser || window.templeState.getLastActiveUser();

    // [개선 4] 기존 불자가 있으면 원클릭 바로 입장 카드 표출
    if (existingUser && welcomeBackCard && welcomeFormCard) {
      welcomeBackCard.style.display = "block";
      welcomeFormCard.style.display = "none";
      if (welcomeBackName) {
        welcomeBackName.textContent = `🙏 ${this.escapeHtml(existingUser.name)} 불자님, 성불하십시오!`;
      }
    } else {
      if (welcomeBackCard) welcomeBackCard.style.display = "none";
      if (welcomeFormCard) welcomeFormCard.style.display = "block";
      this.updateCharacterPreview();
    }

    const chipsContainer = document.getElementById("existing-family-chips");
    const users = window.templeState.state.users || [];
    if (chipsContainer) {
      if (users.length > 0) {
        chipsContainer.innerHTML =
          `<div class="chips-label">가입된 가족 빠른 선택:</div>` +
          users
            .map(
              (u) =>
                `<button type="button" class="family-user-chip" data-name="${this.escapeHtml(u.name)}">🙏 ${this.escapeHtml(u.name)}</button>`
            )
            .join("");
      } else {
        chipsContainer.innerHTML = "";
      }
    }
  }

  hideLoginOverlay() {
    const overlay = document.getElementById("login-overlay");
    if (overlay) overlay.style.display = "none";
  }

  loadSettingsForm() {
    const state = window.templeState.state;
    const settings = state.settings || {};
    document.getElementById("setting-temple-name").value = state.templeName || "연화사(蓮華寺)";
    document.getElementById("setting-gemini-key").value = settings.geminiApiKey || "";
    document.getElementById("setting-supabase-url").value = settings.supabaseUrl || "";
    document.getElementById("setting-supabase-key").value = settings.supabaseKey || "";
  }

  openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      if (id === "modal-temple-build") this.renderTempleProgressModalContent();
      el.style.display = "flex";
    }
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }

  showToast(message) {
    const toast = document.getElementById("temple-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.appController = new TempleAppController();
  window.appController.init();
});
