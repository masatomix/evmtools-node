# Project 仕様書

**バージョン**: 1.2.0
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

### 5.5 `get statisticsByProject: ProjectStatistics[]`

#### 目的
プロジェクト全体のEVM統計情報を返す。

#### シグネチャ
```typescript
get statisticsByProject(): ProjectStatistics[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-SP-01 | 戻り値は`ProjectStatistics[]`型 |

#### アルゴリズム

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

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-SP-001 | 正常系 | リーフタスク複数 | 集計されたProjectStatistics |
| EQ-SP-002 | 正常系 | spi計算可能（PV>0） | 数値spi |
| EQ-SP-003 | 境界値 | リーフタスク0件 | totalTasksCount=0 |
| EQ-SP-004 | 境界値 | 全タスクのPV=0 | spi=undefined（0除算回避） |
| EQ-SP-005 | 境界値 | startDate/endDate未設定 | 空文字列 |

---

### 5.6 `get statisticsByName: AssigneeStatistics[]`

#### 目的
担当者別のEVM統計情報を返す。

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

### 5.7 `get pvByName: Record<string, unknown>[]` / `get pvsByName`

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

### 5.8 `isHoliday(date: Date): boolean`

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

### 5.9 `get excludedTasks: ExcludedTask[]`

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

### 5.10 `getDelayedTasks(minDays?: number): TaskRow[]`

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
| **合計** | **68件** | **68件** |

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

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2026-01-23
Test Suites: 2 passed, 2 total
Tests:       68 passed, 68 total
```

---

## 12. 設計上の課題・改善提案

| 課題 | 現状 | 改善案 |
|------|------|--------|
| TaskService直接生成 | `new TaskService()` | コンストラクタDI |
| 不変条件の検証なし | startDate/endDateの前後関係未検証 | コンストラクタでバリデーション追加 |
| pvByNameの例外 | Errorをthrow | Result型またはOption型で表現 |
| キャッシュ無効化なし | 生成後の変更想定なし | 明示的にimmutableを表明（readonly） |

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
| 1.1.0 | 2025-12-22 | excludedTasksプロパティ追加 | REQ-TASK-001 |
| 1.1.1 | 2025-12-24 | 要件トレーサビリティセクション追加 | REQ-TASK-001 |
| 1.2.0 | 2026-01-23 | getDelayedTasks()メソッド追加（遅延タスク抽出機能） | REQ-DELAY-001 |
