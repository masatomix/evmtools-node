# 実装計画（phase5-evmethod-knowledge-0.0.34）

> **スコープ改訂（本セッション、ユーザー判断）**: 本 spec のうち **#171 知識ベース化（要件5・docsのみ）のみ実施**。
> EV 算定方式オプション evMethod（要件1〜4, 0/100・50/50）は、実運用ニーズが未確認かつ StatisticsOptions 拡張を伴うため **Backlog に先送り**（知識ベースからは「主観バイアス対処の将来候補」として参照）。
> リリースは docs のみのため番号を消費せず、次リリースに同乗。



> 方針: テスト先行（RED → GREEN）。EV 導出コア（純関数）→ options スレッディング → 統合検証 → 知識ベース/docs → Backlog 起票・リリースの順。
> 着手前ゲート: phase0-bugfix-0.0.29（許容誤差付き `finished`）と phase3-earned-schedule-0.0.32（`StatisticsOptions` の interface 化・options スレッディング・`includeEarnedSchedule`）が develop にマージ済みであることを確認する。phase3 未マージの場合、タスク 2.2 の ES 反映と `StatisticsOptions` 前提が成立しない。phase4-scurve-eac-0.0.33（`calculateForecastVariants`）は知識ベースの参照先のためタスク 3.1 の前提。
> ブランチ例: `feature/evmethod-knowledge`（develop から worktree 分岐、`--no-track`）。

- [ ] 1. EV 導出コアの新設
- [ ] 1.1 方式別 EV 導出の単体テストを追加（RED）
  - `src/domain/__tests__/Project.evMethod.test.ts` を新設し、`resolveTaskEv` / `sumEvsBy` / `calculateSpiBy` を 3 方式 ×（未着手/仕掛/完了/工数未設定）マトリクスで手計算一致検証
  - finished 境界値（phase0 の EPSILON 定義で 0.9999999 → 完了扱い）、未知の evMethod 値で明示的例外、`'progressRate'`/未指定が既存 `sumEVs`/`calculateSPI` と同値であることをケース化
  - 完了条件: 追加テストが未実装コアに対して RED
  - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
  - _Boundary: EV導出コア_
- [x] ~~1.2 resolveTaskEv / sumEvsBy / calculateSpiBy を実装（GREEN）~~ **取り下げ（Backlog 先送り）**
  - `src/domain/Project.ts` モジュールスコープに `EvMethod` 型と 3 関数を追加（design の判定表どおり。既定は既存 `sumEVs`/`calculateSPI` へ委譲しバイト一致）
  - `src/domain/index.ts` に `EvMethod` の export を追加
  - 完了条件: 1.1 のテストが GREEN、`TaskRow.ev` への書き込みが一切ないこと
  - _Requirements: 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
  - _Boundary: EV導出コア_
  - _Depends: 1.1_

- [x] ~~2. 統計経路への evMethod スレッディング~~ **取り下げ（Backlog 先送り）**
- [ ] 2.1 下流反映の統合テストを追加（RED）
  - `src/domain/__tests__/Project.evMethod.integration.test.ts` を新設
  - `getStatistics({evMethod})` の totalEv/spi/etcPrime が方式別に変わり PV・累積PV・BAC が不変（4.1, 4.4）、`getStatisticsByName({evMethod})` の担当者別反映（4.5）、`calculateCompletionForecast({evMethod})` の残作業・予測日変化（4.2）、`{evMethod, includeEarnedSchedule: true}` での ES（spiT/svT/esForecastDate）反映（4.3）、既定（未指定/`'progressRate'`）の戻り値が既存実装と完全一致（1.1, 1.3）をケース化
  - 完了条件: 追加テストが未配線の現行実装に対して RED（既定一致ケースは GREEN のまま）
  - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: Project統計経路_
  - _Depends: 1.2_
- [ ] 2.2 StatisticsOptions 拡張と options 伝播を実装（GREEN）
  - `StatisticsOptions` に `evMethod?: EvMethod` を追加（phase3 の interface 化済み前提。未反映なら本タスクで interface 化）
  - `_calculateStatistics` / `_calculateAssigneeStats` / `_calculateBasicStats` / `_calculateExtendedStats` へ evMethod を受け渡し、EV/SPI 集計を `sumEvsBy`/`calculateSpiBy` 経由に切替。`getStatistics` / `getStatisticsByName` / `calculateCompletionForecast` が options から evMethod を伝播（`calculateEarnedSchedule` は `getStatistics(options).totalEv` 経由の自動反映を確認）
  - 完了条件: 2.1 のテストが GREEN、**既存テストが全て無変更で緑**（受け入れ条件そのもの）
  - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: Project統計経路_
  - _Depends: 2.1_

