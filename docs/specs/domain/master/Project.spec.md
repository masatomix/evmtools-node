# Project 仕様書

**バージョン**: 1.8.0
**作成日**: 2025-12-16
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **クラス名** | `Project` |
| **分類** | **集約ルート（Aggregate Root）** |
| **実装インターフェース** | - |
| **パッケージ** | `src/domain/Project.ts` |
| **責務** | プロジェクト全体のタスク情報を保持し、EVM分析に必要な統計データ・PVデータを提供する |

### 1.2 ユビキタス言語（ドメイン用語）

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

### 1.3 境界づけられたコンテキスト（所属ドメイン）

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

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-PJ-01 | `baseDate`は必ず存在する（non-null） | 生成時・全操作 |
| INV-PJ-02 | `taskNodes`は必ず存在する（空配列可） | 生成時・全操作 |
| INV-PJ-03 | `holidayDatas`は必ず存在する（空配列可） | 生成時・全操作 |
| INV-PJ-04 | `startDate`が存在する場合、`endDate`も存在し、`startDate ≤ endDate` | 生成時 |
| INV-PJ-05 | `toTaskRows()`の結果は冪等（同一インスタンスで複数回呼んでも同じ結果） | キャッシュ機構 |
| INV-PJ-06 | `getTask(id)`で取得したTaskRowは`toTaskRows()`の要素と同一参照 | ID検索 |
| INV-PJ-07 | リーフタスクのみが統計計算の対象（`isLeaf === true`） | 統計計算時 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数

| プロパティ | 型 | 必須 | 制約 | デフォルト | 説明 |
|-----------|-----|:----:|------|-----------|------|
| `taskNodes` | `TaskNode[]` | ○ | - | - | タスクのツリー構造 |
| `baseDate` | `Date` | ○ | 有効な日付 | - | EVM計算の基準日 |
| `holidayDatas` | `HolidayData[]` | ○ | - | - | プロジェクト固有の祝日 |
| `startDate` | `Date` | - | `≤ endDate` | `undefined` | プロジェクト開始日 |
| `endDate` | `Date` | - | `≥ startDate` | `undefined` | プロジェクト終了日 |
| `name` | `string` | - | - | `undefined` | プロジェクト名 |

### 3.2 公開プロパティ（getter）

| プロパティ | 戻り型 | 説明 |
|-----------|--------|------|
| `baseDate` | `Date` | 基準日 |
| `taskNodes` | `TaskNode[]` | タスクツリー |
| `startDate` | `Date \| undefined` | プロジェクト開始日 |
| `endDate` | `Date \| undefined` | プロジェクト終了日 |
| `name` | `string \| undefined` | プロジェクト名 |
| `holidayDatas` | `HolidayData[]` | 祝日データ |
| `length` | `number` | タスク総数（`toTaskRows().length`） |
| `excludedTasks` | `ExcludedTask[]` | 計算から除外されたタスク一覧 |
| `plannedWorkDays` | `number` | 計画稼働日数（開始日〜終了日の稼働日数）。開始日または終了日が未設定の場合は0 |

### 3.3 内部キャッシュ

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `_cachedTaskRows` | `TaskRow[] \| undefined` | `toTaskRows()`の結果キャッシュ |
| `_cachedTaskMap` | `Map<number, TaskRow> \| undefined` | ID→TaskRowのマップキャッシュ |

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

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
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

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-TR-01 | 戻り値は`TaskRow[]`型 |
| POST-TR-02 | 同一インスタンスで再呼び出し時、同一配列参照を返す（キャッシュ） |
| POST-TR-03 | 各TaskRowの`level`は深さに応じて1から順に設定される |
| POST-TR-04 | 各TaskRowの`parentId`は親ノードのIDが設定される（ルートは`undefined`） |

#### アルゴリズム

```
1. キャッシュが存在すればそれを返す
2. TaskNodeツリーを深さ優先で走査
3. 各ノードをTaskRowに変換
   - level: 現在の深さ（1から開始）
   - parentId: 親ノードのID
4. 結果をキャッシュして返却
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-TR-001 | 正常系 | taskNodes: 1件のルートノード（リーフ） | TaskRow 1件、level=1 |
| EQ-TR-002 | 正常系 | taskNodes: 親1+子2の階層構造 | TaskRow 3件、親level=1、子level=2 |
| EQ-TR-003 | 正常系 | taskNodes: 3階層ネスト | 各levelが1,2,3と設定 |
| EQ-TR-004 | 境界値 | taskNodes: 空配列 | 空配列`[]` |
| EQ-TR-005 | 境界値 | taskNodes: 子なしルート1件 | TaskRow 1件 |
| EQ-TR-006 | 特殊 | 2回連続呼び出し | 同一参照を返す |

---

### 5.2 `getTask(id: number): TaskRow | undefined`

#### 目的
IDを指定してTaskRowを取得する。

#### シグネチャ
```typescript
getTask(id: number): TaskRow | undefined
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-GT-01 | `id`は数値型 | undefined を返す |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-GT-01 | 該当IDが存在すれば、そのTaskRowを返す |
| POST-GT-02 | 該当IDが存在しなければ`undefined`を返す |
| POST-GT-03 | 内部マップが未生成なら、初回呼び出し時に生成・キャッシュ |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-GT-001 | 正常系 | 存在するID | 該当TaskRow |
| EQ-GT-002 | 異常系 | 存在しないID | `undefined` |
| EQ-GT-003 | 境界値 | id=0（存在する場合） | 該当TaskRow |
| EQ-GT-004 | 境界値 | id=-1（負数） | `undefined`（通常存在しない） |
| EQ-GT-005 | 境界値 | 空のtaskNodesでid指定 | `undefined` |

---

### 5.3 `getFullTaskName(task?: TaskRow): string`

#### 目的
タスクの親を遡り、"/"区切りのフルパス名を生成する。

