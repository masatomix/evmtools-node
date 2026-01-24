# Project.filterStatistics 詳細設計書

**バージョン**: 1.3.0
**作成日**: 2026-01-24
**要件ID**: [REQ-FILTER-STATS-001](../../requirements/REQ-FILTER-STATS-001.md)
**対象クラス**: `src/domain/Project.ts`

---

## 1. 概要

Project クラスにタスクフィルタリング機能と統計情報取得機能を追加する。

### 1.1 追加機能

| メソッド | 説明 |
|---------|------|
| `filterTasks(options?)` | フィルタ条件に基づいて TaskRow[] を返す |
| `getStatistics()` | プロジェクト全体の統計情報を返す |
| `getStatistics(options)` | フィルタ条件を指定して統計情報を返す |
| `getStatistics(tasks)` | 指定された TaskRow[] の統計情報を返す |
| `getStatisticsByName()` | 担当者別の統計情報を返す |
| `getStatisticsByName(options)` | フィルタ条件を指定して担当者別統計を返す |
| `getStatisticsByName(tasks)` | 指定された TaskRow[] の担当者別統計を返す |

### 1.2 設計方針

- **既存の型を拡張**: `ProjectStatistics`, `AssigneeStatistics` に新プロパティを追加
- **ロジック共通化**: 既存 getter と新メソッドは内部で同じ計算ロジックを使用
- **API の一貫性**: `statisticsByProject` → `getStatistics()`, `statisticsByName` → `getStatisticsByName()` のパターン
- **後方互換性**: 既存の getter はそのまま残す

---

## 2. インターフェース仕様

### 2.1 型定義（新規追加）

```typescript
/**
 * タスクフィルタオプション
 */
export interface TaskFilterOptions {
  /** fullTaskName による部分一致フィルタ */
  filter?: string
}

/**
 * 統計情報取得オプション
 * TaskFilterOptions を継承（フィルタ条件を含む）
 */
export interface StatisticsOptions extends TaskFilterOptions {
  // 将来の拡張用（例: includeDelayed, groupBy など）
}
```

### 2.2 既存型の拡張

```typescript
// 基底型（既存）
export type Statistics = {
  totalTasksCount?: number
  totalWorkloadExcel?: number
  totalWorkloadCalculated?: number
  averageWorkload?: number
  baseDate: string
  totalPvExcel?: number
  totalPvCalculated?: number
  totalEv?: number
  spi?: number
}

// 拡張統計（新規: 共通の拡張プロパティ）
export interface ExtendedStatistics {
  /** ETC'（残作業予測）。SPI=0の場合は計算不能のためundefined */
  etcPrime?: number
  /** 完了予測日。計算不能な場合はundefined */
  completionForecast?: Date
  /** 遅延タスク数 */
  delayedTaskCount: number
  /** 平均遅延日数（遅延タスクがない場合は0） */
  averageDelayDays: number
  /** 最大遅延日数（遅延タスクがない場合は0） */
  maxDelayDays: number
}

// 担当者別統計（拡張）
export type AssigneeStatistics = {
  assignee?: string
} & Statistics & ExtendedStatistics

// プロジェクト統計（拡張）
export type ProjectStatistics = {
  projectName?: string
  startDate: string
  endDate: string
} & Statistics & ExtendedStatistics
```

### 2.3 メソッドシグネチャ

#### `filterTasks(options?: TaskFilterOptions): TaskRow[]`

```typescript
/**
 * フィルタ条件に基づいてタスクを抽出する
 *
 * @param options フィルタオプション
 * @returns フィルタ結果の TaskRow[]（親タスク含む全タスク）
 *
 * @note 統計計算時は内部でリーフタスクのみを使用（二重カウント防止）
 *
 * @example
 * // "認証機能" を含むタスクを取得（親タスク含む）
 * const tasks = project.filterTasks({ filter: "認証機能" })
 *
 * // 引数なしは全タスクを返す
 * const allTasks = project.filterTasks()
 */
filterTasks(options?: TaskFilterOptions): TaskRow[]
```

