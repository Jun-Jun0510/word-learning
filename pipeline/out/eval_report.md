# Phase 2a 評価レポート

> **注意: 本レポートの再現率は検証セットに対するものであり、汎化性能ではない。**
> 凍結された20語に対して5イテレーションの改良を行ったため、この20語は適合済みの
> 検証セットである。用途は「設計変更が既存の検出を壊していないかの回帰テスト」のみ。
> 未知語に対する汎化性能を示すのは precision@50(手動採点)と、Phase 2b ゲート用
> held-out セット(参照禁止)のみ。

生成: build thresholds θd=0.0839 θd2=0.0467 θk(fieldKey)=10.00
コーパス tokens: A=38,540,515 B=9,206,457 C=13,183,216

## ゲート数値

**ゲート基準 v2(2026-08-13 方針転換: 再現率優先)** — 根拠: 話題語の混入は known 1タップで自己修復するが、L3の取りこぼしは気づけず永久に残る(誤りの価値非対称性。phase2a_review2_recall_pivot.md)。

| 指標 | 値 | 目標(v2) | 判定 |
|---|---|---|---|
| **再現率(全体)【必須】** | 19/20 (95%) | **≥18/20** | ✅ |
| **再現率(sense_shift群)【必須】** | 10/10 (100%) | **≥9/10** | ✅ |
| 再現率(both群) | 9/10 (90%) | (参考) | - |
| 話題語型負例のL3混入 | 3/5(うち⚑ 2) | ⚑付きなら許容(自己修復) | 参考 |
| 一般語型負例のL3混入 | 1/3 | 参考 | 参考 |
| precision@50 | 手動採点待ち(下表・既採点50語と重複なし) | **≥35%(目標)** | ⏳ |
| 話題語の区別表示 | ⚑(topicRisk)を vocab_table に焼き込み済み | 必須 | ✅ |

## positives 診断 — sense_shift 群(JSD設計の唯一の指標)

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| return | sense_shift | L3 | sense-replace | 5.2 | -1.16 | 0.6399 | 0.6152 | 0.0247 | 0.667 | ✓ | - |
| support | sense_shift | L3 | sense-academic-rg | 5.5 | -5.74 | 0.6448 | 0.6318 | 0.0130 | 0.364 | ✓ | - |
| mass | sense_shift | L3 | sense-academic | 4.9 | -43.53 | 0.5523 | 0.6305 | -0.0782 | 0.194 | ✓ | - |
| hard | sense_shift | L3 | sense-replace | 5.5 | 5.20 | 0.7182 | 0.7021 | 0.0161 | 0.563 | ✓ | - |
| tight | sense_shift | L3 | sense-replace | 4.6 | -8.69 | 0.6492 | 0.6604 | -0.0111 | 0.795 | ✓ | - |
| regret | sense_shift | L3 | sense | 4.4 | 20.41 | 0.6360 | 0.4885 | 0.1475 | 0.861 | ✓ | - |
| collapse | sense_shift | L3 | sense-academic-rg | 4.2 | 5.85 | 0.5336 | 0.4589 | 0.0747 | 0.498 | ✓ | - |
| greedy | sense_shift | L3 | sense-academic-rg | 3.8 | 1.77 | 0.4512 | 0.3934 | 0.0577 | 1.000 | ✓ | - |
| primitive | sense_shift | L3 | sense | 3.8 | 8.52 | 0.5623 | 0.4720 | 0.0903 | 0.543 | ✓ | - |
| flat | sense_shift | L3 | sense-academic | 4.7 | -10.38 | 0.5858 | 0.5836 | 0.0022 | 0.662 | ✓ | - |

