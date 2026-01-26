# 案件設計書: 完了予測機能の整理とフィルタ対応

**要件ID**: REQ-REFACTOR-002
**GitHub Issue**: #140
**作成日**: 2026-01-26
**バージョン**: 1.0.0

---

## 1. 概要

### 1.1 目的

完了予測機能（`calculateCompletionForecast`）を高性能版として統一し、簡易版（`getStatistics` 内の `completionForecast`）は内部でそれを呼び出す構造に整理する。

### 1.2 関連要件

- [REQ-REFACTOR-002](../../requirements/REQ-REFACTOR-002.md) - 完了予測機能の整理とフィルタ対応

### 1.3 対象クラス

- `Project` (`src/domain/Project.ts`)

---

## 2. インターフェース仕様

### 2.1 新設: `_calculateBasicStats()`

基本統計（spi, totalEv, bac）のみを計算する内部メソッド。

```typescript
/**
 * 基本統計のみを計算（循環参照回避用）
 * @param tasks リーフタスクの配列
 * @returns BasicStats
 */
private _calculateBasicStats(tasks: TaskRow[]): BasicStats
```

#### 型定義

```typescript
interface BasicStats {
  /** 総EV（出来高） */
  totalEv: number | undefined
  /** SPI（スケジュール効率） */
  spi: number | undefined
  /** BAC（総工数） */
  bac: number | undefined
}
```

### 2.2 拡張: `calculateCompletionForecast()` オーバーロード

```typescript
/**
 * 完了予測を計算（プロジェクト全体）
 */
calculateCompletionForecast(): CompletionForecast | undefined

/**
 * 完了予測を計算（フィルタ + オプション指定）
 * @param options フィルタ条件と予測オプション
 */
calculateCompletionForecast(
  options: CompletionForecastOptions & StatisticsOptions
): CompletionForecast | undefined

/**
 * 完了予測を計算（タスク配列指定）
 * @param tasks 対象タスク配列
 * @param options 予測オプション
 */
calculateCompletionForecast(
  tasks: TaskRow[],
  options?: CompletionForecastOptions
): CompletionForecast | undefined
```

### 2.3 既存型（変更なし）

```typescript
interface CompletionForecastOptions {
  /** 手入力の日あたりPV（優先使用） */
  dailyPvOverride?: number
  /** 直近PV平均の計算日数（デフォルト: 7） */
  lookbackDays?: number
  /** 計算を打ち切る最大日数（デフォルト: 730 = 2年） */
  maxForecastDays?: number
}

interface CompletionForecast {
  etcPrime: number
  forecastDate: Date
  remainingWork: number
  usedDailyPv: number
  usedSpi: number
  dailyBurnRate: number
  confidence: 'high' | 'medium' | 'low'
  confidenceReason: string
}
```

---

## 3. 処理仕様

### 3.1 `_calculateBasicStats()` 処理フロー

```
入力: tasks: TaskRow[]

1. totalEv = sumEVs(tasks)
2. spi = calculateSPI(tasks, this._baseDate)
3. bac = sumWorkload(tasks)

出力: { totalEv, spi, bac }
```

### 3.2 `calculateCompletionForecast()` 処理フロー（改修後）

```
入力: optionsOrTasks?, options?

1. 引数の型を判定:
   - undefined → 全リーフタスク対象
   - TaskRow[] → 渡されたタスク対象（リーフのみ抽出）
   - StatisticsOptions含む → filterTasks() でフィルタ

2. リーフタスクを取得
   tasks = _resolveTasks(optionsOrTasks)

3. 基本統計を計算（循環参照を避ける）
   { spi, totalEv, bac } = _calculateBasicStats(tasks)

4. SPI チェック
   - spi === undefined || spi === 0 → return undefined

5. 残作業量計算
   remainingWork = bac - totalEv

6. 完了済みチェック
   - remainingWork <= 0 → return 完了済み結果

7. 日あたりPV決定
   usedDailyPv = options?.dailyPvOverride ?? calculateRecentDailyPv(lookbackDays)

8. dailyPv チェック
   - usedDailyPv === 0 → return undefined

9. 完了予測日計算
   dailyBurnRate = usedDailyPv × spi
   baseDateから稼働日ごとにdailyBurnRateを消化
   残作業量 <= 0 になった日 = forecastDate

10. maxForecastDays 超過チェック
    - 超過 → return undefined

11. 信頼性判定
    determineConfidence(spi, hasDailyPvOverride, forecastDate)

出力: CompletionForecast | undefined
```

### 3.3 `_calculateExtendedStats()` 処理フロー（改修後）

```
入力: tasks, spi, bac, totalEv

1. 高性能版を簡易モードで呼び出し
   forecast = this.calculateCompletionForecast(tasks, { dailyPvOverride: 1.0 })

2. 遅延統計を計算
   { delayedTaskCount, averageDelayDays, maxDelayDays } = _calculateDelayStats(tasks)

出力: {
  etcPrime: forecast?.etcPrime,
  completionForecast: forecast?.forecastDate,
  delayedTaskCount,
  averageDelayDays,
  maxDelayDays,
}
```

