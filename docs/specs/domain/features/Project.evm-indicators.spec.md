# Project.evm-indicators 詳細仕様

**バージョン**: 1.1.0
**作成日**: 2025-01-22
**要件ID**: REQ-EVM-001
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 概要

Projectクラスに EVM 拡張指標（BAC, ETC', 完了予測日）を追加し、プロジェクトの完了予測を可能にする。

---

## 2. インターフェース仕様

### 2.1 型定義

```typescript
// 既存の Project クラスに追加

class Project {
  // === 新規追加プロパティ ===

  /** 完成時総予算（Budget at Completion） */
  get bac(): number

  /** 現在の出来高合計 */
  get totalEv(): number

  /** プロジェクト全体のSPI */
  get totalSpi(): number

  /** ETC'（残作業完了に必要な計画工数換算） */
  get etcPrime(): number

  /** 日あたりPV（消化能力） */
  get dailyPv(): number

  /** 完了予測日 */
  get estimatedCompletionDate(): Date | undefined

  /** 日あたりPVの手動オーバーライド */
  setDailyPvOverride(value: number | undefined): void
}
```

### 2.2 プロパティ詳細

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `bac` | `number` | 全リーフタスクのPV合計（計画終了日時点） |
| `totalEv` | `number` | 全リーフタスクのEV合計 |
| `totalSpi` | `number` | `totalEv / totalPv`（基準日時点のPV） |
| `etcPrime` | `number` | `(bac - totalEv) / totalSpi` |
| `dailyPv` | `number` | 日あたりPV（消化能力） |
| `estimatedCompletionDate` | `Date \| undefined` | 完了予測日 |

---

## 3. 処理仕様

### 3.1 BAC（完成時総予算）

```typescript
get bac(): number {
  if (!this._endDate) return 0
  const leafTasks = this.toTaskRows().filter(t => t.isLeaf && t.validStatus.isValid)
  return sumOrZero(leafTasks.map(t => t.calculatePVs(this._endDate!)), 3)
}
```

**説明**: 計画終了日（endDate）時点での全リーフタスクの累積PV合計。endDateが未設定の場合は0を返す。

### 3.2 totalEv（出来高合計）

```typescript
get totalEv(): number {
  return this.statisticsByProject[0]?.totalEv ?? 0
}
```

**設計意図**: `statisticsByProject`で既に計算済みの`totalEv`を再利用する。コード共通化により計算ロジックの重複を防ぎ、保守性を向上させる。

### 3.3 totalSpi（プロジェクト全体SPI）

```typescript
get totalSpi(): number {
  return this.statisticsByProject[0]?.spi ?? 0
}
```

**設計意図**: `statisticsByProject`で既に計算済みの`spi`を再利用する。独自に`totalEv / totalPv`を計算するのではなく、既存の計算結果を活用することでコード共通化を実現。

### 3.4 ETC'（残作業工数予測）

```typescript
get etcPrime(): number {
  if (this.totalSpi === 0) return Infinity
  const remaining = this.bac - this.totalEv
  if (remaining <= 0) return 0  // 既に完了している場合
  return remaining / this.totalSpi
}
```

**計算例**:
```
BAC = 100人日, EV = 40人日, SPI = 0.8
ETC' = (100 - 40) / 0.8 = 75人日
```

### 3.5 dailyPv（日あたりPV）

```typescript
private _dailyPvOverride?: number

get dailyPv(): number {
  // 優先度1: 手動オーバーライド
  if (this._dailyPvOverride !== undefined) {
    return this._dailyPvOverride
  }

  // 優先度2: 直近7日平均（実装は将来）
  // const recentPv = this.calculateRecentDailyPv(7)
  // if (recentPv > 0) return recentPv

  // 優先度3: 期間平均PV
  return this.calculateAverageDailyPv()
}

private calculateAverageDailyPv(): number {
  const workDays = this.getWorkDayCount()
  if (workDays === 0) return 0
  return this.bac / workDays
}

private getWorkDayCount(): number {
  // startDate から endDate までの稼働日数を計算
  // 休日を除外
}

setDailyPvOverride(value: number | undefined): void {
  this._dailyPvOverride = value
}
```

### 3.6 完了予測日

