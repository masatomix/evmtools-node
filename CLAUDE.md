# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

evmtools-nodeは、Excel形式のプロジェクト管理ファイルを読み込み、プロジェクトの進捗状況や要員別の作業量を可視化するためのTypeScriptライブラリです。プライムブレインズ社でEVM（アーンドバリューマネジメント）分析に使用されています。

## ビルドコマンド

```bash
npm run build       # クリーン、TypeScriptコンパイル、.hbsテンプレートのコピー
npm run lint        # ESLintチェック
npm run lint:fix    # ESLint自動修正
npm run format      # Prettierチェック
npm run format:fix  # Prettier自動修正
```

## 開発コマンド（ビルドなしで実行）

```bash
npm run pbevm-show-project       # now.xlsmのプロジェクト情報を表示
npm run pbevm-diff               # now.xlsmとprev.xlsmの差分を表示
npm run pbevm-show-pv            # now.xlsmのPVデータを表示
npm run pbevm-show-resourceplan  # 要員計画を表示（ベータ版）
```

## アーキテクチャ

クリーンアーキテクチャに基づく4層構造:

```
src/
├── domain/           # エンティティとビジネスロジック（外部依存なし）
├── infrastructure/   # Excel入出力の実装
├── usecase/          # アプリケーションユースケース
├── presentation/     # CLIコマンド（yargsベース）
├── resource/         # 要員計画モジュール（ベータ版）- 独自のレイヤー構造を持つ
└── common/           # 共有ユーティリティ
```

### 主要なドメインモデル

- **TaskRow** (`domain/TaskRow.ts`): EVM計算（PV, EV, SPI, SV）を持つタスクエンティティ
- **TaskNode** (`domain/TaskNode.ts`): TaskRowをラップした階層的なツリー構造
- **Project** (`domain/Project.ts`): プロジェクトメタデータとタスクツリーを含む集約ルート
- **ProjectService** (`domain/ProjectService.ts`): プロジェクトスナップショット間の差分計算

> **詳細仕様**: EVM用語、各クラスのプロパティ・メソッド詳細、稼働日計算ロジック等は [コア用語集 (GLOSSARY.md)](docs/GLOSSARY.md) を参照。

### データフロー

1. **Excel → Domain**: `ExcelProjectCreator` / `ExcelBufferProjectCreator`がExcelファイルを読み込み、`TaskRowFactory`経由で`Project`オブジェクトを作成
2. **CSV → Domain**: `CsvProjectCreator`がCSVファイルを読み込み、`Project`オブジェクトを作成（UTF-8/Shift-JIS対応）
3. **ビジネスロジック**: `ProjectService`が差分計算、`TaskRow`がEVMメトリクスを処理
4. **出力**: `ProjectRepositoryImpl`がhandlebarsテンプレートを使用してExcelに結果を書き出し

### クラス図（class.pu）

```
domain パッケージ:
┌─────────────────────────────────────────────────────────────┐
│  TaskRow                                                    │
│    - TaskRowDtoのプロパティを継承                             │
│    - calculatePV(baseDate): 基準日のPV計算                   │
│    - calculatePVs(baseDate): 累積PV計算                      │
├─────────────────────────────────────────────────────────────┤
│  TaskNode                                                   │
│    - taskRowのプロパティを継承                                │
│    - children: TaskNode[] (子ノード)                        │
├─────────────────────────────────────────────────────────────┤
│  TaskRowCreator (interface)                                 │
│    - createRowData(): TaskRowを生成                         │
├─────────────────────────────────────────────────────────────┤
│  TaskService                                                │
│    - buildTaskTree(TaskRow[]): TaskNode[]を構築             │
└─────────────────────────────────────────────────────────────┘

infra パッケージ:
┌─────────────────────────────────────────────────────────────┐
│  TaskRowDto                                                 │
│    - sharp, id, name, parentId, isLeaf, plotMap            │
├─────────────────────────────────────────────────────────────┤
│  TaskNodeDto                                                │
│    - taskRowDtoのプロパティ + children: TaskNodeDto[]       │
├─────────────────────────────────────────────────────────────┤
│  ExcelTaskRowCreator                                        │
│    - TaskRowCreatorを実装                                   │
│    - ExcelからTaskRowを生成                                 │
├─────────────────────────────────────────────────────────────┤
│  CsvProjectCreator                                          │
│    - ProjectCreatorを実装                                   │
│    - CSVからProjectを生成（UTF-8/Shift-JIS対応）             │
│    - ファイル名から基準日を抽出（{name}_{yyyyMMdd}.csv）       │
├─────────────────────────────────────────────────────────────┤
│  TaskRowFactory                                             │
│    - fromDto(dto[]): DTOからTaskRow[]へ変換                 │
│    - toDto(entity[]): TaskRow[]からDTOへ変換                │
└─────────────────────────────────────────────────────────────┘

依存関係:
  Main → TaskRowCreator, TaskService
  ExcelTaskRowCreator implements TaskRowCreator
  ExcelTaskRowCreator uses TaskRowDto, TaskRowFactory
  CsvProjectCreator implements ProjectCreator
  CsvProjectCreator uses iconv-lite (Shift-JIS対応)
```

