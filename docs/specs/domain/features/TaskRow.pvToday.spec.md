# TaskRow.pvToday 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2026-01-22
**要件ID**: REQ-PVTODAY-001
**ソースファイル**: `src/domain/TaskRow.ts`

---

## 1. 概要

TaskRowクラスに「今日のPV」を計算する機能を追加する。

- **計画PV（pvToday）**: `workload / scheduledWorkDays`（既存の `workloadPerDay` を利用）
- **実行PV（pvTodayActual）**: `残工数 / 残日数`（進捗を反映した実態値）
- **残日数（remainingDays）**: 基準日〜終了日のplotMapプロット日数

## 2. インターフェース仕様

### 2.1 型定義

```typescript
// 既存の型を利用
type NonNullDateAndPlotMap = {
    startDate: Date
    endDate: Date
    plotMap: Map<number, boolean>
}
```

### 2.2 メソッドシグネチャ

```typescript
/**
 * 基準日から終了日までの残日数を計算する
 * plotMapでプロットされている日のみカウント（基準日を含む）
 *
 * @param baseDate 基準日
 * @returns 残日数。計算不能な場合は undefined
 */
calculateRemainingDays(baseDate: Date): number | undefined

/**
 * 実行PV（残工数 / 残日数）を計算する
 * 進捗を反映した「今日やるべきPV」
 *
 * @param baseDate 基準日
 * @returns 実行PV。計算不能な場合は undefined。完了タスクは 0
 */
calculatePvTodayActual(baseDate: Date): number | undefined
```

## 3. 処理仕様

### 3.1 calculateRemainingDays

#### 3.1.1 基本処理フロー

1. `startDate`, `endDate`, `plotMap` の存在チェック
2. 基準日が終了日より後の場合は `0` を返す
3. 基準日〜終了日の範囲でplotMapを走査
4. `plotMap.get(serial) === true` の日数をカウント

#### 3.1.2 擬似コード

```
function calculateRemainingDays(baseDate):
    if not checkStartEndDateAndPlotMap():
        return undefined

    baseSerial = date2Sn(baseDate)
    endSerial = date2Sn(endDate)

    if baseSerial > endSerial:
        return 0

    count = 0
    for serial in plotMap.keys():
        if baseSerial <= serial <= endSerial:
            if plotMap.get(serial) === true:
                count++

    return count
```

### 3.2 calculatePvTodayActual

#### 3.2.1 基本処理フロー

1. 完了タスク（progressRate === 1.0）の場合は `0` を返す
2. `progressRate` が未設定の場合は `undefined` を返す
3. `workload` が未設定の場合は `undefined` を返す
4. `remainingDays` を計算
5. `remainingDays` が 0 の場合は `undefined` を返す
6. `残工数 / 残日数` を計算して返す

#### 3.2.2 擬似コード

```
function calculatePvTodayActual(baseDate):
    // 完了タスクは0
    if progressRate === 1.0:
        return 0

    // progressRate未設定
    if progressRate === undefined:
        return undefined

    // workload未設定
    if workload === undefined:
        return undefined

    remainingDays = calculateRemainingDays(baseDate)

    // 計算不能または残日数0
    if remainingDays === undefined or remainingDays === 0:
        return undefined

    remainingWorkload = workload * (1 - progressRate)
    return remainingWorkload / remainingDays
```

### 3.3 計算式

```
計画PV = workload / scheduledWorkDays
       = workloadPerDay（既存ゲッター）

実行PV = 残工数 / 残日数
       = workload × (1 - progressRate) / remainingDays

残日数 = Σ(plotMap[serial] === true) where baseSerial <= serial <= endSerial
```

## 4. テストケース

### 4.1 calculateRemainingDays - 正常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-01 | 基準日=開始日、3日間のタスク | baseDate=開始日, plotMap=[月,火,水] | 3 |
| TC-02 | 基準日=中間日、3日間のタスク | baseDate=火曜, plotMap=[月,火,水] | 2 |
| TC-03 | 基準日=終了日 | baseDate=終了日, plotMap=[月,火,水] | 1 |

### 4.2 calculateRemainingDays - 境界値

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-04 | 基準日が終了日より後 | baseDate > endDate | 0 |
| TC-05 | 基準日が開始日より前 | baseDate < startDate | 全日数 |
| TC-06 | 1日のみのタスク | 開始日=終了日, baseDate=開始日 | 1 |

