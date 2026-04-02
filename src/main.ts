// 📄 src/main.ts — 앱 초기화 및 UI 바인딩

import { TabataTimer, DEFAULT_CONFIG, type Phase, type TimerConfig } from './timer'
import { AudioManager, type VolumeLevel } from './audio'
import { SpeechManager } from './speech'
import { WorkoutStorage } from './storage'
import { PRESETS } from './presets'
import { APP_VERSION } from './version'
import { t, initI18n, setLanguage, getCurrentLang, DATE_LOCALE, type Lang } from './i18n'
import { analytics } from './analytics'

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
const presetGrid        = $('#preset-grid')
const inputWork         = $<HTMLInputElement>('#input-work')
const inputRest         = $<HTMLInputElement>('#input-rest')
const inputRounds       = $<HTMLInputElement>('#input-rounds')
const btnApplyConfig    = $<HTMLButtonElement>('#btn-apply-config')
const btnVoice          = $<HTMLButtonElement>('#btn-voice')
const statsTotal        = $('#stats-total')
const statsWeek         = $('#stats-week')
const statsStreak       = $('#stats-streak')
const statsTotalMin     = $('#stats-total-min')
const statsAvgMin       = $('#stats-avg-min')
const statsBestStreak   = $('#stats-best-streak')
const elapsedLabel      = $('#elapsed-label')
const summaryCard       = $('#summary-card')
const overallProgressFill = $<HTMLDivElement>('#overall-progress-fill')
const nextPhaseLabel    = $('#next-phase-label')
const onboardingTooltip = $('#onboarding-tooltip')
const intervalDisplay   = $('#interval-display')
const progressRingSvg   = $('#progress-ring-svg')
const historyDeleteArea = $('#history-delete-area')
const heatmapEl         = $('#heatmap')
const toggleMinimalist  = $<HTMLInputElement>('#toggle-minimalist')
const toggleTheme       = $<HTMLInputElement>('#toggle-theme')
const selectLanguage    = $<HTMLSelectElement>('#select-language')
const estimatedTimeEl   = $('#estimated-time')
const pauseOverlay      = $('#pause-overlay')
const btnSkipRest       = $<HTMLButtonElement>('#btn-skip-rest')
const pauseInfo         = $('#pause-info')
const welcomeModal      = $('#welcome-modal')
const customPresetList  = $('#custom-preset-list')
const toggleWarmup      = $<HTMLInputElement>('#toggle-warmup')
const toggleCooldown    = $<HTMLInputElement>('#toggle-cooldown')
const errWork           = $('#err-work')
const errRest           = $('#err-rest')
const errRounds         = $('#err-rounds')
const toastEl           = $('#toast')
// Sprint 9
const pwaInstallBanner  = $('#pwa-install-banner')
const btnPwaInstall     = $<HTMLButtonElement>('#btn-pwa-install')
const btnPwaDismiss     = $<HTMLButtonElement>('#btn-pwa-dismiss')
const appVersionLabel   = $('#app-version-label')
const errorBoundary     = $('#error-boundary')

// ── 서비스 인스턴스 ───────────────────────────────────────

const timer    = new TabataTimer(DEFAULT_CONFIG)
const audio    = new AudioManager()
const speech   = new SpeechManager()
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

// ── 라이트/다크 테마 (Sprint 14) ──────────────────────────

const THEME_KEY = 'tabata_theme'

function loadLightTheme(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved !== null) return saved === 'light'
    // 저장값 없으면 시스템 설정 따르기
    return window.matchMedia('(prefers-color-scheme: light)').matches
  } catch {
    return false
  }
}

function saveLightTheme(light: boolean): void {
  try {
    localStorage.setItem(THEME_KEY, light ? 'light' : 'dark')
  } catch { /* ignore */ }
}

function applyTheme(light: boolean): void {
  document.documentElement.classList.toggle('light-theme', light)
  toggleTheme.checked = light
  const themeColor = light ? '#f5f5f7' : '#FF4D4D'
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor)
}

// ── 상태 ─────────────────────────────────────────────────

let voiceEnabled = false
let workoutStartTime: Date | null = null
let activePresetId: string | null = null
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 54  // r=54

