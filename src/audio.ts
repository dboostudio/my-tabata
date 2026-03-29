// 📄 src/audio.ts — Web Audio API 비프음

// 0 = off, 1 = low (0.15), 2 = high (0.4)
export type VolumeLevel = 0 | 1 | 2

const GAIN_BY_LEVEL: Record<VolumeLevel, number> = {
  0: 0,
  1: 0.15,
  2: 0.4,
}

const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

export class AudioManager {
  private ctx: AudioContext | null = null
  private volumeLevel: VolumeLevel = 2  // default: high

  setVolume(level: VolumeLevel): void {
    this.volumeLevel = level
  }

  getVolume(): VolumeLevel {
    return this.volumeLevel
  }

  // Legacy compatibility: setEnabled(false) → level 0, setEnabled(true) → level 2
  setEnabled(enabled: boolean): void {
    this.volumeLevel = enabled ? 2 : 0
  }

  isEnabled(): boolean {
    return this.volumeLevel > 0
  }

  /** 유저 제스처(클릭/탭) 시 호출하여 AudioContext를 미리 생성·resume */
  ensureContext(): void {
    this._getCtx()
  }

  private _getCtx(): AudioContext | null {
    if (!AudioCtx) return null
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx()
      } catch {
        return null
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private _beep(frequency: number, duration: number, baseGain = 1.0): void {
    const gain = GAIN_BY_LEVEL[this.volumeLevel] * baseGain
    if (gain <= 0) return
    try {
      const ctx = this._getCtx()
      if (!ctx) return
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

      gainNode.gain.setValueAtTime(gain, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // 오디오 미지원 환경 무시
    }
  }

  workStart(): void {
    this._beep(880, 0.2, 1.0)
    setTimeout(() => this._beep(880, 0.15, 0.75), 250)
  }

  restStart(): void {
    this._beep(440, 0.3, 0.75)
  }

  tick(): void {
    this._beep(660, 0.1, 0.375)
  }

  complete(): void {
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => this._beep(freq, 0.3, 1.0), i * 200)
    })
  }

  countdown(remaining: number): void {
    if (remaining <= 3 && remaining > 0) {
      this._beep(remaining === 1 ? 880 : 660, 0.15, 0.625)
    }
  }
}
