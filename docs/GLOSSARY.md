# evmtools-node コア用語集

本ドキュメントは、evmtools-nodeプロジェクトにおけるコアな用語・プロパティを定義・整理したものです。

## クラス図

```mermaid
classDiagram
    direction TB

    class Project {
        -TaskNode[] _taskNodes
        -Date _baseDate
        -HolidayData[] _holidayDatas
        -Date _startDate
        -Date _endDate
        -string _name
        +Date baseDate
        +TaskNode[] taskNodes
        +HolidayData[] holidayDatas
        +number length
        +ProjectStatistics[] statisticsByProject
        +AssigneeStatistics[] statisticsByName
        +ExcludedTask[] excludedTasks
        +toTaskRows() TaskRow[]
        +getTask(id) TaskRow
        +getFullTaskName(task) string
        +getTaskRows(from, to, assignee) TaskRow[]
        +isHoliday(date) boolean
    }

    class TaskRow {
        +number sharp
        +number id
        +number level
        +string name
        +string assignee
        +number workload
        +Date startDate
        +Date endDate
        +Date actualStartDate
        +Date actualEndDate
        +number progressRate
        +number scheduledWorkDays
        +number pv
        +number ev
        +number spi
        +number delayDays
        +number parentId
        +boolean isLeaf
        +Map~number,boolean~ plotMap
        +number workloadPerDay
        +boolean finished
        +ValidStatus validStatus
        +calculatePV(baseDate) number
        +calculatePVs(baseDate) number
        +calculateSPI(baseDate) number
        +calculateSV(baseDate) number
        +isOverdueAt(baseDate) boolean
    }

    class TaskNode {
        +TaskNode[] children
        +iterator()
    }

    class TaskService {
        +buildTaskTree(rows) TaskNode[]
        +convertToTaskRows(nodes) TaskRow[]
    }

    class ProjectService {
        +calculateTaskDiffs(now, prev) TaskDiff[]
        +calculateProjectDiffs(diffs) ProjectDiff[]
        +calculateAssigneeDiffs(diffs) AssigneeDiff[]
        +mergeProjectStatistics(existing, incoming) ProjectStatistics[]
        +fillMissingDates(stats) ProjectStatistics[]
    }

    class HolidayData {
        -Date _date
        -string _desc
        +Date date
    }

    class TaskRowCreator {
        <<interface>>
        +createRowData() Promise~TaskRow[]~
    }

    class ProjectCreator {
        <<interface>>
        +createProject() Promise~Project~
    }

    class TaskDiff {
        <<type>>
        +number id
        +string name
        +string fullName
        +string assignee
        +DiffType diffType
        +number deltaProgressRate
        +number deltaPV
        +number deltaEV
        +number prevPV
        +number currentPV
        +number prevEV
        +number currentEV
        +boolean isOverdueAt
        +boolean hasDiff
        +boolean finished
        +TaskRow prevTask
        +TaskRow currentTask
    }

    class ProjectDiff {
        <<type>>
        +number modifiedCount
        +number addedCount
        +number removedCount
        +number deltaPV
        +number deltaEV
        +boolean hasDiff
        +boolean finished
    }

    class AssigneeDiff {
        <<type>>
        +string assignee
        +number modifiedCount
        +number addedCount
        +number removedCount
        +number deltaPV
        +number deltaEV
        +boolean hasDiff
        +boolean finished
    }

    class DiffType {
        <<enumeration>>
        added
        modified
        removed
        none
    }

    TaskNode --|> TaskRow : extends
    Project "1" *-- "*" TaskNode : taskNodes
    Project "1" *-- "*" HolidayData : holidayDatas
    Project ..> TaskService : uses
    TaskNode "1" *-- "*" TaskNode : children
    TaskService ..> TaskRow : creates
    TaskService ..> TaskNode : creates
    ProjectService ..> Project : compares
    ProjectService ..> TaskDiff : creates
    ProjectService ..> ProjectDiff : creates
    ProjectService ..> AssigneeDiff : creates
    TaskRowCreator ..> TaskRow : creates
    ProjectCreator ..> Project : creates
    TaskDiff ..> DiffType : uses
    TaskDiff ..> TaskRow : references
```

> **注**: 詳細なPlantUML形式のクラス図は [`class-diagram.puml`](class-diagram.puml) を参照。

