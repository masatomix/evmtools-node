# TaskRow.pv-today 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2026-01-23
**要件ID**: REQ-PV-TODAY-001
**GitHub Issue**: #86
**ソースファイル**: `src/domain/TaskRow.ts`

---

## 1. 概要

### 1.1 目的

TaskRowクラスに「今日のPV」を計算するメソッドを追加し、タスクの遅れ・前倒し状況を数値で可視化できるようにする。

### 1.2 2種類のPV

| 種類 | プロパティ/メソッド | 計算式 | 説明 |
|------|-------------------|--------|------|
| 計画PV | `workloadPerDay` | `workload / scheduledWorkDays` | 計画段階で決まる固定値（既存） |
| 実行PV | `pvTodayActual(baseDate)` | `残工数 / 残日数` | 進捗を反映した実態値（新規） |

### 1.3 解釈

| 状況 | 条件 | 意味 |
|------|------|------|
| 前倒し | `pvTodayActual < workloadPerDay` | 今日やるべき量が計画より少ない |
| 遅れ | `pvTodayActual > workloadPerDay` | 今日やるべき量が計画より多い |
| 計画通り | `pvTodayActual ≒ workloadPerDay` | 進捗が計画通り |

---

## 2. インターフェース仕様

### 2.1 メソッドシグネチャ

```typescript
class TaskRow {
  // ... 既存プロパティ/メソッド

  /**
   * 基準日から終了日までの残日数
   * plotMapでプロットされている日のみカウント
   *
   * @param baseDate 基準日（Project.baseDateを渡す）
   * @returns 残日数。計算不能な場合は undefined
   *
   * @remarks
   * - 基準日がタスク期間外（startDate〜endDate外）の場合は 0
   * - startDate, endDate, plotMap が未設定の場合は undefined
   */
  remainingDays(baseDate: Date): number | undefined

  /**
   * 実行PV（今日やるべきPV）
   * = 残工数 / 残日数
   * = workload × (1 - progressRate) / remainingDays
   *
   * @param baseDate 基準日（Project.baseDateを渡す）
   * @returns 実行PV。計算不能な場合は undefined
   *
   * @remarks
   * - 残日数が 0 の場合は 0 を返す（ゼロ除算回避）
   * - progressRate が undefined の場合は 0 として扱う
   * - workload が undefined の場合は undefined を返す
   */
  pvTodayActual(baseDate: Date): number | undefined
}
```

### 2.2 設計根拠

既存の `calculatePV(baseDate)`, `calculateSPI(baseDate)` 等と同じパターンでメソッド引数として基準日を受け取る。

---

## 3. 処理仕様

### 3.1 remainingDays の処理フロー

```
1. checkStartEndDateAndPlotMap() で基本チェック
   → false なら undefined を返す

2. タスク期間内チェック
   - 基準日 < startDate → 0 を返す（タスク未開始）
   - 基準日 > endDate → 0 を返す（タスク終了後）

3. 残日数カウント
   - plotMap のエントリをループ
   - 基準日シリアル値 <= シリアル値 <= 終了日シリアル値 の日をカウント

4. カウント値を返す
```

### 3.2 remainingDays の擬似コード

```typescript
remainingDays = (baseDate: Date): number | undefined => {
  if (!this.checkStartEndDateAndPlotMap()) {
    return undefined
  }

  const { startDate, endDate, plotMap } = this

  const baseSerial = date2Sn(baseDate)
  const startSerial = date2Sn(startDate)
  const endSerial = date2Sn(endDate)

  // タスク期間外チェック
  if (baseSerial < startSerial || baseSerial > endSerial) {
    return 0
  }

  // 残日数カウント: 基準日〜終了日で plotMap が true の日数
  let count = 0
  for (const [serial, value] of plotMap.entries()) {
    if (value === true && serial >= baseSerial && serial <= endSerial) {
      count++
    }
  }

  return count
}
```

### 3.3 pvTodayActual の処理フロー

