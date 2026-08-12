/**
 * arXiv abstract harvester (arXiv API / Atom).
 *
 * profile C: 分野コーパス cs.RO + cs.LG
 * profile B: 学術一般コーパス。arXiv全分野からのサンプルだが、
 *   - cs.RO / cs.LG は除外(B が C を包含すると keyness が汚染される。algorithm.md §5)
 *   - ML隣接カテゴリ(cs.AI, cs.CV, cs.CL, cs.NE, stat.ML, eess.IV)も除外
 *     (L3語の分野語義が B に混入すると keynessC / senseShiftC が鈍る)
 *   カテゴリ選定は分野バランス重視の判断であり、リストは下記 B_CATS が正。
 *
 * 出力: corpus/<profile>_<cat>.jsonl(1行 = {id, cat, title, abstract})
 * 再実行時は既存行数ぶんスキップして続きから取得(粗い resume)。
 * arXiv API 作法: 1リクエスト1000件、リクエスト間 3.5s 待機。
 */
import { XMLParser } from 'fast-xml-parser'
import * as fs from 'node:fs'
import * as path from 'node:path'

const C_CATS: Array<[string, number]> = [
  ['cs.LG', 30000],
  ['cs.RO', 15000],
]
const B_CATS: Array<[string, number]> = [
  ['astro-ph.GA', 2500], ['cond-mat.stat-mech', 2500], ['hep-th', 2500],
  ['math.AP', 2500], ['math.PR', 2500], ['math.CO', 2500], ['math.NT', 2500],
  ['physics.flu-dyn', 2500], ['physics.optics', 2500], ['quant-ph', 2500],
  ['q-bio.PE', 2500], ['q-bio.NC', 2500], ['econ.GN', 2500], ['stat.ME', 2500],
  ['cs.DS', 2500], ['cs.CR', 2500],
]

const PAGE = 1000
const DELAY_MS = 3500
const OUT_DIR = 'corpus'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const parser = new XMLParser({ ignoreAttributes: false })

function countLines(file: string): number {
  if (!fs.existsSync(file)) return 0
  const txt = fs.readFileSync(file, 'utf8')
  return txt.length === 0 ? 0 : txt.trimEnd().split('\n').length
}

async function fetchPage(cat: string, start: number): Promise<Array<{ id: string; title: string; abstract: string }>> {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${cat}&start=${start}&max_results=${PAGE}&sortBy=submittedDate&sortOrder=descending`
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'word-learning-corpus-builder (personal project)' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const doc = parser.parse(xml)
      let entries = doc?.feed?.entry ?? []
      if (!Array.isArray(entries)) entries = [entries]
      return entries
        .filter((e: any) => e?.summary && e?.id)
        .map((e: any) => ({
          id: String(e.id),
          title: String(e.title ?? '').replace(/\s+/g, ' ').trim(),
          abstract: String(e.summary ?? '').replace(/\s+/g, ' ').trim(),
        }))
    } catch (err) {
      console.error(`  ${cat} start=${start} attempt ${attempt} failed: ${err}`)
      await sleep(DELAY_MS * attempt * 2)
    }
  }
  return []
}

async function harvest(profile: string, cats: Array<[string, number]>) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  for (const [cat, target] of cats) {
    const out = path.join(OUT_DIR, `${profile}_${cat.replace(/[^A-Za-z0-9.-]/g, '_')}.jsonl`)
    let have = countLines(out)
    console.log(`[${cat}] have=${have} target=${target}`)
    while (have < target) {
      const entries = await fetchPage(cat, have)
      if (entries.length === 0) {
        console.log(`[${cat}] no more entries at start=${have}, stopping`)
        break
      }
      const lines = entries.slice(0, target - have)
        .map(e => JSON.stringify({ ...e, cat })).join('\n') + '\n'
      fs.appendFileSync(out, lines)
      have += Math.min(entries.length, target - have)
      console.log(`[${cat}] ${have}/${target}`)
      await sleep(DELAY_MS)
    }
  }
  console.log(`profile ${profile}: done`)
}

const profile = process.argv.includes('--profile') ? process.argv[process.argv.indexOf('--profile') + 1] : ''
const maxOverride = process.argv.includes('--max') ? Number(process.argv[process.argv.indexOf('--max') + 1]) : 0
let cats = profile === 'C' ? C_CATS : profile === 'B' ? B_CATS : null
if (!cats) { console.error('usage: fetch_arxiv.ts --profile C|B [--max N]'); process.exit(1) }
if (maxOverride > 0) cats = cats.map(([c]) => [c, maxOverride] as [string, number])
await harvest(profile, cats)
