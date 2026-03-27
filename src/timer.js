// 📄 src/timer.ts — 타이머 핵심 로직 (상태 머신)
export const DEFAULT_CONFIG = {
    workDuration: 20,
    restDuration: 10,
    totalRounds: 8,
    countdownDuration: 3,
    warmupDuration: 0,
    cooldownDuration: 0,
};
export class TabataTimer {
    constructor(config = DEFAULT_CONFIG) {
        this.intervalId = null;
        this.listeners = [];
        // 드리프트 수정: 절대 타임스탬프 기반 카운트다운
        this.phaseStartTime = 0;
        this.phaseStartRemaining = 0;
        this.state = {
            phase: 'idle',
            currentRound: 0,
            timeRemaining: 0,
            config,
            isRunning: false,
        };
    }
    getState() {
        return { ...this.state };
    }
    on(listener) {
        this.listeners.push(listener);
        // 구독 해제 함수 반환
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    start() {
        if (this.state.isRunning)
            return;
        this._enterPhase('countdown', 0);
    }
    hasWarmup() {
        return this.state.config.warmupDuration > 0;
    }
    hasCooldown() {
        return this.state.config.cooldownDuration > 0;
    }
    pause() {
        if (!this.state.isRunning)
            return;
        this._clearInterval();
        this.state.isRunning = false;
    }
    resume() {
        if (this.state.isRunning || this.state.phase === 'idle' || this.state.phase === 'complete')
            return;
        // warmup/cooldown 도 일시정지 가능
        // 재개 시 절대 타임스탬프를 현재 남은 시간 기준으로 재설정
        this.phaseStartTime = Date.now();
        this.phaseStartRemaining = this.state.timeRemaining;
        this.state.isRunning = true;
        this._startTick();
    }
    // 카운트다운 페이즈에서 즉시 운동 페이즈로 스킵 (Sprint 4 Feature B)
    skipCountdown() {
        if (this.state.phase !== 'countdown')
            return;
        this._clearInterval();
        this._enterPhase('work', 1);
    }
    reset() {
        this._clearInterval();
        this.state = {
            ...this.state,
            phase: 'idle',
            currentRound: 0,
            timeRemaining: 0,
            isRunning: false,
        };
        this._emit({ type: 'PHASE_CHANGE', phase: 'idle', round: 0 });
    }
    updateConfig(config) {
        this.state.config = config;
    }
    // ── 내부 메서드 ──────────────────────────────────────
    _enterPhase(phase, round) {
        this.state.phase = phase;
        this.state.currentRound = round;
        this.state.isRunning = true;
        const { workDuration, restDuration, countdownDuration, warmupDuration, cooldownDuration } = this.state.config;
        switch (phase) {
            case 'countdown':
                this.state.timeRemaining = countdownDuration;
                break;
            case 'warmup':
                this.state.timeRemaining = warmupDuration;
                break;
            case 'work':
                this.state.timeRemaining = workDuration;
                break;
            case 'rest':
                this.state.timeRemaining = restDuration;
                break;
            case 'cooldown':
                this.state.timeRemaining = cooldownDuration;
                break;
            default: this.state.timeRemaining = 0;
        }
        // 페이즈 시작 시점 절대 타임스탬프 기록
        this.phaseStartTime = Date.now();
        this.phaseStartRemaining = this.state.timeRemaining;
        this._emit({ type: 'PHASE_CHANGE', phase, round });
        this._startTick();
    }
    _startTick() {
        this._clearInterval();
        this.intervalId = setInterval(() => this._tick(), 250);
    }
    _tick() {
        // 절대 타임스탬프 기반으로 남은 시간 계산 (setInterval 드리프트 제거)
        const elapsed = Math.floor((Date.now() - this.phaseStartTime) / 1000);
        const newRemaining = Math.max(0, this.phaseStartRemaining - elapsed);
        // 표시값이 변경됐을 때만 TICK 이벤트 발생
        if (newRemaining !== this.state.timeRemaining) {
            this.state.timeRemaining = newRemaining;
            this._emit({ type: 'TICK', timeRemaining: this.state.timeRemaining });
        }
        if (this.state.timeRemaining > 0)
            return;
        // 페이즈 전환
        this._clearInterval();
        const { totalRounds, warmupDuration, cooldownDuration } = this.state.config;
        const round = this.state.currentRound;
        switch (this.state.phase) {
            case 'countdown':
                // 워밍업이 있으면 워밍업 먼저, 없으면 바로 운동
                if (warmupDuration > 0) {
                    this._enterPhase('warmup', 0);
                }
                else {
                    this._enterPhase('work', 1);
                }
                break;
            case 'warmup':
                this._enterPhase('work', 1);
                break;
            case 'work':
                this._enterPhase('rest', round);
                break;
            case 'rest':
                if (round < totalRounds) {
                    this._enterPhase('work', round + 1);
                }
                else if (cooldownDuration > 0) {
                    this._enterPhase('cooldown', totalRounds);
                }
                else {
                    this._complete();
                }
                break;
            case 'cooldown':
                this._complete();
                break;
        }
    }
    _complete() {
        this.state.phase = 'complete';
        this.state.isRunning = false;
        this._emit({ type: 'PHASE_CHANGE', phase: 'complete', round: this.state.config.totalRounds });
        this._emit({ type: 'COMPLETE' });
    }
    _clearInterval() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    _emit(event) {
        this.listeners.forEach(l => l(event));
    }
}
