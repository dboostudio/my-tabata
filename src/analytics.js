// 📄 src/analytics.ts — GA4 이벤트 트래킹
function send(event, params) {
    if (typeof gtag === 'function') {
        gtag('event', event, params);
    }
}
export const analytics = {
    workoutStart(preset, rounds) {
        send('workout_start', { preset, rounds });
    },
    workoutComplete(rounds, durationSeconds, workDuration, restDuration) {
        send('workout_complete', { rounds, duration_seconds: durationSeconds, work_duration: workDuration, rest_duration: restDuration });
    },
    share(method) {
        send('share', { method, content_type: 'workout_result' });
    },
    presetSelect(presetId) {
        send('preset_select', { preset_id: presetId });
    },
    languageChange(lang) {
        send('language_change', { language: lang });
    },
    themeChange(theme) {
        send('theme_change', { theme });
    },
    pwaInstall() {
        send('pwa_install');
    },
};
