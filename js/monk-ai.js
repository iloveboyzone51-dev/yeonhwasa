/**
 * [주지스님(혜안 스님) AI 차담 & 레트로 다실 엔진 - js/monk-ai.js]
 * - 패미콤/레트로 어드벤처 RPG 감성의 한 글자씩 출력되는 타이핑 효과 지원
 * - 다실 캔버스와 실시간 연계 (차 마시기, 고개 끄덕임, 미소)
 * - Gemini API 키 입력 시 실시간 LLM 차담 대화, 미입력 시 내장 지혜 엔진 즉시 작동
 */

class MonkAIEngine {
  constructor() {
    this.monkName = "혜안(慧眼) 주지스님";
    this.quickTopics = [
      { label: "🍵 오늘의 차담 법문", prompt: "스님, 오늘 저와 우리 가족의 마음에 평안을 주는 따뜻한 법문 한 말씀 부탁드립니다." },
      { label: "🌿 부모님과 가족 무병장수", prompt: "스님, 부모님께서 편찮으신 곳 없이 오래오래 건강하시길 두 손 모아 기도합니다." },
      { label: "🌙 밤에 생각이 많고 지칠 때", prompt: "요즘 마음이 조금 무겁고 복잡한데, 스님께서 마음을 비우는 법을 알려주셔요." },
      { label: "🪷 자식과 가정이 평안하길", prompt: "자식들이 사회에서 다치지 않고 가정이 늘 화목했으면 좋겠습니다." },
      { label: "🏮 가족 사찰 불사 축원", prompt: "우리 가족들이 함께 정성을 모아 절을 가꾸고 있습니다. 축원 한 말씀 부탁드립니다." }
    ];
  }

  getHonorific(user) {
    if (!user) return "보살님";
    const age = user.ageGroup || "adult";
    if (age === "elder") return `${user.name} 원로보살님`;
    if (age === "youth") return `${user.name} 법우님`;
    return `${user.name} 보살님`;
  }