// ── 인터벌 설정 표시 (Sprint 4 Feature A) ─────────────────
function updateIntervalDisplay(workDuration: number, restDuration: number): void {
  const presetName = activePresetId ? t(`preset.${activePresetId}.name`) : ''
  const interval = t('misc.intervalDisplay', { w: workDuration, r: restDuration })
  intervalDisplay.textContent = presetName ? `${presetName} · ${interval}` : interval
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
    spec.errorEl.textContent = t('validation.minSec', { n: spec.min })
    return false
  }
  if (val > spec.max) {
    spec.inputEl.classList.add('input-invalid')
    spec.errorEl.textContent = t('validation.maxSec', { n: spec.max })
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
    errRounds.textContent = t('validation.minRound')
    return false
  }
  if (val > 99) {
    inputRounds.classList.add('input-invalid')
    errRounds.textContent = t('validation.maxRound')
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
  const phaseName = t(`aria.phase.${phase}`)
  const label = phase === 'idle' || phase === 'complete'
    ? t('aria.timerLabel', { p: phaseName })
    : t('aria.timerLabelWithTime', { p: phaseName, t: timeRemaining, r: round, total: totalRounds })
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
    text = config.warmupDuration > 0
      ? t('next.warmup', { d: config.warmupDuration })
      : t('next.work', { d: config.workDuration })
  } else if (phase === 'warmup') {
    text = t('next.work', { d: config.workDuration })
  } else if (phase === 'work') {
    text = t('next.rest', { d: config.restDuration })
  } else if (phase === 'rest') {
    if (round < config.totalRounds) {
      text = t('next.work', { d: config.workDuration })
    } else if (config.cooldownDuration > 0) {
      text = t('next.cooldown', { d: config.cooldownDuration })
    } else {
      text = t('next.complete')
    }
  } else if (phase === 'cooldown') {
    text = t('next.complete')
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
    elapsedLabel.textContent = t('misc.elapsed', { t: formatDuration(seconds) })
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

function generateShareCard(rounds: number, durationSeconds: number, workDuration: number, restDuration: number, streak: number): HTMLCanvasElement {
  const W = 600, H = 400
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background
  const isLight = document.documentElement.classList.contains('light-theme')
  ctx.fillStyle = isLight ? '#f5f5f7' : '#1a1a2e'
  ctx.fillRect(0, 0, W, H)

  // Accent bar top
  ctx.fillStyle = '#FF4D4D'
  ctx.fillRect(0, 0, W, 4)

  // Title
  ctx.fillStyle = isLight ? '#1d1d1f' : '#e0e0e0'
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(t('summary.title'), W / 2, 55)

  // Streak badge
  if (streak >= 3) {
    ctx.fillStyle = '#FF4D4D'
    ctx.font = '18px system-ui'
    ctx.fillText(t('misc.streakBadge', { n: streak }), W / 2, 85)
  }

  // Progress ring
  const cx = W / 2, cy = 185, r = 65
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = isLight ? '#e5e5ea' : '#0f3460'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2)
  ctx.strokeStyle = '#51CF66'
  ctx.lineWidth = 8
  ctx.stroke()

  // Emoji in ring
  ctx.fillStyle = isLight ? '#1d1d1f' : '#e0e0e0'
  ctx.font = '36px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('🎉', cx, cy + 12)

  // Stats row
  const stats = [
    { val: String(rounds), label: t('summary.rounds') },
    { val: formatDuration(durationSeconds), label: t('summary.duration') },
    { val: `${workDuration}s`, label: t('summary.perRound') },
  ]
  stats.forEach((s, i) => {
    const sx = 100 + i * 200
    const sy = 290
    ctx.fillStyle = isLight ? '#e5e5ea' : '#0f3460'
    roundRect(ctx, sx - 70, sy - 20, 140, 60, 10)
    ctx.fill()
    ctx.fillStyle = '#51CF66'
    ctx.font = 'bold 20px system-ui'
    ctx.fillText(s.val, sx, sy + 5)
    ctx.fillStyle = isLight ? '#6e6e73' : '#888'
    ctx.font = '12px system-ui'
    ctx.fillText(s.label, sx, sy + 28)
  })

  // Interval info
  ctx.fillStyle = isLight ? '#6e6e73' : '#888'
  ctx.font = '14px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(t('misc.intervalDisplay', { w: workDuration, r: restDuration }), W / 2, 115)

  // Branding
  ctx.fillStyle = '#FF4D4D'
  ctx.font = 'bold 16px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('MyTabata', 20, H - 15)
  ctx.fillStyle = isLight ? '#6e6e73' : '#666'
  ctx.font = '13px system-ui'
  ctx.textAlign = 'right'
  ctx.fillText('tabata.my', W - 20, H - 15)

  return canvas
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function shareWorkout(rounds: number, durationSeconds: number, workDuration: number, restDuration: number, streak: number): Promise<void> {
  const interval = t('misc.intervalDisplay', { w: workDuration, r: restDuration })
  const text = t('share.text', { interval, rounds, duration: formatDuration(durationSeconds) })
  const canvas = generateShareCard(rounds, durationSeconds, workDuration, restDuration, streak)

  // Try sharing with image first
  if (typeof navigator.share === 'function') {
    try {
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'))
      const file = new File([blob], 'mytabata-workout.png', { type: 'image/png' })
      await navigator.share({ title: t('share.title'), text, files: [file] })
      analytics.share('native_share_image')
      return
    } catch {
      // files sharing not supported, fallback to text
      try {
        await navigator.share({ title: t('share.title'), text })
        analytics.share('native_share')
        return
      } catch { /* user cancelled */ }
    }
  }

  // Fallback: copy text + download image
  try {
    await navigator.clipboard.writeText(text)
    showToast(t('misc.copied'))
    analytics.share('clipboard')
  } catch { /* ignore */ }
}

function showSummaryCard(rounds: number, durationSeconds: number, workDuration: number, restDuration: number, streak: number): void {
  stopCircleAnimation()
  elapsedLabel.style.display = 'none'
  timerNumber.style.display = 'none'
  phaseLabel.style.display = 'none'
  roundLabel.style.display = 'none'
  intervalDisplay.style.display = 'none'

  const streakBadge = streak >= 3
    ? `<div class="summary-badge">${t('misc.streakBadge', { n: streak })}</div>`
    : ''
  summaryCard.innerHTML = `
    <div class="summary-emoji">🎉</div>
    <div class="summary-title">${t('summary.title')}</div>
    ${streakBadge}
    <div class="summary-stats">
      <div class="summary-stat">
        <span class="summary-stat-value">${rounds}</span>
        <span class="summary-stat-label">${t('summary.rounds')}</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${formatDuration(durationSeconds)}</span>
        <span class="summary-stat-label">${t('summary.duration')}</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">${workDuration}s</span>
        <span class="summary-stat-label">${t('summary.perRound')}</span>
      </div>
      <div class="summary-stat">
        <span class="summary-stat-value">~${Math.round(durationSeconds / 60 * 8)}</span>
        <span class="summary-stat-label">${t('summary.calories')}</span>
      </div>
    </div>
    <div class="summary-actions">
      <button class="btn-share" id="btn-share-workout" aria-label="${t('btn.share')}">${t('btn.share')}</button>
      <button class="btn-repeat" id="btn-repeat-workout">${t('btn.repeat')}</button>
    </div>
    ${getNextPresetSuggestion()}
  `
  summaryCard.classList.add('visible')

  // Feature B: 공유 버튼 이벤트
  const btnShare = document.getElementById('btn-share-workout') as HTMLButtonElement | null
  btnShare?.addEventListener('click', () => { shareWorkout(rounds, durationSeconds, workDuration, restDuration, streak).catch(() => {}) })

  // "한 번 더" — 같은 설정으로 즉시 재시작
  const btnRepeat = document.getElementById('btn-repeat-workout') as HTMLButtonElement | null
  btnRepeat?.addEventListener('click', () => {
    hideSummaryCard()
    timer.reset()
    timer.start()
    acquireWakeLock()
    audio.ensureContext()
    analytics.workoutStart(activePresetId ?? 'manual', timer.getState().config.totalRounds)
  })

  // 추천 프리셋 클릭
  const btnSuggestion = document.getElementById('btn-next-preset') as HTMLButtonElement | null
  btnSuggestion?.addEventListener('click', () => {
    const presetId = btnSuggestion.dataset['id']
    const preset = PRESETS.find(p => p.id === presetId)
    if (!preset) return
    hideSummaryCard()
    timer.reset()
    timer.updateConfig(preset.config)
    inputWork.value = String(preset.config.workDuration)
    inputRest.value = String(preset.config.restDuration)
    inputRounds.value = String(preset.config.totalRounds)
    roundLabel.textContent = `0 / ${preset.config.totalRounds}`
    renderRoundDots(0, preset.config.totalRounds)
    updateIntervalDisplay(preset.config.workDuration, preset.config.restDuration)
    activePresetId = preset.id
    btnStart.textContent = t('btn.start')
    updateEstimatedTime()
  })
}

function getNextPresetSuggestion(): string {
  const others = PRESETS.filter(p => p.id !== activePresetId)
  if (others.length === 0) return ''
  const pick = others[Math.floor(Math.random() * others.length)]!
  return `
    <button class="btn-next-preset" id="btn-next-preset" data-id="${pick.id}">
      ${pick.emoji} ${t('summary.tryNext')} ${t(`preset.${pick.id}.name`)}
    </button>`
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
    showPauseOverlay(true)
      btnStart.textContent = t('btn.resume')
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

function updateTabTitle(phase: Phase, timeRemaining: number): void {
  switch (phase) {
    case 'warmup':    document.title = t('tab.warmup',    { t: timeRemaining }); break
    case 'work':      document.title = t('tab.work',      { t: timeRemaining }); break
    case 'rest':      document.title = t('tab.rest',      { t: timeRemaining }); break
    case 'cooldown':  document.title = t('tab.cooldown',  { t: timeRemaining }); break
    case 'countdown': document.title = t('tab.countdown', { t: timeRemaining }); break
    case 'complete':  document.title = t('tab.complete');  break
    default:          document.title = t('tab.default');   break
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
      hideKeyboardHelp()
      break
    case '?':
      toggleKeyboardHelp()
      break
  }
})

// ── 운동 중 페이지 이탈 방지 (Sprint 25) ──────────────

window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
  const state = timer.getState()
  if (state.isRunning || (state.phase !== 'idle' && state.phase !== 'complete')) {
    e.preventDefault()
  }
})