```
1. remainingDays(baseDate) を取得
   → undefined なら undefined を返す
   → 0 なら 0 を返す（ゼロ除算回避）

2. workload チェック
   → undefined なら undefined を返す

3. 残工数を計算
   - 残工数 = workload × (1 - progressRate)
   - progressRate が undefined なら 0 として扱う

4. 実行PV = 残工数 / 残日数

5. 値を返す
```

### 3.4 pvTodayActual の擬似コード

```typescript
pvTodayActual = (baseDate: Date): number | undefined => {
  const remaining = this.remainingDays(baseDate)

  if (remaining === undefined) {
    return undefined
  }

  if (remaining === 0) {
    return 0  // ゼロ除算回避
  }

  const { workload, progressRate } = this

  if (workload === undefined) {
    return undefined
  }

  // progressRate が undefined なら 0 として扱う（進捗なし）
  const rate = progressRate ?? 0
  const remainingWorkload = workload * (1 - rate)

  return remainingWorkload / remaining
}
```

---

## 4. 設計上の制約

### 4.1 progressRate と基準日の関係

```
PV: ─●─●─●─●─●─●─→ 日ごとに計算可能
EV: ─────────●     基準日の1点のみ
```

- `progressRate` は **Projectの基準日時点のスナップショット** である
- したがって `pvTodayActual` も **Projectの基準日でのみ正しい値** が得られる
- `remainingDays` / `pvTodayActual` は技術的には任意の日付を受け取るが、**Projectの基準日以外を渡しても意味のある値にならない**

### 4.2 正しい使い方

```typescript
// ✅ 正しい: Projectの基準日を使用
const baseDate = project.baseDate
const pvActual = task.pvTodayActual(baseDate)

// ⚠️ 意味がない: 別の日付を使用（progressRateはproject.baseDate時点の値のため）
const pvActual = task.pvTodayActual(someOtherDate)
```

### 4.3 制約の理由

TaskRowはProjectに属しており、そのTaskRowの `progressRate` はProject読み込み時の基準日における進捗率である。別の日付で `pvTodayActual` を計算しても、`残工数 = workload × (1 - progressRate)` の progressRate が基準日時点の値であるため、整合性のある結果にならない。

---

## 5. テストケース

### 5.1 remainingDays 正常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-01 | 基準日がタスク期間中央 | 5日タスク、基準日=3日目 | 3（3,4,5日目） |
| TC-02 | 基準日がタスク開始日 | 5日タスク、基準日=1日目 | 5（全日） |
| TC-03 | 基準日がタスク終了日 | 5日タスク、基準日=5日目 | 1（最終日のみ） |
| TC-04 | 土日を含むplotMap | 7日間、稼働5日 | 稼働日のみカウント |

### 5.2 remainingDays 境界値

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-05 | 基準日がタスク開始前 | 基準日 < startDate | 0 |
| TC-06 | 基準日がタスク終了後 | 基準日 > endDate | 0 |
| TC-07 | 残日数が1日 | 基準日=終了日 | 1 |

### 5.3 remainingDays 異常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-08 | startDate未設定 | startDate=undefined | undefined |
| TC-09 | endDate未設定 | endDate=undefined | undefined |
| TC-10 | plotMap未設定 | plotMap=undefined | undefined |

### 5.4 pvTodayActual 正常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-11 | 遅れタスク | 工数2.5, 3日予定, 進捗60%, 残1日 | 1.0 (= 1.0/1) |
| TC-12 | 前倒しタスク | 工数2.5, 3日予定, 進捗60%, 残2日 | 0.5 (= 1.0/2) |
| TC-13 | 計画通りタスク | 工数3.0, 3日予定, 進捗66.7%, 残1日 | 1.0 (= 1.0/1) |
| TC-14 | 進捗0%のタスク | 工数3.0, 残3日, 進捗0% | 1.0 (= 3.0/3) |

### 5.5 pvTodayActual 境界値

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-15 | 進捗100%のタスク | progressRate=1.0 | 0 (残工数0) |
| TC-16 | 残日数0 | 基準日 > endDate | 0 (ゼロ除算回避) |
| TC-17 | progressRate未設定 | progressRate=undefined | 0%として計算 |