#### `getStatistics()` オーバーロード

```typescript
/**
 * プロジェクト統計情報を取得する
 *
 * オーバーロード:
 * 1. getStatistics() - プロジェクト全体の統計
 * 2. getStatistics({ filter }) - フィルタして統計
 * 3. getStatistics(TaskRow[]) - 渡されたタスクの統計
 *
 * @param optionsOrTasks フィルタオプションまたはTaskRow配列
 * @returns プロジェクト統計情報
 *
 * @example
 * // 全体の統計
 * const stats = project.getStatistics()
 *
 * // フィルタして統計
 * const stats = project.getStatistics({ filter: "認証機能" })
 *
 * // 事前にフィルタしたタスクの統計
 * const tasks = project.filterTasks({ filter: "認証機能" })
 * const stats = project.getStatistics(tasks)
 */
getStatistics(): ProjectStatistics
getStatistics(options: StatisticsOptions): ProjectStatistics
getStatistics(tasks: TaskRow[]): ProjectStatistics
```

#### `getStatisticsByName()` オーバーロード

```typescript
/**
 * 担当者別統計情報を取得する
 *
 * オーバーロード:
 * 1. getStatisticsByName() - プロジェクト全体の担当者別統計
 * 2. getStatisticsByName({ filter }) - フィルタして担当者別統計
 * 3. getStatisticsByName(TaskRow[]) - 渡されたタスクの担当者別統計
 *
 * @param optionsOrTasks フィルタオプションまたはTaskRow配列
 * @returns 担当者別統計情報の配列
 *
 * @example
 * // 全体の担当者別統計
 * const stats = project.getStatisticsByName()
 *
 * // フィルタして担当者別統計
 * const stats = project.getStatisticsByName({ filter: "認証機能" })
 *
 * // 事前にフィルタしたタスクの担当者別統計
 * const tasks = project.filterTasks({ filter: "認証機能" })
 * const stats = project.getStatisticsByName(tasks)
 */
getStatisticsByName(): AssigneeStatistics[]
getStatisticsByName(options: StatisticsOptions): AssigneeStatistics[]
getStatisticsByName(tasks: TaskRow[]): AssigneeStatistics[]
```

---

## 3. 処理仕様

### 3.1 アーキテクチャ（ロジック共通化）

```
┌───────────────────────────────────────────────────────────────────┐
│                          Project                                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  filterTasks(options?)                                            │
│      └── fullTaskName 部分一致フィルタ                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              プロジェクト統計                                 │  │
│  │                                                             │  │
│  │  get statisticsByProject()                                  │  │
│  │      └──► _calculateStatistics(allLeafTasks) ◄──┐          │  │
│  │                                                  │          │  │
│  │  getStatistics(optionsOrTasks?)                  │          │  │
│  │      ├── undefined ──► _calculateStatistics() ───┘          │  │
│  │      ├── TaskRow[] ──► _calculateStatistics(tasks)          │  │
│  │      └── options ────► filterTasks() → _calculateStatistics()│  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              担当者別統計                                     │  │
│  │                                                             │  │
│  │  get statisticsByName()                                     │  │
│  │      └──► _calculateAssigneeStats(allLeafTasks) ◄──┐       │  │
│  │                                                     │       │  │
│  │  getStatisticsByName(optionsOrTasks?)               │       │  │
│  │      ├── undefined ──► _calculateAssigneeStats() ───┘       │  │
│  │      ├── TaskRow[] ──► _calculateAssigneeStats(tasks)       │  │
│  │      └── options ────► filterTasks() → _calculateAssigneeStats()│
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              共通ヘルパー                                     │  │
│  │                                                             │  │
│  │  _calculateExtendedStats(tasks) → ExtendedStatistics        │  │
│  │      ├── etcPrime                                           │  │
│  │      ├── completionForecast                                 │  │
│  │      └── delayedTaskCount, averageDelayDays, maxDelayDays   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 `filterTasks(options?)` の処理フロー

```
1. options が undefined または filter が空文字の場合
   → 全タスク（親含む）を返す

