// 📄 src/main.ts — 앱 초기화 및 UI 바인딩

import { TabataTimer, DEFAULT_CONFIG, type Phase, type TimerConfig } from './timer'
import { AudioManager, type VolumeLevel } from './audio'
import { SpeechManager } from './speech'
import { PremiumManager } from './premium'
import { WorkoutStorage } from './storage'
import { PRESETS } from './presets'

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
    const rest   = Math.max(3,  Math.min(120, Number(parsed.restDuration)  || 0))
    const rounds = Math.max(1,  Math.min(20,  Number(parsed.totalRounds)   || 0))
    if (!work || !rest || !rounds) return null
    return { workDuration: work, restDuration: rest, totalRounds: rounds }
  } catch {
    return null
  }
}

// ── 상태 ─────────────────────────────────────────────────

let voiceEnabled = false
let workoutStartTime: Date | null = null
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 54  // r=54

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
    text = `다음: 운동 ${config.workDuration}s`
  } else if (phase === 'work') {
    text = `다음: 휴식 ${config.restDuration}s`
  } else if (phase === 'rest') {
    if (round < config.totalRounds) {
      text = `다음: 운동 ${config.workDuration}s`
    } else {
      text = '다음: 완료!'
    }
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

// ── 완료 요약 카드 (Feature B) ────────────────────────────

function showSummaryCard(rounds: number, durationSeconds: number, workDuration: number): void {
  stopCircleAnimation()
  elapsedLabel.style.display = 'none'
  timerNumber.style.display = 'none'
  phaseLabel.style.display = 'none'
  roundLabel.style.display = 'none'

  const avgWork = workDuration  // each round is the same work duration
  summaryCard.innerHTML = `
    <div class="summary-emoji">🎉</div>
    <div class="summary-title">운동 완료!</div>
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
        <span class="summary-stat-value">${avgWork}s</span>
        <span class="summary-stat-label">라운드당 운동</span>
      </div>
    </div>
  `
  summaryCard.classList.add('visible')
}

function hideSummaryCard(): void {
  summaryCard.classList.remove('visible')
  summaryCard.innerHTML = ''
  timerNumber.style.display = ''
  phaseLabel.style.display = ''
  roundLabel.style.display = ''
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
    case 'work':
      document.title = `운동! ${timeRemaining}s | TabataGo`
      break
    case 'rest':
      document.title = `휴식 ${timeRemaining}s | TabataGo`
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
      settingsPanel.classList.remove('open')
      historyPanel.classList.remove('open')
      proModal.classList.remove('open')
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
    case 'work':      return config.workDuration
    case 'rest':      return config.restDuration
    default:          return 1
  }
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
      idle:      { label: '준비',    color: 'var(--color-idle)' },
      countdown: { label: '준비',    color: 'var(--color-countdown)' },
      work:      { label: '운동!',   color: 'var(--color-work)' },
      rest:      { label: '휴식',    color: 'var(--color-rest)' },
      complete:  { label: '완료! 🎉', color: 'var(--color-complete)' },
    }
    const { label, color } = phaseMap[phase]
    phaseLabel.textContent = label
    document.documentElement.style.setProperty('--phase-color', color)

    // 라운드 표시
    if (phase === 'work' || phase === 'rest') {
      roundLabel.textContent = `${round} / ${state.config.totalRounds}`
      renderRoundDots(round, state.config.totalRounds)
    } else if (phase === 'idle') {
      roundLabel.textContent = `0 / ${state.config.totalRounds}`
      renderRoundDots(0, state.config.totalRounds)
    }

    // 전체 진행 바 (Sprint 3 Feature A)
    if (phase === 'work' || phase === 'rest') {
      // work 시작 시: 이전 라운드 완료 기준 (round - 1), rest 시작 시: round 완료 기준
      const completedRounds = phase === 'work' ? round - 1 : round
      updateOverallProgress(completedRounds, state.config.totalRounds)
    } else if (phase === 'complete') {
      updateOverallProgress(state.config.totalRounds, state.config.totalRounds)
    } else if (phase === 'idle' || phase === 'countdown') {
      resetOverallProgress()
    }

    // 다음 페이즈 미리보기 (Sprint 3 Feature C)
    updateNextPhaseLabel(phase, round, state.config)

    // 초기 숫자 표시 (complete는 COMPLETE 이벤트에서 처리)
    if (phase !== 'complete') {
      timerNumber.textContent = String(state.timeRemaining)
      resetCircleForPhase(state.timeRemaining, getPhaseDuration(state.config, phase))
    }

    // 페이즈 전환 시 링 펄스 애니메이션 (idle 제외)
    if (phase !== 'idle') {
      triggerRingPulse()
    }

    // 탭 타이틀 업데이트
    updateTabTitle(phase, state.timeRemaining)

    // 오디오
    if (phase === 'work')  audio.workStart()
    if (phase === 'rest')  audio.restStart()

    // 햅틱 피드백 강화 (Sprint 3 Feature D)
    if (phase === 'work')     triggerHaptic(200)
    if (phase === 'rest')     triggerHaptic([50, 50, 50])

    // 휴식 시각적 구분 (Sprint 3 Feature B)
    setRestMode(phase === 'rest')

    // 음성 안내 (Pro)
    if (voiceEnabled && premium.isPro()) {
      if (phase === 'work') {
        if (round === state.config.totalRounds) speech.lastRound()
        else speech.workStart(round, state.config.totalRounds)
      }
      if (phase === 'rest') speech.restStart()
    }

    // 운동 시작 시간 기록 + 경과 타이머 시작
    if (phase === 'work' && round === 1) {
      workoutStartTime = new Date()
      startElapsedTimer()
    }

    // 버튼 상태
    btnStart.textContent = phase === 'complete' ? '다시 시작' : '일시정지'
  }

  if (event.type === 'TICK') {
    const { phase, timeRemaining } = state
    timerNumber.textContent = String(timeRemaining)

    // 탭 타이틀 업데이트
    updateTabTitle(phase, timeRemaining)

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
    // 햅틱 완료 진동 (Sprint 3 Feature D)
    triggerHaptic(500)
    // 휴식 모드 해제 (Sprint 3 Feature B)
    setRestMode(false)
    // 다음 페이즈 레이블 숨김
    nextPhaseLabel.style.display = 'none'

    // 완료 요약 카드 표시 (Feature B)
    const { config } = state
    const durationSeconds = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime.getTime()) / 1000)
      : (config.workDuration + config.restDuration) * config.totalRounds + config.countdownDuration
    showSummaryCard(config.totalRounds, durationSeconds, config.workDuration)

    // 운동 기록 저장 (Pro)
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
  }
})

