# 変更履歴

このファイルはプロジェクトの主要な変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づき、
[セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

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
