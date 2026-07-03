# 実装計画（phase1-minor-issues-0.0.30）

> 方針: テスト先行（RED → GREEN → REFACTOR）。5 Issue（#166/#138/#153/#165/#160）は相互独立で触れるファイルが重ならないため、Core フェーズの各メジャータスクを並列 (P) 実行できる。設計書同期を Integration、検証・リリース準備を Validation に配置する。
>
> 前提（着手前ゲート）: 本 spec は phase0-bugfix-0.0.29 を上流依存とする。現時点の develop には phase0 の許容誤差付き `finished`（`PROGRESS_RATE_EPSILON`）・暦日ヘルパー（`truncateToLocalDate` / `diffCalendarDays`）が**未マージ**である。とくに #165（タスク 4）はこれらを利用するため、**phase0-bugfix-0.0.29 が develop にマージ済みであることを確認してから着手する**こと。#166/#138/#153/#160 は phase0 に依存しないため先行着手可能。
>
> ブランチ: CLAUDE.md 準拠で各 Issue の feature ブランチを develop から worktree で分岐（`--no-track`）。独立実装のため Issue 単位でブランチを分けてよい。

- [x] 1. (P) #166: getNameWithGreeting を取り込み・照合する
  - 既存コミット `e8c497b`（`origin/worktree-evmtools`）の `Project.getNameWithGreeting()` とテスト `src/domain/__tests__/Project.nameWithGreeting.test.ts`（TC-01〜TC-04）を取り込む（cherry-pick 相当。整形差分が混在する場合は該当メソッドとテストのみ手動取り込み）
  - name が英字/空文字/日本語で `{name} Hello World.` を返し、name 未設定時は先頭スペースの ` Hello World.` を返すこと、呼び出し後も `name` が不変であることを要件 1 と照合
  - 観測可能な完了条件: `Project.nameWithGreeting.test.ts` の 4 ケースが GREEN、全体テストが回帰なしで緑
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Boundary: Project_

- [x] 2. Core: #138 リスケ検知（TaskDiff.isReschedule）
- [x] 2.1 (P) isReschedule のテストを追加（RED）
  - `deltaPV < 0` → true、`deltaPV = 0`/正 → false、`deltaPV = undefined` → false、removed タスク → false 固定 のテストを追加
  - 観測可能な完了条件: プロパティ未追加の現行実装に対して型/アサーションで RED になること
  - _Requirements: 2.1, 2.2, 2.3_
  - _Boundary: ProjectService_
- [x] 2.2 TaskDiff に isReschedule を追加し判定を実装（GREEN）
  - `TaskDiff` 型に `readonly isReschedule: boolean`（非オプショナル）を追加。TaskDiff を完全リテラルで構築する **計 3 箇所** すべてに値を設定する: (1) 通常 diff 生成に `deltaPV !== undefined && deltaPV < 0`、(2) removed diff 生成に `false` 固定、(3) 既存テストヘルパー `src/usecase/__tests__/pbevm-diff-usecase.test.ts` の `const base: TaskDiff = {...}`（33 行付近、キャストなし）に `false`
  - 3 箇所目（usecase テストヘルパー）の設定漏れは型エラー（コンパイルエラー）になるため必ず対応する
  - 集約型 `ProjectDiff` / `AssigneeDiff` には付与せず、既存の差分集計を回帰させないこと
  - 観測可能な完了条件: 2.1 のテストが GREEN、`npm test`（typecheck 含む）が全緑で `pbevm-diff-usecase.test.ts` の型エラーが出ないこと
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Boundary: ProjectService, pbevm-diff-usecase テストヘルパー_
  - _Depends: 2.1_

- [ ] 3. Core: #153 フルパス名キャッシュ
- [ ] 3.1 (P) TaskRow キャッシュと getFullTaskName メモ化のテストを追加（RED）
  - `setFullName`/`fullName` の格納・取得、`getFullTaskName` の 2 回目キャッシュ返却・結果不変・ルートタスクは自名のみ を検証するテストを追加
  - 2 回目に再走査しないことを `getTask` 呼び出し回数のスパイ等で観測
  - 観測可能な完了条件: メモ化未実装の現行実装に対して RED になること
  - _Requirements: 3.1, 3.2, 3.3_
  - _Boundary: TaskRow, Project_
- [ ] 3.2 TaskRow に fullName キャッシュフィールドを追加（GREEN）
  - 可変フィールド `_fullName` と `setFullName(name)` / `get fullName()` を追加（readonly 構築引数とは別）
  - 観測可能な完了条件: `TaskRow.fullName` の格納・取得テストが GREEN
  - _Requirements: 3.2_
  - _Boundary: TaskRow_
  - _Depends: 3.1_
- [ ] 3.3 getFullTaskName を遅延メモ化（GREEN）
  - キャッシュがあれば返し、なければ従来ロジックで算出して `setFullName` に書き込んでから返す。戻り値は従来（親名を "/" 連結）と同一
  - 観測可能な完了条件: 3.1 のメモ化ケースが GREEN、既存の `fullName` 利用（TaskDiff の `fullName`）が回帰なし
  - _Requirements: 3.1, 3.2, 3.4_
  - _Boundary: Project_
  - _Depends: 3.2_

- [ ] 4. Core: #165 今日までの未完了タスク取得
  - 着手前ゲート: phase0-bugfix-0.0.29（`PROGRESS_RATE_EPSILON` による `finished`・暦日ヘルパー）が develop にマージ済みであることを確認してから着手する
