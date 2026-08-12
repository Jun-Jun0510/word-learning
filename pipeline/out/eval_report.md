# Phase 2a 評価レポート

生成: build thresholds θd=0.0373 θd2=0.0107 θk(fieldKey)=10.00
コーパス tokens: A=38,540,515 B=6,559,676 C=3,360,019

## ゲート数値

| 指標 | 値 | 目標 | 判定 |
|---|---|---|---|
| 再現率(全体) | 18/20 (90%) | ≥70% | ✅ |
| **再現率(sense_shift群)** | 9/10 (90%) | <30%ならJSD設計やり直し | ✅(下限クリア) |
| 再現率(both群) | 9/10 (90%) | (参考) | - |
| 話題語型負例のL3混入 | 3/5 | 0 | ❌ 話題語ガード失敗 |
| 一般語型負例のL3混入 | 0/3 | 0 | ✅ |
| precision@50 | 手動採点待ち(下表) | ≥60% | ⏳ |

## positives 診断 — sense_shift 群(JSD設計の唯一の指標)

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| return | sense_shift | L3 | sense-replace | 5.2 | 4.01 | 0.6244 | 0.6145 | 0.0099 | 0.378 | ✓ | - |
| support | sense_shift | L3 | freq+sense | 5.5 | 21.63 | 0.6396 | 0.6105 | 0.0291 | 0.493 | ✓ | - |
| mass | sense_shift | L3 | sense-replace | 4.9 | -29.11 | 0.4936 | 0.6336 | -0.1401 | 0.655 | ✓ | - |
| hard | sense_shift | L3 | sense-replace | 5.5 | 7.91 | 0.7077 | 0.7010 | 0.0067 | 0.718 | ✓ | - |
| tight | sense_shift | L3 | sense-replace | 4.6 | -3.19 | 0.5926 | 0.6360 | -0.0434 | 1.000 | ✓ | - |
| regret | sense_shift | L3 | sense | 4.4 | 16.27 | 0.5141 | 0.4537 | 0.0604 | 0.745 | ✓ | - |
| collapse | sense_shift | L3 | sense-replace | 4.2 | 8.06 | 0.4483 | 0.4448 | 0.0036 | 0.585 | ✓ | - |
| greedy | sense_shift | L1b | academic | 3.8 | 2.75 | 0.2855 | 0.3252 | -0.0397 | 1.000 | ✗ | 3. 横軸-語義信号ミス(delta系不成立, sense-replace不成立, fieldKey<θk) |
| primitive | sense_shift | L3 | freq+sense | 3.8 | 10.01 | 0.4416 | 0.4285 | 0.0131 | 0.641 | ✓ | - |
| flat | sense_shift | L3 | sense-replace | 4.7 | -5.18 | 0.5409 | 0.5773 | -0.0363 | 0.884 | ✓ | - |

## positives 診断 — both 群

| 語 | signal | 判定 | bucket | zipf | fieldKey | jsdAC | jsdAB | delta | rg | 結果 | 落ちた段 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| head | both | L3 | sense | 5.5 | 26.66 | 0.7053 | 0.6605 | 0.0447 | 0.534 | ✓ | - |
| grounding | both | L3 | sense | 3.3 | 24.34 | 0.4074 | 0.1203 | 0.2872 | 0.984 | ✓ | - |
| manipulation | both | L3 | sense | 3.9 | 58.33 | 0.6237 | 0.3333 | 0.2904 | 0.778 | ✓ | - |
| demonstration | both | L3 | sense | 4.1 | 39.71 | 0.5675 | 0.3319 | 0.2356 | 0.602 | ✓ | - |
| prior | both | L3 | freq+sense | 4.8 | 36.88 | 0.5854 | 0.5403 | 0.0451 | 0.211 | ✓ | - |
| policy | both | L3 | sense | 5.2 | 85.65 | 0.6671 | 0.5568 | 0.1104 | 0.805 | ✓ | - |
| value | both | L3 | sense-replace | 5.2 | -14.05 | 0.6029 | 0.6161 | -0.0131 | 0.804 | ✓ | - |
| attention | both | L3 | sense | 5.1 | 31.64 | 0.6907 | 0.6336 | 0.0571 | 0.867 | ✓ | - |
| dense | both | L3 | sense | 4.0 | 20.40 | 0.5191 | 0.4528 | 0.0664 | 0.858 | ✓ | - |
| augmentation | both | L1a | topic-suspect | 3.0 | 18.32 | — | — | — | — | ✗ | 4. 話題語ガード誤爆 |

