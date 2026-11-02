/**
 * [사찰 그래픽 & 3인칭 한국 정통 오체투지 렌더러 - js/graphics.js]
 * 1. 주지스님의 다채로운 산사 일과 연출 (마당 쓸기, 경내 시찰 산책, 합장 인사, 참선)
 * 2. 스님 말풍선 자동 다중 줄바꿈 & 화면 이탈 방지 완벽 클램핑
 * 3. 얼굴 표정 4종 + 10종 헤어스타일 + 법복 5종 캐릭터 완전 반영 & 경내 실시간 렌더링
 * 4. 한국 정통 7단계 오체투지(접족례 고두배) 인체 해부학적 관절 곡선 배례 애니메이션
 */

class TempleGraphicsEngine {
  constructor() {
    this.courtyardCanvas = null;
    this.courtyardCtx = null;
    this.hallCanvas = null;
    this.hallCtx = null;
    this.monkCanvas = null;
    this.monkCtx = null;
    this.samseonggakCanvas = null;
    this.samseonggakCtx = null;

    this.activeScene = "courtyard";
    this.animFrameId = null;
    this.lastTime = performance.now();
    this.elapsed = 0;

    // 자연스러운 날씨 순환 (약 2.5분마다)
    this.weatherCycleTime = 0;
    this.currentWeather = "clear";
    this.weatherList = ["clear", "fog", "petals", "clear", "rain", "petals", "snow"];
    this.weatherIndex = 0;

    this.particles = [];
    this.fogClouds = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.lanternHitboxes = [];
    this.samseonggakHitbox = null;

    // [개선 1] 주지스님 행동 상태 머신 (sweeping, patrolling, greeting, meditating)
    this.monkState = {
      action: "sweeping", // 'sweeping' | 'patrolling' | 'greeting' | 'meditating'
      timer: 0,
      x: 270,
      y: 320,
      baseX: 270,
      walkDir: 1,
      sweepAngle: 0
    };

    // [개선 2] 스님 터치 기믹 & 말풍선 (다중 줄바꿈)
    this.monkTouchState = {
      touchCount: 0,
      lastTouchTime: 0,
      speechLines: [],
      speechAlpha: 0,
      bowAnim: 0
    };

    // [개선 3] 배례 중 간절한 발원문 & 실시간 진중한 축원문
    this.currentBowSupplication = "부모님의 만수무강과 온 가족의 평안을 지성으로 발원합니다.";
    this.bowBlessingVerses = [
      "지심귀명례 삼계도사 사생자부 시아본사 석가모니불",
      "부처님의 대자대비 가피광명이 온 가족을 굽어살피십니다",
      "지극한 정성으로 올리는 한 배에 온갖 액난이 봄눈 녹듯 사라집니다",
      "마음속 온갖 번뇌와 불안이 사라지고 맑고 밝은 지혜가 샘솟습니다",
      "가내 두루 평안하고 모든 권속이 무탈 건강하기를 축원합니다",
      "세세생생 지어온 모든 업장이 청정하게 소멸되옵니다",
      "자손만대 지혜롭고 뜻하는 모든 소원이 원만히 성취되옵니다",
      "자비로우신 부처님 은혜에 감사하며 보리심을 발합니다",
      "시방삼세 제망찰해 상주시방 불타야중께 귀의하옵니다",
      "오늘 짓는 청정한 공덕이 온 누리 모든 인연에게 두루 회향됩니다"
    ];

    // [개선 6] 정통 한국 불교 7단계 오체투지(五體投地) 배례 상태
    this.bowState = {
      isBowing: false,
      targetCount: 0,
      currentCount: 0,
      phase: 0, // 0.0 ~ 1.0 (한 번의 진중한 절 주기)
      speed: 0.28, // 경건하고 차분한 호흡 속도
      onEachBow: null,
      onComplete: null
    };

    this.moktakAnim = { scale: 1.0, hitTime: 0 };

    this.initFogAndParticles();
  }

  initFogAndParticles() {
    this.fogClouds = [];
    for (let i = 0; i < 6; i++) {
      this.fogClouds.push({
        x: Math.random() * 450,
        y: 110 + i * 46,
        width: 220 + Math.random() * 140,
        height: 38 + Math.random() * 24,
        speed: 5 + Math.random() * 7,
        alpha: 0.22 + Math.random() * 0.18
      });
    }

    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(randomY = false) {
    return {
      x: Math.random() * 460,
      y: randomY ? Math.random() * 540 : -15,
      size: 2.2 + Math.random() * 3.8,
      speedY: 16 + Math.random() * 26,
      speedX: -12 + Math.random() * 24,
      angle: Math.random() * Math.PI * 2,
      spin: -1.4 + Math.random() * 2.8
    };
  }

  attachCanvases(courtyardCanvas, hallCanvas, monkCanvas, samseonggakCanvas) {
    this.courtyardCanvas = courtyardCanvas;
    this.hallCanvas = hallCanvas;
    this.monkCanvas = monkCanvas;
    this.samseonggakCanvas = samseonggakCanvas;
    this.resizeCanvases();
    window.addEventListener("resize", () => this.resizeCanvases());

    if (this.courtyardCanvas) {
      this.courtyardCanvas.addEventListener("click", (e) => this.handleCourtyardClick(e));
    }
    if (this.hallCanvas) {
      this.hallCanvas.addEventListener("click", (e) => this.handleHallClick(e));
    }
    if (this.monkCanvas) {
      this.monkCanvas.addEventListener("click", (e) => this.handleMonkRoomClick(e));
    }
    if (this.samseonggakCanvas) {
      this.samseonggakCanvas.addEventListener("click", (e) => this.handleHallClick(e));
    }

    this.startLoop();
  }

  resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    [this.courtyardCanvas, this.hallCanvas, this.monkCanvas, this.samseonggakCanvas].forEach((canvas) => {
      if (!canvas) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = Math.max(320, rect.width || 420);
      const h = Math.max(260, rect.height || 420);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    if (this.courtyardCanvas) this.courtyardCtx = this.courtyardCanvas.getContext("2d");
    if (this.hallCanvas) this.hallCtx = this.hallCanvas.getContext("2d");
    if (this.monkCanvas) this.monkCtx = this.monkCanvas.getContext("2d");
    if (this.samseonggakCanvas) this.samseonggakCtx = this.samseonggakCanvas.getContext("2d");
  }

  setScene(sceneName) {
    this.activeScene = sceneName;
    setTimeout(() => this.resizeCanvases(), 40);
  }

  getEffectiveTimeOfDay() {
    const mode = window.templeState?.state?.timeMode || "auto";
    if (mode !== "auto") return mode;

    const hr = new Date().getHours();
    const min = new Date().getMinutes();
    const timeVal = hr + min / 60;

    if (timeVal >= 4.0 && timeVal < 6.5) return "dawn";
    if (timeVal >= 6.5 && timeVal < 11.5) return "morning";
    if (timeVal >= 11.5 && timeVal < 16.5) return "day";
    if (timeVal >= 16.5 && timeVal < 19.5) return "sunset";
    if (timeVal >= 19.5 && timeVal < 23.0) return "night";
    return "deep_night";
  }

  getEffectiveWeather() {
    const timeOfDay = this.getEffectiveTimeOfDay();
    if (timeOfDay === "dawn") return "fog";
    return this.currentWeather;
  }

  setBowSupplication(supplicationText) {
    if (supplicationText && supplicationText.trim()) {
      this.currentBowSupplication = supplicationText.trim();
    }
  }

  startBowing(count, onEachBow, onComplete) {
    if (this.bowState.isBowing) return false;
    this.bowState = {
      isBowing: true,
      targetCount: count,
      currentCount: 0,
      phase: 0,
      speed: count > 10 ? 0.48 : 0.28,
      onEachBow,
      onComplete
    };
    return true;
  }

  stopBowing() {
    this.bowState.isBowing = false;
  }

  triggerMoktakHit(x, y) {
    this.moktakAnim.scale = 1.25;
    this.moktakAnim.hitTime = this.elapsed;

    // [개선 6] 실제 목탁 위치 좌표에 정확하게 타격 동심원과 텍스트 발생
    const defX = this.hallCanvas ? this.hallCanvas.clientWidth * 0.80 : 300;
    const defY = this.hallCanvas ? this.hallCanvas.clientHeight * 0.73 : 310;
    const targetX = (typeof x === "number") ? x : (this.moktakCoords ? this.moktakCoords.x : defX);
    const targetY = (typeof y === "number") ? y : (this.moktakCoords ? this.moktakCoords.y : defY);

    this.ripples.push({
      x: targetX,
      y: targetY,
      radius: 12,
      maxRadius: 70,
      alpha: 0.95
    });
    this.addFloatingText("똑- 딱!", targetX, targetY - 26, "#ffd54f");
  }

  addFloatingText(text, x, y, color = "#ffe082") {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1.0,
      vy: -26
    });
  }

  handleCourtyardClick(e) {
    if (!this.courtyardCanvas) return;
    const rect = this.courtyardCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    // 1. 가족 연등 터치 검사
    for (const lb of this.lanternHitboxes) {
      const dist = Math.hypot(x - lb.x, y - lb.y);
      if (dist <= lb.radius + 6) {
        window.templeAudio.playWindChime();
        if (window.appController) {
          window.appController.openWishDetailModal(lb.wish);
        }
        return;
      }
    }

    // 2. 혜안 스님 터치 검사 (현재 스님 위치 기반)
    const monkDist = Math.hypot(x - this.monkState.x, y - this.monkState.y);
    if (monkDist < 38) {
      this.triggerMonkCourtyardTouch();
      return;
    }

    // 2-1. [개선 5 & 개선 3] 삼성각(산신·칠성당) 터치 검사 -> 삼성각 전각 내부 직접 입장
    if (this.samseonggakHitbox) {
      const sDist = Math.hypot(x - this.samseonggakHitbox.x, y - this.samseonggakHitbox.y);
      if (sDist <= this.samseonggakHitbox.radius) {
        window.templeAudio.playWindChime();
        if (window.appController) {
          window.appController.switchTab("samseonggak");
        }
        return;
      }
    }

    // 3. 대웅전 본당 터치 -> 법당 입장
    if (x > w * 0.22 && x < w * 0.78 && y > h * 0.25 && y < h * 0.58) {
      if (window.appController) window.appController.switchTab("hall");
      return;
    }

    // 4. 범종각(좌측) 터치
    if (x < w * 0.32 && y > h * 0.45 && y < h * 0.72) {
      window.templeAudio.playTempleBell(true);
      this.addFloatingText("🔔 범종 타종 (+500원)", x, y, "#ffd54f");
      if (window.templeState.currentUser) {
        window.templeState.currentUser.donationMoney = (window.templeState.currentUser.donationMoney || 0) + 500;
        window.templeState.state.templeMerit += 2;
        window.templeState.saveState();
      }
      return;
    }

    // 5. 삼층석탑(우측) 터치
    if (x > w * 0.70 && y > h * 0.48 && y < h * 0.78) {
      window.templeAudio.playWindChime();
      this.addFloatingText("🙏 탑돌이 지극한 축원", x, y, "#fff59d");
    }
  }

  /**
   * [개선 2] 스님 터치 기믹 & 화면 벗어남 없는 정밀 다중 줄바꿈 말풍선
   */
  triggerMonkCourtyardTouch() {
    window.templeAudio.playWindChime();
    this.monkTouchState.touchCount += 1;
    this.monkTouchState.lastTouchTime = this.elapsed;
    this.monkTouchState.speechAlpha = 1.0;
    this.monkTouchState.bowAnim = 1.0;
    this.monkState.action = "greeting"; // 인사 모션으로 전환

    const dharmaQuotes = [
      "나무아미타불, 온 가족의 마음에 평안이 가득하시길 빕니다. 🙏",
      "마음속의 번뇌와 근심은 흐르는 맑은 시냇물에 띄워 보내시구려. 🌿",
      "가족들이 아프지 않고 화목한 것이 부처님의 가장 큰 가피입니다. 🪷",
      "차 한 잔의 따뜻한 여유가 만 가지 시름을 잊게 한답니다. 🍵",
      "오늘도 참 좋은 날입니다. 부처님께서 늘 자비로 보살피십니다. 🙏",
      "화안애어(和顔愛語), 부모님과 가족들에게 따뜻한 미소를 건네보셔요. ✨"
    ];

    let chosenText = "";
    if (this.monkTouchState.touchCount >= 3) {
      chosenText = "허허, 나와 따뜻한 차 한 잔 나누러 다실로 가시겠소? 🍵";
      this.monkTouchState.touchCount = 0;
      setTimeout(() => {
        if (window.appController) window.appController.switchTab("monk");
      }, 1400);
    } else {
      const idx = Math.floor(Math.random() * dharmaQuotes.length);
      chosenText = dharmaQuotes[idx];
    }

    // 텍스트를 14~18자 단위로 다중 줄바꿈 처리
    this.monkTouchState.speechLines = this.wrapText(chosenText, 16);
  }