- [x] 3. 知識ベースとドキュメント
- [x] 3.1 (P) docs/EVM-KNOWLEDGE.md を新設
  - 知見ⓐ〜ⓗ（+ⓗ′）を各 4 観点（現象/理論的背景/本ツールでの確認方法（API・CLI 名）/対処・解決状況）で体系化
  - 相互参照: ⓑ→`calculateEarnedSchedule` の SPI(t)（phase3）、回復/失速→`ProjectService.calculateRecentSpi` 期間SPI（phase0）、予測の幅→`calculateForecastVariants`（phase4）、主観バイアス対処→本 spec の evMethod。元資料 `docs/brainstorm-evm-indicators.md` へのリンクを保持
  - 完了条件: 8 知見 × 4 観点が網羅され、参照 API 名がすべて実在すること
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - _Boundary: docs/EVM-KNOWLEDGE.md_
- [x] 3.2 (P) README / GLOSSARY のリンクと用語追加
  - `docs/GLOSSARY.md` に EV 算定方式（progressRate / 0/100 / 50/50）の定義と EVM-KNOWLEDGE へのリンクを追加、`README.md` からもリンク
  - `docs/brainstorm-evm-indicators.md` に知識ベースへの誘導注記を追加（元資料として保持）
  - 完了条件: リンク切れがなく、用語定義が design の EV 導出規則表と一致すること
  - _Requirements: 6.1_
  - _Boundary: README, docs/GLOSSARY.md_
  - _Depends: 3.1_

- [x] 4. 設計書同期と Backlog 起票
- [ ] 4.1 (P) feature/master 設計書を同期
  - `docs/specs/domain/features/Project.evMethod.spec.md` を作成（AC-ID → TC-ID の要件トレーサビリティ表必須、grep 可能な AC-ID 形式）
  - `docs/specs/domain/master/Project.spec.md` に evMethod 仕様・EV 導出規則・テストシナリオ・変更履歴（バージョン更新）を同期。差分計算（calculateTaskDiffs 等）が evMethod 対象外である線引きも明記
  - 完了条件: master の該当節と feature 設計書・実装が一致すること
  - _Requirements: 6.2, 6.3_
  - _Boundary: docs/specs_
  - _Depends: 2.2_
- [x] 4.2 (P) Backlog Issue 3 件を起票
  - `gh issue create` で機能化候補を独立 Issue 化: (1) ⓗ′ タスク name 変化警告（ID 突合時の名称変更検出）、(2) ⓒ 停滞タスク経時追跡（複数スナップショットでの進捗停滞検出）、(3) ⓕ BAC トレンド（総工数の単調増加の可視化）。各 Issue にタイトル・背景（EVM-KNOWLEDGE の該当知見への参照）・スコープ案を記載
  - 完了条件: 3 Issue が open 状態で存在し、EVM-KNOWLEDGE.md から Issue 番号を参照していること
  - _Requirements: 6.4_
  - _Boundary: GitHub Issues_
  - _Depends: 3.1_

- [ ] 5. Validation・リリース準備
- [ ] 5.1 検証ゲートを通す
  - `npm run lint && npm run format && npm test && npm run build` + `TZ=Asia/Tokyo npm test` / `TZ=UTC npm test` を全て緑にする
  - サンプルデータで `getStatistics({evMethod: '0/100'})` / `{'50/50'}` の SPI 変化を CLI/スクリプトで目視確認
  - 完了条件: 全ゲート緑 + 3 方式の出力確認記録
  - _Requirements: 1.1, 4.1_
  - _Depends: 2.2, 3.2, 4.1_
- [ ] 5.2 release/0.0.34 準備
  - `package.json` バージョンを 0.0.34 に更新、CHANGELOG に Added（evMethod オプション・EVM-KNOWLEDGE）を非破壊 Feature として明記
  - 完了条件: バージョン・CHANGELOG が更新され検証ゲートが緑
  - _Requirements: 6.5_
  - _Depends: 5.1_

## Implementation Notes
- 本セッション: 知識ベース化（要件5）のみ実施。evMethod（要件1〜4）は Backlog 先送り。機能化候補は #184（停滞追跡）/#185（BACトレンド）/#186（name変化警告）として起票。docs のみのためリリース番号消費なし
