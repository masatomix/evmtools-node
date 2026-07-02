# 調査ログ: phase2-skill-integration-0.0.31

## 調査スコープ

Extension（既存システム拡張）型。3 機能を evmtools-node domain 層へ純粋追加する。統合中心のディスカバリを実施。外部 Web 調査は不要（参照実装が確定オラクルのため）。

## 主要な調査結果

### 参照実装（数値一致のオラクル）

| 機能 | 参照ファイル | 権威となるロジック |
|------|-------------|------------------|
| 日次PV | task `cli/check-daily-pv.ts` の `calculateDailyPvByAssignee` / `buildGapRanges` | 休日スキップ、`assignee ?? '(未割当)'`、`calculatePV>0` のみ明細化、明細PVは個別丸め・合算は最後に `Math.round(x*1000)/1000`、PV=0 でもエントリ出力 |
| アラート | task `core/alerts.ts` の `checkAlertsCore` | `finished===false` 限定、`spi = pv>0 ? ev/pv : 1.0`、`delayDays ?? 0`、CRITICAL(<0.8 or >5)/WARNING(<0.9 or >0) 排他、OVERDUE 独立追加、HIGH_WORKLOAD(>10)、counts/summary |
| アクティブ検出 | task `core/detect-active.ts` の `detectActiveSubprojects` | `getTree()` ルート直下から single→drill / multi→parent or top / leaf・none→ancestor or empty、changeCount=modified+added+removed、trace |

### 本体側の再利用可能シーム

- `Project._resolveTasks` / `filterTasks` / `getFullTaskName` / `isHoliday` / `toTaskRows`（`Project.ts`）。
- `Project.getTree()`（`Project.ts:44`）は `TreeNode[]`（`{ name, children }`）を返す。
- `ProjectService.calculateTaskDiffs` / `calculateProjectDiffs`（`ProjectService.ts`）。差分件数の算出に再利用。
- `common`: `generateBaseDates` / `dateStr` / `TreeNode`。
- `TaskRow`: `isLeaf` / `assignee` / `name` / `id` / `pv` / `ev` / `delayDays`(102行) / `endDate` / `finished`(148行) / `calculatePV`(207行) / `isOverdueAt`(158行)。

### phase0 依存の確認

- `ProjectService.calculateProjectDiffs([])` は phase0 修正後に全 0 / `hasDiff:false` のデフォルト ProjectDiff を返す。`detectActiveSubprojects` の changeCount 算出はこれに依存し、スキル側 `compareProjectsCore` の手動デフォルトマージ（`createEmptyProjectDiff`）が不要になる。
- `calculateRecentSpi`（ΔEV/ΔPV）と日付ヘルパーは本 spec の 3 機能では直接は使わない（アラートは Excel `delayDays` / `pv` / `ev` を使うため）。将来のアラート種別拡張（#138 isReschedule）で利用余地。

## 設計判断

### 判断 1: アラートは「build」（参照実装移植）を選択

brief は `getDelayedTasks` / `getStatisticsByName` / `calculateRecentSpi` の再利用を提案。しかし:
- `getDelayedTasks` の遅延日数は `formatRelativeDaysNumber`（暦日）ベース。参照アラートは Excel `delayDays`。定義が異なり数値不一致。
- タスクSPIは Excel `pv`/`ev`。`calculatePV` ベース統計とは異なる。
- 担当過多は未完了件数の単純カウント。統計グルーピングとは目的が異なる。

受け入れ条件が「数値一致」であるため、参照実装のアルゴリズムを忠実移植する。遅延定義のライブラリ標準化は将来の別 spec（Behavior Change）で扱う。→ design「build-vs-adopt 判断」に記録。

### 判断 2: 日次PVは tidy 経路を流用しない

`_internalPvByNameLong` は tidy の groupBy/summarize で PV 値のみを返し、PV=0 エントリと明細（fullName・タスク単位PV）を保持できない。gap 集約と過負荷検出には両者が必須のため、参照実装同様 `Map<string, TaskRow[]>` グルーピングで新メソッドを実装。既存ゲッターは不変のまま残す。

### 判断 3: アクティブ検出は calculateTaskDiffs を一度だけ計算

参照実装は子ごとに `compareProjectsCore` を呼び全 `calculateTaskDiffs` を都度再実行する。ライブラリでは一度計算した taskDiffs を子の対象ID集合で filter → `calculateProjectDiffs` することで同一 changeCount を効率的に得る。

## リスク

- 丸め順序（日次PV）・メッセージ文言（アラート OVERDUE の ISO 日付）・decision 名（アクティブ検出 trace）の取り違えが数値/出力不一致を生む。各々テストで固定。
- 参照実装が今後更新されるとオラクルが変わる。design の再検証トリガーに記載。

## 合成（synthesis）結果

- 3 機能は相互独立（データ・ファイル境界が非重複）。tasks で `(P)` 適用可能。
- 一般化候補: フルタスク名部分一致フィルタは `Project.filterTasks` と task 側 `filterTasks` で重複。detectActive では `getFullTaskName` 直接利用に集約。
- 単純化: スキルの手動空 diff マージは phase0 デフォルトで不要化。
