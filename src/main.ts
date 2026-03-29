// 📄 src/main.ts — 앱 초기화 및 UI 바인딩

import { TabataTimer, DEFAULT_CONFIG, type Phase, type TimerConfig } from './timer'
import { AudioManager, type VolumeLevel } from './audio'
import { SpeechManager } from './speech'
import { PremiumManager } from './premium'
import { WorkoutStorage } from './storage'
import { PRESETS } from './presets'
import { APP_VERSION } from './version'

// ── DOM 요소 ────────────────────────────────────────────

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!

const timerCircle       = document.querySelector<SVGCircleElement>('#timer-circle')!
const timerNumber       = $('#timer-number')
const phaseLabel        = $('#phase-label')
const roundLabel        = $('#round-label')
const roundDots         = $('#round-dots')
const btnStart          = $<HTMLButtonElement>('#btn-start')
const btnReset          = $<HTMLButtonElement>('#btn-reset')
const settingsPanel     = $('#settings-panel')
const btnSettings       = $<HTMLButtonElement>('#btn-settings')
const btnClose          = $<HTMLButtonElement>('#btn-close-settings')
const historyPanel      = $('#history-panel')
const btnHistory        = $<HTMLButtonElement>('#btn-history')
const btnCloseHistory   = $<HTMLButtonElement>('#btn-close-history')
const historyList       = $('#history-list')
const proModal          = $('#pro-modal')
const btnBuyPro         = $<HTMLButtonElement>('#btn-buy-pro')
const btnClosePro       = $<HTMLButtonElement>('#btn-close-pro')
const presetGrid        = $('#preset-grid')
const inputWork         = $<HTMLInputElement>('#input-work')
const inputRest         = $<HTMLInputElement>('#input-rest')
const inputRounds       = $<HTMLInputElement>('#input-rounds')
const btnApplyConfig    = $<HTMLButtonElement>('#btn-apply-config')
const btnVoice          = $<HTMLButtonElement>('#btn-voice')
const statsTotal        = $('#stats-total')
const statsWeek         = $('#stats-week')
const statsStreak       = $('#stats-streak')
const elapsedLabel      = $('#elapsed-label')
const summaryCard       = $('#summary-card')
const overallProgressFill = $<HTMLDivElement>('#overall-progress-fill')
const nextPhaseLabel    = $('#next-phase-label')
const onboardingTooltip = $('#onboarding-tooltip')
const intervalDisplay   = $('#interval-display')
const progressRingSvg   = $('#progress-ring-svg')
const historyDeleteArea = $('#history-delete-area')
const toggleMinimalist  = $<HTMLInputElement>('#toggle-minimalist')
const toggleWarmup      = $<HTMLInputElement>('#toggle-warmup')
const toggleCooldown    = $<HTMLInputElement>('#toggle-cooldown')
const errWork           = $('#err-work')
const errRest           = $('#err-rest')
const errRounds         = $('#err-rounds')
const weeklyGoalCard    = $('#weekly-goal-card')
const weeklyGoalProgress = $('#weekly-goal-progress')
const weeklyGoalCount   = $('#weekly-goal-count')
const weeklyGoalMessage = $('#weekly-goal-message')
const goalRingFill      = document.querySelector<SVGCircleElement>('#goal-ring-fill')!
const toastEl           = $('#toast')
// Sprint 9
const pwaInstallBanner  = $('#pwa-install-banner')
const btnPwaInstall     = $<HTMLButtonElement>('#btn-pwa-install')
const btnPwaDismiss     = $<HTMLButtonElement>('#btn-pwa-dismiss')
const appVersionLabel   = $('#app-version-label')
const btnContinueFree   = $<HTMLAnchorElement>('#btn-continue-free')
const errorBoundary     = $('#error-boundary')

// ── 서비스 인스턴스 ───────────────────────────────────────

const timer    = new TabataTimer(DEFAULT_CONFIG)
const audio    = new AudioManager()
const speech   = new SpeechManager()
const premium  = new PremiumManager()
const storage  = new WorkoutStorage()

// ── 설정 저장/불러오기 (Feature C) ───────────────────────

const SETTINGS_KEY = 'tabatago_settings'

interface SavedSettings {
  workDuration: number
  restDuration: number
  totalRounds: number
  warmupEnabled?: boolean
  cooldownEnabled?: boolean
}

function saveSettings(cfg: SavedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg))
  } catch {
    // localStorage 미지원 환경 무시
  }
}

function loadSettings(): SavedSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedSettings>
    const work   = Math.max(5,  Math.min(300, Number(parsed.workDuration)  || 0))
    const rest   = Math.max(3,  Math.min(180, Number(parsed.restDuration)  || 0))
    const rounds = Math.max(1,  Math.min(99,  Number(parsed.totalRounds)   || 0))
    if (!work || !rest || !rounds) return null
    return {
      workDuration: work,
      restDuration: rest,
      totalRounds: rounds,
      warmupEnabled: parsed.warmupEnabled === true,
      cooldownEnabled: parsed.cooldownEnabled === true,
    }
  } catch {
    return null
  }
}

// ── 미니멀리스트 모드 (Sprint 5) ──────────────────────────

const MINIMALIST_KEY = 'tabatago_minimalist'

function loadMinimalistMode(): boolean {
  try {
    return localStorage.getItem(MINIMALIST_KEY) === '1'
  } catch {
    return false
  }
}

function saveMinimalistMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(MINIMALIST_KEY, '1')
    } else {
      localStorage.removeItem(MINIMALIST_KEY)
    }
  } catch {
    // localStorage 미지원 환경 무시
  }
}

function applyMinimalistMode(enabled: boolean): void {
  document.body.classList.toggle('minimalist', enabled)
  toggleMinimalist.checked = enabled
}

// ── 상태 ─────────────────────────────────────────────────

let voiceEnabled = false
let workoutStartTime: Date | null = null
let activePresetId: string | null = null
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 54  // r=54

// ── 인터벌 설정 표시 (Sprint 4 Feature A) ─────────────────
function updateIntervalDisplay(workDuration: number, restDuration: number): void {
  intervalDisplay.textContent = `${workDuration}s 운동 / ${restDuration}s 휴식`
}

// ── Sprint 7 Feature C: 입력 검증 피드백 ─────────────────

interface InputValidationSpec {
  min: number
  max: number
  errorEl: HTMLElement
  inputEl: HTMLInputElement
}