  async generateReply(userMessage, user) {
    const honorific = this.getHonorific(user);
    const apiKey = (window.templeState.state.settings && window.templeState.state.settings.geminiApiKey) ||
                   window.TEMPLE_CONFIG.gemini.apiKey;

    // 1. Gemini API 키 연동 시도
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const aiText = await this.callGeminiAPI(apiKey.trim(), userMessage, honorific);
        if (aiText) return aiText;
      } catch (e) {
        console.warn("Gemini API 호출 실패, 내장 지혜 엔진으로 응답합니다:", e);
      }
    }

    // 2. 내장 혜안 스님 지혜 법문 엔진 (따뜻한 차를 마주하는 자연스러운 딜레이)
    await new Promise((r) => setTimeout(r, 600));
    return this.getLocalWisdomReply(userMessage, honorific);
  }

  async callGeminiAPI(apiKey, userMessage, honorific) {
    const model = window.TEMPLE_CONFIG.gemini.model || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemInstruction = `당신은 깊은 산속 가족 사찰 '연화사'의 온화하고 지혜로운 주지스님 '혜안 스님'입니다.
방문한 신도님의 호칭은 '${honorific}'입니다.
항상 따뜻하고 공손하며, 부모님과 가족의 마음을 어루만지는 인자한 스님의 말투(~하시구려, ~합장합니다, ~하시길 축원합니다)로 3~4문장 이내로 다정하게 답변하세요.`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 320 }
      })
    });

    if (!res.ok) throw new Error("Gemini API Error");
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  getLocalWisdomReply(msg, honorific) {
    const text = (msg || "").toLowerCase();

    if (text.includes("건강") || text.includes("아프") || text.includes("병원") || text.includes("몸") || text.includes("부모님")) {
      const replies = [
        `${honorific}, 부모님과 가족을 아끼는 그 지극한 효심이 곧 약사여래 부처님의 따스한 광명입니다. 산사의 맑은 솔바람처럼 부모님의 기혈이 순환하고 몸과 마음에 아픈 곳이 없이 늘 강건하시기를 소승도 새벽 예불마다 지성으로 축원하겠습니다. 🙏`,
        `몸이 편안해야 마음도 고요히 머무는 법이지요. ${honorific}께서 올려주신 정성스러운 기도 공덕이 가족분들의 걸음마다 맑고 따뜻한 기운으로 동행할 것입니다. 오늘 따뜻한 차 한 잔 나누시며 몸을 먼저 보살펴 주셔요. 🍵`,
        `${honorific}의 사랑이 대웅전 촛불처럼 환하게 가족들을 비추고 있습니다. 사계절 푸른 소나무처럼 부모님과 가족 모두 무병장수하시고 웃음꽃이 피어나길 두 손 모아 합장 발원합니다. 🙏`
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    if (text.includes("잠") || text.includes("복잡") || text.includes("걱정") || text.includes("불안") || text.includes("지치") || text.includes("스트레스")) {
      const replies = [
        `${honorific}, 깊은 산골에 아무리 짙은 안개가 끼어도 아침 해가 솟아오르면 저절로 걷히듯, 지금 마음속 번뇌도 머지않아 청정한 하늘처럼 맑게 지나갈 것입니다. 숨을 길게 세 번 내쉬며 무거운 짐을 부처님 전에 잠시 내려놓으셔요. 🌿`,
        `물이 흘러갈 때 바위를 탓하지 않고 감싸 안고 가듯, 지나간 과거의 후회와 아직 오지 않은 내일 걱정은 처마 끝 풍경 소리에 실어 바람에 날려 보내시구려. 오늘 ${honorific}께서 건강히 숨 쉬고 계신 것만으로도 참으로 귀하고 온전합니다. 🍵`,
        `생각이 어지러울 때는 대웅전에서 천천히 목탁 소리에 귀를 기울이거나 세 번 절을 올려보셔요. 고요한 숨결 끝에 ${honorific} 본래의 맑고 평안한 마음 거울이 환히 드러날 것입니다. 🙏`
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    if (text.includes("가족") || text.includes("자식") || text.includes("아들") || text.includes("딸") || text.includes("화목") || text.includes("잘 되")) {
      const replies = [
        `뿌리가 깊고 단단한 나무는 모진 비바람에도 흔들리지 않고 마침내 탐스러운 열매를 맺는 법입니다. ${honorific}께서 가족을 위해 심어두신 사랑과 기도의 씨앗이 자녀분들과 가정을 든든히 지켜줄 것이니 안심하시구려. 🪷`,
        `서로를 위해 진심으로 기도해 주는 가족이 곁에 있다는 것만큼 세상에 큰 복전(福田)이 없습니다. ${honorific}의 따뜻한 축원이 온 가족의 앞길을 밝히는 연등이 되어 만사형통할 것입니다. 🙏`,
        `한 송이 연꽃이 피어나면 연못 전체가 맑고 향기롭듯, ${honorific}의 온화한 말 한마디와 기도가 온 집안을 극락정토로 만듭니다. 오늘 가족 소원 연등에 다정한 안부를 걸어보시는 건 어떨지요? 🏮`
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    if (text.includes("법문") || text.includes("말씀") || text.includes("오늘")) {
      const dharmaTalks = [
        `${honorific}, 오늘의 차담 법문은 '화안애어(和顔愛語)'입니다. 온화한 얼굴빛과 자비가 담긴 다정한 말 한마디가 천 냥 황금보다 더 큰 공덕을 짓는 보시랍니다. 오늘 가족들에게 따뜻한 미소를 먼저 건네보셔요. 🙏`,
        `'일체유심조(一切唯心造)', 모든 행복과 평안은 마음먹기에 달려 있습니다. 산사의 맑은 아침 이슬을 바라보는 마음으로 오늘 하루도 감사한 일 세 가지를 떠올려 보시면 복록이 저절로 찾아올 것입니다. 🍵`,
        `${honorific}, 반야심경에 '심무가애 무유공포(마음에 걸림이 없으니 두려움이 없다)'라 하였습니다. 흐르는 흰 구름처럼 집착 없는 편안한 마음으로 오늘 하루도 여여(如如)하게 보내시길 합장합니다. 🪷`
      ];
      return dharmaTalks[Math.floor(Math.random() * dharmaTalks.length)];
    }

    const generalReplies = [
      `어서 오십시오, ${honorific}. 깊은 산사까지 걸음해 주시니 반갑습니다. 갓 우려낸 하동 수제 작설차 한 잔 내어놓았으니 따뜻하게 드시며 마음의 쉼을 누리시구려. 🍵`,
      `${honorific}의 말씀 속에 깊은 진심과 효심이 느껴집니다. 부처님께서도 자비로운 미소로 화답하고 계실 것입니다. 가내에 늘 평안과 만복이 깃들길 축원합니다. 🙏`,
      `참으로 귀한 정성이십니다, ${honorific}. 작은 물방울이 모여 마침내 바위를 뚫듯, 매일 조금씩 쌓으시는 기도와 공덕이 우리 가족 사찰을 더욱 아름다운 도량으로 꽃피울 것입니다. 🪷`
    ];
    return generalReplies[Math.floor(Math.random() * generalReplies.length)];
  }
}

window.monkAI = new MonkAIEngine();
