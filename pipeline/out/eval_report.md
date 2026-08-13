# Phase 2a 評価レポート

> **注意: 本レポートの再現率は検証セットに対するものであり、汎化性能ではない。**
> 凍結された20語に対して5イテレーションの改良を行ったため、この20語は適合済みの
> 検証セットである。用途は「設計変更が既存の検出を壊していないかの回帰テスト」のみ。
> 未知語に対する汎化性能を示すのは precision@50(手動採点)と、Phase 2b ゲート用
> held-out セット(参照禁止)のみ。

生成: build thresholds θd=0.1234 θd2=0.0725 θk(fieldKey)=10.00
コーパス tokens: A=38,540,515 B=6,559,676 C=13,239,998

## ゲート数値

**ゲート基準 v2(2026-08-13 方針転換: 再現率優先)** — 根拠: 話題語の混入は known 1タップで自己修復するが、L3の取りこぼしは気づけず永久に残る(誤りの価値非対称性。phase2a_review2_recall_pivot.md)。

| 指標 | 値 | 目標(v2) | 判定 |
|---|---|---|---|
| **再現率(全体)【必須】** | 19/20 (95%) | **≥18/20** | ✅ |
| **再現率(sense_shift群)【必須】** | 10/10 (100%) | **≥9/10** | ✅ |
| 再現率(both群) | 9/10 (90%) | (参考) | - |
| 話題語型負例のL3混入 | 3/5(うち⚑ 1) | ⚑付きなら許容(自己修復) | 参考 |
| 一般語型負例のL3混入 | 1/3 | 参考 | 参考 |
| precision@50 | 手動採点待ち(下表・既採点50語と重複なし) | **≥35%(目標)** | ⏳ |
| 話題語の区別表示 | ⚑(topicRisk)を vocab_table に焼き込み済み | 必須 | ✅ |

## positives 診断 — sense_shift 群(JSD設計の唯一の指標)

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| return | sense_shift | L3 | sense-replace | 5.2 | -2.51 | 0.6402 | 0.6171 | 0.0231 | 0.636 | ✓ | - |
| support | sense_shift | L3 | topic-flagged | 5.5 | 11.76 | 0.6450 | 0.6077 | 0.0373 | 0.474 | ✓ | - |
| mass | sense_shift | L3 | sense-academic | 4.9 | -53.40 | 0.5541 | 0.6317 | -0.0777 | 0.184 | ✓ | - |
| hard | sense_shift | L3 | sense-replace | 5.5 | 5.84 | 0.7186 | 0.7043 | 0.0143 | 0.525 | ✓ | - |
| tight | sense_shift | L3 | sense-replace | 4.6 | -7.51 | 0.6498 | 0.6336 | 0.0162 | 0.800 | ✓ | - |
| regret | sense_shift | L3 | sense | 4.4 | 18.77 | 0.6363 | 0.4490 | 0.1873 | 0.853 | ✓ | - |
| collapse | sense_shift | L3 | sense-academic-rg | 4.2 | 1.97 | 0.5338 | 0.4454 | 0.0884 | 0.507 | ✓ | - |
| greedy | sense_shift | L3 | sense-academic-rg | 3.8 | 3.87 | 0.4510 | 0.3305 | 0.1205 | 1.000 | ✓ | - |
| primitive | sense_shift | L3 | sense | 3.8 | 10.63 | 0.5623 | 0.4205 | 0.1418 | 0.498 | ✓ | - |
| flat | sense_shift | L3 | sense-academic | 4.7 | -13.08 | 0.5871 | 0.5763 | 0.0108 | 0.671 | ✓ | - |

## positives 診断 — both 群

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| head | both | L3 | topic-flagged | 5.5 | 22.31 | 0.7180 | 0.6609 | 0.0571 | 0.344 | ✓ | - |
| grounding | both | L3 | sense | 3.3 | 20.21 | 0.5024 | 0.1218 | 0.3806 | 0.958 | ✓ | - |
| manipulation | both | L3 | sense | 3.9 | 55.22 | 0.6477 | 0.3306 | 0.3171 | 0.660 | ✓ | - |
| demonstration | both | L3 | sense | 4.1 | 39.38 | 0.6274 | 0.3321 | 0.2953 | 0.550 | ✓ | - |
| prior | both | L3 | freq+sense | 4.8 | 36.34 | 0.6286 | 0.5504 | 0.0782 | 0.069 | ✓ | - |
| policy | both | L3 | freq+sense | 5.2 | 79.96 | 0.6751 | 0.5536 | 0.1216 | 0.835 | ✓ | - |
| value | both | L3 | sense-academic-rg | 5.2 | -30.56 | 0.6400 | 0.6216 | 0.0184 | 0.757 | ✓ | - |
| attention | both | L3 | freq+sense | 5.1 | 36.83 | 0.7182 | 0.6366 | 0.0816 | 0.768 | ✓ | - |
| dense | both | L3 | sense | 4.0 | 17.54 | 0.5903 | 0.4552 | 0.1351 | 0.675 | ✓ | - |
| augmentation | both | L1a | topic-suspect | 3.0 | 18.39 | — | — | — | — | ✗ | 4. 話題語ガード誤爆 |

