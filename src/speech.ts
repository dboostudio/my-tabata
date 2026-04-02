// 📄 src/speech.ts — Web Speech API 음성 안내

import { t, getCurrentLang, SPEECH_LANG } from './i18n'

export class SpeechManager {
  private synth: SpeechSynthesis | null = null
  private enabled = true

  constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  private _speak(text: string): void {
    if (!this.synth || !this.enabled) return
    this.synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LANG[getCurrentLang()]
    utterance.rate = 1.1
    utterance.pitch = 1.0
    utterance.volume = 0.9
    this.synth.speak(utterance)
  }

  workStart(round: number, _total: number): void {
    this._speak(t('speech.workStart', { round }))
  }

  restStart(): void {
    this._speak(t('speech.restStart'))
  }

  lastRound(): void {
    this._speak(t('speech.lastRound'))
  }

  halfway(): void {
    this._speak(t('speech.halfway'))
  }

  countdown(remaining: number): void {
    if (remaining <= 3 && remaining > 0) {
      this._speak(String(remaining))
    }
  }

  complete(): void {
    this._speak(t('speech.complete'))
  }
}