### 4.3 calculateRemainingDays - 異常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-07 | startDateがundefined | startDate=undefined | undefined |
| TC-08 | endDateがundefined | endDate=undefined | undefined |
| TC-09 | plotMapがundefined | plotMap=undefined | undefined |

### 4.4 calculatePvTodayActual - 正常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-10 | 遅れタスク（基準日=終了日） | workload=2.5, progressRate=0.6, 残日数=1 | 1.0 |
| TC-11 | 前倒しタスク（基準日=終了日-1） | workload=2.5, progressRate=0.6, 残日数=2 | 0.5 |
| TC-12 | 予定通りタスク | workload=3.0, progressRate=0.5, 残日数=3 | 0.5 |

### 4.5 calculatePvTodayActual - 境界値

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-13 | 完了タスク（progressRate=1.0） | progressRate=1.0 | 0 |
| TC-14 | 進捗0%のタスク | progressRate=0 | workload / 残日数 |
| TC-15 | 残日数=0（終了日過ぎ） | baseDate > endDate | undefined |

### 4.6 calculatePvTodayActual - 異常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-16 | progressRateがundefined | progressRate=undefined | undefined |
| TC-17 | workloadがundefined | workload=undefined | undefined |
| TC-18 | 日付データ不正 | startDate/endDate=undefined | undefined |

## 5. 使用例

```typescript
import { TaskRow } from 'evmtools-node/domain'

// タスク作成（工数2.5MD、3日間、進捗60%）
const task = new TaskRow(
    1,           // sharp
    101,         // id
    1,           // level
    'タスクA',   // name
    '担当者A',   // assignee
    2.5,         // workload
    new Date('2026-01-20'),  // startDate
    new Date('2026-01-22'),  // endDate
    undefined,   // actualStartDate
    undefined,   // actualEndDate
    0.6,         // progressRate
    3,           // scheduledWorkDays
    undefined,   // pv
    undefined,   // ev
    undefined,   // spi
    undefined,   // expectedProgressDate
    undefined,   // delayDays
    undefined,   // remarks
    undefined,   // parentId
    true,        // isLeaf
    plotMap      // plotMap（月,火,水がtrue）
)

const baseDate = new Date('2026-01-22')  // 終了日

// 計画PV
const pvToday = task.workloadPerDay
// => 0.833... (2.5 / 3)

// 残日数
const remainingDays = task.calculateRemainingDays(baseDate)
// => 1

// 実行PV
const pvTodayActual = task.calculatePvTodayActual(baseDate)
// => 1.0 (残工数1.0 / 残日数1)

// 遅れの判定
if (pvTodayActual !== undefined && pvToday !== undefined) {
    if (pvTodayActual > pvToday) {
        console.log('遅れ: 今日やるべき量が計画より多い')
    } else if (pvTodayActual < pvToday) {
        console.log('前倒し: 今日やるべき量が計画より少ない')
    }
}
```

## 6. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-PVTODAY-001 AC-01 | calculateRemainingDays メソッドが追加され、残日数を返す | TC-01, TC-02, TC-03, TC-04, TC-05, TC-06, TC-07, TC-08, TC-09 | ✅ PASS |
| REQ-PVTODAY-001 AC-02 | calculatePvTodayActual メソッドが追加され、実行PVを返す | TC-10, TC-11, TC-12, TC-14 | ✅ PASS |
| REQ-PVTODAY-001 AC-03 | pbevm-show-pv 出力に pvToday カラムが追加される | T-05（usecase） | ✅ PASS |
| REQ-PVTODAY-001 AC-04 | pbevm-show-pv 出力に pvTodayActual カラムが追加される | T-05（usecase） | ✅ PASS |
| REQ-PVTODAY-001 AC-05 | 残日数0の場合、undefined を返す | TC-15 | ✅ PASS |
| REQ-PVTODAY-001 AC-06 | progressRate未設定の場合、undefined を返す | TC-16 | ✅ PASS |
| REQ-PVTODAY-001 AC-07 | 完了タスクの場合、0 を返す | TC-13 | ✅ PASS |

**テスト実行結果**: 2026-01-22 全130件PASS（pvToday関連: 20件、usecase: 3件追加）

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2026-01-22 | 初版作成 | REQ-PVTODAY-001 |
| 1.1.0 | 2026-01-22 | 実装完了、テスト結果更新 | REQ-PVTODAY-001 |
