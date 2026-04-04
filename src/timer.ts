// 📄 src/timer.ts — 타이머 핵심 로직 (상태 머신)

export type Phase = 'idle' | 'countdown' | 'warmup' | 'work' | 'rest' | 'cooldown' | 'complete'

export interface TimerConfig {
  workDuration: number   // 초
  restDuration: number   // 초
  totalRounds: number
  countdownDuration: number
  warmupDuration: number   // 초 (0 = 비활성)
  cooldownDuration: number // 초 (0 = 비활성)
}

export interface TimerState {
  phase: Phase
  currentRound: number
  timeRemaining: number
  config: TimerConfig
  isRunning: boolean
}

export type TimerEvent =
  | { type: 'PHASE_CHANGE'; phase: Phase; round: number }
  | { type: 'TICK'; timeRemaining: number }
  | { type: 'COMPLETE' }

export const DEFAULT_CONFIG: TimerConfig = {
  workDuration: 20,
  restDuration: 10,
  totalRounds: 8,
  countdownDuration: 3,
  warmupDuration: 0,
  cooldownDuration: 0,
}

export class TabataTimer {
  private state: TimerState
  private intervalId: ReturnType<typeof setInterval> | null = null
  private listeners: Array<(event: TimerEvent) => void> = []

  // 드리프트 수정: 절대 타임스탬프 기반 카운트다운
  private phaseStartTime: number = 0
  private phaseStartRemaining: number = 0

  constructor(config: TimerConfig = DEFAULT_CONFIG) {
    this.state = {
      phase: 'idle',
      currentRound: 0,
      timeRemaining: 0,
      config,
      isRunning: false,
    }
  }

  getState(): Readonly<TimerState> {
    return { ...this.state }
  }

  on(listener: (event: TimerEvent) => void): () => void {
    this.listeners.push(listener)
    // 구독 해제 함수 반환
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  start(): void {
    if (this.state.isRunning) return
    this._enterPhase('countdown', 0)
  }

  hasWarmup(): boolean {
    return this.state.config.warmupDuration > 0
  }

  hasCooldown(): boolean {
    return this.state.config.cooldownDuration > 0
  }

  pause(): void {
    if (!this.state.isRunning) return
    this._clearInterval()
    this.state.isRunning = false
  }

  resume(): void {
    if (this.state.isRunning || this.state.phase === 'idle' || this.state.phase === 'complete') return
    // warmup/cooldown 도 일시정지 가능
    // 재개 시 절대 타임스탬프를 현재 남은 시간 기준으로 재설정
    this.phaseStartTime = Date.now()
    this.phaseStartRemaining = this.state.timeRemaining
    this.state.isRunning = true
    this._startTick()
  }

  // 카운트다운 페이즈에서 즉시 운동 페이즈로 스킵 (Sprint 4 Feature B)
  skipCountdown(): void {
    if (this.state.phase !== 'countdown') return
    this._clearInterval()
    this._enterPhase('work', 1)
  }

  skipRest(): void {
    if (this.state.phase !== 'rest') return
    this._clearInterval()
    const round = this.state.currentRound
    const { totalRounds, cooldownDuration } = this.state.config
    if (round < totalRounds) {
      this._enterPhase('work', round + 1)
    } else if (cooldownDuration > 0) {
      this._enterPhase('cooldown', totalRounds)
    } else {
      this._complete()
    }
  }

  reset(): void {
    this._clearInterval()
    this.state = {
      ...this.state,
      phase: 'idle',
      currentRound: 0,
      timeRemaining: 0,
      isRunning: false,
    }
    this._emit({ type: 'PHASE_CHANGE', phase: 'idle', round: 0 })
  }

  updateConfig(config: TimerConfig): void {
    this.state.config = config
  }

  // ── 내부 메서드 ──────────────────────────────────────

  private _enterPhase(phase: Phase, round: number): void {
    this.state.phase = phase
    this.state.currentRound = round
    this.state.isRunning = true

    const { workDuration, restDuration, countdownDuration, warmupDuration, cooldownDuration } = this.state.config
    switch (phase) {
      case 'countdown': this.state.timeRemaining = countdownDuration; break
      case 'warmup':    this.state.timeRemaining = warmupDuration;    break
      case 'work':      this.state.timeRemaining = workDuration;      break
      case 'rest':      this.state.timeRemaining = restDuration;      break
      case 'cooldown':  this.state.timeRemaining = cooldownDuration;  break
      default:          this.state.timeRemaining = 0
    }

    // 페이즈 시작 시점 절대 타임스탬프 기록
    this.phaseStartTime = Date.now()
    this.phaseStartRemaining = this.state.timeRemaining

    this._emit({ type: 'PHASE_CHANGE', phase, round })
    this._startTick()
  }

  private _startTick(): void {
    this._clearInterval()
    this.intervalId = setInterval(() => this._tick(), 250)
  }

  private _tick(): void {
    // 절대 타임스탬프 기반으로 남은 시간 계산 (setInterval 드리프트 제거)
    const elapsed = Math.floor((Date.now() - this.phaseStartTime) / 1000)
    const newRemaining = Math.max(0, this.phaseStartRemaining - elapsed)

    // 표시값이 변경됐을 때만 TICK 이벤트 발생
    if (newRemaining !== this.state.timeRemaining) {
      this.state.timeRemaining = newRemaining
      this._emit({ type: 'TICK', timeRemaining: this.state.timeRemaining })
    }

    if (this.state.timeRemaining > 0) return

    // 페이즈 전환
    this._clearInterval()
    const { totalRounds, warmupDuration, cooldownDuration } = this.state.config
    const round = this.state.currentRound

    switch (this.state.phase) {
      case 'countdown':
        // 워밍업이 있으면 워밍업 먼저, 없으면 바로 운동
        if (warmupDuration > 0) {
          this._enterPhase('warmup', 0)
        } else {
          this._enterPhase('work', 1)
        }
        break
      case 'warmup':
        this._enterPhase('work', 1)
        break
      case 'work':
        if (round >= totalRounds) {
          // 마지막 라운드 → 휴식 없이 바로 완료/쿨다운
          if (cooldownDuration > 0) {
            this._enterPhase('cooldown', totalRounds)
          } else {
            this._complete()
          }
        } else {
          this._enterPhase('rest', round)
        }
        break
      case 'rest':
        this._enterPhase('work', round + 1)
        break
      case 'cooldown':
        this._complete()
        break
    }
  }

  private _complete(): void {
    this.state.phase = 'complete'
    this.state.isRunning = false
    this._emit({ type: 'PHASE_CHANGE', phase: 'complete', round: this.state.config.totalRounds })
    this._emit({ type: 'COMPLETE' })
  }

  private _clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private _emit(event: TimerEvent): void {
    this.listeners.forEach(l => l(event))
  }
}