---

## 1. 基本概念

| 日本語 | 英語/クラス名 | 説明 |
|--------|--------------|------|
| プロジェクト | `Project` | タスクツリーと基準日・期間を持つEVM分析の対象単位 |
| 基準日 | `Project.baseDate` | EVM計算の基準となる日付。「この日の業務終了時点」で評価 |
| タスクノード | `TaskNode` | 階層構造を持つタスク。親子関係を表現。`Iterable`実装 |
| タスク行 | `TaskRow` | フラット化されたタスク。EVM計算メソッドを持つエンティティ |
| リーフタスク | `TaskRow.isLeaf=true` | 子を持たない末端タスク。実作業を表す。EVM集計の対象 |
| 祝日データ | `HolidayData` | プロジェクト固有の休日定義（日付・説明・ルール） |

---

## 2. EVM指標（TaskRowクラス）

以下はすべて `TaskRow` クラスのプロパティ/メソッドである。

| 日本語 | プロパティ/メソッド | 説明 |
|--------|-------------------|------|
| 計画価値（PV） | `TaskRow.pv` / `TaskRow.calculatePV(baseDate)` | 基準日に完了予定だった作業量（その日のみ） |
| 累積PV | `TaskRow.calculatePVs(baseDate)` | 基準日までの累積計画価値 |
| 出来高（EV） | `TaskRow.ev` | 実際に完了した作業の価値（進捗率×工数） |
| スケジュール効率（SPI） | `TaskRow.spi` / `TaskRow.calculateSPI(baseDate)` | EV/累積PV。1.0以上なら予定通り |
| スケジュール差異（SV） | `TaskRow.calculateSV(baseDate)` | EV - 累積PV。正なら前倒し |

### PVの2つの取得方法（TaskRowクラス）

本システムでは、PV（計画価値）を2つの方法で取得・算出できる。

| 種別 | TaskRowプロパティ/メソッド | 説明 |
|------|---------------------------|------|
| Excel取得PV | `TaskRow.pv` | Excelファイルから直接読み込んだPV値 |
| 計算PV | `TaskRow.calculatePV(baseDate)` | `workload / scheduledWorkDays` で算出した1日あたりPV |

#### 詳細

1. **Excel取得PV (`TaskRow.pv`)**
   - Excelの「PV」列から読み込んだ値
   - 統計集計時は `Statistics.totalPvExcel` として合算される
   - Excelで手動設定された値をそのまま使用

2. **計算PV (`TaskRow.calculatePV(baseDate)`, `TaskRow.calculatePVs(baseDate)`)**
   - `TaskRow.workloadPerDay = workload / scheduledWorkDays` を基に算出
   - `calculatePV(baseDate)`: 基準日が稼働日（`plotMap`に存在）なら `workloadPerDay` を返す。稼働日でなければ `0`
   - `calculatePVs(baseDate)`: 基準日までの累積PV。`plotMap`の各稼働日について `calculatePV` を合算
   - 統計集計時は `Statistics.totalPvCalculated` として合算される

#### 使い分け

| 用途 | 推奨 |
|------|------|
| Excelデータとの整合性確認 | Excel取得PV (`pv`) |
| 日別・期間別のPV推移分析 | 計算PV (`calculatePV`, `calculatePVs`) |
| SPI/SV算出 | 計算PV (`calculateSPI`, `calculateSV` は内部で `calculatePVs` を使用) |

### 稼働日の計算方法（TaskRowクラス）

PV計算において「稼働日」の判定は重要な要素である。本システムでは以下の仕組みで稼働日を管理・判定する。

#### 関連プロパティ（TaskRowクラス）

| TaskRowプロパティ | 型 | 説明 |
|------------------|-----|------|
| `TaskRow.plotMap` | `Map<number, boolean>` | Excelシリアル値をキーとした稼働日マップ |
| `TaskRow.scheduledWorkDays` | `number` | 稼働予定日数（Excelから取得） |
| `TaskRow.startDate` | `Date` | タスクの予定開始日 |
| `TaskRow.endDate` | `Date` | タスクの予定終了日 |

#### plotMapの構造

- **キー**: Excelの日付シリアル値（`date2Sn(date)`で変換）
- **値**: `true`（稼働日）
- Excelのガントチャート上で「□」がプロットされている日が稼働日として登録される

