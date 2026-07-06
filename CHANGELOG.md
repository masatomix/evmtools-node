# 変更履歴

このファイルはプロジェクトの主要な変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づき、
[セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

## [0.0.33]

### 追加
- **EV 算定方式オプション `evMethod`**: `StatisticsOptions.evMethod`（`'progressRate'` | `'0/100'` | `'50/50'`）を追加（phase5-evmethod-knowledge 要件1〜4、#171 知見ⓕ）
  - 進捗率の主観バイアス（水増し・90%症候群）への対処として、PMI 標準の fixed formula（0/100 = 完了時のみ計上、50/50 = 着手半分+完了残り）を選択可能に。新規入力カラム不要
  - `getStatistics` / `getStatisticsByName` / `calculateCompletionForecast` / `calculateEarnedSchedule` に一貫反映。**PV/BAC は不変、既定（未指定）は従来と完全同値**
  - 50/50 の着手判定は `actualStartDate` の有無（客観方式のため進捗率は不使用。GLOSSARY に注記）
  - `StatisticsOptions` を型別名から `interface extends TaskFilterOptions` へ変換（型互換・非破壊）。`EvMethod` 型を公開

### ドキュメント
- **EVM ドメインプライマー新設**（[docs/EVM-PRIMER.md](docs/EVM-PRIMER.md)）: AI・スキル向けドメイン知識の入口。本ツールの EVM 解釈6原則、指標カタログ（式×API×undefined 条件）、用語正規化表、フェーズ別判断レシピ、実装の落とし穴8項目。steering から必読参照として接続
- **コスト系 EVM（AC）設計メモ新設**（[docs/specs/requirements/REQ-COST-EVM-DRAFT.md](docs/specs/requirements/REQ-COST-EVM-DRAFT.md)、#191）: 導入ゲート・入力ソース案・型拡張案・段階導入プラン（実装はゲート成立後）
- EVM-MANAGEMENT-GUIDE に**標準 EVM 式対応表**（PMBOK/PMI/Lipke ↔ 本ツール API）と**完了予測3点見積の公式レシピ**（悲観SPI = min(期間SPI, SPI(t))）を追加
- phase4（scurve/forecastVariants）の見送りを正式記録（Sカーブは再開条件つき #192）

## [0.0.32]

### ドキュメント
- **EVM 知識ベースを新設**（[docs/EVM-KNOWLEDGE.md](docs/EVM-KNOWLEDGE.md)、#171）: 実運用 WBS 分析から得た EVM 指標の落とし穴と読み方を知見ⓐ〜ⓗ′として体系化。各知見に「現象 / 理論的背景 / 本ツールでの確認方法（API） / 対処・解決状況」を記載。ⓐ母数効果→期間SPI(0.0.29)、ⓑ終盤SPI収束→Earned Schedule(0.0.31) で解決済みを明示
- **変更履歴を CHANGELOG.md に一本化**: README「改訂履歴」との二重管理を解消し、README はリンクのみに。旧8版（0.0.5〜0.0.13）を CHANGELOG に移設。steering に「変更履歴の正本は CHANGELOG.md」を明文化
- 機能化候補を Backlog Issue 化（#184 停滞タスク経時追跡 / #185 BACトレンド / #186 タスク名変化警告）

## [0.0.31]

### 追加
- **Earned Schedule 系指標**: `Project.calculateEarnedSchedule(options?)` を追加（phase3-earned-schedule 要件1,2）
  - **ES / SPI(t) / SV(t) / IEAC(t)** を算出。古典 SPI がプロジェクト終盤で必ず 1.0 に収束し遅延が見えなくなる欠陥（#171 知見ⓑ）を、時間ベースの測定で解消する
  - 追加入力データ不要（既存の累積PV曲線と EV から算出）。フィルタ（タスク名部分一致）で部分集合の ES も算出可能。完了予測日 `esForecastDate` を暦日で返す
  - 純関数コア `EarnedScheduleResult`（`src/domain/EarnedSchedule.ts`）と関連型を `evmtools-node/domain` から export
  - `docs/GLOSSARY.md`「Earned Schedule 系指標」節を新設
  - 例: BAC=10・計画終了1週間後・EV=9.9 のとき、古典 SPI = 0.99（順調に見える）に対し SPI(t) = 0.66・SV(t) = −5.1 稼働日（失速を検出）

### 補足
- Statistics へのオプトイン統合（当初計画）は「公開 API 追加の基準」により見送り。ES は `calculateEarnedSchedule()` を直接呼び出す（既存の Statistics 型・StatisticsOptions は不変）

## [0.0.30]

### 追加
- **`Project.getDailyPvByAssignee(options?)`**: 担当者×日の日次PV集計（明細付き）を公開 API 化（phase2-skill-integration 要件1）
  - フィルタ（タスク名部分一致）・担当者絞り込み・期間指定（from/to）に対応。休日スキップ、`(未割当)` グルーピング、PV=0 の日もエントリ出力
  - 関連型 `DailyPvEntry` / `DailyPvTaskDetail` / `DailyPvByAssigneeOptions` を `evmtools-node/domain` から export
  - **日次PV計算の単一ソース化**: task スキル側の再実装（check-daily-pv.ts）と丸め順序・出力条件の全項目一致を照合済み。スキル側は本 API への置き換えを推奨
- **サンプル「今日のPV」**: `samples/evm-sample-projects.ts` に計画PV（workloadPerDay）と実行PV（pvTodayActual）の比較表と読み方（遅延圧/前倒し）を追加（#160）

### 改善
- **`Project.getFullTaskName` の内部メモ化**（#153）: 2回目以降の呼び出しで親ツリーを再走査しない。公開シグネチャ・戻り値は完全不変（純粋な性能改善）

### プロセス
- steering に「公開 API 追加の基準」を新設。基準適用により #166（デモメソッド）/#138（isReschedule）/#165（incompleteTasks）および AlertService / detectActiveSubprojects のライブラリ化を取り下げ（利用側の合成で実現可能なため。経緯は各 Issue・`.kiro/specs/` を参照）

## [0.0.29]

### ⚠️ 挙動変更（Behavior Change）
- **期間SPI（`ProjectService.calculateRecentSpi`）を仕様準拠に修正** (#170, #139)
  - 旧: 各スナップショットの「累積SPIの平均」を返していた（仕様と異なるバグ）
  - 新: 窓端2点（最古・最新）の **ΔEV / ΔPV** を返す（直近の実勢SPI）
  - スナップショット2点未満、および ΔPV ≤ 0（計画停滞・再計画によるPV減少）の場合は `undefined` を返す
  - シグネチャは不変。利用側でSPI閾値判定をしている場合は値の変化に注意
  - 詳細: `docs/specs/domain/master/ProjectService.spec.md` v2.0.0

### 修正
- **日付境界バグの一括修正**（phase0-bugfix-0.0.29）
  - `formatRelativeDaysNumber` の時刻成分による遅延日数 off-by-one を解消（`truncateToLocalDate` / `diffCalendarDays` を `evmtools-node/common` に追加）
  - `TaskRow` の日付比較を日単位シリアル値（`toDaySerial`）に統一し、時刻成分・タイムゾーン差による ±1日ずれを解消
  - `TaskRow.finished` を許容誤差付き判定に変更（`PROGRESS_RATE_EPSILON` = 1e-9。浮動小数誤差や 1.0 超の入力も完了扱い）。`isOverdueAt` も対称化
  - `TaskRow.calculatePVs`: 親タスク（`isLeaf === false`）の plotMap に混入していた土日を累積PVから除外（リーフのプロットは尊重）。祝日除外用の `isHolidayFn` オプション引数を追加
- **`calculateProjectDiffs([])` が全フィールド0のデフォルト ProjectDiff を返すように修正**
  - 空入力時に PV/EV フィールドが `undefined` になる問題を解消（利用側のデフォルト値マージが不要に）

### 追加
- CI でテストを TZ=Asia/Tokyo / TZ=UTC の二重実行に（日付境界の回帰防止）
- `docs/specs/domain/master/INDEX.md`: 全クラス・公開APIカタログ（アプリ全体設計書の入口）

### ドキュメント/プロセス
- 仕様駆動開発を cc-sdd（Kiro式）に一本化（#65, #66 クローズ）
  - マスター設計書の維持規約 v2（ポインタモデル・grep 規約）: `.kiro/steering/master-spec-sync.md`
  - 旧方式の文書は `docs/attic/` へ退避（吸収監査記録付き）
- v0.0.29〜0.0.34 のロードマップと6フェーズ分の仕様書を `.kiro/specs/` に追加
- examples の期間SPI 説明を新仕様に改訂

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

## [0.0.13]

### 追加
- `TaskDiff` のプロパティに工数（workload）を追加

## [0.0.12]

### 追加
- 時系列の統計データを読み込む `ProjectStatisticsCreator` を追加

## [0.0.11]

### 追加
- 指定した基準日の SPI / SV（EV−PV）を返すメソッドを `TaskRow` に追加

## [0.0.10]

### 変更
- 内部処理の見直し（ログ関連）

## [0.0.8]

### 追加
- `Project` に休日データを保持するプロパティを追加
- `Project` に日付を指定して祝日かを返すメソッドを追加

## [0.0.7]

### 変更
- 内部のリファクタリング（キャッシュによる処理改善）

## [0.0.6]

### 追加
- `Project#getTaskRows`（条件に合致する TaskRow を返すメソッド）を追加

### ドキュメント
- README.md を更新

## [0.0.5]

- 初回リリース