function validateInput(spec: InputValidationSpec): boolean {
  const val = Number(spec.inputEl.value)
  if (isNaN(val) || val < spec.min) {
    spec.inputEl.classList.add('input-invalid')
    spec.errorEl.textContent = `최소 ${spec.min}초`
    return false
  }
  if (val > spec.max) {
    spec.inputEl.classList.add('input-invalid')
    spec.errorEl.textContent = `최대 ${spec.max}초`
    return false
  }
  spec.inputEl.classList.remove('input-invalid')
  spec.errorEl.textContent = ''
  return true
}

function validateRoundsInput(): boolean {
  const val = Number(inputRounds.value)
  if (isNaN(val) || val < 1) {
    inputRounds.classList.add('input-invalid')
    errRounds.textContent = '최소 1라운드'
    return false
  }
  if (val > 99) {
    inputRounds.classList.add('input-invalid')
    errRounds.textContent = '최대 99라운드'
    return false
  }
  inputRounds.classList.remove('input-invalid')
  errRounds.textContent = ''
  return true
}

// ── 페이즈별 배경 색상 틴트 (Sprint 4 Feature C) ──────────
function setBodyTint(phase: Phase): void {
  // BUG-10 fix: use CSS variables instead of hardcoded hex so theme changes propagate
  const tintMap: Record<Phase, string> = {
    idle:      'transparent',
    countdown: 'transparent',
    warmup:    'var(--color-warmup)',
    work:      'var(--color-work)',
    rest:      'var(--color-rest)',
    cooldown:  'var(--color-warmup)',
    complete:  'transparent',
  }
  document.documentElement.style.setProperty('--bg-tint', tintMap[phase])
}

// ── ARIA SVG 레이블 업데이트 (Sprint 4 Feature E) ─────────
function updateSvgAriaLabel(phase: Phase, timeRemaining: number, round: number, totalRounds: number): void {
  const phaseNames: Record<Phase, string> = {
    idle:      '대기',
    countdown: '준비 카운트다운',
    warmup:    '워밍업',
    work:      '운동',
    rest:      '휴식',
    cooldown:  '쿨다운',
    complete:  '완료',
  }
  const label = phase === 'idle' || phase === 'complete'
    ? `타바타 타이머 — ${phaseNames[phase]}`
    : `타바타 타이머 — ${phaseNames[phase]} ${timeRemaining}초, ${round}/${totalRounds} 라운드`
  progressRingSvg.setAttribute('aria-label', label)
}

// ── 전체 진행 바 (Sprint 3 Feature A) ────────────────────
function updateOverallProgress(currentRound: number, totalRounds: number): void {
  const pct = totalRounds > 0 ? Math.round((currentRound / totalRounds) * 100) : 0
  overallProgressFill.style.width = `${pct}%`
}

function resetOverallProgress(): void {
  overallProgressFill.style.width = '0%'
}

// ── 휴식 시각적 구분 (Sprint 3 Feature B) ─────────────────
function setRestMode(active: boolean): void {
  document.body.classList.toggle('rest-mode', active)
}

// ── 다음 페이즈 미리보기 (Sprint 3 Feature C) ─────────────
function updateNextPhaseLabel(phase: Phase, round: number, config: ReturnType<typeof timer.getState>['config']): void {
  if (phase === 'idle' || phase === 'complete') {
    nextPhaseLabel.style.display = 'none'
    return
  }
  let text = ''
  if (phase === 'countdown') {
    text = config.warmupDuration > 0 ? `다음: 워밍업 ${config.warmupDuration}s` : `다음: 운동 ${config.workDuration}s`
  } else if (phase === 'warmup') {
    text = `다음: 운동 ${config.workDuration}s`
  } else if (phase === 'work') {
    text = `다음: 휴식 ${config.restDuration}s`
  } else if (phase === 'rest') {
    if (round < config.totalRounds) {
      text = `다음: 운동 ${config.workDuration}s`
    } else if (config.cooldownDuration > 0) {
      text = `다음: 쿨다운 ${config.cooldownDuration}s`
    } else {
      text = '다음: 완료!'
    }
  } else if (phase === 'cooldown') {
    text = '다음: 완료!'
  }
  nextPhaseLabel.textContent = text
  nextPhaseLabel.style.display = 'block'
}

// ── 햅틱 피드백 (Sprint 3 Feature D) ─────────────────────
function triggerHaptic(pattern: number | number[]): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // 미지원 환경 무시
    }
  }
}

// ── 온보딩 툴팁 (Sprint 3 Feature F) ─────────────────────
const ONBOARDING_KEY = 'tabatago_onboarded'
let onboardingTimerId: ReturnType<typeof setTimeout> | null = null

function showOnboardingTooltip(): void {
  try {
    if (localStorage.getItem(ONBOARDING_KEY)) return
  } catch {
    // localStorage 미지원 환경 — 항상 표시
  }
  onboardingTooltip.style.display = 'block'
  onboardingTooltip.classList.remove('dismissing')

  onboardingTimerId = setTimeout(() => {
    dismissOnboardingTooltip()
  }, 4000)
}

function dismissOnboardingTooltip(): void {
  if (onboardingTimerId !== null) {
    clearTimeout(onboardingTimerId)
    onboardingTimerId = null
  }
  if (onboardingTooltip.style.display === 'none') return

  onboardingTooltip.classList.add('dismissing')
  onboardingTooltip.addEventListener('animationend', () => {
    onboardingTooltip.style.display = 'none'
    onboardingTooltip.classList.remove('dismissing')
  }, { once: true })

  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    // localStorage 미지원 환경 무시
  }
}

// ── 경과 시간 표시 (Feature A) ────────────────────────────

let elapsedIntervalId: ReturnType<typeof setInterval> | null = null

function startElapsedTimer(): void {
  if (elapsedIntervalId !== null) clearInterval(elapsedIntervalId)
  elapsedLabel.style.display = 'block'
  elapsedIntervalId = setInterval(() => {
    if (!workoutStartTime) return
    const seconds = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000)
    elapsedLabel.textContent = '경과 ' + formatDuration(seconds)
  }, 500)
}

function stopElapsedTimer(): void {
  if (elapsedIntervalId !== null) {
    clearInterval(elapsedIntervalId)
    elapsedIntervalId = null
  }
  elapsedLabel.style.display = 'none'
  elapsedLabel.textContent = ''
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

// ── 완료 요약 카드 (Feature B + Sprint 4 Feature D: 스트릭 배지) ──

function showToast(message: string): void {
  toastEl.textContent = message
  toastEl.classList.add('show')
  setTimeout(() => { toastEl.classList.remove('show') }, 3000)
}

async function shareWorkout(rounds: number, durationSeconds: number, workDuration: number, restDuration: number): Promise<void> {
  const interval = `${workDuration}s 운동 / ${restDuration}s 휴식`
  const text = `💪 TabataGo 운동 완료!\n${interval} × ${rounds}라운드\n총 ${formatDuration(durationSeconds)} 완주!\nhttps://tabatago.app`
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'TabataGo 운동 완료', text })
    } catch {
      // 사용자 취소 또는 미지원 — 조용히 무시
    }
  } else {
    try {
      await navigator.clipboard.writeText(text)
      showToast('클립보드에 복사됨')
    } catch {
      // clipboard 미지원 환경 무시
    }
  }
}