2. filter が指定されている場合
   a. toTaskRows() で全タスクを取得（キャッシュ利用）
   b. getFullTaskName(task) で部分一致チェック
   c. 一致したタスクのみ返す（親タスク含む）

※ 統計計算時は _resolveTasks() 内でリーフタスクのみを抽出
```

**擬似コード**:
```typescript
filterTasks(options?: TaskFilterOptions): TaskRow[] {
  const allTasks = this.toTaskRows()

  if (!options?.filter || options.filter.trim() === '') {
    return allTasks
  }

  return allTasks.filter(task => {
    const fullName = this.getFullTaskName(task)
    return fullName.includes(options.filter!)
  })
}
```

### 3.3 `getStatistics(optionsOrTasks?)` の処理フロー

```
1. 引数の型を判定
   - undefined → 全リーフタスク対象
   - TaskRow[] → 渡されたタスク対象（リーフのみ抽出）
   - StatisticsOptions → filterTasks() でフィルタ

2. _calculateStatistics(tasks) を呼び出して統計を計算
```

**擬似コード**:
```typescript
getStatistics(optionsOrTasks?: StatisticsOptions | TaskRow[]): ProjectStatistics {
  const tasks = this._resolveTasks(optionsOrTasks)
  return this._calculateStatistics(tasks)
}

/**
 * 引数を解決してリーフタスクのみを返す（統計計算用）
 * filterTasks() は全タスクを返すが、統計計算はリーフのみで行う
 */
