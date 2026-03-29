// 📄 src/storage.ts — 운동 기록 관리
const HISTORY_KEY = 'tabatago_history';
const WEEKLY_GOAL_KEY = 'tabatago_weekly_goal';
const CUSTOM_PRESETS_KEY = 'tabata_custom_presets';
const MAX_RECORDS = 100;
const MAX_CUSTOM_PRESETS = 10;
export class WorkoutStorage {
    getHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    }
    saveWorkout(record) {
        const history = this.getHistory();
        history.unshift(record);
        if (history.length > MAX_RECORDS)
            history.splice(MAX_RECORDS);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    clearHistory() {
        localStorage.removeItem(HISTORY_KEY);
    }
    getWeeklyGoal() {
        try {
            const raw = localStorage.getItem(WEEKLY_GOAL_KEY);
            if (!raw)
                return null;
            const n = Number(raw);
            if (n === 3 || n === 4 || n === 5)
                return n;
            return null;
        }
        catch {
            return null;
        }
    }
    setWeeklyGoal(goal) {
        try {
            if (goal === null) {
                localStorage.removeItem(WEEKLY_GOAL_KEY);
            }
            else {
                localStorage.setItem(WEEKLY_GOAL_KEY, String(goal));
            }
        }
        catch {
            // localStorage 미지원 환경 무시
        }
    }
    getStats() {
        const history = this.getHistory();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = history.filter(r => new Date(r.date) >= weekAgo).length;
        // 연속 운동일 계산 (오늘 운동 기록이 없으면 streak = 0)
        let streak = 0;
        const days = new Set(history.map(r => new Date(r.date).toDateString()));
        let checkDate = new Date(now);
        while (days.has(checkDate.toDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return { total: history.length, thisWeek, streak };
    }
    /** 최근 n주간 날짜별 운동 횟수 반환 */
    getHeatmapData(weeks = 8) {
        const history = this.getHistory();
        const map = new Map();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - weeks * 7);
        for (const r of history) {
            const d = new Date(r.date);
            if (d < cutoff)
                continue;
            const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return map;
    }
    // ── 커스텀 프리셋 ────────────────────────────────
    getCustomPresets() {
        try {
            const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    }
    saveCustomPreset(preset) {
        const presets = this.getCustomPresets();
        const newPreset = { ...preset, id: `custom-${Date.now()}` };
        presets.unshift(newPreset);
        if (presets.length > MAX_CUSTOM_PRESETS)
            presets.splice(MAX_CUSTOM_PRESETS);
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
        return newPreset;
    }
    deleteCustomPreset(id) {
        const presets = this.getCustomPresets().filter(p => p.id !== id);
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
    }
}
