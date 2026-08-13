# Phase 2a 評価レポート

> **注意: 本レポートの再現率は検証セットに対するものであり、汎化性能ではない。**
> 凍結された20語に対して5イテレーションの改良を行ったため、この20語は適合済みの
> 検証セットである。用途は「設計変更が既存の検出を壊していないかの回帰テスト」のみ。
> 未知語に対する汎化性能を示すのは precision@50(手動採点)と、Phase 2b ゲート用
> held-out セット(参照禁止)のみ。

生成: build thresholds θd=0.1234 θd2=0.0725 θk(fieldKey)=10.00
コーパス tokens: A=38,540,515 B=6,559,676 C=13,239,998

## ゲート数値

| 指標 | 値 | 目標 | 判定 |
|---|---|---|---|
| 再現率(全体) | 14/20 (70%) | ≥70% | ✅ |
| **再現率(sense_shift群)** | 7/10 (70%) | <30%ならJSD設計やり直し | ✅(下限クリア) |
| 再現率(both群) | 7/10 (70%) | (参考) | - |
| 話題語型負例のL3混入 | 2/5 | 0 | ❌ 話題語ガード失敗 |
| 一般語型負例のL3混入 | 0/3 | 0 | ✅ |
| precision@50 | 手動採点待ち(下表) | ≥60% | ⏳ |

## positives 診断 — sense_shift 群(JSD設計の唯一の指標)

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| return | sense_shift | L3 | sense-replace | 5.2 | -2.51 | 0.6402 | 0.6171 | 0.0231 | 0.636 | ✓ | - |
| support | sense_shift | L1a | topic-suspect | 5.5 | 11.76 | 0.6450 | 0.6077 | 0.0373 | 0.474 | ✗ | 4. 話題語ガード誤爆 |
| mass | sense_shift | L3 | sense-academic | 4.9 | -53.40 | 0.5541 | 0.6317 | -0.0777 | 0.184 | ✓ | - |
| hard | sense_shift | L3 | sense-replace | 5.5 | 5.84 | 0.7186 | 0.7043 | 0.0143 | 0.525 | ✓ | - |
| tight | sense_shift | L3 | sense-replace | 4.6 | -7.51 | 0.6498 | 0.6336 | 0.0162 | 0.800 | ✓ | - |
| regret | sense_shift | L3 | sense | 4.4 | 18.77 | 0.6363 | 0.4490 | 0.1873 | 0.853 | ✓ | - |
| collapse | sense_shift | L1b | academic | 4.2 | 1.97 | 0.5338 | 0.4454 | 0.0884 | 0.507 | ✗ | 2. 横軸-頻度信号ミス |
| greedy | sense_shift | L1b | academic | 3.8 | 3.87 | 0.4510 | 0.3305 | 0.1205 | 1.000 | ✗ | 2. 横軸-頻度信号ミス |
| primitive | sense_shift | L3 | freq+sense | 3.8 | 10.63 | 0.5623 | 0.4205 | 0.1418 | 0.498 | ✓ | - |
| flat | sense_shift | L3 | sense-academic | 4.7 | -13.08 | 0.5871 | 0.5763 | 0.0108 | 0.671 | ✓ | - |

## positives 診断 — both 群

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| head | both | L1a | topic-suspect | 5.5 | 22.31 | 0.7180 | 0.6609 | 0.0571 | 0.344 | ✗ | 4. 話題語ガード誤爆 |
| grounding | both | L3 | sense | 3.3 | 20.21 | 0.5024 | 0.1218 | 0.3806 | 0.958 | ✓ | - |
| manipulation | both | L3 | sense | 3.9 | 55.22 | 0.6477 | 0.3306 | 0.3171 | 0.660 | ✓ | - |
| demonstration | both | L3 | sense | 4.1 | 39.38 | 0.6274 | 0.3321 | 0.2953 | 0.550 | ✓ | - |
| prior | both | L3 | freq+sense | 4.8 | 36.34 | 0.6286 | 0.5504 | 0.0782 | 0.069 | ✓ | - |
| policy | both | L3 | freq+sense | 5.2 | 79.96 | 0.6751 | 0.5536 | 0.1216 | 0.835 | ✓ | - |
| value | both | L1b | academic | 5.2 | -30.56 | 0.6400 | 0.6216 | 0.0184 | 0.757 | ✗ | 2. 横軸-頻度信号ミス |
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
| simulation | L1b | academic | 9.44 | 0.6551 | 0.6219 | 0.0332 | 0.756 | ✓ |

