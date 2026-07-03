# Brief: phase2-skill-integration-0.0.31

## Problem

masatomix/task リポジトリの evmtools スキル（`/Users/masatomix/git/task/.claude/skills/evmtools/`）が、本来ライブラリに置くべき EVM 計算ロジックを 3 本独自実装している。「計算は evmtools-node に集約し、WebUI・CLI・スキルで数値を一致させる」方針（REQ-EVM-SKILL-003A）に反しており、ライブラリへ取り込む（ユーザー決定: 3 本すべて取り込む）。

1. **日次PV集計**（スキル `scripts/src/cli/check-daily-pv.ts` の `calculateDailyPvByAssignee`）: コメントに「`Project._internalPvByNameLong()` と同等のロジックだが、フィルタ済みタスクを受け取れるようにしている」と明記。ライブラリ内部関数（`src/domain/Project.ts:518-558`）がフィルタ非対応のため再実装された。task リポジトリの Issue #688/#689（WBS リソースレベリング・日次PV負荷確認）が裏付け。
2. **アラート判定**（スキル `scripts/src/core/alerts.ts`）: SPI 閾値・遅延日数・期限超過・担当タスク過多（10 件超）の判定と重要度分類をスキル側で完全実装。task#436（プロジェクト異常値検知）とも関連。
3. **アクティブサブプロジェクト検出**（スキル `scripts/src/core/detect-active.ts`）: `getTree()` + `ProjectService.calculateTaskDiffs` を組み合わせ、差分のあるサブツリーを再帰探索するアルゴリズム。task#752 が対応 Issue。

## Current State

v0.0.30 リリース後の develop。phase0 で期間SPI（ΔEV/ΔPV）修正済み・日付ヘルパー整備済み。スキルは evmtools-node@0.0.27 依存（lock）で、`infrastructure`/`domain`/`common` サブパスを直接 import。

## Desired Outcome

- 3 機能がライブラリの公開 API になり、v0.0.31 としてリリースされる
- リリース後、task リポジトリ側へ「0.0.31 へ更新し独自ロジック 3 本を削除する」Issue を起票できる状態（スキル側の書き換え自体は本 spec の対象外）

## Approach

- **getDailyPvByAssignee**: `Project._internalPvByNameLong` を拡張し、`getDailyPvByAssignee(options?: { filter?: string; assignee?: string; from?: Date; to?: Date })` を公開 API 化。既存のフィルタ機構（`TaskFilterOptions` / `_resolveTasks`）と `generateBaseDates` を再利用。既存 getter（`pvByNameLong` 等）は互換維持。戻り値はロング形式（date × assignee × pv）で、スキルの過負荷検出・PV=0 レンジ集約（`buildGapRanges`）が乗せられる形にする
- **AlertService**: 新規 `src/domain/AlertService.ts`。入力: Project（直近SPI 用に Project[] も受け付け）+ 閾値オプション（SPI 閾値、遅延日数、担当タスク上限=デフォルト 10）。出力: `Alert[] { type, severity, message, task?, assignee? }`。内部で `ProjectService.calculateRecentSpi`（phase0 修正版）、`Project.getDelayedTasks`、`getStatisticsByName` を再利用。スキルの `core/alerts.ts` を仕様の参照実装とする。`src/domain/index.ts` に export 追加、master spec `AlertService.spec.md` 新設
- **detectActiveSubprojects**: `ProjectService` にメソッド追加（設計次第で独立サービスも可）。`Project.getTree()`（`Project.ts:44`）+ `calculateTaskDiffs` の結果を親方向へ集約し、差分のあるサブツリーのルート（サブプロジェクト名）を返す。スキルの `core/detect-active.ts` を参照実装とする

## Scope

- **In**: 3 機能の公開 API 化、テスト、feature/master spec、`src/domain/index.ts` export、リリース準備、task スキルとの結合確認（npm pack → file: インストール → スキル側 3 本を新 API に置き換えて数値一致確認）
- **Out**: task スキル側コードの恒久書き換え（task リポジトリの Issue として起票）、WBS Excel 書き出し（task#687 → Backlog 上位）、日次PVマトリクス Excel 装飾（プレゼン層のためスキル側に残す・Backlog 下位）

## Boundary Candidates

- getDailyPvByAssignee（Project）
- AlertService（新規ドメインサービス）
- detectActiveSubprojects（ProjectService）

## Out of Boundary

- Excel 出力系ヘルパー（装飾・WBS 書き出し）
- 異常値の統計的検知（task#436 の本格版）— アラート閾値判定までが本 spec

## Upstream / Downstream

- **Upstream**: phase0-bugfix-0.0.29（AlertService が期間SPI と日付ヘルパーを利用）。phase1 とは独立（並行可）だが、TaskDiff.isReschedule（#138）をアラート種別に使う場合は phase1 完了後が望ましい
- **Downstream**: phase4 の Sカーブが getDailyPvByAssignee を担当者別系列に流用可能

## Existing Spec Touchpoints

- **Extends**: `docs/specs/domain/master/Project.spec.md`、`docs/specs/domain/master/ProjectService.spec.md`
- **Adjacent**: 参照実装は task リポジトリ側（`/Users/masatomix/git/task/.claude/skills/evmtools/scripts/src/core/alerts.ts`、`detect-active.ts`、`cli/check-daily-pv.ts`）— 設計時に必ず読むこと

## Constraints

- 3 機能は相互独立。feature ブランチ並行可（tasks で (P) マーカー活用）
- API 命名・型はスキル側の置き換えが素直にできる形にする（結合確認で数値一致を実証）
- 非破壊: 既存 getter・export の互換維持。新規型はすべて export
- 検証: 共通ゲート + npm pack 結合確認（スキルの check-daily-pv / alerts / detect-active の出力が新 API 置き換え後も一致すること）
