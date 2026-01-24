# 変更履歴

このファイルはプロジェクトの主要な変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づき、
[セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

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