  wrapText(text, maxCharsPerLine) {
    const lines = [];
    const words = text.split(" ");
    let currentLine = "";

    words.forEach((word) => {
      if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  handleHallClick(e) {
    if (!this.hallCanvas) return;
    const rect = this.hallCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    const moktakX = w * 0.80;
    const moktakY = h * 0.73;
    if (Math.hypot(x - moktakX, y - moktakY) < 46) {
      if (window.appController) window.appController.hitMoktak(moktakX, moktakY);
    }
  }

  handleMonkRoomClick(e) {
    if (!this.monkCanvas) return;
    window.templeAudio.playWindChime();
    this.addFloatingText("🍵 따뜻한 작설차를 마주합니다", 200, 160, "#ffe082");
  }

  startLoop() {
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.elapsed += dt;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  update(dt) {
    // 1. 날씨 순환
    this.weatherCycleTime += dt;
    if (this.weatherCycleTime > 150) {
      this.weatherCycleTime = 0;
      this.weatherIndex = (this.weatherIndex + 1) % this.weatherList.length;
      this.currentWeather = this.weatherList[this.weatherIndex];
    }

    // 2. 안개 및 파티클
    this.fogClouds.forEach((f) => {
      f.x += f.speed * dt;
      if (f.x - f.width > 460) f.x = -f.width;
    });

    const weather = this.getEffectiveWeather();
    this.particles.forEach((p) => {
      if (weather === "rain") {
        p.y += p.speedY * 6.5 * dt;
        p.x -= 14 * dt;
      } else if (weather === "snow") {
        p.y += p.speedY * 1.2 * dt;
        p.x += Math.sin(this.elapsed * 2 + p.angle) * 14 * dt;
      } else {
        p.y += p.speedY * 0.9 * dt;
        p.x += Math.sin(this.elapsed * 1.5 + p.angle) * 16 * dt;
        p.angle += p.spin * dt;
      }
      if (p.y > 540) Object.assign(p, this.createParticle(false));
    });

    // 3. [개선 1] 주지스님 산사 일과 상태 머신 업데이트
    this.monkState.timer += dt;
    if (this.monkState.timer > 14) {
      this.monkState.timer = 0;
      const actions = ["sweeping", "patrolling", "greeting", "meditating"];
      const nextIdx = (actions.indexOf(this.monkState.action) + 1) % actions.length;
      this.monkState.action = actions[nextIdx];
    }

    // 행동별 이동 및 모션 업데이트
    if (this.monkState.action === "patrolling") {
      // 경내를 좌우로 천천히 산책/시찰 (상대적 오프셋 왕복)
      this.monkState.walkOffset = (this.monkState.walkOffset || 0) + this.monkState.walkDir * 12 * dt;
      if (this.monkState.walkOffset > 22) this.monkState.walkDir = -1;
      if (this.monkState.walkOffset < -22) this.monkState.walkDir = 1;
    } else if (this.monkState.action === "sweeping") {
      // 빗자루 쓸기 각도 왕복
      this.monkState.sweepAngle = Math.sin(this.elapsed * 3.5) * 0.35;
    }

    // 4. 스님 말풍선 페이드아웃
    if (this.monkTouchState.speechAlpha > 0) {
      this.monkTouchState.speechAlpha = Math.max(0, this.monkTouchState.speechAlpha - dt * 0.18);
    }
    if (this.monkTouchState.bowAnim > 0) {
      this.monkTouchState.bowAnim = Math.max(0, this.monkTouchState.bowAnim - dt * 1.5);
    }

    // 5. 피드백
    if (this.moktakAnim.scale > 1.0) {
      this.moktakAnim.scale = Math.max(1.0, this.moktakAnim.scale - dt * 1.8);
    }
    this.ripples.forEach((r) => {
      r.radius += 80 * dt;
      r.alpha -= 1.4 * dt;
    });
    this.ripples = this.ripples.filter((r) => r.alpha > 0);

    this.floatingTexts.forEach((ft) => {
      ft.y += ft.vy * dt;
      ft.alpha -= 0.7 * dt;
    });
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.alpha > 0);

    // 6. [개선 6] 정통 7단계 오체투지 배례 업데이트
    if (this.bowState.isBowing) {
      const prevPhase = this.bowState.phase;
      this.bowState.phase += this.bowState.speed * dt;

      // 이마가 바닥에 닿는 순간(phase 0.52)에서 경건한 목탁 소리 울림
      if (prevPhase < 0.52 && this.bowState.phase >= 0.52) {
        window.templeAudio.playMoktak(-25);
      }

      if (this.bowState.phase >= 1.0) {
        this.bowState.phase = 0;
        this.bowState.currentCount += 1;

        if (this.bowState.onEachBow) {
          this.bowState.onEachBow(this.bowState.currentCount, this.bowState.targetCount);
        }

        if (this.bowState.currentCount >= this.bowState.targetCount) {
          this.bowState.isBowing = false;
          window.templeAudio.playTempleBell(false);
          if (this.bowState.onComplete) {
            this.bowState.onComplete(this.bowState.currentCount);
          }
        }
      }
    }
  }

  render() {
    if (this.activeScene === "courtyard" && this.courtyardCtx && this.courtyardCanvas) {
      this.renderCourtyard(this.courtyardCtx, this.courtyardCanvas.clientWidth, this.courtyardCanvas.clientHeight);
    } else if (this.activeScene === "hall" && this.hallCtx && this.hallCanvas) {
      this.renderDaeungjeonHall(this.hallCtx, this.hallCanvas.clientWidth, this.hallCanvas.clientHeight);
    } else if (this.activeScene === "monk" && this.monkCtx && this.monkCanvas) {
      this.renderMonkRoomRetroScene(this.monkCtx, this.monkCanvas.clientWidth, this.monkCanvas.clientHeight);
    } else if (this.activeScene === "samseonggak" && this.samseonggakCtx && this.samseonggakCanvas) {
      this.renderSamseonggakScene(this.samseonggakCtx, this.samseonggakCanvas.clientWidth, this.samseonggakCanvas.clientHeight);
    }
  }

  /* =========================================================================
   * [SCENE 1] 사찰 경내 렌더링
   * ========================================================================= */
  renderCourtyard(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    this.lanternHitboxes = [];

    const timeOfDay = this.getEffectiveTimeOfDay();
    const weather = this.getEffectiveWeather();
    const levelInfo = window.templeState.getTempleLevelInfo();
    const level = levelInfo.currentLevel.level;

    // 1. 하늘 그라데이션
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    if (timeOfDay === "dawn") {
      skyGrad.addColorStop(0, "#121b2d");
      skyGrad.addColorStop(0.5, "#2d3d5a");
      skyGrad.addColorStop(1, "#9e8679");
    } else if (timeOfDay === "morning") {
      skyGrad.addColorStop(0, "#4a90e2");
      skyGrad.addColorStop(0.6, "#99ccee");
      skyGrad.addColorStop(1, "#f9f7eb");
    } else if (timeOfDay === "day") {
      skyGrad.addColorStop(0, "#3a84df");
      skyGrad.addColorStop(0.65, "#80c4f8");
      skyGrad.addColorStop(1, "#e8f4ec");
    } else if (timeOfDay === "sunset") {
      skyGrad.addColorStop(0, "#331f42");
      skyGrad.addColorStop(0.45, "#9c4146");
      skyGrad.addColorStop(1, "#f5a65b");
    } else if (timeOfDay === "night") {
      skyGrad.addColorStop(0, "#0a1122");
      skyGrad.addColorStop(0.65, "#182744");
      skyGrad.addColorStop(1, "#293d56");
    } else {
      skyGrad.addColorStop(0, "#050811");
      skyGrad.addColorStop(0.7, "#0c1524");
      skyGrad.addColorStop(1, "#182333");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    this.drawCelestialBodies(ctx, w, h, timeOfDay);

    // 원경 산봉우리
    this.drawMountainLayer(ctx, w, h, h * 0.36, "#314940", 0.42, 1);
    this.drawMountainLayer(ctx, w, h, h * 0.44, "#243b31", 0.70, 2);

    if (weather === "fog" || timeOfDay === "dawn") {
      this.drawFogLayers(ctx, w, h, 0.55);
    }

    // 마당 지면
    const groundGrad = ctx.createLinearGradient(0, h * 0.46, 0, h);
    if (timeOfDay === "night" || timeOfDay === "deep_night") {
      groundGrad.addColorStop(0, "#222c26");
      groundGrad.addColorStop(0.35, "#302820");
      groundGrad.addColorStop(1, "#1c1713");
    } else {
      groundGrad.addColorStop(0, "#55754d");
      groundGrad.addColorStop(0.25, "#d4be9f");
      groundGrad.addColorStop(1, "#b59b77");
    }
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.48);
    ctx.quadraticCurveTo(w * 0.5, h * 0.43, w, h * 0.48);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    if (level >= 5) this.drawSmallHermitage(ctx, w * 0.18, h * 0.35, 0.75);

    this.drawPineTree(ctx, w * 0.09, h * 0.50, 0.9);
    this.drawPineTree(ctx, w * 0.91, h * 0.49, 0.95);

    // [개선 4 & 5] 호젓한 솔숲 언덕 위 삼성각(三聖閣 - 산신·칠성당) 전각 (석탑과 겹치지 않게 언덕 상단 배치)
    this.drawSamseonggak(ctx, w * 0.83, h * 0.35, timeOfDay);

    this.drawDaeungjeonExterior(ctx, w * 0.5, h * 0.44, w, h, level, timeOfDay);

    // 가족 연등 걸이대
    this.drawFamilyWishesLanternRacks(ctx, w, h, timeOfDay);

    if (level >= 3) {
      this.drawBellPavilion(ctx, w * 0.19, h * 0.62, timeOfDay);
      this.drawStoneLantern(ctx, w * 0.36, h * 0.57, timeOfDay);
      this.drawStoneLantern(ctx, w * 0.64, h * 0.57, timeOfDay);
    }

    if (level >= 2) {
      // [개선 4] 삼층석탑 위치를 앞마당 우측으로 배치하여 삼성각과 완벽 분리
      this.drawPagoda(ctx, w * 0.74, h * 0.67, level >= 5);
    }

    if (level >= 4) {
      this.drawLotusPond(ctx, w * 0.25, h * 0.84);
    }

    // [개선 1] 주지스님의 다채로운 산사 일과 렌더링 (좌측 마당)
    this.drawDiverseMonkActions(ctx, w, h);

    // [개선 3] 커스터마이징 내 캐릭터 렌더링 (중앙 마당)
    this.drawCourtyardMyCustomCharacter(ctx, w * 0.50, h * 0.76);

    if (weather === "fog" || timeOfDay === "dawn") {
      this.drawFogLayers(ctx, w, h, 0.95);
    }

    this.drawWeatherParticles(ctx, w, h, weather, timeOfDay);
    this.drawFloatingFeedbacks(ctx);
  }

  /**
   * [개선 1] 주지스님의 다채로운 산사 일과 연출
   * (sweeping: 마당 쓸기 / patrolling: 경내 시찰 산책 / greeting: 참배객 인사 / meditating: 염주 묵상)
   */
  drawDiverseMonkActions(ctx, w, h) {
    ctx.save();

    // [화면 최적화] 모바일 세로 화면에서도 스님이 캔버스 바깥으로 잘리지 않고 석탑/내 캐릭터와 겹치지 않게 좌측 마당에 배치
    this.monkState.y = h * 0.70;
    const patrolOffset = (this.monkState.action === "patrolling") ? (this.monkState.walkOffset || 0) : 0;
    this.monkState.x = w * 0.28 + patrolOffset;

    const mx = this.monkState.x;
    const my = this.monkState.y;
    const action = this.monkState.action;
    const bow = this.monkTouchState.bowAnim * 6;

    ctx.translate(mx, my);

    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 26, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 잿빛 승복(장삼)
    ctx.fillStyle = "#90a4ae";
    ctx.beginPath();
    ctx.roundRect(-14, -2 + bow * 0.4, 28, 26, 10);
    ctx.fill();

    // 적갈색 가사
    ctx.fillStyle = "#8d4e35";
    ctx.beginPath();
    ctx.moveTo(-12, bow * 0.4);
    ctx.lineTo(10, 22 + bow * 0.4);
    ctx.lineTo(14, 16 + bow * 0.4);
    ctx.lineTo(-6, -2 + bow * 0.4);
    ctx.closePath();
    ctx.fill();

    // 스님 얼굴
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.arc(0, -14 + bow, 14, 0, Math.PI * 2);
    ctx.fill();

    // 눈썹과 눈웃음
    ctx.strokeStyle = "#4e342e";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-5, -14 + bow, 3.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(5, -14 + bow, 3.2, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -11 + bow, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // --- 행동별 특별 모션 소품 및 팔/손 렌더링 ---
    if (action === "sweeping") {
      // 1. 마당 쓸기: 싸리비(대나무 빗자루)를 쥐고 사각사각 마당을 쓰는 애니메이션
      ctx.save();
      ctx.rotate(this.monkState.sweepAngle);
      // 빗자루 자루
      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-18, 30);
      ctx.stroke();
      // 빗자루 빗솔 (싸리나무 살)
      ctx.fillStyle = "#d7ccc8";
      ctx.beginPath();
      ctx.moveTo(-18, 26);
      ctx.lineTo(-28, 36);
      ctx.lineTo(-12, 36);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 빗자루를 쥔 두 손
      ctx.fillStyle = "#ffe0b2";
      ctx.beginPath();
      ctx.arc(-4, 6, 4, 0, Math.PI * 2);
      ctx.arc(-10, 14, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (action === "patrolling") {
      // 2. 경내 시찰: 뒷짐 지고 천천히 걷는 모션
      ctx.fillStyle = "#ffe0b2";
      ctx.beginPath();
      ctx.ellipse(0, 10, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (action === "meditating") {
      // 3. 염주 묵상: 붉은 목염주를 들고 묵상
      ctx.fillStyle = "#b71c1c";
      for (let i = 0; i < 6; i++) {
        const ox = -6 + i * 2.5;
        const oy = 8 + Math.sin(i) * 2;
        ctx.beginPath();
        ctx.arc(ox, oy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe0b2";
      ctx.beginPath();
      ctx.arc(0, 8, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 4. 합장 인사 (greeting)
      ctx.fillStyle = "#ffe0b2";
      ctx.beginPath();
      ctx.ellipse(0, 8 + bow * 0.3, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // [개선 9] 이름표 & 현재 일과 상태 표시 (동적 너비 자동 맞춤)
    const stateBadgeMap = {
      sweeping: "🧹 도량 청소",
      patrolling: "🚶 경내 시찰",
      greeting: "🙏 반가운 인사",
      meditating: "📿 고요한 묵상"
    };

    const monkBadgeText = `혜안스님 (${stateBadgeMap[action] || "합장"})`;
    ctx.font = "bold 9.5px sans-serif";
    const monkTextW = ctx.measureText(monkBadgeText).width;
    const monkBadgeW = Math.max(92, monkTextW + 24);

    ctx.fillStyle = "rgba(35, 24, 18, 0.90)";
    ctx.beginPath();
    ctx.roundRect(-monkBadgeW / 2, 30, monkBadgeW, 17, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 213, 79, 0.5)";
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.fillStyle = "#ffe082";
    ctx.textAlign = "center";
    ctx.fillText(monkBadgeText, 0, 42);

    // [개선 2] 말풍선 렌더링 (다중 줄바꿈 & 화면 이탈 방지 완벽 클램핑)
    if (this.monkTouchState.speechLines.length > 0 && this.monkTouchState.speechAlpha > 0) {
      ctx.globalAlpha = Math.min(1, this.monkTouchState.speechAlpha);

      const lines = this.monkTouchState.speechLines;
      const lineHeight = 14;
      const bubblePad = 10;
      const bubbleW = 180;
      const bubbleH = lines.length * lineHeight + bubblePad * 2;

      // 캔버스 테두리를 벗어나지 않도록 스님 x좌표 기준 클램핑
      let bubbleX = -bubbleW / 2;
      const worldLeft = mx + bubbleX;
      const worldRight = mx + bubbleX + bubbleW;

      if (worldLeft < 10) bubbleX += (10 - worldLeft);
      if (worldRight > w - 10) bubbleX -= (worldRight - (w - 10));

      const bubbleY = -52 - (lines.length - 1) * lineHeight;

      ctx.fillStyle = "#fffdf7";
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 10);
      ctx.fill();
      ctx.stroke();

      // 말풍선 꼬리
      ctx.beginPath();
      ctx.moveTo(-4, bubbleY + bubbleH);
      ctx.lineTo(0, bubbleY + bubbleH + 6);
      ctx.lineTo(4, bubbleY + bubbleH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 다중 줄 텍스트 출력
      ctx.fillStyle = "#3e2723";
      ctx.font = "bold 9.5px sans-serif";
      ctx.textAlign = "center";
      lines.forEach((line, i) => {
        ctx.fillText(line, bubbleX + bubbleW / 2, bubbleY + bubblePad + 10 + i * lineHeight);
      });
    }

    ctx.restore();
  }

  /**
   * [개선 3] 얼굴 4종, 헤어 10종, 법복 5종이 실시간 반영된 마당 내 캐릭터
   */
  drawCourtyardMyCustomCharacter(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    const user = window.templeState.currentUser;
    const face = user?.faceStyle || "gentle_smile";
    const hair = user?.hairStyle || "chignon";
    const outfit = user?.outfitColor || "grey";
    const age = user?.ageGroup || "adult";
    const name = user ? user.name : "순례객";

    const outfitConf = window.TEMPLE_CONFIG.outfitColors.find((c) => c.id === outfit) || window.TEMPLE_CONFIG.outfitColors[0];
    const bob = Math.sin(this.elapsed * 3) * 1.8;

    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 26, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 법복 몸통
    ctx.fillStyle = outfitConf.color;
    ctx.beginPath();
    ctx.roundRect(-14, -2 + bob, 28, 26, 10);
    ctx.fill();

    // 조끼/배자
    ctx.fillStyle = outfitConf.vest;
    ctx.fillRect(-10, -2 + bob, 20, 14);

    // 얼굴 4종 및 헤어 10종 렌더링
    this.drawCustomFaceAndHair(ctx, 0, -14 + bob, face, hair, age);

    // 합장한 두 손
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.ellipse(0, 8 + bob, 4.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 이름표 (동적 너비 자동 맞춤)
    const nameText = `${name} 🙏`;
    ctx.font = "bold 9.5px sans-serif";
    const nameTextW = ctx.measureText(nameText).width;
    const nameBadgeW = Math.max(54, nameTextW + 16);

    ctx.fillStyle = "rgba(35, 24, 18, 0.88)";
    ctx.beginPath();
    ctx.roundRect(-nameBadgeW / 2, 30, nameBadgeW, 16, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 213, 79, 0.35)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(nameText, 0, 41.5);

    ctx.restore();
  }

  /**
   * [개선 1] 얼굴 표정 4종 + 10종 헤어스타일 SVG급 고품질 벡터 렌더러
   */
  drawCustomFaceAndHair(ctx, x, y, faceStyle, hairStyle, ageGroup) {
    const isSilver = hairStyle === "silver_cut" || ageGroup === "elder";
    const hairColor = isSilver ? "#cfd8dc" : (ageGroup === "senior" ? "#4a3c31" : "#26211d");
    const hairHighlight = isSilver ? "#ffffff" : (ageGroup === "senior" ? "#6d5644" : "#423730");

    // 기본 머리통 베이스
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(x, y - 2, 16, 0, Math.PI * 2);
    ctx.fill();

    // 살결 얼굴
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.arc(x, y, 12.5, 0, Math.PI * 2);
    ctx.fill();

    // 귀 (좌우)
    ctx.fillStyle = "#f5cb98";
    ctx.beginPath();
    ctx.arc(x - 12.5, y + 1, 3.2, 0, Math.PI * 2);
    ctx.arc(x + 12.5, y + 1, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // --- [10종 헤어스타일 SVG급 벡터 전면 렌더링] ---
    ctx.save();
    ctx.fillStyle = hairColor;
    ctx.strokeStyle = hairColor;

    if (hairStyle === "chignon") {
      // 1. [단아한 비녀 쪽머리] - 전통 한국 가르마 첩지와 쪽진 머리, 금비녀
      // 뒤통수 쪽머리 실루엣
      ctx.beginPath();
      ctx.arc(x, y - 16, 7.5, 0, Math.PI * 2);
      ctx.fill();
      // 금비녀 가로대
      ctx.fillStyle = "#ffd54f";
      ctx.fillRect(x - 14, y - 18, 28, 3.8);
      ctx.fillStyle = "#4caf50"; // 옥장식
      ctx.beginPath();
      ctx.arc(x - 12, y - 16, 3, 0, Math.PI * 2);
      ctx.arc(x + 12, y - 16, 3, 0, Math.PI * 2);
      ctx.fill();
      // 앞가르마 양옆 결
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.quadraticCurveTo(x - 13, y - 15, x, y - 9);
      ctx.quadraticCurveTo(x + 13, y - 15, x + 14, y);
      ctx.quadraticCurveTo(x + 15, y - 17, x, y - 16);
      ctx.quadraticCurveTo(x - 15, y - 17, x - 14, y);
      ctx.fill();
      // 은은한 가르마 선
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y - 16);
      ctx.stroke();

    } else if (hairStyle === "short_perm") {
      // 2. [우아한 볼륨 숏펌] - 어머님들의 풍성하고 정갈한 뽀글뽀글 볼륨 숏파마
      const curls = [
        [-13, -4, 5.5], [-14, -10, 6], [-10, -15, 6.5],
        [-4, -17, 6.5], [4, -17, 6.5], [10, -15, 6.5],
        [14, -10, 6], [13, -4, 5.5], [-7, -9, 4.5], [7, -9, 4.5], [0, -10, 4.8]
      ];
      curls.forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      // 컬 하이라이트 링
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1;
      curls.slice(2, 7).forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, r * 0.55, 0.2, Math.PI * 0.9);
        ctx.stroke();
      });

    } else if (hairStyle === "silver_cut") {
      // 3. [정갈한 은발 숏컷] - 세월의 지혜가 깃든 백은발 단정 컷
      ctx.fillStyle = "#cfd8dc";
      ctx.beginPath();
      ctx.arc(x, y - 4, 15, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      // 옆머리 층
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 2);
      ctx.quadraticCurveTo(x - 16, y - 10, x - 5, y - 16);
      ctx.lineTo(x + 5, y - 16);
      ctx.quadraticCurveTo(x + 16, y - 10, x + 14, y + 2);
      ctx.lineTo(x + 11, y - 2);
      ctx.quadraticCurveTo(x + 6, y - 8, x - 1, y - 8);
      ctx.quadraticCurveTo(x - 8, y - 8, x - 11, y - 2);
      ctx.closePath();
      ctx.fill();
      // 은빛 결선
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      [-7, -2, 4, 9].forEach((ox) => {
        ctx.beginPath();
        ctx.moveTo(x + ox - 2, y - 15);
        ctx.quadraticCurveTo(x + ox, y - 11, x + ox + 1, y - 7);
        ctx.stroke();
      });

    } else if (hairStyle === "parted_gentle") {
      // 4. [깔끔한 가르마 정갈컷] - 아버님/거사님의 지적인 7:3 가르마
      // 7:3 가르마 메인 볼륨
      ctx.beginPath();
      ctx.moveTo(x - 13, y + 2);
      ctx.quadraticCurveTo(x - 15, y - 14, x - 4, y - 16);
      ctx.quadraticCurveTo(x + 10, y - 16, x + 14, y - 10);
      ctx.quadraticCurveTo(x + 15, y + 2, x + 12, y + 2);
      ctx.lineTo(x + 10, y - 2);
      // 앞머리 이마 라인 (7:3 가르마로 부드럽게 흘러내림)
      ctx.quadraticCurveTo(x + 4, y - 7, x - 3, y - 10);
      ctx.quadraticCurveTo(x - 8, y - 7, x - 11, y - 1);
      ctx.closePath();
      ctx.fill();
      // 가르마 선 및 하이라이트
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 10);
      ctx.lineTo(x - 3, y - 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 2, y - 14);
      ctx.quadraticCurveTo(x + 8, y - 13, x + 11, y - 8);
      ctx.stroke();

    } else if (hairStyle === "straight_bob") {
      // 5. [차분한 흑발 단발] - 일자 앞머리와 찰랑이는 볼 단발
      // 앞머리 뱅
      ctx.beginPath();
      ctx.moveTo(x - 13, y - 4);
      ctx.lineTo(x - 13, y - 14);
      ctx.quadraticCurveTo(x, y - 18, x + 13, y - 14);
      ctx.lineTo(x + 13, y - 4);
      ctx.lineTo(x + 9, y - 5);
      ctx.lineTo(x + 9, y - 6);
      ctx.lineTo(x - 9, y - 6);
      ctx.lineTo(x - 9, y - 5);
      ctx.closePath();
      ctx.fill();
      // 양옆 뺨을 감싸는 단발머리
      ctx.fillRect(x - 15, y - 6, 4.5, 14);
      ctx.fillRect(x + 10.5, y - 6, 4.5, 14);
      // 단발 밑단 둥근 처리
      ctx.beginPath();
      ctx.arc(x - 13, y + 8, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 13, y + 8, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // 윤기 하이라이트 엔젤링
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y - 11, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

    } else if (hairStyle === "low_ponytail") {
      // 6. [단정한 묶음 포니테일] - 옆머리 정갈 + 뒤로 묶여 내려오는 꼬리와 댕기
      // 포니테일 묶음 머릿자락 (어깨 우측으로 사뿐히 흐름)
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 10);
      ctx.quadraticCurveTo(x + 18, y, x + 14, y + 15);
      ctx.quadraticCurveTo(x + 10, y + 16, x + 9, y + 5);
      ctx.closePath();
      ctx.fill();
      // 비단 댕기 (화사한 산호분홍)
      ctx.fillStyle = "#f06292";
      ctx.fillRect(x + 8, y - 12, 5, 5);
      ctx.beginPath();
      ctx.moveTo(x + 11, y - 7);
      ctx.lineTo(x + 16, y + 6);
      ctx.lineTo(x + 12, y + 6);
      ctx.closePath();
      ctx.fill();
      // 앞머리 이마선
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(x, y - 4, 14, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();

    } else if (hairStyle === "wave_half") {
      // 7. [부드러운 웨이브 반묶음] - 우아한 S자 물결 웨이브 컬
      // 양옆 S자 웨이브 가닥
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 8);
      ctx.quadraticCurveTo(x - 18, y + 3, x - 12, y + 12);
      ctx.quadraticCurveTo(x - 8, y + 14, x - 10, y + 6);
      ctx.quadraticCurveTo(x - 11, y - 2, x - 9, y - 7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 8);
      ctx.quadraticCurveTo(x + 18, y + 3, x + 12, y + 12);
      ctx.quadraticCurveTo(x + 8, y + 14, x + 10, y + 6);
      ctx.quadraticCurveTo(x + 11, y - 2, x + 9, y - 7);
      ctx.closePath();
      ctx.fill();
      // 윗머리 반묶음 핀
      ctx.fillStyle = "#80cbc4";
      ctx.beginPath();
      ctx.arc(x, y - 16, 4, 0, Math.PI * 2);
      ctx.fill();
      // 앞머리 볼륨
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(x, y - 5, 14, Math.PI, Math.PI * 2);
      ctx.fill();

    } else if (hairStyle === "classic_short") {
      // 8. [중후한 클래식 숏컷] - 단정한 옆머리와 신사/청년 숏헤어
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x - 14, y - 10);
      ctx.quadraticCurveTo(x - 12, y - 17, x, y - 17);
      ctx.quadraticCurveTo(x + 12, y - 17, x + 14, y - 10);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x + 11, y - 1);
      ctx.quadraticCurveTo(x + 5, y - 8, x, y - 8);
      ctx.quadraticCurveTo(x - 5, y - 8, x - 11, y - 1);
      ctx.closePath();
      ctx.fill();
      // 구레나룻
      ctx.fillRect(x - 13.5, y, 2.5, 4);
      ctx.fillRect(x + 11, y, 2.5, 4);

    } else if (hairStyle === "shaved_monk") {
      // 9. [귀여운 동자승 삭발] - 맑고 티 없는 민머리 + 미인점/법성점
      ctx.fillStyle = "#f3dbbf";
      ctx.beginPath();
      ctx.arc(x, y - 2, 14, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      // 삭발 두상 명암
      ctx.strokeStyle = "rgba(180, 140, 110, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y - 2, 13.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      // 이마 가운데 붉은 연지/법성점
      ctx.fillStyle = "#e53935";
      ctx.beginPath();
      ctx.arc(x, y - 5, 1.6, 0, Math.PI * 2);
      ctx.fill();

    } else if (hairStyle === "curly_volume") {
      // 10. [자연스러운 내추럴 펌] - 풍성한 볼륨감의 트렌디 펌
      const bigCurls = [
        [-13, -8, 6], [-8, -15, 6.5], [0, -17, 7],
        [8, -15, 6.5], [13, -8, 6], [-12, 0, 5], [12, 0, 5]
      ];
      bigCurls.forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      // 앞머리 자연스러운 컬
      ctx.beginPath();
      ctx.arc(x - 4, y - 8, 4.5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 8, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- [개선 3] 얼굴 표정 4종 렌더링 ---
    ctx.fillStyle = "#3e2723";
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1.4;

    if (faceStyle === "gentle_smile") {
      // 1. 온화한 눈웃음 (초승달 모양)
      ctx.beginPath();
      ctx.arc(x - 4.5, y + 1, 2.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.arc(x + 4.5, y + 1, 2.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (faceStyle === "clear_eyes") {
      // 2. 맑고 또렷한 눈 (동그란 눈동자)
      ctx.beginPath();
      ctx.arc(x - 4.5, y + 1, 2, 0, Math.PI * 2);
      ctx.arc(x + 4.5, y + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (faceStyle === "glasses_wise") {
      // 3. 지혜로운 안경
      ctx.strokeStyle = "#b8860b";
      ctx.strokeRect(x - 8, y - 1, 6, 5);
      ctx.strokeRect(x + 2, y - 1, 6, 5);
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 1.5);
      ctx.lineTo(x + 2, y + 1.5);
      ctx.stroke();
    } else if (faceStyle === "meditation_calm") {
      // 4. 고요한 반개안 (수행하듯 살포시 내리뜬 눈)
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 1.5);
      ctx.lineTo(x - 2, y + 1.5);
      ctx.moveTo(x + 2, y + 1.5);
      ctx.lineTo(x + 7, y + 1.5);
      ctx.stroke();
    }

    // 뺨에 사랑스러운 연분홍 볼터치
    ctx.fillStyle = "rgba(244, 143, 177, 0.55)";
    ctx.beginPath();
    ctx.arc(x - 7.5, y + 4, 2.6, 0, Math.PI * 2);
    ctx.arc(x + 7.5, y + 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * [개선 3] 캐릭터 생성/수정 창 내 실시간 미니 캔버스 미리보기 렌더러
   */
  renderCharacterPreview(canvas, faceStyle, hairStyle, outfitColor, ageGroup) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 은은한 원형 배경 광배 효과
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2 - 4, 6, w / 2, h / 2 - 4, 52);
    bgGrad.addColorStop(0, "rgba(255, 236, 179, 0.65)");
    bgGrad.addColorStop(1, "rgba(245, 238, 220, 0)");
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 4, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    // 캔버스 중심에 1.55배 확대 렌더링
    ctx.translate(w / 2, h / 2 + 10);
    ctx.scale(1.55, 1.55);

    const outfitConf =
      (window.TEMPLE_CONFIG.outfitColors && window.TEMPLE_CONFIG.outfitColors.find((c) => c.id === outfitColor)) || {
        color: "#546e7a",
        vest: "#90a4ae"
      };

    // 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 26, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 법복 몸통
    ctx.fillStyle = outfitConf.color;
    ctx.beginPath();
    ctx.roundRect(-14, -2, 28, 26, 10);
    ctx.fill();

    // 배자/조끼
    ctx.fillStyle = outfitConf.vest;
    ctx.fillRect(-10, -2, 20, 14);

    // 얼굴 4종 및 헤어 10종
    this.drawCustomFaceAndHair(ctx, 0, -14, faceStyle, hairStyle, ageGroup);

    // 합장한 두 손
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.ellipse(0, 8, 4.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* =========================================================================
   * [SCENE 2] 대웅전: 정통 한국 불교 7단계 오체투지 배례 렌더링
   * ========================================================================= */
  renderDaeungjeonHall(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    wallGrad.addColorStop(0, "#20120b");
    wallGrad.addColorStop(0.5, "#382015");
    wallGrad.addColorStop(1, "#482a1d");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h * 0.62);

    ctx.fillStyle = "#5d2318";
    ctx.fillRect(w * 0.14, h * 0.06, w * 0.72, h * 0.44);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(w * 0.14, h * 0.06, w * 0.72, h * 0.44);

    const floorGrad = ctx.createLinearGradient(0, h * 0.56, 0, h);
    floorGrad.addColorStop(0, "#442719");
    floorGrad.addColorStop(1, "#26150d");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.56, w, h * 0.44);

    ctx.strokeStyle = "rgba(255, 213, 79, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const fy = h * 0.56 + (h * 0.44) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(w, fy);
      ctx.stroke();
    }

    this.drawHallCeilingLanterns(ctx, w, h);
    this.drawGoldenBuddhaStatue(ctx, w * 0.5, h * 0.34);
    this.drawAltarAndOfferings(ctx, w, h);
    this.drawInteractiveMoktak(ctx, w * 0.80, h * 0.73);

    // [개선 6] 정통 7단계 오체투지 배례 (인체 관절 리깅 기반)
    this.drawTraditionalProstrationAnatomy(ctx, w * 0.5, h * 0.84);

    this.drawFloatingFeedbacks(ctx);
  }

  /* =========================================================================
   * [SCENE 2.5] 삼성각 (三聖閣): 산신·칠성·독성 정통 오체투지 배례 도량
   * ========================================================================= */
  renderSamseonggakScene(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    // 1. [벽면] 고즈넉한 한국 목조 건축 황토벽
    const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    wallGrad.addColorStop(0, "#23150d");
    wallGrad.addColorStop(0.5, "#3b2216");
    wallGrad.addColorStop(1, "#4d2c1d");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h * 0.62);

    // 2. [바닥] 정갈한 온돌 옻칠 마루 장판
    const floorGrad = ctx.createLinearGradient(0, h * 0.56, 0, h);
    floorGrad.addColorStop(0, "#4a291a");
    floorGrad.addColorStop(0.5, "#381e13");
    floorGrad.addColorStop(1, "#22120b");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.56, w, h * 0.44);

    // 마루 결선
    ctx.strokeStyle = "rgba(255, 213, 79, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const fy = h * 0.56 + (h * 0.44) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(w, fy);
      ctx.stroke();
    }

    // 3. [상단 대들보 & 단청 & 현판]
    ctx.fillStyle = "#27150c";
    ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = "#2e6b47"; // 녹청 단청
    ctx.fillRect(0, 16, w, 5);
    ctx.fillStyle = "#b73b2b"; // 주홍 단청
    ctx.fillRect(0, 21, w, 3);

    // 상단 금박 현판: '三 聖 閣'
    const signW = 120;
    const signH = 18;
    const signX = w * 0.5 - signW / 2;
    ctx.fillStyle = "rgba(25, 12, 8, 0.95)";
    ctx.beginPath();
    ctx.roundRect(signX, 4, signW, signH, 5);
    ctx.fill();
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#ffd54f";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⛰️ 三 聖 閣 (산신·칠성·독성)", w * 0.5, 16.5);

    // 4. [삼성각 3대 탱화 제단 렌더링] (독성탱 · 칠성탱 · 산신탱)
    this.drawSamseongPaintings(ctx, w, h);

    // 5. [제단 위 촛불, 향로, 다기 공양]
    this.drawSamseongAltarOfferings(ctx, w, h);

    // 6. [정통 7단계 오체투지 배례] (대웅전과 동일한 인체 리깅 절하기 구동!)
    this.drawTraditionalProstrationAnatomy(ctx, w * 0.5, h * 0.84);

    // 7. 실시간 축원 및 부유 텍스트
    this.drawFloatingFeedbacks(ctx);
  }

  /**
   * 삼성각 3대 탱화: 중앙 치성광여래 칠성탱, 우측 산신령과 백호탱, 좌측 독성 나반존자탱
   */
  drawSamseongPaintings(ctx, w, h) {
    ctx.save();
    const altarX = w * 0.08;
    const altarY = 32;
    const altarW = w * 0.84;
    const altarH = h * 0.44;

    // 제단 전체 외곽 목조 프레임
    ctx.fillStyle = "#1e1008";
    ctx.fillRect(altarX, altarY, altarW, altarH);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(altarX, altarY, altarW, altarH);

    const frameW = (altarW - 16) / 3;
    const frameH = altarH - 12;
    const frameY = altarY + 6;

    // --- 1. [좌측] 독성 탱화 (獨聖幀 - 나반존자) ---
    const dokX = altarX + 4;
    ctx.fillStyle = "#263238";
    ctx.fillRect(dokX, frameY, frameW, frameH);
    ctx.strokeStyle = "rgba(255, 213, 79, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(dokX, frameY, frameW, frameH);

    // 천태산 깊은 솔숲 & 폭포 배경
    ctx.fillStyle = "#1b2e23";
    ctx.beginPath();
    ctx.moveTo(dokX, frameY + frameH);
    ctx.lineTo(dokX + frameW * 0.4, frameY + frameH * 0.35);
    ctx.lineTo(dokX + frameW, frameY + frameH);
    ctx.closePath();
    ctx.fill();

    // 독성 나반존자 성인 (가부좌 정진 자세)
    const dokCenterX = dokX + frameW * 0.5;
    const dokCenterY = frameY + frameH * 0.58;
    // 두광(후광)
    ctx.fillStyle = "rgba(255, 224, 130, 0.35)";
    ctx.beginPath();
    ctx.arc(dokCenterX, dokCenterY - 14, 15, 0, Math.PI * 2);
    ctx.fill();
    // 청회색 장삼 가사
    ctx.fillStyle = "#546e7a";
    ctx.beginPath();
    ctx.roundRect(dokCenterX - 14, dokCenterY - 4, 28, 20, 8);
    ctx.fill();
    // 붉은 가사 사선
    ctx.fillStyle = "#b71c1c";
    ctx.beginPath();
    ctx.moveTo(dokCenterX - 12, dokCenterY - 4);
    ctx.lineTo(dokCenterX + 10, dokCenterY + 14);
    ctx.lineTo(dokCenterX + 14, dokCenterY + 8);
    ctx.lineTo(dokCenterX - 4, dokCenterY - 4);
    ctx.closePath();
    ctx.fill();
    // 두 손에 쥔 염주
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.arc(dokCenterX, dokCenterY + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    // 성인의 온화한 얼굴과 흰 눈썹
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.arc(dokCenterX, dokCenterY - 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(dokCenterX - 5, dokCenterY - 16, 10, 1.5);
    // 라벨
    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("獨聖幀 (독성)", dokCenterX, frameY + frameH - 5);

    // --- 2. [중앙] 치성광여래 칠성 탱화 (七星幀 - 북두칠성) ---
    const chilX = dokX + frameW + 4;
    ctx.fillStyle = "#1a162b";
    ctx.fillRect(chilX, frameY, frameW, frameH);
    ctx.strokeStyle = "rgba(255, 213, 79, 0.7)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(chilX, frameY, frameW, frameH);

    const chilCenterX = chilX + frameW * 0.5;
    const chilCenterY = frameY + frameH * 0.52;

    // 밤하늘 북두칠성 7개의 반짝이는 황금 별자리
    const starOffsets = [
      { dx: -18, dy: -28 }, { dx: -10, dy: -32 }, { dx: 0, dy: -30 },
      { dx: 10, dy: -24 }, { dx: 12, dy: -14 }, { dx: 22, dy: -12 }, { dx: 20, dy: -2 }
    ];
    starOffsets.forEach((st, idx) => {
      const starTwinkle = 0.5 + 0.5 * Math.sin(this.elapsed * 4 + idx * 1.2);
      ctx.fillStyle = `rgba(255, 245, 157, ${starTwinkle})`;
      ctx.beginPath();
      ctx.arc(chilCenterX + st.dx * (frameW / 65), chilCenterY + st.dy * (frameH / 85), 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 치성광여래 부처님 대원광(황금 광배)
    const chRot = this.elapsed * 0.3;
    const chilGlow = ctx.createRadialGradient(chilCenterX, chilCenterY - 6, 4, chilCenterX, chilCenterY - 6, 26);
    chilGlow.addColorStop(0, "rgba(255, 238, 88, 0.95)");
    chilGlow.addColorStop(0.6, "rgba(255, 193, 7, 0.65)");
    chilGlow.addColorStop(1, "rgba(255, 143, 0, 0)");
    ctx.fillStyle = chilGlow;
    ctx.beginPath();
    ctx.arc(chilCenterX, chilCenterY - 6, 26, 0, Math.PI * 2);
    ctx.fill();

    // 치성광여래 금빛 존상
    ctx.fillStyle = "#ffb300";
    ctx.beginPath();
    ctx.roundRect(chilCenterX - 13, chilCenterY, 26, 18, 6);
    ctx.fill();
    ctx.fillStyle = "#ffe082";
    ctx.beginPath();
    ctx.arc(chilCenterX, chilCenterY - 8, 8.5, 0, Math.PI * 2);
    ctx.fill();
    // 육계(불두)
    ctx.fillStyle = "#e65100";
    ctx.beginPath();
    ctx.arc(chilCenterX, chilCenterY - 17, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // 수인(금륜보륜)
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.arc(chilCenterX, chilCenterY + 7, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // 라벨
    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 8.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("七星幀 (치성광여래)", chilCenterX, frameY + frameH - 5);

    // --- 3. [우측] 산신 탱화 (山神幀 - 백발 산신령님과 영험한 백호) ---
    const sanX = chilX + frameW + 4;
    ctx.fillStyle = "#2c2018";
    ctx.fillRect(sanX, frameY, frameW, frameH);
    ctx.strokeStyle = "rgba(255, 213, 79, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sanX, frameY, frameW, frameH);

    const sanCenterX = sanX + frameW * 0.5;
    const sanCenterY = frameY + frameH * 0.56;

    // 솔잎 소나무 가지
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.ellipse(sanCenterX + 12, frameY + 16, 16, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 든든하게 웅크린 백호(호랑이)
    const tigerX = sanCenterX + 8;
    const tigerY = sanCenterY + 10;
    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.ellipse(tigerX, tigerY, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // 호랑이 줄무늬
    ctx.strokeStyle = "#37474f";
    ctx.lineWidth = 1.2;
    [-4, 0, 4].forEach((tx) => {
      ctx.beginPath();
      ctx.moveTo(tigerX + tx - 2, tigerY - 6);
      ctx.lineTo(tigerX + tx, tigerY + 6);
      ctx.stroke();
    });
    // 호랑이 머리와 귀
    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.arc(tigerX - 10, tigerY - 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd54f"; // 호랑이 안광
    ctx.fillRect(tigerX - 12, tigerY - 4, 2, 2);

    // 백발 산신령님 (붉은 홍포 & 긴 백발 수염)
    const monkSanX = sanCenterX - 8;
    const monkSanY = sanCenterY - 4;
    ctx.fillStyle = "#c62828"; // 붉은 홍포
    ctx.beginPath();
    ctx.roundRect(monkSanX - 12, monkSanY, 24, 22, 6);
    ctx.fill();
    // 산신령 얼굴
    ctx.fillStyle = "#ffcc80";
    ctx.beginPath();
    ctx.arc(monkSanX, monkSanY - 7, 7.5, 0, Math.PI * 2);
    ctx.fill();
    // 풍성한 백발 수염
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(monkSanX - 6, monkSanY - 4);
    ctx.lineTo(monkSanX, monkSanY + 8);
    ctx.lineTo(monkSanX + 6, monkSanY - 4);
    ctx.closePath();
    ctx.fill();
    // 불로초 지팡이
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(monkSanX - 12, monkSanY - 14);
    ctx.lineTo(monkSanX - 12, monkSanY + 18);
    ctx.stroke();
    // 라벨
    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("山神幀 (산신령과 백호)", sanCenterX, frameY + frameH - 5);

    ctx.restore();
  }

  /**
   * 삼성각 제단 위 황금 촛대, 청동 향로, 감로 다기잔 공양물
   */
  drawSamseongAltarOfferings(ctx, w, h) {
    ctx.save();
    const altarTopY = h * 0.49;

    // 제단 목조 받침대 상판
    ctx.fillStyle = "#3e2723";
    ctx.fillRect(w * 0.10, altarTopY, w * 0.80, 18);
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * 0.10, altarTopY, w * 0.80, 18);

    // 1. 좌우 무병장수 황금 촛대 & 타오르는 촛불
    const candleFlicker = Math.sin(this.elapsed * 8) * 1.5;
    [w * 0.18, w * 0.82].forEach((cx) => {
      // 황금 촛대
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(cx - 5, altarTopY - 6, 10, 6);
      ctx.fillRect(cx - 2, altarTopY - 16, 4, 10);
      // 흰 양초
      ctx.fillStyle = "#fffde7";
      ctx.fillRect(cx - 3, altarTopY - 28, 6, 12);
      // 타오르는 화염
      const flameGrad = ctx.createRadialGradient(cx, altarTopY - 32 + candleFlicker * 0.4, 1, cx, altarTopY - 32, 8);
      flameGrad.addColorStop(0, "#ffffff");
      flameGrad.addColorStop(0.3, "#fff176");
      flameGrad.addColorStop(0.7, "#ff9800");
      flameGrad.addColorStop(1, "rgba(255, 87, 34, 0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(cx, altarTopY - 32 + candleFlicker * 0.4, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. 중앙 황금 향로와 모락모락 피어오르는 향 연기
    const burnerX = w * 0.5;
    const burnerY = altarTopY - 4;
    ctx.fillStyle = "#5d4037";
    ctx.beginPath();
    ctx.ellipse(burnerX, burnerY, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd54f"; // 금박 테두리
    ctx.beginPath();
    ctx.arc(burnerX, burnerY - 4, 7, Math.PI, Math.PI * 2);
    ctx.fill();

    // 붉은 향 끝
    ctx.fillStyle = "#ff3d00";
    ctx.beginPath();
    ctx.arc(burnerX, burnerY - 7, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 피어오르는 영험한 향 연기
    const incenseShift = Math.sin(this.elapsed * 2.2) * 10;
    ctx.strokeStyle = "rgba(240, 244, 250, 0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(burnerX, burnerY - 8);
    ctx.bezierCurveTo(burnerX + incenseShift, burnerY - 24, burnerX - incenseShift, burnerY - 46, burnerX + incenseShift * 1.4, burnerY - 68);
    ctx.stroke();

    // 3. 3위 성인께 올리는 감로 청수 다기잔 3개
    [-18, 0, 18].forEach((ox) => {
      const cupX = burnerX + ox * (w / 380);
      const cupY = altarTopY + 8;
      // 백자 다기잔
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.ellipse(cupX, cupY, 6.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // 맑은 청수
      ctx.fillStyle = "#81d4fa";
      ctx.beginPath();
      ctx.ellipse(cupX, cupY - 1, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * [개선 6] 한국 정통 7단계 오체투지(五體投地) 인체 해부학적 배례 애니메이션
   * 1. [합장 정립] (0.0~0.15) 서서 발을 모으고 가슴 앞에서 반배
   * 2. [무릎 꿇기] (0.15~0.32) 무릎이 좌복에 닿으며 다리가 접히고 치맛자락이 내려앉음
   * 3. [손 짚기] (0.32~0.46) 손을 가슴에서 풀어 좌복 앞을 짚음
   * 4. [오체투지 접지] (0.46~0.54) 이마가 두 손 사이 좌복에 지그시 닿음
   * 5. [접족례/고두배] (0.54~0.68) 부처님 발을 받드는 마음으로 양 손바닥을 귀 높이까지 하늘로 사뿐히 들어 올림!
   * 6. [손 짚고 상체 일으키기] (0.68~0.85) 손바닥을 다시 짚고 상체를 서서히 일으켜 꿇어앉음
   * 7. [일어서서 정립 합장] (0.85~1.0) 일어서서 단정하게 합장하며 마무리!
   */
  drawTraditionalProstrationAnatomy(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    const user = window.templeState.currentUser;
    const hair = user?.hairStyle || "chignon";
    const outfit = user?.outfitColor || "grey";
    const age = user?.ageGroup || "adult";
    const outfitConf = window.TEMPLE_CONFIG.outfitColors.find((c) => c.id === outfit) || window.TEMPLE_CONFIG.outfitColors[0];

    // 전통 사찰 좌복 (절 방석)
    ctx.fillStyle = "#8d2f23";
    ctx.beginPath();
    ctx.ellipse(0, 10, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 213, 79, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const p = this.bowState.isBowing ? this.bowState.phase : 0;

    // 단계별 곡선(관절) 수치 계산
    let kneeBend = 0;   // 0(서있음) ~ 1(무릎 꿇음)
    let spineBend = 0;  // 0(허리 꼿꼿) ~ 1(이마 접지)
    let handsLift = 0;  // 0 ~ 1 (접족례 손바닥 들어올림)

    if (this.bowState.isBowing) {
      if (p < 0.15) {
        // 1. 합장 반배
        spineBend = Math.sin((p / 0.15) * Math.PI) * 0.22;
      } else if (p < 0.32) {
        // 2. 무릎 꿇기
        const t = (p - 0.15) / 0.17;
        kneeBend = t;
        spineBend = 0.22 + t * 0.28;
      } else if (p < 0.48) {
        // 3. 손 짚기 & 이마 닿기
        const t = (p - 0.32) / 0.16;
        kneeBend = 1.0;
        spineBend = 0.5 + t * 0.5;
      } else if (p < 0.68) {
        // 4~5. 오체투지 & 접족례 (손바닥을 귀 옆에서 하늘로 지그시 뒤집어 올림!)
        kneeBend = 1.0;
        spineBend = 1.0;
        const t = (p - 0.48) / 0.20;
        handsLift = Math.sin(t * Math.PI); // 접족례 곡선
      } else if (p < 0.85) {
        // 6. 상체 일으킴
        const t = 1.0 - (p - 0.68) / 0.17;
        kneeBend = t * 0.8 + 0.2;
        spineBend = t * 0.6;
      } else {
        // 7. 서서 합장 원위치
        const t = 1.0 - (p - 0.85) / 0.15;
        kneeBend = t * 0.2;
        spineBend = t * 0.15;
      }
    }

    // 관절 높낮이 계산
    const pelvicY = kneeBend * 18;
    const shoulderY = -34 + kneeBend * 24 + spineBend * 14;
    const headY = -52 + kneeBend * 24 + spineBend * 28;

    // 1. 발/발뒤꿈치 (서 있을 때와 꿇었을 때 좌복 끝에 위치)
    ctx.fillStyle = "#fff8e1";
    ctx.beginPath();
    ctx.ellipse(-8, 6 + pelvicY * 0.2, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(8, 6 + pelvicY * 0.2, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 하체 및 치맛자락 (무릎을 꿇을 때 자연스럽게 주름지며 퍼짐)
    ctx.fillStyle = outfitConf.color;
    ctx.beginPath();
    const skirtWidth = 32 + kneeBend * 16;
    ctx.roundRect(-skirtWidth / 2, -18 + pelvicY, skirtWidth, 26, 12);
    ctx.fill();

    // 3. 접족례 손바닥 (이마 양옆에서 하늘로 뒤집어 올림!)
    if (spineBend > 0.45) {
      const alpha = Math.min(1, (spineBend - 0.45) * 2.5);
      ctx.fillStyle = `rgba(255, 224, 178, ${alpha})`;

      const liftY = -handsLift * 10;
      ctx.beginPath();
      // 손바닥 뒤집힘 (귀 높이에서 하늘을 받듦)
      ctx.ellipse(-20, -18 + liftY, 6, 4.5, -0.25, 0, Math.PI * 2);
      ctx.ellipse(20, -18 + liftY, 6, 4.5, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // 손가락 마디 표현
      ctx.strokeStyle = `rgba(189, 142, 114, ${alpha * 0.7})`;
      ctx.lineWidth = 1;
      [-22, -20, -18].forEach((fx) => {
        ctx.beginPath();
        ctx.moveTo(fx, -21 + liftY);
        ctx.lineTo(fx, -16 + liftY);
        ctx.stroke();
      });
      [18, 20, 22].forEach((fx) => {
        ctx.beginPath();
        ctx.moveTo(fx, -21 + liftY);
        ctx.lineTo(fx, -16 + liftY);
        ctx.stroke();
      });

      if (handsLift > 0.25) {
        ctx.fillStyle = `rgba(255, 238, 88, ${handsLift * 0.55})`;
        ctx.beginPath();
        ctx.arc(-20, -18 + liftY, 9, 0, Math.PI * 2);
        ctx.arc(20, -18 + liftY, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. 상체(등/척추) 및 조끼
    const torsoW = 34 + spineBend * 8;
    const torsoH = 32 - spineBend * 6;
    ctx.fillStyle = outfitConf.color;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2, shoulderY, torsoW, torsoH, 12);
    ctx.fill();

    ctx.fillStyle = outfitConf.vest;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 + 3, shoulderY + 2, torsoW - 6, torsoH * 0.7, 8);
    ctx.fill();

    // 5. 어깨와 팔 (서 있을 때는 가슴 앞 합장)
    if (spineBend < 0.5) {
      ctx.fillStyle = outfitConf.color;
      ctx.beginPath();
      ctx.ellipse(-18, shoulderY + 12, 6.5, 11, 0.2, 0, Math.PI * 2);
      ctx.ellipse(18, shoulderY + 12, 6.5, 11, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. 10종 헤어 뒷모습
    this.drawBackCustomHair(ctx, 0, headY, hair, age);

    // [개선 3] 절 진행 중 부처님 금빛 가피 오라 및 실시간 축원 말풍선
    if (this.bowState.isBowing) {
      ctx.strokeStyle = "rgba(255, 213, 79, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -20 + pelvicY * 0.5, 44 + Math.sin(this.elapsed * 6) * 3, 0, Math.PI * 2);
      ctx.stroke();

      // [개선 3] 간절한 나의 발원문과 실시간 108배 축원문 말풍선 렌더링
      this.drawBowSupplicationBubble(ctx);
    }

    ctx.restore();
  }

  /**
   * [개선 3] 대웅전 배례 중 실시간 진중한 축원문 & 발원문 말풍선
   */
  drawBowSupplicationBubble(ctx) {
    const cur = this.bowState.currentCount + 1;
    const total = this.bowState.targetCount;
    const p = this.bowState.phase;

    // 단계별 축원 문구
    let verse = this.bowBlessingVerses[(cur - 1) % this.bowBlessingVerses.length];
    if (p >= 0.50 && p <= 0.68) {
      verse = "부처님의 두 발을 경건히 받들며 모든 번뇌를 내려놓습니다 🙏";
    }

    const suppTitle = `제 ${cur}배 / ${total}배 지성 예배`;
    const suppWish = `발원 : "${this.currentBowSupplication}"`;

    ctx.save();
    ctx.font = "bold 9.5px sans-serif";
    const w1 = ctx.measureText(suppTitle).width;
    ctx.font = "bold 10.5px sans-serif";
    const w2 = ctx.measureText(suppWish).width;
    ctx.font = "italic 9.5px sans-serif";
    const w3 = ctx.measureText(verse).width;

    const maxTextW = Math.max(w1, w2, w3);
    const bubbleW = Math.max(180, Math.min(290, maxTextW + 30));
    const bubbleH = 68;
    const bubbleX = -bubbleW / 2;
    const bubbleY = -142;

    // 은은한 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.roundRect(bubbleX + 2, bubbleY + 3, bubbleW, bubbleH, 10);
    ctx.fill();

    // 고급 한지 미색 바탕
    ctx.fillStyle = "#fffcf4";
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 10);
    ctx.fill();

    // 금박 테두리
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 이중 단청 적갈색 실선
    ctx.strokeStyle = "rgba(183, 59, 43, 0.35)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(bubbleX + 3, bubbleY + 3, bubbleW - 6, bubbleH - 6);

    // 말풍선 아래 꼭짓점 꼬리표
    ctx.fillStyle = "#fffcf4";
    ctx.beginPath();
    ctx.moveTo(-7, bubbleY + bubbleH);
    ctx.lineTo(0, bubbleY + bubbleH + 8);
    ctx.lineTo(7, bubbleY + bubbleH);
    ctx.fill();
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, bubbleY + bubbleH);
    ctx.lineTo(0, bubbleY + bubbleH + 8);
    ctx.lineTo(7, bubbleY + bubbleH);
    ctx.stroke();

    // 1행: 배례 카운트 라벨 (단청 적색)
    ctx.fillStyle = "#b73b2b";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`📿 ${suppTitle}`, 0, bubbleY + 17);

    // 2행: 사용자 간절한 발원문 (진한 밤색)
    ctx.fillStyle = "#2c1a11";
    ctx.font = "bold 10.5px sans-serif";
    ctx.fillText(suppWish, 0, bubbleY + 36);

    // 3행: 불교 축원 성구/참회문 (은은한 짙은 녹청색)
    ctx.fillStyle = "#2e6b47";
    ctx.font = "italic 9.5px sans-serif";
    ctx.fillText(verse, 0, bubbleY + 54);

    ctx.restore();
  }

  /**
   * [개선 1] 대웅전 배례 & 심우당 뒷모습 10종 헤어스타일 SVG급 고품질 렌더러
   */
  drawBackCustomHair(ctx, x, y, hairStyle, ageGroup) {
    const isSilver = hairStyle === "silver_cut" || ageGroup === "elder";
    const hairColor = isSilver ? "#cfd8dc" : (ageGroup === "senior" ? "#4a3c31" : "#26211d");
    const hairHighlight = isSilver ? "#ffffff" : (ageGroup === "senior" ? "#6d5644" : "#423730");

    ctx.save();
    ctx.fillStyle = hairColor;
    ctx.strokeStyle = hairColor;

    // 기본 두상 베이스
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fill();

    if (hairStyle === "chignon") {
      // 1. 단아한 비녀 쪽머리 (뒤통수 아래 쪽머리 + 금비녀 + 비취옥)
      ctx.beginPath();
      ctx.arc(x, y + 6, 9.5, 0, Math.PI * 2);
      ctx.fill();
      // 금비녀
      ctx.fillStyle = "#ffd54f";
      ctx.fillRect(x - 16, y + 4, 32, 4);
      // 옥장식
      ctx.fillStyle = "#4caf50";
      ctx.beginPath();
      ctx.arc(x - 14, y + 6, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 14, y + 6, 3.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (hairStyle === "short_perm") {
      // 2. 우아한 볼륨 숏펌 (풍성한 뒷머리 펌 엠보싱)
      const backCurls = [
        [-12, 6, 6], [-6, 10, 6.5], [0, 11, 7],
        [6, 10, 6.5], [12, 6, 6], [-10, 0, 6], [10, 0, 6]
      ];
      backCurls.forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      // 링 하이라이트
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1;
      backCurls.slice(0, 5).forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, r * 0.5, 0.2, Math.PI * 0.9);
        ctx.stroke();
      });

    } else if (hairStyle === "silver_cut") {
      // 3. 정갈한 은발 숏컷 (목선 단정 라인)
      ctx.beginPath();
      ctx.moveTo(x - 17, y);
      ctx.lineTo(x - 13, y + 10);
      ctx.quadraticCurveTo(x, y + 14, x + 13, y + 10);
      ctx.lineTo(x + 17, y);
      ctx.closePath();
      ctx.fill();
      // 은빛 결선
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.1;
      [-8, -3, 3, 8].forEach((ox) => {
        ctx.beginPath();
        ctx.moveTo(x + ox, y);
        ctx.lineTo(x + ox * 0.8, y + 10);
        ctx.stroke();
      });

    } else if (hairStyle === "parted_gentle" || hairStyle === "classic_short") {
      // 4 & 8. 깔끔한 가르마 정갈컷 / 클래식 숏컷 (단정한 상고머리 라인)
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 1);
      ctx.lineTo(x - 11, y + 9);
      ctx.quadraticCurveTo(x, y + 11, x + 11, y + 9);
      ctx.lineTo(x + 16, y + 1);
      ctx.closePath();
      ctx.fill();
      // 깔끔한 면도 목선
      ctx.fillStyle = "#ffe0b2";
      ctx.fillRect(x - 9, y + 9, 18, 5);

    } else if (hairStyle === "straight_bob") {
      // 5. 차분한 흑발 단발 (목덜미를 덮는 찰랑 단발)
      ctx.beginPath();
      ctx.roundRect(x - 18, y - 2, 36, 17, 6);
      ctx.fill();
      ctx.strokeStyle = hairHighlight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y + 2, 12, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();

    } else if (hairStyle === "low_ponytail") {
      // 6. 단정한 묶음 포니테일 (중앙 아래 긴 묶음 머리와 분홍 댕기)
      // 묶음 꼬리
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 10);
      ctx.quadraticCurveTo(x - 10, y + 22, x, y + 26);
      ctx.quadraticCurveTo(x + 10, y + 22, x + 6, y + 10);
      ctx.closePath();
      ctx.fill();
      // 분홍 비단 댕기
      ctx.fillStyle = "#f06292";
      ctx.fillRect(x - 6, y + 7, 12, 5);
      ctx.beginPath();
      ctx.moveTo(x, y + 11);
      ctx.lineTo(x - 4, y + 22);
      ctx.lineTo(x + 4, y + 22);
      ctx.closePath();
      ctx.fill();

    } else if (hairStyle === "wave_half") {
      // 7. 부드러운 웨이브 반묶음 (어깨로 흐르는 웨이브 머릿결)
      ctx.beginPath();
      ctx.moveTo(x - 18, y);
      ctx.quadraticCurveTo(x - 22, y + 14, x - 13, y + 24);
      ctx.quadraticCurveTo(x, y + 26, x + 13, y + 24);
      ctx.quadraticCurveTo(x + 22, y + 14, x + 18, y);
      ctx.closePath();
      ctx.fill();
      // 반묶음 헤어핀
      ctx.fillStyle = "#80cbc4";
      ctx.beginPath();
      ctx.arc(x, y + 4, 5.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (hairStyle === "shaved_monk") {
      // 9. 귀여운 동자승 삭발 (맑은 두상 명암)
      ctx.fillStyle = "#f3dbbf";
      ctx.beginPath();
      ctx.arc(x, y, 16.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180, 140, 110, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, 14, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();

    } else if (hairStyle === "curly_volume") {
      // 10. 자연스러운 내추럴 펌 (풍성한 컬 볼륨)
      const bigBackCurls = [
        [-13, 5, 7], [-7, 12, 7.5], [0, 13, 8],
        [7, 12, 7.5], [13, 5, 7], [-12, -2, 6], [12, -2, 6]
      ];
      bigBackCurls.forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  /* =========================================================================
   * [SCENE 3] 주지스님 다실 (심우당) 패미콤/레트로 RPG 감성 캔버스
   * ========================================================================= */
  /* =========================================================================
   * [SCENE 3] 주지스님 다실 (심우당 尋牛堂) - 고즈넉한 한국 전통 한옥 다실
   * ========================================================================= */
  renderMonkRoomRetroScene(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    const user = window.templeState.currentUser;
    const hair = user?.hairStyle || "chignon";
    const age = user?.ageGroup || "adult";
    const outfit = user?.outfitColor || "grey";
    const outfitConf = window.TEMPLE_CONFIG.outfitColors.find((c) => c.id === outfit) || window.TEMPLE_CONFIG.outfitColors[0];

    // 1. [벽면] 따뜻한 전통 황토 한지 벽체
    const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    wallGrad.addColorStop(0, "#2a1b14");
    wallGrad.addColorStop(0.3, "#42281a");
    wallGrad.addColorStop(1, "#361f13");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, h * 0.65);

    // 2. [바닥] 옻칠 한지 온돌 마루 장판
    const floorGrad = ctx.createLinearGradient(0, h * 0.60, 0, h);
    floorGrad.addColorStop(0, "#5a341e");
    floorGrad.addColorStop(0.5, "#432514");
    floorGrad.addColorStop(1, "#261309");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.60, w, h * 0.40);

    // 마루 널빤지 결선
    ctx.strokeStyle = "rgba(255, 213, 79, 0.08)";
    ctx.lineWidth = 1;
    for (let f = 1; f < 5; f++) {
      const fy = h * 0.60 + (h * 0.40) * (f / 5);
      ctx.beginPath();
      ctx.moveTo(0, fy);
      ctx.lineTo(w, fy);
      ctx.stroke();
    }

    // 3. [한옥 구조재] 대들보와 좌우 원목 기둥
    ctx.fillStyle = "#27150c";
    ctx.fillRect(0, 0, w, 14); // 상단 대들보
    ctx.fillRect(0, 0, 16, h); // 좌측 기둥
    ctx.fillRect(w - 16, 0, 16, h); // 우측 기둥

    // 기둥 원목 테두리 하이라이트
    ctx.strokeStyle = "rgba(255, 213, 79, 0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 0, 15, h);
    ctx.strokeRect(w - 16, 0, 15, h);

    // 4. [창호문] 은은한 한지 격자 창호와 창밖 솔숲 풍경
    const winX = w * 0.16;
    const winY = 22;
    const winW = w * 0.68;
    const winH = h * 0.44;

    // 창문 프레임 바깥 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(winX + 2, winY + 2, winW, winH);

    // 창밖 은은한 산사 달빛/솔숲 배경
    const winSkyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    winSkyGrad.addColorStop(0, "#16233b");
    winSkyGrad.addColorStop(0.55, "#2a3d5e");
    winSkyGrad.addColorStop(1, "#4d3d3b");
    ctx.fillStyle = winSkyGrad;
    ctx.fillRect(winX, winY, winW, winH);

    // 창밖 고요한 보름달
    ctx.fillStyle = "rgba(255, 249, 196, 0.9)";
    ctx.beginPath();
    ctx.arc(winX + winW * 0.8, winY + 36, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 245, 157, 0.25)";
    ctx.beginPath();
    ctx.arc(winX + winW * 0.8, winY + 36, 26, 0, Math.PI * 2);
    ctx.fill();

    // 창밖 흔들리는 고요한 대나무 실루엣
    const bambooSway = Math.sin(this.elapsed * 1.6) * 4;
    ctx.strokeStyle = "#1b3320";
    ctx.lineWidth = 3;
    [-24, -8, 12, 32].forEach((bx, idx) => {
      ctx.beginPath();
      ctx.moveTo(winX + winW * 0.45 + bx, winY + winH);
      ctx.quadraticCurveTo(
        winX + winW * 0.45 + bx + bambooSway * (idx % 2 === 0 ? 1 : 0.7),
        winY + winH * 0.45,
        winX + winW * 0.45 + bx + 8 + bambooSway,
        winY + 12
      );
      ctx.stroke();
    });

    // 반투명 창호지 레이어
    ctx.fillStyle = "rgba(255, 252, 238, 0.52)";
    ctx.fillRect(winX, winY, winW, winH);

    // 창호 격자 살 (살창)
    ctx.strokeStyle = "#4e2c1a";
    ctx.lineWidth = 2.4;
    ctx.strokeRect(winX, winY, winW, winH);
    for (let c = 1; c < 6; c++) {
      const gx = winX + winW * (c / 6);
      ctx.beginPath();
      ctx.moveTo(gx, winY);
      ctx.lineTo(gx, winY + winH);
      ctx.stroke();
    }
    for (let r = 1; r < 5; r++) {
      const gy = winY + winH * (r / 5);
      ctx.beginPath();
      ctx.moveTo(winX, gy);
      ctx.lineTo(winX + winW, gy);
      ctx.stroke();
    }

    // 5. [수묵 족자] 벽면에 걸린 전통 차선일미 편액 / 一圓相 족자
    const scrollX = 22;
    const scrollY = 32;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(scrollX + 2, scrollY + 2, 28, 62);
    ctx.fillStyle = "#ede0cc";
    ctx.fillRect(scrollX, scrollY, 28, 62);
    ctx.fillStyle = "#8d4e35";
    ctx.fillRect(scrollX - 2, scrollY - 2, 32, 4); // 상단 축봉
    ctx.fillRect(scrollX - 2, scrollY + 60, 32, 5); // 하단 축봉
    // 일원상 (달마 선화 원형 먹그림)
    ctx.strokeStyle = "#2b211b";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(scrollX + 14, scrollY + 26, 8.5, 0.2, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = "#3e2723";
    ctx.font = "bold 7px serif";
    ctx.textAlign = "center";
    ctx.fillText("無心", scrollX + 14, scrollY + 48);

    // 6. [혜안 주지스님 좌상] (다실 상석에 온화하게 마주 앉으신 모습)
    const monkX = w * 0.5;
    const monkY = h * 0.44;
    const monkBreath = Math.sin(this.elapsed * 2.2) * 1.5;

    // 스님 가사 장삼 (청회색 장삼 + 붉은 가사)
    ctx.fillStyle = "#546e7a";
    ctx.beginPath();
    ctx.roundRect(monkX - 32, monkY + monkBreath, 64, 52, 16);
    ctx.fill();

    // 붉은 가사 사선
    ctx.fillStyle = "#b73b2b";
    ctx.beginPath();
    ctx.moveTo(monkX - 28, monkY + monkBreath);
    ctx.lineTo(monkX + 22, monkY + 46 + monkBreath);
    ctx.lineTo(monkX + 32, monkY + 36 + monkBreath);
    ctx.lineTo(monkX - 14, monkY + monkBreath);
    ctx.closePath();
    ctx.fill();

    // 황금 가사 고리 (옥환)
    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.arc(monkX - 14, monkY + 12 + monkBreath, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 스님 얼굴 (온화한 살결)
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.arc(monkX, monkY - 15 + monkBreath, 17, 0, Math.PI * 2);
    ctx.fill();

    // 귓볼 (도톰한 부처님 귀)
    ctx.fillStyle = "#f5cb98";
    ctx.beginPath();
    ctx.arc(monkX - 17, monkY - 13 + monkBreath, 3.8, 0, Math.PI * 2);
    ctx.arc(monkX + 17, monkY - 13 + monkBreath, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // 자애로운 눈매와 미소
    ctx.strokeStyle = "#4e342e";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(monkX - 5.5, monkY - 15 + monkBreath, 3.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(monkX + 5.5, monkY - 15 + monkBreath, 3.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(monkX, monkY - 10 + monkBreath, 4.5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // 합장 또는 찻잔을 권하시는 손
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.ellipse(monkX, monkY + 28 + monkBreath, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 7. [통원목 찻상] 고풍스러운 느티나무 통원목 다탁
    const tableX = w * 0.5;
    const tableY = h * 0.65;
    const tableW = 150;
    const tableH = 34;

    // 찻상 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.roundRect(tableX - tableW / 2 + 3, tableY + 4, tableW, tableH, 10);
    ctx.fill();

    // 원목 찻상 상판 (느티나무 나뭇결)
    const tableGrad = ctx.createLinearGradient(0, tableY, 0, tableY + tableH);
    tableGrad.addColorStop(0, "#5d3521");
    tableGrad.addColorStop(0.4, "#6d3e26");
    tableGrad.addColorStop(1, "#3e2013");
    ctx.fillStyle = tableGrad;
    ctx.beginPath();
    ctx.roundRect(tableX - tableW / 2, tableY, tableW, tableH, 10);
    ctx.fill();

    // 찻상 모서리 금빛 옻칠 테두리
    ctx.strokeStyle = "rgba(255, 213, 79, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 8. [다기 세트] 고려청자 찻잔 & 백자 다관(차 주전자)
    // 중앙 백자 다관
    ctx.fillStyle = "#eceff1";
    ctx.beginPath();
    ctx.arc(tableX, tableY + 11, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b0bec5";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 다관 뚜껑 손잡이
    ctx.fillStyle = "#78909c";
    ctx.beginPath();
    ctx.arc(tableX, tableY + 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // 청자 찻잔 2개 (스님 앞 & 내 앞 좌우)
    const cupLeftX = tableX - 42;
    const cupRightX = tableX + 42;
    const cupY = tableY + 15;

    [cupLeftX, cupRightX].forEach((cx) => {
      // 찻잔 받침
      ctx.fillStyle = "#3e2723";
      ctx.beginPath();
      ctx.ellipse(cx, cupY + 4, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // 비취빛 청자 찻잔
      ctx.fillStyle = "#80cbc4";
      ctx.beginPath();
      ctx.ellipse(cx, cupY, 8.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // 찻물 (맑은 황금빛 작설차)
      ctx.fillStyle = "#dce775";
      ctx.beginPath();
      ctx.ellipse(cx, cupY - 1, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 모락모락 피어오르는 따스한 차 김 (Steam)
    [cupLeftX, tableX, cupRightX].forEach((sx, idx) => {
      const steamPhase = this.elapsed * 2.5 + idx * 2.1;
      const steamShift = Math.sin(steamPhase) * 6;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, tableY + 6);
      ctx.quadraticCurveTo(sx + steamShift, tableY - 8, sx - steamShift * 0.7, tableY - 22);
      ctx.stroke();
    });

    // 9. [청동 향로 & 향 연기]
    const burnerX = w - 38;
    const burnerY = h * 0.61;
    // 향로 몸통
    ctx.fillStyle = "#4e342e";
    ctx.beginPath();
    ctx.ellipse(burnerX, burnerY, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd54f"; // 금동 뚜껑
    ctx.beginPath();
    ctx.arc(burnerX, burnerY - 3, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    // 타오르는 붉은 향 끝
    ctx.fillStyle = "#ff5722";
    ctx.beginPath();
    ctx.arc(burnerX, burnerY - 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // 피어오르는 향 연기
    const incenseShift = Math.sin(this.elapsed * 1.8) * 8;
    ctx.strokeStyle = "rgba(230, 238, 248, 0.45)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(burnerX, burnerY - 6);
    ctx.bezierCurveTo(burnerX + incenseShift, burnerY - 22, burnerX - incenseShift, burnerY - 40, burnerX + incenseShift * 1.2, burnerY - 58);
    ctx.stroke();

    // 10. [내 캐릭터] 찻상 건너편에 단정하게 마주 앉은 모습
    const charX = w * 0.5;
    const charY = h * 0.88;

    // 한복 몸통
    ctx.fillStyle = outfitConf.color;
    ctx.beginPath();
    ctx.roundRect(charX - 36, charY - 28, 72, 52, 18);
    ctx.fill();

    // 배자/조끼
    ctx.fillStyle = outfitConf.vest;
    ctx.beginPath();
    ctx.roundRect(charX - 26, charY - 26, 52, 34, 12);
    ctx.fill();

    // 찻상 위에 살포시 올려둔 합장/손
    ctx.fillStyle = "#ffe0b2";
    ctx.beginPath();
    ctx.ellipse(charX, charY - 26, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 10종 헤어 뒷모습 렌더러
    this.drawBackCustomHair(ctx, charX, charY - 44, hair, age);

    // 11. [개선 5] [상단 편액] 고풍스러운 금박 심우당 편액 (글자 크기에 맞춰 자동 계산)
    const signText = "🍵 심우당 (尋牛堂) · 차선일미(茶禪一味)";
    ctx.font = "bold 9.5px sans-serif";
    const signTextW = ctx.measureText(signText).width;
    const signW = Math.max(195, signTextW + 32);
    const signH = 24;
    const signX = w * 0.5 - signW / 2;
    const signY = 18;

    ctx.fillStyle = "rgba(20, 10, 5, 0.90)";
    ctx.beginPath();
    ctx.roundRect(signX, signY, signW, signH, 7);
    ctx.fill();

    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX + 2, signY + 2, signW - 4, signH - 4);

    ctx.fillStyle = "#ffd54f";
    ctx.textAlign = "center";
    ctx.fillText(signText, w * 0.5, signY + 15.5);

    ctx.restore();
  }

  /* --- 디테일 도우미 --- */
  drawCelestialBodies(ctx, w, h, timeOfDay) {
    ctx.save();
    if (timeOfDay === "night" || timeOfDay === "deep_night" || timeOfDay === "dawn") {
      const moonX = w * 0.82;
      const moonY = h * 0.14;
      const glow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 36);
      glow.addColorStop(0, "rgba(255, 249, 196, 0.95)");
      glow.addColorStop(0.4, "rgba(255, 245, 157, 0.35)");
      glow.addColorStop(1, "rgba(255, 245, 157, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fffde7";
      ctx.beginPath();
      ctx.arc(moonX, moonY, 13, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 14; i++) {
        const sx = (w * ((i * 37 + 13) % 95)) / 100;
        const sy = (h * ((i * 23 + 7) % 28)) / 100;
        const twinkle = 0.35 + 0.55 * Math.abs(Math.sin(this.elapsed * 1.8 + i));
        ctx.fillStyle = `rgba(255, 255, 240, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const sunX = w * 0.80;
      const sunY = timeOfDay === "sunset" ? h * 0.28 : h * 0.14;
      const sunColor = timeOfDay === "sunset" ? "rgba(255, 167, 38, 0.85)" : "rgba(255, 241, 118, 0.85)";
      const glow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 46);
      glow.addColorStop(0, sunColor);
      glow.addColorStop(1, "rgba(255, 241, 118, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMountainLayer(ctx, w, h, baseY, color, alpha, seed) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    ctx.quadraticCurveTo(w * 0.2, baseY - 55 * seed * 0.6, w * 0.42, baseY - 12);
    ctx.quadraticCurveTo(w * 0.68, baseY - 70 * (seed === 1 ? 0.9 : 0.6), w, baseY - 18);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawFogLayers(ctx, w, h, multiplier) {
    ctx.save();
    this.fogClouds.forEach((f, idx) => {
      const yPos = h * 0.26 + idx * (h * 0.075);
      const grad = ctx.createRadialGradient(f.x, yPos, 10, f.x, yPos, f.width * 0.6);
      grad.addColorStop(0, `rgba(240, 244, 248, ${f.alpha * multiplier})`);
      grad.addColorStop(1, "rgba(240, 244, 248, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(f.x, yPos, f.width * 0.65, f.height, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawPineTree(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(-8, -10, 4, -38);
    ctx.stroke();

    const clusters = [
      { cx: -14, cy: -24, rx: 20, ry: 11, c: "#2e5a36" },
      { cx: 14, cy: -30, rx: 22, ry: 12, c: "#366940" },
      { cx: 0, cy: -45, rx: 25, ry: 13, c: "#417a4c" }
    ];
    clusters.forEach((cl) => {
      ctx.fillStyle = cl.c;
      ctx.beginPath();
      ctx.ellipse(cl.cx, cl.cy, cl.rx, cl.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  /**
   * [개선 5] 한국 사찰 고유의 삼성각(三聖閣 - 산신·칠성·독성각) 전각 렌더러
   */
  drawSamseonggak(ctx, x, y, timeOfDay) {
    ctx.save();
    ctx.translate(x, y);

    this.samseonggakHitbox = { x, y, radius: 36 };

    // 기단 (돌계단)
    ctx.fillStyle = "#90a4ae";
    ctx.fillRect(-34, 18, 68, 8);
    ctx.fillStyle = "#78909c";
    ctx.fillRect(-36, 24, 72, 6);

    // 전각 몸통 벽면 (단아한 흰 회벽)
    ctx.fillStyle = "#faf6ee";
    ctx.fillRect(-30, -12, 60, 30);

    // 단청 붉은 기둥 4개
    ctx.fillStyle = "#b73b2b";
    ctx.fillRect(-30, -12, 5, 30);
    ctx.fillRect(-12, -12, 4, 30);
    ctx.fillRect(8, -12, 4, 30);
    ctx.fillRect(25, -12, 5, 30);

    // 창호 격자문 (은은한 실내 황금빛 촛불 투과)
    ctx.fillStyle = "rgba(255, 236, 179, 0.75)";
    ctx.fillRect(-8, -6, 16, 24);
    ctx.strokeStyle = "#5d3a29";
    ctx.lineWidth = 1;
    ctx.strokeRect(-8, -6, 16, 24);
    // 살창 십자
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 18);
    ctx.moveTo(-8, 6);
    ctx.lineTo(8, 6);
    ctx.stroke();

    // 단청 공포 (처마 밑 화려한 녹청/단청)
    ctx.fillStyle = "#2e6b47";
    ctx.fillRect(-34, -16, 68, 5);
    ctx.fillStyle = "#ffd54f";
    [-24, -12, 0, 12, 24].forEach((dx) => {
      ctx.fillRect(dx - 2, -15, 4, 3);
    });

    // 전통 팔작지붕 (한국 기와지붕의 유려한 처마 곡선)
    ctx.fillStyle = "#263238";
    ctx.beginPath();
    ctx.moveTo(-44, -15);
    ctx.quadraticCurveTo(-22, -26, 0, -28);
    ctx.quadraticCurveTo(22, -26, 44, -15);
    ctx.quadraticCurveTo(28, -19, 0, -20);
    ctx.quadraticCurveTo(-28, -19, -44, -15);
    ctx.closePath();
    ctx.fill();

    // 지붕 합각면
    ctx.fillStyle = "#37474f";
    ctx.beginPath();
    ctx.moveTo(-36, -17);
    ctx.lineTo(0, -32);
    ctx.lineTo(36, -17);
    ctx.closePath();
    ctx.fill();

    // 용마루
    ctx.fillStyle = "#455a64";
    ctx.fillRect(-22, -34, 44, 4);
    // 치미/취두
    ctx.fillStyle = "#cfd8dc";
    ctx.fillRect(-24, -36, 4, 6);
    ctx.fillRect(20, -36, 4, 6);

    // 금박 현판: '三聖閣'
    ctx.fillStyle = "rgba(35, 20, 12, 0.95)";
    ctx.fillRect(-16, -23, 32, 9);
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-16, -23, 32, 9);
    ctx.fillStyle = "#ffd54f";
    ctx.font = "bold 6.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("三聖閣", 0, -16.5);

    // 전각 앞 무병장수 황금 촛대 & 흔들리는 촛불
    const candleFlicker = Math.sin(this.elapsed * 8) * 1.5;
    [-18, 18].forEach((cx) => {
      // 촛대 받침
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(cx - 3, 16, 6, 3);
      ctx.fillRect(cx - 1, 10, 2, 6);
      // 흰 양초
      ctx.fillStyle = "#fffde7";
      ctx.fillRect(cx - 2, 3, 4, 7);
      // 타오르는 촛불 화염
      const flameGrad = ctx.createRadialGradient(cx, 1 + candleFlicker * 0.3, 0.8, cx, 1 + candleFlicker * 0.3, 4.5);
      flameGrad.addColorStop(0, "#ffffff");
      flameGrad.addColorStop(0.4, "#ffd54f");
      flameGrad.addColorStop(1, "rgba(255, 87, 34, 0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.arc(cx, 1 + candleFlicker * 0.3, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // [개선 4] 안내 말풍선 라벨 (지붕 상단에 띄워 하단 석탑과 전혀 겹치지 않음)
    ctx.fillStyle = "rgba(30, 20, 15, 0.88)";
    ctx.beginPath();
    ctx.roundRect(-24, -48, 48, 14, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 213, 79, 0.6)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = "#ffd54f";
    ctx.font = "bold 7.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⛰️ 삼성각", 0, -38.5);

    ctx.restore();
  }

  drawDaeungjeonExterior(ctx, cx, cy, w, h, level, timeOfDay) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = "#b0bec5";
    ctx.fillRect(-92, 26, 184, 18);
    ctx.fillStyle = "#90a4ae";
    ctx.fillRect(-98, 40, 196, 12);

    ctx.fillStyle = "#cfd8dc";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-26 - i * 2, 26 + i * 6, 52 + i * 4, 5);
    }

    ctx.fillStyle = "#4e342e";
    ctx.fillRect(-78, -22, 156, 48);

    const isNight = timeOfDay === "night" || timeOfDay === "deep_night" || timeOfDay === "dawn" || timeOfDay === "sunset";
    const doorGlow = isNight ? "#ffe082" : "#fff8e1";
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = doorGlow;
      ctx.fillRect(i * 26 - 9, -14, 18, 36);
      ctx.strokeStyle = "#6d4c41";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(i * 26 - 9, -14, 18, 36);
    }

    ctx.fillStyle = "#8d2f23";
    [-76, -40, -13, 13, 40, 76].forEach((px) => {
      ctx.fillRect(px - 3, -22, 6, 48);
    });

    ctx.fillStyle = "#2e7d32";
    ctx.fillRect(-84, -30, 168, 9);
    ctx.fillStyle = "#c62828";
    ctx.fillRect(-82, -24, 164, 4);

    ctx.fillStyle = level >= 5 ? "#37474f" : "#263238";
    ctx.beginPath();
    ctx.moveTo(-112, -26);
    ctx.quadraticCurveTo(-55, -62, 0, -64);
    ctx.quadraticCurveTo(55, -62, 112, -26);
    ctx.quadraticCurveTo(55, -32, 0, -30);
    ctx.quadraticCurveTo(-55, -32, -112, -26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(-28, -42, 56, 15);
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-28, -42, 56, 15);
    ctx.fillStyle = "#ffd54f";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("大 雄 殿", 0, -31);

    const swing = Math.sin(this.elapsed * 2.5) * 3;
    [-104, 104].forEach((bellX) => {
      ctx.strokeStyle = "#bcaaa4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bellX, -26);
      ctx.lineTo(bellX + swing, -12);
      ctx.stroke();
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.arc(bellX + swing, -12, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const pulse = 0.85 + 0.15 * Math.sin(this.elapsed * 3);
    ctx.fillStyle = `rgba(35, 24, 18, ${0.75 * pulse})`;
    ctx.beginPath();
    ctx.roundRect(-52, -84, 104, 20, 10);
    ctx.fill();
    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("🙏 대웅전 참배하기", 0, -70);

    ctx.restore();
  }

  drawFamilyWishesLanternRacks(ctx, w, h, timeOfDay) {
    const wishes = window.templeState.state.wishes || [];
    if (wishes.length === 0) return;

    ctx.save();
    const startX = w * 0.12;
    const startY = h * 0.43;
    const endX = w * 0.88;
    const endY = h * 0.43;

    ctx.strokeStyle = "rgba(45, 28, 20, 0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(w * 0.5, startY + 28, endX, endY);
    ctx.stroke();

    const displayCount = Math.min(wishes.length, 10);

    for (let i = 0; i < displayCount; i++) {
      const t = (i + 1) / (displayCount + 1);
      const lx = startX + (endX - startX) * t;
      const ly = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * (startY + 28) + t * t * endY;
      const swing = Math.sin(this.elapsed * 2.2 + i * 1.1) * 2.5;

      const wish = wishes[i];
      const col = wish.lanternColor || "#ffca28";
      const isNight = timeOfDay === "night" || timeOfDay === "deep_night" || timeOfDay === "sunset";

      if (isNight) {
        const glow = ctx.createRadialGradient(lx + swing, ly + 9, 2, lx + swing, ly + 9, 20);
        glow.addColorStop(0, "rgba(255, 238, 88, 0.85)");
        glow.addColorStop(0.5, "rgba(255, 179, 0, 0.3)");
        glow.addColorStop(1, "rgba(255, 179, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx + swing, ly + 9, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "#4e342e";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + swing, ly + 5);
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(lx + swing, ly + 11, 7.5, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#fff8e1";
      ctx.fillRect(lx + swing - 4.5, ly + 21, 9, 12);
      ctx.fillStyle = "#3e2723";
      ctx.font = "bold 7px sans-serif";
      ctx.textAlign = "center";
      const shortAuthor = (wish.authorName || "").slice(0, 3);
      ctx.fillText(shortAuthor, lx + swing, ly + 29);

      this.lanternHitboxes.push({
        id: wish.id,
        x: lx + swing,
        y: ly + 11,
        radius: 12,
        wish
      });
    }

    ctx.restore();
  }

  drawPagoda(ctx, x, y, isGold5) {
    ctx.save();
    ctx.translate(x, y);

    const stories = isGold5 ? 5 : 3;
    const bodyColor = isGold5 ? "#ffd54f" : "#cfd8dc";
    const roofColor = isGold5 ? "#ffb300" : "#90a4ae";

    ctx.fillStyle = isGold5 ? "#ffe082" : "#b0bec5";
    ctx.fillRect(-26, 10, 52, 12);
    ctx.fillRect(-20, 2, 40, 10);

    for (let i = 0; i < stories; i++) {
      const w = 32 - i * 4.2;
      const rw = w + 12;
      const py = -8 - i * 16;

      ctx.fillStyle = bodyColor;
      ctx.fillRect(-w / 2, py, w, 11);

      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(-rw / 2, py);
      ctx.lineTo(rw / 2, py);
      ctx.lineTo(w / 2, py - 5);
      ctx.lineTo(-w / 2, py - 5);
      ctx.closePath();
      ctx.fill();
    }

    const topY = -8 - stories * 16;
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, topY + 6);
    ctx.lineTo(0, topY - 10);
    ctx.stroke();

    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.arc(0, topY - 10, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(-34, 26, 68, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#fff8e1";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isGold5 ? "황금오층탑" : "삼층석탑", 0, 37);

    ctx.restore();
  }

  drawBellPavilion(ctx, x, y, timeOfDay) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(-30, 12, 60, 10);
    ctx.fillStyle = "#8d2f23";
    ctx.fillRect(-24, -22, 5, 34);
    ctx.fillRect(19, -22, 5, 34);

    const swing = Math.sin(this.elapsed * 1.5) * 1.2;
    ctx.fillStyle = "#5d4037";
    ctx.beginPath();
    ctx.moveTo(-10 + swing, -14);
    ctx.lineTo(10 + swing, -14);
    ctx.lineTo(14 + swing, 6);
    ctx.lineTo(-14 + swing, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#263238";
    ctx.beginPath();
    ctx.moveTo(-38, -20);
    ctx.quadraticCurveTo(0, -42, 38, -20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(-26, 26, 52, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#fff8e1";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔔 범종각", 0, 37);

    ctx.restore();
  }

  drawStoneLantern(ctx, x, y, timeOfDay) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "#b0bec5";
    ctx.fillRect(-8, 6, 16, 6);
    ctx.fillRect(-4, -6, 8, 12);

    const isLit = timeOfDay !== "day" && timeOfDay !== "morning";
    if (isLit) {
      const glow = ctx.createRadialGradient(0, -10, 2, 0, -10, 18);
      glow.addColorStop(0, "rgba(255, 213, 79, 0.8)");
      glow.addColorStop(1, "rgba(255, 213, 79, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -10, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = isLit ? "#ffd54f" : "#eceff1";
    ctx.fillRect(-6, -14, 12, 8);

    ctx.fillStyle = "#78909c";
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(12, -14);
    ctx.lineTo(0, -22);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawLotusPond(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "#4db6ac";
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8d6e63";
    ctx.lineWidth = 3;
    ctx.stroke();

    [-22, 16].forEach((lx, i) => {
      const ly = i === 0 ? -4 : 5;
      ctx.fillStyle = "#2e7d32";
      ctx.beginPath();
      ctx.ellipse(lx, ly, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f48fb1";
      ctx.beginPath();
      ctx.arc(lx, ly - 3, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const fishX = Math.cos(this.elapsed * 1.2) * 18;
    const fishY = Math.sin(this.elapsed * 2.4) * 6;
    ctx.fillStyle = "#ff7043";
    ctx.beginPath();
    ctx.ellipse(fishX, fishY, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawSmallHermitage(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(-24, -10, 48, 22);
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(-10, -6, 20, 14);
    ctx.fillStyle = "#37474f";
    ctx.beginPath();
    ctx.moveTo(-34, -10);
    ctx.quadraticCurveTo(0, -28, 34, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawHallCeilingLanterns(ctx, w, h) {
    ctx.save();
    const colors = ["#ef5350", "#ffca28", "#66bb6a", "#ff7043", "#ab47bc", "#ffca28", "#ef5350"];
    for (let i = 0; i < 7; i++) {
      const lx = w * (0.1 + i * 0.133);
      const ly = 22 + (i % 2) * 8 + Math.sin(this.elapsed * 2 + i) * 1.5;

      ctx.strokeStyle = "#8d6e63";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.ellipse(lx, ly + 8, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff8e1";
      ctx.fillRect(lx - 2, ly + 19, 4, 8);
    }
    ctx.restore();
  }

  drawGoldenBuddhaStatue(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    const haloRadius = 74 + Math.sin(this.elapsed * 2) * 4;
    const haloGrad = ctx.createRadialGradient(0, -18, 12, 0, -18, haloRadius);
    haloGrad.addColorStop(0, "rgba(255, 238, 88, 0.9)");
    haloGrad.addColorStop(0.55, "rgba(255, 193, 7, 0.35)");
    haloGrad.addColorStop(1, "rgba(255, 193, 7, 0)");
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, -18, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 213, 79, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -36, 30, 0, Math.PI * 2);
    ctx.stroke();

    const petals = [-36, -22, -8, 8, 22, 36];
    petals.forEach((px) => {
      ctx.fillStyle = "#d84315";
      ctx.beginPath();
      ctx.ellipse(px, 34, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const goldGrad = ctx.createLinearGradient(-35, -60, 35, 35);
    goldGrad.addColorStop(0, "#fff59d");
    goldGrad.addColorStop(0.4, "#ffd54f");
    goldGrad.addColorStop(1, "#ff8f00");

    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.ellipse(0, 24, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-28, 20);
    ctx.quadraticCurveTo(-32, -16, -18, -22);
    ctx.lineTo(18, -22);
    ctx.quadraticCurveTo(32, -16, 28, 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffe082";
    ctx.beginPath();
    ctx.ellipse(0, 16, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#37474f";
    ctx.beginPath();
    ctx.arc(0, -44, 19, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -61, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.ellipse(-18, -36, 4, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(18, -36, 4, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe082";
    ctx.beginPath();
    ctx.arc(0, -37, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -43, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-6, -37, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6, -37, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -31, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  drawAltarAndOfferings(ctx, w, h) {
    ctx.save();
    const altarY = h * 0.48;
    const offerings = window.templeState.state.activeOfferings || {};

    ctx.fillStyle = "#5d291a";
    ctx.fillRect(w * 0.12, altarY, w * 0.76, 36);
    ctx.strokeStyle = "#ffb300";
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.12, altarY, w * 0.76, 36);

    const candlePositions = [w * 0.20, w * 0.80];
    candlePositions.forEach((cx, i) => {
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(cx - 3, altarY - 22, 6, 22);
      ctx.fillStyle = "#fff8e1";
      ctx.fillRect(cx - 4, altarY - 34, 8, 14);

      const flicker = Math.sin(this.elapsed * 8 + i) * 1.5;
      const flameRadius = offerings.candle ? 18 : 11;
      const glow = ctx.createRadialGradient(cx, altarY - 40, 2, cx, altarY - 40, flameRadius);
      glow.addColorStop(0, "rgba(255, 241, 118, 0.95)");
      glow.addColorStop(1, "rgba(255, 152, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, altarY - 40, flameRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffca28";
      ctx.beginPath();
      ctx.ellipse(cx + flicker * 0.4, altarY - 39, 3.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    const incX = w * 0.5;
    ctx.fillStyle = "#bcaaa4";
    ctx.beginPath();
    ctx.arc(incX, altarY - 8, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(236, 239, 241, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(incX, altarY - 18);
    ctx.quadraticCurveTo(incX + Math.sin(this.elapsed * 2) * 10, altarY - 38, incX - Math.sin(this.elapsed * 1.5) * 8, altarY - 58);
    ctx.stroke();

    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    if (offerings.tea) ctx.fillText("🍵", w * 0.30, altarY - 6);
    if (offerings.fruit) ctx.fillText("🍎", w * 0.38, altarY - 6);
    if (offerings.lotus) ctx.fillText("🪷", w * 0.62, altarY - 6);
    if (offerings.rice) ctx.fillText("🌾", w * 0.70, altarY - 6);
    if (offerings.tile) ctx.fillText("🧱", w * 0.50, altarY + 24);

    ctx.restore();
  }

  drawInteractiveMoktak(ctx, x, y) {
    this.moktakCoords = { x, y };
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.moktakAnim.scale, this.moktakAnim.scale);

    ctx.fillStyle = "#c62828";
    ctx.beginPath();
    ctx.ellipse(0, 12, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const woodGrad = ctx.createRadialGradient(-5, -6, 3, 0, 0, 22);
    woodGrad.addColorStop(0, "#d7a86e");
    woodGrad.addColorStop(0.7, "#a66c38");
    woodGrad.addColorStop(1, "#6d421c");
    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.arc(0, -2, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2b1608";
    ctx.beginPath();
    ctx.arc(-6, 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-6, -1, 16, 4);

    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("목탁 터치", 0, 30);

    ctx.restore();
  }

  drawWeatherParticles(ctx, w, h, weather, timeOfDay) {
    if (weather === "clear" && timeOfDay !== "night" && timeOfDay !== "deep_night") return;
    ctx.save();
    this.particles.forEach((p) => {
      if (weather === "rain") {
        ctx.strokeStyle = "rgba(179, 229, 252, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 3, p.y + 10);
        ctx.stroke();
      } else if (weather === "snow") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else if (timeOfDay === "night" || timeOfDay === "deep_night") {
        const glowAlpha = 0.3 + 0.6 * Math.abs(Math.sin(this.elapsed * 3 + p.angle));
        ctx.fillStyle = `rgba(255, 241, 118, ${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (weather === "petals") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = "rgba(248, 187, 208, 0.82)";
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.restore();
  }

  drawFloatingFeedbacks(ctx) {
    ctx.save();
    this.ripples.forEach((r) => {
      ctx.strokeStyle = `rgba(255, 213, 79, ${Math.max(0, r.alpha)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    this.floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();
  }
}

window.templeGraphics = new TempleGraphicsEngine();
