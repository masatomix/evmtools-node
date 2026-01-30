# 変更履歴

このファイルはプロジェクトの主要な変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づき、
[セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

## [0.0.28]

### 追加
- **pbevm-treeコマンド**: プロジェクトのツリー構造を出力 (#161)
  - テキスト形式でのツリー表示（罫線文字使用）
  - JSON形式での出力（`--json` オプション）
  - 深さ指定（`--depth` オプション）
  - 複数ルート対応（空行で区切り）
  - `TreeFormatter` ユーティリティを `evmtools-node/common` からエクスポート
  - `Project.getTree()` メソッドを追加（プログラムからツリー構造を取得）
  - 要件定義: `docs/specs/requirements/REQ-TREE-001.md`
  - 詳細仕様: `docs/specs/domain/features/CLI.tree.spec.md`

## [0.0.27]

### 追加
- **spiOverrideオプション**: 完了予測に任意のSPIを指定可能 (#147)
  - `Project.calculateCompletionForecast({ spiOverride })`: SPIを外部指定して完了予測
  - シナリオ分析（悲観/楽観）や直近SPIでの予測に活用
  - 要件定義: `docs/specs/requirements/REQ-SPI-002.md`
  - 詳細仕様: `docs/specs/domain/features/CompletionForecast.spiOverride.spec.md`
- **サンプルドキュメント集**: ライブラリの使い方を示すサンプルコード集 (#154)
  - `docs/examples/01-basic-usage.md`: 基本的な使い方
  - `docs/examples/02-project-statistics.md`: プロジェクト統計
  - `docs/examples/03-task-operations.md`: タスク操作
  - `docs/examples/04-completion-forecast.md`: 完了予測
  - `docs/examples/05-diff-snapshots.md`: スナップショット比較
  - `docs/examples/06-cli-commands.md`: CLIコマンド
  - 各ドキュメントに対応する検証スクリプト付き

### 修正
- **remainingDays計算修正**: 基準日を含まないよう修正 (#156)
  - 基準日の翌日から終了日までの稼働日数を返すよう修正
  - 詳細仕様: `docs/specs/domain/master/TaskRow.spec.md`

## [0.0.26]

### 追加
- **直近N日SPI計算機能**: 期間指定でのSPI算出 (#139)
  - `ProjectService.calculateRecentSpi()`: 複数Projectから期間SPIを計算
  - `RecentSpiOptions`: フィルタ条件と警告閾値のオプション
  - 要件定義: `docs/specs/requirements/REQ-SPI-001.md`
  - 詳細仕様: `docs/specs/domain/features/ProjectService.calculateRecentSpi.spec.md`
- **EVM進捗管理ガイド**: 実践的なEVM運用ドキュメント (#137)
  - `docs/guides/evm-management-guide.md`: EVM指標の解説と運用ガイド
  - サンプルスクリプト: `scripts/evm-sample.ts`

### 改善
- **完了予測機能リファクタリング**: 高性能版に統一 (#140)
  - `Project.completionForecast`と`Project.completionForecastWithFullTaskName`を高性能版に統一
  - 重複計算の排除によるパフォーマンス改善
  - 要件定義: `docs/specs/requirements/REQ-REFACTOR-002.md`
- **重複アクセサ削除**: コード品質改善 (#142)
  - `bac`, `totalEv`, `etcPrime`の重複アクセサを削除
  - 要件定義: `docs/specs/requirements/REQ-REFACTOR-001.md`

### 修正
- **Statistics.completionForecast**: 直近N日平均PVを使用するよう修正 (#145)
  - dailyPvOverride=1.0 のバグを修正
  - 仕様変更: Statistics使用時は常に直近N日平均PVで完了予測を計算

## [0.0.25]

### 追加
- **タスクフィルタリングと統計情報機能**: フィルタ条件付き統計取得 (#120)
  - `Project.filterTasks(options?)`: fullTaskName による部分一致フィルタ
  - `Project.getStatistics()`: プロジェクト全体/フィルタ/TaskRow[] の統計取得
  - `Project.getStatisticsByName()`: 担当者別統計取得（フィルタ対応）
  - Statistics 型に拡張プロパティを追加（etcPrime, completionForecast, delayedTaskCount 等）
  - 要件定義: `docs/specs/requirements/REQ-FILTER-STATS-001.md`
  - 詳細仕様: `docs/specs/domain/features/Project.filterStatistics.spec.md`

### 改善
- **型チェックの自動化**: `npm test` 実行時に `tsc --noEmit` を自動実行
  - `pretest` スクリプトを追加し、型エラーをテスト段階で検出

## [0.0.24]

### 追加
- **pv-today機能**: 本日時点のPV算出メソッド (#86)
  - `TaskRow.pvToday`: 計画ベースの本日PV
  - `TaskRow.pvTodayActual`: 実績ベースの本日PV（遅れ/前倒し対応）
  - 要件定義: `docs/specs/requirements/REQ-PV-TODAY-001.md`
  - 詳細仕様: `docs/specs/domain/features/TaskRow.pv-today.spec.md`
- **遅延タスク取得機能**: 遅れているタスクを一覧取得 (#115)
  - `Project.getDelayedTasks()`: 遅延タスクのリストを返す
  - 要件定義: `docs/specs/requirements/REQ-DELAY-001.md`
  - 詳細仕様: `docs/specs/domain/features/Project.delayedTasks.spec.md`
- **EVM指標拡張**: ETC'・完了予測日の算出 (#94)
  - `Project.etcPrime`: 残作業見積り（実績ベース）
  - `Project.completionForecast`: 完了予測日
  - 要件定義: `docs/specs/requirements/REQ-EVM-001.md`
  - 詳細仕様: `docs/specs/domain/features/Project.completionForecast.spec.md`

### 改善
- **テストケース拡充**: TC-20〜TC-22 統合テストを追加 (#122)
- **テスト明確化**: TC-06のテストケースを明確化 (#121)
- **リファクタリング**: `bac`と`plannedWorkDays`を既存ユーティリティで共通化 (#123)
- **SDDスキル**: 日本語出力ルールを追加 (#119)

## [0.0.20]

### 追加
- **タスク管理機能**: 仕様書からタスクを導出し進捗管理する仕組み
  - タスクテンプレート: `docs/templates/tasks-template.md`
  - ワークフロー: `docs/workflow/DEVELOPMENT_WORKFLOW.md`（セクション2.2.10）

### 改善
- **仕様書テンプレート統一化**: 全14ファイルの設計書を統一フォーマットに書き換え
  - テンプレート配置場所を `docs/templates/` に統一
  - マスター設計書テンプレート: `docs/templates/master-spec-template.md`
  - 案件設計書テンプレート: `docs/templates/feature-spec-template.md`

## [0.0.19]

### 変更
- **pbevm-diff出力整形**: タスクDiff表示から`currentTask`, `prevTask`を除去
  - 要件定義: `docs/specs/requirements/REQ-CLI-003.md`
  - 詳細仕様: `docs/specs/domain/features/CLI.pbevm-diff-output.spec.md`
- **pbevm-show-pv出力整形**: タスク表示から`logger`, `calculateSPI`, `calculateSV`を除去
  - 要件定義: `docs/specs/requirements/REQ-CLI-002.md`
  - 詳細仕様: `docs/specs/domain/features/PbevmShowPvUsecase.cli-output-cleanup.spec.md`

### 改善
- **ドキュメント相対リンク化**: 仕様書・要件定義書内のファイル参照をクリック可能なリンクに変更
- **仕様書トレーサビリティ強化**: 要件トレーサビリティセクションの必須化、ガイドライン追加

## [0.0.18]

### 追加
- **CsvProjectCreator**: CSVファイルからProjectを生成する機能
  - UTF-8/Shift-JIS自動判定対応
  - ファイル名から基準日を抽出（`{name}_{yyyyMMdd}.csv`形式）
  - 要件定義: `docs/specs/requirements/REQ-CSV-001.md`
  - 詳細仕様: `docs/specs/domain/master/CsvProjectCreator.spec.md`
- **Jest環境**: テストフレームワークを導入
  - 単体テスト: `CsvProjectCreator.test.ts`
  - 統合テスト: `CsvProjectCreator.integration.test.ts`
- **仕様駆動開発**: Spec-Driven Developmentワークフローを導入
  - 仕様書フォーマット: `docs/specs/spec-schema.md`
  - 既存ドメインモデルのリバース仕様を追加
- **CLAUDE.md**: Claude Code用プロジェクトガイドを追加
- **開発ワークフロー文書**: `docs/workflow/DEVELOPMENT_WORKFLOW.md`
- **VersionInfo**: バージョン情報取得ユーティリティ
  - `getVersionInfo()`: package.jsonからバージョン情報を取得
  - 要件定義: `docs/specs/requirements/REQ-VERSION-001.md`
  - 詳細仕様: `docs/specs/domain/master/VersionInfo.spec.md`
  - 開発フローサンプル: `docs/workflow/SAMPLE_DEVELOPMENT_FLOW.md`

### 変更
- `package.json`: Jest関連依存とiconv-liteを追加

### 修正
- **CLIコマンド**: shebang追加でUnix環境での実行を修正
  - `pbevm-show-project`, `pbevm-diff`, `pbevm-show-pv`
  - 要件定義: `docs/specs/requirements/REQ-CLI-001.md`
- **README.md**: インストール手順と`-p`オプションの説明を追加

## [0.0.17]

### 追加
- TaskRow: `validStatus`プロパティを追加（データの有効性チェック）

## [0.0.15]

### 変更
- 微調整

## [0.0.14]

### 追加
- 要員計画モジュール（ベータ版）

### 変更
- リファクタリング
