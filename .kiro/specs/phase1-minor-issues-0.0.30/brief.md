# Brief: phase1-minor-issues-0.0.30

## Problem

軽微だが利用価値のあるオープン Issue が 5 件滞留している。いずれも既存部品の小拡張で実現でき、v0.0.30 として一括リリースする。

| Issue | 内容 | 現状 |
|-------|------|------|
| #166 | `Project.getNameWithGreeting(): string` = `` `${name} Hello World.` `` を追加（SDD プロセス体験用のデモ Issue） | 未着手。ただし remote branch `origin/worktree-evmtools` のコミット `e8c497b`（`feat: Project.getNameWithGreeting() メソッドを追加 (#166)`）に実装済みコードが存在。cherry-pick 可否を検証して取り込む |
| #138 | `TaskDiff.isReschedule: boolean`（deltaPV < 0 でリスケ検知）を追加 | 未着手。`deltaPV` は算出済みなので追加は軽微。型定義は `src/domain/ProjectService.ts:398-420`、TaskDiff 生成箇所は同 116 行（通常）と 176 行（removed タスク → false 固定） |
| #153 | `TaskRow` に fullName キャッシュ（`_fullName` + `setFullName()`/getter）を追加 | 未着手。現状は `Project.getFullTaskName()`（`src/domain/Project.ts:97-107`）が毎回ツリーを辿って算出。構築時にキャッシュへ書き込む整合設計が必要 |
| #165 | 「今日までの未完了タスク」を取得したい（遅延タスク + 今日のタスクのマージ） | 未着手（部品あり）。`Project.getDelayedTasks()`（`Project.ts:835`）と `getTaskRows(baseDate)`（`Project.ts:116-129`）が素材。新 API 名は要件で確定（案: `getIncompleteTasksUpToToday()`） |
| #160 | サンプルに「今日のPV」表示機能のサンプルを掲載 | 機能自体（`TaskRow.pvTodayActual`、CLI `pbevm-show-pv`）は実装済み・README 記載あり。`samples/evm-sample-projects.ts` は SPI/完了予測のデモのみで「今日のPV」サンプルが無い |

## Current State

v0.0.29（phase0-bugfix）リリース後の develop。日付ヘルパー（`truncateToLocalDate`/`diffCalendarDays`）が `src/common/utils.ts` に存在する前提。

## Desired Outcome

- 5 Issue がすべて実装・テスト・spec 同期済みでクローズされ、v0.0.30 としてリリースされる
- #166 は cc-sdd フルプロセスの練習題材として扱い、`/kiro-impl` の検証（既存コミットの取り込み + spec 照合）まで行う

## Approach

- **#166**: `git cherry-pick e8c497b` の取り込み可否をまず検証（コンフリクト・テスト有無）。取り込み後、要件との一致を検証し master spec（`docs/specs/domain/master/Project.spec.md`）に同期
- **#138**: `TaskDiff` 型に `readonly isReschedule: boolean` 追加。判定は `deltaPV !== undefined && deltaPV < 0`（removed タスクは false）。feature spec `ProjectService.task-diff-reschedule.spec.md` 新設
- **#153**: `TaskRow` にクラスフィールド `private _fullName?: string` + setter/getter 追加（readonly コンストラクタ群との整合に注意）。`Project.getFullTaskName()` は計算結果をキャッシュに書き込み、2 回目以降はキャッシュ返却。task スキルが `getFullTaskName()` を多用しているため性能改善効果を確認
- **#165**: `getDelayedTasks()` と当日タスク（`getTaskRows(baseDate)`）をマージ・重複排除する新 API を Project に追加。ソート順（遅延日数降順等）と「未完了」の定義（finished=false、phase0 の EPSILON 修正後の定義を使用）を要件で確定
- **#160**: `samples/evm-sample-projects.ts` に「今日のPV（pvTodayActual と計画PV の比較）」サンプルを追加し、`docs/examples/` の該当 md を更新

## Scope

- **In**: 上記 5 件の実装・テスト・feature/master spec 同期・サンプル/README 更新・リリース準備
- **Out**: 新規 EVM 指標（phase3 以降）、phase0 から繰り越された calcUtils round 改善（あれば本 spec で吸収可）

## Boundary Candidates

- #166（Project + master spec）
- #138（ProjectService の TaskDiff）
- #153（TaskRow + Project）
- #165（Project の新 API）
- #160（samples + docs のみ）

## Out of Boundary

- TaskDiff の他フィールド拡張や diff アルゴリズム変更
- fullName を使う検索/フィルタ機能の拡張（task#566 相当は Backlog）

## Upstream / Downstream

- **Upstream**: phase0-bugfix-0.0.29（finished の EPSILON 定義、日付ヘルパーを #165 が利用）
- **Downstream**: phase2 の AlertService が `getDelayedTasks` / TaskDiff を利用（isReschedule をアラート種別に使える可能性）

## Existing Spec Touchpoints

- **Extends**: `docs/specs/domain/master/Project.spec.md`、`docs/specs/domain/master/ProjectService.spec.md`、`docs/specs/domain/master/TaskRow.spec.md`
- **Adjacent**: phase0 が改訂する `ProjectService.recent-spi.spec.md`（衝突しないよう注意）

## Constraints

- すべて非破壊（プロパティ追加・新メソッドのみ）。サブパス export 互換維持
- 5 件は相互独立なので feature ブランチを分けて並行実装可（tasks で並列マーカー (P) を活用）
- 検証: 共通ゲート（lint/format/test/build + TZ 二重実行）+ CLI 目視確認
