# TabataGo — UI/UX 디자인 명세서

**작성자**: 디자이너 (UX/UI)
**버전**: 1.0
**날짜**: 2026-03-24

---

## 1. 디자인 철학

> "한 손으로, 한 눈에, 한 번에"

운동 중 사용하는 앱이므로 **최소 인터랙션 / 최대 가독성**을 원칙으로 한다.
- 땀 흘린 손으로도 탭할 수 있는 큰 터치 영역
- 3m 거리에서도 읽히는 타이머 숫자
- 현재 페이즈를 색상 하나로 즉각 인지

---

## 2. 컬러 시스템

### 페이즈 컬러 (가장 중요)

| 페이즈 | 변수 | HEX | 의미 |
|--------|------|-----|------|
| 대기 | `--color-idle` | `#6C757D` | 중립 · 회색 |
| 카운트다운 | `--color-countdown` | `#FFC107` | 주의 · 노랑 |
| 운동 | `--color-work` | `#FF4D4D` | 긴장 · 빨강 |
| 휴식 | `--color-rest` | `#4DABF7` | 이완 · 파랑 |
| 완료 | `--color-complete` | `#51CF66` | 성취 · 초록 |

페이즈 컬러는 `--phase-color` CSS 변수로 전체 UI에 동적 적용됨:
- 로고 텍스트 색상
- 원형 프로그레스 링
- 라운드 도트 (현재)
- 버튼 배경 / 테두리
- 통계 숫자 색상

### 배경 팔레트 (다크 테마)

| 변수 | HEX | 용도 |
|------|-----|------|
| `--bg` | `#1a1a2e` | 앱 배경 |
| `--surface` | `#16213e` | 헤더, 패널 |
| `--surface2` | `#0f3460` | 카드, 입력, 버튼 |
| `--text` | `#e0e0e0` | 본문 텍스트 |
| `--text-muted` | `#888888` | 보조 텍스트, 라벨 |

---

## 3. 타이포그래피

| 역할 | 크기 | 굵기 | 비고 |
|------|------|------|------|
| 타이머 숫자 | `clamp(3rem, 12vw, 5.5rem)` | 800 | `tabular-nums` |
| 페이즈 레이블 | `1.1rem` | 600 | uppercase, letter-spacing 2px |
| 라운드 표시 | `1rem` | 400 | tabular-nums |
| 로고 | `1.4rem` | 700 | — |
| 버튼 | `1.1rem` | 700 | — |
| 패널 제목 | `1.2rem` | 700 | — |
| 섹션 라벨 | `0.85rem` | 400 | uppercase, letter-spacing 1px |

폰트 스택: `'Segoe UI', system-ui, -apple-system, sans-serif`

---

## 4. 레이아웃 구조

```
┌──────────────────────────────┐
│  헤더 (64px)                  │
│  [TabataGo]  [🔈] [📊Pro] [⚙️] │
├──────────────────────────────┤
│                              │
│     ┌──────────────┐         │
│     │  원형 프로그레스 │         │
│     │  ┌──────┐   │         │
│     │  │ 운동! │   │         │
│     │  │  20  │   │         │
│     │  │ 1/8  │   │         │
│     │  └──────┘   │         │
│     └──────────────┘         │
│                              │
│     ● ● ● ● ● ● ● ●          │  ← 라운드 도트
│                              │
│     [↺]  [    시작    ]       │
│                              │
└──────────────────────────────┘
```

### 원형 프로그레스

- SVG `viewBox="0 0 120 120"`, `r=54`
- 배경 링: `stroke: --surface2`, `stroke-width: 8`
- 진행 링: `stroke: --phase-color`, `stroke-linecap: round`
- 크기: `min(320px, 80vw)` — 모바일 가득 채움
- 애니메이션: `stroke-dashoffset 0.9s linear` (부드러운 감소)

---

## 5. 컴포넌트 명세

### 5.1 시작 버튼 (`.btn-primary`)

```
padding: 16px 48px
border-radius: 50px (pill shape)
background: var(--phase-color)
box-shadow: 0 4px 20px color-mix(--phase-color 40%, transparent)
hover: translateY(-2px)
active: translateY(0)
```

상태별 텍스트:
- `idle` → "시작"
- `running` → "일시정지"
- `paused` → "재개"
- `complete` → "다시 시작"

### 5.2 리셋 버튼 (`.btn-secondary`)

- 원형 52×52px
- 아이콘: ↺
- hover: surface2 배경

### 5.3 라운드 도트

- 12×12px 원
- `done`: `--color-complete`
- `active`: `--phase-color` (현재 라운드)
- 미완: `--surface2`
- 간격: `8px`, `flex-wrap: wrap`

### 5.4 슬라이드 패널

- 우측에서 슬라이드 (`right: -100%` → `right: 0`)
- 폭: `min(400px, 100vw)`
- 전환: `0.3s ease`
- 오버레이 클릭 시 닫힘

### 5.5 Pro 모달

- 중앙 정렬, `max-width: 360px`
- `border-radius: 20px`
- 기능 목록 (`✅` 접두사)
- 구매 버튼 (pill, phase-color)
- "나중에" ghost 버튼

### 5.6 Pro 배지

- `0.65rem`, red (`--color-work`) 배경
- Pro 전용 기능에 inline 표시
- Pro 구매 후 숨김

---

## 6. 인터랙션 & 애니메이션

| 요소 | 트랜지션 |
|------|---------|
| 페이즈 색상 변경 | `color 0.4s`, `stroke 0.4s` |
| 링 진행 | `stroke-dashoffset 0.9s linear` |
| 버튼 hover | `transform 0.1s` |
| 패널 슬라이드 | `right 0.3s ease` |
| 도트 상태 변화 | `background 0.3s` |

---

## 7. 반응형

| 브레이크포인트 | 변경사항 |
|--------------|---------|
| `≤ 480px` | `timer-container` gap 20px, preset grid 2열 유지 |
| 기본 | 원형 `min(320px, 80vw)` 자동 축소 |

---

## 8. 접근성

- 모든 버튼에 `aria-label`
- 색상만으로 정보 전달하지 않음 (페이즈 레이블 텍스트 병용)
- 충분한 색상 대비 (다크 배경 + 밝은 텍스트)
- 터치 영역 최소 44×44px 준수

---

## 9. PWA 아이콘 가이드라인

- 배경: `#1a1a2e` (앱 배경색)
- 아이콘: 빨간 불꽃 또는 스톱워치 + "T" 심볼
- 192×192, 512×512 PNG 필요
- `theme-color`: `#FF4D4D` (work 색상)