## positives 診断 — both 群

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| head | both | L3 | freq+sense | 5.5 | 25.68 | 0.7176 | 0.6699 | 0.0477 | 0.114 | ✓ | - |
| grounding | both | L3 | sense | 3.3 | 20.52 | 0.5023 | 0.2745 | 0.2277 | 0.953 | ✓ | - |
| manipulation | both | L3 | sense | 3.9 | 64.53 | 0.6476 | 0.3638 | 0.2838 | 0.636 | ✓ | - |
| demonstration | both | L3 | sense | 4.1 | 46.98 | 0.6273 | 0.3781 | 0.2491 | 0.469 | ✓ | - |
| prior | both | L3 | freq+sense | 4.8 | 38.59 | 0.6282 | 0.5699 | 0.0584 | 0.017 | ✓ | - |
| policy | both | L3 | sense | 5.2 | 90.73 | 0.6745 | 0.5741 | 0.1004 | 0.828 | ✓ | - |
| value | both | L3 | sense-academic-rg | 5.2 | -26.91 | 0.6392 | 0.6162 | 0.0230 | 0.763 | ✓ | - |
| attention | both | L3 | freq+sense | 5.1 | 41.72 | 0.7179 | 0.6505 | 0.0673 | 0.745 | ✓ | - |
| dense | both | L3 | sense | 4.0 | 20.73 | 0.5904 | 0.4840 | 0.1064 | 0.633 | ✓ | - |
| augmentation | both | L1a | topic-suspect | 3.0 | 20.79 | — | — | — | — | ✗ | 4. 話題語ガード誤爆 |

## negatives — 話題語型(ガードの検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| robot | L3 | freq+sense | 81.82 | 0.6226 | 0.4421 | 0.1805 | 0.246 | ✗ 混入 |
| controller | L3 | sense | 54.04 | 0.5895 | 0.3540 | 0.2355 | 0.632 | ✗ 混入 |
| dataset | L1a | topic-suspect | 53.90 | — | — | — | — | ✓ |
| benchmark | L1a | topic-suspect | 44.92 | — | — | — | — | ✓ |
| simulation | L3 | topic-flagged | 21.49 | 0.6532 | 0.6210 | 0.0322 | 0.747 | ✗ 混入 |

## negatives — 一般語型(候補プール入口の検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| however | (なし) | - | — | — | — | — | — | ✓ |
| increase | L1b | academic | -10.29 | 0.5617 | 0.5202 | 0.0415 | 0.275 | ✓ |
| describe | L3 | sense-academic-rg | -19.15 | 0.5080 | 0.5244 | -0.0164 | 0.810 | ✗ 混入 |

## キュレーション・ピン登録語(条件a: アルゴリズムが拾えなかった語の恒久記録)

ピンは逃げ道ではなくアルゴリズムの失敗の記録である。**ピン件数の増加 = アルゴリズムの失敗の増加**として読む。

| 語 | アルゴリズム判定 | ピンのみ?(=検出失敗) | pinReason |
|---|---|---|---|
| mass | L3/sense-academic | —(検出済み) | C構成がR重心のため物理質量が支配語義になり、確率質量の語義信号が消滅(2026-08-13 の before/after 検証。R/L別統計を入れたら再判定) |
| prior | L3/freq+sense | —(検出済み) | アルゴリズムでも検出済み(freq+sense)だが、品詞で語義が割れるため語義キュレーションが必要(検出失敗によるピンではない) |

## 既知の不一致(発注者承認済み。正解セットは凍結のまま)

| 語 | 分類 | 備考 |
|---|---|---|
| augmentation | 既知の不一致 | A に共起データがなく実質専門語として L2 判定される(L2 として表示はされるため実害小)。発注者の正解セット側で L3 指定が誤りの可能性も併記(zipf 3.0 は「見た目日常語」の下限ぎりぎり)。セットは凍結のまま維持 |
| greedy | A起因の取りこぼし | OpenSubtitles(会話コーパス)で共起が疎(jsdAC 過小)。会話に出にくい語の構造的弱点。held-out セットで同種の取りこぼしが再発したら A の補強を検討(発注者判断) |

## precision@50 手動採点用リスト(L3判定 score上位50、読者既知語除外)

