# 🏗️ 기술 아키텍처 — TabataGo

> 작성자: 테크 리드

---

## 기술 스택 선정

### 선택: Vanilla TypeScript + Vite + CSS Custom Properties

**선정 이유**:
- 타이머 앱은 상태가 단순 → React/Vue 오버헤드 불필요
- Vite: 빠른 빌드, PWA 플러그인 기본 제공
- Vanilla TS: 번들 크기 최소화 (< 20KB gzip)
- CSS Custom Properties: 런타임 테마 전환 지원

| 레이어 | 기술 | 이유 |
|--------|------|------|
| 언어 | TypeScript 5 | 타입 안전성, IDE 자동완성 |
| 빌드 | Vite 5 | HMR, 빠른 빌드, PWA 플러그인 |
| 스타일 | CSS (Custom Properties) | 프레임워크 불필요, 테마 지원 |
| 음성 | Web Audio API | 서버 없이 비프음 생성 |
| 음성 안내 | Web Speech API (SpeechSynthesis) | 브라우저 내장, 설치 불필요 |
| 저장소 | LocalStorage | 서버 없이 영구 데이터 저장 |
| PWA | vite-plugin-pwa | 오프라인 동작, 홈화면 설치 |
| 결제 | Gumroad 외부 링크 | 서버 없는 결제 연동 |

---

## 디렉토리 구조

```
tabata-timer/
├── index.html              # 앱 진입점
├── style.css               # 전역 스타일 + CSS 변수
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── manifest.json       # PWA 메니페스트
│   └── icons/              # 앱 아이콘
└── src/
    ├── main.ts             # 앱 초기화, DOM 바인딩
    ├── timer.ts            # 타이머 상태 머신 (핵심 로직)
    ├── audio.ts            # Web Audio API 비프음
    ├── speech.ts           # Web Speech API 음성 안내 (Pro)
    ├── storage.ts          # LocalStorage 히스토리 관리
    ├── premium.ts          # 프리미엄 기능 잠금/해제
    ├── presets.ts          # 워크아웃 프리셋 데이터
    └── ui.ts               # DOM 업데이트 헬퍼
```

---

## 타이머 상태 머신

```
IDLE
  └─[start]─→ COUNTDOWN (3초)
                └─[done]─→ WORK (workDuration초)
                              └─[done]─→ REST (restDuration초)
                                          └─[done, round < total]─→ WORK
                                          └─[done, round = total]─→ COMPLETE
                                                                      └─[reset]─→ IDLE
각 상태에서 [pause] → PAUSED → [resume] → 이전 상태
```

---

## 프리미엄 잠금 구조

```typescript
// LocalStorage 기반 (honor system + Gumroad 연동)
// 구매 후 Gumroad이 redirect URL에 ?unlocked=true 파라미터 전달
// 앱이 이를 감지하여 localStorage에 저장

const PREMIUM_KEY = 'tabatago_pro'
isPro(): boolean  → localStorage.getItem(PREMIUM_KEY) === 'true'
unlock(): void    → localStorage.setItem(PREMIUM_KEY, 'true')
```

---

## 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev        # http://localhost:5173

# 프로덕션 빌드
npm run build      # dist/ 폴더 생성

# Vercel/Netlify 배포 (정적 파일)
npm run build && vercel --prod
```

---

## 의존성

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.19.0"
  }
}
```

외부 런타임 의존성 **없음** (zero dependencies).