#### シグネチャ
```typescript
getFullTaskName(task?: TaskRow): string
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-FN-01 | タスクの祖先を辿り、"/"区切りで連結した文字列を返す |
| POST-FN-02 | task=undefinedの場合、空文字列を返す |

#### アルゴリズム

```
1. 現在のタスクから開始
2. parentIdが存在する限り、getTask(parentId)で親を取得
3. 各タスクのnameを配列の先頭に追加
4. "/"でjoinして返す
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-FN-001 | 正常系 | ルートタスク（parentId=undefined） | `"タスク名"` |
| EQ-FN-002 | 正常系 | 2階層目のタスク | `"親名/子名"` |
| EQ-FN-003 | 正常系 | 3階層目のタスク | `"祖父名/親名/子名"` |
| EQ-FN-004 | 境界値 | `task=undefined` | `""`（空文字列） |
| EQ-FN-005 | 異常系 | parentIdが存在するがgetTask()で見つからない | 途中で終了（見つかった分まで） |

---

### 5.4 `getTaskRows(fromDate: Date, toDate?: Date, assignee?: string): TaskRow[]`

#### 目的
指定期間・担当者でフィルタしたリーフタスクを取得する。

#### シグネチャ
```typescript
getTaskRows(fromDate: Date, toDate?: Date, assignee?: string): TaskRow[]
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-GTR-01 | `fromDate`は有効なDate | 不正な結果 |
| PRE-GTR-02 | `toDate`指定時は`fromDate ≤ toDate` | 空配列 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-GTR-01 | 戻り値は`TaskRow[]`型 |
| POST-GTR-02 | 全要素は`isLeaf === true` |

#### アルゴリズム

```
1. generateBaseDates(fromDate, toDate ?? fromDate) で日付配列生成
2. toTaskRows()でフラット化し、isLeaf===trueのみ抽出
3. 各タスクについて：
   - baseDatesのいずれかでcalculatePV(baseDate) !== 0 ならhasPV=true
   - assignee未指定 または taskRow.assignee===assignee ならassigneeMatch=true
4. hasPV && assigneeMatch のタスクを返す
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-GTR-001 | 正常系 | 期間内にPVがあるタスク | 該当タスク配列 |
| EQ-GTR-002 | 正常系 | fromDate=toDate（1日指定） | その日にPVがあるタスク |
| EQ-GTR-003 | 正常系 | assignee指定 | 担当者一致かつPVありのタスク |
| EQ-GTR-004 | 境界値 | 期間外のみのタスク | 空配列 |
| EQ-GTR-005 | 境界値 | 全タスクがisLeaf=false | 空配列 |
| EQ-GTR-006 | 境界値 | assigneeが存在しない担当者 | 空配列 |
| EQ-GTR-007 | 境界値 | toDate省略 | fromDateのみで判定 |

---

### 5.5 `filterTasks(options?: TaskFilterOptions): TaskRow[]`

#### 目的
フィルタ条件に基づいてタスクを抽出する。

#### シグネチャ
```typescript
filterTasks(options?: TaskFilterOptions): TaskRow[]
```

#### 型定義
```typescript
interface TaskFilterOptions {
  /** fullTaskName による部分一致フィルタ */
  filter?: string
}
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-FT-01 | 戻り値は`TaskRow[]`型 |
| POST-FT-02 | 親タスクも含む全タスクを返す（リーフのみではない） |
| POST-FT-03 | options未指定または空文字の場合、全タスクを返す |

#### アルゴリズム

```
1. options が undefined または filter が空文字の場合
   → 全タスク（親含む）を返す

2. filter が指定されている場合
   a. toTaskRows() で全タスクを取得（キャッシュ利用）
   b. getFullTaskName(task) で部分一致チェック
   c. 一致したタスクのみ返す（親タスク含む）
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-FT-01 | フィルタは大文字小文字を区別する | 完全一致のみ抽出 |
| BR-FT-02 | 統計計算時は`_resolveTasks()`内でリーフのみを抽出 | 二重カウント防止 |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-FT-001 | 正常系 | filterTasks() | 全タスク（親含む） |
| EQ-FT-002 | 正常系 | filterTasks({}) | 全タスク |
| EQ-FT-003 | 正常系 | filterTasks({ filter: "" }) | 全タスク |
| EQ-FT-004 | 正常系 | filterTasks({ filter: "認証" }) | "認証"を含むタスク |
| EQ-FT-005 | 境界値 | filterTasks({ filter: "存在しない" }) | 空配列 |
| EQ-FT-006 | 境界値 | 大文字小文字の区別 | 完全一致のみ |

---

### 5.6 `getStatistics(): ProjectStatistics`

#### 目的
プロジェクト統計情報を取得する。オーバーロードで引数なし、フィルタオプション、TaskRow配列を受け付ける。

#### シグネチャ
```typescript
getStatistics(): ProjectStatistics
getStatistics(options: StatisticsOptions): ProjectStatistics
getStatistics(tasks: TaskRow[]): ProjectStatistics
```

#### 型定義
```typescript
interface StatisticsOptions extends TaskFilterOptions {
  // 将来の拡張用
}

// Statistics型（拡張プロパティ含む）
type Statistics = {
  totalTasksCount?: number
  totalWorkloadExcel?: number
  totalWorkloadCalculated?: number
  averageWorkload?: number
  baseDate: string
  totalPvExcel?: number
  totalPvCalculated?: number
  totalEv?: number
  spi?: number
  // 拡張プロパティ
  etcPrime?: number
  completionForecast?: Date
  delayedTaskCount: number
  averageDelayDays: number
  maxDelayDays: number
}

type ProjectStatistics = {
  projectName?: string
  startDate: string
  endDate: string
} & Statistics
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-GS-01 | 戻り値は`ProjectStatistics`型 |
| POST-GS-02 | 統計計算はリーフタスクのみを対象とする |
| POST-GS-03 | 拡張プロパティ（etcPrime, completionForecast, 遅延情報）が含まれる |

#### アルゴリズム

```
1. 引数の型を判定
   - undefined → 全リーフタスク対象
   - TaskRow[] → 渡されたタスク対象（リーフのみ抽出）
   - StatisticsOptions → filterTasks() でフィルタ

