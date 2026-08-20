/**
 * 음성 페르소나 프리셋. alias/name/description은 실사이트 API 문서
 * (supershorts.co.kr/business/docs, "생성 옵션" 표)에 나온 23종 값을 그대로 가져왔다.
 *
 * 다만 우리 TTS 백엔드(fal.ai가 감싼 ElevenLabs eleven-v3)는 실사이트와 다른 보이스 라이브러리를
 * 쓰기 때문에 이름이 그대로 매칭되지는 않는다 — fal.ai 공식 모델 페이지
 * (fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3)의 "voice" 파라미터 설명에 실제로 나열된
 * 21개 값(Aria, Roger, Sarah, Laura, Charlie, George, Callum, River, Liam, Charlotte, Alice,
 * Matilda, Will, Jessica, Eric, Chris, Brian, Daniel, Lily, Bill, 기본값 Rachel)에서 성별/톤이
 * 비슷한 것을 하나씩 골라 매핑했다. 23개 페르소나 > 21개 보이스라 두 페르소나(chloe, jay)는
 * 다른 페르소나와 fal 보이스를 공유한다 — 이름만 다르고 실제 음색은 같을 수 있다는 뜻.
 * eleven-v3 모델 자체는 한국어 포함 70개 이상 언어를 지원한다(fal 공식 페이지에 명시).
 */
export const VOICE_PRESETS = [
  { id: 'seoa', name: '서아', description: '밝고 부드러운 쇼츠 톤', lang: 'ko', falVoice: 'Aria' },
  { id: 'hajun', name: '하준', description: '차분한 저음 ASMR 톤', lang: 'ko', falVoice: 'Brian' },
  { id: 'taeo', name: '태오', description: '스포츠·게임 진행 톤', lang: 'ko', falVoice: 'Chris' },
  { id: 'ina', name: '이나', description: '차분한 정보 전달 톤', lang: 'ko', falVoice: 'Laura' },
  { id: 'doyun', name: '도윤', description: '명료한 쇼츠 내레이션', lang: 'ko', falVoice: 'Roger' },
  { id: 'jihoon', name: '지훈', description: '몰입감 있는 스토리 진행', lang: 'ko', falVoice: 'George' },
  { id: 'yuna', name: '유나', description: '밝고 에너지 있는 쇼츠 톤', lang: 'ko', falVoice: 'Jessica' },
  { id: 'minjae', name: '민재', description: '빠른 리액션 게임 톤', lang: 'ko', falVoice: 'Eric' },
  { id: 'luna', name: '루나', description: '가벼운 브이로그 대화체', lang: 'ko', falVoice: 'River' },
  { id: 'harin', name: '하린', description: '선명한 한국어 내레이션', lang: 'ko', falVoice: 'Charlotte' },
  { id: 'seojun', name: '서준', description: '따뜻한 한국어 설명 톤', lang: 'ko', falVoice: 'Callum' },
  { id: 'daon', name: '다온', description: '차분한 한국어 스토리 톤', lang: 'ko', falVoice: 'Matilda' },
  { id: 'mio', name: '미오', description: '일본어 맑은 내레이션', lang: 'ja', falVoice: 'Alice' },
  { id: 'haru', name: '하루', description: '일본어 부드러운 대화체', lang: 'ja', falVoice: 'Lily' },
  { id: 'ren', name: '렌', description: '일본어 캐릭터 톤', lang: 'ja', falVoice: 'Will' },
  { id: 'oliver', name: '올리버', description: '깊이 있는 영어 스토리 톤', lang: 'en', falVoice: 'Daniel' },
  { id: 'noah', name: '노아', description: '명료한 영어 내레이션', lang: 'en', falVoice: 'Bill' },
  { id: 'emma', name: '에마', description: '따뜻한 영어 스토리텔링', lang: 'en', falVoice: 'Sarah' },
  { id: 'liam', name: '리암', description: '자신감 있는 영어 진행', lang: 'en', falVoice: 'Liam' },
  { id: 'ava', name: '에이바', description: '뉴스 스타일 영어 전달', lang: 'en', falVoice: 'Rachel' },
  { id: 'chloe', name: '클로이', description: '밝은 영어 소셜 톤', lang: 'en', falVoice: 'Aria' },
  { id: 'adam', name: '애덤', description: '에너지틱 · 광고/홍보 톤', lang: 'etc', falVoice: 'Charlie' },
  { id: 'jay', name: '재이', description: '대화 · 예능 톤', lang: 'etc', falVoice: 'Eric' },
];

export function resolveFalVoice(voiceIdOrName) {
  if (!voiceIdOrName) return 'Rachel';
  const preset = VOICE_PRESETS.find((v) => v.id === voiceIdOrName);
  return preset ? preset.falVoice : voiceIdOrName; // 프리셋 id가 아니면 fal 보이스 이름으로 그대로 취급
}
