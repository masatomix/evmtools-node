# Project クラス詳細仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 基本情報

| 項目 | 内容 |
|------|------|
| **クラス名** | `Project` |
| **分類** | **集約ルート（Aggregate Root）** |
| **パッケージ** | `src/domain/Project.ts` |
| **責務** | プロジェクト全体のタスク情報を保持し、EVM分析に必要な統計データ・PVデータを提供する |

### 1.1 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| プロジェクト | `Project` | タスクツリーと基準日・期間を持つEVM分析の対象単位 |
| 基準日 | `baseDate` | EVM計算の基準となる日付。「この日の業務終了時点」で評価 |
| タスクノード | `TaskNode` | 階層構造を持つタスク。親子関係を表現 |
| タスク行 | `TaskRow` | フラット化されたタスク。EVM計算メソッドを持つ |
| リーフタスク | `isLeaf=true` | 子を持たない末端タスク。実作業を表す |
| 計画価値（PV） | `pv` / `calculatePV()` | 基準日までに完了予定だった作業量 |
| 出来高（EV） | `ev` | 実際に完了した作業の価値 |
| スケジュール効率（SPI） | `spi` | EV/PV。1.0以上なら予定通り |
| 祝日データ | `HolidayData` | プロジェクト固有の休日定義 |

### 1.2 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────┐
│         EVM分析コンテキスト              │
│                                         │
│  Project ←───── TaskNode[] ←── TaskRow  │
│     │                                   │
│     ├── HolidayData[]                   │
│     │                                   │
│     └── 統計計算・PV集計                 │
└─────────────────────────────────────────┘
```

---

## 2. 不変条件（Invariants）

テスト時に常に検証すべき条件。

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-01 | `baseDate`は必ず存在する（non-null） | 生成時・全操作 |
| INV-02 | `taskNodes`は必ず存在する（空配列可） | 生成時・全操作 |
| INV-03 | `holidayDatas`は必ず存在する（空配列可） | 生成時・全操作 |
| INV-04 | `startDate`が存在する場合、`endDate`も存在し、`startDate ≤ endDate` | 生成時 |
| INV-05 | `toTaskRows()`の結果は冪等（同一インスタンスで複数回呼んでも同じ結果） | キャッシュ機構 |
| INV-06 | `getTask(id)`で取得したTaskRowは`toTaskRows()`の要素と同一参照 | ID検索 |
| INV-07 | リーフタスクのみが統計計算の対象（`isLeaf === true`） | 統計計算時 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数（プライベートフィールド）

| プロパティ | 型 | 必須 | 制約 | デフォルト | 説明 |
|-----------|-----|------|------|-----------|------|
| `_taskNodes` | `TaskNode[]` | ○ | - | - | タスクのツリー構造 |
| `_baseDate` | `Date` | ○ | 有効な日付 | - | EVM計算の基準日 |
| `_holidayDatas` | `HolidayData[]` | ○ | - | - | プロジェクト固有の祝日 |
| `_startDate` | `Date` | - | `≤ _endDate` | `undefined` | プロジェクト開始日 |
| `_endDate` | `Date` | - | `≥ _startDate` | `undefined` | プロジェクト終了日 |
| `_name` | `string` | - | - | `undefined` | プロジェクト名 |

### 3.2 内部キャッシュ

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `_cachedTaskRows` | `TaskRow[] \| undefined` | `toTaskRows()`の結果キャッシュ |
| `_cachedTaskMap` | `Map<number, TaskRow> \| undefined` | ID→TaskRowのマップキャッシュ |

### 3.3 公開プロパティ（getter）

| プロパティ | 戻り型 | 説明 |
|-----------|--------|------|
| `baseDate` | `Date` | 基準日 |
| `taskNodes` | `TaskNode[]` | タスクツリー |
| `startDate` | `Date \| undefined` | プロジェクト開始日 |
| `endDate` | `Date \| undefined` | プロジェクト終了日 |
| `name` | `string \| undefined` | プロジェクト名 |
| `holidayDatas` | `HolidayData[]` | 祝日データ |
| `length` | `number` | タスク総数（`toTaskRows().length`） |

---

## 4. コンストラクタ仕様

### 4.1 シグネチャ

```typescript
constructor(
    taskNodes: TaskNode[],
    baseDate: Date,
    holidayDatas: HolidayData[],
    startDate?: Date,
    endDate?: Date,
    name?: string
)
```

### 4.2 事前条件（Preconditions）

| ID | 条件 | 違反時の期待動作 |
|----|------|------------------|
| PRE-C01 | `taskNodes`が配列である | TypeError |
| PRE-C02 | `baseDate`が有効なDateオブジェクト | 不正な計算結果 |
| PRE-C03 | `holidayDatas`が配列である | TypeError |
| PRE-C04 | `startDate`と`endDate`が両方指定される場合、`startDate ≤ endDate` | 現状：検証なし（要検討） |

### 4.3 事後条件（Postconditions）

| ID | 条件 |
|----|------|
| POST-C01 | `this.baseDate === baseDate` |
| POST-C02 | `this.taskNodes === taskNodes`（同一参照） |
| POST-C03 | `this._cachedTaskRows === undefined`（キャッシュ未生成） |
| POST-C04 | `this._cachedTaskMap === undefined`（キャッシュ未生成） |

---

## 5. メソッド仕様

### 5.1 `toTaskRows(): TaskRow[]`

#### 目的
TaskNodeツリーをフラット化したTaskRow配列を返す。

#### シグネチャ
```typescript
toTaskRows(): TaskRow[]
```

#### 事前条件
なし

#### 事後条件
| ID | 条件 |
|----|------|
| POST-TR01 | 戻り値は`TaskRow[]`型 |
| POST-TR02 | 同一インスタンスで再呼び出し時、同一配列参照を返す（キャッシュ） |
| POST-TR03 | 各TaskRowの`level`は深さに応じて1から順に設定される |
| POST-TR04 | 各TaskRowの`parentId`は親ノードのIDが設定される（ルートは`undefined`） |

#### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | taskNodes: 1件のルートノード（リーフ） | TaskRow 1件、level=1 |
| **正常系** | taskNodes: 親1+子2の階層構造 | TaskRow 3件、親level=1、子level=2 |
| **正常系** | taskNodes: 3階層ネスト | 各levelが1,2,3と設定 |
| **境界値** | taskNodes: 空配列 | 空配列`[]` |
| **境界値** | taskNodes: 子なしルート1件 | TaskRow 1件 |
| **特殊** | 2回連続呼び出し | 同一参照を返す |

---

### 5.2 `getTask(id: number): TaskRow | undefined`

#### 目的
IDを指定してTaskRowを取得する。

#### シグネチャ
```typescript
getTask(id: number): TaskRow | undefined
```

#### 事前条件
| ID | 条件 |
|----|------|
| PRE-GT01 | `id`は数値型 |

#### 事後条件
| ID | 条件 |
|----|------|
| POST-GT01 | 該当IDが存在すれば、そのTaskRowを返す |
| POST-GT02 | 該当IDが存在しなければ`undefined`を返す |
| POST-GT03 | 内部マップが未生成なら、初回呼び出し時に生成・キャッシュ |

#### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | 存在するID | 該当TaskRow |
| **異常系** | 存在しないID | `undefined` |
| **境界値** | id=0（存在する場合） | 該当TaskRow |
| **境界値** | id=-1（負数） | `undefined`（通常存在しない） |
| **境界値** | 空のtaskNodesでid指定 | `undefined` |

---

### 5.3 `getFullTaskName(task?: TaskRow): string`

#### 目的
タスクの親を遡り、"/"区切りのフルパス名を生成する。

#### シグネチャ
```typescript
getFullTaskName(task?: TaskRow): string
```

#### 計算ロジック
```
1. 現在のタスクから開始
2. parentIdが存在する限り、getTask(parentId)で親を取得
3. 各タスクのnameを配列の先頭に追加
4. "/"でjoinして返す
```

#### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | ルートタスク（parentId=undefined） | `"タスク名"` |
| **正常系** | 2階層目のタスク | `"親名/子名"` |
| **正常系** | 3階層目のタスク | `"祖父名/親名/子名"` |
| **境界値** | `task=undefined` | `""`（空文字列） |
| **異常系** | parentIdが存在するがgetTask()で見つからない | 途中で終了（見つかった分まで） |

---

### 5.4 `getTaskRows(fromDate: Date, toDate?: Date, assignee?: string): TaskRow[]`

#### 目的
指定期間・担当者でフィルタしたリーフタスクを取得する。

#### シグネチャ
```typescript
getTaskRows(fromDate: Date, toDate?: Date, assignee?: string): TaskRow[]
```

#### 計算ロジック
```
1. generateBaseDates(fromDate, toDate ?? fromDate) で日付配列生成
2. toTaskRows()でフラット化し、isLeaf===trueのみ抽出
3. 各タスクについて：
   - baseDatesのいずれかでcalculatePV(baseDate) !== 0 ならhasPV=true
   - assignee未指定 または taskRow.assignee===assignee ならassigneeMatch=true
