// 📄 src/speech.ts — Web Speech API 음성 안내 (Pro 기능)

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
    this.synth.cancel() // 이전 발화 취소
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.rate = 1.1
    utterance.pitch = 1.0
    utterance.volume = 0.9
    this.synth.speak(utterance)
  }

  workStart(round: number, _total: number): void {
    this._speak(`${round}라운드. 운동 시작!`)
  }

  restStart(): void {
    this._speak('휴식!')
  }

  lastRound(): void {
    this._speak('마지막 라운드!')
  }

  countdown(remaining: number): void {
    if (remaining <= 3 && remaining > 0) {
      this._speak(String(remaining))
    }
  }

  complete(): void {
    this._speak('운동 완료! 수고하셨습니다!')
  }
}
