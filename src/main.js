// 📄 src/main.ts — 앱 초기화 및 UI 바인딩
import { TabataTimer, DEFAULT_CONFIG } from './timer';
import { AudioManager } from './audio';
import { SpeechManager } from './speech';
import { PremiumManager } from './premium';
import { WorkoutStorage } from './storage';
import { PRESETS } from './presets';
// ── DOM 요소 ────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const timerCircle = document.querySelector('#timer-circle');
const timerNumber = $('#timer-number');
const phaseLabel = $('#phase-label');
const roundLabel = $('#round-label');
const roundDots = $('#round-dots');
const btnStart = $('#btn-start');
const btnReset = $('#btn-reset');
const settingsPanel = $('#settings-panel');
const btnSettings = $('#btn-settings');
const btnClose = $('#btn-close-settings');
const historyPanel = $('#history-panel');
const btnHistory = $('#btn-history');
const btnCloseHistory = $('#btn-close-history');
const historyList = $('#history-list');
const proModal = $('#pro-modal');
const btnBuyPro = $('#btn-buy-pro');
const btnClosePro = $('#btn-close-pro');
const presetGrid = $('#preset-grid');
const inputWork = $('#input-work');
const inputRest = $('#input-rest');
const inputRounds = $('#input-rounds');
const btnApplyConfig = $('#btn-apply-config');
const btnVoice = $('#btn-voice');
const statsTotal = $('#stats-total');
const statsWeek = $('#stats-week');
const statsStreak = $('#stats-streak');
// ── 서비스 인스턴스 ───────────────────────────────────────
const timer = new TabataTimer(DEFAULT_CONFIG);
const audio = new AudioManager();
const speech = new SpeechManager();
const premium = new PremiumManager();
const storage = new WorkoutStorage();
// ── 상태 ─────────────────────────────────────────────────
let voiceEnabled = false;
let workoutStartTime = null;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 54; // r=54
// ── Wake Lock ────────────────────────────────────────────
let wakeLock = null;
async function acquireWakeLock() {
    if (!('wakeLock' in navigator))
        return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
    catch {
        // 권한 거부 또는 미지원 — 조용히 무시
    }
}
function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().catch(() => { });
        wakeLock = null;
    }
}
// ── 페이지 비가시성 처리 ─────────────────────────────────
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // 탭이 백그라운드로: 실행 중이면 자동 일시정지
        const state = timer.getState();
        if (state.isRunning) {
            timer.pause();
            stopCircleAnimation();
            btnStart.textContent = '재개';
        }
    }
    else {
        // 탭이 포어그라운드로: Wake Lock 재획득 (실행 중이던 경우)
        const state = timer.getState();
        if (!state.isRunning && state.phase !== 'idle' && state.phase !== 'complete') {
            // 일시정지 상태 유지 (자동 재개하지 않음 — QA 결정)
        }
        const running = timer.getState().isRunning;
        if (running) {
            acquireWakeLock();
        }
    }
});
// ── 탭 타이틀 업데이트 ───────────────────────────────────
const DEFAULT_TITLE = 'TabataGo — 타바타 타이머';
function updateTabTitle(phase, timeRemaining) {
    switch (phase) {
        case 'work':
            document.title = `운동! ${timeRemaining}s | TabataGo`;
            break;
        case 'rest':
            document.title = `휴식 ${timeRemaining}s | TabataGo`;
            break;
        case 'countdown':
            document.title = `준비 ${timeRemaining}s | TabataGo`;
            break;
        case 'complete':
            document.title = '완료! 🎉 | TabataGo';
            break;
        default:
            document.title = DEFAULT_TITLE;
    }
}
// ── 키보드 단축키 ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    // 입력 필드에 포커스된 경우 단축키 무시
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
        return;
    switch (e.key) {
        case ' ':
        case 'Spacebar':
            e.preventDefault();
            btnStart.click();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            btnReset.click();
            break;
        case 'Escape':
            settingsPanel.classList.remove('open');
            historyPanel.classList.remove('open');
            proModal.classList.remove('open');
            break;
    }
});
// ── rAF 기반 원형 프로그레스 애니메이션 (60fps) ──────────
let rafId = null;
function setCircleOffset(remaining, total) {
    const progress = total > 0 ? remaining / total : 1;
    timerCircle.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE * (1 - progress));
}
function startCircleAnimation(remainingSeconds, totalSeconds) {
    if (rafId !== null)
        cancelAnimationFrame(rafId);
    const startTime = performance.now();
    function frame(now) {
        const elapsed = (now - startTime) / 1000;
        const remaining = Math.max(0, remainingSeconds - elapsed);
        setCircleOffset(remaining, totalSeconds);
        if (remaining > 0)
            rafId = requestAnimationFrame(frame);
        else
            rafId = null;
    }
    rafId = requestAnimationFrame(frame);
}
function stopCircleAnimation() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}
// 페이즈 전환: 빈 원으로 즉시 스냅 후 새 페이즈 채우기 시작
function resetCircleForPhase(remaining, total) {
    stopCircleAnimation();
    timerCircle.style.strokeDashoffset = String(CIRCLE_CIRCUMFERENCE);
    requestAnimationFrame(() => startCircleAnimation(remaining, total));
}
function getPhaseDuration(config, phase) {
    switch (phase) {
        case 'countdown': return config.countdownDuration;
        case 'work': return config.workDuration;
        case 'rest': return config.restDuration;
        default: return 1;
    }
}
// ── 페이즈 전환 펄스 애니메이션 ─────────────────────────
function triggerRingPulse() {
    timerCircle.classList.remove('ring-pulse');
    // 리플로우를 강제하여 애니메이션이 재실행되도록
    void timerCircle.offsetWidth;
    timerCircle.classList.add('ring-pulse');
    timerCircle.addEventListener('animationend', () => {
        timerCircle.classList.remove('ring-pulse');
    }, { once: true });
}
// ── 라운드 도트 렌더링 ────────────────────────────────────
function renderRoundDots(current, total) {
    roundDots.innerHTML = Array.from({ length: total }, (_, i) => `<span class="dot ${i === current - 1 ? 'active' : i < current - 1 ? 'done' : ''}"></span>`).join('');
}
// ── 타이머 이벤트 처리 ────────────────────────────────────
timer.on(event => {
    const state = timer.getState();
    if (event.type === 'PHASE_CHANGE') {
        const { phase, round } = event;
        // 페이즈별 UI 색상·레이블
        const phaseMap = {
            idle: { label: '준비', color: 'var(--color-idle)' },
            countdown: { label: '준비', color: 'var(--color-countdown)' },
            work: { label: '운동!', color: 'var(--color-work)' },
            rest: { label: '휴식', color: 'var(--color-rest)' },
            complete: { label: '완료! 🎉', color: 'var(--color-complete)' },
        };
        const { label, color } = phaseMap[phase];
        phaseLabel.textContent = label;
        document.documentElement.style.setProperty('--phase-color', color);
        // 라운드 표시
        if (phase === 'work' || phase === 'rest') {
            roundLabel.textContent = `${round} / ${state.config.totalRounds}`;
            renderRoundDots(round, state.config.totalRounds);
        }
        else if (phase === 'idle') {
            roundLabel.textContent = `0 / ${state.config.totalRounds}`;
            renderRoundDots(0, state.config.totalRounds);
        }
        // 초기 숫자 표시 (complete는 COMPLETE 이벤트에서 처리)
        if (phase !== 'complete') {
            timerNumber.textContent = String(state.timeRemaining);
            resetCircleForPhase(state.timeRemaining, getPhaseDuration(state.config, phase));
        }
        // 페이즈 전환 시 링 펄스 애니메이션 (idle 제외)
        if (phase !== 'idle') {
            triggerRingPulse();
        }
        // 탭 타이틀 업데이트
        updateTabTitle(phase, state.timeRemaining);
        // 오디오
        if (phase === 'work')
            audio.workStart();
        if (phase === 'rest')
            audio.restStart();
        // 음성 안내 (Pro)
        if (voiceEnabled && premium.isPro()) {
            if (phase === 'work') {
                if (round === state.config.totalRounds)
                    speech.lastRound();
                else
                    speech.workStart(round, state.config.totalRounds);
            }
            if (phase === 'rest')
                speech.restStart();
        }
        // 운동 시작 시간 기록
        if (phase === 'work' && round === 1)
            workoutStartTime = new Date();
        // 버튼 상태
        btnStart.textContent = phase === 'complete' ? '다시 시작' : '일시정지';
    }
    if (event.type === 'TICK') {
        const { phase, timeRemaining } = state;
        timerNumber.textContent = String(timeRemaining);
        // 탭 타이틀 업데이트
        updateTabTitle(phase, timeRemaining);
        // 카운트다운 틱음
        if (phase === 'countdown') {
            audio.countdown(timeRemaining);
            if (voiceEnabled && premium.isPro())
                speech.countdown(timeRemaining);
        }
    }
    if (event.type === 'COMPLETE') {
        audio.complete();
        if (voiceEnabled && premium.isPro())
            speech.complete();
        timerNumber.textContent = '🎉';
        btnStart.textContent = '다시 시작';
        updateTabTitle('complete', 0);
        releaseWakeLock();
        // 운동 기록 저장 (Pro)
        if (premium.isPro() && workoutStartTime) {
            const { config } = state;
            storage.saveWorkout({
                date: new Date().toISOString(),
                rounds: config.totalRounds,
                workDuration: config.workDuration,
                restDuration: config.restDuration,
                durationSeconds: Math.round((Date.now() - workoutStartTime.getTime()) / 1000),
            });
        }
        workoutStartTime = null;
    }
});
// ── 버튼 이벤트 ───────────────────────────────────────────
btnStart.addEventListener('click', () => {
    const state = timer.getState();
    if (state.phase === 'complete' || state.phase === 'idle') {
        timer.reset();
        timer.start();
        acquireWakeLock();
    }
    else if (state.isRunning) {
        timer.pause();
        stopCircleAnimation();
        btnStart.textContent = '재개';
        releaseWakeLock();
    }
    else {
        timer.resume();
        const s = timer.getState();
        startCircleAnimation(s.timeRemaining, getPhaseDuration(s.config, s.phase));
        btnStart.textContent = '일시정지';
        acquireWakeLock();
    }
});
btnReset.addEventListener('click', () => {
    timer.reset();
    stopCircleAnimation();
    releaseWakeLock();
    const cfg = timer.getState().config;
    timerNumber.textContent = String(cfg.workDuration);
    phaseLabel.textContent = '준비';
    roundLabel.textContent = `0 / ${cfg.totalRounds}`;
    btnStart.textContent = '시작';
    document.documentElement.style.setProperty('--phase-color', 'var(--color-idle)');
    setCircleOffset(1, 1);
    document.title = DEFAULT_TITLE;
});
// 설정 패널
btnSettings.addEventListener('click', () => settingsPanel.classList.add('open'));
btnClose.addEventListener('click', () => settingsPanel.classList.remove('open'));
// 기록 패널 (Pro)
btnHistory.addEventListener('click', () => {
    if (!premium.isPro()) {
        proModal.classList.add('open');
        return;
    }
    renderHistory();
    historyPanel.classList.add('open');
});
btnCloseHistory.addEventListener('click', () => historyPanel.classList.remove('open'));
// 소리 토글 (비프음 항상 + 음성 안내는 Pro)
btnVoice.addEventListener('click', () => {
    const soundOn = !audio.isEnabled();
    audio.setEnabled(soundOn);
    // 음성 안내는 Pro 전용
    if (premium.isPro()) {
        voiceEnabled = soundOn;
        speech.setEnabled(soundOn);
    }
    btnVoice.textContent = soundOn ? '🔈' : '🔇';
    btnVoice.classList.toggle('active', soundOn);
    btnVoice.title = soundOn ? '소리 켜짐' : '소리 꺼짐';
});
// Pro 모달
btnBuyPro.addEventListener('click', () => premium.openPurchasePage());
btnClosePro.addEventListener('click', () => proModal.classList.remove('open'));
// 설정 적용 (Pro: 커스텀 인터벌)
btnApplyConfig.addEventListener('click', () => {
    if (!premium.isPro()) {
        proModal.classList.add('open');
        return;
    }
    const config = {
        workDuration: Math.max(5, Math.min(300, Number(inputWork.value) || 20)),
        restDuration: Math.max(3, Math.min(120, Number(inputRest.value) || 10)),
        totalRounds: Math.max(1, Math.min(20, Number(inputRounds.value) || 8)),
        countdownDuration: 3,
    };
    timer.reset();
    timer.updateConfig(config);
    roundLabel.textContent = `0 / ${config.totalRounds}`;
    renderRoundDots(0, config.totalRounds);
    btnStart.textContent = '시작';
    settingsPanel.classList.remove('open');
});
// ── 프리셋 렌더링 (Pro) ───────────────────────────────────
function renderPresets() {
    const freeId = 'tabata-classic';
    presetGrid.innerHTML = PRESETS.map(p => {
        const locked = !premium.isPro() && p.id !== freeId;
        return `
    <button class="preset-btn"
            data-id="${p.id}"
            ${locked ? 'data-locked="true"' : ''}
            title="${p.description}">
      <div class="preset-header">
        <span class="preset-emoji">${p.emoji}</span>
        <span class="preset-name">${p.name}</span>
        ${locked ? '<span class="lock-icon">🔒</span>' : ''}
      </div>
      <span class="preset-description">${p.description}</span>
    </button>`;
    }).join('');
    presetGrid.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset['locked']) {
                proModal.classList.add('open');
                return;
            }
            const preset = PRESETS.find(p => p.id === btn.dataset['id']);
            if (!preset)
                return;
            // 커스텀: 설정 섹션으로 스크롤 이동
            if (preset.id === 'custom') {
                document.querySelector('.section:has(#btn-apply-config)')?.scrollIntoView({ behavior: 'smooth' });
                return;
            }
            timer.reset();
            timer.updateConfig(preset.config);
            inputWork.value = String(preset.config.workDuration);
            inputRest.value = String(preset.config.restDuration);
            inputRounds.value = String(preset.config.totalRounds);
            roundLabel.textContent = `0 / ${preset.config.totalRounds}`;
            renderRoundDots(0, preset.config.totalRounds);
            btnStart.textContent = '시작';
            settingsPanel.classList.remove('open');
        });
    });
}
// ── 기록 렌더링 ───────────────────────────────────────────
function renderHistory() {
    const stats = storage.getStats();
    statsTotal.textContent = String(stats.total);
    statsWeek.textContent = String(stats.thisWeek);
    statsStreak.textContent = String(stats.streak);
    const history = storage.getHistory().slice(0, 20);
    historyList.innerHTML = history.length === 0
        ? '<p class="empty-history">아직 완료한 운동이 없습니다.</p>'
        : history.map(r => {
            const date = new Date(r.date);
            const mins = Math.floor(r.durationSeconds / 60);
            const secs = r.durationSeconds % 60;
            return `
          <div class="history-item">
            <span class="history-date">${date.toLocaleDateString('ko-KR')}</span>
            <span class="history-detail">${r.workDuration}/${r.restDuration}초 × ${r.rounds}라운드</span>
            <span class="history-duration">${mins}:${String(secs).padStart(2, '0')}</span>
          </div>`;
        }).join('');
}
// ── Pro 배지 표시 ─────────────────────────────────────────
function updateProUI() {
    const isPro = premium.isPro();
    document.querySelectorAll('.pro-badge').forEach(el => {
        el.style.display = isPro ? 'none' : 'inline';
    });
    if (isPro) {
        document.querySelectorAll('[data-locked]').forEach(el => {
            el.removeAttribute('data-locked');
            el.querySelector('.lock-icon')?.remove();
        });
    }
}
// ── 초기화 ───────────────────────────────────────────────
function init() {
    // 초기 원형 프로그레스 설정
    timerCircle.style.strokeDasharray = String(CIRCLE_CIRCUMFERENCE);
    timerCircle.style.strokeDashoffset = String(0);
    setCircleOffset(1, 1);
    // 초기값 표시
    const cfg = timer.getState().config;
    timerNumber.textContent = String(cfg.workDuration);
    roundLabel.textContent = `0 / ${cfg.totalRounds}`;
    inputWork.value = String(cfg.workDuration);
    inputRest.value = String(cfg.restDuration);
    inputRounds.value = String(cfg.totalRounds);
    renderRoundDots(0, cfg.totalRounds);
    renderPresets();
    updateProUI();
}
init();