function showSummaryCard(rounds: number, durationSeconds: number, workDuration: number, restDuration: number, streak: number): void {
  stopCircleAnimation()
  elapsedLabel.style.display = 'none'
  timerNumber.style.display = 'none'
  phaseLabel.style.display = 'none'
  roundLabel.style.display = 'none'
  intervalDisplay.style.display = 'none'

  const streakBadge = streak >= 3
    ? `<div class="summary-badge">🔥 ${streak}일 연속!</div>`
    : ''
  // Feature A: Pro 업그레이드 유도 배너 (FREE 사용자만)
  const upgradeBanner = !premium.isPro()
    ? `<span class="summary-upgrade-banner" id="summary-upgrade-link">Pro로 업그레이드하면 기록이 저장됩니다 →</span>`
    : ''
  summaryCard.innerHTML = `
    <div class="summary-emoji">🎉</div>
    <div class="summary-title">운동 완료!</div>
    ${streakBadge}
    <div class="summary-stats">
      <div class="summary-stat">
        <span class="summary-stat-value">${rounds}</span>
        <span class="summary-stat-label">완료 라운드</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${formatDuration(durationSeconds)}</span>
        <span class="summary-stat-label">총 소요 시간</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${workDuration}s</span>
        <span class="summary-stat-label">라운드당 운동</span>
      </div>
    </div>
    <button class="btn-share" id="btn-share-workout" aria-label="운동 결과 공유">공유하기 📤</button>
    ${upgradeBanner}
  `
  summaryCard.classList.add('visible')

  // Feature B: 공유 버튼 이벤트
  const btnShare = document.getElementById('btn-share-workout') as HTMLButtonElement | null
  btnShare?.addEventListener('click', () => { shareWorkout(rounds, durationSeconds, workDuration, restDuration).catch(() => {}) })

  // Feature A: 업그레이드 배너 탭 → Pro 모달 열기 + 배너 숨기기
  const upgradeLink = document.getElementById('summary-upgrade-link') as HTMLElement | null
  upgradeLink?.addEventListener('click', () => {
    openPanel(proModal, upgradeLink as HTMLElement)
    upgradeLink.style.display = 'none'
  })
}

function hideSummaryCard(): void {
  summaryCard.classList.remove('visible')
  summaryCard.innerHTML = ''
  timerNumber.style.display = ''
  phaseLabel.style.display = ''
  roundLabel.style.display = ''
  intervalDisplay.style.display = ''
  nextPhaseLabel.style.display = 'none'
}

// ── Wake Lock ────────────────────────────────────────────

let wakeLock: WakeLockSentinel | null = null

async function acquireWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => { wakeLock = null })
  } catch {
    // 권한 거부 또는 미지원 — 조용히 무시
  }
}

function releaseWakeLock(): void {
  if (wakeLock) {
    wakeLock.release().catch(() => {})
    wakeLock = null
  }
}

// ── 페이지 비가시성 처리 ─────────────────────────────────

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // 탭이 백그라운드로: 실행 중이면 자동 일시정지
    const state = timer.getState()
    if (state.isRunning) {
      timer.pause()
      stopCircleAnimation()
      // Sprint 8 Feature B: 자동 일시정지 시 링 인디케이터
      setRingPaused(true)
      btnStart.textContent = '재개'
    }
  } else {
    // 탭이 포어그라운드로: Wake Lock 재획득 (실행 중이던 경우)
    const state = timer.getState()
    if (!state.isRunning && state.phase !== 'idle' && state.phase !== 'complete') {
      // 일시정지 상태 유지 (자동 재개하지 않음 — QA 결정)
    }
    const running = timer.getState().isRunning
    if (running) {
      acquireWakeLock()
    }
  }
})

// ── 탭 타이틀 업데이트 ───────────────────────────────────

const DEFAULT_TITLE = 'TabataGo — 타바타 타이머'

function updateTabTitle(phase: Phase, timeRemaining: number): void {
  switch (phase) {
    case 'warmup':
      document.title = `워밍업 ${timeRemaining}s | TabataGo`
      break
    case 'work':
      document.title = `운동! ${timeRemaining}s | TabataGo`
      break
    case 'rest':
      document.title = `휴식 ${timeRemaining}s | TabataGo`
      break
    case 'cooldown':
      document.title = `쿨다운 ${timeRemaining}s | TabataGo`
      break
    case 'countdown':
      document.title = `준비 ${timeRemaining}s | TabataGo`
      break
    case 'complete':
      document.title = '완료! 🎉 | TabataGo'
      break
    default:
      document.title = DEFAULT_TITLE
  }
}

// ── 키보드 단축키 ────────────────────────────────────────

document.addEventListener('keydown', (e: KeyboardEvent) => {
  // 입력 필드에 포커스된 경우 단축키 무시
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return

  switch (e.key) {
    case ' ':
    case 'Spacebar':
      e.preventDefault()
      btnStart.click()
      break
    case 'r':
    case 'R':
      e.preventDefault()
      btnReset.click()
      break
    case 'Escape':
      closePanel(settingsPanel)
      closePanel(historyPanel)
      closePanel(proModal)
      break
  }
})

// ── 스와이프로 패널 닫기 (Sprint 3 Feature E) ─────────────

function addSwipeToClose(panel: HTMLElement): void {
  let touchStartX = 0
  let touchStartY = 0

  panel.addEventListener('touchstart', (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    touchStartX = touch.clientX
    touchStartY = touch.clientY
  }, { passive: true })

  panel.addEventListener('touchend', (e: TouchEvent) => {
    const touch = e.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - touchStartX
    const deltaY = touch.clientY - touchStartY
    // 왼쪽 스와이프 & 수평 우세 조건: |deltaX| > 80 && |deltaX| > |deltaY| * 1.5
    if (deltaX > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      panel.classList.remove('open')
      // Sprint 8 Feature D: 스와이프 닫기 시 상단으로 스크롤
      scrollToTop()
    }
  }, { passive: true })
}

