// 📄 src/storage.ts — 운동 기록 관리 (Pro 기능)

const HISTORY_KEY = 'tabatago_history'
const WEEKLY_GOAL_KEY = 'tabatago_weekly_goal'
const MAX_RECORDS = 100

export type WeeklyGoal = 3 | 4 | 5 | null

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

  getStats(): { total: number; thisWeek: number; streak: number } {
    const history = this.getHistory()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const thisWeek = history.filter(r => new Date(r.date) >= weekAgo).length

    // 연속 운동일 계산 (오늘 운동 기록이 없으면 streak = 0)
    let streak = 0
    const days = new Set(history.map(r => new Date(r.date).toDateString()))
    let checkDate = new Date(now)
    while (days.has(checkDate.toDateString())) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return { total: history.length, thisWeek, streak }
  }
}