### 3.4 削除対象

- `_calculateCompletionForecastForTasks()` - 旧簡易版メソッド

---

## 4. テストケース

### 4.1 `_calculateBasicStats()` テスト

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|----------|
| TC-01 | 基本統計が正しく計算される | リーフタスク3件 | totalEv, spi, bac が算出 |
| TC-02 | 空配列の場合 | [] | totalEv=0, spi=undefined, bac=0 |
| TC-03 | PV=0の場合 | 全タスクPV=0 | spi=undefined |

### 4.2 `calculateCompletionForecast()` オーバーロードテスト

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|----------|
| TC-04 | 引数なしでプロジェクト全体 | calculateCompletionForecast() | 全タスク対象の予測 |
| TC-05 | フィルタオプション指定 | { filter: "認証" } | フィルタ結果の予測 |
| TC-06 | フィルタ + 予測オプション | { filter: "認証", dailyPvOverride: 2.0 } | フィルタ + 指定PVで予測 |
| TC-07 | タスク配列指定 | tasks, {} | 渡されたタスクの予測 |
| TC-08 | タスク配列 + オプション指定 | tasks, { lookbackDays: 14 } | 渡されたタスク + 指定オプションで予測 |

### 4.3 後方互換性テスト

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|----------|
| TC-09 | getStatistics() の completionForecast が従来と同じ | getStatistics() | 従来と同じ結果（PV=1.0固定） |
| TC-10 | getStatistics() の etcPrime が従来と同じ | getStatistics() | 従来と同じ結果 |
| TC-11 | getStatisticsByName() の completionForecast が従来と同じ | getStatisticsByName() | 担当者別に従来と同じ結果 |
| TC-12 | statisticsByProject が従来と同じ | statisticsByProject | 従来と同じ結果 |

### 4.4 リファクタリング検証テスト

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|----------|
| TC-13 | _calculateCompletionForecastForTasks が削除されている | - | メソッドが存在しない |
| TC-14 | 高性能版が _calculateBasicStats を使用 | calculateCompletionForecast() | statisticsByProject を参照しない |

### 4.5 境界値テスト

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|----------|
| TC-15 | SPI=0 | SPI=0のプロジェクト | undefined |
| TC-16 | dailyPv=0 | 全期間PV=0 | undefined |
| TC-17 | 完了済み | BAC=EV | etcPrime=0, forecastDate=baseDate |
| TC-18 | フィルタ結果が空 | { filter: "存在しない" } | undefined |

### 4.6 統合テスト

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|----------|
| TC-19 | フィルタ + 高精度版 + getStatistics 組み合わせ | 複合操作 | 全て整合した結果 |
| TC-20 | 既存テスト全件PASS | npm test | 全テストPASS |

---

## 5. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-REFACTOR-002 AC-01 | `_calculateBasicStats()` が spi, totalEv, bac を正しく計算すること | TC-01, TC-02, TC-03 | ✅ PASS |
| REQ-REFACTOR-002 AC-02 | `calculateCompletionForecast()` がフィルタ対応していること | TC-05, TC-06 | ✅ PASS |
| REQ-REFACTOR-002 AC-03 | `calculateCompletionForecast(tasks, options)` が動作すること | TC-07, TC-08 | ✅ PASS |
| REQ-REFACTOR-002 AC-04 | `getStatistics()` の `completionForecast` が従来と同じ結果を返すこと | TC-09, TC-12 | ✅ PASS |
| REQ-REFACTOR-002 AC-05 | `getStatistics()` の `etcPrime` が従来と同じ結果を返すこと | TC-10, TC-12 | ✅ PASS |
| REQ-REFACTOR-002 AC-06 | `_calculateCompletionForecastForTasks()` が削除されていること | TC-13 | ✅ PASS |
| REQ-REFACTOR-002 AC-07 | 高性能版呼び出し時に簡易版の計算が走らないこと | TC-14 | ✅ PASS |
| REQ-REFACTOR-002 AC-08 | 既存テストが全てPASSすること | TC-20 | ✅ PASS (221件) |

---

## 6. 実装ガイド

### 6.1 実装順序

1. `BasicStats` 型を追加
2. `_calculateBasicStats()` を実装
3. `calculateCompletionForecast()` のオーバーロードを追加
4. `calculateCompletionForecast()` 内部で `_calculateBasicStats()` を使用するよう修正
5. `_calculateExtendedStats()` で高性能版を呼び出すよう修正
6. `_calculateCompletionForecastForTasks()` を削除
7. テスト実行・確認

### 6.2 注意点

- **循環参照回避**: `calculateCompletionForecast()` は `statisticsByProject` を参照せず、`_calculateBasicStats()` を使用
- **後方互換性**: 既存の `calculateCompletionForecast()` 呼び出しが引き続き動作することを確認
- **簡易版の挙動**: `_calculateExtendedStats()` は `dailyPvOverride: 1.0` で高性能版を呼び出し

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-26 | 初版作成 | Claude |
| 1.1.0 | 2026-01-26 | 実装完了、トレーサビリティ更新 | Claude |