// ── rAF 기반 원형 프로그레스 애니메이션 (60fps) ──────────

let rafId: number | null = null

function setCircleOffset(remaining: number, total: number): void {
  const progress = total > 0 ? remaining / total : 1
  timerCircle.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE * (1 - progress))
}

function startCircleAnimation(remainingSeconds: number, totalSeconds: number): void {
  if (rafId !== null) cancelAnimationFrame(rafId)
  const startTime = performance.now()

  function frame(now: number): void {
    const elapsed = (now - startTime) / 1000
    const remaining = Math.max(0, remainingSeconds - elapsed)
    setCircleOffset(remaining, totalSeconds)
    if (remaining > 0) rafId = requestAnimationFrame(frame)
    else rafId = null
  }

  rafId = requestAnimationFrame(frame)
}

function stopCircleAnimation(): void {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
}

// 페이즈 전환: 빈 원으로 즉시 스냅 후 새 페이즈 채우기 시작
function resetCircleForPhase(remaining: number, total: number): void {
  stopCircleAnimation()
  timerCircle.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE)
  requestAnimationFrame(() => startCircleAnimation(remaining, total))
}

function getPhaseDuration(config: ReturnType<typeof timer.getState>['config'], phase: Phase): number {
  switch (phase) {
    case 'countdown': return config.countdownDuration
    case 'warmup':    return config.warmupDuration
    case 'work':      return config.workDuration
    case 'rest':      return config.restDuration
    case 'cooldown':  return config.cooldownDuration
    default:          return 1
  }
}

// ── Sprint 8 Feature B: 일시정지 링 인디케이터 ─────────

function setRingPaused(paused: boolean): void {
  timerCircle.classList.toggle('ring-paused', paused)
}

// ── Sprint 8 Feature E: CSS 컨페티 버스트 ───────────────

function triggerConfetti(): void {
  const burst = document.createElement('div')
  burst.className = 'confetti-burst'
  for (let i = 0; i < 8; i++) {
    burst.appendChild(document.createElement('span'))
  }
  document.body.appendChild(burst)
  setTimeout(() => burst.remove(), 2200)
}

// ── 페이즈 전환 펄스 애니메이션 ─────────────────────────

function triggerRingPulse(): void {
  timerCircle.classList.remove('ring-pulse')
  // 리플로우를 강제하여 애니메이션이 재실행되도록
  void (timerCircle as unknown as HTMLElement & { offsetWidth: number }).offsetWidth
  timerCircle.classList.add('ring-pulse')
  timerCircle.addEventListener('animationend', () => {
    timerCircle.classList.remove('ring-pulse')
  }, { once: true })
}

// ── 라운드 도트 렌더링 ────────────────────────────────────

function renderRoundDots(current: number, total: number): void {
  roundDots.innerHTML = Array.from({ length: total }, (_, i) =>
    `<span class="dot ${i === current - 1 ? 'active' : i < current - 1 ? 'done' : ''}"></span>`
  ).join('')
}

// ── 타이머 이벤트 처리 ────────────────────────────────────

