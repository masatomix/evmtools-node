# マスター設計書 INDEX / 公開APIカタログ

evmtools-node の**アプリ全体の設計書の入口**。全クラスの責務と公開 API を横串で一覧する。
メソッドレベルの詳細仕様・テストシナリオ・変更履歴は各クラスのマスター設計書（`{Class}.spec.md`）が正である。

- 運用規約: [.kiro/steering/master-spec-sync.md](../../../../.kiro/steering/master-spec-sync.md)（実装完了後・PR マージ前に本 INDEX と該当 `{Class}.spec.md` の同期が必須）
- 用語集: [docs/GLOSSARY.md](../../../GLOSSARY.md) / 開発フロー: [docs/workflow/CC-SDD_WORKFLOW.md](../../../workflow/CC-SDD_WORKFLOW.md)

## レイヤー別クラス一覧

| レイヤー（サブパス） | クラス/モジュール | 責務 | マスター設計書 |
|---------------------|------------------|------|----------------|
| domain | `Project` | 集約ルート。タスクツリー・基準日・統計/遅延/完了予測 | [Project.spec.md](Project.spec.md) |
| domain | `TaskRow` | タスクエンティティ。PV/EV/SPI/期限判定 | [TaskRow.spec.md](TaskRow.spec.md) |
| domain | `TaskNode` | TaskRow の階層ツリー | [TaskNode.spec.md](TaskNode.spec.md) |
| domain | `ProjectService` | スナップショット間差分・期間SPI・統計時系列 | [ProjectService.spec.md](ProjectService.spec.md) |
| domain | `TaskService` | TaskRow[] → TaskNode ツリー構築 | [TaskService.spec.md](TaskService.spec.md) |
| domain | `HolidayData` | プロジェクト固有の祝日 | [HolidayData.spec.md](HolidayData.spec.md) |
| domain | `ProjectCreator` ほか各種 interface | 生成・永続化の抽象 | [ProjectCreator.spec.md](ProjectCreator.spec.md) / [Interfaces.spec.md](Interfaces.spec.md) |
| domain | `ExcelProjectStatisticsCreator` / `ExcelBufferProjectStatisticsCreator` | 統計時系列 Excel の読み込み | Interfaces.spec.md（一部）※未整備分は Backlog |
| infrastructure | `ExcelProjectCreator` / `ExcelBufferProjectCreator` | Excel(now.xlsm) → Project | ProjectCreator.spec.md |
| infrastructure | `CsvProjectCreator` | CSV → Project（UTF-8/Shift-JIS） | [CsvProjectCreator.spec.md](CsvProjectCreator.spec.md) |
| infrastructure | `MappingProjectCreator` / `ExcelTaskRowCreator` / `TaskRowCreatorImpl` / `TaskRowFactory` | 行データ変換・生成実装 | -（未文書化・Backlog） |
| infrastructure | `ProjectRepositoryImpl` | handlebars テンプレートで Excel 出力 | -（未文書化・Backlog） |
| usecase | `PbevmDiffUsecase` / `PbevmShowProjectUsecase` / `PbevmShowPvUsecase` / `PbevmSummaryUsecase` | CLI 向けアプリケーションロジック | -（docs/examples が実質仕様） |
| common | `utils` / `calcUtils` / `TreeFormatter` / `VersionInfo` / `styles` | 日付・計算・ツリー整形・スタイル | [VersionInfo.spec.md](VersionInfo.spec.md)、他は本 INDEX + GLOSSARY |
| logger | `getLogger` / `setLoggerConfig` | pino ベースのモジュール別ロガー | -（README 参照） |
| resource | 要員計画モジュール一式（**ベータ**） | 要員計画の読み込み・表示 | -（ベータのため未文書化） |
| presentation | `cli-pbevm-*`（bin: pbevm-show-project / pbevm-diff / pbevm-show-pv / pbevm-tree / pbevm-show-resourceplan） | yargs CLI | [docs/examples/06-cli-commands.md](../../../examples/06-cli-commands.md) |

## 公開APIカタログ

サブパス export（`evmtools-node/{domain,infrastructure,usecase,common,logger,project,resource}`）のバレルに載る全シンボル。
「導入」はバージョンが判明しているもののみ記載。メソッド詳細は「詳細」列のマスター設計書を参照。

### domain（`evmtools-node/domain`）

