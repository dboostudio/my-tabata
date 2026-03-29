// 📄 src/analytics.ts — GA4 이벤트 트래킹

declare function gtag(...args: unknown[]): void

function send(event: string, params?: Record<string, string | number>): void {
  if (typeof gtag === 'function') {
    gtag('event', event, params)
  }
}

export const analytics = {
  workoutStart(preset: string, rounds: number) {
    send('workout_start', { preset, rounds })
  },
  workoutComplete(rounds: number, durationSeconds: number, workDuration: number, restDuration: number) {
    send('workout_complete', { rounds, duration_seconds: durationSeconds, work_duration: workDuration, rest_duration: restDuration })
  },
  share(method: string) {
    send('share', { method, content_type: 'workout_result' })
  },
  presetSelect(presetId: string) {
    send('preset_select', { preset_id: presetId })
  },
  languageChange(lang: string) {
    send('language_change', { language: lang })
  },
  themeChange(theme: string) {
    send('theme_change', { theme })
  },
  pwaInstall() {
    send('pwa_install')
  },
}