### モジュールエクスポート

package.jsonのexportsで個別のエントリーポイントを公開:
- `evmtools-node/domain` - ドメインモデルのみ
- `evmtools-node/infrastructure` - Excel入出力
- `evmtools-node/usecase` - ユースケース
- `evmtools-node/common` - ユーティリティ
- `evmtools-node/resource` - 要員計画（ベータ版）

## ロギング

`pino`をモジュールレベルの設定で使用。`config/default.json`でカスタマイズ可能:

```json
{
  "evmtools-node-logger": {
    "level": "warn",
    "moduleLogLevels": { "main": "info" }
  }
}
```

## テスト

```bash
npm test              # 全テストを実行
npm test -- --watch   # ウォッチモードで実行
npm run test:coverage # カバレッジ付きテスト
```

テスト方針・配置パターン・EVM 特有の注意点は [`.kiro/steering/testing.md`](.kiro/steering/testing.md) を参照。

## Git Flow ブランチ戦略（重要）

本プロジェクトはGit Flowに準拠している。**新機能開発時は必ず`develop`ブランチから分岐すること。**

### ブランチ構成

| ブランチ | 目的 | 分岐元 |
|---------|------|-------|
| `main` | 本番リリース用 | - |
| `develop` | 開発統合 | - |
| `feature/*` | 新機能開発 | **develop** |
| `release/*` | リリース準備 | develop |
| `hotfix/*` | 緊急修正 | main |

### 新機能開発の手順

**git worktreeを使用**して、別ディレクトリでfeatureブランチを作業する。

```bash
# 1. developから feature ブランチを作成（worktree、--no-track でトラッキングなし）
git fetch origin
git worktree add -b feature/機能名 ../evmtools-node_feature-機能名 origin/develop --no-track

# 2. 作業ディレクトリに移動
cd ../evmtools-node_feature-機能名

# 3. 依存関係のインストール（必要に応じて）
npm install

# 4. 開発作業・コミット

# 5. プッシュ（-u で正しいリモートブランチをトラッキング設定）
git push -u origin feature/機能名

# 6. PRを作成（ベース: develop）

# 7. マージ後、worktreeを削除
cd ../evmtools-node  # 元のディレクトリに戻る
git worktree remove ../evmtools-node_feature-機能名
git branch -d feature/機能名  # ローカルブランチも削除
```

> **git worktreeのメリット**: 現在の作業ディレクトリを維持したまま、別ブランチで並行作業できる。`git stash`や`git checkout`による切り替えが不要。
>
> **注意**: `--no-track` を指定しないと `origin/develop` をトラッキングしてしまい、push 時にエラーになる。

### 禁止事項

- `main`ブランチへの直接コミット
- `main`ブランチからのfeatureブランチ作成
- developを経由しないマージ

詳細は [`docs/workflow/DEVELOPMENT_WORKFLOW.md`](docs/workflow/DEVELOPMENT_WORKFLOW.md) を参照。