| シンボル | 種別 | 概要 | 導入 | 詳細 |
|----------|------|------|------|------|
| `Project` | class | 集約ルート。`getStatistics` / `getStatisticsByName` / `getDelayedTasks` / `getTree` / `calculateCompletionForecast` / `calculateRecentDailyPv` / `filterTasks` / `excludedTasks` / PV 系 getter 等 | - | Project.spec.md |
| `TaskRow` | class | `calculatePV(s)` / `calculateSPI` / `calculateSV` / `remainingDays` / `pvTodayActual` / `isOverdueAt` / `finished` 等 | - | TaskRow.spec.md |
| `TaskNode` | class | ツリーノード（Iterable） | - | TaskNode.spec.md |
| `TaskService` | class | `buildTaskTree` | - | TaskService.spec.md |
| `ProjectService` | class | `calculateTaskDiffs` / `calculateProjectDiffs` / `calculateAssigneeDiffs` / `calculateRecentSpi`（期間SPI=ΔEV/ΔPV） / `mergeProjectStatistics` / `fillMissingDates` | - | ProjectService.spec.md |
| `HolidayData` | class | 祝日データ | - | HolidayData.spec.md |
| `ExcelProjectStatisticsCreator` / `ExcelBufferProjectStatisticsCreator` | class | 統計時系列 Excel 読み込み | - | - |
| `PROGRESS_RATE_EPSILON` | const | 進捗率の完了判定許容誤差（1e-9） | 0.0.29 | TaskRow.spec.md |
| `ProjectCreator` / `TaskRowCreator` / `ProjectRepository` / `ProjectStatisticsCreator` / `ProjectProgressCreator` | interface | 生成・永続化の抽象 | - | ProjectCreator.spec.md / Interfaces.spec.md |
| `TaskFilterOptions` / `StatisticsOptions` | interface/type | フィルタ・統計取得オプション | - | Project.spec.md |
| `Statistics` / `ProjectStatistics` / `AssigneeStatistics` / `BasicStats` / `ExcludedTask` / `LongData` | type | 統計・除外・ロング形式データ | - | Project.spec.md |
| `CompletionForecast` / `CompletionForecastOptions` | interface | 完了予測の結果・オプション（`spiOverride` 等） | - | Project.spec.md |
| `RecentSpiOptions` | interface | 期間SPI オプション（`warnThresholdDays`） | - | ProjectService.spec.md |
| `TaskDiff` / `TaskDiffBase` / `ProjectDiff` / `AssigneeDiff` / `DiffType` | type | スナップショット差分 | - | ProjectService.spec.md |

### infrastructure（`evmtools-node/infrastructure`）

| シンボル | 種別 | 概要 | 導入 | 詳細 |
|----------|------|------|------|------|
| `ExcelProjectCreator` / `ExcelBufferProjectCreator` | class | Excel → Project | - | ProjectCreator.spec.md |
| `CsvProjectCreator` / `CsvProjectCreatorOptions` | class/type | CSV → Project | - | CsvProjectCreator.spec.md |
| `MappingProjectCreator` | class | マッピング定義による生成 | - | - |
| `ExcelTaskRowCreator` / `TaskRowCreatorImpl` / `TaskRowFactory` | class | 行データ変換 | - | - |
| `ProjectRepositoryImpl` | class | Excel 書き出し（hbs テンプレート） | - | - |
| `convertToTaskRow` / `checkTaskName` / `isTaskRowDto` / `isTaskRowDtos` | function/const | DTO 変換・検査 | - | - |

### usecase（`evmtools-node/usecase`）

| シンボル | 種別 | 概要 | 導入 | 詳細 |
|----------|------|------|------|------|
| `PbevmDiffUsecase` / `formatTaskDiffsForDisplay` | class/const | 差分表示ロジック | - | docs/examples/05 |
| `PbevmShowProjectUsecase` / `PbevmShowPvUsecase` / `PbevmSummaryUsecase` | class | 表示系ユースケース | - | docs/examples |

### common（`evmtools-node/common`）

| シンボル | 種別 | 概要 | 導入 | 詳細 |
|----------|------|------|------|------|
| `generateBaseDates` | const | FROM/TO の日付配列生成（JST 前提） | - | GLOSSARY |
| `dateStr` / `formatRelativeDays` / `formatRelativeDaysNumber` | const | 日付表記・暦日差 | - | - |
| `truncateToLocalDate` / `diffCalendarDays` | const | ローカル日付切り詰め・暦日差（off-by-one 対策） | 0.0.29 | TaskRow.spec.md 関連 |
| `isHoliday` | function | 土日+プロジェクト祝日判定 | - | - |
| `maxDate` / `minDate` | const | Date 配列の最大/最小 | - | - |
| `sum` / `sumOrZero` / `average` / `averageOrZero` / `round` / `calcRate` / `subtract` / `isValidNumber` | const | 数値ユーティリティ（undefined 安全） | - | - |
| `TreeFormatter` / `TreeNode` / `TreeFormatOptions` | class/interface | ツリー文字列整形（pbevm-tree） | 0.0.28 | - |
| `getVersionInfo` / `VersionInfo` | function/interface | バージョン情報 | - | VersionInfo.spec.md |
| `createStyles` / `style0`〜`style6` / `style21` / `StyleFC` | const/type | Excel 出力スタイル | - | - |
| `printTask` / `printTaskRows` / `printTaskNodes` | function | デバッグ表示 | - | - |

### logger（`evmtools-node/logger`）

| シンボル | 種別 | 概要 |
|----------|------|------|
| `getLogger` / `setLoggerConfig` | function | モジュール別 pino ロガー（config/default.json でレベル制御） |

### resource（`evmtools-node/resource`）— ベータ

要員計画モジュール。API は安定化前のためカタログ対象外（安定化時に本 INDEX へ追加する）。

## 更新ルール

- 公開シンボルを追加・変更した PR は、本 INDEX の該当行と `{Class}.spec.md` を必ず更新する（`.kiro/steering/master-spec-sync.md` v2）
- 「-（未文書化・Backlog）」の解消は必要になった時点で行う（過剰文書化はしない）

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-07-03 | 初版作成（sdd-consolidation。バレル export 全量棚卸し、phase0 追加シンボル反映） |
