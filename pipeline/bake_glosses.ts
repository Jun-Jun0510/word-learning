/**
 * 語義説明のビルド時プリベイク(案A。docs/phase2b_glosses_approval.md)。
 *
 * 実行: ANTHROPIC_API_KEY=sk-... npm run bake:glosses
 *   - モデル: Haiku 4.5(MODEL 環境変数で上書き可。L3のみ Sonnet 再生成は
 *     MODEL=claude-sonnet-5 LEVELS=L3 で実行)
 *   - L3: 一般語義との対比が核(発注者3例文を few-shot)
 *   - L2: 定義のみ(対比する一般語義が無いため。プロンプト分離は承認条件)
 *   - キャッシュ: data/glosses_generated.yaml に保存・コミット(差分レビュー可能)。
 *     既存語はスキップ(再実行は差分のみ)。senses.yaml(手書き)が常に優先
 *   - 失敗語は data/glosses_failures.json に必ず記録(静かに欠落させない)
 *   - コストガード: 推定 $20 超で停止
 */
import * as fs from 'node:fs'
import * as yaml from 'js-yaml'

const MODEL = process.env.MODEL ?? 'claude-haiku-4-5-20251001'
const LEVELS = (process.env.LEVELS ?? 'L3,L2').split(',')
const BATCH = 8, CONCURRENCY = 6, MAX_COST_USD = 20
const PRICE: Record<string, [number, number]> = {  // $/MTok [in, out]
  'claude-haiku-4-5-20251001': [1, 5],
  'claude-sonnet-5': [3, 15],
}

const KEY = process.env.ANTHROPIC_API_KEY
if (!KEY) { console.error('ANTHROPIC_API_KEY が未設定です'); process.exit(1) }

const table = JSON.parse(fs.readFileSync('public/data/vocab_table.json', 'utf8'))
const curated = new Set(Object.keys((yaml.load(fs.readFileSync('data/senses.yaml', 'utf8')) as any) ?? {}))
const OUT = 'data/glosses_generated.yaml'
const cache: Record<string, any> = fs.existsSync(OUT) ? ((yaml.load(fs.readFileSync(OUT, 'utf8')) as any) ?? {}) : {}

const L3_SYSTEM = `あなたは英語論文の「危険語」(見た目は日常語だが分野で特殊な意味を持つ語)の解説を書く専門家。
対象分野: ロボティクス+機械学習(arXiv cs.RO / cs.LG)。読者: 制御工学出身の日本人エンジニア。
各語について、一般的な意味との対比が一行で刺さることが最重要。正確さより分かりやすさを優先する。

出力フィールド:
- domainSense: この分野での意味。英語10語以内の短句(それ自体が読解のヒントになる長さ)
- contrast: 一般語義との対比を英語一行("not X — Y" 形式を推奨)
- jaGeneral: 一般的な意味(日本語、簡潔)
- ja: この分野での意味(日本語)。一行で刺さる対比を優先

品質基準の例(この水準を再現せよ):
- curriculum: jaGeneral「教育課程」/ ja「簡単な課題から段階的に難しくする学習方式(カリキュラム学習)」/ domainSense "gradually increasing task difficulty"
- disturbance: jaGeneral「邪魔、妨害」/ ja「外乱(制御対象に加わる予期しない入力)」/ domainSense "unexpected external input acting on the system"
- actor: jaGeneral「俳優」/ ja「Actor-Critic の行動側。方策を出力するネットワーク」/ domainSense "the policy network in Actor-Critic"

参考として各語に共起語(一般英語での隣人 / この分野での隣人)を付す。分野語義の同定に使え。
JSONのみを出力: {"words":{"<語>":{"domainSense":"...","contrast":"...","jaGeneral":"...","ja":"..."}}}`

const L2_SYSTEM = `あなたは英語論文の専門語(一般英語にはほぼ出ない語)の解説を書く専門家。
対象分野: ロボティクス+機械学習(arXiv cs.RO / cs.LG)。読者: 制御工学出身の日本人エンジニア。
専門語には対比すべき一般語義が無いため、対比は書かない。その語が何を指すかだけを簡潔に説明する。

出力フィールド:
- domainSense: 英語10語以内の定義
- ja: 日本語の簡潔な説明(訳語+一言)

JSONのみを出力: {"words":{"<語>":{"domainSense":"...","ja":"..."}}}`