## negatives — 一般語型(候補プール入口の検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| however | (なし) | - | — | — | — | — | — | ✓ |
| increase | L1b | academic | -14.01 | 0.5620 | 0.5136 | 0.0483 | 0.244 | ✓ |
| describe | L1b | academic | -17.70 | 0.5086 | 0.5001 | 0.0084 | 0.822 | ✓ |

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
| 1 | environment ⚑ | 0.9999 | freq+sense | non-training, recycling, pivotal, harmonious, affecting | undersea, man-made, dusty, degenerative, denied |
| 2 | object ⚑ | 0.9997 | freq+sense | fast-moving, inanimate, improperly, collision, promote | permanence, rearranged, gripped, picturing, contacted |
| 3 | policy | 0.9997 | freq+sense | relied, prohibits, strictest, rethink, dictate | mobilization, ambidextrous, composer, firewall, shielded |
| 4 | propose | 0.9996 | freq+sense | interval, motion, recover, sponsor, happiness | elf, address, dreaming, motivated, overcome |
| 5 | trajectory | 0.9996 | freq+sense | calculate, auto, blast, steep, distortion | courtesy, jittery, planned, gun, jerky |
| 6 | experiment ⚑ | 0.9995 | freq+sense | magnetism, persistence, detailing, cyberspace, crude | extensive, conducted, conduct, corroborate, cadaver |
| 7 | motion | 0.9995 | sense-academic | acceptance, detecting, stand-up, propose, marketing | bumping, incompetent, blur, pebble, washout |
| 8 | robot ⚑ | 0.9994 | freq+sense | oversized, on-line, hydraulic, deactivate, powered | luminous, incompetent, thrower, butler, kidnapped |
| 9 | action | 0.9993 | sense-academic | stealthy, rapidity, affirmative, accountability, delaying | topple, opponent's, chunk, authorize, overriding |
| 10 | autonomous | 0.9993 | sense | bot, programmed, department | valet, racing, shuttle, driving, modern-day |
| 11 | planning | 0.9992 | sense | assisting, wholesale, annihilation, reviewing, inviting | footstep, path, bony, sub-systems, windy |
| 12 | baseline | 0.9992 | sense | establish, tap, whose, ball, pull | strongest, beat, beating, reverts, surpasses |
| 13 | proposed | 0.999 | freq+sense | detailed, stabilize, separation, honest, cattle | squirrel, effectiveness, superiority, manipulative, illustrate |
| 14 | existing | 0.999 | freq+sense | challenging, matrix, lizard, destroyed, stopped | plugged, predominantly, rely, assume, either |
| 15 | manipulation | 0.9989 | sense | genetic, profile, limit, surgical, reached | cloth, ambidextrous, clothes, forceful, tangle |
| 16 | reasoning | 0.9988 | sense | flaw, possessed, prof, complex, society | unfaithful, deductive, math, flawed, mathematical |
| 17 | novel | 0.9987 | freq+sense | spawned, writes, comeback, originated, adapted | morality, beautiful, sold, letter, fiction |
| 18 | safety ⚑ | 0.9987 | freq+sense | obscurity, deactivate, guarantee, constraint, workplace | blessing, vest, assure, assurance, vessel's |
| 19 | sensor | 0.9987 | sense | realign, realigned, aligned, array, torque | nitrate, picturing, flex, armband, grating |
| 20 | visual | 0.9986 | freq+sense | tasking, cortex, keyhole, induce, stimulation | homing, looming, auditory, cortex, ventral |
| 21 | address | 0.9985 | freq+sense | sender, correlate, forwarding, inverted, exchanging | issue, shortcoming, limitation, proposing, challenge |
| 22 | scenario | 0.9984 | freq+sense | worst-case, aortic, detailing, hypothetical, mutation | mutates, roundabout, confrontation, highway, unprotected |
| 23 | evaluation | 0.9984 | freq+sense | hospitality, assessed, psychiatric, reviewed, completed | formality, blinded, thorough, protocol, script |
| 24 | reinforcement | 0.9983 | sense | axis, swarm, gamma, perimeter, verbal | learning, deep, offline, embrace, progressed |
| 25 | vehicle | 0.9983 | sense | hijacking, inconspicuous, retaining, piloting, departs | unmanned, overtaken, oncoming, mainline, crashed |
| 26 | reward | 0.9982 | sense | misinformation, scheming, finder, collect, deposited | hacking, hack, shaping, fooling, punishment |
| 27 | pose | 0.9982 | sense | threat, include, risk, tactical, photo | regress, estimation, camera's, serious, dock |
| 28 | driving ⚑ | 0.9981 | freq+sense | ballast, fertilization, instructor, handling, eddy | commentary, mutates, autonomous, style, highway |
| 29 | diverse | 0.998 | sense | artefact, treasure, culture, chest, exist | repertoire, athletic, populate, clothes, accommodating |
| 30 | navigation | 0.9979 | sense | constitute, beacon, auto, automatic, hazard | denied, audio-visual, aided, crowd, satellite |
| 31 | capability ⚑ | 0.9979 | freq+sense | minimal, tech, equipped, electronic, warp | compost, unlocked, instill, endow, unlocks |
| 32 | challenging ⚑ | 0.9977 | freq+sense | considerably, existing, pursuit, found, system | vertically, immensely, remains, snowy, basketball |
| 33 | trained | 0.9976 | freq+sense | countering, catering, triggered, dim, professional | scratch, exclusively, town, fashion, entirely |
| 34 | perception | 0.9976 | sense | reacting, heightened, sensation, clarity, discipline | roadside, people's, introspective, certifiable, cooperative |
| 35 | learned | 0.9975 | freq+sense | substituting, disputed, refers, intelligently, solicit | lesson, forgets, breakfast, fetching, plugged |
| 36 | agile | 0.9975 | sense | skeleton, strong, age, food, looking | solo, interception, maneuvering, flight, maneuver |
| 37 | success ⚑ | 0.9974 | freq+sense | short-lived, departs, locating, anticipated, probability | owe, rate, enjoyed, overhand, tremendous |
| 38 | architecture | 0.9974 | freq+sense | visualise, ancestry, inventory, visualize, exhibit | quad, layered, coaxial, transformer, sofa |
| 39 | terrain | 0.9973 | sense | familiarity, uncharted, rugged, render, observation | muddy, uneven, rough, rugged, slippery |
| 40 | extensive | 0.9973 | sense | classification, interaction, vocabulary, possesses, parrot | experiment, experimentation, conduct, livestock, underwent |
| 41 | controller | 0.9972 | sense | flight, traffic, airplane, network, connection | clairvoyant, cutter, offspring, backup, stabilizing |
| 42 | scene | 0.9971 | sense | reappraisal, ranking, operated, realisation, improvise | cousin, scribble, importing, happening, spawning |
| 43 | available | 0.9971 | freq+sense | distributed, forage, granting, impaired, catalog | publicly, code, download, website, demo |
| 44 | sim | 0.9971 | sense | lunar, lab, refused, finish, complete | sling, sim, real, inevitable, transfer |
| 45 | autonomy | 0.997 | sense | high, idea | assured, granting, accountable, stack, blended |
| 46 | demonstrate ⚑ | 0.997 | freq+sense | cinematic, ignorance, superior, resolve, remark | superiority, effectiveness, experimental, extensive, experiment |
| 47 | tracking | 0.9969 | sense | migration, incoming, app, unidentified, uplink | rogue, fast-moving, hovering, border, plume |
| 48 | learn | 0.9968 | freq+sense | cleanliness, inanimate, refine, ample, sharing | watching, continually, supposed, creature, imitating |
| 49 | com | 0.9968 | sense | system's, malfunctioning, high-tech, long-range, manual | watch, ooo, folder, dir, view |
| 50 | navigate | 0.9968 | sense | vortex, galaxy, across, star, speed | safely, unfamiliar, crowded, intercept, surroundings |

⚑ = 話題語疑いフラグ(語義証拠が弱いままL3入り。UIでも視覚的に区別する)
