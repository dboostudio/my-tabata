// 📄 src/audio.ts — Web Audio API 비프음
const GAIN_BY_LEVEL = {
    0: 0,
    1: 0.15,
    2: 0.4,
};
export class AudioManager {
    constructor() {
        this.ctx = null;
        this.volumeLevel = 2; // default: high
    }
    setVolume(level) {
        this.volumeLevel = level;
    }
    getVolume() {
        return this.volumeLevel;
    }
    // Legacy compatibility: setEnabled(false) → level 0, setEnabled(true) → level 2
    setEnabled(enabled) {
        this.volumeLevel = enabled ? 2 : 0;
    }
    isEnabled() {
        return this.volumeLevel > 0;
    }
    _getCtx() {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        // 브라우저 자동재생 정책: 사용자 인터랙션 후 resume
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }
    _beep(frequency, duration, baseGain = 1.0) {
        const gain = GAIN_BY_LEVEL[this.volumeLevel] * baseGain;
        if (gain <= 0)
            return;
        try {
            const ctx = this._getCtx();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
            gainNode.gain.setValueAtTime(gain, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        }
        catch {
            // 오디오 미지원 환경 무시
        }
    }
    workStart() {
        // 높은 톤 → 운동 시작!
        this._beep(880, 0.2, 1.0);
        setTimeout(() => this._beep(880, 0.15, 0.75), 250);
    }
    restStart() {
        // 낮은 톤 → 휴식
        this._beep(440, 0.3, 0.75);
    }
    tick() {
        // 카운트다운 틱
        this._beep(660, 0.1, 0.375);
    }
    complete() {
        // 완료 팡파레
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this._beep(freq, 0.3, 1.0), i * 200);
        });
    }
    countdown(remaining) {
        if (remaining <= 3 && remaining > 0) {
            this._beep(remaining === 1 ? 880 : 660, 0.15, 0.625);
        }
    }
}