let inTok = 0, outTok = 0
async function callBatch(level: string, words: string[]): Promise<Record<string, any> | null> {
  const lines = words.map(w => {
    const e = table.entries[w]
    const coll = level === 'L3' && e.collGeneral
      ? `(一般の隣人: ${e.collGeneral.slice(0, 5).join(', ')} / 分野の隣人: ${(e.collField ?? []).slice(0, 5).join(', ')})` : ''
    return `- ${w} ${coll}`
  }).join('\n')
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL, max_tokens: 2000,
          system: level === 'L3' ? L3_SYSTEM : L2_SYSTEM,
          messages: [{ role: 'user', content: `次の${words.length}語の解説を生成せよ:\n${lines}` }],
        }),
      })
      if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 3000 * attempt)); continue }
      if (!res.ok) { console.error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`); return null }
      const data = await res.json()
      inTok += data.usage?.input_tokens ?? 0
      outTok += data.usage?.output_tokens ?? 0
      const text = data.content?.[0]?.text ?? ''
      const m = text.match(/\{[\s\S]*\}/)
      if (!m) return null
      return JSON.parse(m[0]).words ?? null
    } catch (e) { await new Promise(r => setTimeout(r, 2000 * attempt)) }
  }
  return null
}

function costUsd(): number {
  const [pi, po] = PRICE[MODEL] ?? [3, 15]
  return (inTok * pi + outTok * po) / 1e6
}

function saveCache() {
  const sorted: Record<string, any> = {}
  for (const k of Object.keys(cache).sort()) sorted[k] = cache[k]
  fs.writeFileSync(OUT, yaml.dump(sorted, { lineWidth: 200, sortKeys: false }))
}

async function main() {
  const todo: Array<[string, string]> = []
  for (const [w, e] of Object.entries<any>(table.entries)) {
    if (!LEVELS.includes(e.level)) continue
    if (curated.has(w)) continue          // 手書き優先(生成もしない)
    if (cache[w] && !cache[w].failed) continue  // キャッシュ済みはスキップ
    todo.push([w, e.level])
  }
  console.log(`model=${MODEL} 対象=${todo.length}語 (キャッシュ済み ${Object.keys(cache).length}語はスキップ)`)

  const failures: string[] = []
  const queues: Record<string, string[]> = { L3: [], L2: [] }
  for (const [w, lv] of todo) (queues[lv] ??= []).push(w)

  for (const [level, words] of Object.entries(queues)) {
    const batches: string[][] = []
    for (let i = 0; i < words.length; i += BATCH) batches.push(words.slice(i, i + BATCH))
    let done = 0
    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      if (costUsd() > MAX_COST_USD) { console.error(`コストガード発動($${costUsd().toFixed(2)})。中断`); break }
      const chunk = batches.slice(i, i + CONCURRENCY)
      const results = await Promise.all(chunk.map(b => callBatch(level, b)))
      for (let j = 0; j < chunk.length; j++) {
        const words_j = chunk[j], r = results[j]
        for (const w of words_j) {
          const g = r?.[w]
          const ok = g && g.domainSense && g.ja && (level === 'L2' || (g.jaGeneral && g.contrast))
          if (ok) cache[w] = { level, ...g }
          else failures.push(w)
        }
      }
      done += chunk.reduce((a, b) => a + b.length, 0)
      saveCache()
      console.log(`${level}: ${done}/${words.length}  cost≈$${costUsd().toFixed(2)}`)
    }
  }

  // 失敗語の単発リトライ(1語ずつ)
  const retryFailures: string[] = []
  for (const w of failures) {
    const level = table.entries[w].level
    const r = await callBatch(level, [w])
    const g = r?.[w]
    const ok = g && g.domainSense && g.ja && (level === 'L2' || (g.jaGeneral && g.contrast))
    if (ok) cache[w] = { level, ...g }
    else retryFailures.push(w)
  }
  saveCache()
  fs.writeFileSync('data/glosses_failures.json', JSON.stringify(retryFailures, null, 1))
  console.log(`完了: 生成 ${Object.keys(cache).length}語 / 失敗 ${retryFailures.length}語(data/glosses_failures.json)`)
  console.log(`tokens: in=${inTok.toLocaleString()} out=${outTok.toLocaleString()}  実コスト≈$${costUsd().toFixed(2)}`)
}

await main()
