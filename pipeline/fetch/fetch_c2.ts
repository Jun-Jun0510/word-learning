/**
 * Cコーパス v2 収集(docs/proposal_c_corpus.md 承認版・修正a/b反映)。
 *
 * 構成: R(cs.RO を含む論文、クロスリスト込み)60% / L(cs.LG のみ)40%
 *   - R: submittedDate 2021〜(修正b)。半年スライスで offset 9100 制限を回避
 *   - L: 新しい順(2026→2024)。月スライス。以下を除外:
 *       * cs.RO クロスリスト(R と重複するため)
 *       * eess.AS / cs.SD(音響。sound 問題の直接対処)
 *     さらに cs.CL クロスリストは L 目標の 25% を上限(修正a)
 * 出力: corpus/C_R.jsonl / corpus/C_L.jsonl({id,title,abstract,cats})
 * 状態: corpus/c2_state.json(完了スライスを記録。再実行で続きから)
 */
import { XMLParser } from 'fast-xml-parser'
import * as fs from 'node:fs'

const R_TARGET = 45000
const L_TARGET = 30000
const CL_CAP = Math.floor(L_TARGET * 0.25)   // 修正a: cs.CL クロスリスト上限 7500
const PAGE = 1000
const DELAY_MS = 3500
const SLICE_HARD_CAP = 9000                   // arXiv API offset 制限のガード

const smoke = process.argv.includes('--smoke')
const R_OUT = 'corpus/C_R.jsonl', L_OUT = 'corpus/C_L.jsonl', STATE = 'corpus/c2_state.json'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const parser = new XMLParser({ ignoreAttributes: false })

type Entry = { id: string; title: string; abstract: string; cats: string[] }

function loadState(): { done: string[] } {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')) } catch { return { done: [] } }
}
function saveState(s: { done: string[] }) { fs.writeFileSync(STATE, JSON.stringify(s)) }

function loadIds(file: string): Set<string> {
  const ids = new Set<string>()
  if (!fs.existsSync(file)) return ids
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try { ids.add(JSON.parse(line).id) } catch { /* skip */ }
  }
  return ids
}
function countLines(file: string): number {
  if (!fs.existsSync(file)) return 0
  const t = fs.readFileSync(file, 'utf8')
  return t.length ? t.trimEnd().split('\n').length : 0
}

async function fetchPage(cat: string, from: string, to: string, start: number): Promise<Entry[] | null> {
  const q = encodeURIComponent(`cat:${cat} AND submittedDate:[${from} TO ${to}]`)
  const url = `https://export.arxiv.org/api/query?search_query=${q}&start=${start}&max_results=${PAGE}&sortBy=submittedDate&sortOrder=descending`
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'word-learning-corpus-builder (personal project)' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const doc = parser.parse(await res.text())
      let entries = doc?.feed?.entry ?? []
      if (!Array.isArray(entries)) entries = [entries]
      return entries.filter((e: any) => e?.summary && e?.id).map((e: any) => {
        let cat = e.category ?? []
        if (!Array.isArray(cat)) cat = [cat]
        return {
          id: String(e.id),
          title: String(e.title ?? '').replace(/\s+/g, ' ').trim(),
          abstract: String(e.summary ?? '').replace(/\s+/g, ' ').trim(),
          cats: cat.map((c: any) => String(c?.['@_term'] ?? '')).filter(Boolean),
        }
      })
    } catch (err) {
      console.error(`  ${cat} [${from}..${to}] start=${start} attempt ${attempt}: ${err}`)
      await sleep(DELAY_MS * attempt * 2)
    }
  }
  return null  // スライス途中失敗 → このスライスは done にしない(次回再取得)
}