| # | 語 | score | bucket | collGeneral | collField |
|---|---|---|---|---|---|
| 1 | human ⚑ | 0.9994 | topic-flagged | intricacy, afforded, excellence, classify, softness | laborer, co-workers, civilization, coworkers, likeness |
| 2 | approach ⚑ | 0.9992 | topic-flagged | masking, balanced, unrealistic, theta, swiftly | dolphin, advising, affirm, downside, falter |
| 3 | outdoor | 0.9988 | sense | rugged, originally, joint, location, race | indoor, campus, grass, indoors, harsh |
| 4 | image | 0.9987 | freq+sense | flickering, refute, reckoning, dissolved, three-dimensional | cropped, plankton, close-up, rendered, captioning |
| 5 | prediction | 0.9987 | freq+sense | generalized, vague, eruption, initiate, remarkable | basing, theory's, mortality, churn, abstain |
| 6 | navigation | 0.9986 | sense | constitute, beacon, auto, automatic, hazard | denied, audio-visual, aided, crowd, satellite |
| 7 | controller | 0.9984 | sense | flight, traffic, airplane, network, connection | clairvoyant, cutter, offspring, backup, stabilizing |
| 8 | trained | 0.9983 | sense | countering, catering, triggered, dim, professional | scratch, exclusively, town, fashion, entirely |
| 9 | scene | 0.9982 | sense | reappraisal, ranking, operated, realisation, snowflake | cousin, importing, happening, spawning, rearranged |
| 10 | perception | 0.9982 | sense | reacting, heightened, sensation, clarity, discipline | roadside, people's, introspective, certifiable, cooperative |
| 11 | pedestrian | 0.9982 | sense | accomplishment, inevitably, versus, backed, auto | cyclist, suicidal, unmarked, reckoning, distracted |
| 12 | feature ⚑ | 0.9981 | topic-flagged | extraction, inexpensive, replay, matching, masculine | pyramid, rivalry, extraction, extracted, type-specific |
| 13 | representation | 0.9981 | freq+sense | trait, holographic, extreme, legal, wish | mid-level, succinct, bird's, bird's-eye, curl |
| 14 | challenge ⚑ | 0.998 | topic-flagged | intriguing, infestation, competitor, contend, overcome | fraught, grand, formidable, biggest, confront |
| 15 | learned | 0.9979 | freq+sense | substituting, disputed, refers, intelligently, solicit | lesson, forgets, breakfast, fetching, plugged |
| 16 | terrain | 0.9979 | sense | familiarity, uncharted, rugged, render, observation | muddy, uneven, rough, rugged, slippery |
| 17 | challenging | 0.9979 | sense | considerably, existing, pursuit, found, system | vertically, immensely, remains, snowy, basketball |
| 18 | video | 0.9979 | sense | step-by-step, unidirectional, augment, multi, digital | watched, supplemental, supplementary, demo, appendix |
| 19 | tracking | 0.9978 | sense | migration, incoming, app, unidentified, uplink | rogue, fast-moving, hovering, border, plume |
| 20 | diverse | 0.9978 | sense | artefact, treasure, culture, chest, exist | repertoire, athletic, populate, clothes, accommodating |
| 21 | learn | 0.9977 | freq+sense | cleanliness, inanimate, refine, ample, sharing | watching, continually, supposed, creature, imitating |
| 22 | demonstration | 0.9977 | sense | agility, physic, witnessed, readiness, electronic | handful, collecting, bathing, expert, collect |
| 23 | sim | 0.9977 | sense | lunar, lab, refused, finish, complete | sling, sim, real, inevitable, transfer |
| 24 | world | 0.9976 | sense | dominate, evoked, scarcer, unite, counterpart | champion, real, imago, messy, anywhere |
| 25 | success ⚑ | 0.9976 | freq+sense | short-lived, departs, locating, anticipated, probability | owe, rate, enjoyed, overhand, tremendous |
| 26 | camera ⚑ | 0.9974 | freq+sense | disposable, shutter, lens, circuitry, clicking | pinhole, shutter, stereo, mouth, infrared |
| 27 | obstacle | 0.9974 | sense | competitor, overcome, confronting, achievement, imminent | collide, buoy, populated, pitching, avoiding |
| 28 | capability | 0.9974 | freq+sense | minimal, equipped, electronic, warp, consequence | compost, unlocked, instill, endow, unlocks |
| 29 | deep | 0.9973 | freq+sense | induces, breath, propeller, glacier, probe's | dip, reinforcement, diva, benefited, shallow |
| 30 | exploration | 0.9973 | sense | experimentation, notable, cease, expert, forbidden | stifle, exploitation, bonus, planetary, deep-sea |
| 31 | available | 0.9972 | sense | distributed, forage, granting, impaired, catalog | publicly, code, website, download, page |
| 32 | demonstrate ⚑ | 0.9972 | freq+sense | cinematic, ignorance, superior, resolve, remark | superiority, effectiveness, experimental, extensive, experiment |
| 33 | cloning | 0.9972 | sense | genetic, program, material, lab, process | behavioral, behavioural, behavior, behaviour, vanilla |
| 34 | extensive | 0.9971 | sense | classification, interaction, vocabulary, possesses, parrot | experiment, experimentation, conduct, livestock, underwent |
| 35 | safe | 0.997 | sense | retrieval, sharpening, dishwasher, grapple, bypass | comfortable, indefinitely, corridor, hostile, sensible |
| 36 | occupancy | 0.997 | sense | maximum, person, sorry, one | grid, status, pseudo, map, discounted |
| 37 | uncertainty | 0.9969 | sense | principle, investigation, aside, degree, pain | unaccounted, unmatched, quantify, optimism, ignorance |
| 38 | attention | 0.9968 | freq+sense | shopper, attract, attracting, needless, starved | garner, paid, casing, lapse, attracted |
| 39 | latent | 0.9968 | sense | print, half, got | build-up, space, decoded, claiming, variable |
| 40 | navigate | 0.9968 | sense | vortex, galaxy, across, star, speed | safely, unfamiliar, crowded, intercept, surroundings |
| 41 | transformer | 0.9968 | sense | connect, overload, circuit, huge, metal | padded, bet, deduction, attends, vision |
| 42 | robust | 0.9967 | freq+sense | unequal, aroma, unique, larger, performance | doubly, reputation, assortment, adaptable, defence |
| 43 | objective | 0.9966 | freq+sense | retrieval, formidable, utilize, unnecessary, worthy | conflicting, subjective, competing, pursue, fulfilling |
| 44 | online ⚑ | 0.9966 | freq+sense | robot, fusion, audio, navigational, delta | skid, handwriting, advertising, advertisement, shopping |
| 45 | module | 0.9966 | sense | lunar, stealth, simulator, expansion, computing | sync, redesigned, cerebellum, bridged, forceps |
| 46 | navigating | 0.9966 | sense | high-speed, concentrate, traffic, felt, two | doorway, rugged, crowd, maze, sidewalk |
| 47 | vision | 0.9965 | sense | blurred, intuitive, equipped, granted, enables | computer, audition, benefited, touch, blindness |
| 48 | map ⚑ | 0.9965 | topic-flagged | atlas, trajectory, translate, accessing, unification | sleeping, elevation, occupancy, up-to-date, hash |
| 49 | expert | 0.9964 | sense | bin, linguist, longevity, exploration, electronics | routed, pathologist, overloaded, blindfolded, residency |
| 50 | prior ⚑ | 0.9963 | freq+sense | restraint, rejected, centered, resulting, molecular | dip, conjugate, tried, work, contrary |

⚑ = 話題語疑いフラグ(語義証拠が弱いままL3入り。UIでも視覚的に区別する)
