// 📄 src/speech.ts — Web Speech API 음성 안내 (Pro 기능)
export class SpeechManager {
    constructor() {
        this.synth = null;
        this.enabled = true;
        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
        }
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    _speak(text) {
        if (!this.synth || !this.enabled)
            return;
        this.synth.cancel(); // 이전 발화 취소
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        this.synth.speak(utterance);
    }
    workStart(round, _total) {
        this._speak(`${round}라운드. 운동 시작!`);
    }
    restStart() {
        this._speak('휴식!');
    }
    lastRound() {
        this._speak('마지막 라운드!');
    }
    countdown(remaining) {
        if (remaining <= 3 && remaining > 0) {
            this._speak(String(remaining));
        }
    }
    complete() {
        this._speak('운동 완료! 수고하셨습니다!');
    }
}
