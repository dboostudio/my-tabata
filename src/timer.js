// 📄 src/timer.ts — 타이머 핵심 로직 (상태 머신)
export const DEFAULT_CONFIG = {
    workDuration: 20,
    restDuration: 10,
    totalRounds: 8,
    countdownDuration: 3,
};
export class TabataTimer {
    constructor(config = DEFAULT_CONFIG) {
        this.intervalId = null;
        this.listeners = [];
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
    pause() {
        if (!this.state.isRunning)
            return;
        this._clearInterval();
        this.state.isRunning = false;
    }
    resume() {
        if (this.state.isRunning || this.state.phase === 'idle' || this.state.phase === 'complete')
            return;
        this.state.isRunning = true;
        this._startTick();
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
        const { workDuration, restDuration, countdownDuration } = this.state.config;
        switch (phase) {
            case 'countdown':
                this.state.timeRemaining = countdownDuration;
                break;
            case 'work':
                this.state.timeRemaining = workDuration;
                break;
            case 'rest':
                this.state.timeRemaining = restDuration;
                break;
            default: this.state.timeRemaining = 0;
        }
        this._emit({ type: 'PHASE_CHANGE', phase, round });
        this._startTick();
    }
    _startTick() {
        this._clearInterval();
        this.intervalId = setInterval(() => this._tick(), 1000);
    }
    _tick() {
        this.state.timeRemaining -= 1;
        this._emit({ type: 'TICK', timeRemaining: this.state.timeRemaining });
        if (this.state.timeRemaining > 0)
            return;
        // 페이즈 전환
        this._clearInterval();
        const { totalRounds } = this.state.config;
        const round = this.state.currentRound;
        switch (this.state.phase) {
            case 'countdown':
                this._enterPhase('work', 1);
                break;
            case 'work':
                this._enterPhase('rest', round);
                break;
            case 'rest':
                if (round < totalRounds) {
                    this._enterPhase('work', round + 1);
                }
                else {
                    this._complete();
                }
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