```
例: 2025/06/09〜2025/06/13 の5日間タスク（土日除く）
plotMap = {
  45817: true,  // 2025/06/09 (月)
  45818: true,  // 2025/06/10 (火)
  45819: true,  // 2025/06/11 (水)
  45820: true,  // 2025/06/12 (木)
  45821: true,  // 2025/06/13 (金)
}
```

#### 稼働日判定ロジック（isInRange関数）

基準日が稼働日かどうかは以下の条件で判定される:

```typescript
function isInRange(baseDate, startDate, endDate, plotMap): boolean {
  return plotMap.get(baseSerial) === true  // plotMapに存在
      && startSerial <= baseSerial         // 開始日以降
      && baseSerial <= endSerial           // 終了日以前
}
```

#### PV計算での稼働日の使われ方（TaskRowメソッド）

1. **`TaskRow.calculatePV(baseDate)`**: 単日PV
   - 基準日が稼働日（`isInRange`がtrue）なら `workloadPerDay` を返す
   - 稼働日でなければ `0` を返す

2. **`TaskRow.calculatePVs(baseDate)`**: 累積PV
   - `plotMap`のキー（稼働日）をループ
   - 基準日以前の稼働日について `calculatePV` を合算

#### scheduledWorkDaysとplotMapの関係（TaskRowクラス）

| 項目 | 説明 |
|------|------|
| `TaskRow.scheduledWorkDays` | Excelの「稼働予定日数」列から取得した値 |
| `TaskRow.plotMap.size` | 実際にプロットされている日数 |
| 整合性 | 通常は一致するが、Excelの入力ミスで不一致の場合あり |
| PV計算の優先 | `plotMap`（プロット）を優先。日数計算は `workload / scheduledWorkDays` |

#### 注意事項

- 親タスク（非リーフ）の`TaskRow.plotMap`には土日もプロットされている場合があり、その場合は稼働日数が正しくない可能性がある
- `TaskRow.validStatus`で開始日・終了日・plotMap・稼働日数の妥当性をチェック可能

### HolidayDataと稼働日判定の関係

#### HolidayDataの役割

`HolidayData`はプロジェクト固有の祝日定義であり、`Project.holidayDatas`として保持される。

| クラス/メソッド | 説明 |
|----------------|------|
| `HolidayData` | 祝日データ（日付・説明・ルール） |
| `Project.holidayDatas` | プロジェクトが保持する祝日データ配列 |
| `Project.isHoliday(date)` | 指定日が祝日かどうかを判定 |

#### isHoliday関数の判定ロジック

```typescript
function isHoliday(date: Date, project?: Project): boolean {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6  // 土日判定
  const isProjectHoliday = project?.holidayDatas.some(
    d => d.date.toDateString() === date.toDateString()
  )
  return isWeekend || isProjectHoliday
}
```

- **土日**: 自動的に祝日扱い
- **プロジェクト祝日**: `Project.holidayDatas`に含まれる日付

#### plotMapとHolidayDataの違い（重要）

| 項目 | `TaskRow.plotMap` | `HolidayData` |
|------|-------------------|---------------|
| 管理単位 | タスク単位 | プロジェクト単位 |
| データソース | Excelガントチャートのプロット（□） | Excelの祝日シート |
| 用途 | **PV計算の稼働日判定** | 祝日判定・要員計画など |
| PV計算への影響 | **直接使用される** | 直接使用されない |

#### 関係性のまとめ

```
PV計算（TaskRow.calculatePV）
  └── plotMap を参照（Excelプロットが稼働日）
      ※ HolidayData は参照しない

祝日判定（Project.isHoliday）
  └── HolidayData + 土日 を判定
      ※ plotMap は参照しない
```

**重要**: PV計算の稼働日判定は `plotMap` に依存しており、`HolidayData` は参照しない。両者は独立して管理されている。Excelでガントチャートを作成する際、祝日にはプロットを入れないことで稼働日から除外される想定。

---

## 3. TaskRowプロパティ（計画系）