### 5.6 pvTodayActual 異常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-18 | workload未設定 | workload=undefined | undefined |
| TC-19 | remainingDaysがundefined | 無効なタスク | undefined |

### 5.7 統合テスト（ユースケース）

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-20 | pbevm-show-pv出力にpvTodayカラム | workloadPerDayの値が表示される |
| TC-21 | pbevm-show-pv出力にpvTodayActualカラム | 計算値が表示される |
| TC-22 | pbevm-show-pv出力にremainingDaysカラム | 残日数が表示される |

> **注**: displayDataオブジェクトはコンソール・Excel両方に使用されるため、TC-20〜TC-22でExcel出力もカバーされる。

---

## 6. 使用例

```typescript
import { Project } from 'evmtools-node/domain'

const project: Project = await creator.createProject()
const baseDate = project.baseDate

// リーフタスクの今日のPV情報を取得
const tasks = project.toTaskRows().filter(t => t.isLeaf)

for (const task of tasks) {
  const pvToday = task.workloadPerDay              // 計画PV（既存）
  const remaining = task.remainingDays(baseDate)   // 残日数
  const pvActual = task.pvTodayActual(baseDate)    // 実行PV

  console.log(`${task.name}:`)
  console.log(`  計画PV: ${pvToday?.toFixed(3)}`)
  console.log(`  残日数: ${remaining}`)
  console.log(`  実行PV: ${pvActual?.toFixed(3)}`)

  if (pvToday && pvActual) {
    if (pvActual > pvToday) {
      console.log(`  → 遅れ（実行PVが計画より多い）`)
    } else if (pvActual < pvToday) {
      console.log(`  → 前倒し（実行PVが計画より少ない）`)
    }
  }
}
```

---

## 7. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-PV-TODAY-001 AC-01 | remainingDaysで残日数取得 | TC-01〜TC-04 | ✅ PASS |
| REQ-PV-TODAY-001 AC-02 | pvTodayActualで実行PV取得 | TC-11〜TC-14 | ✅ PASS |
| REQ-PV-TODAY-001 AC-03 | 残日数0でpvTodayActualは0 | TC-16 | ✅ PASS |
| REQ-PV-TODAY-001 AC-04 | 期間外でremainingDaysは0 | TC-05, TC-06 | ✅ PASS |
| REQ-PV-TODAY-001 AC-05 | pbevm-show-pv出力（コンソール・Excel両方）にpvTodayカラム | TC-20 | ✅ PASS |
| REQ-PV-TODAY-001 AC-06 | pbevm-show-pv出力（コンソール・Excel両方）にpvTodayActualカラム | TC-21 | ✅ PASS |
| REQ-PV-TODAY-001 AC-08 | pbevm-show-pv出力（コンソール・Excel両方）にremainingDaysカラム | TC-22 | ✅ PASS |
| REQ-PV-TODAY-001 AC-07 | 進捗100%でpvTodayActualは0 | TC-15 | ✅ PASS |

**テストファイル**:
- `src/domain/__tests__/TaskRow.pv-today.test.ts` - TC-01〜TC-19（単体テスト）
- `src/usecase/__tests__/pbevm-show-pv-usecase.test.ts` - TC-20〜TC-22（統合テスト）

---

## 8. 修正対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/domain/TaskRow.ts` | `remainingDays()`, `pvTodayActual()` メソッド追加 |
| `src/usecase/pbevm-show-pv-usecase.ts` | 出力に `pvToday`, `pvTodayActual` カラム追加 |
| `src/domain/__tests__/TaskRow.pv-today.test.ts` | 新規テストファイル作成（TC-01〜TC-19） |
| `src/usecase/__tests__/pbevm-show-pv-usecase.test.ts` | TC-20〜TC-22 統合テスト追加 |

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2026-01-23 | 初版作成 | REQ-PV-TODAY-001 |
| 1.1.0 | 2026-01-24 | TC-20〜TC-22 統合テストを自動化、TC-22をremainingDaysに変更、AC-08追加 | REQ-PV-TODAY-001 |