## 注意事項

- 要員計画モジュール（`src/resource/`）はベータ版
- TypeScript strictモードが有効
- plotMapはExcelのシリアル値（数値）をキーとしている点に注意（詳細は[GLOSSARY.md](docs/GLOSSARY.md)「稼働日の計算方法」参照）
- CsvProjectCreatorは`iconv-lite`に依存（Shift-JIS対応）

## 仕様駆動開発（重要）

本プロジェクトは Kiro スタイルの仕様駆動開発（cc-sdd）を採用している。詳細なワークフローは [`.kiro/CLAUDE.md`](.kiro/CLAUDE.md) を参照。

### コマンド一覧

| フェーズ | コマンド | 機能 |
|---------|---------|------|
| Phase 0 | `/kiro-steering` | プロジェクトメモリの初期化・同期 |
| Phase 0 | `/kiro-steering-custom` | カスタム steering 作成 |
| Discovery | `/kiro-discovery "説明"` | アクションパス判定、brief.md 生成 |
| Phase 1 | `/kiro-spec-init "説明"` | spec 初期化 |
| Phase 1 | `/kiro-spec-requirements {feature}` | EARS形式要件定義 |
| Phase 1 | `/kiro-validate-gap {feature}` | 既存コードとのギャップ分析 |
| Phase 1 | `/kiro-spec-design {feature}` | 技術設計書生成 |
| Phase 1 | `/kiro-validate-design {feature}` | 設計レビュー（GO/NO-GO） |
| Phase 1 | `/kiro-spec-tasks {feature}` | タスク分解 |
| Phase 1 | `/kiro-spec-quick {feature} [--auto]` | 一括 spec 生成 |
| Phase 1 | `/kiro-spec-batch` | 複数 spec 並列生成 |
| Phase 2 | `/kiro-impl {feature} [tasks]` | TDD実装（サブエージェント活用） |
| Phase 2 | `/kiro-review` | タスク実装レビュー |
| Phase 2 | `/kiro-validate-impl {feature}` | 統合検証 |
| Phase 2 | `/kiro-verify-completion` | 完了検証 |
| Phase 2 | `/kiro-debug` | 失敗時のルートコーズ分析 |
| 共通 | `/kiro-spec-status {feature}` | 進捗確認 |

### ディレクトリ構成

```
.kiro/
├── CLAUDE.md                    # kiro式SDDのワークフロー定義
├── steering/                    # プロジェクト共通知識
│   ├── product.md               # プロダクト概要
│   ├── tech.md                  # 技術スタック
│   └── structure.md             # ディレクトリ構造
├── specs/                       # 新規機能の仕様書（kiro式）
│   └── {feature-name}/
│       ├── brief.md
│       ├── spec.json
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── settings/templates/          # 各種テンプレート
```

### 既存仕様書との共存

既存の `docs/specs/` 配下の仕様書はそのまま維持する。新規機能は `.kiro/specs/` に配置。

| 配置場所 | 用途 |
|---------|------|
| `docs/specs/` | 旧SDDで作成された既存仕様書（参照用） |
| `.kiro/specs/` | kiro式SDDで新規作成する仕様書 |

### 参照すべきドキュメント

| ドキュメント | パス | 内容 |
|-------------|------|------|
| kiro SDDワークフロー定義 | [`.kiro/CLAUDE.md`](.kiro/CLAUDE.md) | スキル構成・最小ワークフロー |
| cc-sdd 開発ワークフロー | [`CC-SDD_WORKFLOW.md`](docs/workflow/CC-SDD_WORKFLOW.md) | 全体フロー・コマンド早見表・旧SDDとの対応 |
| コア用語集 | [`GLOSSARY.md`](docs/GLOSSARY.md) | EVM用語、クラス詳細仕様、稼働日計算ロジック |
| 旧SDD 開発ワークフロー | [`DEVELOPMENT_WORKFLOW.md`](docs/workflow/DEVELOPMENT_WORKFLOW.md) | 旧方式の参照用 |