timer.on(event => {
  const state = timer.getState()

  if (event.type === 'PHASE_CHANGE') {
    const { phase, round } = event

    // 페이즈별 UI 색상·레이블
    const phaseMap: Record<Phase, { label: string; color: string }> = {
      idle:      { label: '준비',     color: 'var(--color-idle)' },
      countdown: { label: '준비',     color: 'var(--color-countdown)' },
      warmup:    { label: '워밍업',   color: 'var(--color-warmup)' },
      work:      { label: '운동!',    color: 'var(--color-work)' },
      rest:      { label: '휴식',     color: 'var(--color-rest)' },
      cooldown:  { label: '쿨다운',   color: 'var(--color-warmup)' },
      complete:  { label: '완료! 🎉', color: 'var(--color-complete)' },
    }
    const { label, color } = phaseMap[phase]
    phaseLabel.textContent = label
    document.documentElement.style.setProperty('--phase-color', color)
    // Sprint 7 Feature A: 링 색상을 명시적으로 업데이트해 rAF 도중 색상 전환 보장
    timerCircle.style.stroke = color

    // 페이즈별 배경 색상 틴트 (Sprint 4 Feature C)
    setBodyTint(phase)

    // ARIA SVG 레이블 업데이트 (Sprint 4 Feature E)
    updateSvgAriaLabel(phase, state.timeRemaining, round, state.config.totalRounds)

    // 라운드 표시 (warmup/cooldown은 라운드에 포함 안 됨)
    if (phase === 'work' || phase === 'rest') {
      roundLabel.textContent = `${round} / ${state.config.totalRounds}`
      renderRoundDots(round, state.config.totalRounds)
    } else if (phase === 'idle' || phase === 'warmup') {
      roundLabel.textContent = `0 / ${state.config.totalRounds}`
      renderRoundDots(0, state.config.totalRounds)
    } else if (phase === 'cooldown') {
      roundLabel.textContent = `${state.config.totalRounds} / ${state.config.totalRounds}`
      renderRoundDots(state.config.totalRounds, state.config.totalRounds)
    }

    // 전체 진행 바 (Sprint 3 Feature A)
    if (phase === 'work' || phase === 'rest') {
      // work 시작 시: 이전 라운드 완료 기준 (round - 1), rest 시작 시: round 완료 기준
      const completedRounds = phase === 'work' ? round - 1 : round
      updateOverallProgress(completedRounds, state.config.totalRounds)
    } else if (phase === 'complete' || phase === 'cooldown') {
      updateOverallProgress(state.config.totalRounds, state.config.totalRounds)
    } else if (phase === 'idle' || phase === 'countdown' || phase === 'warmup') {
      resetOverallProgress()
    }

    // 다음 페이즈 미리보기 (Sprint 3 Feature C)
    updateNextPhaseLabel(phase, round, state.config)

    // 초기 숫자 표시 (complete는 COMPLETE 이벤트에서 처리)
    if (phase !== 'complete') {
      // Sprint 8 Feature C: 페이즈 전환 시 숫자 페이드 인 애니메이션
      timerNumber.classList.remove('number-transition')
      void (timerNumber as HTMLElement & { offsetWidth: number }).offsetWidth
      timerNumber.textContent = String(state.timeRemaining)
      timerNumber.classList.add('number-transition')
      timerNumber.addEventListener('animationend', () => {
        timerNumber.classList.remove('number-transition')
      }, { once: true })
      resetCircleForPhase(state.timeRemaining, getPhaseDuration(state.config, phase))
    }

    // Sprint 8 Feature B: 새 페이즈 시작 시 ring-paused 해제 (running)
    setRingPaused(false)

    // 페이즈 전환 시 링 펄스 애니메이션 (idle 제외)
    if (phase !== 'idle') {
      triggerRingPulse()
    }

    // 탭 타이틀 업데이트
    updateTabTitle(phase, state.timeRemaining)

    // 오디오
    if (phase === 'work')     audio.workStart()
    if (phase === 'rest')     audio.restStart()
    if (phase === 'warmup')   audio.restStart()   // 부드러운 톤 재사용
    if (phase === 'cooldown') audio.restStart()   // 부드러운 톤 재사용

    // 햅틱 피드백 강화 (Sprint 3 Feature D)
    if (phase === 'work')     triggerHaptic(200)
    if (phase === 'rest')     triggerHaptic([50, 50, 50])
    if (phase === 'warmup' || phase === 'cooldown') triggerHaptic([30, 30, 30])

    // 휴식 시각적 구분 (Sprint 3 Feature B)
    setRestMode(phase === 'rest' || phase === 'cooldown')

    // 음성 안내 (Pro)
    if (voiceEnabled && premium.isPro()) {
      if (phase === 'work') {
        if (round === state.config.totalRounds) speech.lastRound()
        else speech.workStart(round, state.config.totalRounds)
      }
      if (phase === 'rest') speech.restStart()
    }

    // 운동 시작 시간 기록 + 경과 타이머 시작 (워밍업 있으면 워밍업 시작 시 기록)
    if ((phase === 'warmup') || (phase === 'work' && round === 1 && !timer.hasWarmup())) {
      workoutStartTime = new Date()
      startElapsedTimer()
    }

    // 버튼 상태
    btnStart.textContent = phase === 'complete' ? '다시 시작' : '일시정지'
  }

  if (event.type === 'TICK') {
    const { phase, timeRemaining } = state
    timerNumber.textContent = String(timeRemaining)
    // Sprint 7 Feature B: 숫자 tick 펄스 애니메이션
    timerNumber.classList.remove('tick-pulse')
    void (timerNumber as HTMLElement & { offsetWidth: number }).offsetWidth
    timerNumber.classList.add('tick-pulse')

    // 탭 타이틀 업데이트
    updateTabTitle(phase, timeRemaining)

    // ARIA SVG 레이블 업데이트 (Sprint 4 Feature E)
    updateSvgAriaLabel(phase, timeRemaining, state.currentRound, state.config.totalRounds)

    // 카운트다운 틱음
    if (phase === 'countdown') {
      audio.countdown(timeRemaining)
      if (voiceEnabled && premium.isPro()) speech.countdown(timeRemaining)
    }
  }

  if (event.type === 'COMPLETE') {
    audio.complete()
    if (voiceEnabled && premium.isPro()) speech.complete()
    stopElapsedTimer()
    updateTabTitle('complete', 0)
    releaseWakeLock()
    // Sprint 8 Feature E: CSS 컨페티 버스트
    triggerConfetti()
    // 햅틱 완료 진동 (Sprint 3 Feature D)
    triggerHaptic(500)
    // 휴식 모드 해제 (Sprint 3 Feature B)
    setRestMode(false)
    // 다음 페이즈 레이블 숨김
    nextPhaseLabel.style.display = 'none'

    // 완료 요약 카드 표시 (Feature B + Sprint 4 Feature D)
    const { config } = state
    const durationSeconds = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime.getTime()) / 1000)
      : (config.workDuration + config.restDuration) * config.totalRounds + config.countdownDuration

    // 운동 기록 저장 먼저 (Sprint 4 Feature D: 저장 후 streak 조회해야 당일 반영)
    if (premium.isPro() && workoutStartTime) {
      storage.saveWorkout({
        date: new Date().toISOString(),
        rounds: config.totalRounds,
        workDuration: config.workDuration,
        restDuration: config.restDuration,
        durationSeconds,
      })
    }
    workoutStartTime = null

    // 스트릭 조회 (기록 저장 이후) 및 요약 카드 표시
    const streak = premium.isPro() ? storage.getStats().streak : 0
    showSummaryCard(config.totalRounds, durationSeconds, config.workDuration, config.restDuration, streak)

    // 배경 틴트 리셋 (Sprint 4 Feature C)
    setBodyTint('complete')

    // Sprint 9 Feature A: 첫 완료 운동 후 PWA 설치 배너 표시
    showPwaInstallBanner()
  }
})

// ── 버튼 이벤트 ───────────────────────────────────────────

// 롱프레스 카운트다운 스킵 (Sprint 4 Feature B)
let longPressTimerId: ReturnType<typeof setTimeout> | null = null
let longPressActivated = false

btnStart.addEventListener('pointerdown', () => {
  longPressActivated = false
  longPressTimerId = setTimeout(() => {
    const state = timer.getState()
    if (state.phase === 'countdown') {
      longPressActivated = true
      timer.skipCountdown()
      triggerHaptic(100)
    }
    longPressTimerId = null
  }, 500)
})

function cancelLongPress(): void {
  if (longPressTimerId !== null) {
    clearTimeout(longPressTimerId)
    longPressTimerId = null
  }
  // BUG-04 fix: always reset the flag so the next click is not swallowed
  longPressActivated = false
}

btnStart.addEventListener('pointerup', cancelLongPress)
btnStart.addEventListener('pointercancel', cancelLongPress)
btnStart.addEventListener('pointerleave', cancelLongPress)
btnStart.addEventListener('contextmenu', (e: MouseEvent) => { e.preventDefault() })

