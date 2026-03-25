// 📄 src/main.ts — 앱 초기화 및 UI 바인딩

import { TabataTimer, DEFAULT_CONFIG, type Phase, type TimerConfig } from './timer'
import { AudioManager } from './audio'
import { SpeechManager } from './speech'
import { PremiumManager } from './premium'
import { WorkoutStorage } from './storage'
import { PRESETS } from './presets'

// ── DOM 요소 ────────────────────────────────────────────

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!

const timerCircle     = document.querySelector<SVGCircleElement>('#timer-circle')!
const timerNumber     = $('#timer-number')
const phaseLabel      = $('#phase-label')
const roundLabel      = $('#round-label')
const roundDots       = $('#round-dots')
const btnStart        = $<HTMLButtonElement>('#btn-start')
const btnReset        = $<HTMLButtonElement>('#btn-reset')
const settingsPanel   = $('#settings-panel')
const btnSettings     = $<HTMLButtonElement>('#btn-settings')
const btnClose        = $<HTMLButtonElement>('#btn-close-settings')
const historyPanel    = $('#history-panel')
const btnHistory      = $<HTMLButtonElement>('#btn-history')
const btnCloseHistory = $<HTMLButtonElement>('#btn-close-history')
const historyList     = $('#history-list')
const proModal        = $('#pro-modal')
const btnBuyPro       = $<HTMLButtonElement>('#btn-buy-pro')
const btnClosePro     = $<HTMLButtonElement>('#btn-close-pro')
const presetGrid      = $('#preset-grid')
const inputWork       = $<HTMLInputElement>('#input-work')
const inputRest       = $<HTMLInputElement>('#input-rest')
const inputRounds     = $<HTMLInputElement>('#input-rounds')
const btnApplyConfig  = $<HTMLButtonElement>('#btn-apply-config')
const btnVoice        = $<HTMLButtonElement>('#btn-voice')
const statsTotal      = $('#stats-total')
const statsWeek       = $('#stats-week')
const statsStreak     = $('#stats-streak')

// ── 서비스 인스턴스 ───────────────────────────────────────

const timer    = new TabataTimer(DEFAULT_CONFIG)
const audio    = new AudioManager()
const speech   = new SpeechManager()
const premium  = new PremiumManager()
const storage  = new WorkoutStorage()

// ── 상태 ─────────────────────────────────────────────────

let voiceEnabled = false
let workoutStartTime: Date | null = null
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 54  // r=54

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

    // 초기 숫자 표시 (complete는 COMPLETE 이벤트에서 처리)
    if (phase !== 'complete') {
      timerNumber.textContent = String(state.timeRemaining)
      resetCircleForPhase(state.timeRemaining, getPhaseDuration(state.config, phase))
    }

    // 오디오
    if (phase === 'work')  audio.workStart()
    if (phase === 'rest')  audio.restStart()

    // 음성 안내 (Pro)
    if (voiceEnabled && premium.isPro()) {
      if (phase === 'work') {
        if (round === state.config.totalRounds) speech.lastRound()
        else speech.workStart(round, state.config.totalRounds)
      }
      if (phase === 'rest') speech.restStart()
    }

    // 운동 시작 시간 기록
    if (phase === 'work' && round === 1) workoutStartTime = new Date()

    // 버튼 상태
    btnStart.textContent = phase === 'complete' ? '다시 시작' : '일시정지'
  }

  if (event.type === 'TICK') {
    const { phase, timeRemaining } = state
    timerNumber.textContent = String(timeRemaining)

    // 카운트다운 틱음
    if (phase === 'countdown') {
      audio.countdown(timeRemaining)
      if (voiceEnabled && premium.isPro()) speech.countdown(timeRemaining)
    }
  }

  if (event.type === 'COMPLETE') {
    audio.complete()
    if (voiceEnabled && premium.isPro()) speech.complete()
    timerNumber.textContent = '🎉'
    btnStart.textContent = '다시 시작'

    // 운동 기록 저장 (Pro)
    if (premium.isPro() && workoutStartTime) {
      const { config } = state
      storage.saveWorkout({
        date: new Date().toISOString(),
        rounds: config.totalRounds,
        workDuration: config.workDuration,
        restDuration: config.restDuration,
        durationSeconds: Math.round((Date.now() - workoutStartTime.getTime()) / 1000),
      })
    }
    workoutStartTime = null
  }
})

// ── 버튼 이벤트 ───────────────────────────────────────────

btnStart.addEventListener('click', () => {
  const state = timer.getState()
  if (state.phase === 'complete' || state.phase === 'idle') {
    timer.reset()
    timer.start()
  } else if (state.isRunning) {
    timer.pause()
    stopCircleAnimation()
    btnStart.textContent = '재개'
  } else {
    timer.resume()
    const s = timer.getState()
    startCircleAnimation(s.timeRemaining, getPhaseDuration(s.config, s.phase))
    btnStart.textContent = '일시정지'
  }
})

btnReset.addEventListener('click', () => {
  timer.reset()
  stopCircleAnimation()
  const cfg = timer.getState().config
  timerNumber.textContent = String(cfg.workDuration)
  phaseLabel.textContent = '준비'
  roundLabel.textContent = `0 / ${cfg.totalRounds}`
  btnStart.textContent = '시작'
  document.documentElement.style.setProperty('--phase-color', 'var(--color-idle)')
  setCircleOffset(1, 1)
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

// 소리 토글 (비프음 항상 + 음성 안내는 Pro)
btnVoice.addEventListener('click', () => {
  const soundOn = !audio.isEnabled()
  audio.setEnabled(soundOn)
  // 음성 안내는 Pro 전용
  if (premium.isPro()) {
    voiceEnabled = soundOn
    speech.setEnabled(soundOn)
  }
  btnVoice.textContent = soundOn ? '🔈' : '🔇'
  btnVoice.classList.toggle('active', soundOn)
  btnVoice.title = soundOn ? '소리 켜짐' : '소리 꺼짐'
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
  settingsPanel.classList.remove('open')
})

// ── 프리셋 렌더링 (Pro) ───────────────────────────────────

function renderPresets(): void {
  const freeId = 'tabata-classic'
  presetGrid.innerHTML = PRESETS.map(p => {
    const locked = !premium.isPro() && p.id !== freeId
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

  // 초기값 표시
  const cfg = timer.getState().config
  timerNumber.textContent = String(cfg.workDuration)
  roundLabel.textContent  = `0 / ${cfg.totalRounds}`
  inputWork.value   = String(cfg.workDuration)
  inputRest.value   = String(cfg.restDuration)
  inputRounds.value = String(cfg.totalRounds)
  renderRoundDots(0, cfg.totalRounds)
  renderPresets()
  updateProUI()
}

init()