private _resolveTasks(optionsOrTasks?: StatisticsOptions | TaskRow[]): TaskRow[] {
  let tasks: TaskRow[]

  if (optionsOrTasks === undefined) {
    tasks = this.filterTasks()
  } else if (Array.isArray(optionsOrTasks)) {
    tasks = optionsOrTasks
  } else {
    tasks = this.filterTasks(optionsOrTasks)
  }

  // 統計計算はリーフタスクのみ（二重カウント防止）
  return tasks.filter(t => t.isLeaf)
}
```

### 3.4 `getStatisticsByName(optionsOrTasks?)` の処理フロー

```
1. 引数の型を判定（getStatistics と同様）
2. _calculateAssigneeStats(tasks) を呼び出して担当者別統計を計算
```

**擬似コード**:
```typescript
getStatisticsByName(optionsOrTasks?: StatisticsOptions | TaskRow[]): AssigneeStatistics[] {
  const tasks = this._resolveTasks(optionsOrTasks)
  return this._calculateAssigneeStats(tasks)
}
```

### 3.5 `_calculateStatistics(tasks)` プロジェクト統計

```typescript
private _calculateStatistics(tasks: TaskRow[]): ProjectStatistics {
  const baseDate = this._baseDate
  const endDate = this._endDate

  // 基本統計
  const totalPvCalculated = sumCalculatePVs(tasks, baseDate)
  const totalEv = sumEVs(tasks)
  const spi = calculateSPI(tasks, baseDate)
  const bac = sumWorkload(tasks)

  // 拡張統計
  const extendedStats = this._calculateExtendedStats(tasks, spi, bac, totalEv)

  return {
    projectName: this._name,
    startDate: dateStr(this._startDate),
    endDate: dateStr(this._endDate),
    totalTasksCount: tasks.length,
    totalWorkloadExcel: bac,
    totalWorkloadCalculated: endDate ? sumCalculatePVs(tasks, endDate) : undefined,
    averageWorkload: averageWorkload(tasks),
    baseDate: dateStr(baseDate),
    totalPvExcel: sumPVs(tasks),
    totalPvCalculated,
    totalEv,
    spi,
    ...extendedStats,
  }
}
```

### 3.6 `_calculateAssigneeStats(tasks)` 担当者別統計

```typescript
private _calculateAssigneeStats(tasks: TaskRow[]): AssigneeStatistics[] {
  const baseDate = this._baseDate
  const endDate = this._endDate

  // 担当者ごとにグループ化
  const grouped = groupBy(tasks, t => t.assignee)

  return Object.entries(grouped).map(([assignee, assigneeTasks]) => {
    const totalPvCalculated = sumCalculatePVs(assigneeTasks, baseDate)
    const totalEv = sumEVs(assigneeTasks)
    const spi = calculateSPI(assigneeTasks, baseDate)
    const bac = sumWorkload(assigneeTasks)

    // 拡張統計（担当者ごとに計算）
    const extendedStats = this._calculateExtendedStats(assigneeTasks, spi, bac, totalEv)

    return {
      assignee: assignee || undefined,
      totalTasksCount: assigneeTasks.length,
      totalWorkloadExcel: bac,
      totalWorkloadCalculated: endDate ? sumCalculatePVs(assigneeTasks, endDate) : undefined,
      averageWorkload: averageWorkload(assigneeTasks),
      baseDate: dateStr(baseDate),
      totalPvExcel: sumPVs(assigneeTasks),
      totalPvCalculated,
      totalEv,
      spi,
      ...extendedStats,
    }
  })
}
```

### 3.7 `_calculateExtendedStats(tasks, spi, bac, totalEv)` 拡張統計（共通）

```typescript
private _calculateExtendedStats(
  tasks: TaskRow[],
  spi: number | undefined,
  bac: number,
  totalEv: number
): ExtendedStatistics {
  // ETC'（SPI=0の場合はundefined）
  const etcPrime = spi && spi > 0 ? (bac - totalEv) / spi : undefined

  // 完了予測日（計算不能な場合はundefined）
  const completionForecast = this._calculateCompletionForecastForTasks(tasks, spi)

  // 遅延情報
  const { delayedTaskCount, averageDelayDays, maxDelayDays } = this._calculateDelayStats(tasks)

  return {
    etcPrime,
    completionForecast,
    delayedTaskCount,
    averageDelayDays,
    maxDelayDays,
  }
}
```

### 3.8 `_calculateDelayStats(tasks)` 遅延統計

```typescript
private _calculateDelayStats(tasks: TaskRow[]): {
  delayedTaskCount: number
  averageDelayDays: number
  maxDelayDays: number
} {
  const baseDate = this._baseDate

  // 遅延日数計算
  const calcDelayDays = (task: TaskRow): number => {
    return -(formatRelativeDaysNumber(baseDate, task.endDate) ?? 0)
  }

  // 遅延タスク抽出（未完了かつ遅延日数 > 0）
  const delayedTasks = tasks
    .filter(task => !task.finished)
    .filter(task => task.endDate !== undefined)
    .filter(task => calcDelayDays(task) > 0)

  const delayDays = delayedTasks.map(calcDelayDays)
  const delayedTaskCount = delayedTasks.length
  const averageDelayDays = delayDays.length > 0
    ? delayDays.reduce((a, b) => a + b, 0) / delayDays.length
    : 0
  const maxDelayDays = delayDays.length > 0
    ? Math.max(...delayDays)
    : 0

  return { delayedTaskCount, averageDelayDays, maxDelayDays }
}
```

### 3.9 既存 getter のリファクタリング

```typescript
// 既存の getter（内部で共通ロジックを呼び出す）
get statisticsByProject(): ProjectStatistics[] {
  return [this.getStatistics()]
}

