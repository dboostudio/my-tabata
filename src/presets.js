// 📄 src/presets.ts — 워크아웃 프리셋
export const PRESETS = [
    {
        id: 'tabata-classic',
        name: '타바타 클래식',
        emoji: '🔥',
        description: '1996년 타바타 박사 원본 프로토콜. 4분으로 VO₂max와 무산소 용량 동시 향상',
        config: { workDuration: 20, restDuration: 10, totalRounds: 8, countdownDuration: 3 },
    },
    {
        id: 'power-interval',
        name: '파워 인터벌',
        emoji: '⚡',
        description: '2:1 비율 고강도 인터벌. 심폐지구력과 근지구력을 동시에 강화. 총 7분 30초',
        config: { workDuration: 30, restDuration: 15, totalRounds: 10, countdownDuration: 3 },
    },
    {
        id: 'fat-burn',
        name: '지방 연소',
        emoji: '🫀',
        description: '중강도 유지로 지방 산화 극대화. 운동 후에도 칼로리가 소모되는 EPOC 효과',
        config: { workDuration: 40, restDuration: 20, totalRounds: 8, countdownDuration: 3 },
    },
    {
        id: 'sprint',
        name: '스프린트',
        emoji: '💨',
        description: '매 세트 최대 출력으로 순발력·스피드 향상. 충분한 휴식으로 질 높은 반복',
        config: { workDuration: 10, restDuration: 30, totalRounds: 10, countdownDuration: 3 },
    },
    {
        id: 'endurance',
        name: '지구력 빌드',
        emoji: '🏃',
        description: '3:1 운동/휴식 비율로 유산소 한계를 점진적으로 확장. 마라톤·사이클 보조 훈련',
        config: { workDuration: 45, restDuration: 15, totalRounds: 8, countdownDuration: 3 },
    },
    {
        id: 'strength-circuit',
        name: '근력 서킷',
        emoji: '🏋️',
        description: '긴 운동 시간과 짧은 전환으로 근육 긴장 유지. 근비대와 지구력을 복합 자극',
        config: { workDuration: 50, restDuration: 10, totalRounds: 6, countdownDuration: 3 },
    },
    {
        id: 'beginner',
        name: '입문자',
        emoji: '🌱',
        description: '높은 휴식 비율로 부상 방지. 인터벌 트레이닝을 처음 접하는 분께 추천',
        config: { workDuration: 20, restDuration: 30, totalRounds: 6, countdownDuration: 5 },
    },
    {
        id: 'custom',
        name: '커스텀',
        emoji: '⚙️',
        description: '운동·휴식 시간과 라운드를 직접 설정해 나만의 루틴을 만드세요',
        config: { workDuration: 20, restDuration: 10, totalRounds: 8, countdownDuration: 3 },
    },
];
