/**
 * テキスト前処理(architecture.md §3.1)。
 * pipeline と将来の実行時(src/core)で同じ仕様を共有する。
 */

/** LaTeX・URL 除去: インライン/ディスプレイ数式、コマンド、引用マクロ、URL断片 */
export function stripLatex(text: string): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')               // URL(github.com 等の断片 'com' が語彙に混入するのを防ぐ)
    .replace(/\b[\w-]+(\.[\w-]+)*\.(com|org|net|io|edu|gov|ai)\b\S*/g, ' ')  // スキームなしドメイン
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, ' ')  // \cite \textbf \alpha 等(引数の中身は残す)
    .replace(/[{}~]/g, ' ')
}

/** 文分割(共起窓は文境界を跨がない) */
export function sentences(text: string): string[] {
  return text.split(/[.!?;:\n]+/)
}

/**
 * トークナイズ(大文字小文字を保持): 英字(内部のハイフン・アポストロフィ許容)のみ。
 * ハイフン語(model-free)は1トークンとして保持(architecture.md §3.1)。
 * 数字混じり(cite key 等)は落ちる。
 * 大文字情報は略語(IL, DIME, PoW)・固有名詞(Hutchinson, Fu)の検出に使う —
 * これらは L4/固有名詞領域であり、小文字化して L3 機構に混ぜてはならない
 * (precision@50 20% の主因のひとつ。診断2)。
 */
export function tokenizeRaw(sentence: string): string[] {
  const m = sentence.match(/[A-Za-z](?:[A-Za-z'-]*[A-Za-z])?/g)
  return m ?? []
}

/** 小文字化版(後方互換。check_bundle 等で使用) */
export function tokenize(sentence: string): string[] {
  return tokenizeRaw(sentence).map(t => t.toLowerCase())
}

/**
 * 談話標識・接続副詞(閉クラス)。選択選好を持たず共起分布が「文の中身」を反映するだけなので、
 * 分布距離では語義語と区別できない。設計上も L1b「論文英語」層の典型(brief の hence, thereby)。
 * L3 ルートから除外し、keyness に応じて L1b/L1a に落とす。
 */
export const DISCOURSE = new Set([
  'however', 'moreover', 'furthermore', 'nevertheless', 'nonetheless', 'thus', 'hence',
  'thereby', 'therefore', 'whereas', 'whilst', 'albeit', 'additionally', 'consequently',
  'respectively', 'namely', 'accordingly', 'conversely', 'likewise', 'meanwhile',
  'notably', 'specifically', 'similarly', 'subsequently', 'finally', 'firstly', 'secondly',
  'overall', 'indeed', 'instead', 'besides', 'alternatively',
])

/** 共起の文脈語彙から除く機能語(内容語のみで語義を測る) */
export const STOPWORDS = new Set(`
a an the this that these those there here it its itself he she they them his her their i you we me my your our us
is are was were be been being am do does did done doing have has had having will would can could shall should may
might must not no nor and or but if then else when while as of in on at by for with about against between into
through during before after above below to from up down out off over under again further once so than too very
just only also both each few more most other some such own same s t don now what which who whom why how where all
any because until
`.trim().split(/\s+/))
