// 📄 src/google-sheets.ts — Google Sheets 운동기록 연동

const CLIENT_ID = '74843422306-l7akjfdh93oh830fent5c0e54c3o02s9.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const SHEET_NAME = 'MyTabata Workouts'
const SPREADSHEET_KEY = 'tabata_spreadsheet_id'
const TOKEN_KEY = 'tabata_gtoken'

interface TokenResponse {
  access_token: string
  expires_in: number
}

let accessToken: string | null = null
let tokenClient: unknown = null

// ── GIS 스크립트 로드 ──────────────────────────────────
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('GIS load failed'))
    document.head.appendChild(script)
  })
}

// ── 로그인 ─────────────────────────────────────────────
export async function signIn(): Promise<boolean> {
  await loadGisScript()
  return new Promise((resolve) => {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: TokenResponse) => {
        if (resp.access_token) {
          accessToken = resp.access_token
          try { localStorage.setItem(TOKEN_KEY, accessToken) } catch {}
          resolve(true)
        } else {
          resolve(false)
        }
      },
    });
    (tokenClient as any).requestAccessToken()
  })
}

// ── 로그아웃 ───────────────────────────────────────────
export function signOut(): void {
  if (accessToken) {
    (window as any).google?.accounts?.oauth2?.revoke?.(accessToken)
  }
  accessToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SPREADSHEET_KEY)
  } catch {}
}

// ── 로그인 상태 ────────────────────────────────────────
export function isSignedIn(): boolean {
  if (accessToken) return true
  try {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) { accessToken = saved; return true }
  } catch {}
  return false
}

// ── Sheets API 헬퍼 ────────────────────────────────────
async function sheetsApi(path: string, options: RequestInit = {}): Promise<any> {
  if (!accessToken) throw new Error('Not signed in')
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (resp.status === 401) {
    // 토큰 만료
    accessToken = null
    try { localStorage.removeItem(TOKEN_KEY) } catch {}
    throw new Error('Token expired')
  }
  return resp.json()
}

// ── 스프레드시트 생성 or 가져오기 ──────────────────────
async function getOrCreateSpreadsheet(): Promise<string> {
  try {
    const saved = localStorage.getItem(SPREADSHEET_KEY)
    if (saved) {
      // 존재 확인
      await sheetsApi(`/${saved}?fields=spreadsheetId`)
      return saved
    }
  } catch {}

  // 새로 생성
  const data = await sheetsApi('', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: SHEET_NAME },
      sheets: [{
        properties: { title: 'Workouts' },
        data: [{
          startRow: 0, startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Date' } },
              { userEnteredValue: { stringValue: 'Preset' } },
              { userEnteredValue: { stringValue: 'Work (s)' } },
              { userEnteredValue: { stringValue: 'Rest (s)' } },
              { userEnteredValue: { stringValue: 'Rounds' } },
              { userEnteredValue: { stringValue: 'Duration (s)' } },
              { userEnteredValue: { stringValue: 'Est. kcal' } },
            ]
          }]
        }]
      }]
    }),
  })
  const id = data.spreadsheetId
  try { localStorage.setItem(SPREADSHEET_KEY, id) } catch {}
  return id
}

// ── 캐시 ───────────────────────────────────────────────
let cachedRows: WorkoutRow[] | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5분

function invalidateCache(): void {
  cachedRows = null
  cacheTime = 0
}

// ── 운동 기록 추가 ─────────────────────────────────────
export interface WorkoutRow {
  date: string
  presetName: string
  workDuration: number
  restDuration: number
  rounds: number
  durationSeconds: number
}

export async function appendWorkout(row: WorkoutRow): Promise<boolean> {
  if (!accessToken) return false
  try {
    const sheetId = await getOrCreateSpreadsheet()
    const kcal = Math.round(row.durationSeconds / 60 * 8)
    await sheetsApi(`/${sheetId}/values/Workouts!A:G:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      body: JSON.stringify({
        values: [[
          row.date,
          row.presetName,
          row.workDuration,
          row.restDuration,
          row.rounds,
          row.durationSeconds,
          kcal,
        ]]
      }),
    })
    invalidateCache()
    return true
  } catch {
    return false
  }
}

// ── 시트에서 전체 기록 불러오기 (캐시 포함) ──────────────
export async function fetchWorkouts(forceRefresh = false): Promise<WorkoutRow[]> {
  if (!accessToken) return []
  if (!forceRefresh && cachedRows && Date.now() - cacheTime < CACHE_TTL) return cachedRows
  try {
    const sheetId = await getOrCreateSpreadsheet()
    const data = await sheetsApi(`/${sheetId}/values/Workouts!A2:G1000`)
    const rows: WorkoutRow[] = (data.values || []).map((r: string[]) => ({
      date: r[0] || '',
      presetName: r[1] || '',
      workDuration: Number(r[2]) || 0,
      restDuration: Number(r[3]) || 0,
      rounds: Number(r[4]) || 0,
      durationSeconds: Number(r[5]) || 0,
    }))
    cachedRows = rows
    cacheTime = Date.now()
    return rows
  } catch {
    return []
  }
}
