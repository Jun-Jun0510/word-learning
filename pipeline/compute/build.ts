/**
 * Phase 2a 判定エンジン本体(algorithm.md §3)。
 *
 * 入力: corpus/A_opensubtitles.txt(一般英語・共起用)
 *       corpus/wordfreq_en.json(一般英語 Zipf 頻度 = 縦軸)
 *       corpus/B_*.jsonl(学術一般。cs.RO/cs.LG 除外済み)
 *       corpus/C_*.jsonl(分野: cs.RO + cs.LG)
 * 出力: pipeline/out/middata.json   … 全候補語の全スコア(L1a・話題語疑い含む。破棄しない)
 *       pipeline/out/debug_l1a.json  … L1a落ち高頻度語の上位N
 *       pipeline/out/debug_topic.json… 話題語疑いプール上位N
 *       public/data/vocab_table.json … 配信用(L1a非収載)
 *
 * ## PoC 第1回実測(2026-08-13)からの設計変更 — レジスタ相殺
 * JSD(A,C) 単独は「語義ズレ」でなく「学術レジスタずれ」(however, paper, propose)まで拾い、
 * replaceGen はジャンル差で全語 ≈1.0 に飽和して弁別力ゼロだった(middata に記録は残す)。
 * 対策:
 *   - 語義軸: delta = JSD(A,C) − JSD(A,B)。一般→学術のレジスタずれを B で相殺し、
 *     C 固有の語義ズレだけを残す(however: JSD両方大→delta≈0 / policy: B=政策, C=方策→delta大)
 *   - 頻度軸(高頻度プール): fieldKey = log-odds z (C-vs-B)。学術レジスタ語(kB≈kC)を消し、
 *     分野固有の頻度突出だけ残す(robot: kB=-3, kC=138 → fieldKey大=話題語疑い行き)
 * 実測根拠: however kB=105/kC=123(≈相殺), robot kB=-3/kC=138, policy kB=68/kC=139。
 *
 * 閾値は分布の分位点で決める(正解セットに合わせ込まない。algorithm.md §6-2)。
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import lemmatizer from 'wink-lemmatizer'
import { stripLatex, sentences, tokenize, STOPWORDS, DISCOURSE } from './text.ts'

// ---- 設定(初期値。PoC の分布を見て調整する) ----
export const CFG = {
  highFreqZipf: 3.0,     // 縦軸: これ以上を「一般英語で高頻度」プールに(grounding 3.3 を含める)
  minCCountSense: 30,    // 語義信号を計算する最低C出現数(統計安定性。文書内出現の足切りではない)
  minPairs: 20,          // 共起ペア数がこれ未満のコーパスでは JSD を計算しない(null)
  minCCountL2: 20,       // L2 収載の最低C出現数
  window: 5,             // 共起窓 ±5(文内)
  ctxK: 10000,           // 文脈語彙: A∩C 高頻度内容語 上位K
  lambda: 0.1,           // add-λ スムージング
  topColl: 10,           // 説明素材用 top-k 共起語
  qD: 0.85,              // θd  = delta の分位点(語義置換型 L3・レジスタ相殺ルート)
  qD2: 0.70,             // θd2 = 頻度急増型に課す緩い delta 条件の分位点
  qS: 0.50,              // θs  = jsdAC の分位点(sense-replace ルートの入口。精度は rgRel が担う)
  thetaRR: 0.35,         // θrr = rgRel の絶対閾値(B相対の隣人生存率。ジャンル差相殺。絶対版 rg は全語飽和で不採用)
                         //       0.35 は return(0.378)/robot(0.289) の間。マージンが薄く20語での確定は危険。
                         //       増強パスでは閾値調整でなく判別力(第3信号)の追加で解くこと
  qK: 0.90,              // θk  = fieldKey (C-vs-B z) の分位点(高頻度プール)
  minFieldKeyZ: 10,      // θk の絶対下限(z)。分布が0近傍に集中し分位点が z≈2 まで下がる誤爆対策
  qK2: 0.90,             // θk2 = keynessC (C-vs-A z) の分位点(低頻度プール = L2)
  qB: 0.90,              // θb  = keynessB (B-vs-A z) の分位点(L1b)
  debugN: 80,
  l2Cap: 5000,
  l1bCap: 1500,
}

const OUT_DIR = 'pipeline/out'
const lemmaCache = new Map<string, string>()
/** Phase 2a 簡易レンマ化: 名詞レンマのみ(複数形の統合が主目的)。-ing 等は保持 */
function lemma(tok: string): string {
  let l = lemmaCache.get(tok)
  if (l === undefined) { l = lemmatizer.noun(tok); lemmaCache.set(tok, l) }
  return l
}