btnStart.addEventListener('click', () => {
  // 롱프레스로 이미 처리된 경우 click 이벤트 무시
  if (longPressActivated) {
    longPressActivated = false
    return
  }
  const state = timer.getState()
  if (state.phase === 'complete' || state.phase === 'idle') {
    // Sprint 7 Feature F: 시작 시 설정/기록 패널 닫기 + 타이머로 스크롤
    closePanel(settingsPanel)
    closePanel(historyPanel)
    document.querySelector<HTMLElement>('.timer-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    hideSummaryCard()
    timer.reset()
    timer.start()
    acquireWakeLock()
  } else if (state.isRunning) {
    timer.pause()
    stopCircleAnimation()
    // Sprint 8 Feature B: 일시정지 시 링 점선 인디케이터
    setRingPaused(true)
    btnStart.textContent = '재개'
    releaseWakeLock()
  } else {
    timer.resume()
    // Sprint 8 Feature B: 재개 시 링 인디케이터 해제
    setRingPaused(false)
    const s = timer.getState()
    startCircleAnimation(s.timeRemaining, getPhaseDuration(s.config, s.phase))
    btnStart.textContent = '일시정지'
    acquireWakeLock()
  }
})

btnReset.addEventListener('click', () => {
  cancelLongPress()
  timer.reset()  // emits PHASE_CHANGE 'idle' which handles roundDots + roundLabel
  stopCircleAnimation()
  stopElapsedTimer()
  hideSummaryCard()
  releaseWakeLock()
  // Sprint 8 Feature B: 리셋 시 일시정지 링 인디케이터 해제
  setRingPaused(false)
  setRestMode(false)
  setBodyTint('idle')
  resetOverallProgress()
  nextPhaseLabel.style.display = 'none'
  const cfg = timer.getState().config
  timerNumber.textContent = String(cfg.workDuration)
  phaseLabel.textContent = '준비'
  // BUG-03 fix: roundLabel and renderRoundDots are already set by the PHASE_CHANGE 'idle' handler
  btnStart.textContent = '시작'
  document.documentElement.style.setProperty('--phase-color', 'var(--color-idle)')
  setCircleOffset(1, 1)
  document.title = DEFAULT_TITLE
  updateSvgAriaLabel('idle', cfg.workDuration, 0, cfg.totalRounds)
})

// ── Sprint 8 Feature D: 패널 닫기 시 상단으로 스크롤 ────

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Sprint 10: 포커스 트랩 (접근성) ──────────────────────

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

function trapFocus(container: HTMLElement, returnFocusEl?: HTMLElement | null): () => void {
  const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  const focusables = getFocusable()
  focusables[0]?.focus()

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return
    const els = getFocusable()
    if (els.length === 0) { e.preventDefault(); return }
    const first = els[0]!
    const last = els[els.length - 1]!
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }

  container.addEventListener('keydown', onKeyDown)
  return () => {
    container.removeEventListener('keydown', onKeyDown)
    returnFocusEl?.focus()
  }
}

const panelTrapCleanups = new Map<HTMLElement, () => void>()

function openPanel(panel: HTMLElement, trigger?: HTMLElement | null): void {
  panel.classList.add('open')
  const existing = panelTrapCleanups.get(panel)
  if (existing) existing()
  panelTrapCleanups.set(panel, trapFocus(panel, trigger))
}

function closePanel(panel: HTMLElement): void {
  panel.classList.remove('open')
  const cleanup = panelTrapCleanups.get(panel)
  if (cleanup) { cleanup(); panelTrapCleanups.delete(panel) }
}

// 설정 패널
btnSettings.addEventListener('click', () => openPanel(settingsPanel, btnSettings))
btnClose.addEventListener('click', () => {
  closePanel(settingsPanel)
  scrollToTop()
})

// 기록 패널 (Pro)
btnHistory.addEventListener('click', () => {
  if (!premium.isPro()) { openPanel(proModal, btnHistory); return }
  renderHistory()
  openPanel(historyPanel, btnHistory)
})
btnCloseHistory.addEventListener('click', () => {
  closePanel(historyPanel)
  scrollToTop()
})

// ── 볼륨 토글 (Feature D: 3단계) ────────────────────────

const VOLUME_ICONS: Record<VolumeLevel, string>  = { 0: '🔇', 1: '🔈', 2: '🔊' }
const VOLUME_TITLES: Record<VolumeLevel, string> = { 0: '소리 꺼짐', 1: '소리 작게', 2: '소리 크게' }
const VOLUME_CYCLE: VolumeLevel[] = [2, 1, 0]  // 클릭할 때마다 high→low→off→high

btnVoice.addEventListener('click', () => {
  const current = audio.getVolume()
  const nextIndex = (VOLUME_CYCLE.indexOf(current) + 1) % VOLUME_CYCLE.length
  const next = VOLUME_CYCLE[nextIndex]!
  audio.setVolume(next)

  // 음성 안내: 볼륨이 0이 되면 끄고, 0에서 올라오면 Pro 여부에 따라 켜기
  if (next === 0) {
    voiceEnabled = false
    speech.setEnabled(false)
  } else if (premium.isPro()) {
    voiceEnabled = true
    speech.setEnabled(true)
  }

  btnVoice.textContent = VOLUME_ICONS[next]
  btnVoice.classList.toggle('active', next > 0)
  btnVoice.title = VOLUME_TITLES[next]
})

// Pro 모달
btnBuyPro.addEventListener('click', () => premium.openPurchasePage())
btnClosePro.addEventListener('click', () => closePanel(proModal))

// ── Sprint 7 Feature C: 입력 실시간 검증 이벤트 ────────────

function attachInputValidation(): void {
  inputWork.addEventListener('input', () => validateInput({ min: 5, max: 300, errorEl: errWork, inputEl: inputWork }))
  inputRest.addEventListener('input', () => validateInput({ min: 3, max: 180, errorEl: errRest, inputEl: inputRest }))
  inputRounds.addEventListener('input', () => validateRoundsInput())
}

// 설정 적용 (Pro: 커스텀 인터벌)
btnApplyConfig.addEventListener('click', () => {
  if (!premium.isPro()) { openPanel(proModal, btnApplyConfig); return }
  // Sprint 7 Feature C: 적용 전 입력값 검증
  const workValid   = validateInput({ min: 5,  max: 300, errorEl: errWork,   inputEl: inputWork })
  const restValid   = validateInput({ min: 3,  max: 180, errorEl: errRest,   inputEl: inputRest })
  const roundsValid = validateRoundsInput()
  if (!workValid || !restValid || !roundsValid) return
  const config: TimerConfig = {
    workDuration: Math.max(5, Math.min(300, Number(inputWork.value) || 20)),
    restDuration: Math.max(3, Math.min(180, Number(inputRest.value) || 10)),
    totalRounds: Math.max(1, Math.min(99, Number(inputRounds.value) || 8)),
    countdownDuration: 3,
    warmupDuration: toggleWarmup.checked ? 60 : 0,
    cooldownDuration: toggleCooldown.checked ? 60 : 0,
  }
  timer.reset()
  timer.updateConfig(config)
  roundLabel.textContent = `0 / ${config.totalRounds}`
  renderRoundDots(0, config.totalRounds)
  btnStart.textContent = '시작'
  // 인터벌 설정 표시 업데이트 (Sprint 4 Feature A)
  updateIntervalDisplay(config.workDuration, config.restDuration)
  // 설정 저장 (Feature C + Sprint 6 Feature C)
  saveSettings({
    workDuration: config.workDuration,
    restDuration: config.restDuration,
    totalRounds: config.totalRounds,
    warmupEnabled: toggleWarmup.checked,
    cooldownEnabled: toggleCooldown.checked,
  })
  // Sprint 7 Feature D: 커스텀 설정 적용 시 프리셋 active 해제
  activePresetId = null
  renderPresets()
  closePanel(settingsPanel)
  scrollToTop()
})