## negatives — 話題語型(ガードの検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| robot | L3 | freq+sense | 55.05 | 0.6268 | 0.3840 | 0.2428 | 0.289 | ✗ 混入 |
| controller | L3 | sense | 36.67 | 0.5031 | 0.2441 | 0.2590 | 0.791 | ✗ 混入 |
| dataset | L1a | topic-suspect | 40.45 | — | — | — | — | ✓ |
| benchmark | L1a | topic-suspect | 58.80 | — | — | — | — | ✓ |
| simulation | L3 | sense-replace | 3.49 | 0.6182 | 0.6264 | -0.0082 | 0.753 | ✗ 混入 |

## negatives — 一般語型(候補プール入口の検証)

| 語 | 判定 | bucket | fieldKey | jsdAC | jsdAB | delta | rg | 結果 |
|---|---|---|---|---|---|---|---|---|
| however | L1a | topic-suspect | 26.09 | 0.6590 | 0.5929 | 0.0661 | 0.724 | ✓ |
| increase | L1b | academic | -11.43 | 0.4950 | 0.5095 | -0.0145 | 0.134 | ✓ |
| describe | L1b | academic | -14.99 | 0.3403 | 0.4953 | -0.1549 | 0.281 | ✓ |

## precision@50 手動採点用リスト(L3判定 score上位50、読者既知語除外)