// ── 키보드 단축키 도움말 (Sprint 21) ────────────────────

function toggleKeyboardHelp(): void {
  let overlay = document.getElementById('keyboard-help')
  if (overlay) {
    overlay.remove()
    return
  }
  overlay = document.createElement('div')
  overlay.id = 'keyboard-help'
  overlay.className = 'keyboard-help-overlay'
  overlay.innerHTML = `
    <div class="keyboard-help">
      <h3>${t('keyboard.title')}</h3>
      <div class="keyboard-row"><kbd>Space</kbd> ${t('keyboard.startPause')}</div>
      <div class="keyboard-row"><kbd>R</kbd> ${t('keyboard.reset')}</div>
      <div class="keyboard-row"><kbd>Esc</kbd> ${t('keyboard.closePanel')}</div>
      <div class="keyboard-row"><kbd>?</kbd> ${t('keyboard.help')}</div>
    </div>
  `
  overlay.addEventListener('click', () => { overlay!.remove(); if (history.state?.overlay) history.back() })
  document.body.appendChild(overlay)
  history.pushState({ overlay: true }, '')
}

function hideKeyboardHelp(): void {
  document.getElementById('keyboard-help')?.remove()
}

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

function showPauseOverlay(show: boolean): void {
  if (show) {
    const state = timer.getState()
    const phaseName = t(`phase.${state.phase}`)
    pauseInfo.textContent = `${phaseName} · ${state.currentRound}/${state.config.totalRounds} · ${state.timeRemaining}s`
    pauseOverlay.style.display = 'flex'
  } else {
    pauseOverlay.style.display = 'none'
  }
}

// ── Sprint 8 Feature E: CSS 컨페티 버스트 ───────────────

function triggerConfetti(): void {
  const colors = ['#FF4D4D', '#4DABF7', '#51CF66', '#FFC107', '#A78BFA', '#FF6B9D']
  const burst = document.createElement('div')
  burst.className = 'confetti-burst'
  for (let i = 0; i < 20; i++) {
    const span = document.createElement('span')
    span.style.setProperty('--color', colors[i % colors.length]!)
    span.style.setProperty('--delay', `${Math.random() * 0.3}s`)
    span.style.setProperty('--size', `${4 + Math.random() * 6}px`)
    span.style.setProperty('--i', String(i))
    burst.appendChild(span)
  }
  document.body.appendChild(burst)
  setTimeout(() => burst.remove(), 2500)
}

