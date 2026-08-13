/** vocab_table.json のスキーマ(pipeline/compute/build.ts の出力と同期)。
 *  level は将来 'L3-academic' を追加できる拡張可能な形(phase1_approval.md) */
export type Level = 'L3' | 'L2' | 'L1b' | (string & {})

export interface VocabEntry {
  level: Level
  score: number
  /** Cコーパスで当該語を含む abstract の割合(順位付け層 idf 用。algorithm.md §3.3) */
  df?: number
  topicRisk?: boolean
  /** キュレーション・ピン(data/senses.yaml 由来。分布判定によらないL3収載) */
  pinned?: boolean
  collGeneral?: string[]
  collField?: string[]
  senses?: Array<{
    id: string
    domainSense: string   // この分野での意味(英語・短く)。デフォルト表示(UI修正1)
    contrast?: string     // 一般語義との対比の一行(英語)
    ja?: string           // 分野での意味(日本語)。タップで開く
    jaGeneral?: string    // 一般的な意味(日本語)。タップで開く
  }>
}

export interface VocabTable {
  version: number
  domain: string
  entries: Record<string, VocabEntry>
  lemma: Record<string, string>
}

/** 文書解析結果の1行(表層形単位。known の状態単位も表層形 — phase2a_close_approval.md) */
export interface DocWord {
  surface: string          // 文書中の表層形(小文字)
  entryKey: string         // vocab_table のキー
  entry: VocabEntry
  count: number            // 文書内出現回数(ソート補助・表示用のみ。足切りに使わない)
  sentence: string         // 文書内の出現文(トークン数最大の文を採用。algorithm.md §3.4)
  sentenceTokens: number   // 選定用の内部値
}