type Counts = { uni: Map<string, number>; total: number }
function newCounts(): Counts { return { uni: new Map(), total: 0 } }
function addTokens(c: Counts, toks: string[]) {
  for (const t of toks) {
    const l = lemma(t)
    c.uni.set(l, (c.uni.get(l) ?? 0) + 1)
    c.total++
  }
}

async function* linesOf(file: string) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity })
  for await (const line of rl) yield line
}

function* corpusFiles(prefix: string): Generator<string> {
  for (const f of fs.readdirSync('corpus')) if (f.startsWith(prefix) && f.endsWith('.jsonl')) yield path.join('corpus', f)
}

async function forEachSentenceJsonl(prefix: string, fn: (toks: string[]) => void) {
  for (const file of corpusFiles(prefix)) {
    for await (const line of linesOf(file)) {
      if (!line.trim()) continue
      let abs = ''
      try { abs = JSON.parse(line).abstract ?? '' } catch { continue }
      for (const s of sentences(stripLatex(abs))) {
        const toks = tokenize(s)
        if (toks.length) fn(toks)
      }
    }
  }
}

async function forEachSentenceText(file: string, fn: (toks: string[]) => void) {
  for await (const line of linesOf(file)) {
    for (const s of sentences(line)) {
      const toks = tokenize(s)
      if (toks.length) fn(toks)
    }
  }
}

/** Monroe et al. 2008 の log-odds + informative Dirichlet prior。z-score */
function logOddsZ(yi: Map<string, number>, ni: number, yj: Map<string, number>, nj: number,
                  prior: Map<string, number>, nPrior: number, alpha0: number, words: Iterable<string>): Map<string, number> {
  const z = new Map<string, number>()
  for (const w of words) {
    const aw = alpha0 * ((prior.get(w) ?? 0) + 0.01) / nPrior
    const yiw = (yi.get(w) ?? 0) + aw
    const yjw = (yj.get(w) ?? 0) + aw
    const d = Math.log(yiw / (ni + alpha0 - yiw)) - Math.log(yjw / (nj + alpha0 - yjw))
    const v = 1 / yiw + 1 / yjw
    z.set(w, d / Math.sqrt(v))
  }
  return z
}

function collectCooc(candidates: Set<string>, ctxIndex: Map<string, number>) {
  const cooc = new Map<string, Map<number, number>>()
  for (const w of candidates) cooc.set(w, new Map())
  const perWord = new Map<string, number>()
  return {
    cooc, perWord,
    onSentence(toks: string[]) {
      const lems = toks.map(lemma)
      for (let i = 0; i < lems.length; i++) {
        const w = lems[i]
        if (!candidates.has(w)) continue
        const m = cooc.get(w)!
        const lo = Math.max(0, i - CFG.window), hi = Math.min(lems.length - 1, i + CFG.window)
        for (let j = lo; j <= hi; j++) {
          if (j === i) continue
          const id = ctxIndex.get(lems[j])
          if (id === undefined) continue
          m.set(id, (m.get(id) ?? 0) + 1)
          perWord.set(w, (perWord.get(w) ?? 0) + 1)
        }
      }
    },
  }
}

