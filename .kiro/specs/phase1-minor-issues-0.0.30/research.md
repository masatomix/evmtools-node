# 調査・設計判断

## 概要

- **機能**: `phase1-minor-issues-0.0.30`
- **ディスカバリー範囲**: 拡張（既存クリーンアーキテクチャへの軽微な非破壊追加 5 件）
- **主要な知見**:
  - 5 Issue は相互独立で、触れるコンポーネントが `Project` / `ProjectService`(TaskDiff) / `TaskRow` / サンプルに分かれるため並列実装が可能。
  - #166 は既存コミット `e8c497b`（`origin/worktree-evmtools`）に実装・テスト・設計書が揃っている。cherry-pick 相当の取り込みが可能で、requirements との一致を照合すれば済む。
  - #165 の素材（`getDelayedTasks` / `getTaskRows`）は既に存在し、マージ・重複排除・ソートを行う薄い集約メソッドで実現できる。「未完了」判定は phase0 の許容誤差付き `finished` を利用する。

## 調査ログ

### #166 既存コミット e8c497b の取り込み可否

- **背景**: 既に実装済みコードが remote branch に存在するため、再実装ではなく取り込み＋照合で足りるか確認する。
- **参照ソース**: `git show e8c497b`（read-only）
- **知見**:
  - 追加は `Project.getNameWithGreeting(): string { return `${this._name ?? ''} Hello World.` }` の 1 メソッドと、テスト `Project.nameWithGreeting.test.ts`（TC-01〜TC-04）。
  - 同コミットに import 整形・`statisticsByAssignee`/`_calculateDelayStats` 周辺の Prettier 整形差分が含まれる（機能変更なし）。取り込み時はこの整形差分もそのまま入る想定。
  - 設計書 3 点（`REQ-HELLO-001.md`・`Project.nameWithGreeting.spec.md`/`.tasks.md`・`Project.spec.md` v1.9.0 追記）も同コミットに含まれる。
- **示唆**: cherry-pick でコンフリクトが出るのは import 行と整形箇所のみ想定。方針は「取り込み → requirements（要件 1）と照合 → master 反映確認」。仕様と一致しているため、実装タスクは「取り込み・照合」に縮約できる。

### #138 TaskDiff の isReschedule 追加箇所

- **背景**: `deltaPV` は算出済み。追加は型と代入の 2 点。
- **参照ソース**: `src/domain/ProjectService.ts`（型定義 372-420、通常 diff 生成 116、removed diff 生成 176）
- **知見**:
  - `deltaPV` は `TaskDiffBase`（372-382）ではなく `TaskDiff`（398-420）側の readonly オプショナル。`isReschedule` は `TaskDiff` に追加するのが自然（集約型 ProjectDiff/AssigneeDiff は個々タスクの概念ではないため付与しない）。
  - 通常 diff（116）の `deltaPV = delta(now, prev)`。removed diff（152-206）は `deltaPV = delta(undefined, prevTask.pv)` となり、`delta` 実装（`bIsNum → -b`）により **負値**になる。素の式 `deltaPV < 0` では removed が true になってしまうため、removed 分岐では `isReschedule: false` を明示的に固定する必要がある（要件 2.3）。
- **示唆**: 判定式は `deltaPV !== undefined && deltaPV < 0`。通常 diff の push（116）に判定結果を、removed diff の push（176）に `false` 固定を追加する。

### #153 フルパス名キャッシュの整合設計

- **背景**: `Project.getFullTaskName()`（97-107）は毎回 `while` で親を `getTask()` 走査。`TaskRow` の構築時プロパティは `readonly` コンストラクタ引数で、`parentId` のみ非 readonly。
- **参照ソース**: `src/domain/Project.ts` 97-107、`src/domain/TaskRow.ts` 11-121
- **知見**:
  - `TaskRow` に readonly でない可変フィールド（`private _fullName?: string`）と `setFullName()` / `get fullName()` を追加しても、コンストラクタ引数の readonly 性には影響しない。
  - キャッシュ書き込みのタイミングは 2 案:
    - (A) ツリー構築時（`TaskService` / factory）に一括設定
    - (B) `Project.getFullTaskName()` 初回計算時に遅延メモ化して書き込み、2 回目以降キャッシュ返却
  - `getFullTaskName` は `Project` が親 Map を持って走査する構造のため、フルパス名の算出責務は `Project` 側にある。(A) は `TaskService` にフルパス算出を持ち込み責務が二重化する。(B) は算出責務を `Project` に閉じたまま `TaskRow` を単なるキャッシュ格納先として使える。
- **示唆**: **(B) 遅延メモ化を採用**。`TaskRow` に `_fullName`/`setFullName`/`fullName` を追加、`Project.getFullTaskName()` は「タスクがキャッシュを持てば返す、なければ従来ロジックで算出し `setFullName` で書き込んで返す」。これで要件 3.1〜3.4 を満たしつつ責務を分散させない。

### #165 「今日までの未完了タスク」の定義とソート

- **背景**: マージ対象は `getDelayedTasks()`（835、遅延日数降順・leaf・未完了）と `getTaskRows(baseDate)`（116、当日 PV>0 の leaf）。
- **参照ソース**: `src/domain/Project.ts` 116-129、835-850
- **知見**:
  - `getDelayedTasks(minDays=0)` は `endDate` が基準日より前（遅延日数 > 0）の未完了 leaf を降順で返す。当日締切や当日稼働のタスクは含まれない。
  - `getTaskRows(baseDate)` は当日に PV を持つ（＝当日稼働予定の）leaf を返す。ただし `finished` フィルタは持たないため、当日タスクのうち完了済みを除外する必要がある。
  - 重複: 「遅延かつ当日も稼働」のタスクは両方に現れうるため id で重複排除する。
