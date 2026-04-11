// 📄 src/ads.ts — AdSense 광고 관리

const AD_CLIENT = 'ca-pub-1826213634854387'

declare const adsbygoogle: { push(params: Record<string, unknown>): void }[]

let adsenseLoaded = false

/** AdSense 스크립트 로드 (첫 호출 시 1회만) */
function ensureAdsenseScript(): void {
  if (adsenseLoaded) return
  adsenseLoaded = true
  const script = document.createElement('script')
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`
  script.async = true
  script.crossOrigin = 'anonymous'
  document.head.appendChild(script)
}

/** 광고 슬롯을 DOM 요소에 삽입 (innerHTML 아님, DOM API) */
export function insertAd(container: HTMLElement, options: {
  slot: string
  format?: 'auto' | 'rectangle' | 'horizontal'
  style?: string
}): void {
  // 오프라인이면 스킵
  if (!navigator.onLine) return

  ensureAdsenseScript()

  const wrapper = document.createElement('div')
  wrapper.className = 'ad-container'

  const ins = document.createElement('ins')
  ins.className = 'adsbygoogle'
  ins.style.cssText = options.style || 'display:block'
  ins.dataset['adClient'] = AD_CLIENT
  ins.dataset['adSlot'] = options.slot
  ins.dataset['adFormat'] = options.format || 'auto'
  ins.dataset['fullWidthResponsive'] = 'true'

  wrapper.appendChild(ins)
  container.appendChild(wrapper)

  try {
    ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
    ;(window as any).adsbygoogle.push({})
  } catch {
    // 광고 로드 실패 — 컨테이너 제거
    wrapper.remove()
  }

  // 광고 미채워지면 빈 공간 제거 (2초 후 체크)
  setTimeout(() => {
    if (ins.offsetHeight === 0) wrapper.remove()
  }, 3000)
}