/** スムージング付き JSD(共通サポート K 次元。ゼロ次元は解析的にまとめる) */
function jsdOf(mX: Map<number, number>, totX: number, mY: Map<number, number>, totY: number, K: number, lam: number): number {
  const pX0 = lam / (totX + lam * K), pY0 = lam / (totY + lam * K)
  const term = (p: number, mid: number) => (p > 0 ? 0.5 * p * Math.log2(p / mid) : 0)
  let jsd = 0
  const seen = new Set<number>()
  for (const [id, c] of mX) {
    const px = (c + lam) / (totX + lam * K)
    const py = ((mY.get(id) ?? 0) + lam) / (totY + lam * K)
    const mid = (px + py) / 2
    jsd += term(px, mid) + term(py, mid)
    seen.add(id)
  }
  for (const [id, c] of mY) {
    if (seen.has(id)) continue
    const py = (c + lam) / (totY + lam * K)
    const mid = (pX0 + py) / 2
    jsd += term(pX0, mid) + term(py, mid)
    seen.add(id)
  }
  const zero = K - seen.size
  if (zero > 0) { const mid = (pX0 + pY0) / 2; jsd += zero * (term(pX0, mid) + term(pY0, mid)) }
  return jsd
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Infinity
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))
  return sorted[idx]
}