| 日本語 | プロパティ | 型 | 説明 |
|--------|-----------|-----|------|
| 行番号 | `sharp` | `number` | 表示順の識別子（"#"列に対応） |
| タスクID | `id` | `number` | タスクの一意な識別子 |
| 階層レベル | `level` | `number` | 1=ルート、2=子... |
| タスク名 | `name` | `string` | タスクの名称 |
| 担当者 | `assignee` | `string?` | 担当者名 |
| 予定工数 | `workload` | `number?` | 日単位の予定工数 |
| 予定開始日 | `startDate` | `Date?` | 計画上の開始日 |
| 予定終了日 | `endDate` | `Date?` | 計画上の終了日 |
| 稼働予定日数 | `scheduledWorkDays` | `number?` | 計画上の稼働日数 |
| 稼働日マップ | `plotMap` | `Map<number, boolean>?` | Excelシリアル値→稼働日フラグ |
| 親タスクID | `parentId` | `number?` | 親ノードのID |
| 備考 | `remarks` | `string?` | 自由記述 |

---

## 4. TaskRowプロパティ（実績系）

| 日本語 | プロパティ | 型 | 説明 |
|--------|-----------|-----|------|
| 実績開始日 | `actualStartDate` | `Date?` | 実際の開始日 |
| 実績終了日 | `actualEndDate` | `Date?` | 実際の終了日 |
| 進捗率 | `progressRate` | `number?` | 0.0〜1.0。1.0で完了 |
| 進捗応当日 | `expectedProgressDate` | `Date?` | 現在の進捗率に相当する予定日 |
| 遅延日数 | `delayDays` | `number?` | 正=遅延、負=前倒し |

---

## 5. TaskRow算出プロパティ/メソッド

| 日本語 | プロパティ/メソッド | 説明 |
|--------|-------------------|------|
| 1日あたり工数 | `workloadPerDay` | `workload / scheduledWorkDays` |
| 完了判定 | `finished` | `progressRate === 1.0` |
| 期限切れ判定 | `isOverdueAt(baseDate)` | `endDate <= baseDate` かつ未完了 |
| 有効性チェック | `validStatus` | 日付・plotMap・稼働日数の検証結果 |

---

## 6. Projectプロパティ

| 日本語 | プロパティ | 型 | 説明 |
|--------|-----------|-----|------|
| プロジェクト名 | `name` | `string?` | プロジェクトの名称 |
| 開始日 | `startDate` | `Date?` | プロジェクト全体の開始日 |
| 終了日 | `endDate` | `Date?` | プロジェクト全体の終了日 |
| タスクノード配列 | `taskNodes` | `TaskNode[]` | ルートノードの配列 |
| タスク数 | `length` | `number` | フラット化後のタスク総数 |

---

## 7. Project取得メソッド

| 日本語 | メソッド | 戻り値 | 説明 |
|--------|---------|--------|------|
| タスク行変換 | `toTaskRows()` | `TaskRow[]` | ツリーをフラット配列に変換（キャッシュ有） |
| タスク取得 | `getTask(id)` | `TaskRow?` | IDからタスクを取得 |
| フルパス名 | `getFullTaskName(task)` | `string` | 親を遡って"/"区切り |
| 期間担当者フィルタ | `getTaskRows(from, to?, assignee?)` | `TaskRow[]` | リーフのみ抽出 |
| 除外タスク | `excludedTasks` | `ExcludedTask[]` | 計算除外タスクと理由 |
| 祝日判定 | `isHoliday(date)` | `boolean` | 祝日かどうか |

---

## 8. Project統計プロパティ

| 日本語 | プロパティ | 説明 |
|--------|-----------|------|
| プロジェクト統計 | `statisticsByProject` | 全体のタスク数・工数・PV/EV/SPI |
| 担当者別統計 | `statisticsByName` | 担当者ごとの集計 |
| 担当者別PV（Wide） | `pvByName` / `pvsByName` | 日別PVを横並び形式 |
| 担当者別PV（Long） | `pvByNameLong` / `pvsByNameLong` | 日別PVを縦並び形式 |
| プロジェクトPV（Wide） | `pvByProject` / `pvsByProject` | プロジェクト全体の日別PV |

---

## 9. プロジェクト間差分計算

### 概要

`ProjectService`は、2つの時点のProject（`now`と`prev`）を比較し、タスク単位の差分を計算する。これにより、プロジェクトの進捗変化を可視化できる。