```typescript
get estimatedCompletionDate(): Date | undefined {
  if (!this._startDate || !this._endDate) return undefined
  if (this.dailyPv === 0 || this.totalSpi === 0) return undefined
  if (this.bac === 0) return undefined  // タスクがない場合

  let remainingWork = this.bac - this.totalEv
  if (remainingWork <= 0) return this._baseDate  // 既に完了

  let currentDate = new Date(this._baseDate)
  const dailyProgress = this.dailyPv * this.totalSpi
  const maxIterations = 365 * 5  // 5年を上限

  for (let i = 0; i < maxIterations && remainingWork > 0; i++) {
    // 次の稼働日へ移動
    currentDate = this.getNextWorkDay(currentDate)
    remainingWork -= dailyProgress
  }

  return currentDate
}

private getNextWorkDay(date: Date): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  while (this.isHoliday(next)) {
    next.setDate(next.getDate() + 1)
  }
  return next
}
```

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-01 | BAC取得 | 3タスク（PV: 10, 20, 30） | `bac === 60` |
| TC-02 | totalEv取得 | 3タスク（EV: 5, 15, 25） | `totalEv === 45` |
| TC-03 | totalSpi計算 | EV=45, PV=60 | `totalSpi === 0.75` |
| TC-04 | etcPrime計算 | BAC=100, EV=40, SPI=0.8 | `etcPrime === 75` |
| TC-05 | dailyPv（期間平均） | BAC=100, 稼働日20日 | `dailyPv === 5` |
| TC-06 | dailyPvOverride | override=10 | `dailyPv === 10` |
| TC-07 | 完了予測日（SPI=1.0） | - | 計画終了日と一致 |
| TC-08 | 完了予測日（SPI<1.0） | SPI=0.5 | 計画終了日より後 |
| TC-09 | 完了予測日（SPI>1.0） | SPI=2.0 | 計画終了日より前 |

### 4.2 境界値

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-10 | タスク0件 | 空プロジェクト | `bac === 0` |
| TC-11 | EV=BAC（完了済み） | EV=100, BAC=100 | `etcPrime === 0` |
| TC-12 | EV=0（未着手） | EV=0, BAC=100 | `etcPrime === 100/SPI` |

### 4.3 異常系

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-13 | SPI=0 | PV=0 | `etcPrime === Infinity` |
| TC-14 | 日付なし | startDate/endDate未設定 | `estimatedCompletionDate === undefined` |
| TC-15 | dailyPv=0 | 稼働日0 | `estimatedCompletionDate === undefined` |

---

## 5. 使用例

```typescript
const project = await creator.createProject()

// 基本指標の確認
console.log(`BAC: ${project.bac}人日`)
console.log(`現在EV: ${project.totalEv}人日`)
console.log(`SPI: ${project.totalSpi}`)

// 完了予測
console.log(`ETC': ${project.etcPrime}人日`)
console.log(`完了予測日: ${project.estimatedCompletionDate}`)

// 日あたりPVの手動設定（タスク待ち補正）
project.setDailyPvOverride(5.0)
console.log(`補正後の完了予測日: ${project.estimatedCompletionDate}`)

// オーバーライド解除
project.setDailyPvOverride(undefined)
```

---

## 6. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-EVM-001 AC-01 | Project.bacでBACを取得できる | TC-01, TC-10 | ✅ PASS |
| REQ-EVM-001 AC-02 | Project.etcPrimeでETC'を取得できる | TC-04, TC-11, TC-12, TC-13 | ✅ PASS |
| REQ-EVM-001 AC-03 | Project.estimatedCompletionDateで完了予測日を取得できる | TC-07, TC-08, TC-09, TC-14, TC-15 | ✅ PASS |
| REQ-EVM-001 AC-04 | SPI=1.0の場合、完了予測日が計画終了日と一致 | TC-07 | ✅ PASS |
| REQ-EVM-001 AC-05 | SPI<1.0の場合、完了予測日が計画終了日より後 | TC-08 | ✅ PASS |
| REQ-EVM-001 AC-06 | SPI>1.0の場合、完了予測日が計画終了日より前 | TC-09 | ✅ PASS |
| REQ-EVM-001 AC-07 | dailyPVOverrideが日あたりPVとして使用される | TC-06 | ✅ PASS |
| REQ-EVM-001 AC-08 | 既存のテストが全てPASS | - | ✅ PASS (107件) |

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-01-22 | 初版作成 | REQ-EVM-001 |
| 1.1.0 | 2025-01-22 | 実装完了に伴う仕様更新: totalEv/totalSpiをstatisticsByProject共通化、トレーサビリティ結果反映 | REQ-EVM-001 |
