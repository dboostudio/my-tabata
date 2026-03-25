// 📄 src/premium.ts — 프리미엄 잠금/해제 관리
const STORAGE_KEY = 'tabatago_pro';
const UNLOCK_PARAM = 'unlocked';
const UNLOCK_TOKEN = 'tabatago_pro_2024';
// Gumroad/Stripe 결제 링크 (실제 운영 시 본인 링크로 교체)
export const PURCHASE_URL = 'https://gumroad.com/l/tabatago-pro';
export class PremiumManager {
    constructor() {
        // URL 파라미터로 결제 완료 감지
        this._checkUrlUnlock();
    }
    isPro() {
        // 개발 환경에서는 Pro 기능 전체 활성화
        if (import.meta.env.DEV)
            return true;
        return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    unlock() {
        localStorage.setItem(STORAGE_KEY, 'true');
        // URL에서 파라미터 제거
        const url = new URL(window.location.href);
        url.searchParams.delete(UNLOCK_PARAM);
        window.history.replaceState({}, '', url.toString());
    }
    openPurchasePage() {
        window.open(PURCHASE_URL, '_blank');
    }
    _checkUrlUnlock() {
        const params = new URLSearchParams(window.location.search);
        if (params.get(UNLOCK_PARAM) === UNLOCK_TOKEN) {
            this.unlock();
        }
    }
}