## negatives — 話題語型(ガードの検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| robot | L3 | freq+sense | 59.75 | 0.6236 | 0.3893 | 0.2343 | 0.147 | ✗ 混入 |
| controller | L3 | sense | 42.20 | 0.5895 | 0.2358 | 0.3537 | 0.685 | ✗ 混入 |
| dataset | L1a | topic-suspect | 52.46 | — | — | — | — | ✓ |
| benchmark | L1a | topic-suspect | 56.93 | — | — | — | — | ✓ |
| simulation | L3 | sense-academic-rg | 9.44 | 0.6551 | 0.6219 | 0.0332 | 0.756 | ✗ 混入 |

## negatives — 一般語型(候補プール入口の検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| however | (なし) | - | — | — | — | — | — | ✓ |
| increase | L1b | academic | -14.01 | 0.5620 | 0.5136 | 0.0483 | 0.244 | ✓ |
| describe | L3 | sense-academic-rg | -17.70 | 0.5086 | 0.5001 | 0.0084 | 0.822 | ✗ 混入 |

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
| 1 | approach ⚑ | 0.9995 | topic-flagged | masking, balanced, unrealistic, theta, swiftly | dolphin, advising, affirm, downside, falter |
| 2 | human ⚑ | 0.9994 | topic-flagged | intricacy, afforded, excellence, classify, softness | laborer, co-workers, civilization, coworkers, likeness |
| 3 | challenge ⚑ | 0.9989 | topic-flagged | intriguing, infestation, competitor, contend, overcome | fraught, grand, formidable, biggest, confront |
| 4 | diverse | 0.998 | sense | artefact, treasure, culture, chest, exist | repertoire, athletic, populate, clothes, accommodating |
| 5 | navigation | 0.9979 | sense | constitute, beacon, auto, automatic, hazard | denied, audio-visual, aided, crowd, satellite |
| 6 | prediction ⚑ | 0.9979 | topic-flagged | generalized, vague, eruption, initiate, remarkable | basing, theory's, mortality, churn, abstain |
| 7 | capability | 0.9979 | freq+sense | minimal, tech, equipped, electronic, warp | compost, unlocked, instill, endow, unlocks |
| 8 | image ⚑ | 0.9978 | topic-flagged | flickering, refute, reckoning, dissolved, three-dimensional | cropped, plankton, close-up, rendered, captioning |
| 9 | feature ⚑ | 0.9977 | topic-flagged | extraction, inexpensive, replay, matching, masculine | pyramid, rivalry, extraction, extracted, type-specific |
| 10 | challenging | 0.9977 | sense | considerably, existing, pursuit, found, system | vertically, immensely, remains, snowy, basketball |
| 11 | trained | 0.9976 | freq+sense | countering, catering, triggered, dim, professional | scratch, exclusively, town, fashion, entirely |
| 12 | perception | 0.9976 | sense | reacting, heightened, sensation, clarity, discipline | roadside, people's, introspective, certifiable, cooperative |
| 13 | representation ⚑ | 0.9976 | topic-flagged | trait, holographic, extreme, legal, wish | mid-level, succinct, bird's, bird's-eye, curl |
| 14 | learned | 0.9975 | freq+sense | substituting, disputed, refers, intelligently, solicit | lesson, forgets, breakfast, fetching, plugged |
| 15 | agile | 0.9975 | sense | skeleton, strong, age, food, looking | solo, interception, maneuvering, flight, maneuver |
| 16 | success ⚑ | 0.9974 | freq+sense | short-lived, departs, locating, anticipated, probability | owe, rate, enjoyed, overhand, tremendous |
| 17 | architecture | 0.9974 | freq+sense | visualise, ancestry, inventory, visualize, exhibit | quad, layered, coaxial, transformer, sofa |
| 18 | across ⚑ | 0.9973 | topic-flagged | paced, blindly, receding, ripple, scattering | ancestry, ethnic, distributing, infusion, distribute |
| 19 | terrain | 0.9973 | sense | familiarity, uncharted, rugged, render, observation | muddy, uneven, rough, rugged, slippery |
| 20 | extensive | 0.9973 | sense | classification, interaction, vocabulary, possesses, parrot | experiment, experimentation, conduct, livestock, underwent |
| 21 | framework ⚑ | 0.9972 | topic-flagged | democracy, duck, shoe, table, body | earning, ante, unified, entitled, gatekeeper |
| 22 | controller | 0.9972 | sense | flight, traffic, airplane, network, connection | clairvoyant, cutter, offspring, backup, stabilizing |
| 23 | scene | 0.9971 | sense | reappraisal, ranking, operated, realisation, improvise | cousin, scribble, importing, happening, spawning |
| 24 | available | 0.9971 | freq+sense | distributed, forage, granting, impaired, catalog | publicly, code, download, website, demo |
| 25 | sim | 0.9971 | sense | lunar, lab, refused, finish, complete | sling, sim, real, inevitable, transfer |
| 26 | often ⚑ | 0.997 | topic-flagged | uninteresting, unrecognized, profoundly, electrified, argued | falter, neglected, credited, unnatural, overlooked |
| 27 | autonomy | 0.997 | sense | high, idea | assured, granting, accountable, stack, blended |
| 28 | demonstrate ⚑ | 0.997 | freq+sense | cinematic, ignorance, superior, resolve, remark | superiority, effectiveness, experimental, extensive, experiment |
| 29 | tracking | 0.9969 | sense | migration, incoming, app, unidentified, uplink | rogue, fast-moving, hovering, border, plume |
| 30 | design ⚑ | 0.9969 | topic-flagged | featuring, perceive, curriculum, replicator, schematic | binder, philosophy, deserves, edible, fabricate |
| 31 | learn | 0.9968 | freq+sense | cleanliness, inanimate, refine, ample, sharing | watching, continually, supposed, creature, imitating |
| 32 | com | 0.9968 | sense | system's, malfunctioning, high-tech, long-range, manual | watch, ooo, folder, dir, view |
| 33 | navigate | 0.9968 | sense | vortex, galaxy, across, star, speed | safely, unfamiliar, crowded, intercept, surroundings |
| 34 | video | 0.9968 | sense | step-by-step, unidirectional, augment, multi, digital | watched, supplemental, supplementary, demo, appendix |
| 35 | deep | 0.9967 | freq+sense | induces, breath, propeller, glacier, probe's | dip, reinforcement, diva, benefited, shallow |
| 36 | deployment | 0.9967 | sense | commencing, criticized, targeting, commanding, boom | prohibits, readiness, sabotage, hinder, high-stakes |
| 37 | world | 0.9966 | freq+sense | dominate, scarcer, unite, imperfect, counterpart | champion, real, imago, messy, anywhere |
| 38 | effectiveness | 0.9966 | sense | characterisation, testament, considerable, degree, security | verify, showcase, demonstrate, corroborate, confirm |
| 39 | demonstration | 0.9966 | sense | agility, physic, witnessed, readiness, electronic | handful, collecting, bathing, expert, collect |
| 40 | pedestrian | 0.9966 | sense | accomplishment, inevitably, versus, backed, auto | cyclist, suicidal, unmarked, reckoning, distracted |
| 41 | exploration | 0.9965 | sense | experimentation, notable, cease, expert, forbidden | stifle, exploitation, bonus, planetary, deep-sea |
| 42 | improves | 0.9965 | sense | skill, progress, view, lack, experience | consistently, substantially, significantly, modestly, flare |
| 43 | efficiency ⚑ | 0.9964 | freq+sense | streamlined, potassium, western, enthusiasm, abuse | enjoying, sacrificed, utmost, comfort, unsatisfactory |
| 44 | supervision | 0.9964 | sense | urban, adult, district, council, remain | democratic, weak, teacher's, pseudo, auxiliary |
| 45 | leverage | 0.9964 | sense | securing, ladder, gained, pipe, realized | warp, strength, abundance, splat, lazy |
| 46 | introduce ⚑ | 0.9963 | topic-flagged | del, stimulus, counterpart, optical, culinary | titled, dress, quiver, mirage, overcome |
| 47 | generation | 0.9963 | freq+sense | directional, succeeding, permanent, refugee, blossom | unconditional, camouflage, fifth, procedural, frame-by-frame |
| 48 | user | 0.9963 | freq+sense | habitual, recreational, enable, pusher, graphic | browse, behalf, inexperienced, bore, enjoyment |
| 49 | objective | 0.9962 | freq+sense | retrieval, formidable, utilize, unnecessary, worthy | conflicting, subjective, competing, pursue, fulfilling |
| 50 | navigating | 0.9962 | sense | high-speed, concentrate, traffic, felt, two | doorway, rugged, crowd, maze, sidewalk |

⚑ = 話題語疑いフラグ(語義証拠が弱いままL3入り。UIでも視覚的に区別する)