// ── 버튼 이벤트 ───────────────────────────────────────────

btnStart.addEventListener('click', () => {
  const state = timer.getState()
  if (state.phase === 'complete' || state.phase === 'idle') {
    hideSummaryCard()
    timer.reset()
    timer.start()
    acquireWakeLock()
  } else if (state.isRunning) {
    timer.pause()
    stopCircleAnimation()
    btnStart.textContent = '재개'
    releaseWakeLock()
  } else {
    timer.resume()
    const s = timer.getState()
    startCircleAnimation(s.timeRemaining, getPhaseDuration(s.config, s.phase))
    btnStart.textContent = '일시정지'
    acquireWakeLock()
  }
})

btnReset.addEventListener('click', () => {
  timer.reset()
  stopCircleAnimation()
  stopElapsedTimer()
  hideSummaryCard()
  releaseWakeLock()
  setRestMode(false)
  resetOverallProgress()
  nextPhaseLabel.style.display = 'none'
  const cfg = timer.getState().config
  timerNumber.textContent = String(cfg.workDuration)
  phaseLabel.textContent = '준비'
  roundLabel.textContent = `0 / ${cfg.totalRounds}`
  btnStart.textContent = '시작'
  document.documentElement.style.setProperty('--phase-color', 'var(--color-idle)')
  setCircleOffset(1, 1)
  document.title = DEFAULT_TITLE
})

// 설정 패널
btnSettings.addEventListener('click', () => settingsPanel.classList.add('open'))
btnClose.addEventListener('click', () => settingsPanel.classList.remove('open'))