2. _calculateStatistics(tasks) を呼び出して統計を計算
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-GS-001 | 正常系 | getStatistics() | プロジェクト全体の統計 |
| EQ-GS-002 | 正常系 | getStatistics({ filter: "認証" }) | フィルタ結果の統計 |
| EQ-GS-003 | 正常系 | getStatistics(tasks) | 渡されたタスクの統計 |
| EQ-GS-004 | 境界値 | getStatistics([]) | totalTasksCount=0 |
| EQ-GS-005 | 境界値 | 全タスクのPV=0 | spi=undefined, etcPrime=undefined |

---

### 5.7 `getStatisticsByName(): AssigneeStatistics[]`

#### 目的
担当者別統計情報を取得する。オーバーロードで引数なし、フィルタオプション、TaskRow配列を受け付ける。

#### シグネチャ
```typescript
getStatisticsByName(): AssigneeStatistics[]
getStatisticsByName(options: StatisticsOptions): AssigneeStatistics[]
getStatisticsByName(tasks: TaskRow[]): AssigneeStatistics[]
```

#### 型定義
```typescript
type AssigneeStatistics = {
  assignee?: string
} & Statistics
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-GSN-01 | 戻り値は`AssigneeStatistics[]`型 |
| POST-GSN-02 | 担当者未設定のタスクは`assignee=undefined`のエントリに含まれる |
| POST-GSN-03 | 各担当者の拡張統計（etcPrime, 遅延情報）が含まれる |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-GSN-001 | 正常系 | getStatisticsByName() | 全担当者の統計 |
| EQ-GSN-002 | 正常系 | getStatisticsByName({ filter: "認証" }) | フィルタ結果の担当者別統計 |
| EQ-GSN-003 | 正常系 | getStatisticsByName(tasks) | 渡されたタスクの担当者別統計 |
| EQ-GSN-004 | 境界値 | assignee=undefined のタスクあり | assignee=undefinedのエントリ |

---

### 5.8 `get statisticsByProject: ProjectStatistics[]`

#### 目的
プロジェクト全体のEVM統計情報を返す。（後方互換性のためのgetter、内部でgetStatistics()を呼び出す）

#### シグネチャ
```typescript
get statisticsByProject(): ProjectStatistics[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-SP-01 | 戻り値は`ProjectStatistics[]`型（要素数1） |
| POST-SP-02 | getStatistics()と同じ結果を返す |

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-SP-01 | リーフタスク（isLeaf===true）のみが統計計算の対象となる | 親タスクは集計から除外 |
| BR-SP-02 | PVが0の場合、SPIは算出不可（0除算回避） | spi=undefined |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-SP-001 | 正常系 | リーフタスク複数 | 集計されたProjectStatistics |
| EQ-SP-002 | 正常系 | spi計算可能（PV>0） | 数値spi |
| EQ-SP-003 | 境界値 | リーフタスク0件 | totalTasksCount=0 |
| EQ-SP-004 | 境界値 | 全タスクのPV=0 | spi=undefined（0除算回避） |
| EQ-SP-005 | 境界値 | startDate/endDate未設定 | 空文字列 |

---

### 5.9 `get statisticsByName: AssigneeStatistics[]`

#### 目的
担当者別のEVM統計情報を返す。（後方互換性のためのgetter、内部でgetStatisticsByName()を呼び出す）

#### シグネチャ
```typescript
get statisticsByName(): AssigneeStatistics[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-SN-01 | 戻り値は`AssigneeStatistics[]`型 |
| POST-SN-02 | getStatisticsByName()と同じ結果を返す |

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-SN-01 | リーフタスク（isLeaf===true）のみが統計計算の対象となる | 親タスクは集計から除外 |
| BR-SN-02 | 担当者未設定（assignee=undefined）のタスクも1グループとして集計される | N/A |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-SN-001 | 正常系 | 担当者A: 2件, B: 3件 | 2件のAssigneeStatistics |
| EQ-SN-002 | 境界値 | assignee=undefined のタスクあり | assignee=undefinedのエントリ |
| EQ-SN-003 | 境界値 | 全タスク同一担当者 | 1件のAssigneeStatistics |
| EQ-SN-004 | 境界値 | リーフタスク0件 | 空配列 |

---

### 5.10 `get pvByName: Record<string, unknown>[]` / `get pvsByName`

#### 目的
担当者別のPVデータをWide形式（横持ち）で返す。

#### シグネチャ
```typescript
get pvByName(): Record<string, unknown>[]
get pvsByName(): Record<string, unknown>[]
get pvByNameLong(): PvDataLong[]
get pvsByNameLong(): PvDataLong[]
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-PV-01 | `startDate`と`endDate`が両方存在する | Error |

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-PV-01 | プロジェクト期間（startDate〜endDate）が設定されている必要がある | `Error: 'fromかtoが取得できませんでした'` |
| BR-PV-02 | リーフタスク（isLeaf===true）のみがPV計算の対象となる | 親タスクは計算から除外 |

#### 例外処理

| 条件 | エラー内容 |
|------|-----------|
| `startDate`または`endDate`が`undefined` | `Error: 'fromかtoが取得できませんでした'` |

---

### 5.11 `isHoliday(date: Date): boolean`

#### 目的
指定日が祝日（土日または`holidayDatas`に含まれる）かを判定する。

#### シグネチャ
```typescript
isHoliday(date: Date): boolean
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-IH-01 | 土日または祝日データに含まれる日付ならtrue |
| POST-IH-02 | それ以外はfalse |

#### アルゴリズム

```
1. date.getDay()で曜日取得（0:日, 6:土）
2. 土日ならtrue
3. holidayDatas内に同じ日付があればtrue
4. それ以外はfalse
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-IH-001 | 正常系 | 土曜日 | `true` |
| EQ-IH-002 | 正常系 | 日曜日 | `true` |
| EQ-IH-003 | 正常系 | 平日（月〜金） | `false` |
| EQ-IH-004 | 正常系 | holidayDatasに登録された平日 | `true` |
| EQ-IH-005 | 境界値 | holidayDatas空で平日 | `false` |

---

### 5.12 `get excludedTasks: ExcludedTask[]`

#### 目的
PV/EV計算から除外されたタスク（無効なタスク）の一覧を取得する。

#### シグネチャ
```typescript
get excludedTasks(): ExcludedTask[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-ET-01 | 戻り値は`ExcludedTask[]`型 |
| POST-ET-02 | 含まれるタスクは全て`isLeaf===true`かつ`validStatus.isValid===false` |
| POST-ET-03 | `reason`は`validStatus.invalidReason`の値（nullの場合は'理由不明'） |

#### アルゴリズム

```
1. toTaskRows()でフラット化
2. isLeaf===trueのみフィルタ（リーフタスクのみ対象）
3. validStatus.isValid===falseのタスクを収集
4. ExcludedTask[]として返却（task + reason）
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-ET-01 | リーフタスク（isLeaf===true）のみが対象となる | 親タスクは除外されない |
| BR-ET-02 | validStatus.isValidがtrueのタスクは含まれない | 有効タスクは除外リストに含まれない |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-ET-001 | 正常系 | 全タスクが有効（isValid=true） | 空配列`[]` |
| EQ-ET-002 | 正常系 | 日付未設定のリーフタスクあり | 該当タスクがExcludedTask[]に含まれる |
| EQ-ET-003 | 正常系 | 稼働日数0のリーフタスクあり | 該当タスクがExcludedTask[]に含まれる |
| EQ-ET-004 | 正常系 | 複数の無効タスクあり | 全無効タスクがExcludedTask[]に含まれる |
| EQ-ET-005 | 境界値 | taskNodes空配列 | 空配列`[]` |
| EQ-ET-006 | 境界値 | 親タスクのみ無効（isLeaf=false） | 空配列（親は対象外） |

---

### 5.13 `getDelayedTasks(minDays?: number): TaskRow[]`

#### 目的
遅延しているタスク（未完了かつ予定終了日を過ぎたリーフタスク）の一覧を取得する。

#### シグネチャ
```typescript
getDelayedTasks(minDays?: number): TaskRow[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-DT-01 | 戻り値は`TaskRow[]`型 |
| POST-DT-02 | 全要素は`isLeaf===true`かつ`finished===false` |
| POST-DT-03 | 全要素は`endDate`が定義されている |
| POST-DT-04 | 全要素の遅延日数（`baseDate - endDate`）が`minDays`より大きい |
| POST-DT-05 | 遅延日数の降順でソートされている |

#### アルゴリズム

```
1. baseDateを取得
2. 遅延日数を計算するヘルパー関数を定義
   - delayDays = -(formatRelativeDaysNumber(baseDate, endDate) ?? 0)
   - ※ formatRelativeDaysNumberは endDate - baseDate を返すため符号反転
3. toTaskRows()でフラット化
4. isLeaf===trueのみフィルタ（リーフタスクのみ対象）
5. finished===falseのみフィルタ（未完了のみ対象）
6. endDate!==undefinedのみフィルタ（終了日設定済みのみ対象）
7. delayDays > minDaysのみフィルタ（閾値より大きい遅延のみ）
8. 遅延日数の降順でソート
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-DT-01 | リーフタスク（isLeaf===true）のみが対象となる | 親タスクは除外 |
| BR-DT-02 | 完了タスク（finished===true）は対象外 | 完了済みは除外 |
| BR-DT-03 | 遅延日数は工期ベース（カレンダー日数）で計算 | 土日・祝日は考慮しない |
| BR-DT-04 | 遅延日数はbaseDate - endDateで動的計算 | TaskRow.delayDays（Excel値）は使用しない |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-DT-001 | 正常系 | 遅延タスクなし | 空配列`[]` |
| EQ-DT-002 | 正常系 | 遅延タスク（endDate < baseDate）あり | 該当タスクが含まれる |
| EQ-DT-003 | 正常系 | 複数の遅延タスク | 遅延日数の降順でソート |
| EQ-DT-004 | 正常系 | minDays指定 | 閾値より大きい遅延のみ |
| EQ-DT-005 | 正常系 | 完了タスク（finished=true） | 含まれない |
| EQ-DT-006 | 正常系 | 親タスク（isLeaf=false） | 含まれない |
| EQ-DT-007 | 境界値 | endDate=undefined | 含まれない |
| EQ-DT-008 | 境界値 | delayDays=0（minDays=0） | 含まれない（>であり>=ではない） |
| EQ-DT-009 | 境界値 | delayDays=負（前倒し） | 含まれない |
| EQ-DT-010 | 境界値 | minDays=5, delayDays=5 | 含まれない（>であり>=ではない） |
| EQ-DT-011 | 境界値 | minDays=5, delayDays=6 | 含まれる |
| EQ-DT-012 | 境界値 | taskNodes空配列 | 空配列`[]` |

---

### 5.14 `calculateRecentDailyPv(lookbackDays?: number): number`

#### 目的
直近N日間の平均PV（日あたり消化量）を計算する。完了予測の日あたり消化量として使用。

#### シグネチャ
```typescript
calculateRecentDailyPv(lookbackDays?: number): number
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-RDP-01 | 戻り値は`number`型 |
| POST-RDP-02 | 計算不能な場合は0を返す |

#### アルゴリズム

```
1. baseDateから過去に遡って稼働日のPVを取得
2. lookbackDays分の稼働日のPVを収集（最大lookbackDays×3日まで遡る）
3. 収集したPVの平均値を算出
4. PVが0件の場合は0を返す
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-RDP-001 | 正常系 | lookbackDays=7（デフォルト） | 直近7稼働日の平均PV |
| EQ-RDP-002 | 正常系 | lookbackDays=14 | 直近14稼働日の平均PV |
| EQ-RDP-003 | 境界値 | PVが0件 | 0 |
| EQ-RDP-004 | 境界値 | 全期間が休日 | 0 |

---

### 5.15 `calculateCompletionForecast(): CompletionForecast | undefined`

#### 目的
現在のSPIが続いた場合の完了予測日を計算する。オーバーロードでフィルタオプション、TaskRow配列を受け付ける。

#### シグネチャ
```typescript
// 引数なし: プロジェクト全体
calculateCompletionForecast(): CompletionForecast | undefined

// オプション指定: フィルタ + 予測オプション
calculateCompletionForecast(
  options: CompletionForecastOptions & StatisticsOptions
): CompletionForecast | undefined

// タスク配列渡し: 任意のタスク配列に対して計算
calculateCompletionForecast(
  tasks: TaskRow[],
  options?: CompletionForecastOptions
): CompletionForecast | undefined
```

#### 型定義

```typescript
/**
 * 基本統計（循環参照回避用）
 * _calculateBasicStats() の戻り値
 */
interface BasicStats {
  /** 総EV（出来高） */
  totalEv: number | undefined
  /** SPI（スケジュール効率） */
  spi: number | undefined
  /** BAC（総工数） */
  bac: number | undefined
}

interface CompletionForecastOptions {
  /** 手入力の日あたりPV（優先使用） */
  dailyPvOverride?: number
  /** 直近PV平均の計算日数（デフォルト: 7） */
  lookbackDays?: number
  /** 計算を打ち切る最大日数（デフォルト: 730 = 2年） */
  maxForecastDays?: number
  /**
   * 外部から指定するSPI（優先使用）
   * ProjectService.calculateRecentSpi() で計算した直近N日SPIを指定可能
   * REQ-SPI-002
   */
  spiOverride?: number
}

interface CompletionForecast {
  /** ETC': 残作業完了に必要な計画工数換算（人日） */
  etcPrime: number
  /** 完了予測日 */
  forecastDate: Date
  /** 残作業量（BAC - EV） */
  remainingWork: number
  /** 使用した日あたりPV */
  usedDailyPv: number
  /** 使用したSPI */
  usedSpi: number
  /** 日あたり消化量（usedDailyPv × usedSpi） */
  dailyBurnRate: number
  /** 予測の信頼性 */
  confidence: 'high' | 'medium' | 'low'
  /** 信頼性の理由 */
  confidenceReason: string
}
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-CF-01 | 戻り値は`CompletionForecast \| undefined`型 |
| POST-CF-02 | SPI=0またはSPI未定義の場合は`undefined` |
| POST-CF-03 | dailyPv=0の場合は`undefined` |
| POST-CF-04 | maxForecastDays超過の場合は`undefined` |

#### アルゴリズム

```
1. 引数の型を判定:
   - undefined → 全リーフタスク対象
   - TaskRow[] → 渡されたタスク対象（リーフのみ抽出）
   - StatisticsOptions含む → filterTasks() でフィルタ

2. リーフタスクを取得
   tasks = _resolveTasks(optionsOrTasks)

3. 基本統計を計算（循環参照を避けるため _calculateBasicStats() を使用）
   { spi, totalEv, bac } = _calculateBasicStats(tasks)

4. SPI=0またはundefinedならundefinedを返す
5. 残作業量 = BAC - EV
6. 残作業量 <= 0 の場合、完了済みとして結果を返す
7. dailyPv = dailyPvOverride ?? calculateRecentDailyPv(lookbackDays)
8. dailyPv = 0 ならundefinedを返す
9. dailyBurnRate = dailyPv × SPI
10. baseDateから稼働日ごとにdailyBurnRateを消化
11. 残作業量 <= 0 になった日 = 完了予測日
12. maxForecastDays超過で収束しなければundefined
13. 信頼性を判定（determineConfidence）
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-CF-01 | 日あたりPVは手入力が優先される | dailyPvOverrideがあればそれを使用 |
| BR-CF-02 | 計画終了日以降も直近N日平均を固定で使用 | 一貫した予測のため |
| BR-CF-03 | 信頼性はSPIに基づいて判定 | high: 0.8-1.2, medium: 0.5-0.8 or >1.2, low: <0.5 |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-CF-001 | 正常系 | 残作業あり、SPI=1.0 | 完了予測日算出 |
| EQ-CF-002 | 正常系 | dailyPvOverride指定 | 指定値を使用 |
| EQ-CF-003 | 正常系 | 完了済み（BAC=EV） | etcPrime=0, forecastDate=baseDate |
| EQ-CF-004 | 境界値 | SPI=0 | undefined |
| EQ-CF-005 | 境界値 | SPI=undefined | undefined |
| EQ-CF-006 | 境界値 | dailyPv=0 | undefined |
| EQ-CF-007 | 境界値 | maxForecastDays超過 | undefined |
| EQ-CF-008 | 正常系 | SPI=0.8（高信頼性） | confidence='high' |
| EQ-CF-009 | 正常系 | SPI=0.6（中信頼性） | confidence='medium' |
| EQ-CF-010 | 正常系 | SPI=0.3（低信頼性） | confidence='low' |
| EQ-CF-011 | 正常系 | calculateCompletionForecast() 引数なし | プロジェクト全体の予測 |
| EQ-CF-012 | 正常系 | calculateCompletionForecast({ filter: "認証" }) | フィルタ結果の予測 |
| EQ-CF-013 | 正常系 | calculateCompletionForecast({ filter: "認証", dailyPvOverride: 2.0 }) | フィルタ + 指定PVで予測 |
| EQ-CF-014 | 正常系 | calculateCompletionForecast(tasks, {}) | 渡されたタスクの予測 |
| EQ-CF-015 | 正常系 | calculateCompletionForecast(tasks, { lookbackDays: 14 }) | 渡されたタスク + オプションで予測 |
| EQ-CF-016 | 境界値 | calculateCompletionForecast({ filter: "存在しない" }) | undefined（フィルタ結果が空） |
| EQ-CF-017 | 正常系 | spiOverride指定 | usedSpi=指定値、confidence='high' |
| EQ-CF-018 | 正常系 | spiOverride + dailyPvOverride併用 | 両方が使用される |
| EQ-CF-019 | 正常系 | spiOverride + filter併用 | フィルタ結果に対してspiOverride使用 |
| EQ-CF-020 | 境界値 | spiOverride: 0 | undefined（0除算回避） |
| EQ-CF-021 | 境界値 | spiOverride: 負の値 | undefined（無効な値） |

---

### 5.16 `getTree(): TreeNode[]`

#### 目的
プロジェクトのタスクツリーを TreeNode 形式で取得する。CLI や他のツールからツリー構造を利用する際に使用する。

#### シグネチャ
```typescript
getTree(): TreeNode[]
```

#### 型定義
```typescript
// TreeNode は common/TreeFormatter.ts で定義
interface TreeNode {
  name: string
  children: TreeNode[]
}
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-GT-01 | 戻り値は`TreeNode[]`型 |
| POST-GT-02 | 各要素は `name` と `children` プロパティのみを持つ |
| POST-GT-03 | TaskNode の他のプロパティ（id, workload 等）は含まれない |
| POST-GT-04 | 子ノードは再帰的に TreeNode 形式に変換される |

#### アルゴリズム

```
1. _taskNodes.map(node => toTreeNode(node)) を呼び出す
2. toTreeNode(node) は再帰的に以下を行う:
   - { name: node.name, children: node.children.map(child => toTreeNode(child)) }
3. TreeNode[] を返す
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-GTR-001 | 正常系 | 単一ルート・子あり | TreeNode[] 1件、children に子ノード |
| EQ-GTR-002 | 正常系 | 複数ルート | TreeNode[] 複数件 |
| EQ-GTR-003 | 正常系 | 3階層ネスト | 孫ノードも TreeNode 形式 |
| EQ-GTR-004 | 境界値 | taskNodes: 空配列 | 空配列 `[]` |
| EQ-GTR-005 | 境界値 | 子なしルート1件 | children: [] |

#### 使用例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TreeFormatter } from 'evmtools-node/common'

const creator = new ExcelProjectCreator('./now.xlsm')
const project = await creator.createProject()

// TreeNode[] を取得
const tree = project.getTree()

// テキスト形式で出力
console.log(TreeFormatter.toText(tree))

// JSON形式で出力
console.log(JSON.stringify(TreeFormatter.toJson(tree), null, 2))
```

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 基本生成テスト

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

### 6.2 toTaskRows()テスト

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

### 6.3 getTask()テスト

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

### 6.4 getFullTaskName()テスト

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

### 6.5 excludedTasks テスト

```gherkin
Scenario: 全タスクが有効な場合、除外タスクは空
  Given 全リーフタスクのvalidStatus.isValidがtrue
  When  excludedTasks を取得する
  Then  空配列が返される
```

```gherkin
Scenario: 日付未設定のタスクが除外リストに含まれる
  Given 開始日が未設定のリーフタスク（id=1）
  When  excludedTasks を取得する
  Then  id=1のタスクがExcludedTask[]に含まれる
  And   reasonに「日付エラー」が含まれる
```

```gherkin
Scenario: 親タスクは除外対象外
  Given 無効な親タスク（isLeaf=false, id=1）
  And   有効な子タスク（isLeaf=true, id=2）
  When  excludedTasks を取得する
  Then  空配列が返される（親タスクは対象外）
```

### 6.6 getDelayedTasks() テスト

```gherkin
Scenario: 遅延タスクがない場合は空配列を返す
  Given 全リーフタスクのendDateがbaseDate以降
  When  getDelayedTasks() を呼び出す
  Then  空配列が返される
```

```gherkin
Scenario: 遅延タスクが遅延日数の降順でソートされる
  Given 3日遅延のタスク（id=1）
  And   5日遅延のタスク（id=2）
  And   1日遅延のタスク（id=3）
  When  getDelayedTasks() を呼び出す
  Then  id=2, id=1, id=3 の順で返される
```

```gherkin
Scenario: minDaysを指定すると閾値より大きい遅延のみ抽出
  Given 3日遅延のタスク
  And   5日遅延のタスク
  When  getDelayedTasks(3) を呼び出す
  Then  5日遅延のタスクのみ返される
```

```gherkin
Scenario: 完了タスクは除外される
  Given 遅延しているが完了済み（progressRate=1.0）のタスク
  When  getDelayedTasks() を呼び出す
  Then  空配列が返される
```

```gherkin
Scenario: getFullTaskName()と組み合わせて使用可能
  Given 親タスク "親" の下に遅延タスク "子" がある
  When  getDelayedTasks() で取得したタスクに getFullTaskName() を適用
  Then  "親/子" が返される
```

### 6.7 calculateCompletionForecast() テスト

```gherkin
Scenario: 基本的な完了予測
  Given 残作業20人日、dailyPvOverride=2、SPI=1.0
  When  calculateCompletionForecast() を呼び出す
  Then  10稼働日後が完了予測日として返される
```

```gherkin
Scenario: 完了済みプロジェクト
  Given BAC = EV のプロジェクト
  When  calculateCompletionForecast() を呼び出す
  Then  etcPrime=0、forecastDate=baseDate が返される
```

```gherkin
Scenario: 手入力PV優先
  Given dailyPvOverride=5を指定
  When  calculateCompletionForecast() を呼び出す
  Then  usedDailyPv=5 が使用される
  And   confidence='high' が返される
```

```gherkin
Scenario: SPI=0で予測不可
  Given SPIが0のプロジェクト
  When  calculateCompletionForecast() を呼び出す
  Then  undefined が返される
```

---

## 7. 外部依存

| 名前 | 種別 | 説明 |
|------|------|------|
| `TaskNode` | 内部モジュール | タスクのツリー構造 |
| `TaskRow` | 内部モジュール | フラット化されたタスク |
| `TaskService` | 内部モジュール | ツリー→フラット変換 |
| `HolidayData` | 内部モジュール | 祝日情報 |

---

## 8. 関連オブジェクト

### 8.1 依存関係図

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

### 8.2 関係一覧

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `TaskNode` | aggregates | タスクツリー構造を保持 |
| `TaskRow` | creates | toTaskRows()でTaskRowを導出 |
| `HolidayData` | aggregates | 祝日データを保持 |
| `TaskService` | uses | ツリー→フラット変換に使用 |

---

## 9. テストケース数サマリ

| カテゴリ | 計画 | 実装 |
|----------|------|------|
| コンストラクタ | 4件 | 4件 |
| toTaskRows() | 6件 | 6件 |
| getTask() | 5件 | 5件 |
| getFullTaskName() | 5件 | 5件 |
| getTaskRows() | 7件 | 7件 |
| statisticsByProject | 5件 | 5件 |
| statisticsByName | 4件 | 4件 |
| pvByName系 | 4件 | 4件 |
| isHoliday() | 5件 | 5件 |
| excludedTasks | 6件 | 6件 |
| getDelayedTasks() | 17件 | 17件 |
| plannedWorkDays | 3件 | 3件 |
| calculateRecentDailyPv() | 4件 | 4件 |
| calculateCompletionForecast() | 17件 | 17件 |
| getTree() | 5件 | 5件 |
| **合計** | **97件** | **97件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-TASK-001 AC-01 | excludedTasksで一覧取得 | EQ-ET-002〜EQ-ET-004 | ✅ PASS |
| REQ-TASK-001 AC-02 | reasonが正しく設定 | EQ-ET-002, EQ-ET-003 | ✅ PASS |
| REQ-TASK-001 AC-03 | 有効タスクのみ→空配列 | EQ-ET-001, EQ-ET-005 | ✅ PASS |
| REQ-DELAY-001 AC-01 | getDelayedTasks()が実装されている | TC-01〜TC-04 | ✅ PASS |
| REQ-DELAY-001 AC-02 | delayDays（動的計算）> minDays かつ未完了のみ抽出 | TC-04, TC-05, TC-08, TC-15〜TC-17 | ✅ PASS |
| REQ-DELAY-001 AC-03 | 遅延日数の降順でソート | TC-03 | ✅ PASS |
| REQ-DELAY-001 AC-04 | リーフタスクのみが対象 | TC-06 | ✅ PASS |
| REQ-DELAY-001 AC-05 | 単体テストがPASS | 全TC（17件） | ✅ PASS |
| REQ-EVM-001 AC-01 | ETC'が正しく計算される | TC-05, TC-08, TC-09 | ✅ PASS |
| REQ-EVM-001 AC-02 | 完了予測日が正しく算出される | TC-10, TC-11, TC-12 | ✅ PASS |
| REQ-EVM-001 AC-03 | 日あたりPVの優先度 | TC-17, TC-18, TC-20 | ✅ PASS |
| REQ-EVM-001 AC-04 | 計画終了日以降も直近N日平均を固定使用 | TC-19 | ✅ PASS |
| REQ-EVM-001 AC-05 | SPI=0時はundefined | TC-06, TC-07, TC-25 | ✅ PASS |
| REQ-EVM-001 AC-06 | 既存テストへの影響なし | 既存テスト全件 | ✅ PASS (143件) |
| REQ-EVM-001 AC-07 | 完了済み時の動作 | TC-08, TC-12 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-01 | fullTaskNameに "認証機能" を含むタスクのみが抽出される | TC-04, TC-05, TC-08 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-02 | フィルタ結果に対してPV合計、EV合計、SPIが正しく算出される | TC-13, TC-17 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-03 | フィルタ結果に対してETC'と完了予測日が算出される | TC-15 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-04 | フィルタ結果のタスク数が正しくカウントされる（統計計算はリーフのみ） | TC-14 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-05 | 担当者別にタスク数、PV、EV、ETC'、遅延情報が集計される | TC-20, TC-23, TC-24 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-05-1 | getStatisticsByName({ filter })でフィルタ結果の担当者別統計取得 | TC-21 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-05-2 | getStatisticsByName(filteredTasks)で担当者別統計取得 | TC-22, TC-31 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-06 | 遅延タスク数と遅延日数の統計が取得できる | TC-16, TC-18, TC-24 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-07 | getStatistics({ filter })でフィルタ結果の統計情報取得 | TC-11 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-08 | getStatistics()を引数なしで呼び出すとプロジェクト全体の統計を返す | TC-10, TC-32 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-09 | filterTasks({ filter })でフィルタ結果のTaskRow[]（親含む）取得 | TC-04, TC-08 | ✅ PASS |
| REQ-FILTER-STATS-001 AC-10 | getStatistics(filteredTasks)で渡されたTaskRow[]に対する統計取得 | TC-12, TC-30 | ✅ PASS |
| REQ-REFACTOR-001 AC-01 | `bac` プロパティが削除されていること | TC-01 | ✅ PASS |
| REQ-REFACTOR-001 AC-02 | `totalEv` プロパティが削除されていること | TC-02 | ✅ PASS |
| REQ-REFACTOR-001 AC-03 | `etcPrime` プロパティが削除されていること | TC-03 | ✅ PASS |
| REQ-REFACTOR-001 AC-04 | `statisticsByProject` が正常に動作すること | TC-04〜TC-06 | ✅ PASS |
| REQ-REFACTOR-001 AC-05 | 既存テストが全てPASSすること | TC-08 | ✅ PASS (203件) |
| REQ-REFACTOR-001 AC-06 | 仕様書が更新されていること | ドキュメント確認 | ✅ PASS |
| REQ-REFACTOR-002 AC-01 | `_calculateBasicStats()` が spi, totalEv, bac を正しく計算すること | TC-01〜TC-03 | ✅ PASS |
| REQ-REFACTOR-002 AC-02 | `calculateCompletionForecast()` がフィルタ対応していること | TC-05, TC-06 | ✅ PASS |
| REQ-REFACTOR-002 AC-03 | `calculateCompletionForecast(tasks, options)` が動作すること | TC-07, TC-08 | ✅ PASS |
| REQ-REFACTOR-002 AC-04 | `getStatistics()` の `completionForecast` が従来と同じ結果を返すこと | TC-09, TC-12 | ✅ PASS |
| REQ-REFACTOR-002 AC-05 | `getStatistics()` の `etcPrime` が従来と同じ結果を返すこと | TC-10, TC-12 | ✅ PASS |
| REQ-REFACTOR-002 AC-06 | `_calculateCompletionForecastForTasks()` が削除されていること | TC-13 | ✅ PASS |
| REQ-REFACTOR-002 AC-07 | 高性能版呼び出し時に簡易版の計算が走らないこと | TC-14 | ✅ PASS |
| REQ-REFACTOR-002 AC-08 | 既存テストが全てPASSすること | TC-20 | ✅ PASS (221件) |
| REQ-TREE-001 AC-07 | `Project.getTree()` メソッドが実装されている | TC-10, TC-11 | ✅ PASS |

> **ステータス凡例**:
> - ⏳: 未実装
> - ✅ PASS: テスト合格
> - ❌ FAIL: テスト失敗

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/domain/__tests__/Project.test.ts` | 単体テスト | 51件 |
| `src/domain/__tests__/Project.delayedTasks.test.ts` | getDelayedTasks()テスト | 17件 |
| `src/domain/__tests__/Project.completionForecast.test.ts` | 完了予測機能テスト（REQ-REFACTOR-002 含む） | 45件 |
| `src/domain/__tests__/Project.filterStatistics.test.ts` | タスクフィルタリング・統計テスト | 30件 |
| `src/domain/__tests__/Project.getTree.test.ts` | getTree()テスト | 5件 |

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2026-01-30
Test Suites: 17 passed, 17 total
Tests:       262 passed, 262 total (2 skipped)
```

---

## 12. 設計上の課題・改善提案

| 課題 | 現状 | 改善案 |
|------|------|--------|
| TaskService直接生成 | `new TaskService()` | コンストラクタDI |
| 不変条件の検証なし | startDate/endDateの前後関係未検証 | コンストラクタでバリデーション追加 |
| pvByNameの例外 | Errorをthrow | Result型またはOption型で表現 |
| キャッシュ無効化なし | 生成後の変更想定なし | 明示的にimmutableを表明（readonly） |

### 12.1 設計方針: Statistics と CompletionForecast の役割分担

**Issue #145 で整理**

#### 概要

| 型 | 役割 | SPI | 備考 |
|----|------|-----|------|
| `Statistics` | 従来のEVM指標（累積ベース） | 累積SPI | そのまま使える値 |
| `CompletionForecast` | 予測計算（直近トレンドベース） | 直近N日SPI（※） | 計算コンテキスト込み |

※ 現状は累積SPIを使用。将来的に直近N日SPIに変更予定。

#### 詳細

| 指標 | 使用するSPI | 使用するdailyPv | 備考 |
|------|------------|-----------------|------|
| `Statistics.spi` | 累積SPI | - | 従来のEVM指標 |
| `Statistics.etcPrime` | 累積SPI | - | `remainingWork / 累積SPI` |
| `CompletionForecast.etcPrime` | 累積SPI（※） | - | `remainingWork / usedSpi` |
| `CompletionForecast.forecastDate` | 累積SPI（※） | 直近7日平均PV | `dailyPv × SPI` で消化 |

※ 将来的に `spiLookbackDays` オプションで直近N日SPIを使用可能にする拡張を検討

#### 設計意図

1. **Statistics は累積値で統一**: 従来のEVM指標として一貫性を保つ。`spi` と `etcPrime` が同じ累積SPIベース
2. **CompletionForecast は予測に特化**: 「今のペースが続いたら」という予測のため、直近トレンドを反映
3. **etcPrime は Statistics に直接載せない検討もあった**: コンテキスト（usedSpi）と一緒に使うべき値だが、現状は累積SPIで統一されているため Statistics にも含める

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
| 1.1.0 | 2025-12-22 | excludedTasksプロパティ追加 | REQ-TASK-001 |
| 1.1.1 | 2025-12-24 | 要件トレーサビリティセクション追加 | REQ-TASK-001 |
| 1.2.0 | 2026-01-23 | getDelayedTasks()メソッド追加（遅延タスク抽出機能） | REQ-DELAY-001 |
| 1.3.0 | 2026-01-23 | 完了予測機能追加（bac, totalEv, etcPrime, plannedWorkDays, calculateRecentDailyPv, calculateCompletionForecast） | REQ-EVM-001 |
| 1.4.0 | 2026-01-25 | タスクフィルタリング・統計機能追加（filterTasks, getStatistics, getStatisticsByName）、Statistics型に拡張プロパティ追加（etcPrime, completionForecast, 遅延情報）、既存getter（statisticsByProject, statisticsByName）を新メソッドに委譲するリファクタリング | REQ-FILTER-STATS-001 |
| 1.5.0 | 2026-01-26 | 重複アクセサ（bac, totalEv, etcPrime）を削除。統計情報は `statisticsByProject` / `getStatistics()` に集約 | REQ-REFACTOR-001 |
| 1.6.0 | 2026-01-26 | 完了予測機能を高性能版に統一。`calculateCompletionForecast()` にオーバーロード追加（フィルタ対応、タスク配列渡し対応）。`_calculateBasicStats()` 内部メソッド追加（循環参照回避）。`_calculateCompletionForecastForTasks()` 削除 | REQ-REFACTOR-002 |
| 1.6.1 | 2026-01-26 | `_calculateExtendedStats()` の `dailyPvOverride: 1.0` を削除（REQ-EVM-001 AC-03準拠）。設計方針セクション追加（Statistics と CompletionForecast の役割分担） | Issue #145 |
| 1.7.0 | 2026-01-28 | `CompletionForecastOptions` に `spiOverride` オプション追加。`calculateCompletionForecast()` で外部指定SPIを使用可能に | REQ-SPI-002 |
| 1.8.0 | 2026-01-30 | `getTree()` メソッド追加。TaskNode[] を TreeNode[] 形式に変換してツリー構造を取得可能に | REQ-TREE-001 AC-07 |