- **示唆**: 新メソッド `getIncompleteTasksUpToToday(baseDate?)` を追加。手順は (1) `getDelayedTasks()` を取得、(2) `getTaskRows(baseDate)` から `!finished` を残す、(3) id で union（重複排除）、(4) 遅延日数降順・id 昇順でソート。遅延日数は `getDelayedTasks` と同じ暦日計算（phase0 の `formatRelativeDaysNumber` 経由）に揃える。当日タスクの遅延日数は 0 以下となり、遅延タスクの後方に並ぶ。

### #160 「今日のPV」サンプルの配置

- **背景**: `samples/evm-sample-projects.ts` は SPI/完了予測デモのみ。「今日のPV」は `docs/examples/02-project-statistics.md`（203 行〜）と `docs/examples/scripts/02-project-statistics.ts`（Example 5）に既出だが、比較サンプルスクリプト側に無い。
- **参照ソース**: `samples/evm-sample-projects.ts`、`docs/examples/02-project-statistics.md`、`src/domain/TaskRow.ts`（`pvTodayActual` 335、`workloadPerDay` 127、`remainingDays` 292）
- **知見**:
  - `pvTodayActual(baseDate) = 残工数 / 残日数`、計画PV = `workloadPerDay = workload / scheduledWorkDays`。実行PV > 計画PV で遅延圧。
  - 既存サンプルは 1 日タスク（workload=1, scheduledWorkDays=1）で構成されるため、計画PV=1。進捗差で実行PV が動くケースを示せる。
- **示唆**: `samples/evm-sample-projects.ts` に「今日のPV」出力関数を追加し、`docs/examples/README.md`（もしくは `02-project-statistics.md`）に本サンプルへの参照を追記する。サンプルはコードだが Jest テスト対象外のため、観測可能な完了条件は「`ts-node` 実行がエラーなく完了」とする。

## アーキテクチャパターン評価

| 案 | 説明 | 強み | リスク／制約 | 備考 |
|----|------|------|--------------|------|
| 独立追加（採用） | 5 件を既存コンポーネントへの非破壊追加として個別実装 | 並列実装可・後方互換・レビュー範囲が明確 | 共有シーム（`finished`・暦日ヘルパー）を phase0 と揃える必要 | roadmap の境界戦略と一致 |
| 共通ファサード新設 | 5 件をまとめる新サービス層を作る | まとまり | 過剰抽象・不要な間接化 | 却下（design-synthesis の Simplification） |

## 設計判断

### 判断: #153 のキャッシュ書き込み方式

- **背景**: readonly コンストラクタと責務分散の両立。
- **検討した代替案**: (A) 構築時一括設定 / (B) `getFullTaskName` 初回の遅延メモ化。
- **採用案**: (B) 遅延メモ化。`TaskRow._fullName` は可変フィールド、書き込みは `Project.getFullTaskName()` からのみ。
- **理由**: フルパス算出責務を `Project` に閉じられ、`TaskService` へ責務を漏らさない。未使用タスクのフルパスを構築時に無駄算出しない。
- **トレードオフ**: `TaskRow` に可変状態が入る（純粋性の低下）が、キャッシュ用途に限定し readonly 構築引数は不変のまま。
- **フォローアップ**: 同一 `TaskRow` インスタンスが複数の親文脈で共有されないこと（`Project` ごとに `toTaskRows()` が生成）を実装時に確認。

### 判断: #165 の「未完了」定義とソートキー

- **背景**: 「今日まで」の解釈とソート順の確定（要件 4.4/4.5）。
- **検討した代替案**: ソートキーを (1) 遅延日数降順 / (2) endDate 昇順。
- **採用案**: 遅延日数降順・id 昇順の安定ソート。「未完了」は phase0 の許容誤差付き `finished === false`。
- **理由**: `getDelayedTasks` と同じ遅延日数降順に揃えることで利用側の期待と一貫する。id 昇順の二次キーで実行環境非依存の安定順序を保証。
- **トレードオフ**: 当日タスク（遅延日数 ≤ 0）は末尾側に集まる。当日締切の緊急度より「既に遅延」を優先する設計意図に合致。
- **フォローアップ**: 遅延日数の算出は phase0 の `formatRelativeDaysNumber` に一本化し、TZ 二重テストで安定性を確認。

## リスクと緩和策

- #166 cherry-pick の整形差分コンフリクト — `git show e8c497b` で事前確認済み。コンフリクト時は手動で該当メソッドのみ取り込む。
- #138 removed タスクの `deltaPV` 負値による誤検知 — removed 分岐で `isReschedule: false` を固定（要件 2.3）。
- #153 の可変状態導入による予期せぬ共有 — キャッシュ書き込みを `getFullTaskName` 経由に限定し、`Project` 単位で `TaskRow` が生成されることを前提とする。
- phase0 未マージ時の依存欠落（`finished` EPSILON・暦日ヘルパー） — 本 spec は phase0 完了を上流依存とする。実装エージェントは develop に phase0 がマージ済みであることを前提とする。

## 参考文献

- `git show e8c497b` — #166 の既存実装・テスト・設計書（read-only）
- `.kiro/specs/phase0-bugfix-0.0.29/design.md` / `tasks.md` — `finished`（`PROGRESS_RATE_EPSILON`）・暦日ヘルパーの上流契約
- `.kiro/steering/domain.md` — EVM ドメインルール（リーフのみ集計、実行PV、finished/isOverdueAt）