```
prev (前回スナップショット)    now (今回スナップショット)
       ↓                              ↓
       └───── ProjectService.calculateTaskDiffs() ─────→ TaskDiff[]
                                                              ↓
                          ┌───────────────────────────────────┴───────────────────────────────────┐
                          ↓                                                                       ↓
              calculateProjectDiffs()                                              calculateAssigneeDiffs()
                          ↓                                                                       ↓
                   ProjectDiff                                                          AssigneeDiff[]
              (プロジェクト全体の集約)                                                 (担当者別の集約)
```

### 差分計算の対象

- **リーフタスクのみ**が対象（`isLeaf === true`）
- 親タスク（サマリータスク）は対象外

### ProjectServiceメソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `calculateTaskDiffs` | `now: Project, prev: Project` | `TaskDiff[]` | タスク単位の差分を計算 |
| `calculateProjectDiffs` | `taskDiffs: TaskDiff[]` | `ProjectDiff[]` | プロジェクト全体で集約 |
| `calculateAssigneeDiffs` | `taskDiffs: TaskDiff[]` | `AssigneeDiff[]` | 担当者別に集約 |
| `mergeProjectStatistics` | `existing, incoming` | `ProjectStatistics[]` | 同じ基準日は上書きでマージ |
| `fillMissingDates` | `stats: ProjectStatistics[]` | `ProjectStatistics[]` | 欠落日を前日データで補間 |

---

## 10. DiffType（差分種別）

| 差分種別 | `DiffType` | 判定条件 | 説明 |
|---------|-----------|----------|------|
| 追加 | `'added'` | `prev`に存在しない | 新規追加されたタスク |
| 変更 | `'modified'` | 進捗率・PV・EVのいずれかに変化 | 更新されたタスク |
| 削除 | `'removed'` | `now`に存在しない | 削除されたタスク |
| 変化なし | `'none'` | 差分なし | 変更のないタスク |

### 変更判定ロジック

```typescript
const hasAnyChange =
    isNew ||
    [deltaProgressRate, deltaPV, deltaEV].some((d) => d !== undefined && d !== 0)

diffType = isNew ? 'added' : hasAnyChange ? 'modified' : 'none'
```

---

## 11. TaskDiff（タスク差分）

タスク単位の差分情報。`calculateTaskDiffs()`の戻り値。

### 識別・基本情報

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `id` | `number` | タスクID |
| `name` | `string` | タスク名 |
| `fullName` | `string` | 親を含む完全なタスク名（"/"区切り） |
| `assignee` | `string?` | 担当者 |
| `parentId` | `number?` | 親タスクID |
| `workload` | `number?` | 予定工数 |

### 差分判定

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `diffType` | `DiffType` | `'added'` / `'modified'` / `'removed'` / `'none'` |
| `hasDiff` | `boolean` | 差分があるか（`added`/`modified`/`removed`ならtrue） |
| `hasProgressRateDiff` | `boolean` | 進捗率に変化があるか |
| `hasPvDiff` | `boolean` | PVに変化があるか |
| `hasEvDiff` | `boolean` | EVに変化があるか |
| `finished` | `boolean` | 完了済みか（`progressRate === 1.0`） |

### 変化量（Delta）

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `deltaProgressRate` | `number?` | 進捗率の変化量（`now - prev`） |
| `deltaPV` | `number?` | PVの変化量 |
| `deltaEV` | `number?` | EVの変化量 |

### 前回値・今回値

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `prevProgressRate` | `number?` | 前回の進捗率 |
| `currentProgressRate` | `number?` | 今回の進捗率 |
| `prevPV` | `number?` | 前回のPV |
| `currentPV` | `number?` | 今回のPV |
| `prevEV` | `number?` | 前回のEV |
| `currentEV` | `number?` | 今回のEV |

### 基準日・期限情報

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `prevBaseDate` | `Date?` | 前回の基準日 |
| `currentBaseDate` | `Date?` | 今回の基準日 |
| `baseDate` | `Date?` | 評価基準日（通常は`currentBaseDate`） |
| `isOverdueAt` | `boolean` | 基準日時点で期限切れか |
| `daysOverdueAt` | `number?` | 基準日から終了日への相対日数（負=遅延） |
| `daysStrOverdueAt` | `string?` | 遅延日数の文字列表現 |

### TaskRow参照

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `prevTask` | `TaskRow?` | 前回のTaskRow（削除時のみnullでない） |
| `currentTask` | `TaskRow?` | 今回のTaskRow（削除時はundefined） |

