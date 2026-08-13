# Phase 2a 評価レポート

> **注意: 本レポートの再現率は検証セットに対するものであり、汎化性能ではない。**
> 凍結された20語に対して5イテレーションの改良を行ったため、この20語は適合済みの
> 検証セットである。用途は「設計変更が既存の検出を壊していないかの回帰テスト」のみ。
> 未知語に対する汎化性能を示すのは precision@50(手動採点)と、Phase 2b ゲート用
> held-out セット(参照禁止)のみ。

生成: build thresholds θd=0.1218 θd2=0.0710 θk(fieldKey)=10.00
コーパス tokens: A=38,540,515 B=6,559,676 C=13,239,998

## ゲート数値

| 指標 | 値 | 目標 | 判定 |
|---|---|---|---|
| 再現率(全体) | 17/20 (85%) | ≥70% | ✅ |
| **再現率(sense_shift群)** | 9/10 (90%) | <30%ならJSD設計やり直し | ✅(下限クリア) |
| 再現率(both群) | 8/10 (80%) | (参考) | - |
| 話題語型負例のL3混入 | 3/5 | 0 | ❌ 話題語ガード失敗 |
| 一般語型負例のL3混入 | 1/3 | 0 | ❌ 候補プール入口失敗 |
| precision@50 | 手動採点待ち(下表) | ≥60% | ⏳ |

## positives 診断 — sense_shift 群(JSD設計の唯一の指標)

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| return | sense_shift | L3 | sense-replace | 5.2 | -2.51 | 0.6413 | 0.6181 | 0.0232 | 0.635 | ✓ | - |
| support | sense_shift | L3 | sense-replace | 5.5 | 11.76 | 0.6502 | 0.6145 | 0.0356 | 0.509 | ✓ | - |
| mass | sense_shift | L1b | academic | 4.9 | -53.40 | 0.5592 | 0.6370 | -0.0778 | 0.154 | ✗ | 3. 横軸-語義信号ミス(delta系不成立, sense-replace不成立, fieldKey<θk) |
| hard | sense_shift | L3 | sense-replace | 5.5 | 5.84 | 0.7146 | 0.6999 | 0.0147 | 0.520 | ✓ | - |
| tight | sense_shift | L3 | sense-replace | 4.6 | -7.51 | 0.6506 | 0.6336 | 0.0170 | 0.792 | ✓ | - |
| regret | sense_shift | L3 | sense | 4.4 | 18.77 | 0.6401 | 0.4548 | 0.1853 | 0.847 | ✓ | - |
| collapse | sense_shift | L3 | sense-replace | 4.2 | 1.97 | 0.5340 | 0.4470 | 0.0869 | 0.493 | ✓ | - |
| greedy | sense_shift | L3 | sense | 3.8 | 3.87 | 0.4468 | 0.3236 | 0.1232 | 1.000 | ✓ | - |
| primitive | sense_shift | L3 | sense | 3.8 | 10.63 | 0.5649 | 0.4235 | 0.1414 | 0.500 | ✓ | - |
| flat | sense_shift | L3 | sense-replace | 4.7 | -13.08 | 0.5847 | 0.5748 | 0.0099 | 0.670 | ✓ | - |

## positives 診断 — both 群

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| head | both | L1a | topic-suspect | 5.5 | 22.31 | 0.7183 | 0.6573 | 0.0610 | 0.250 | ✗ | 4. 話題語ガード誤爆 |
| grounding | both | L3 | sense | 3.3 | 20.21 | 0.5029 | 0.1218 | 0.3811 | 0.959 | ✓ | - |
| manipulation | both | L3 | sense | 3.9 | 55.22 | 0.6543 | 0.3389 | 0.3154 | 0.779 | ✓ | - |
| demonstration | both | L3 | sense | 4.1 | 39.38 | 0.6308 | 0.3357 | 0.2951 | 0.538 | ✓ | - |
| prior | both | L3 | freq+sense | 4.8 | 36.34 | 0.6294 | 0.5512 | 0.0781 | 0.071 | ✓ | - |
| policy | both | L3 | freq+sense | 5.2 | 79.96 | 0.6820 | 0.5616 | 0.1204 | 0.829 | ✓ | - |
| value | both | L3 | sense-replace | 5.2 | -30.56 | 0.6375 | 0.6175 | 0.0200 | 0.754 | ✓ | - |
| attention | both | L3 | freq+sense | 5.1 | 36.83 | 0.7165 | 0.6344 | 0.0821 | 0.766 | ✓ | - |
| dense | both | L3 | sense | 4.0 | 17.54 | 0.5900 | 0.4518 | 0.1382 | 0.711 | ✓ | - |
| augmentation | both | L1a | topic-suspect | 3.0 | 18.39 | — | — | — | — | ✗ | 4. 話題語ガード誤爆 |