// 기록 패널 (Pro)
btnHistory.addEventListener('click', () => {
  if (!premium.isPro()) { proModal.classList.add('open'); return }
  renderHistory()
  historyPanel.classList.add('open')
})
btnCloseHistory.addEventListener('click', () => historyPanel.classList.remove('open'))

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
btnClosePro.addEventListener('click', () => proModal.classList.remove('open'))

// 설정 적용 (Pro: 커스텀 인터벌)
btnApplyConfig.addEventListener('click', () => {
  if (!premium.isPro()) { proModal.classList.add('open'); return }
  const config: TimerConfig = {
    workDuration: Math.max(5, Math.min(300, Number(inputWork.value) || 20)),
    restDuration: Math.max(3, Math.min(120, Number(inputRest.value) || 10)),
    totalRounds: Math.max(1, Math.min(20, Number(inputRounds.value) || 8)),
    countdownDuration: 3,
  }
  timer.reset()
  timer.updateConfig(config)
  roundLabel.textContent = `0 / ${config.totalRounds}`
  renderRoundDots(0, config.totalRounds)
  btnStart.textContent = '시작'
  // 설정 저장 (Feature C)
  saveSettings({ workDuration: config.workDuration, restDuration: config.restDuration, totalRounds: config.totalRounds })
  settingsPanel.classList.remove('open')
})

// ── 프리셋 렌더링 (Pro) ───────────────────────────────────

function renderPresets(): void {
  const freeId = 'tabata-classic'
  presetGrid.innerHTML = PRESETS.map(p => {
    const locked = !premium.isPro() && p.id !== freeId
    // Feature A: 총 소요 시간 배지
    const totalSecs = (p.config.workDuration + p.config.restDuration) * p.config.totalRounds + p.config.countdownDuration
    const totalBadge = formatDuration(totalSecs)
    return `
    <button class="preset-btn"
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
      if (btn.dataset['locked']) { proModal.classList.add('open'); return }
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
      // 설정 저장 (Feature C)
      saveSettings({ workDuration: preset.config.workDuration, restDuration: preset.config.restDuration, totalRounds: preset.config.totalRounds })
      settingsPanel.classList.remove('open')
    })
  })
}

// ── 기록 렌더링 ───────────────────────────────────────────

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

// ── 초기화 ───────────────────────────────────────────────

function init(): void {
  // 초기 원형 프로그레스 설정
  timerCircle.style.strokeDasharray = String(CIRCLE_CIRCUMFERENCE)
  timerCircle.style.strokeDashoffset = String(0)
  setCircleOffset(1, 1)

  // Feature C: 저장된 설정 불러오기
  const saved = loadSettings()
  if (saved && premium.isPro()) {
    const config: TimerConfig = {
      workDuration: saved.workDuration,
      restDuration: saved.restDuration,
      totalRounds: saved.totalRounds,
      countdownDuration: 3,
    }
    timer.updateConfig(config)
  }

  // 초기값 표시
  const cfg = timer.getState().config
  timerNumber.textContent = String(cfg.workDuration)
  roundLabel.textContent  = `0 / ${cfg.totalRounds}`
  inputWork.value   = String(cfg.workDuration)
  inputRest.value   = String(cfg.restDuration)
  inputRounds.value = String(cfg.totalRounds)
  renderRoundDots(0, cfg.totalRounds)

  // 초기 볼륨 버튼 상태
  const vol = audio.getVolume()
  btnVoice.textContent = VOLUME_ICONS[vol]
  btnVoice.title = VOLUME_TITLES[vol]
  btnVoice.classList.toggle('active', vol > 0)

  renderPresets()
  updateProUI()

  // 스와이프로 패널 닫기 (Sprint 3 Feature E)
  addSwipeToClose(settingsPanel)
  addSwipeToClose(historyPanel)

  // 온보딩 툴팁 (Sprint 3 Feature F)
  showOnboardingTooltip()

  // 시작 버튼 클릭 시 온보딩 툴팁 즉시 해제
  btnStart.addEventListener('click', dismissOnboardingTooltip, { once: true })
}

init()