4. hasPV && assigneeMatch のタスクを返す
```

#### 事前条件
| ID | 条件 |
|----|------|
| PRE-GTR01 | `fromDate`は有効なDate |
| PRE-GTR02 | `toDate`指定時は`fromDate ≤ toDate` |

#### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | 期間内にPVがあるタスク | 該当タスク配列 |
| **正常系** | fromDate=toDate（1日指定） | その日にPVがあるタスク |
| **正常系** | assignee指定 | 担当者一致かつPVありのタスク |
| **境界値** | 期間外のみのタスク | 空配列 |
| **境界値** | 全タスクがisLeaf=false | 空配列 |
| **境界値** | assigneeが存在しない担当者 | 空配列 |
| **境界値** | toDate省略 | fromDateのみで判定 |

---

### 5.5 `get statisticsByProject: ProjectStatistics[]`

#### 目的
プロジェクト全体のEVM統計情報を返す。

#### 戻り値の型
```typescript
type ProjectStatistics = {
    projectName?: string
    startDate: string          // 日付文字列 (yyyy/mm/dd)
    endDate: string            // 日付文字列 (yyyy/mm/dd)
    totalTasksCount?: number   // リーフタスク数
    totalWorkloadExcel?: number      // Excelのworkload合計
    totalWorkloadCalculated?: number // endDate時点の累積PV合計
    averageWorkload?: number   // workload平均
    baseDate: string           // 基準日文字列
    totalPvExcel?: number      // ExcelのPV合計
    totalPvCalculated?: number // 計算による累積PV合計
    totalEv?: number           // EV合計
    spi?: number               // SPI (EV/PV)
}
```

#### 計算ロジック
```
1. toTaskRows()でフラット化
2. isLeaf===trueのみフィルタ
3. summarize()で以下を集計：
   - totalTasksCount: リーフタスク数
   - totalWorkloadExcel: workloadの合計
   - totalWorkloadCalculated: endDate時点のcalculatePVs()合計
   - averageWorkload: workloadの平均
   - totalPvExcel: pvの合計
   - totalPvCalculated: baseDate時点のcalculatePVs()合計
   - totalEv: evの合計
   - spi: totalEv / totalPvCalculated
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-SP-01 | リーフタスク（isLeaf===true）のみが統計計算の対象となる | 親タスクは集計から除外 |
| BR-SP-02 | PVが0の場合、SPIは算出不可（0除算回避） | spi=undefined |

#### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | リーフタスク複数 | 集計されたProjectStatistics |
| **正常系** | spi計算可能（PV>0） | 数値spi |
| **境界値** | リーフタスク0件 | totalTasksCount=0 |
| **境界値** | 全タスクのPV=0 | spi=undefined（0除算回避） |
| **境界値** | startDate/endDate未設定 | 空文字列 |

---

### 5.6 `get statisticsByName: AssigneeStatistics[]`

#### 目的
担当者別のEVM統計情報を返す。

#### 戻り値の型
```typescript
type AssigneeStatistics = {
    assignee?: string  // 担当者名（未割当は undefined）
} & Statistics
```

#### 計算ロジック
```
1. toTaskRows()でフラット化
2. isLeaf===trueのみフィルタ
3. groupBy('assignee')で担当者別にグループ化
4. 各グループでstatisticsByProjectと同様の集計
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-SN-01 | リーフタスク（isLeaf===true）のみが統計計算の対象となる | 親タスクは集計から除外 |
| BR-SN-02 | 担当者未設定（assignee=undefined）のタスクも1グループとして集計される | N/A |

#### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | 担当者A: 2件, B: 3件 | 2件のAssigneeStatistics |
| **境界値** | assignee=undefined のタスクあり | assignee=undefinedのエントリ |
| **境界値** | 全タスク同一担当者 | 1件のAssigneeStatistics |
| **境界値** | リーフタスク0件 | 空配列 |

---

### 5.7 `get pvByName: Record<string, unknown>[]` / `get pvsByName`

#### 目的
担当者別のPVデータをWide形式（横持ち）で返す。

#### データ形式
```typescript
// Wide形式
[
  { assignee: "田中", "2025/06/01": 0.5, "2025/06/02": 0.5, ... },
  { assignee: "鈴木", "2025/06/01": 0.3, "2025/06/02": 0.3, ... }
]
```

| メソッド | 説明 |
|----------|------|
| `pvByName` | 日ごとのPV（非累積） |
| `pvsByName` | 累積PV |
| `pvByNameLong` | Long形式のPV |
| `pvsByNameLong` | Long形式の累積PV |

#### 事前条件
| ID | 条件 |
|----|------|
| PRE-PV01 | `startDate`と`endDate`が両方存在する |

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-PV-01 | プロジェクト期間（startDate〜endDate）が設定されている必要がある | `Error: 'fromかtoが取得できませんでした'` |
| BR-PV-02 | リーフタスク（isLeaf===true）のみがPV計算の対象となる | 親タスクは計算から除外 |

#### 例外条件
| 条件 | 動作 |
|------|------|
| `startDate`または`endDate`が`undefined` | `Error: 'fromかtoが取得できませんでした'` |

---

### 5.8 `isHoliday(date: Date): boolean`

#### 目的
指定日が祝日（土日または`holidayDatas`に含まれる）かを判定する。

#### 計算ロジック
```
1. date.getDay()で曜日取得（0:日, 6:土）
2. 土日ならtrue
3. holidayDatas内に同じ日付があればtrue
4. それ以外はfalse
```

#### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | 土曜日 | `true` |
| **正常系** | 日曜日 | `true` |
| **正常系** | 平日（月〜金） | `false` |
| **正常系** | holidayDatasに登録された平日 | `true` |
| **境界値** | holidayDatas空で平日 | `false` |

---

## 6. 関連オブジェクト

### 6.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                      Project                                │
│  (集約ルート)                                               │
├─────────────────────────────────────────────────────────────┤
│                         │                                   │
│    ┌────────────────────┼────────────────────┐              │
│    ▼                    ▼                    ▼              │
│ TaskNode[]         HolidayData[]        TaskService         │
│ (値オブジェクト)    (値オブジェクト)      (ドメインサービス)   │
│    │                                         │              │
│    ▼                                         │              │
│ TaskRow                                      │              │
│ (エンティティ) ◄─────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 集約境界

| オブジェクト | 関係 | ライフサイクル |
|-------------|------|----------------|
| `TaskNode[]` | 構成要素 | Projectと同一 |
| `HolidayData[]` | 構成要素 | Projectと同一 |
| `TaskRow[]` | 導出（キャッシュ） | Projectと同一 |
| `TaskService` | 協調（現状：直接生成） | 独立（要DI化） |

---

## 7. テストシナリオ（Given-When-Then形式）

### 7.1 基本生成テスト

```gherkin
Scenario: 空のタスクノードでProjectを生成できる
  Given 空のTaskNode配列
  And   基準日 2025-06-15
  And   空のHolidayData配列
  When  Projectを生成する
  Then  baseDate が 2025-06-15 である
  And   length が 0 である
  And   toTaskRows() が空配列を返す