## negatives — 話題語型(ガードの検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| robot | L3 | freq+sense | 59.75 | 0.6233 | 0.3911 | 0.2322 | 0.146 | ✗ 混入 |
| controller | L3 | sense | 42.20 | 0.5932 | 0.2383 | 0.3549 | 0.680 | ✗ 混入 |
| dataset | L1a | topic-suspect | 52.46 | — | — | — | — | ✓ |
| benchmark | L1a | topic-suspect | 56.93 | — | — | — | — | ✓ |
| simulation | L3 | sense-replace | 9.44 | 0.6526 | 0.6246 | 0.0279 | 0.754 | ✗ 混入 |

## negatives — 一般語型(候補プール入口の検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| however | L1a | topic-suspect | 42.63 | 0.6722 | 0.5987 | 0.0735 | 0.549 | ✓ |
| increase | L1b | academic | -14.01 | 0.5625 | 0.5159 | 0.0466 | 0.231 | ✓ |
| describe | L3 | sense-replace | -17.70 | 0.5091 | 0.5001 | 0.0089 | 0.820 | ✗ 混入 |

## キュレーション・ピン登録語(条件a: アルゴリズムが拾えなかった語の恒久記録)

ピンは逃げ道ではなくアルゴリズムの失敗の記録である。**ピン件数の増加 = アルゴリズムの失敗の増加**として読む。

| 語 | アルゴリズム判定 | ピンのみ?(=検出失敗) | pinReason |
|---|---|---|---|
| mass | L1b/academic | **✗ ピンのみ** | C構成がR重心のため物理質量が支配語義になり、確率質量の語義信号が消滅(2026-08-13 の before/after 検証。R/L別統計を入れたら再判定) |
| prior | L3/freq+sense | —(検出済み) | アルゴリズムでも検出済み(freq+sense)だが、品詞で語義が割れるため語義キュレーションが必要(検出失敗によるピンではない) |

## 既知の不一致(発注者承認済み。正解セットは凍結のまま)

| 語 | 分類 | 備考 |
|---|---|---|
| augmentation | 既知の不一致 | A に共起データがなく実質専門語として L2 判定される(L2 として表示はされるため実害小)。発注者の正解セット側で L3 指定が誤りの可能性も併記(zipf 3.0 は「見た目日常語」の下限ぎりぎり)。セットは凍結のまま維持 |
| greedy | A起因の取りこぼし | OpenSubtitles(会話コーパス)で共起が疎(jsdAC 過小)。会話に出にくい語の構造的弱点。held-out セットで同種の取りこぼしが再発したら A の補強を検討(発注者判断) |

## precision@50 手動採点用リスト(L3判定 score上位50、読者既知語除外)

