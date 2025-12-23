# 変更履歴

このファイルはプロジェクトの主要な変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づき、
[セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

## [Unreleased]

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