---

## 12. ProjectDiff（プロジェクト差分集約）

プロジェクト全体の差分を集約した情報。`calculateProjectDiffs()`の戻り値。

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `modifiedCount` | `number` | 変更されたタスク数 |
| `addedCount` | `number` | 追加されたタスク数 |
| `removedCount` | `number` | 削除されたタスク数 |
| `deltaPV` | `number?` | PV変化量の合計 |
| `deltaEV` | `number?` | EV変化量の合計 |
| `prevPV` | `number?` | 変化があったタスクの前回PV合計 |
| `currentPV` | `number?` | 変化があったタスクの今回PV合計 |
| `prevEV` | `number?` | 変化があったタスクの前回EV合計 |
| `currentEV` | `number?` | 変化があったタスクの今回EV合計 |
| `hasDiff` | `boolean` | 差分があるか |
| `finished` | `boolean` | 全タスクが完了か |

---

## 13. AssigneeDiff（担当者差分集約）

担当者別の差分を集約した情報。`calculateAssigneeDiffs()`の戻り値。

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `assignee` | `string?` | 担当者名 |
| `modifiedCount` | `number` | 変更されたタスク数 |
| `addedCount` | `number` | 追加されたタスク数 |
| `removedCount` | `number` | 削除されたタスク数 |
| `deltaPV` | `number?` | PV変化量の合計 |
| `deltaEV` | `number?` | EV変化量の合計 |
| `prevPV` | `number?` | 変化があったタスクの前回PV合計 |
| `currentPV` | `number?` | 変化があったタスクの今回PV合計 |
| `prevEV` | `number?` | 変化があったタスクの前回EV合計 |
| `currentEV` | `number?` | 変化があったタスクの今回EV合計 |
| `hasDiff` | `boolean` | 差分があるか |
| `finished` | `boolean` | 担当タスク全てが完了か |

---

## 14. 差分計算の使用例

```typescript
import { ProjectService } from 'evmtools-node/domain'

const service = new ProjectService()

// 2つの時点のProjectを取得（例: now.xlsm, prev.xlsm）
const now: Project = await createProject('now.xlsm')
const prev: Project = await createProject('prev.xlsm')

// タスク単位の差分を計算
const taskDiffs = service.calculateTaskDiffs(now, prev)

// 差分があるタスクのみ抽出
const changedTasks = taskDiffs.filter(d => d.hasDiff)

// プロジェクト全体の集約
const projectDiff = service.calculateProjectDiffs(taskDiffs)
console.log(`追加: ${projectDiff[0].addedCount}, 変更: ${projectDiff[0].modifiedCount}`)

// 担当者別の集約
const assigneeDiffs = service.calculateAssigneeDiffs(taskDiffs)
for (const diff of assigneeDiffs) {
    console.log(`${diff.assignee}: EV変化 ${diff.deltaEV}`)
}
```

---

## 15. 統計型定義

### Statistics（共通統計）

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `totalTasksCount` | `number?` | タスク総数 |
| `totalWorkloadExcel` | `number?` | Excel工数の合計 |
| `totalWorkloadCalculated` | `number?` | 計算による工数合計 |
| `averageWorkload` | `number?` | 平均工数 |
| `baseDate` | `string` | 基準日（文字列） |
| `totalPvExcel` | `number?` | Excel累積PV |
| `totalPvCalculated` | `number?` | 計算累積PV |
| `totalEv` | `number?` | 累積EV |
| `spi` | `number?` | SPI |

### ProjectStatistics

`Statistics` + `projectName`, `startDate`, `endDate`

### AssigneeStatistics

`Statistics` + `assignee`

---

## 16. データ形式

| 形式 | 説明 | 用途 |
|------|------|------|
| Wide形式 | 担当者を行、日付を列とした横並び | Excel出力向け |
| Long形式 | `{assignee, baseDate, value}` の縦並び | 集計・グラフ向け |

---

## 関連ファイル

- `src/domain/TaskRow.ts` - TaskRowエンティティ
- `src/domain/TaskNode.ts` - TaskNodeエンティティ
- `src/domain/Project.ts` - Projectエンティティ
- `src/domain/ProjectService.ts` - 差分計算サービス
- `src/domain/HolidayData.ts` - 祝日データ
