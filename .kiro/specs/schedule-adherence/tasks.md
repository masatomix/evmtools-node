# 実装計画（schedule-adherence）

> **実装ゲート**: 本 spec は設計まで先行。**実装トリガー**（利用側スキルで plan-adherence 系レポートが定着し、独自実装の数値乖離リスクが顕在化）**の成立後に着手**する（requirements.md 冒頭参照）。
> 方針: テスト先行（RED → GREEN）。純関数コア → Project 統合（ES コンテキスト共通化）→ docs 同期 → 検証。
> ブランチ例: `feature/schedule-adherence`（develop から分岐）。

- [ ] 1. domain: schedule-adherence 純関数コア（ScheduleAdherence.ts）
- [ ] 1.1 (P) コア純関数のテストを追加（RED）
  - `src/domain/__tests__/ScheduleAdherence.test.ts` を新設（冒頭に `spec: schedule-adherence 要件N` を記載）
  - design の数値例（PVj(ES)=[1,1,1,0,0]・EVj=[1,0,1,0,1] → P=2/3）、完全順守 P=1、plannedTotal=0 → undefined、分類3種（ahead/behind/conforming、EPS=1e-9 境界含む）、|deviation| 降順ソート、ev 過剰ケースでも 0≤P≤1 をケース化
  - 完了条件: 追加テストが未実装モジュールに対して RED（Cannot find module）
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4_
  - _Boundary: ScheduleAdherence.ts（新規）_
- [ ] 1.2 calculateScheduleAdherenceCore を実装（GREEN）
  - `src/domain/ScheduleAdherence.ts` に `TaskAdherenceDetail` / `ScheduleAdherenceResult` / `ScheduleAdherenceInput` 型と `calculateScheduleAdherenceCore` を実装（design のインターフェース仕様どおり。TaskRow 型以外に依存しない）
  - 完了条件: 1.1 のテストが全緑、`import` が型と TaskRow のみであること
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4_
  - _Boundary: ScheduleAdherence.ts_
  - _Depends: 1.1_

- [ ] 2. domain: schedule-adherence の Project 統合
- [ ] 2.1 (P) ES 算出コンテキストの共通化リファクタ（外部挙動不変）
  - `Project.calculateEarnedSchedule` の前半（タスク解決〜曲線構築〜core 呼び出し）を private `_computeEsContext(options?)` に抽出
  - 完了条件: **既存テスト（ES 33件含む全件）を1件も変更せずに全緑**。`calculateEarnedSchedule` の公開シグネチャ・戻り値不変
  - _Requirements: 4.1, 4.2_
  - _Boundary: Project.ts（calculateEarnedSchedule 周辺のみ）_
- [ ] 2.2 Project 統合テストを追加（RED）
  - `src/domain/__tests__/Project.scheduleAdherence.test.ts` を新設
  - design のテスト戦略 (1)〜(8) をケース化: 数値例 end-to-end（SPI(t)=1.0 × P=0.67 の同時実証）/ es・at の `calculateEarnedSchedule` 一致（フィルタ×evMethod 4通り）/ クランプなしケースの plannedTotal ≈ EV / 完了 P=1 / EV=0 undefined / フィルタ部分集合 / evMethod='0/100' で P 変化・PVj 不変 / 小数 ES 補間手計算
  - 完了条件: `calculateScheduleAdherence` 未実装に対して RED
  - _Requirements: 1.4, 1.6, 1.7, 3.1, 3.2, 3.3, 3.4_
  - _Boundary: Project.ts_
  - _Depends: 1.2, 2.1_
- [ ] 2.3 calculateScheduleAdherence を実装（GREEN）
  - `Project.calculateScheduleAdherence(options?: StatisticsOptions)` と private `_taskPvAtEs`（k/k+1 の2点補間、PVj(0)=0、k≥pd クランプ。EarnedSchedule.ts と同一の索引規約）を実装。EVj は `resolveTaskEv`、ES は `_computeEsContext` を使用
  - `src/domain/index.ts` に `export type { ScheduleAdherenceResult, TaskAdherenceDetail }` を追加（**型のみ公開**。コア関数は非公開 = 公開 API 追加の基準）
  - 完了条件: 2.2 のテスト全緑 + 既存テスト無変更で全緑（両TZ）
  - _Requirements: 1.1, 1.4, 1.6, 1.7, 3.1, 3.2, 3.3, 3.4, 4.1, 4.3_
  - _Boundary: Project.ts / index.ts_
  - _Depends: 2.2_

- [ ] 3. docs: schedule-adherence のドキュメント同期
- [ ] 3.1 用語・判断レシピの追加
  - `docs/GLOSSARY.md` に P-Factor の定義（式・値域・P=1=完全順守）を追加
  - `docs/EVM-PRIMER.md` の指標カタログ（§2）と判断レシピ（§4）に P-Factor を追加（「SPI(t) 良好 × P 低 = 先食いによる見かけの進捗（手戻りリスク）」）。§6 制約一覧の更新
  - **読み方の注意を明記**: P < 1 は必ずしも悪ではない（合理的な順序変更もある）。低い P の継続を兆候として扱う
  - 完了条件: 追加記述の API 名・式が実装と一致（grep で確認）
  - _Requirements: 5.1, 5.2, 5.3_
  - _Boundary: docs_
  - _Depends: 2.3_
- [ ] 3.2 master 設計書の同期
  - `docs/specs/domain/master/Project.spec.md` に 5.20 節（目的・シグネチャ・事後条件・数値例）と変更履歴（feature 名 schedule-adherence 付き）を追記
  - `docs/specs/domain/master/INDEX.md` の公開APIカタログ・変更履歴に追記
  - 完了条件: INDEX から新型2つ・新メソッドが引けること
  - _Requirements: 5.4_
  - _Boundary: docs/specs/domain/master_
  - _Depends: 2.3_

- [ ] 4. 検証・リリース準備（schedule-adherence）
- [ ] 4.1 全ゲート検証
  - `npm test`（TZ=Asia/Tokyo / TZ=UTC 両方）・`npm run lint`（0 errors）・`npm run build`・`npm run format` が全緑
  - 既存テストの diff がゼロであること（要件4.2 の最終確認: `git diff develop -- src/domain/__tests__` に既存ファイルが現れない）
  - 完了条件: 上記コマンドの実出力を記録
  - _Requirements: 4.1, 4.2, 4.3_
  - _Depends: 2.3, 3.1, 3.2_
- [ ] 4.2 リリース同乗の記録
  - CHANGELOG に追加（リリース番号は実装時点の次リリースに読み替え）。examples への具体例追加（07/08 と同型）は任意タスクとしてここで判断
  - 完了条件: CHANGELOG エントリが本 spec の要件番号と整合
  - _Requirements: 4.1_（変更履歴の正本規約。5.4 の master 同期はタスク 3.2 で完了済み）
  - _Depends: 4.1_