async function main() {
  console.time('total')
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const wf: Record<string, number> = JSON.parse(fs.readFileSync('corpus/wordfreq_en.json', 'utf8'))
  const zipf = (w: string) => wf[w] ?? 0

  // ---- pass 1: 頻度 ----
  console.time('pass1-counts')
  const A = newCounts(), B = newCounts(), C = newCounts()
  await forEachSentenceText('corpus/A_opensubtitles.txt', t => addTokens(A, t))
  await forEachSentenceJsonl('B_', t => addTokens(B, t))
  await forEachSentenceJsonl('C_', t => addTokens(C, t))
  console.timeEnd('pass1-counts')
  console.log(`tokens A=${A.total} B=${B.total} C=${C.total}`)

  // ---- keyness ----
  const vocabAll = new Set<string>()
  for (const m of [A.uni, B.uni, C.uni]) for (const w of m.keys()) vocabAll.add(w)
  const prior = new Map<string, number>()
  for (const w of vocabAll) prior.set(w, (A.uni.get(w) ?? 0) + (B.uni.get(w) ?? 0) + (C.uni.get(w) ?? 0))
  const nPrior = A.total + B.total + C.total
  const alpha0 = 1000
  const keyCA = logOddsZ(C.uni, C.total, A.uni, A.total, prior, nPrior, alpha0, vocabAll)  // L2(低頻度)用
  const keyBA = logOddsZ(B.uni, B.total, A.uni, A.total, prior, nPrior, alpha0, vocabAll)  // L1b 用
  const fieldKeyM = logOddsZ(C.uni, C.total, B.uni, B.total, prior, nPrior, alpha0, vocabAll)  // 分野固有頻度(レジスタ相殺)

  // ---- 語義信号の候補 ----
  const senseCandidates = new Set<string>()
  for (const [w, cnt] of C.uni) {
    if (cnt >= CFG.minCCountSense && zipf(w) >= CFG.highFreqZipf && !STOPWORDS.has(w) && w.length >= 2) senseCandidates.add(w)
  }
  console.log(`sense candidates: ${senseCandidates.size}`)

  // ---- 文脈語彙 ----
  const ctxWords: Array<[string, number]> = []
  for (const [w, ca] of A.uni) {
    const cc = C.uni.get(w)
    if (!cc || STOPWORDS.has(w) || w.length < 2) continue
    ctxWords.push([w, Math.min(ca / A.total, cc / C.total)])
  }
  ctxWords.sort((x, y) => y[1] - x[1])
  const ctxIndex = new Map<string, number>()
  ctxWords.slice(0, CFG.ctxK).forEach(([w], i) => ctxIndex.set(w, i))
  const K = ctxIndex.size

  // ---- pass 2: 共起(A, B, C の3コーパス) ----
  console.time('pass2-cooc')
  const coA = collectCooc(senseCandidates, ctxIndex)
  const coB = collectCooc(senseCandidates, ctxIndex)
  const coC = collectCooc(senseCandidates, ctxIndex)
  await forEachSentenceText('corpus/A_opensubtitles.txt', t => coA.onSentence(t))
  await forEachSentenceJsonl('B_', t => coB.onSentence(t))
  await forEachSentenceJsonl('C_', t => coC.onSentence(t))
  console.timeEnd('pass2-cooc')

  const ctxMargA = new Float64Array(K), ctxMargC = new Float64Array(K)
  let margTotA = 0, margTotC = 0
  for (const m of coA.cooc.values()) for (const [id, c] of m) { ctxMargA[id] += c; margTotA += c }
  for (const m of coC.cooc.values()) for (const [id, c] of m) { ctxMargC[id] += c; margTotC += c }
  const ctxName = new Array<string>(K)
  for (const [w, id] of ctxIndex) ctxName[id] = w

  // ---- 語義信号: jsdAC, jsdAB, delta / 共起語 / replaceGen(診断用に記録のみ) ----
  console.time('signals')
  const lam = CFG.lambda
  const results = new Map<string, any>()
  for (const w of senseCandidates) {
    const mA = coA.cooc.get(w)!, mB = coB.cooc.get(w)!, mC = coC.cooc.get(w)!
    const tA = coA.perWord.get(w) ?? 0, tB = coB.perWord.get(w) ?? 0, tC = coC.perWord.get(w) ?? 0
    if (tA < CFG.minPairs || tC < CFG.minPairs) continue
    const jsdAC = jsdOf(mA, tA, mC, tC, K, lam)
    const jsdAB = tB >= CFG.minPairs ? jsdOf(mA, tA, mB, tB, K, lam) : null
    const delta = jsdAB === null ? null : jsdAC - jsdAB

    const ppmiTop = (m: Map<number, number>, tot: number, marg: Float64Array, margTot: number) =>
      [...m.entries()]
        .filter(([, c]) => c >= 3)
        .map(([id, c]) => [id, Math.max(0, Math.log2((c / tot) / (marg[id] / margTot)))] as [number, number])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]).slice(0, CFG.topColl)
    const topA = ppmiTop(mA, tA, ctxMargA, margTotA)
    const topC = ppmiTop(mC, tC, ctxMargC, margTotC)
    // rgRel: A側の「典型的」隣人(P(c|w) 上位)の生存率を B と C で比較する。
    // 絶対消失(rg)はジャンル差で全語飽和したため、B を基準にした相対値でジャンル要因を相殺:
    //   増加語 increase: 隣人が B でも C でも生き残る → rgRel 低(語義不変)
    //   危険語 return:  隣人が B では残る(一般語義あり)が C で消える → rgRel 高(語義置換)
    //   B疎な語(grounding): B に情報なし → null(sense ルートでは通す=Bで反証できない)
    const topAP = [...mA.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, CFG.topColl)
    let massA = 0, massB = 0, massC = 0
    for (const [id] of topAP) {
      massA += (mA.get(id) ?? 0) / tA
      if (tB > 0) massB += (mB.get(id) ?? 0) / tB
      massC += (mC.get(id) ?? 0) / tC
    }
    const replaceGen = massA > 0 ? Math.max(0, 1 - Math.min(1, massC / massA)) : 0  // 診断用に記録のみ
    const eps = 0.02
    const rgRel = (tB >= CFG.minPairs && massA > 0)
      ? Math.max(-1, Math.min(1, 1 - (massC / massA) / (massB / massA + eps)))
      : null

    results.set(w, {
      jsdAC, jsdAB, delta, replaceGen, rgRel,
      collGeneral: topA.map(([id]) => ctxName[id]),
      collField: topC.map(([id]) => ctxName[id]),
    })
  }
  console.timeEnd('signals')
  console.log(`sense signals: ${results.size} words (delta available: ${[...results.values()].filter(r => r.delta !== null).length})`)

  // ---- 閾値(分位点) ----
  const deltas = [...results.values()].filter(r => r.delta !== null).map(r => r.delta).sort((a, b) => a - b)
  const highPool = [...vocabAll].filter(w => zipf(w) >= CFG.highFreqZipf && !STOPWORDS.has(w))
  const lowPoolKeyCA = [...C.uni.entries()]
    .filter(([w, c]) => c >= CFG.minCCountL2 && zipf(w) < CFG.highFreqZipf && !STOPWORDS.has(w))
    .map(([w]) => keyCA.get(w) ?? 0).sort((a, b) => a - b)
  const fieldKeyHigh = highPool.map(w => fieldKeyM.get(w) ?? 0).sort((a, b) => a - b)
  const keyBHigh = highPool.map(w => keyBA.get(w) ?? 0).sort((a, b) => a - b)
  const jsdACs = [...results.values()].map(r => r.jsdAC).sort((a, b) => a - b)
  const θd = quantile(deltas, CFG.qD), θd2 = quantile(deltas, CFG.qD2), θs = quantile(jsdACs, CFG.qS)
  const θk = Math.max(quantile(fieldKeyHigh, CFG.qK), CFG.minFieldKeyZ)
  const θk2 = quantile(lowPoolKeyCA, CFG.qK2), θb = quantile(keyBHigh, CFG.qB)
  console.log(`thresholds: θd=${θd.toFixed(4)} θd2=${θd2.toFixed(4)} θs=${θs.toFixed(4)} θr=${CFG.thetaR} θk(fieldKey)=${θk.toFixed(2)} θk2(L2)=${θk2.toFixed(2)} θb=${θb.toFixed(2)}`)

  // ---- 分類 ----
  const pctRank = (sorted: number[], v: number) => {
    let lo = 0, hi = sorted.length
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= v) lo = m + 1; else hi = m }
    return sorted.length ? lo / sorted.length : 0
  }

  type Row = {
    word: string; zipf: number; cntA: number; cntB: number; cntC: number
    keynessB: number; keynessC: number; fieldKey: number
    jsdAC: number | null; jsdAB: number | null; delta: number | null; replaceGen: number | null; rgRel: number | null
    score: number; level: string; bucket: string
    collGeneral?: string[]; collField?: string[]
  }
  const rows: Row[] = []
  for (const w of vocabAll) {
    const zp = zipf(w), r = results.get(w)
    const cntC = C.uni.get(w) ?? 0
    if (zp < CFG.highFreqZipf && cntC < CFG.minCCountL2 && !r) continue
    const kCA = keyCA.get(w) ?? 0, kBA = keyBA.get(w) ?? 0, fk = fieldKeyM.get(w) ?? 0
    let level = '', bucket = ''
    const high = zp >= CFG.highFreqZipf && !STOPWORDS.has(w)
    if (high) {
      const d = r?.delta ?? null
      const jAC = r?.jsdAC ?? null
      // rgRel null = B に反証材料なし → sense 系ルートでは通す(B疎=学術一般に居ない語)
      const rgRelOk = r ? (r.rgRel === null ? true : r.rgRel >= CFG.thetaRR) : false
      const discourse = DISCOURSE.has(w)
      if (!discourse && d !== null && d >= θd && rgRelOk) { level = 'L3'; bucket = 'sense' }
      // freq+sense に rgRel ガードを付けると robot は消えるが support 等の正例2語も失う
      // (v5実測: 再現率17→15)。頻度急増型は rgRel なしを採用し、話題語混入は precision@50 の
      // 手動採点と debug_topic の目視で監視する
      else if (!discourse && fk >= θk && d !== null && d >= θd2) { level = 'L3'; bucket = 'freq+sense' }
      else if (!discourse && jAC !== null && jAC >= θs && rgRelOk) { level = 'L3'; bucket = 'sense-replace' }  // B にも同語義があり delta が相殺される STEM横断危険語(mass, tight)用
      else if (fk >= θk) { level = 'L1a'; bucket = 'topic-suspect' }   // 保留(破棄しない・復活は再ビルドで)
      else if (kBA >= θb && fk < θk) { level = 'L1b'; bucket = 'academic' }
      else { level = 'L1a'; bucket = 'plain' }
    } else {
      if (kCA >= θk2 && cntC >= CFG.minCCountL2 && !STOPWORDS.has(w)) { level = 'L2'; bucket = 'technical' }
      else { level = ''; bucket = 'low-residual' }   // 中間データには保持(取りこぼし診断用)
    }
    const pS = r && r.delta !== null ? pctRank(deltas, r.delta) : 0
    const pK = pctRank(fieldKeyHigh, fk)
    rows.push({
      word: w, zipf: zp, cntA: A.uni.get(w) ?? 0, cntB: B.uni.get(w) ?? 0, cntC,
      keynessB: +kBA.toFixed(2), keynessC: +kCA.toFixed(2), fieldKey: +fk.toFixed(2),
      jsdAC: r ? +r.jsdAC.toFixed(4) : null, jsdAB: r?.jsdAB != null ? +r.jsdAB.toFixed(4) : null,
      delta: r?.delta != null ? +r.delta.toFixed(4) : null, replaceGen: r ? +r.replaceGen.toFixed(3) : null,
      rgRel: r?.rgRel != null ? +r.rgRel.toFixed(3) : null,
      score: +Math.max(pS, pK).toFixed(4), level, bucket,
      collGeneral: r?.collGeneral, collField: r?.collField,
    })
  }

  // ---- 出力 ----
  const middata = {
    builtWith: CFG,
    thresholds: { θd, θd2, θs, θr: CFG.thetaR, θk, θk2, θb },
    tokens: { A: A.total, B: B.total, C: C.total },
    rows,
  }
  fs.writeFileSync(path.join(OUT_DIR, 'middata.json'), JSON.stringify(middata))

  const l1a = rows.filter(x => x.bucket === 'plain' && x.delta !== null)
    .sort((a, b) => (b.delta! - a.delta!)).slice(0, CFG.debugN)
  fs.writeFileSync(path.join(OUT_DIR, 'debug_l1a.json'), JSON.stringify(l1a, null, 1))
  const topic = rows.filter(x => x.bucket === 'topic-suspect')
    .sort((a, b) => b.score - a.score).slice(0, CFG.debugN)
  fs.writeFileSync(path.join(OUT_DIR, 'debug_topic.json'), JSON.stringify(topic, null, 1))

  const l3 = rows.filter(x => x.level === 'L3')
  const l2 = rows.filter(x => x.level === 'L2').sort((a, b) => b.keynessC - a.keynessC).slice(0, CFG.l2Cap)
  const l1b = rows.filter(x => x.level === 'L1b').sort((a, b) => b.keynessB - a.keynessB).slice(0, CFG.l1bCap)
  const entries: Record<string, any> = {}
  for (const x of [...l3, ...l2, ...l1b]) {
    entries[x.word] = {
      level: x.level, score: x.score,
      ...(x.level === 'L3' ? { collGeneral: x.collGeneral, collField: x.collField } : {}),
    }
  }
  fs.writeFileSync('public/data/vocab_table.json',
    JSON.stringify({ version: 1, domain: 'cs.RO+cs.LG', builtAt: 'phase2a-poc', entries, lemma: {} }))

  console.log(`levels: L3=${l3.length} (sense=${l3.filter(x => x.bucket === 'sense').length}, freq+sense=${l3.filter(x => x.bucket === 'freq+sense').length}, sense-replace=${l3.filter(x => x.bucket === 'sense-replace').length})  L2=${l2.length}  L1b=${l1b.length}  topic-suspect=${rows.filter(x => x.bucket === 'topic-suspect').length}  L1a-plain=${rows.filter(x => x.bucket === 'plain').length}`)
  console.log(`vocab_table.json: ${(fs.statSync('public/data/vocab_table.json').size / 1024).toFixed(0)} KB`)
  console.timeEnd('total')
}

await main()
