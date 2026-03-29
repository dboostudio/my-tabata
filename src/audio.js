// 📄 src/audio.ts — Web Audio API 비프음
const GAIN_BY_LEVEL = {
    0: 0,
    1: 0.15,
    2: 0.4,
};
const AudioCtx = window.AudioContext || window.webkitAudioContext;
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
    /** 유저 제스처(클릭/탭) 시 호출하여 AudioContext를 미리 생성·resume */
    ensureContext() {
        this._getCtx();
    }
    _getCtx() {
        if (!AudioCtx)
            return null;
        if (!this.ctx) {
            try {
                this.ctx = new AudioCtx();
            }
            catch {
                return null;
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => { });
        }
        return this.ctx;
    }
    _beep(frequency, duration, baseGain = 1.0) {
        const gain = GAIN_BY_LEVEL[this.volumeLevel] * baseGain;
        if (gain <= 0)
            return;
        try {
            const ctx = this._getCtx();
            if (!ctx)
                return;
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
        this._beep(880, 0.2, 1.0);
        setTimeout(() => this._beep(880, 0.15, 0.75), 250);
    }
    restStart() {
        this._beep(440, 0.3, 0.75);
    }
    tick() {
        this._beep(660, 0.1, 0.375);
    }
    complete() {
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