| # | 語 | score | bucket | collGeneral | collField |
|---|---|---|---|---|---|
| 1 | task | 1 | sense-replace | unequal, keyhole, repetitive, modest, voluntary | screwing, pretext, mundane, scratching, accomplish |
| 2 | learning | 1 | sense-replace | hands-on, chord, farming, distrust, commerce | reinforcement, imitation, machine, pu, boon |
| 3 | grasping | 1 | sense | little | cornell, rectangle, bowel, tangle, poking |
| 4 | environment | 0.9999 | freq+sense | recycling, affecting, sterile, hands-on, endangered | man-made, dusty, degenerative, marina, denied |
| 5 | method | 0.9999 | sense-replace | wasteful, withstand, logically, newest, motivation | prevail, nsa, hutchinson, fu, tent |
| 6 | training | 0.9998 | sense-replace | intensifies, op, hosted, hand-eye, rigorous | dreamed, regimen, memorize, recipe, scratch |
| 7 | performance | 0.9998 | sense-replace | optimal, caption, realistic, featured, prohibited | superior, superhuman, boost, outstanding, super-human |
| 8 | tactile | 0.9998 | sense | stethoscope, diagnose, subroutine, interface, substance | imprint, sensation, tac, skin, sensing |
| 9 | object ⚑ | 0.9997 | freq+sense | near-earth, inanimate, collision, promote, tracked | rearranged, gripped, contacted, interstellar, receptacle |
| 10 | control | 0.9997 | sense-replace | consciously, metro, tethered, on-board, vehicle's | on-off, cruise, traded, barrier, fdr |
| 11 | policy | 0.9997 | freq+sense | relied, prohibits, rethink, dictate, economic | pow, ambidextrous, sep, composer, ol |
| 12 | imitation | 0.9997 | sense | tradition, form, fair, giving, doe | gail, il, dime, ail, mail |
| 13 | propose | 0.9996 | freq+sense | moreover, interval, motion, recover, rival | ware, elf, address, lucid, amo |
| 14 | trajectory | 0.9996 | freq+sense | calculate, auto, blast, distortion, arc | courtesy, planned, gun, oh, cobalt |
| 15 | experiment ⚑ | 0.9995 | freq+sense | persistence, crude, vulnerability, conducted, preparatory | extensive, conducted, rebel, conduct, corroborate |
| 16 | motion | 0.9995 | freq+sense | moreover, acceptance, detecting, stand-up, propose | incompetent, blur, pebble, venom, washout |
| 17 | robotics | 0.9995 | sense | mean | club, duke, drake, michigan, warthog |
| 18 | robot ⚑ | 0.9994 | freq+sense | oversized, on-line, hydraulic, deactivate, powered | luminous, nadia, cassie, baxter, incompetent |
| 19 | action | 0.9993 | sense-replace | stealthy, affirmative, cyclist, delaying, archetype | chunk, clam, oat, authorize, vila |
| 20 | autonomous | 0.9993 | sense | bot, programmed, department | indy, valet, racing, shuttle, driving |
| 21 | humanoid | 0.9993 | sense | typhoon, anatomy, comparative, observing, isolated | nadia, bruce, berkeley, full-size, booster |
| 22 | model | 0.9992 | sense-replace | behavioral, competing, looser, probability, trend | saint, advertised, voter, spiked, foundation |
| 23 | planning | 0.9992 | sense | assisting, wholesale, hungary, reviewing, inviting | vamp, footstep, path, bony, lea |
| 24 | baseline | 0.9992 | sense | establish, tap, whose, ball, pull | strongest, beat, reverts, beating, snip |
| 25 | unmanned | 0.9992 | sense | orbital, monitoring, platform, probe, fighter | manned, warthog, aerial, aka, uav |
| 26 | proposed | 0.999 | freq+sense | detailed, stabilize, separation, honest, cattle | squirrel, effectiveness, superiority, manipulative, illustrate |
| 27 | existing | 0.999 | freq+sense | challenging, matrix, lizard, destroyed, stopped | plugged, predominantly, rely, assume, however |
| 28 | indoor | 0.999 | sense | rugged, swimming, pool, large, challenge | outdoor, apartment, blimp, garage, denied |
| 29 | accuracy | 0.9989 | sense-replace | remarkable, player, interest, remember, work | centimetre, thai, micrometer, centimeter, millimeter |
| 30 | manipulation | 0.9989 | sense | genetic, profile, limit, surgical, federation | dom, cloth, clothes, ambidextrous, forceful |
| 31 | language | 0.9988 | sense-replace | subtlety, asian, cambridge, verb, foreign | esoteric, african, large, indigenous, natural |
| 32 | reasoning | 0.9988 | sense | flaw, prof, complex, society, claim | unfaithful, tot, deductive, countdown, flawed |
| 33 | aerial | 0.9988 | sense | mapping, survey, faculty, sticking, branch | unmanned, micro, photography, du, cinematography |
| 34 | novel | 0.9987 | freq+sense | saga, spawned, writes, originated, adapted | morality, beautiful, sold, sta, letter |
| 35 | safety ⚑ | 0.9987 | freq+sense | obscurity, deactivate, constraint, guarantee, spinning | vest, assure, assurance, jeopardize, shield |
| 36 | robotic | 0.9987 | sense | expansive, unnecessarily, gesture, slightly, appears | lizard, scrub, three-fingered, singing, coach |
| 37 | sensor | 0.9987 | sense | realigned, aligned, array, torque, activates | nitrate, bragg, flex, armband, hall |
| 38 | agent | 0.9986 | sense-replace | dss, assertion, sedan, whitney, dea | tulip, sleeper, trustee, subordinate, codex |
| 39 | visual | 0.9986 | freq+sense | tasking, cortex, keyhole, stimulation, induce | homing, cortex, ventral, answering, viper |
| 40 | address | 0.9985 | freq+sense | sender, esn, forwarding, inverted, exchanging | issue, limitation, proposing, challenge, propose |
| 41 | ros | 0.9985 | sense | bank | humble, gazebo, nav, package, callback |
| 42 | scenario | 0.9984 | freq+sense | worst-case, hypothetical, ware, mutation, abduction | roundabout, confrontation, highway, unprotected, battlefield |
| 43 | evaluation | 0.9984 | freq+sense | hospitality, assessed, psychiatric, reviewed, completed | formality, ope, blinded, thorough, protocol |
| 44 | reinforcement | 0.9983 | sense | axis, swarm, gamma, perimeter, verbal | rl, learning, deep, pearl, embrace |
| 45 | vehicle | 0.9983 | sense | retaining, piloting, departs, unsafe, acquisition | unmanned, oncoming, crashed, micro, cockpit |
| 46 | planner | 0.9983 | sense | remedy, daily, initial, scheduled, schedule | chomp, top-level, bow, overtake, cbs |
| 47 | reward | 0.9982 | sense | scheming, finder, lira, collect, deposited | hacking, hack, eureka, shaping, punishment |
| 48 | pose | 0.9982 | sense | threat, include, risk, tactical, photo | tac, ape, regress, estimation, nap |
| 49 | embodied | 0.9982 | sense | spirit, think | intelligence, ai, ei, dependable, arena |
| 50 | driving ⚑ | 0.9981 | freq+sense | ballast, instructor, handling, eddy, toyota | commentary, ads, olympics, style, highway |

⚑ = 話題語疑いフラグ(語義証拠が弱いままL3入り。UIでも視覚的に区別する)