| # | 語 | score | bucket | collGeneral | collField |
|---|---|---|---|---|---|
| 1 | task | 1 | sense | unequal, dell, repetitive, modest, voluntary | leveling, coworker, lh, rainbow, accomplish |
| 2 | learning | 1 | sense | hands-on, chord, farming, commerce, distrust | reinforcement, arcade, imitation, machine, dil |
| 3 | tactile | 1 | sense | diagnose, subroutine, interface, substance, sophisticated | sensation, shipped, glove, indispensable, fingertip |
| 4 | training | 0.9999 | freq+sense | intensifies, hosted, op, hand-eye, hands-on | mop, saw, memorize, memorized, scratch |
| 5 | policy | 0.9999 | sense | relied, prohibits, rethink, dictate, strictest | discouraging, ol, ll, rolled, cosmos |
| 6 | action | 0.9998 | sense | stealthy, affirmative, cyclist, accountability, delaying | topple, mam, conformity, overriding, vila |
| 7 | trajectory | 0.9998 | sense | auto, calculate, steep, arc, distortion | oh, planned, pen, hovering, ate |
| 8 | performance | 0.9997 | sense | optimal, caption, realistic, featured, prohibited | outstanding, declining, alfred, superhuman, superior |
| 9 | across | 0.9997 | freq+sense | receding, blindly, grassland, ripple, walkway | distribute, photographic, latin, oasis, country |
| 10 | robotic | 0.9997 | sense | expansive, unnecessarily, gesture, slightly, appears | attendant, propelled, dog, grinding, singing |
| 11 | baseline | 0.9997 | sense | establish, tap, whose, ball, pull | strongest, surpassed, surpasses, compared, caf |
| 12 | environment | 0.9996 | sense | non-training, recycling, harmonious, affecting, sterile | arcade, crowded, extraterrestrial, amphibious, hostile |
| 13 | control | 0.9995 | freq+sense | consciously, tethered, metro, conditioned, on-board | deadbeat, traded, cruise, fdr, barrier |
| 14 | reasoning | 0.9995 | sense | flaw, prof, complex, society, claim | flawed, deductive, unfaithful, precede, mathematical |
| 15 | humanoid | 0.9995 | sense | anatomy, comparative, observing, isolated, physic | full-size, soccer, athletic, booster, miniature |
| 16 | manipulation | 0.9995 | sense | genetic, profile, limit, surgical, involving | chord, preparatory, cloth, pouring, dom |
| 17 | experiment | 0.9994 | freq+sense | magnetism, persistence, crude, vulnerability, conducted | extensive, opt, reverie, conducted, gibson |
| 18 | motion | 0.9994 | sense | moreover, detecting, acceptance, stand-up, reproductive | pebble, sickness, blur, venom, dance |
| 19 | propose | 0.9993 | sense | moreover, interval, motion, recover, sponsor | ware, dreaming, address, overcome, lucid |
| 20 | robot | 0.9993 | freq+sense | oversized, neutralized, deactivate, on-line, hydraulic | andrea, concentric, drama, nico, pepper |
| 21 | planning | 0.9992 | sense | assisting, annihilation, wholesale, hungary, reviewing | footstep, lazy, path, nav, retraction |
| 22 | visual | 0.9992 | sense | tasking, cortex, degrading, induce, stimulation | ventral, auditory, cortex, distraction, foresight |
| 23 | existing | 0.9992 | sense | challenging, matrix, destroyed, stopped, copy | plugged, resort, predominantly, mainly, either |
| 24 | robotics | 0.9992 | sense | mean | olfactory, education, workshop, gaining, er |
| 25 | object | 0.9991 | sense | improperly, fast-moving, near-earth, inanimate, collision | desk, permanence, receptacle, rearrange, pot |
| 26 | model | 0.9991 | sense | behavioral, looser, competing, probability, trend | disagreeing, advertised, omni, stealing, spurred |
| 27 | evaluation | 0.999 | sense | hospitality, assessed, psychiatric, reviewed, completed | formality, thorough, ope, fourteen, protocol |
| 28 | embodied | 0.999 | sense | spirit, think | intelligence, dependable, ei, ai, argues |
| 29 | success | 0.9989 | sense | departs, locating, dubious, anticipated, probability | rate, defended, sr, average, remarkable |
| 30 | language | 0.9989 | sense | slavic, subtlety, cambridge, asian, foreign | african, large, west, hindi, natural |
| 31 | autonomous | 0.9989 | sense | bot, programmed, department, we're | abu, sailboat, valet, league, racing |
| 32 | safety | 0.9988 | freq+sense | deactivate, workplace, disengage, constraint, guarantee | gymnasium, aviation, shield, assurance, comfort |
| 33 | reward | 0.9987 | sense | misinformation, finder, lira, collect, deposited | hacking, gallop, shaping, rm, meticulous |
| 34 | imitation | 0.9987 | sense | tradition, form, fair, giving, pretty | ail, il, learning, acquire, revisit |
| 35 | improves | 0.9987 | sense | skill, progress, view, lack, experience | bon, saga, consistently, pact, success |
| 36 | method | 0.9986 | freq+sense | unsound, wasteful, logically, withstand, interrogation | prevail, dd, marching, dab, existing |
| 37 | reinforcement | 0.9985 | sense | swarm, axis, gamma, perimeter, verbal | aco, rl, learning, deep, sac |
| 38 | grasping | 0.9985 | sense | little | bowel, bottle, pulling, retraction, chip |
| 39 | accuracy | 0.9985 | freq+sense | remarkable, coop, player, interest, remember | thai, centimeter, balanced, kappa, ruler |
| 40 | learned | 0.9984 | sense | substituting, disputed, refers, intelligently, astrophysics | witness, lesson, oat, extrapolate, corrupt |
| 41 | navigation | 0.9984 | sense | constitute, beacon, auto, hazard, automatic | sin, aided, denied, ins, crowded |
| 42 | deployment | 0.9984 | sense | pla, targeting, boom, commanding, factor | prohibits, readiness, real-life, challenged, coincide |
| 43 | trained | 0.9983 | sense | triggered, dim, professional, poorly, fully | goggles, scratch, town, exclusively, lam |
| 44 | world | 0.9982 | sense | beset, eureka, scarcer, dominate, imperfect | chem, versa, vice, cup, anywhere |
| 45 | aerial | 0.9982 | sense | mapping, survey, faculty, sticking, represent | twirling, midair, unmanned, photography, micro |
| 46 | diverse | 0.9982 | sense | artefact, culture, chest, exist, present | genre, inspire, furniture, sidewalk, repertoire |
| 47 | address | 0.9981 | sense | sender, esn, inverted, forwarding, swapping | issue, limitation, proposing, propose, challenge |
| 48 | prediction | 0.9981 | freq+sense | generalized, vague, initiate, remarkable, deny | hi, mortality, icu, deteriorate, glucose |
| 49 | representation | 0.9981 | freq+sense | trait, holographic, extreme, legal, wish | bird's, bird's-eye, probed, bev, smile |
| 50 | token | 0.998 | sense | lan, compatible, configuration, regard, musical | attended, trillion, sent, distracting, attend |
