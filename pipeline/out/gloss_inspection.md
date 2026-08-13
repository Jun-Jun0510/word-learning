# 語義生成 抜き取り検査(30語: 正解セット20 + heldout 10)

モデル: 生成ファイル(data/glosses_generated.yaml)参照。「手書き」= senses.yaml 優先分。
右2列は発注者の手書き(ground_truth / heldout2)— 生成との乖離確認用。

| 語 | 一般(日本語) | 分野(日本語) | 分野(英語) | 出所 | 【発注者】一般 | 【発注者】分野 |
|---|---|---|---|---|---|---|
| return | 返却、戻る | 強化学習での割引報酬の累積値。エピソード開始時点での期待総獲得報酬 | cumulative discounted reward over trajectory | 生成 | 戻る、返却する | 収益(割引累積報酬)。RL の中心量 |
| support | 支援、サポート | サポート。確率モデルで値が非零である領域。「分布のサポート」とは、その確率分布が有意な値を持つ入力空間の部分集合 | Set of inputs where a function outputs non-zero or high probability | 生成 | 支援する | 分布の台(確率密度が非ゼロの領域) |
| mass | 質量、大量の | 確率質量(ある領域に割り当てられた確率の総量) | probability mass — total probability assigned to a region | 手書き | 質量、大量の | 確率質量(probability mass) |
| hard | 硬い、難しい | NP困難。hard constraint(厳密制約)やhard negative mining(難しい負例の抽出)など、計算複雑性や最適化の困難さを指す | computationally intractable or NP-hard complexity class | 生成 | 難しい、硬い | hard negative(対照学習で意図的に選ぶ紛らわしい負例) |
| tight | きつい、ぴっちりした | 許容誤差が小さい、制御精度が厳しい。機械系では部品間隙が小さい、制御系では偏差の上限が小さい(例：tight tolerance, tight coupling) | small tolerance or narrow margin in mechanical/control specifications | 生成 | きつい | 上界が真値に近い(tight bound) |
| regret | 後悔、遺憾 | 後悔値（最適方策との累積報酬差；強化学習で学習効率を評価する理論的尺度） | cumulative performance loss vs. optimal policy (reinforcement learning) | 生成 | 後悔 | 最適方策との累積損失差。定量的な指標 |
| collapse | 崩壊、倒壊、破綻 | システムの崩壊。学習の破綻(gradient collapse)やロボット制御の破綻など、機能喪失に至る故障状態 | premature failure or breakdown preventing system functionality | 生成 | 崩壊する | mode collapse / representation collapse(多様性や次元が潰れる現象) |
| greedy | 貪欲な、欲張りな | 貪欲法(Greedy Algorithm)。最適を目指さず、その場その場で最良の選択をする探索手法。復号化などで高速だが最適解保証なし | immediate reward maximization without lookahead | 生成 | 欲張りな | 各時点で最大価値を選ぶ方策(ε-greedy) |
| primitive | 原始的な、未開の | 基本動作。『primitive action』=さらに細分できない単位行動。複雑な動作はこれの組み合わせ | basic or elementary operation/movement; building block with no sub-goals | 生成 | 原始的な、未発達な | motion primitive(動作の最小構成単位) |
| flat | 平らな、フラットな | 平坦な地面・環境。ロボット移動タスクで傾斜なし、機械学習では特徴がない平坦な損失面を指すことも | terrain or surface without slope or curvature | 生成 | 平らな | flat minima(汎化性能と結びつく損失地形の性質) |
| head | 頭、上部 | Attention機構の『head』(複数 heads で多重アテンション)。または multi-head attention で複数の部分空間同時に学習する単位を指す | leading entity or principal component in a network | 生成 | 頭、責任者 | attention head / action head(ネットワーク末端の出力機構) |
| grounding | 接地する、根拠付ける | 言語記号を画像・触覚などセンサ入力や実際の動作と結びつけるプロセス。ロボット理解の根本課題 | linking abstract symbols to real-world sensory/motor experience | 生成 | 根拠づけ/接地(電気) | 言語や記号を物理世界の対象に結びつけること |
| manipulation | 操作、操作すること | ロボットハンドによる物体把持・操作。両腕協調作業も含む分野名 | robot grasping and hand-arm control for object interaction | 生成 | 巧妙に操る、世論操作(否定的) | 物体操作。価値中立な技術用語 |
| demonstration | 実演、展示 | 提案手法が実際に動作することを実験やシミュレーションで示すこと（成功例の提示） | empirical evidence shown through experiment or simulation run | 生成 | デモ、実演 | 模倣学習の教師軌道データそのもの |
| prior | 前の、以前の | 事前分布(データを見る前の信念を表す確率分布) | prior distribution — belief before observing data | 手書き | 前の、以前の | 事前分布 |
| policy | 政策、方針 | 強化学習で、状態から行動への写像を学習する。π(a|s)で表現 | learned decision rule mapping state to action | 生成 | 政策、方針 | 状態から行動への写像 |
| value | 価値、値 | Value関数の出力。状態から見た将来報酬の割引累計推定値。Actor-Criticの『批評家』側が出す数値 | scalar output of value function estimating return | 生成 | 値、価値 | 価値関数(期待収益) |
| attention | 注意、関心 | Transformer の核。入力系列の各要素に動的に重み(attention weights)を割り当て、重要な部分にフォーカスする機構。『attention is paid to』で『に重みを置く』 | learned weighting mechanism that focuses on relevant inputs | 生成 | 注意、注目 | 系列内の重み付き参照機構 |
| dense | 密集した、隙間のない | ネットワーク層のユニット数が多い、または特徴表現がコンパクトながら豊富な情報を持つ状態(Dense層 = 全結合層) | many parameters or neurons packed in compact representation | 生成 | 密集した | dense reward(毎ステップ与える報酬)/全結合層 |
| augmentation | — | **欠落** | — | — | 増強 | 学習データの人工的な変換増殖 |
| ground | 地面、基盤 | 正解ラベル・正解状態(ground truth)。予測精度の比較に使う、疑いようのない基準値 | reference truth label or state for supervised learning | 生成 | 地面、根拠 | ground truth の ground（正解の）。動詞なら接地させる |
| roll | 転がる、回転する | 機体の進行方向軸周りの回転。ピッチ(縦揺れ)・ヨー(横揺れ)と並ぶ3軸姿勢の一つ | rotation about forward-moving axis (aircraft/vehicle orientation) | 生成 | 転がる | ロール角（姿勢の一軸）／rollout の語幹 |
| exploit | 悪用する、利用する | システムの弱点・対称性を意図的に活用する。『exploit redundancy』などで『活用』の意 | take advantage of a weakness or loophole systematically | 生成 | 搾取する（否定的） | 活用する（exploration との対）。価値中立 |
| ill | — | **欠落** | — | — | 病気の | ill-posed / ill-conditioned。悪条件の |
| warm | 温かい、暖かい | ウォームスタート。学習初期の重みを良好な初期値から開始する。ファインチューニングの文脈で頻出 | initialize network weights near solution | 生成 | 暖かい | warm start。既存の解や重みから開始すること |
| anchor | 錨、支える、固定する | Vision Transformer や Graph Neural Network における固定参照点。『アンカーボックス』『アンカーノード』など、位置合わせや注意機構の基準となる要素 | fixed reference point or key node in a network/graph | 生成 | 錨 | 基準点となるサンプル（対照学習の anchor） |
| temperature | 温度、気温 | 確率分布の尖鋭度を制御するハイパーパラメータ。値が小さいほど最大値に集中 | hyperparameter controlling exploration-exploitation in sampling | 生成 | 温度 | softmax の温度パラメータ |
| current | 現在の、流れ | 『current position』『current policy』など、今この瞬間の状態・値。制御では時刻 t での変数の意 | the present state; immediate condition at this moment | 生成 | 現在の、電流 | 現在の（形容詞用法が支配的） |
| bandwidth | 幅広さ、周波数帯域幅 | ロボット制御での通信可能レート（bps）。センサデータやコマンドを送信できる情報量の上限。低帯域幅=遅延・劣化のリスク | data transmission capacity or rate limit in communication | 生成 | 帯域幅 | 制御帯域／計算資源の比喩 |
| rejection | 拒否、却下 | 制御ではゲインが足りずに外乱を抑圧しきれないこと。ML では学習時に不正なサンプルや外れ値を除外すること | refusal or suppression of a measurement, command, or sample as invalid or anomalous | 生成 | 拒絶 | 外乱除去（disturbance rejection）／棄却サンプリング |