```

```gherkin
Scenario: 必須項目のみでProjectを生成できる
  Given リーフタスク1件を含むTaskNode配列
  And   基準日 2025-06-15
  And   空のHolidayData配列
  When  Projectを生成する
  Then  length が 1 である
  And   startDate が undefined である
  And   endDate が undefined である
  And   name が undefined である
```

### 7.2 toTaskRows()テスト

```gherkin
Scenario: 階層構造のTaskNodeがフラット化される
  Given 親タスク（id=1, name="親"）
  And   子タスク1（id=2, name="子1", parentId=1）
  And   子タスク2（id=3, name="子2", parentId=1）
  When  toTaskRows() を呼び出す
  Then  3件のTaskRowが返される
  And   id=1のTaskRowのlevelは1である
  And   id=2のTaskRowのlevelは2である
  And   id=2のTaskRowのparentIdは1である
```

```gherkin
Scenario: toTaskRows()は同一参照をキャッシュして返す
  Given 任意のTaskNode配列でProjectを生成
  When  toTaskRows() を2回呼び出す
  Then  1回目と2回目の戻り値が同一参照（===）である
```

### 7.3 getTask()テスト

```gherkin
Scenario: 存在するIDでTaskRowを取得できる
  Given id=100のタスクを含むProject
  When  getTask(100) を呼び出す
  Then  id=100のTaskRowが返される
```

```gherkin
Scenario: 存在しないIDでundefinedが返る
  Given id=100のタスクを含むProject
  When  getTask(999) を呼び出す
  Then  undefined が返される
