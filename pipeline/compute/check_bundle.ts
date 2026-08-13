/**
 * cs.RO(R) と cs.LG(L) を1分野として束ねてよいかの検証(algorithm.md §5、承認済み必須検証)。
 * 基準(暫定): 候補語の R-vs-L 共起JSD 中央値が、A-vs-C JSD 中央値の 50% 未満なら束ねてよい。
 * 注: 文脈語彙は C 内部(R∩L)の上位1万語を使う。middata の A-vs-C とは支持集合が異なるため
 *     厳密な同一尺度ではなく、オーダー判定として扱う。
 */
import * as fs from 'node:fs'
import * as readline from 'node:readline'
import lemmatizer from 'wink-lemmatizer'
import { stripLatex, sentences, tokenize, STOPWORDS } from './text.ts'

const WINDOW = 5, CTX_K = 10000, LAM = 0.1, MIN_PAIRS = 30

const lemmaCache = new Map<string, string>()
const lemma = (t: string) => {
  let l = lemmaCache.get(t)
  if (l === undefined) { l = lemmatizer.noun(t); lemmaCache.set(t, l) }
  return l
}

async function forEachSentence(file: string, fn: (lems: string[]) => void) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    let abs = ''
    try { abs = JSON.parse(line).abstract ?? '' } catch { continue }
    for (const s of sentences(stripLatex(abs))) {
      const toks = tokenize(s)
      if (toks.length) fn(toks.map(lemma))
    }
  }
}

const mid = JSON.parse(fs.readFileSync('pipeline/out/middata.json', 'utf8'))
const candidates = new Set<string>(mid.rows.filter((r: any) => r.jsdAC !== null).map((r: any) => r.word))
const jsdACByWord = new Map<string, number>(mid.rows.filter((r: any) => r.jsdAC !== null).map((r: any) => [r.word, r.jsdAC]))

// pass 1: 頻度(文脈語彙の決定)
const freqR = new Map<string, number>(), freqL = new Map<string, number>()
const count = (m: Map<string, number>) => (lems: string[]) => { for (const l of lems) m.set(l, (m.get(l) ?? 0) + 1) }
await forEachSentence('corpus/C_R.jsonl', count(freqR))
await forEachSentence('corpus/C_L.jsonl', count(freqL))
const ctx: Array<[string, number]> = []
for (const [w, cr] of freqR) {
  const cl = freqL.get(w)
  if (!cl || STOPWORDS.has(w) || w.length < 2) continue
  ctx.push([w, Math.min(cr, cl)])
}
ctx.sort((a, b) => b[1] - a[1])
const ctxIndex = new Map<string, number>()
ctx.slice(0, CTX_K).forEach(([w], i) => ctxIndex.set(w, i))
const K = ctxIndex.size

// pass 2: 共起
function makeCollector() {
  const cooc = new Map<string, Map<number, number>>()
  const tot = new Map<string, number>()
  for (const w of candidates) cooc.set(w, new Map())
  return {
    cooc, tot,
    on(lems: string[]) {
      for (let i = 0; i < lems.length; i++) {
        const w = lems[i]
        if (!candidates.has(w)) continue
        const m = cooc.get(w)!
        const lo = Math.max(0, i - WINDOW), hi = Math.min(lems.length - 1, i + WINDOW)
        for (let j = lo; j <= hi; j++) {
          if (j === i) continue
          const id = ctxIndex.get(lems[j])
          if (id === undefined) continue
          m.set(id, (m.get(id) ?? 0) + 1)
          tot.set(w, (tot.get(w) ?? 0) + 1)
        }
      }
    },
  }
}
const cR = makeCollector(), cL = makeCollector()
await forEachSentence('corpus/C_R.jsonl', l => cR.on(l))
await forEachSentence('corpus/C_L.jsonl', l => cL.on(l))

function jsdOf(mX: Map<number, number>, tX: number, mY: Map<number, number>, tY: number): number {
  const pX0 = LAM / (tX + LAM * K), pY0 = LAM / (tY + LAM * K)
  const term = (p: number, mid: number) => (p > 0 ? 0.5 * p * Math.log2(p / mid) : 0)
  let jsd = 0
  const seen = new Set<number>()
  for (const [id, c] of mX) {
    const px = (c + LAM) / (tX + LAM * K), py = ((mY.get(id) ?? 0) + LAM) / (tY + LAM * K)
    const mid = (px + py) / 2
    jsd += term(px, mid) + term(py, mid); seen.add(id)
  }
  for (const [id, c] of mY) {
    if (seen.has(id)) continue
    const py = (c + LAM) / (tY + LAM * K), mid = (pX0 + py) / 2
    jsd += term(pX0, mid) + term(py, mid); seen.add(id)
  }
  const zero = K - seen.size
  if (zero > 0) { const mid = (pX0 + pY0) / 2; jsd += zero * (term(pX0, mid) + term(pY0, mid)) }
  return jsd
}

const rl: number[] = [], ac: number[] = []
for (const w of candidates) {
  const tR = cR.tot.get(w) ?? 0, tL = cL.tot.get(w) ?? 0
  if (tR < MIN_PAIRS || tL < MIN_PAIRS) continue
  rl.push(jsdOf(cR.cooc.get(w)!, tR, cL.cooc.get(w)!, tL))
  ac.push(jsdACByWord.get(w)!)
}
rl.sort((a, b) => a - b); ac.sort((a, b) => a - b)
const med = (a: number[]) => a[Math.floor(a.length / 2)]
const mRL = med(rl), mAC = med(ac)
console.log(`対象語数: ${rl.length}`)
console.log(`median JSD(R,L) = ${mRL.toFixed(4)}`)
console.log(`median JSD(A,C) = ${mAC.toFixed(4)}(middata より、支持集合は異なる)`)
console.log(`比率 = ${(mRL / mAC * 100).toFixed(1)}%(基準: 50%未満なら束ねてよい)`)
console.log(`判定: ${mRL < 0.5 * mAC ? '束ねてよい ✓' : '分野内分散が大きい — 発注者に相談 ✗'}`)