// ── 프리셋 렌더링 (Pro) ───────────────────────────────────

function renderPresets(): void {
  const freeId = 'tabata-classic'
  presetGrid.innerHTML = PRESETS.map(p => {
    const locked = !premium.isPro() && p.id !== freeId
    // Feature A: 총 소요 시간 배지
    const totalSecs = (p.config.workDuration + p.config.restDuration) * p.config.totalRounds + p.config.countdownDuration
    const totalBadge = formatDuration(totalSecs)
    const isActive = p.id === activePresetId
    return `
    <button class="preset-btn${isActive ? ' active' : ''}"
            data-id="${p.id}"
            ${locked ? 'data-locked="true"' : ''}
            title="${p.description}">
      <div class="preset-header">
        <span class="preset-emoji">${p.emoji}</span>
        <span class="preset-name">${p.name}</span>
        ${locked ? '<span class="lock-icon">🔒</span>' : ''}
      </div>
      <span class="preset-description">${p.description}</span>
      ${p.id !== 'custom' ? `<span class="preset-duration">총 ${totalBadge}</span>` : ''}
    </button>`
  }).join('')

  presetGrid.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset['locked']) { openPanel(proModal, btn); return }
      const preset = PRESETS.find(p => p.id === btn.dataset['id'])
      if (!preset) return

      // 커스텀: 설정 섹션으로 스크롤 이동
      if (preset.id === 'custom') {
        document.querySelector('.section:has(#btn-apply-config)')?.scrollIntoView({ behavior: 'smooth' })
        return
      }

      timer.reset()
      timer.updateConfig(preset.config)
      inputWork.value   = String(preset.config.workDuration)
      inputRest.value   = String(preset.config.restDuration)
      inputRounds.value = String(preset.config.totalRounds)
      roundLabel.textContent = `0 / ${preset.config.totalRounds}`
      renderRoundDots(0, preset.config.totalRounds)
      btnStart.textContent = '시작'
      // 인터벌 설정 표시 업데이트 (Sprint 4 Feature A)
      updateIntervalDisplay(preset.config.workDuration, preset.config.restDuration)
      // 설정 저장 (Feature C)
      saveSettings({ workDuration: preset.config.workDuration, restDuration: preset.config.restDuration, totalRounds: preset.config.totalRounds })
      // Sprint 7 Feature D: 활성 프리셋 표시
      activePresetId = preset.id
      renderPresets()
      closePanel(settingsPanel)
      scrollToTop()
    })
  })
}

// ── 주간 목표 (Sprint 6 Feature D) ───────────────────────

const GOAL_RING_CIRCUMFERENCE = 2 * Math.PI * 14  // r=14

function renderWeeklyGoal(): void {
  const goal = storage.getWeeklyGoal()
  const stats = storage.getStats()
  const thisWeek = stats.thisWeek

  // 목표 버튼 활성화 상태 업데이트 + 클릭 핸들러 연결 (Sprint 6 Feature D 버그 수정)
  weeklyGoalCard.querySelectorAll<HTMLButtonElement>('.goal-btn').forEach(btn => {
    const btnGoal = Number(btn.dataset['goal']) as 3 | 4 | 5
    btn.classList.toggle('active', goal !== null && btnGoal === goal)
    // 클릭 시 목표 저장 → 재렌더
    btn.onclick = () => {
      const current = storage.getWeeklyGoal()
      // 이미 선택된 버튼 탭 시 목표 해제 (토글)
      storage.setWeeklyGoal(current === btnGoal ? null : btnGoal)
      renderWeeklyGoal()
    }
  })

  if (goal === null) {
    weeklyGoalProgress.style.display = 'none'
    return
  }

  weeklyGoalProgress.style.display = 'flex'
  const completed = Math.min(thisWeek, goal)
  const achieved = completed >= goal

  // 링 채우기
  const pct = goal > 0 ? completed / goal : 0
  goalRingFill.style.strokeDasharray = String(GOAL_RING_CIRCUMFERENCE)
  goalRingFill.style.strokeDashoffset = String(GOAL_RING_CIRCUMFERENCE * (1 - pct))
  goalRingFill.classList.toggle('achieved', achieved)

  weeklyGoalCount.textContent = `이번 주 ${completed}/${goal}`

  let message = ''
  if (achieved) {
    message = '🎉 목표 달성!'
  } else {
    const remaining = goal - completed
    message = remaining === 1 ? '한 번만 더!' : `${remaining}회 남았어요`
  }
  weeklyGoalMessage.textContent = message
}

// ── 기록 렌더링 ───────────────────────────────────────────

function renderHistoryDeleteArea(): void {
  const history = storage.getHistory()
  if (history.length === 0) {
    historyDeleteArea.innerHTML = ''
    return
  }
  historyDeleteArea.innerHTML = `
    <button class="btn-history-delete" id="btn-history-delete">기록 삭제</button>
  `
  const btnDelete = document.getElementById('btn-history-delete') as HTMLButtonElement | null
  if (!btnDelete) return
  btnDelete.addEventListener('click', () => {
    historyDeleteArea.innerHTML = `
      <div class="history-delete-confirm">
        <span class="history-delete-warning">정말 삭제하시겠습니까?</span>
        <div class="history-delete-actions">
          <button class="btn-delete-confirm" id="btn-delete-confirm">확인</button>
          <button class="btn-delete-cancel" id="btn-delete-cancel">취소</button>
        </div>
      </div>
    `
    const btnConfirm = document.getElementById('btn-delete-confirm') as HTMLButtonElement | null
    const btnCancel  = document.getElementById('btn-delete-cancel')  as HTMLButtonElement | null
    btnConfirm?.addEventListener('click', () => {
      storage.clearHistory()
      renderHistory()
    })
    btnCancel?.addEventListener('click', () => {
      renderHistoryDeleteArea()
    })
  })
}

