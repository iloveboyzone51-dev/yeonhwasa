/**
 * [상태 관리 및 데이터 저장소 - js/state.js]
 * - 캐릭터 커스터마이징 (얼굴 4종, 헤어 10종, 법복 5종, 연령대 4종) 영구 저장
 * - 재접속 시 자동 로그인 & 기존/신규 불자 원클릭 진행
 * - 현실 가격 공양 보시금 1일 1회 제한 및 클라우드 동기화
 */

const STORAGE_KEY = "MAEUM_SANSA_STATE_V3";
const SESSION_KEY = "MAEUM_SANSA_CURRENT_USER_V3";

class TempleStateManager {
  constructor() {
    this.state = this.loadState();
    this.currentUser = this.loadSessionUser();
    this.listeners = [];
  }

  getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  getDefaultState() {
    const today = this.getTodayString();
    return {
      templeName: window.TEMPLE_CONFIG.defaultTempleName,
      templeMerit: 75,
      totalBowsFamily: 18,
      weatherMode: "auto",
      activeOfferings: {
        incense: true,
        candle: true,
        tea: false,
        fruit: false,
        lotus: false,
        rice: false,
        tile: false
      },
      users: [],
      wishes: [
        {
          id: "wish_init_1",
          authorName: "혜안 주지스님",
          ageGroup: "elder",
          category: "도량축원",
          lanternColor: "#ffca28",
          content: "연화사에 오신 모든 가족분들의 가내에 무병장수와 지혜의 광명이 가득하길 합장 발원합니다. 🙏",
          date: today,
          time: "06:00",
          prayers: 5,
          prayedBy: []
        },
        {
          id: "wish_init_2",
          authorName: "어머니",
          ageGroup: "senior",
          category: "부모님건강",
          lanternColor: "#f06292",
          content: "우리 아들 딸 올 한 해도 아프지 않고 건강하게, 하는 일마다 부처님 가피 가득하길 바랍니다.",
          date: today,
          time: "07:30",
          prayers: 3,
          prayedBy: []
        }
      ],
      activityLogs: [
        {
          id: "log_init_1",
          text: "산사의 새벽 종소리와 함께 연화사 도량이 활짝 열렸습니다.",
          time: "오늘"
        }
      ],
      settings: {
        supabaseUrl: window.TEMPLE_CONFIG.supabase.url || "",
        supabaseKey: window.TEMPLE_CONFIG.supabase.anonKey || "",
        geminiApiKey: window.TEMPLE_CONFIG.gemini.apiKey || ""
      }
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const def = this.getDefaultState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
        return def;
      }
      const parsed = JSON.parse(raw);
      return { ...this.getDefaultState(), ...parsed };
    } catch (e) {
      console.error("상태 로드 오류:", e);
      return this.getDefaultState();
    }
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
      this.syncToCloudIfConfigured();
    } catch (e) {
      console.error("상태 저장 오류:", e);
    }
  }

  loadSessionUser() {
    try {
      const savedName = localStorage.getItem(SESSION_KEY);
      if (!savedName) return null;
      return this.state.users.find((u) => u.name === savedName) || null;
    } catch (e) {
      return null;
    }
  }

  getLastActiveUser() {
    if (this.currentUser) return this.currentUser;
    const savedName = localStorage.getItem(SESSION_KEY);
    if (savedName) {
      const user = this.state.users.find((u) => u.name === savedName);
      if (user) return user;
    }
    if (this.state.users && this.state.users.length > 0) {
      return this.state.users[this.state.users.length - 1];
    }
    return null;
  }

  quickLogin(user) {
    if (!user) return false;
    this.currentUser = user;
    localStorage.setItem(SESSION_KEY, user.name);
    this.processDailyCheckIn(user);
    this.saveState();
    this.notifyListeners();
    return true;
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notifyListeners() {
    if (this.currentUser) {
      this.currentUser = this.state.users.find((u) => u.name === this.currentUser.name) || null;
    }
    this.listeners.forEach((fn) => fn(this.state, this.currentUser));
  }

  /**
   * 커스텀 캐릭터 간편 가입 및 로그인 (얼굴 4종, 헤어 10종, 법복 5종, 연령대 4종)
   */
  loginOrRegister(name, pin, ageGroup = "adult", faceStyle = "gentle_smile", hairStyle = "chignon", outfitColor = "grey") {
    const cleanName = (name || "").trim();
    const cleanPin = (pin || "").trim();

    if (!cleanName) {
      return { success: false, message: "이름 또는 가족 호칭을 입력해 주세요." };
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      return { success: false, message: "비밀번호는 숫자 4자리로 입력해 주세요." };
    }

    let user = this.state.users.find((u) => u.name === cleanName);

    if (user) {
      // 기존 불자 확인
      if (user.pin !== cleanPin) {
        return {
          success: false,
          message: `'${cleanName}' 님의 비밀번호 4자리가 일치하지 않습니다.`
        };
      }

      // 최신 커스터마이징 정보 반영
      if (ageGroup) user.ageGroup = ageGroup;
      if (faceStyle) user.faceStyle = faceStyle;
      if (hairStyle) user.hairStyle = hairStyle;
      if (outfitColor) user.outfitColor = outfitColor;

      localStorage.setItem(SESSION_KEY, user.name);
      this.currentUser = user;
      const checkInResult = this.processDailyCheckIn(user);
      this.saveState();

      return {
        success: true,
        isNewUser: false,
        checkInGranted: checkInResult.granted,
        user,
        message: checkInResult.granted
          ? `반갑습니다, ${user.name} 불자님! 오늘 출석 공덕 +${checkInResult.merit}점과 보시금 +${checkInResult.donation.toLocaleString()}원이 지급되었습니다. 🙏`
          : `다시 오셨군요, ${user.name} 불자님! 도량에 오신 것을 환영합니다. 🙏`
      };
    } else {
      // 신규 불자 최초 등록
      const today = this.getTodayString();
      const r = window.TEMPLE_CONFIG.rewards;
      user = {
        name: cleanName,
        pin: cleanPin,
        ageGroup: ageGroup || "adult",
        faceStyle: faceStyle || "gentle_smile",
        hairStyle: hairStyle || "chignon",
        outfitColor: outfitColor || "grey",
        merit: 50 + r.dailyCheckInMerit,
        donationMoney: 10000 + r.dailyCheckInDonation, // 15,000원 시작
        offeringHistory: {},
        totalBows: 0,
        attendanceDays: 1,
        lastCheckInDate: today,
        lastMonkChatDate: "",
        createdAt: today
      };

      this.state.users.push(user);
      this.state.templeMerit += r.dailyCheckInMerit;
      this.addActivityLog(`${cleanName} 불자님이 나만의 캐릭터로 도량에 첫 입산하셨습니다! (+${r.dailyCheckInMerit} 불사공덕)`);
      localStorage.setItem(SESSION_KEY, user.name);
      this.currentUser = user;
      this.saveState();

      return {
        success: true,
        isNewUser: true,
        checkInGranted: true,
        user,
        message: `환영합니다, ${cleanName} 불자님! 입산 축하 공덕과 첫날 정성 공양 보시금(15,000원)이 마련되었습니다. 🙏`
      };
    }
  }

  logout() {
    localStorage.removeItem(SESSION_KEY);
    this.currentUser = null;
    this.notifyListeners();
  }

  processDailyCheckIn(user) {
    const today = this.getTodayString();
    if (user.lastCheckInDate !== today) {
      const r = window.TEMPLE_CONFIG.rewards;
      user.lastCheckInDate = today;
      user.attendanceDays = (user.attendanceDays || 0) + 1;
      user.merit = (user.merit || 0) + r.dailyCheckInMerit;
      user.donationMoney = (user.donationMoney || 0) + r.dailyCheckInDonation;
      this.state.templeMerit += r.dailyCheckInMerit;
      this.addActivityLog(`${user.name} 불자님이 오늘 도량에 출석하여 보시금(+${r.dailyCheckInDonation.toLocaleString()}원)을 적립하셨습니다.`);
      return { granted: true, merit: r.dailyCheckInMerit, donation: r.dailyCheckInDonation };
    }
    return { granted: false, merit: 0, donation: 0 };
  }

  getTempleLevelInfo() {
    const levels = window.TEMPLE_CONFIG.templeLevels;
    const merit = this.state.templeMerit;
    let current = levels[0];
    let next = null;

    for (let i = 0; i < levels.length; i++) {
      if (merit >= levels[i].requiredMerit) {
        current = levels[i];
        next = levels[i + 1] || null;
      }
    }

    let progressPercent = 100;
    let remaining = 0;
    if (next) {
      const span = next.requiredMerit - current.requiredMerit;
      const done = merit - current.requiredMerit;
      progressPercent = Math.min(100, Math.max(0, Math.round((done / span) * 100)));
      remaining = Math.max(0, next.requiredMerit - merit);
    }

    return {
      currentLevel: current,
      nextLevel: next,
      templeMerit: merit,
      progressPercent,
      remaining
    };
  }

  recordBow(count = 1, meritReward = 3, donationReward = 1000) {
    if (!this.currentUser) return;
    const prevLevel = this.getTempleLevelInfo().currentLevel.level;

    this.currentUser.totalBows = (this.currentUser.totalBows || 0) + count;
    this.currentUser.merit = (this.currentUser.merit || 0) + meritReward;
    this.currentUser.donationMoney = (this.currentUser.donationMoney || 0) + donationReward;
    this.state.totalBowsFamily = (this.state.totalBowsFamily || 0) + count;
    this.state.templeMerit += meritReward;

    if (count >= 3) {
      this.addActivityLog(`${this.currentUser.name} 불자님이 대웅전 부처님 전에 ${count}배를 올려 보시금 +${donationReward.toLocaleString()}원을 적립하셨습니다. 🙏`);
    }

    const newLevel = this.getTempleLevelInfo().currentLevel.level;
    this.saveState();
    return { leveledUp: newLevel > prevLevel, newLevelInfo: this.getTempleLevelInfo().currentLevel };
  }

  recordMoktakHit() {
    if (!this.currentUser) return;
    this.currentUser.merit = (this.currentUser.merit || 0) + 1;
    this.state.templeMerit += 1;
    this.saveState();
  }

  makeOffering(offeringId) {
    if (!this.currentUser) {
      return { success: false, message: "로그인이 필요합니다." };
    }
    const item = window.TEMPLE_CONFIG.offerings.find((o) => o.id === offeringId);
    if (!item) {
      return { success: false, message: "공양 품목을 찾을 수 없습니다." };
    }

    const today = this.getTodayString();
    if (!this.currentUser.offeringHistory) this.currentUser.offeringHistory = {};

    if (this.currentUser.offeringHistory[offeringId] === today) {
      return {
        success: false,
        message: `[${item.name}] 공양은 하루에 한 번만 정성껏 올리실 수 있습니다.\n내일 아침 다시 정성을 모아 올려주셔요. 🙏`
      };
    }

    const currentDonation = this.currentUser.donationMoney || 0;
    if (currentDonation < item.price) {
      const deficit = item.price - currentDonation;
      return {
        success: false,
        message: `공양 보시금이 부족합니다.\n(필요: ${item.priceLabel} / 보유: ${currentDonation.toLocaleString()}원)\n부족한 ${deficit.toLocaleString()}원은 매일 출석, 3배/108배 정진, 주지스님 차담, 가족 연등 달기로 모으실 수 있습니다! 🪷`
      };
    }

    const prevLevel = this.getTempleLevelInfo().currentLevel.level;
    this.currentUser.donationMoney -= item.price;
    this.currentUser.offeringHistory[offeringId] = today;
    this.state.templeMerit += item.templeMeritBonus;
    this.state.activeOfferings[offeringId] = true;

    this.addActivityLog(
      `${this.currentUser.name}님이 법당에 [${item.name}]을 올리셨습니다! (사찰 불사 +${item.templeMeritBonus}점) ${item.icon}`
    );

    const newLevelInfo = this.getTempleLevelInfo().currentLevel;
    const leveledUp = newLevelInfo.level > prevLevel;
    if (leveledUp) {
      this.addActivityLog(`🎉 경축! 가족들의 원력으로 사찰이 [${newLevelInfo.name}](으)로 증축되었습니다!`);
    }

    this.saveState();
    return {
      success: true,
      item,
      leveledUp,
      newLevelInfo,
      message: `${item.icon} 부처님 전에 [${item.name}] 공양을 정성껏 올렸습니다! (사찰 증축 불사 +${item.templeMeritBonus}점)`
    };
  }

  addWishLantern(category, content) {
    if (!this.currentUser) return { success: false, message: "로그인이 필요합니다." };
    const clean = (content || "").trim();
    if (!clean) return { success: false, message: "소원이나 가족에게 전할 안부를 적어주세요." };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const r = window.TEMPLE_CONFIG.rewards;
    const prevLevel = this.getTempleLevelInfo().currentLevel.level;

    const lanternColors = ["#ef5350", "#ffca28", "#66bb6a", "#42a5f5", "#ab47bc", "#ff7043"];
    const chosenColor = lanternColors[Math.floor(Math.random() * lanternColors.length)];

    const newWish = {
      id: "wish_" + Date.now(),
      authorName: this.currentUser.name,
      ageGroup: this.currentUser.ageGroup || "adult",
      category: category || "가족안부",
      lanternColor: chosenColor,
      content: clean,
      date: this.getTodayString(),
      time: timeStr,
      prayers: 1,
      prayedBy: [this.currentUser.name]
    };

    this.state.wishes.unshift(newWish);
    this.currentUser.merit += r.wishLanternMerit;
    this.currentUser.donationMoney = (this.currentUser.donationMoney || 0) + r.wishLanternDonation;
    this.state.templeMerit += r.wishLanternMerit;

    this.addActivityLog(`${this.currentUser.name}님이 경내에 [${category}] 소원 연등을 밝혔습니다. 🏮 (+${r.wishLanternDonation.toLocaleString()}원 보시금)`);

    const newLevelInfo = this.getTempleLevelInfo().currentLevel;
    this.saveState();
    return {
      success: true,
      rewardMerit: r.wishLanternMerit,
      rewardDonation: r.wishLanternDonation,
      leveledUp: newLevelInfo.level > prevLevel,
      newLevelInfo
    };
  }

  /**
   * [개선 8] 1인당 1회만 합장 축원 가능하도록 제한
   */
  prayForWish(wishId) {
    if (!this.currentUser) return { success: false, message: "로그인이 필요합니다." };
    const wish = this.state.wishes.find((w) => w.id === wishId);
    if (!wish) return { success: false, message: "연등을 찾을 수 없습니다." };

    if (!wish.prayedBy) wish.prayedBy = [];

    // 이미 합장 축원한 경우 중복 증가 차단
    if (wish.prayedBy.includes(this.currentUser.name)) {
      return {
        success: false,
        alreadyPrayed: true,
        message: `이미 ${wish.authorName}님의 소원에 함께 합장 축원하셨습니다. 🙏`
      };
    }

    // 1인 1회 축원 반영
    wish.prayedBy.push(this.currentUser.name);
    wish.prayers = (wish.prayers || 0) + 1;
    this.currentUser.merit += 2;
    this.currentUser.donationMoney = (this.currentUser.donationMoney || 0) + 500;
    this.state.templeMerit += 2;
    this.saveState();

    return {
      success: true,
      alreadyPrayed: false,
      message: `🙏 ${wish.authorName}님의 소원에 지성으로 함께 합장 축원하셨습니다. (+500원 보시금)`
    };
  }

  rewardDailyMonkChat() {
    if (!this.currentUser) return { granted: false, merit: 0, donation: 0 };
    const today = this.getTodayString();
    if (this.currentUser.lastMonkChatDate !== today) {
      const r = window.TEMPLE_CONFIG.rewards;
      this.currentUser.lastMonkChatDate = today;
      this.currentUser.merit += r.monkChatMerit;
      this.currentUser.donationMoney = (this.currentUser.donationMoney || 0) + r.monkChatDonation;
      this.state.templeMerit += r.monkChatMerit;
      this.addActivityLog(`${this.currentUser.name} 불자님이 혜안 주지스님과 따뜻한 차담을 나누셨습니다. 🍵 (+${r.monkChatDonation.toLocaleString()}원 보시금)`);
      this.saveState();
      return { granted: true, merit: r.monkChatMerit, donation: r.monkChatDonation };
    }
    return { granted: false, merit: 0, donation: 0 };
  }

  addActivityLog(text) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    this.state.activityLogs.unshift({
      id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      text,
      time: timeStr
    });
    if (this.state.activityLogs.length > 30) {
      this.state.activityLogs = this.state.activityLogs.slice(0, 30);
    }
  }

  async syncToCloudIfConfigured() {
    const supabaseUrl = this.state.settings?.supabaseUrl || window.TEMPLE_CONFIG.supabase?.url || "";
    const supabaseKey = this.state.settings?.supabaseKey || window.TEMPLE_CONFIG.supabase?.anonKey || "";
    if (!supabaseUrl || !supabaseKey) return false;

    try {
      // Upsert: 행이 없으면 생성, 있으면 병합 갱신
      const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/temple_state`;
      await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          id: "family_main",
          payload: {
            templeMerit: this.state.templeMerit,
            wishes: this.state.wishes,
            activityLogs: this.state.activityLogs,
            templeLevel: this.state.templeLevel
          },
          updated_at: new Date().toISOString()
        })
      });
      return true;
    } catch (e) {
      console.warn("가족 사찰 동기화 대기 중:", e);
      return false;
    }
  }

  async pullFromCloudIfConfigured() {
    const supabaseUrl = this.state.settings?.supabaseUrl || window.TEMPLE_CONFIG.supabase?.url || "";
    const supabaseKey = this.state.settings?.supabaseKey || window.TEMPLE_CONFIG.supabase?.anonKey || "";
    if (!supabaseUrl || !supabaseKey) return false;

    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/temple_state?id=eq.family_main&select=payload`;
      const res = await fetch(endpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      if (!res.ok) return false;
      const rows = await res.json();
      if (rows && rows.length > 0 && rows[0].payload) {
        const remote = rows[0].payload;
        
        // 가족 협동 데이터 병합 (사찰 공덕 점수는 항상 최대치/누적으로)
        this.state.templeMerit = Math.max(this.state.templeMerit || 0, remote.templeMerit || 0);
        
        // 소원 연등 목록 병합 (원격 + 로컬 신규)
        if (remote.wishes && Array.isArray(remote.wishes)) {
          const map = new Map();
          remote.wishes.forEach((w) => map.set(w.id, w));
          (this.state.wishes || []).forEach((w) => {
            if (!map.has(w.id)) map.set(w.id, w);
          });
          this.state.wishes = Array.from(map.values());
        }

        // 활동 일지 병합
        if (remote.activityLogs && Array.isArray(remote.activityLogs)) {
          const logMap = new Map();
          remote.activityLogs.forEach((l) => logMap.set(l.id, l));
          (this.state.activityLogs || []).forEach((l) => {
            if (!logMap.has(l.id)) logMap.set(l.id, l);
          });
          this.state.activityLogs = Array.from(logMap.values()).slice(0, 30);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  startPeriodicCloudSync() {
    if (this.cloudSyncInterval) return;
    this.cloudSyncInterval = setInterval(() => {
      this.pullFromCloudIfConfigured();
    }, 20000); // 20초마다 온 가족 사찰 데이터 실시간 동기화
  }
}

window.templeState = new TempleStateManager();