```

### 7.4 getFullTaskName()テスト

```gherkin
Scenario: 3階層のタスクのフルパス名を取得する
  Given 階層構造:
    | id | name    | parentId |
    | 1  | プロジェクトA | -   |
    | 2  | フェーズ1    | 1   |
    | 3  | タスク001   | 2   |
  When  id=3のタスクで getFullTaskName() を呼び出す
  Then  "プロジェクトA/フェーズ1/タスク001" が返される
```

```gherkin
Scenario: undefinedを渡すと空文字列が返る
  Given 任意のProject
  When  getFullTaskName(undefined) を呼び出す
  Then  "" が返される
```

### 7.5 getTaskRows()テスト

```gherkin
Scenario: 指定期間内にPVがあるリーフタスクを取得する
  Given 以下のリーフタスク:
    | id | assignee | startDate  | endDate    |
    | 1  | 田中     | 2025-06-01 | 2025-06-10 |
    | 2  | 鈴木     | 2025-06-15 | 2025-06-20 |
  When  getTaskRows(2025-06-01, 2025-06-10) を呼び出す
  Then  id=1のタスクのみが返される
```

```gherkin
Scenario: 担当者でフィルタできる
  Given 以下のリーフタスク:
    | id | assignee | startDate  | endDate    |
    | 1  | 田中     | 2025-06-01 | 2025-06-10 |
    | 2  | 鈴木     | 2025-06-01 | 2025-06-10 |
  When  getTaskRows(2025-06-01, 2025-06-10, "田中") を呼び出す
  Then  id=1のタスクのみが返される
```

### 7.6 statisticsByProject テスト

```gherkin
Scenario: プロジェクト統計が正しく計算される
  Given 以下のリーフタスク:
    | id | workload | pv  | ev  |
    | 1  | 5.0      | 3.0 | 2.5 |
    | 2  | 3.0      | 2.0 | 2.0 |
  And   基準日 2025-06-15
  When  statisticsByProject を取得する
  Then  totalTasksCount が 2 である
  And   totalWorkloadExcel が 8.0 である
  And   totalPvExcel が 5.0 である
  And   totalEv が 4.5 である
```

```gherkin
Scenario: PVが0の場合SPIはundefined
  Given 全リーフタスクのcalculatePVs(baseDate)が0
  When  statisticsByProject を取得する
  Then  spi が undefined である
```

### 7.7 pvByName / pvsByName テスト

```gherkin
Scenario: startDate/endDateが未設定の場合エラー
  Given startDate=undefined のProject
  When  pvByName を取得しようとする
  Then  "fromかtoが取得できませんでした" エラーがスローされる
```

```gherkin
Scenario: 担当者別PVがWide形式で返される
  Given startDate=2025-06-01, endDate=2025-06-03 のProject
  And   担当者"田中"のタスクが存在
  When  pvByName を取得する
  Then  assignee="田中" のレコードが含まれる
  And   "2025/06/01", "2025/06/02", "2025/06/03" のキーが存在する
```

### 7.8 isHoliday()テスト

```gherkin
Scenario: 土曜日は祝日と判定される
  Given 任意のProject（holidayDatas空）
  When  isHoliday(2025-06-14) を呼び出す（土曜日）
  Then  true が返される
```

```gherkin
Scenario: 平日は祝日ではないと判定される
  Given 任意のProject（holidayDatas空）
  When  isHoliday(2025-06-16) を呼び出す（月曜日）
  Then  false が返される
```

```gherkin
Scenario: holidayDatasに登録された日は祝日と判定される
  Given holidayDatas に 2025-06-16 が登録されたProject
  When  isHoliday(2025-06-16) を呼び出す（月曜日）
  Then  true が返される
```

---

## 8. 設計上の課題・改善提案

| 課題 | 現状 | 改善案 |
|------|------|--------|
| TaskService直接生成 | `new TaskService()` | コンストラクタDI |
| 不変条件の検証なし | startDate/endDateの前後関係未検証 | コンストラクタでバリデーション追加 |
| pvByNameの例外 | Errorをthrow | Result型またはOption型で表現 |
| キャッシュ無効化なし | 生成後の変更想定なし | 明示的にimmutableを表明（readonly） |

---

## 9. テストケース数サマリ

| カテゴリ | テストケース数（概算） |
|----------|----------------------|
| コンストラクタ | 4件 |
| toTaskRows() | 6件 |
| getTask() | 4件 |
| getFullTaskName() | 4件 |
| getTaskRows() | 6件 |
| statisticsByProject | 4件 |
| statisticsByName | 4件 |
| pvByName系 | 4件 |
| isHoliday() | 4件 |
| **合計** | **約40件** |