function renderHistory(): void {
  const stats = storage.getStats()
  statsTotal.textContent  = String(stats.total)
  statsWeek.textContent   = String(stats.thisWeek)
  statsStreak.textContent = String(stats.streak)

  const history = storage.getHistory().slice(0, 20)
  historyList.innerHTML = history.length === 0
    ? '<p class="empty-history">아직 완료한 운동이 없습니다.</p>'
    : history.map(r => {
        const date = new Date(r.date)
        const mins = Math.floor(r.durationSeconds / 60)
        const secs = r.durationSeconds % 60
        return `
          <div class="history-item">
            <span class="history-date">${date.toLocaleDateString('ko-KR')}</span>
            <span class="history-detail">${r.workDuration}/${r.restDuration}초 × ${r.rounds}라운드</span>
            <span class="history-duration">${mins}:${String(secs).padStart(2, '0')}</span>
          </div>`
      }).join('')
  renderHistoryDeleteArea()
  renderWeeklyGoal()
}

// ── Pro 배지 표시 ─────────────────────────────────────────

function updateProUI(): void {
  const isPro = premium.isPro()
  document.querySelectorAll('.pro-badge').forEach(el => {
    (el as HTMLElement).style.display = isPro ? 'none' : 'inline'
  })
  if (isPro) {
    document.querySelectorAll<HTMLElement>('[data-locked]').forEach(el => {
      el.removeAttribute('data-locked')
      el.querySelector('.lock-icon')?.remove()
    })
  }
}

// ── Sprint 9 Feature A: PWA 설치 배너 ────────────────────

const PWA_DISMISS_KEY = 'tabatago_install_dismissed'

// beforeinstallprompt 이벤트를 미리 저장해 두었다가 적절한 시점에 표시
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault()
  deferredInstallPrompt = e as BeforeInstallPromptEvent
})

window.addEventListener('appinstalled', () => {
  hidePwaInstallBanner()
  deferredInstallPrompt = null
})

function isPwaInstallDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function markPwaInstallDismissed(): void {
  try {
    localStorage.setItem(PWA_DISMISS_KEY, '1')
  } catch {
    // localStorage 미지원 환경 무시
  }
}

function showPwaInstallBanner(): void {
  if (!deferredInstallPrompt) return
  if (isPwaInstallDismissed()) return
  pwaInstallBanner.style.display = 'flex'
}

function hidePwaInstallBanner(): void {
  pwaInstallBanner.style.display = 'none'
}

btnPwaInstall.addEventListener('click', () => {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt.prompt()
  deferredInstallPrompt.userChoice.then(() => {
    hidePwaInstallBanner()
    deferredInstallPrompt = null
  }).catch(() => {})
})

btnPwaDismiss.addEventListener('click', () => {
  markPwaInstallDismissed()
  hidePwaInstallBanner()
})

// ── 오버레이 클릭으로 패널/모달 닫기 ────────────────────
document.getElementById('panel-overlay')?.addEventListener('click', () => {
  closePanel(settingsPanel)
  closePanel(historyPanel)
  closePanel(proModal)
})

// ── Sprint 9 Feature B: Pro 모달 "평가판으로 계속 사용" 링크 ──

btnContinueFree.addEventListener('click', (e: MouseEvent) => {
  e.preventDefault()
  proModal.classList.remove('open')
})

// ── 초기화 ───────────────────────────────────────────────

function init(): void {
  // 초기 원형 프로그레스 설정
  timerCircle.style.strokeDasharray = String(CIRCLE_CIRCUMFERENCE)
  timerCircle.style.strokeDashoffset = String(0)
  setCircleOffset(1, 1)

  // Feature C: 저장된 설정 불러오기
  const saved = loadSettings()
  if (saved && premium.isPro()) {
    const warmupOn   = saved.warmupEnabled   === true
    const cooldownOn = saved.cooldownEnabled === true
    const config: TimerConfig = {
      workDuration:     saved.workDuration,
      restDuration:     saved.restDuration,
      totalRounds:      saved.totalRounds,
      countdownDuration: 3,
      warmupDuration:   warmupOn   ? 60 : 0,
      cooldownDuration: cooldownOn ? 60 : 0,
    }
    timer.updateConfig(config)
    // 토글 체크박스 상태 복원 (Sprint 6 Feature C 버그 수정)
    toggleWarmup.checked   = warmupOn
    toggleCooldown.checked = cooldownOn
  }

  // 초기값 표시
  const cfg = timer.getState().config
  timerNumber.textContent = String(cfg.workDuration)
  roundLabel.textContent  = `0 / ${cfg.totalRounds}`
  inputWork.value   = String(cfg.workDuration)
  inputRest.value   = String(cfg.restDuration)
  inputRounds.value = String(cfg.totalRounds)
  renderRoundDots(0, cfg.totalRounds)
  // 인터벌 설정 표시 (Sprint 4 Feature A)
  updateIntervalDisplay(cfg.workDuration, cfg.restDuration)
  // 초기 ARIA SVG 레이블 (Sprint 4 Feature E)
  updateSvgAriaLabel('idle', cfg.workDuration, 0, cfg.totalRounds)

  // 초기 볼륨 버튼 상태
  const vol = audio.getVolume()
  btnVoice.textContent = VOLUME_ICONS[vol]
  btnVoice.title = VOLUME_TITLES[vol]
  btnVoice.classList.toggle('active', vol > 0)

  renderPresets()
  updateProUI()

  // Sprint 7 Feature C: 입력 실시간 검증
  attachInputValidation()

  // 미니멀리스트 모드 초기화 (Sprint 5)
  applyMinimalistMode(loadMinimalistMode())
  toggleMinimalist.addEventListener('change', () => {
    const enabled = toggleMinimalist.checked
    applyMinimalistMode(enabled)
    saveMinimalistMode(enabled)
  })

  // 스와이프로 패널 닫기 (Sprint 3 Feature E)
  addSwipeToClose(settingsPanel)
  addSwipeToClose(historyPanel)

  // 온보딩 툴팁 (Sprint 3 Feature F)
  showOnboardingTooltip()

  // 시작 버튼 클릭 시 온보딩 툴팁 즉시 해제
  btnStart.addEventListener('click', dismissOnboardingTooltip, { once: true })

  // Sprint 9 Feature E: 앱 버전 표시
  appVersionLabel.textContent = APP_VERSION
}

// Sprint 9 Feature D: 에러 바운더리 — init()를 try/catch로 래핑
try {
  init()
} catch (err) {
  console.error('[TabataGo] 초기화 오류:', err)
  // 앱 콘텐츠 숨기고 에러 폴백 표시
  document.querySelector<HTMLElement>('.header')?.style.setProperty('display', 'none')
  document.querySelector<HTMLElement>('.timer-container')?.style.setProperty('display', 'none')
  document.querySelector<HTMLElement>('#overall-progress')?.style.setProperty('display', 'none')
  errorBoundary.style.display = 'flex'
}