- [ ] 4.1 (P) getIncompleteTasksUpToToday のテストを追加（RED）
  - 着手前ゲート: phase0 が develop にマージ済みであること（未マージなら着手不可）
  - 遅延のみ/当日のみ/遅延かつ当日（id 重複排除）、完了タスク除外、非 leaf 除外、遅延日数降順・id 昇順、`baseDate` 引数指定と未指定（`this.baseDate` 利用）をケース化
  - phase0 の許容誤差付き `finished` を未完了判定に用いる前提でケースを組む
  - 観測可能な完了条件: 未実装の現行に対して RED になること
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Boundary: Project_
- [ ] 4.2 getIncompleteTasksUpToToday を実装（GREEN）
  - 今日時点の遅延タスクと `getTaskRows(today)` の未完了タスクを id で union（重複排除）し、遅延日数降順・id 昇順でソート。`baseDate` 未指定時は `this.baseDate` を today とする
  - `getDelayedTasks()` / `getTaskRows()` のシグネチャ・戻り値を変更しない
  - 観測可能な完了条件: 4.1 のテストが GREEN、既存メソッドが回帰なしで緑
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Boundary: Project_
  - _Depends: 4.1_

- [ ] 5. (P) #160: 今日のPV サンプルを追加する
  - `samples/evm-sample-projects.ts` に、各 leaf タスクの計画PV（`workloadPerDay`）と実行PV（`pvTodayActual(baseDate)`）を並べて出力する関数を追加し、メイン実行から呼ぶ
  - 実行PV > 計画PV で遅延圧、実行PV < 計画PV で前倒し、という状態解釈を表に併記
  - 観測可能な完了条件: `npx ts-node samples/evm-sample-projects.ts` がエラーなく完了し、「今日のPV」表が標準出力に表示される
  - _Requirements: 5.1, 5.2, 5.3_
  - _Boundary: Samples_

- [ ] 6. Integration: 設計書同期とサンプルドキュメント
- [ ] 6.1 (P) 各案件設計書を新設・改訂（トレーサビリティ表付き）
  - `docs/specs/domain/features/` に #138（`ProjectService.task-diff-reschedule`）・#153（`TaskRow.fullNameCache`）・#165（`Project.incompleteTasksUpToToday`）・#160（`Samples.pv-today`）の案件設計書を新設し、#166（`Project.nameWithGreeting`）は取り込み済み設計書と要件を照合
  - 各 spec に AC-ID → TC-ID の要件トレーサビリティ表を grep 可能な形式で記載
  - 観測可能な完了条件: 各 feature spec に AC-ID → TC-ID 表が存在し、`grep` で AC-ID がヒットする
  - _Requirements: 6.1, 6.3_
  - _Boundary: docs/features_
  - _Depends: 1, 2.2, 3.3, 4.2, 5_
- [ ] 6.2 master 設計書を同期
  - `docs/specs/domain/master/Project.spec.md`（#166/#153/#165）・`ProjectService.spec.md`（#138）・`TaskRow.spec.md`（#153）に、メソッド仕様・テストシナリオ・変更履歴（バージョン更新）を反映
  - 観測可能な完了条件: 各 master 設計書の該当メソッド節と変更履歴が feature 設計書と一致する
  - _Requirements: 6.2_
  - _Boundary: docs/master_
  - _Depends: 6.1_
- [ ] 6.3 (P) 今日のPV サンプルをドキュメントに反映
  - `docs/examples/` の該当ファイル（`README.md` もしくは `02-project-statistics.md`）に、追加した「今日のPV」サンプルへの参照または説明を追記
  - 観測可能な完了条件: `docs/examples` から `samples/evm-sample-projects.ts` の「今日のPV」サンプルへの参照が辿れる
  - _Requirements: 5.4_
  - _Boundary: docs/examples_
  - _Depends: 5_

- [ ] 7. Validation: 検証ゲート・リリース準備
- [ ] 7.1 検証ゲートと TZ 二重実行をローカルで通す
  - `npm run lint && npm run format && npm test && npm run build` を通過させ、`TZ=Asia/Tokyo npm test` と `TZ=UTC npm test` も緑にする。サブパス export（domain/infrastructure/usecase/common/resource）と既存公開 API の後方互換を確認
  - 観測可能な完了条件: 全コマンドが成功終了し、両 TZ でテストが緑であること
  - _Requirements: 7.3, 7.4_
  - _Depends: 6.2, 6.3_
- [ ] 7.2 release/0.0.30 準備（バージョン更新と CHANGELOG）
  - `package.json` のバージョンを 0.0.30 に更新し、CHANGELOG に 5 件の追加（`getNameWithGreeting` / `isReschedule` / フルパス名キャッシュ / `getIncompleteTasksUpToToday` / 今日のPV サンプル）を追記
  - 観測可能な完了条件: バージョンが 0.0.30、CHANGELOG に 5 件の追記が存在し、検証ゲートが緑であること
  - _Requirements: 7.1, 7.2_
  - _Depends: 7.1_

## Implementation Notes
- タスク1: 要件1.2 の undefined 分岐に専用TCなし（TC-02は空文字のみ。実装は `?? ''` で対応、レビュアーが手動確認済み）。タスク6のトレーサビリティ整理時に AC 1.2 の undefined 分岐の扱いを明記すること
- タスク2: RED専用テストの単独コミットはブランチを赤にするため、2.1+2.2 を1レビュー・1コミット単位に統合した（以後の RED/GREEN ペアも同様とする）