get statisticsByName(): AssigneeStatistics[] {
  return this.getStatisticsByName()
}
```

---

## 4. テストケース

### 4.1 filterTasks() テストケース

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|----------|------|----------|
| TC-01 | 引数なしで全タスク（親含む）を返す | `filterTasks()` | 全タスク |
| TC-02 | 空オブジェクトで全タスク（親含む）を返す | `filterTasks({})` | 全タスク |
| TC-03 | 空文字フィルタで全タスク（親含む）を返す | `filterTasks({ filter: "" })` | 全タスク |
| TC-04 | 部分一致でタスクを抽出（親含む） | `filterTasks({ filter: "認証" })` | "認証"を含むタスク（親含む） |
| TC-05 | 親タスク名でも一致 | `filterTasks({ filter: "親タスク名" })` | フルパスに"親タスク名"を含むタスク |
| TC-06 | 一致するタスクがない場合 | `filterTasks({ filter: "存在しない" })` | 空配列 |
| TC-07 | 大文字小文字を区別する | `filterTasks({ filter: "API" })` | 完全一致のみ |
| TC-08 | 親タスクとリーフタスク両方が含まれる | `filterTasks({ filter: "機能" })` | 親タスクとリーフ両方 |

### 4.2 getStatistics() テストケース

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|----------|------|----------|
| TC-10 | 引数なしで全体統計を返す | `getStatistics()` | プロジェクト全体の統計 |
| TC-11 | フィルタオプションで統計を返す | `getStatistics({ filter: "認証" })` | フィルタ結果の統計 |
| TC-12 | TaskRow[]を渡して統計を返す | `getStatistics(tasks)` | 渡されたタスクの統計 |
| TC-13 | EVM指標が正しく計算される | `getStatistics()` | totalPvCalculated, totalEv, spi が正しい |
| TC-14 | タスク数が正しくカウントされる | `getStatistics()` | totalTasksCount が正しい |
| TC-15 | ETC'が正しく計算される | `getStatistics()` | etcPrime = (BAC - EV) / SPI |
| TC-16 | 遅延情報が計算される | `getStatistics()` | delayedTaskCount, averageDelayDays, maxDelayDays |
| TC-17 | PV=0の場合SPIはundefined | 全タスクPV=0 | spi === undefined, etcPrime === undefined |
| TC-18 | 遅延タスクがない場合 | 遅延なし | delayedTaskCount=0, averageDelayDays=0, maxDelayDays=0 |
| TC-19 | 空配列を渡した場合 | `getStatistics([])` | totalTasksCount=0 |

### 4.3 getStatisticsByName() テストケース

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|----------|------|----------|
| TC-20 | 引数なしで全体の担当者別統計を返す | `getStatisticsByName()` | 全担当者の統計 |
| TC-21 | フィルタオプションで担当者別統計を返す | `getStatisticsByName({ filter: "認証" })` | フィルタ結果の担当者別統計 |
| TC-22 | TaskRow[]を渡して担当者別統計を返す | `getStatisticsByName(tasks)` | 渡されたタスクの担当者別統計 |
| TC-23 | 担当者ごとにETC'が計算される | `getStatisticsByName()` | 各担当者のetcPrimeが正しい |
| TC-24 | 担当者ごとに遅延情報が計算される | `getStatisticsByName()` | 各担当者のdelayedTaskCount等が正しい |
| TC-25 | 担当者未設定のタスクがある場合 | assignee=undefined | assignee=undefinedのエントリが含まれる |

### 4.4 統合テストケース（ロジック共通化の検証）

| TC-ID | テスト内容 | 期待結果 |
|-------|----------|----------|
| TC-30 | filterTasks → getStatistics の連携 | フィルタ→統計が正しく動作 |
| TC-31 | filterTasks → getStatisticsByName の連携 | フィルタ→担当者別統計が正しく動作 |
| TC-32 | getStatistics() と statisticsByProject[0] の整合性 | 同じ結果を返す |
| TC-33 | getStatisticsByName() と statisticsByName の整合性 | 同じ結果を返す |

---

## 5. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-FILTER-STATS-001 AC-01 | fullTaskName に "認証機能" を含むタスクのみが抽出される | TC-04, TC-05, TC-08 | ⏳ |
| REQ-FILTER-STATS-001 AC-02 | フィルタ結果に対して PV 合計、EV 合計、SPI が正しく算出される | TC-13, TC-17 | ⏳ |
| REQ-FILTER-STATS-001 AC-03 | フィルタ結果に対して ETC' と完了予測日が算出される | TC-15 | ⏳ |
| REQ-FILTER-STATS-001 AC-04 | フィルタ結果のタスク数が正しくカウントされる（統計計算はリーフのみ） | TC-14 | ⏳ |
| REQ-FILTER-STATS-001 AC-05 | 担当者別にタスク数、PV、EV、ETC'、遅延情報が集計される | TC-20, TC-23, TC-24 | ⏳ |
| REQ-FILTER-STATS-001 AC-05-1 | `project.getStatisticsByName({ filter })` でフィルタ結果の担当者別統計を取得できる | TC-21 | ⏳ |
| REQ-FILTER-STATS-001 AC-05-2 | `project.getStatisticsByName(filteredTasks)` で担当者別統計を取得できる | TC-22, TC-31 | ⏳ |
| REQ-FILTER-STATS-001 AC-06 | 遅延タスク数と遅延日数の統計が取得できる | TC-16, TC-18, TC-24 | ⏳ |
| REQ-FILTER-STATS-001 AC-07 | `project.getStatistics({ filter })` でフィルタ結果の統計情報を取得できる | TC-11 | ⏳ |
| REQ-FILTER-STATS-001 AC-08 | `project.getStatistics()` を引数なしで呼び出すとプロジェクト全体の統計を返す | TC-10, TC-32 | ⏳ |
| REQ-FILTER-STATS-001 AC-09 | `project.filterTasks({ filter })` でフィルタ結果の TaskRow[]（親含む）を取得できる | TC-04, TC-08 | ⏳ |
| REQ-FILTER-STATS-001 AC-10 | `project.getStatistics(filteredTasks)` で渡された TaskRow[] に対する統計を取得できる | TC-12, TC-30 | ⏳ |

> **次回スコープ**: AC-11（CLI）は次回対応予定

> **ステータス凡例**:
> - ⏳: 未実装
> - ✅ PASS: テスト合格
> - ❌ FAIL: テスト失敗

---

## 6. 設計上の考慮事項

### 6.1 既存APIとの整合性

| 既存 getter | 新メソッド | 関係 |
|------------|-----------|------|
| `statisticsByProject` | `getStatistics()` | 同じロジック、getter は新メソッドを呼び出す |
| `statisticsByName` | `getStatisticsByName()` | 同じロジック、getter は新メソッドを呼び出す |

### 6.2 型の拡張

`ProjectStatistics` と `AssigneeStatistics` の両方に以下を追加:

| プロパティ | 型 | 必須/Optional |
|-----------|-----|:------------:|
| `etcPrime` | `number` | Optional |
| `completionForecast` | `Date` | Optional |
| `delayedTaskCount` | `number` | 必須 |
| `averageDelayDays` | `number` | 必須 |
| `maxDelayDays` | `number` | 必須 |

### 6.3 パフォーマンス

- `filterTasks()` は `toTaskRows()` のキャッシュを利用
- `getFullTaskName()` は各タスクで親を辿るため、O(depth × filterResults)
- 1000タスクで100ms以内を目標（NFR-01-1）

### 6.4 イミュータビリティ

- `filterTasks()` は新しい配列を返す
- `getStatistics()`, `getStatisticsByName()` は新しいオブジェクトを返す
- Project インスタンスの状態は変更されない

---

## 7. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-24 | 1.0.0 | 初版作成 |
| 2026-01-24 | 1.1.0 | ProjectStatistics 型を拡張、ロジック共通化設計 |
| 2026-01-24 | 1.2.0 | getStatisticsByName() 追加、AssigneeStatistics にも拡張プロパティ追加、ProjectStatistics から assigneeStats を削除 |
| 2026-01-25 | 1.3.0 | filterTasks() が全タスク（親含む）を返すように変更、統計計算は内部でリーフのみを使用、TC-08 追加、要件トレーサビリティ更新（AC-05-1, AC-05-2 追加、AC-11 次回スコープ） |
