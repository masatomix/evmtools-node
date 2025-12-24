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

### EVM用語

- **PV (Planned Value)**: 計画価値。基準日までに完了予定だった作業量
- **EV (Earned Value)**: 出来高。実際に完了した作業の価値
- **SPI (Schedule Performance Index)**: スケジュール効率指標 (EV/PV)。1.0以上なら予定通り
- **SV (Schedule Variance)**: スケジュール差異 (EV-PV)

### TaskRowの詳細仕様

主要プロパティ:
- `sharp`: 表示順の行番号（#列）
- `id`: タスクの一意なID
- `level`: 階層レベル（1=ルート、2=子）
- `name`, `assignee`: タスク名、担当者
- `workload`: 予定工数（日単位）
- `startDate`, `endDate`: 予定開始日・終了日
- `actualStartDate`, `actualEndDate`: 実績開始日・終了日
- `progressRate`: 進捗率（0.0〜1.0）
- `scheduledWorkDays`: 稼働予定日数
- `plotMap`: Map<number, boolean> - Excelのシリアル値をキーとした稼働日マップ
- `isLeaf`: リーフノード（末端タスク）かどうか
- `parentId`: 親タスクのID

主要メソッド:
- `calculatePV(baseDate)`: 基準日のPV（その日のみ）を計算。稼働日でなければ0
- `calculatePVs(baseDate)`: 基準日までの累積PVを計算
- `calculateSPI(baseDate)`: SPI = EV / 累積PV
- `calculateSV(baseDate)`: SV = EV - 累積PV
- `isOverdueAt(baseDate)`: 期限切れ判定（終了日<=基準日 かつ 未完了）
- `validStatus`: データの有効性チェック（開始日・終了日・plotMap・稼働日数の検証）

### Projectの詳細仕様

主要プロパティ:
- `baseDate`: 基準日
- `name`, `startDate`, `endDate`: プロジェクト名、開始日、終了日
- `taskNodes`: TaskNode[]のツリー構造
- `holidayDatas`: 祝日データ

主要メソッド:
- `toTaskRows()`: TaskNodeツリーをフラットなTaskRow[]に変換（キャッシュあり）
- `getTask(id)`: IDからTaskRowを取得
- `getFullTaskName(task)`: 親を遡って"/"区切りのフルパス名を取得
- `getTaskRows(fromDate, toDate?, assignee?)`: 期間・担当者でフィルタしたリーフタスク取得
- `statisticsByProject`: プロジェクト全体の統計（タスク数、工数合計、PV/EV/SPI）
- `statisticsByName`: 担当者別の統計
- `pvByName`, `pvsByName`: 担当者別のPV/累積PVデータ（Wide形式）
- `pvByNameLong`, `pvsByNameLong`: Long形式のPVデータ
- `isHoliday(date)`: 祝日判定

### ProjectServiceの差分計算仕様

`calculateTaskDiffs(now, prev)`:
- 2つのProjectを比較し、タスク単位の差分を計算
- isLeaf（リーフノード）のみを対象
- diffType: `'added'` | `'modified'` | `'removed'` | `'none'`
- 進捗率、PV、EVの変化量（delta）を計算

`calculateProjectDiffs(taskDiffs)`:
- タスク差分をプロジェクト全体で集約
- 変更・追加・削除の件数をカウント

`calculateAssigneeDiffs(taskDiffs)`:
- タスク差分を担当者別に集約

`mergeProjectStatistics(existing, incoming)`:
- 統計データのマージ（同じ基準日は上書き）

`fillMissingDates(stats)`:
- 欠落日（土日など）を前日データで補間

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

```bash
# 1. developから feature ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/機能名

# 2. 開発作業・コミット

# 3. プッシュ
git push -u origin feature/機能名

# 4. PRを作成（ベース: develop）
```

### 禁止事項

- `main`ブランチへの直接コミット
- `main`ブランチからのfeatureブランチ作成
- developを経由しないマージ

詳細は `docs/workflow/DEVELOPMENT_WORKFLOW.md` を参照。

## 注意事項

- 要員計画モジュール（`src/resource/`）はベータ版
- TypeScript strictモードが有効
- plotMapはExcelのシリアル値（数値）をキーとしている点に注意
- CsvProjectCreatorは`iconv-lite`に依存（Shift-JIS対応）

## 仕様駆動開発（重要）

本プロジェクトは仕様駆動開発（Spec-Driven Development）を採用している。新機能開発時は以下のフローに従うこと。

### 参照すべきドキュメント

| ドキュメント | パス | 内容 |
|-------------|------|------|
| 開発ワークフロー | `docs/workflow/DEVELOPMENT_WORKFLOW.md` | 全体フロー、必須セクション |
| サンプル開発フロー | `docs/workflow/SAMPLE_DEVELOPMENT_FLOW.md` | REQ-TASK-001の実例 |
| トレーサビリティ例 | `docs/examples/TRACEABILITY_EXAMPLE.md` | AC→TC追跡の具体例 |

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
