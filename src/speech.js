// 📄 src/speech.ts — Web Speech API 음성 안내
import { t, getCurrentLang, SPEECH_LANG } from './i18n';
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
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = SPEECH_LANG[getCurrentLang()];
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        this.synth.speak(utterance);
    }
    workStart(round, _total) {
        this._speak(t('speech.workStart', { round }));
    }
    restStart() {
        this._speak(t('speech.restStart'));
    }
    lastRound() {
        this._speak(t('speech.lastRound'));
    }
    countdown(remaining) {
        if (remaining <= 3 && remaining > 0) {
            this._speak(String(remaining));
        }
    }
    complete() {
        this._speak(t('speech.complete'));
    }
}
