// 📄 src/storage.ts — 운동 기록 관리

const HISTORY_KEY = 'tabatago_history'
const WEEKLY_GOAL_KEY = 'tabatago_weekly_goal'
const CUSTOM_PRESETS_KEY = 'tabata_custom_presets'
const MAX_RECORDS = 100
const MAX_CUSTOM_PRESETS = 10

export type WeeklyGoal = 3 | 4 | 5 | null

export interface CustomPreset {
  id: string
  name: string
  workDuration: number
  restDuration: number
  totalRounds: number
}

export interface WorkoutRecord {
  date: string          // ISO 8601
  rounds: number
  workDuration: number
  restDuration: number
  durationSeconds: number  // 총 소요 시간
}

export class WorkoutStorage {
  getHistory(): WorkoutRecord[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      return raw ? (JSON.parse(raw) as WorkoutRecord[]) : []
    } catch {
      return []
    }
  }

  saveWorkout(record: WorkoutRecord): void {
    const history = this.getHistory()
    history.unshift(record)
    if (history.length > MAX_RECORDS) history.splice(MAX_RECORDS)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }

  clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY)
  }

  getWeeklyGoal(): WeeklyGoal {
    try {
      const raw = localStorage.getItem(WEEKLY_GOAL_KEY)
      if (!raw) return null
      const n = Number(raw)
      if (n === 3 || n === 4 || n === 5) return n
      return null
    } catch {
      return null
    }
  }

  setWeeklyGoal(goal: WeeklyGoal): void {
    try {
      if (goal === null) {
        localStorage.removeItem(WEEKLY_GOAL_KEY)
      } else {
        localStorage.setItem(WEEKLY_GOAL_KEY, String(goal))
      }
    } catch {
      // localStorage 미지원 환경 무시
    }
  }

  getStats(): {
    total: number; thisWeek: number; streak: number;
    totalMinutes: number; avgMinutes: number; bestStreak: number; maxRounds: number
  } {
    const history = this.getHistory()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const thisWeek = history.filter(r => new Date(r.date) >= weekAgo).length

    // 연속 운동일 계산
    let streak = 0
    const days = new Set(history.map(r => new Date(r.date).toDateString()))
    let checkDate = new Date(now)
    while (days.has(checkDate.toDateString())) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // 총 운동 시간 (분)
    const totalSeconds = history.reduce((sum, r) => sum + r.durationSeconds, 0)
    const totalMinutes = Math.round(totalSeconds / 60)

    // 평균 운동 시간 (분)
    const avgMinutes = history.length > 0 ? Math.round(totalSeconds / history.length / 60) : 0

    // 최장 스트릭 (역대)
    let bestStreak = 0
    if (history.length > 0) {
      const sortedDays = [...new Set(history.map(r => new Date(r.date).toDateString()))]
        .map(d => new Date(d).getTime()).sort((a, b) => a - b)
      let run = 1
      for (let i = 1; i < sortedDays.length; i++) {
        const diff = (sortedDays[i]! - sortedDays[i - 1]!) / (24 * 60 * 60 * 1000)
        if (diff <= 1.5) { run++; bestStreak = Math.max(bestStreak, run) }
        else run = 1
      }
      bestStreak = Math.max(bestStreak, run)
    }

    // 최다 라운드
    const maxRounds = history.length > 0 ? Math.max(...history.map(r => r.rounds)) : 0

    return { total: history.length, thisWeek, streak, totalMinutes, avgMinutes, bestStreak, maxRounds }
  }

  /** 최근 n주간 날짜별 운동 횟수 반환 */
  getHeatmapData(weeks = 8): Map<string, number> {
    const history = this.getHistory()
    const map = new Map<string, number>()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - weeks * 7)

    for (const r of history) {
      const d = new Date(r.date)
      if (d < cutoff) continue
      const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }

  // ── 커스텀 프리셋 ────────────────────────────────

  getCustomPresets(): CustomPreset[] {
    try {
      const raw = localStorage.getItem(CUSTOM_PRESETS_KEY)
      return raw ? (JSON.parse(raw) as CustomPreset[]) : []
    } catch {
      return []
    }
  }

  saveCustomPreset(preset: Omit<CustomPreset, 'id'>): CustomPreset {
    const presets = this.getCustomPresets()
    const newPreset: CustomPreset = { ...preset, id: `custom-${Date.now()}` }
    presets.unshift(newPreset)
    if (presets.length > MAX_CUSTOM_PRESETS) presets.splice(MAX_CUSTOM_PRESETS)
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
    return newPreset
  }

  deleteCustomPreset(id: string): void {
    const presets = this.getCustomPresets().filter(p => p.id !== id)
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
  }
}