// ── 페이즈 전환 펄스 애니메이션 ─────────────────────────

const circleWrapper = document.querySelector<HTMLElement>('.circle-wrapper')!

function triggerRingPulse(): void {
  timerCircle.classList.remove('ring-pulse')
  circleWrapper.classList.remove('glow')
  void (timerCircle as unknown as HTMLElement & { offsetWidth: number }).offsetWidth
  timerCircle.classList.add('ring-pulse')
  circleWrapper.classList.add('glow')
  timerCircle.addEventListener('animationend', () => {
    timerCircle.classList.remove('ring-pulse')
  }, { once: true })
  circleWrapper.addEventListener('animationend', () => {
    circleWrapper.classList.remove('glow')
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
      idle:      { label: t('phase.idle'),     color: 'var(--color-idle)' },
      countdown: { label: t('phase.countdown'), color: 'var(--color-countdown)' },
      warmup:    { label: t('phase.warmup'),   color: 'var(--color-warmup)' },
      work:      { label: t('phase.work'),     color: 'var(--color-work)' },
      rest:      { label: t('phase.rest'),     color: 'var(--color-rest)' },
      cooldown:  { label: t('phase.cooldown'), color: 'var(--color-warmup)' },
      complete:  { label: t('phase.complete'), color: 'var(--color-complete)' },
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
    showPauseOverlay(false)

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

    // 휴식 스킵 버튼 (Sprint 30)
    if (phase === 'rest') {
      btnSkipRest.textContent = t('btn.skipRest')
      btnSkipRest.style.display = 'block'
    } else {
      btnSkipRest.style.display = 'none'
    }

    // 음성 안내
    if (voiceEnabled) {
      if (phase === 'work') {
        if (round === state.config.totalRounds) speech.lastRound()
        else speech.workStart(round, state.config.totalRounds)
      }
      if (phase === 'rest') speech.restStart()
    }

    // 반환점 알림 (전체 라운드의 절반)
    if (phase === 'work' && state.config.totalRounds >= 4) {
      const halfRound = Math.ceil(state.config.totalRounds / 2) + 1
      if (round === halfRound) showToast(t('misc.halfway'))
    }

    // 운동 시작 시간 기록 + 경과 타이머 시작 (워밍업 있으면 워밍업 시작 시 기록)
    if ((phase === 'warmup') || (phase === 'work' && round === 1 && !timer.hasWarmup())) {
      workoutStartTime = new Date()
      startElapsedTimer()
    }

    // 버튼 상태
    btnStart.textContent = phase === 'complete' ? t('btn.restart') : t('btn.pause')
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

    // 마지막 3초 시각적 강조 (work/rest)
    if ((phase === 'work' || phase === 'rest') && timeRemaining <= 3 && timeRemaining > 0) {
      timerNumber.classList.add('countdown-warn')
      audio.countdown(timeRemaining)
    } else {
      timerNumber.classList.remove('countdown-warn')
    }

    // 카운트다운 틱음
    if (phase === 'countdown') {
      audio.countdown(timeRemaining)
      if (voiceEnabled) speech.countdown(timeRemaining)
    }
  }

  if (event.type === 'COMPLETE') {
    audio.complete()
    if (voiceEnabled) speech.complete()
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

    // PR 체크를 위해 저장 전 기존 기록 확인
    const prevStats = storage.getStats()

    // 운동 기록 저장
    if (workoutStartTime) {
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
    const stats = storage.getStats()
    showSummaryCard(config.totalRounds, durationSeconds, config.workDuration, config.restDuration, stats.streak)
    analytics.workoutComplete(config.totalRounds, durationSeconds, config.workDuration, config.restDuration)

    // PR 갱신 알림
    if (prevStats.total > 0) {
      if (durationSeconds > prevStats.totalMinutes * 60 / prevStats.total * 1.5) {
        setTimeout(() => showToast(t('pr.longestSession')), 1500)
      }
      if (stats.streak > prevStats.bestStreak && stats.streak >= 3) {
        setTimeout(() => showToast(t('pr.bestStreak', { n: stats.streak })), 1500)
      }
    }

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
      showToast(t('misc.skipCountdown'))
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

// ── 타이머 원형 영역 터치로 pause/resume (VOC) ──────────
circleWrapper.addEventListener('click', (e: MouseEvent) => {
  // 내부 요소(summary card 버튼 등) 클릭 시 무시
  if ((e.target as HTMLElement).closest('button, a')) return
  const state = timer.getState()
  // 운동 중이거나 일시정지 중일 때만 반응
  if (state.phase === 'idle' || state.phase === 'complete' || state.phase === 'countdown') return
  if (state.isRunning) {
    timer.pause()
    stopCircleAnimation()
    setRingPaused(true)
    showPauseOverlay(true)
    btnStart.textContent = t('btn.resume')
    releaseWakeLock()
  } else {
    timer.resume()
    setRingPaused(false)
    showPauseOverlay(false)
    const s = timer.getState()
    startCircleAnimation(s.timeRemaining, getPhaseDuration(s.config, s.phase))
    btnStart.textContent = t('btn.pause')
    acquireWakeLock()
  }
})

btnStart.addEventListener('click', () => {
  // 롱프레스로 이미 처리된 경우 click 이벤트 무시
  if (longPressActivated) {
    longPressActivated = false
    return
  }
  // iOS Safari: 유저 제스처 시 AudioContext 미리 활성화
  audio.ensureContext()
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
    analytics.workoutStart(activePresetId ?? 'manual', timer.getState().config.totalRounds)
  } else if (state.isRunning) {
    timer.pause()
    stopCircleAnimation()
    // Sprint 8 Feature B: 일시정지 시 링 점선 인디케이터
    setRingPaused(true)
    showPauseOverlay(true)
    btnStart.textContent = t('btn.resume')
    releaseWakeLock()
  } else {
    timer.resume()
    // Sprint 8 Feature B: 재개 시 링 인디케이터 해제
    setRingPaused(false)
    showPauseOverlay(false)
    const s = timer.getState()
    startCircleAnimation(s.timeRemaining, getPhaseDuration(s.config, s.phase))
    btnStart.textContent = t('btn.pause')
    acquireWakeLock()
  }
})

btnSkipRest.addEventListener('click', () => {
  timer.skipRest()
  triggerHaptic(50)
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
    showPauseOverlay(false)
  setRestMode(false)
  setBodyTint('idle')
  resetOverallProgress()
  nextPhaseLabel.style.display = 'none'
  const cfg = timer.getState().config
  timerNumber.textContent = String(cfg.workDuration)
  phaseLabel.textContent = t('phase.idle')
  // BUG-03 fix: roundLabel and renderRoundDots are already set by the PHASE_CHANGE 'idle' handler
  btnStart.textContent = t('btn.start')
  document.documentElement.style.setProperty('--phase-color', 'var(--color-idle)')
  setCircleOffset(1, 1)
  document.title = t('tab.default')
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
  panel.scrollTop = 0
  panel.classList.add('open')
  history.pushState({ panel: panel.id }, '')
  const existing = panelTrapCleanups.get(panel)
  if (existing) existing()
  panelTrapCleanups.set(panel, trapFocus(panel, trigger))
}

function closePanel(panel: HTMLElement, skipHistory = false): void {
  if (!panel.classList.contains('open')) return
  panel.classList.remove('open')
  const cleanup = panelTrapCleanups.get(panel)
  if (cleanup) { cleanup(); panelTrapCleanups.delete(panel) }
  // popstate에서 호출 시 history.back() 중복 방지
  if (!skipHistory && history.state?.panel === panel.id) {
    history.back()
  }
}

// ── 뒤로가기 전체 처리 (Android TWA) ────────────────────
window.addEventListener('popstate', () => {
  // 0. 웰컴 모달 열림 → 뒤로가기 무시 (닫으면 안 됨)
  if (welcomeModal.style.display === 'flex') {
    history.pushState({ welcome: true }, '')
    return
  }

  // 1. 키보드 도움말 열림 → 닫기
  const kbHelp = document.getElementById('keyboard-help')
  if (kbHelp) {
    kbHelp.remove()
    return
  }

  // 2. 패널 열림 → 닫기
  if (settingsPanel.classList.contains('open')) {
    closePanel(settingsPanel, true)
    scrollToTop()
    return
  }
  if (historyPanel.classList.contains('open')) {
    closePanel(historyPanel, true)
    scrollToTop()
    return
  }

  // 3. 완료 카드 표시 중 → 카드 닫고 idle로
  if (summaryCard.classList.contains('visible')) {
    hideSummaryCard()
    timer.reset()
    const cfg = timer.getState().config
    timerNumber.textContent = String(cfg.workDuration)
    phaseLabel.textContent = t('phase.idle')
    btnStart.textContent = t('btn.start')
    setBodyTint('idle')
    document.title = t('tab.default')
    return
  }

  // 4. 운동 중/일시정지 → 일시정지 (종료 방지)
  const state = timer.getState()
  if (state.phase !== 'idle' && state.phase !== 'complete') {
    // 뒤로가기 소비 — 앱 종료 방지
    history.pushState({ guard: true }, '')
    if (state.isRunning) {
      timer.pause()
      stopCircleAnimation()
      setRingPaused(true)
    showPauseOverlay(true)
      btnStart.textContent = t('btn.resume')
      releaseWakeLock()
    }
    return
  }
})

// 설정 패널
btnSettings.addEventListener('click', () => openPanel(settingsPanel, btnSettings))
btnClose.addEventListener('click', () => {
  closePanel(settingsPanel)
  scrollToTop()
})

// 기록 패널
btnHistory.addEventListener('click', () => {
  renderHistory()
  openPanel(historyPanel, btnHistory)
})
btnCloseHistory.addEventListener('click', () => {
  closePanel(historyPanel)
  scrollToTop()
})

// ── 볼륨 토글 (Feature D: 3단계) ────────────────────────

const SVG_ATTR = 'class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
const VOLUME_ICONS: Record<VolumeLevel, string>  = {
  0: `<svg ${SVG_ATTR}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  1: `<svg ${SVG_ATTR}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  2: `<svg ${SVG_ATTR}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
}
const VOLUME_TITLE_KEYS: Record<VolumeLevel, string> = { 0: 'volume.off', 1: 'volume.low', 2: 'volume.high' }
const VOLUME_CYCLE: VolumeLevel[] = [2, 1, 0]  // 클릭할 때마다 high→low→off→high

btnVoice.addEventListener('click', () => {
  const current = audio.getVolume()
  const nextIndex = (VOLUME_CYCLE.indexOf(current) + 1) % VOLUME_CYCLE.length
  const next = VOLUME_CYCLE[nextIndex]!
  audio.setVolume(next)

  if (next === 0) {
    voiceEnabled = false
    speech.setEnabled(false)
  } else {
    voiceEnabled = true
    speech.setEnabled(true)
  }

  btnVoice.innerHTML = VOLUME_ICONS[next]
  btnVoice.classList.toggle('active', next > 0)
  btnVoice.title = t(VOLUME_TITLE_KEYS[next])
  // 시각적 펄스 피드백
  btnVoice.classList.remove('btn-pulse')
  void (btnVoice as HTMLElement & { offsetWidth: number }).offsetWidth
  btnVoice.classList.add('btn-pulse')
})


// ── Sprint 7 Feature C: 입력 실시간 검증 이벤트 ────────────

function updateEstimatedTime(): void {
  const w = Number(inputWork.value) || 0
  const r = Number(inputRest.value) || 0
  const n = Number(inputRounds.value) || 0
  const total = (w + r) * n + 3 // +3 for countdown
  estimatedTimeEl.textContent = t('misc.estimatedTime', { t: formatDuration(total) })
}

function attachInputValidation(): void {
  inputWork.addEventListener('input', () => { validateInput({ min: 5, max: 300, errorEl: errWork, inputEl: inputWork }); updateEstimatedTime() })
  inputRest.addEventListener('input', () => { validateInput({ min: 3, max: 180, errorEl: errRest, inputEl: inputRest }); updateEstimatedTime() })
  inputRounds.addEventListener('input', () => { validateRoundsInput(); updateEstimatedTime() })
}

// ── 설정 적용 ──────────────────────────────────────────────
btnApplyConfig.addEventListener('click', () => {
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
  btnStart.textContent = t('btn.start')
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
  activePresetId = 'custom'
  renderPresets()
  closePanel(settingsPanel)
  scrollToTop()
  showToast(t('misc.applied'))
})

// ── 프리셋 렌더링 ───────────────────────────────────────────

function renderPresets(): void {
  presetGrid.innerHTML = PRESETS.map(p => {
    const totalSecs = (p.config.workDuration + p.config.restDuration) * p.config.totalRounds + p.config.countdownDuration
    const totalBadge = formatDuration(totalSecs)
    const isActive = p.id === activePresetId
    const name = t(`preset.${p.id}.name`)
    const tag = t(`preset.${p.id}.tag`)
    const desc = t(`preset.${p.id}.desc`)
    return `
    <button class="preset-btn${isActive ? ' active' : ''}"
            data-id="${p.id}"
            title="${desc}">
      <div class="preset-header">
        <span class="preset-emoji">${p.emoji}</span>
        <span class="preset-name">${name}</span>
        <span class="preset-level preset-level-${p.difficulty}">${'●'.repeat(p.difficulty)}${'○'.repeat(4 - p.difficulty)}</span>
      </div>
      <span class="preset-spec">${p.config.workDuration}/${p.config.restDuration}s × ${p.config.totalRounds}  •  ${totalBadge}</span>
      <span class="preset-tag">${tag}</span>
    </button>`
  }).join('')

  presetGrid.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS.find(p => p.id === btn.dataset['id'])
      if (!preset) return

      timer.reset()
      timer.updateConfig(preset.config)
      inputWork.value   = String(preset.config.workDuration)
      inputRest.value   = String(preset.config.restDuration)
      inputRounds.value = String(preset.config.totalRounds)
      roundLabel.textContent = `0 / ${preset.config.totalRounds}`
      renderRoundDots(0, preset.config.totalRounds)
      btnStart.textContent = t('btn.start')
      // 인터벌 설정 표시 업데이트 (Sprint 4 Feature A)
      updateIntervalDisplay(preset.config.workDuration, preset.config.restDuration)
      // 설정 저장 (Feature C)
      saveSettings({ workDuration: preset.config.workDuration, restDuration: preset.config.restDuration, totalRounds: preset.config.totalRounds })
      // Sprint 7 Feature D: 활성 프리셋 표시
      activePresetId = preset.id
      analytics.presetSelect(preset.id)
      renderPresets()
      closePanel(settingsPanel)
      scrollToTop()
    })
  })
}

// ── 커스텀 프리셋 저장 (Sprint 17) ──────────────────────

function renderCustomPresets(): void {
  const presets = storage.getCustomPresets()
  const saveLink = `<button class="btn-save-link" id="btn-save-link">💾 ${t('btn.savePreset')}</button>`

  if (presets.length === 0) {
    customPresetList.innerHTML = saveLink
    document.getElementById('btn-save-link')?.addEventListener('click', handleSavePreset)
    return
  }
  customPresetList.innerHTML = `
    <h4 class="custom-preset-title">${t('preset.myPresets')}</h4>
    ${presets.map(p => `
      <div class="custom-preset-item" data-id="${p.id}">
        <span class="custom-preset-name">${p.name}</span>
        <span class="custom-preset-detail">${p.workDuration}/${p.restDuration}s × ${p.totalRounds}</span>
        <button class="custom-preset-use" data-id="${p.id}">▶</button>
        <button class="custom-preset-del" data-id="${p.id}">✕</button>
      </div>
    `).join('')}
    ${saveLink}`

  document.getElementById('btn-save-link')?.addEventListener('click', handleSavePreset)

  customPresetList.querySelectorAll<HTMLButtonElement>('.custom-preset-use').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = presets.find(x => x.id === btn.dataset['id'])
      if (!p) return
      const config = { workDuration: p.workDuration, restDuration: p.restDuration, totalRounds: p.totalRounds, countdownDuration: 3, warmupDuration: p.warmupEnabled ? 60 : 0, cooldownDuration: p.cooldownEnabled ? 60 : 0 }
      toggleWarmup.checked = p.warmupEnabled === true
      toggleCooldown.checked = p.cooldownEnabled === true
      timer.reset()
      timer.updateConfig(config)
      inputWork.value = String(p.workDuration)
      inputRest.value = String(p.restDuration)
      inputRounds.value = String(p.totalRounds)
      roundLabel.textContent = `0 / ${p.totalRounds}`
      renderRoundDots(0, p.totalRounds)
      btnStart.textContent = t('btn.start')
      updateIntervalDisplay(p.workDuration, p.restDuration)
      saveSettings({ workDuration: p.workDuration, restDuration: p.restDuration, totalRounds: p.totalRounds })
      activePresetId = p.id
      renderPresets()
      closePanel(settingsPanel)
      scrollToTop()
    })
  })

  customPresetList.querySelectorAll<HTMLButtonElement>('.custom-preset-del').forEach(btn => {
    btn.addEventListener('click', () => {
      storage.deleteCustomPreset(btn.dataset['id']!)
      renderCustomPresets()
    })
  })
}

function handleSavePreset(): void {
  const work = Number(inputWork.value)
  const rest = Number(inputRest.value)
  const rounds = Number(inputRounds.value)
  if (!work || !rest || !rounds) return

  const name = prompt(t('preset.enterName'))
  if (!name || !name.trim()) return

  storage.saveCustomPreset({ name: name.trim(), workDuration: work, restDuration: rest, totalRounds: rounds, warmupEnabled: toggleWarmup.checked, cooldownEnabled: toggleCooldown.checked })
  showToast(t('preset.saved'))
  renderCustomPresets()
}

// ── 히트맵 렌더링 (Sprint 16) ────────────────────────────

function renderHeatmap(): void {
  const data = storage.getHeatmapData(8)
  const today = new Date()
  const dayLabels = ['', 'M', '', 'W', '', 'F', '']

  // 8주 데이터를 7행(요일) × 8열(주) 그리드로 배치
  // 오늘 요일 기준으로 마지막 열 결정
  const todayDay = today.getDay() // 0=Sun
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 55 - todayDay) // 8주 전 일요일

  const grid: string[][] = Array.from({ length: 7 }, () => [])
  for (let week = 0; week < 8; week++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + week * 7 + day)
      if (d > today) {
        grid[day]!.push('<div class="heatmap-cell heatmap-empty"></div>')
        continue
      }
      const key = d.toISOString().slice(0, 10)
      const count = data.get(key) ?? 0
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3
      grid[day]!.push(`<div class="heatmap-cell heatmap-${level}" title="${key}: ${count}"></div>`)
    }
  }

  const rows = grid.map((cells, i) =>
    `<div class="heatmap-row"><span class="heatmap-day-label">${dayLabels[i]}</span>${cells.join('')}</div>`
  ).join('')

  heatmapEl.innerHTML = `<div class="heatmap-week-grid">${rows}</div>`
}

// ── 기록 렌더링 ───────────────────────────────────────────

function renderHistoryDeleteArea(): void {
  const history = storage.getHistory()
  if (history.length === 0) {
    historyDeleteArea.innerHTML = ''
    return
  }
  historyDeleteArea.innerHTML = `
    <button class="btn-history-delete" id="btn-history-delete">${t('history.delete')}</button>
  `
  const btnDelete = document.getElementById('btn-history-delete') as HTMLButtonElement | null
  if (!btnDelete) return
  btnDelete.addEventListener('click', () => {
    historyDeleteArea.innerHTML = `
      <div class="history-delete-confirm">
        <span class="history-delete-warning">${t('history.confirmDelete')}</span>
        <div class="history-delete-actions">
          <button class="btn-delete-confirm" id="btn-delete-confirm">${t('history.confirm')}</button>
          <button class="btn-delete-cancel" id="btn-delete-cancel">${t('history.cancel')}</button>
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

const HISTORY_PAGE_SIZE = 20
let historyShowCount = HISTORY_PAGE_SIZE

function renderHistoryItems(): void {
  const allHistory = storage.getHistory()
  const history = allHistory.slice(0, historyShowCount)
  const locale = DATE_LOCALE[getCurrentLang()]

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-history">
        <p>${t('history.empty')}</p>
        <button class="btn-outline btn-start-first" id="btn-start-first">${t('btn.start')}</button>
      </div>`
    document.getElementById('btn-start-first')?.addEventListener('click', () => {
      closePanel(historyPanel)
      btnStart.click()
    })
    return
  }

  let html = history.map(r => {
    const date = new Date(r.date)
    const mins = Math.floor(r.durationSeconds / 60)
    const secs = r.durationSeconds % 60
    const interval = t('misc.intervalDisplay', { w: r.workDuration, r: r.restDuration })
    return `
      <div class="history-item">
        <span class="history-date">${date.toLocaleDateString(locale)}</span>
        <span class="history-detail">${interval} × ${r.rounds}</span>
        <span class="history-duration">${mins}:${String(secs).padStart(2, '0')}</span>
      </div>`
  }).join('')

  if (allHistory.length > historyShowCount) {
    html += `<button class="btn-outline btn-load-more" id="btn-load-more">${t('history.loadMore', { n: Math.min(HISTORY_PAGE_SIZE, allHistory.length - historyShowCount) })}</button>`
  }
  historyList.innerHTML = html

  document.getElementById('btn-load-more')?.addEventListener('click', () => {
    historyShowCount += HISTORY_PAGE_SIZE
    renderHistoryItems()
  })
}

const _countAnimFrames = new Map<HTMLElement, number>()

function animateCount(el: HTMLElement, target: number, duration = 400): void {
  const prev = _countAnimFrames.get(el)
  if (prev !== undefined) cancelAnimationFrame(prev)

  const start = Number(el.textContent) || 0
  if (start === target) { el.textContent = String(target); return }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = String(target)
    return
  }
  const startTime = performance.now()
  function frame(now: number) {
    const progress = Math.min((now - startTime) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    el.textContent = String(Math.round(start + (target - start) * eased))
    if (progress < 1) {
      _countAnimFrames.set(el, requestAnimationFrame(frame))
    } else {
      _countAnimFrames.delete(el)
    }
  }
  _countAnimFrames.set(el, requestAnimationFrame(frame))
}

function renderHistory(): void {
  const stats = storage.getStats()
  animateCount(statsTotal, stats.total)
  animateCount(statsWeek, stats.thisWeek)
  animateCount(statsStreak, stats.streak)
  animateCount(statsTotalMin, stats.totalMinutes)
  animateCount(statsAvgMin, stats.avgMinutes)
  animateCount(statsBestStreak, stats.bestStreak)
  historyShowCount = HISTORY_PAGE_SIZE
  renderHistoryItems()
  renderHeatmap()
  renderHistoryDeleteArea()
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
  deferredInstallPrompt.userChoice.then((choice) => {
    if (choice.outcome === 'accepted') analytics.pwaInstall()
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
})

// ── 초기화 ───────────────────────────────────────────────

function init(): void {
  // i18n 초기화 (가장 먼저)
  initI18n()

  // 첫 방문 시 언어 선택 모달 (Sprint 23)
  const WELCOME_KEY = 'tabata_welcomed'
  try {
    if (!localStorage.getItem(WELCOME_KEY)) {
      welcomeModal.style.display = 'flex'
      history.pushState({ welcome: true }, '')
      welcomeModal.querySelectorAll<HTMLButtonElement>('.welcome-lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const lang = btn.dataset['lang'] as Lang
          setLanguage(lang)
          selectLanguage.value = lang
          localStorage.setItem(WELCOME_KEY, '1')
          welcomeModal.style.display = 'none'
          // 동적 UI 갱신
          const cfg = timer.getState().config
          updateIntervalDisplay(cfg.workDuration, cfg.restDuration)
          renderPresets()
          renderCustomPresets()
          updateEstimatedTime()
          phaseLabel.textContent = t('phase.idle')
          btnStart.textContent = t('btn.start')
        })
      })
    }
  } catch { /* ignore */ }

  // 초기 원형 프로그레스 설정
  timerCircle.style.strokeDasharray = String(CIRCLE_CIRCUMFERENCE)
  timerCircle.style.strokeDashoffset = String(0)
  setCircleOffset(1, 1)

  // Feature C: 저장된 설정 불러오기
  const saved = loadSettings()
  if (saved) {
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
  btnVoice.innerHTML = VOLUME_ICONS[vol]
  btnVoice.title = t(VOLUME_TITLE_KEYS[vol])
  btnVoice.classList.toggle('active', vol > 0)

  renderPresets()
  renderCustomPresets()

  // Sprint 7 Feature C: 입력 실시간 검증
  attachInputValidation()
  updateEstimatedTime()

  // 미니멀리스트 모드 초기화 (Sprint 5)
  applyMinimalistMode(loadMinimalistMode())
  toggleMinimalist.addEventListener('change', () => {
    const enabled = toggleMinimalist.checked
    applyMinimalistMode(enabled)
    saveMinimalistMode(enabled)
  })

  // 라이트/다크 테마 (Sprint 14)
  applyTheme(loadLightTheme())
  toggleTheme.addEventListener('change', () => {
    const light = toggleTheme.checked
    applyTheme(light)
    saveLightTheme(light)
    analytics.themeChange(light ? 'light' : 'dark')
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

  // Sprint 24: URL 파라미터 처리 (PWA shortcuts)
  const urlParams = new URLSearchParams(window.location.search)
  const presetParam = urlParams.get('preset')
  if (presetParam) {
    const preset = PRESETS.find(p => p.id === presetParam)
    if (preset) {
      timer.updateConfig(preset.config)
      inputWork.value = String(preset.config.workDuration)
      inputRest.value = String(preset.config.restDuration)
      inputRounds.value = String(preset.config.totalRounds)
      activePresetId = preset.id
      updateIntervalDisplay(preset.config.workDuration, preset.config.restDuration)
    }
  }
  if (urlParams.get('panel') === 'history') {
    setTimeout(() => { renderHistory(); openPanel(historyPanel, btnHistory) }, 300)
  }

  // Sprint 12: 언어 선택
  selectLanguage.value = getCurrentLang()
  selectLanguage.addEventListener('change', () => {
    setLanguage(selectLanguage.value as Lang)
    analytics.languageChange(selectLanguage.value)
    // 동적 UI 갱신
    phaseLabel.textContent = t(`phase.${timer.getState().phase}`)
    const cfg = timer.getState().config
    updateIntervalDisplay(cfg.workDuration, cfg.restDuration)
    const state = timer.getState()
    if (!state.isRunning && (state.phase === 'idle' || state.phase === 'complete')) {
      btnStart.textContent = state.phase === 'complete' ? t('btn.restart') : t('btn.start')
    }
    renderPresets()
    renderCustomPresets()
    renderHistory()
    document.title = t('tab.default')
    progressRingSvg.setAttribute('aria-label', t('aria.timerRing'))
  })
}

// Sprint 9 Feature D: 에러 바운더리 — init()를 try/catch로 래핑
try {
  init()
} catch (err) {
  console.error('[MyTabata] 초기화 오류:', err)
  // 앱 콘텐츠 숨기고 에러 폴백 표시
  document.querySelector<HTMLElement>('.header')?.style.setProperty('display', 'none')
  document.querySelector<HTMLElement>('.timer-container')?.style.setProperty('display', 'none')
  document.querySelector<HTMLElement>('#overall-progress')?.style.setProperty('display', 'none')
  errorBoundary.style.display = 'flex'
}
