/**
 * [사찰 설정 및 데이터 정의 파일 - js/config.js]
 * - 9곡 실제 스님 육성 독경 음원 로컬 플레이리스트 연결 (불경 모음 폴더)
 * - 캐릭터 커스터마이징: 얼굴(눈/표정 4종) + 헤어(10종) + 법복(5종)
 * - 현실 사찰 공양 품목 및 1일 1회 보시금 시스템
 */

window.TEMPLE_CONFIG = {
  appName: "마음산사 (가족 온라인 사찰)",
  defaultTempleName: "연화사(蓮華寺)",

  supabase: {
    url: "",
    anonKey: ""
  },

  gemini: {
    apiKey: "",
    model: "gemini-2.5-flash"
  },

  // 1. 연령대 목록
  ageGroups: [
    { id: "youth", label: "청년 법우 (10~20대)", defaultTitle: "법우님" },
    { id: "adult", label: "장년 법우 (30~40대)", defaultTitle: "보살님/거사님" },
    { id: "senior", label: "중장년 (50~60대)", defaultTitle: "보살님/거사님" },
    { id: "elder", label: "어르신 (70대 이상)", defaultTitle: "원로 보살님/거사님" }
  ],

  // 2. 캐릭터 얼굴 표정/스타일 (4종)
  faceStyles: [
    { id: "gentle_smile", name: "온화한 눈웃음", icon: "😊", desc: "자애롭고 부드러운 눈매와 미소" },
    { id: "clear_eyes", name: "맑고 또렷한 눈", icon: "👀", desc: "총명하고 맑은 신심의 눈빛" },
    { id: "glasses_wise", name: "지혜로운 안경", icon: "👓", desc: "단정하고 온화한 안경 착용" },
    { id: "meditation_calm", name: "고요한 반개안", icon: "😌", desc: "명상하듯 고요히 감은 눈매" }
  ],

  // 3. 캐릭터 10종 헤어스타일
  hairStyles: [
    { id: "chignon", name: "단아한 비녀 쪽머리", icon: "👵", desc: "전통 어머님/보살님의 단정한 쪽머리와 금비녀" },
    { id: "short_perm", name: "우아한 볼륨 숏펌", icon: "👩‍🦱", desc: "친근하고 인자한 어머님 볼륨 파마" },
    { id: "silver_cut", name: "정갈한 은발 숏컷", icon: "👵‍🦳", desc: "세월의 지혜가 깃든 단정한 백발/은발 숏컷" },
    { id: "parted_gentle", name: "깔끔한 가르마 정갈컷", icon: "👨‍🦳", desc: "아버님/거사님의 단정하고 지적인 가르마" },
    { id: "straight_bob", name: "차분한 흑발 단발", icon: "👩", desc: "맑고 깨끗한 단정한 일자 단발" },
    { id: "low_ponytail", name: "단정한 묶음 포니테일", icon: "👱‍♀️", desc: "정갈하게 하나로 모아 묶은 머리" },
    { id: "wave_half", name: "부드러운 웨이브 반묶음", icon: "👩‍🦰", desc: "자연스럽고 부드러운 웨이브 스타일" },
    { id: "classic_short", name: "중후한 클래식 숏컷", icon: "👨", desc: "아버님/젊은 거사님의 깔끔한 짧은 머리" },
    { id: "shaved_monk", name: "귀여운 동자승 삭발", icon: "🧑‍🦲", desc: "맑고 티 없는 수행자 삭발 머리" },
    { id: "curly_volume", name: "자연스러운 내추럴 펌", icon: "🧑‍🦱", desc: "자연스럽고 풍성한 볼륨 머리" }
  ],

  // 4. 사찰 법복/한복 의상 (5종)
  outfitColors: [
    { id: "grey", name: "잿빛 먹물 법복", color: "#546e7a", vest: "#90a4ae", border: "#37474f", desc: "청정하고 고요한 수행자의 장삼색" },
    { id: "indigo", name: "쪽빛 감청 한복", color: "#2c3e50", vest: "#5c6bc0", border: "#1a252f", desc: "깊은 산사의 하늘을 닮은 쪽빛" },
    { id: "jade", name: "단아한 옥색 배자", color: "#2e6b47", vest: "#81c784", border: "#1b4d31", desc: "은은한 솔향기가 느껴지는 옥빛" },
    { id: "ochre", name: "따스한 황토 한복", color: "#8d4e35", vest: "#d7ccc8", border: "#5d3222", desc: "대지의 따스함을 품은 황토 천연염색" },
    { id: "white_hanbok", name: "백옥 순백 한복", color: "#eceff1", vest: "#cfd8dc", border: "#b0bec5", desc: "순수하고 티 없이 맑은 백의" }
  ],

  // 5. 사용자가 직접 첨부한 로컬 실제 스님 육성 독경 플레이리스트 (9곡)
  buddhistPlaylists: [
    {
      id: "track_07",
      title: "07 반야심경 독송 (화암스님)",
      artist: "화암스님",
      audioUrl: "audio/track_07.mp3",
      localAudioUrl: "불경 모음/07 반야심경 독송(화암스님).mp3"
    },
    {
      id: "track_08",
      title: "08 반야심경 합송 (단음 학인스님)",
      artist: "학인스님",
      audioUrl: "audio/track_08.mp3",
      localAudioUrl: "불경 모음/08 반야심경 합송(단음 학인스님).mp3"
    },
    {
      id: "track_09",
      title: "09 반야심경 합송 (장음 학인스님)",
      artist: "학인스님",
      audioUrl: "audio/track_09.mp3",
      localAudioUrl: "불경 모음/09 반야심경 합송(장음 학인스님).mp3"
    },
    {
      id: "track_01",
      title: "01 헌다게 독송 (화암스님)",
      artist: "화암스님",
      audioUrl: "audio/track_01.mp3",
      localAudioUrl: "불경 모음/01 헌다게 독송(화암스님).mp3"
    },
    {
      id: "track_02",
      title: "02 헌다게 합송 (법안스님 선창)",
      artist: "법안스님 선창",
      audioUrl: "audio/track_02.mp3",
      localAudioUrl: "불경 모음/02 헌다게 합송(법안스님 선창).mp3"
    },
    {
      id: "track_03",
      title: "03 헌다게 합송 (비구니·금강스님)",
      artist: "비구니, 금강스님",
      audioUrl: "audio/track_03.mp3",
      localAudioUrl: "불경 모음/03 헌다게 합송(비구니, 금강스님 선창).mp3"
    },
    {
      id: "track_04",
      title: "04 오분향게 독송 (화암스님)",
      artist: "화암스님",
      audioUrl: "audio/track_04.mp3",
      localAudioUrl: "불경 모음/04 오분향게 독송(화암스님).mp3"
    },
    {
      id: "track_05",
      title: "05 오분향게 합송 (법안스님 선창)",
      artist: "법안스님 선창",
      audioUrl: "audio/track_05.mp3",
      localAudioUrl: "불경 모음/05 오분향게 합송(법안스님 선창).mp3"
    },
    {
      id: "track_06",
      title: "06 오분향게 합송 (비구니·금강스님)",
      artist: "비구니, 금강스님",
      audioUrl: "audio/track_06.mp3",
      localAudioUrl: "불경 모음/06 오분향게 합송(비구니, 금강스님 선창).mp3"
    }
  ],

  // 6. 활동별 보상
  rewards: {
    dailyCheckInMerit: 30,
    dailyCheckInDonation: 5000,
    bowSingleMerit: 3,
    bowSingleDonation: 1000,
    bowThreeMerit: 15,
    bowThreeDonation: 3000,
    bow108Merit: 100,
    bow108Donation: 20000,
    monkChatMerit: 15,
    monkChatDonation: 5000,
    wishLanternMerit: 20,
    wishLanternDonation: 5000,
    courtyardBellMerit: 2,
    courtyardBellDonation: 500
  },

  // 7. 사찰 증축 5단계
  templeLevels: [
    {
      level: 1,
      name: "1단계: 고요한 산골 암자",
      requiredMerit: 0,
      description: "깊은 산속 아담한 대웅전과 돌계단이 있는 시작 사찰입니다."
    },
    {
      level: 2,
      name: "2단계: 삼층석탑 건립",
      requiredMerit: 100,
      description: "가족들의 정성이 모여 마당 우측에 고즈넉한 삼층석탑이 세워졌습니다."
    },
    {
      level: 3,
      name: "3단계: 범종각과 석등 조성",
      requiredMerit: 250,
      description: "은은한 종소리가 울려 퍼지는 범종각과 마당을 밝히는 석등이 들어섰습니다."
    },
    {
      level: 4,
      name: "4단계: 극락연못과 가족 연등회",
      requiredMerit: 500,
      description: "비단잉어가 노니는 연꽃 연못과 경내를 수놓는 가족들의 오색 연등이 설치되었습니다."
    },
    {
      level: 5,
      name: "5단계: 천년 황금 대가람 완성",
      requiredMerit: 1000,
      description: "오층 황금사리탑과 관음전이 모두 갖춰진 우리 가족만의 천년 대가람입니다."
    }
  ],

  // 8. 현실 공양 품목 및 가격 (보시금)
  offerings: [
    {
      id: "incense",
      name: "백단향·침향선향 (향공양)",
      price: 5000,
      priceLabel: "5,000원",
      templeMeritBonus: 15,
      dailyLimit: 1,
      icon: "🪔",
      desc: "맑고 은은한 향기를 사루어 법당을 정화하고 가족들의 번뇌와 근심을 씻어냅니다."
    },
    {
      id: "candle",
      name: "지혜의 100일 기도초 (초공양)",
      price: 10000,
      priceLabel: "10,000원",
      templeMeritBonus: 25,
      dailyLimit: 1,
      icon: "🕯️",
      desc: "어두운 사바세계를 환하게 밝히는 촛불처럼 부모님과 가족들의 앞길에 밝은 지혜를 발원합니다."
    },
    {
      id: "tea",
      name: "하동 야생 수제 작설차 (다공양)",
      price: 15000,
      priceLabel: "15,000원",
      templeMeritBonus: 35,
      dailyLimit: 1,
      icon: "🍵",
      desc: "이슬을 머금은 맑은 찻잎으로 우려낸 차 한 잔을 부처님 전에 정성껏 올려 목마른 번뇌를 씻습니다."
    },
    {
      id: "fruit",
      name: "청정 산사 오색 햇과일 (과공양)",
      price: 30000,
      priceLabel: "30,000원",
      templeMeritBonus: 60,
      dailyLimit: 1,
      icon: "🍎",
      desc: "햇살을 듬뿍 받고 자란 정갈한 오색 햇과일을 올려 온 가족의 무병장수와 건강을 축원합니다."
    },
    {
      id: "lotus",
      name: "불단 장엄 황금 연꽃 (화공양)",
      price: 50000,
      priceLabel: "50,000원",
      templeMeritBonus: 110,
      dailyLimit: 1,
      icon: "🪷",
      desc: "진흙에 물들지 않고 청정하게 피어나는 연꽃으로 가내 두루 평안과 만사형통을 공양합니다."
    },
    {
      id: "rice",
      name: "대웅전 공양미 백미 20kg (미공양)",
      price: 70000,
      priceLabel: "70,000원",
      templeMeritBonus: 160,
      dailyLimit: 1,
      icon: "🌾",
      desc: "농부의 땀방울이 깃든 햅쌀 한 포대를 법당에 공양 올려 사찰 대중을 공양하고 복덕을 짓습니다."
    },
    {
      id: "tile",
      name: "도량 수호 인경 기와 불사 (기와공양)",
      price: 100000,
      priceLabel: "100,000원",
      templeMeritBonus: 250,
      dailyLimit: 1,
      icon: "🧱",
      desc: "가족의 이름과 축원문을 기와에 새겨 천년 동안 비바람을 막고 가내 만복을 지키는 대공양입니다."
    }
  ]
};
