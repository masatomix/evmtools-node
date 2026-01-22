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

Jestによるテストフレームワークを導入:

```bash
npm test              # 全テストを実行
npm test -- --watch   # ウォッチモードで実行
```

### テストファイル

- `src/domain/__tests__/`: ドメイン層のテスト
- `src/infrastructure/__tests__/`: インフラ層のテスト
  - `CsvProjectCreator.test.ts`: CsvProjectCreator単体テスト（22件）
  - `CsvProjectCreator.integration.test.ts`: EVM計算統合テスト（10件）

### 動作確認用スクリプト

- `src/presentation/cli-test.ts`: TaskRowCreator、TaskServiceの動作確認
  - ExcelからTaskRow[]を読み込み、TaskNodeツリーを構築
  - generateBaseDates()で期間指定、結果をExcel出力
- `src/presentation/project-test2.ts`: ProjectProgressの動作確認
  - Excel「EVM記録」シートから時系列のPV/EVデータを読み込み
  - ProjectProgress（date, pv, ev, spi）として表示

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

本プロジェクトは仕様駆動開発（Spec-Driven Development）を採用している。新機能開発時は以下のフローに従うこと。

### 参照すべきドキュメント

| ドキュメント | パス | 内容 |
|-------------|------|------|
| コア用語集 | [`GLOSSARY.md`](docs/GLOSSARY.md) | EVM用語、クラス詳細仕様、稼働日計算ロジック |
| 開発ワークフロー | [`DEVELOPMENT_WORKFLOW.md`](docs/workflow/DEVELOPMENT_WORKFLOW.md) | 全体フロー、必須セクション |
| サンプル開発フロー | [`SAMPLE_DEVELOPMENT_FLOW.md`](docs/workflow/SAMPLE_DEVELOPMENT_FLOW.md) | REQ-TASK-001の実例、トレーサビリティ具体例 |

### 仕様書の必須セクション

**案件設計書（`docs/specs/domain/features/`配下）には以下を必ず含めること:**

| セクション | 必須 | 内容 |
|-----------|:----:|------|
| インターフェース仕様 | ✅ | 型定義、メソッドシグネチャ |
| 処理仕様 | ✅ | ロジック、擬似コード |
| テストケース | ✅ | TC-ID、テスト内容、期待結果 |
| **要件トレーサビリティ** | ✅ | AC-ID → TC-ID の対応表 |
| 使用例 | - | コード例（任意） |

### 要件トレーサビリティセクションの書き方

```markdown
## 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-XXX AC-01 | 受け入れ基準の内容 | TC-01, TC-02 | ✅ PASS |
```

**重要**: AC-IDがgrepで検索可能な形式で記載されていること。

### 案件設計書とマスター設計書の同期

**重要**: 案件設計書（`features/`配下）を修正した場合、対応するマスター設計書（`master/`配下）への反映を必ず確認すること。

| 案件設計書の変更 | マスター設計書への反映 |
|-----------------|---------------------|
| 要件トレーサビリティの追加・修正 | ✅ 必須（同じ内容を反映） |
| テストケースの追加・修正 | ✅ 必須（テストシナリオセクションに反映） |
| インターフェース仕様の変更 | ✅ 必須（メソッド仕様セクションに反映） |
| 変更履歴の更新 | ✅ 必須（バージョン番号を更新） |

### 参考となる既存仕様書

- `docs/specs/domain/master/CsvProjectCreator.spec.md` - 正しいフォーマットの例
- `docs/specs/domain/master/Project.spec.md` - マスター設計書の例
- `docs/specs/domain/features/Project.excludedTasks.spec.md` - 案件設計書の例