/** スライスを最後まで取得し accept で通った件数を返す。失敗時 null */
async function harvestSlice(sliceKey: string, cat: string, from: string, to: string,
                            out: string, seen: Set<string>, accept: (e: Entry) => boolean): Promise<number | null> {
  let start = 0, accepted = 0
  while (start < SLICE_HARD_CAP) {
    const entries = await fetchPage(cat, from, to, start)
    if (entries === null) return null
    if (entries.length === 0) break
    const keep = entries.filter(e => !seen.has(e.id) && accept(e))
    for (const e of keep) seen.add(e.id)
    if (keep.length) fs.appendFileSync(out, keep.map(e => JSON.stringify(e)).join('\n') + '\n')
    accepted += keep.length
    start += entries.length
    if (entries.length < PAGE) break
    await sleep(DELAY_MS)
    if (smoke) break
  }
  console.log(`[${sliceKey}] +${accepted}`)
  return accepted
}

function* halfYears(fromYear: number): Generator<[string, string, string]> {
  const now = new Date(2026, 7)  // 収集基準: 2026-08
  for (let y = now.getFullYear(); y >= fromYear; y--) {
    yield [`${y}H2`, `${y}07010000`, `${y}12312359`]
    yield [`${y}H1`, `${y}01010000`, `${y}06302359`]
  }
}
function* months(fromYm: string): Generator<[string, string, string]> {
  let y = 2026, m = 8
  const [fy, fm] = [Number(fromYm.slice(0, 4)), Number(fromYm.slice(4, 6))]
  while (y > fy || (y === fy && m >= fm)) {
    const mm = String(m).padStart(2, '0')
    const last = new Date(y, m, 0).getDate()
    yield [`${y}${mm}`, `${y}${mm}010000`, `${y}${mm}${last}2359`]
    m--; if (m === 0) { m = 12; y-- }
  }
}

async function main() {
  fs.mkdirSync('corpus', { recursive: true })
  const state = loadState()
  const seenR = loadIds(R_OUT), seenL = loadIds(L_OUT)

  // ---- R: cs.RO 2021〜(半年スライス、新しい順) ----
  let rCount = countLines(R_OUT)
  console.log(`R: have=${rCount} target=${R_TARGET}`)
  for (const [key, from, to] of halfYears(2021)) {
    if (rCount >= R_TARGET) break
    const sliceKey = `R:${key}`
    if (state.done.includes(sliceKey)) continue
    const n = await harvestSlice(sliceKey, 'cs.RO', from, to, R_OUT, seenR, () => true)
    if (n === null) { console.error(`slice ${sliceKey} failed; will retry next run`) ; continue }
    rCount += n
    if (!smoke) { state.done.push(sliceKey); saveState(state) }  // smoke は部分取得なので完了扱いにしない
    if (smoke) break
  }
  if (rCount < R_TARGET) console.log(`R: ${rCount}/${R_TARGET} — 2021〜で不足。発注者報告の上、2020への遡りを判断(勝手に遡らない)`)

  // ---- L: cs.LG(cs.ROなし・音響除外・CL上限)月スライス 2026→2024 ----
  let lCount = countLines(L_OUT)
  let clCount = 0
  if (fs.existsSync(L_OUT)) {
    for (const line of fs.readFileSync(L_OUT, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { if (JSON.parse(line).cats?.includes('cs.CL')) clCount++ } catch { /* skip */ }
    }
  }
  console.log(`L: have=${lCount} target=${L_TARGET} (cs.CL: ${clCount}/${CL_CAP})`)
  const acceptL = (e: Entry) => {
    if (lCount >= L_TARGET) return false
    const c = e.cats
    if (c.includes('cs.RO') || c.includes('eess.AS') || c.includes('cs.SD')) return false
    if (c.includes('cs.CL')) {
      if (clCount >= CL_CAP) return false
      clCount++
    }
    lCount++
    return true
  }
  for (const [key, from, to] of months('202401')) {
    if (lCount >= L_TARGET) break
    const sliceKey = `L:${key}`
    if (state.done.includes(sliceKey)) continue
    const n = await harvestSlice(sliceKey, 'cs.LG', from, to, L_OUT, seenL, acceptL)
    if (n === null) { console.error(`slice ${sliceKey} failed; will retry next run`); continue }
    if (!smoke) { state.done.push(sliceKey); saveState(state) }
    if (smoke) break
  }

  console.log(`done. R=${countLines(R_OUT)} L=${countLines(L_OUT)} (cs.CL in L: ${clCount}/${CL_CAP})`)
}

await main()
