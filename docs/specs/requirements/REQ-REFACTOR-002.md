# 要件定義書: 完了予測機能の整理とフィルタ対応

**要件ID**: REQ-REFACTOR-002
**GitHub Issue**: #140
**作成日**: 2026-01-26
**ステータス**: Draft
**優先度**: High

---

## 1. 概要

### 1.1 目的

完了予測機能（`calculateCompletionForecast`）を高性能版として統一し、簡易版（`getStatistics` 内の `completionForecast`）は内部でそれを呼び出す構造に整理する。これにより、計算ロジックの重複を排除し、フィルタ対応・タスク配列渡し対応を実現する。

### 1.2 背景

現在、完了予測に関する機能が2系統存在し、以下の問題がある:

1. **無駄な計算**: 高精度版（`calculateCompletionForecast`）を呼ぶと、内部で `statisticsByProject[0]` を参照するため、簡易版の計算も実行される
2. **ロジックの重複**: `etcPrime`、完了予測日が2箇所で計算される
3. **フィルタ非対応**: 高精度版はフィルタに対応していない
4. **結果の不整合リスク**: 同じ名前で異なる計算方法（PV=1.0固定 vs 直近N日平均PV）

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| `_calculateBasicStats()` の新設 | ✅ |
| `calculateCompletionForecast()` のフィルタ対応 | ✅ |
| `calculateCompletionForecast()` のタスク配列渡し対応 | ✅ |
| `_calculateExtendedStats()` の修正（高性能版を呼び出す） | ✅ |
| `_calculateCompletionForecastForTasks()` の削除 | ✅ |
| 既存APIの互換性維持 | ✅ |
| 仕様書の更新 | ✅ |

---

## 2. 機能要件

### 2.1 新設: `_calculateBasicStats()`

基本統計（spi, totalEv, bac）のみを計算する内部メソッドを新設し、循環参照を回避する。

```typescript
private _calculateBasicStats(tasks: TaskRow[]): BasicStats {
  return {
    totalEv: sumEVs(tasks),
    spi: calculateSPI(tasks, this._baseDate),
    bac: sumWorkload(tasks)
  }
}

interface BasicStats {
  totalEv: number | undefined
  spi: number | undefined
  bac: number | undefined
}
```

### 2.2 拡張: `calculateCompletionForecast()` オーバーロード

`getStatistics()` と同様のオーバーロードパターンを実装:

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

### 2.3 修正: `_calculateExtendedStats()`

高性能版を `dailyPvOverride: 1.0` で呼び出すように変更:

```typescript
private _calculateExtendedStats(tasks: TaskRow[], ...): ExtendedStats {
  // 高性能版を簡易モード（PV=1.0固定）で呼び出し
  const forecast = this._calculateCompletionForecastInternal(tasks, {
    dailyPvOverride: 1.0
  })

  return {
    etcPrime: forecast?.etcPrime,
    completionForecast: forecast?.forecastDate,
    delayedTaskCount,
    averageDelayDays,
    maxDelayDays,
  }
}
```

### 2.4 削除: `_calculateCompletionForecastForTasks()`

旧簡易版メソッドを削除。計算ロジックは高性能版に統一。

### 2.5 影響範囲

| 対象 | 影響 |
|------|------|
| `getStatistics()` | 内部実装変更、API変更なし |
| `getStatisticsByName()` | 内部実装変更、API変更なし |
| `calculateCompletionForecast()` | オーバーロード追加（後方互換） |
| `statisticsByProject` | 変更なし |
| `statisticsByName` | 変更なし |

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の `getStatistics()` / `statisticsByProject` の返り値に変更がないこと |
| NF-02 | `calculateCompletionForecast()` の既存の使用方法が引き続き動作すること |
| NF-03 | 高性能版呼び出し時に簡易版の計算が不要に実行されないこと |

---

## 4. インターフェース設計

### 4.1 改善後の構造

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     改善後の構造（高性能版を核に統一）                         │
└─────────────────────────────────────────────────────────────────────────────┘

                   ┌─────────────────────────────────────┐
                   │ _calculateBasicStats(tasks)         │
                   │ → spi, totalEv, bac のみ計算        │
                   │ （循環参照を避けるため分離）          │
                   └───────────────┬─────────────────────┘
                                   │
                                   ▼
                   ┌─────────────────────────────────────┐
                   │ calculateCompletionForecast()       │
                   │ 【高性能版・全機能・唯一の計算ロジック】│
                   ├─────────────────────────────────────┤
                   │ ✅ フィルタ対応                      │
                   │ ✅ タスク配列渡し対応                │
                   │ ✅ 直近N日PV / 手入力PV             │
                   │ ✅ 信頼度判定                       │
                   └───────────────┬─────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │ デフォルト値で呼び出し          │
                   ▼                               ▼
    ┌─────────────────────────────┐    ┌─────────────────────────────┐
    │ _calculateExtendedStats()   │    │ 外部から直接呼び出し         │
    │ (getStatistics経由)         │    │ (詳細オプション指定)         │
    ├─────────────────────────────┤    └─────────────────────────────┘
    │ calculateCompletionForecast(│
    │   tasks,                    │
    │   { dailyPvOverride: 1.0 }  │  ← PV=1.0固定（簡易版の挙動を再現）
    │ )                           │
    └─────────────────────────────┘
```

### 4.2 CompletionForecastOptions（既存 + 拡張）

```typescript
interface CompletionForecastOptions {
  /** 手入力の日あたりPV（優先使用） */
  dailyPvOverride?: number
  /** 直近PV平均の計算日数（デフォルト: 7） */
  lookbackDays?: number
  /** 計算を打ち切る最大日数（デフォルト: 730 = 2年） */
  maxForecastDays?: number
}
```

### 4.3 CompletionForecast（既存、変更なし）

```typescript
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

## 5. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | `_calculateBasicStats()` が spi, totalEv, bac を正しく計算すること | ⏳ | TC-01 |
| AC-02 | `calculateCompletionForecast()` がフィルタ対応していること | ⏳ | TC-02 |
| AC-03 | `calculateCompletionForecast(tasks, options)` が動作すること | ⏳ | TC-03 |
| AC-04 | `getStatistics()` の `completionForecast` が従来と同じ結果を返すこと | ⏳ | TC-04 |
| AC-05 | `getStatistics()` の `etcPrime` が従来と同じ結果を返すこと | ⏳ | TC-05 |
| AC-06 | `_calculateCompletionForecastForTasks()` が削除されていること | ⏳ | TC-06 |
| AC-07 | 高性能版呼び出し時に簡易版の計算が走らないこと | ⏳ | TC-07 |
| AC-08 | 既存テストが全てPASSすること | ⏳ | 既存テスト |

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| マスター設計書 | [`Project.spec.md`](../domain/master/Project.spec.md) | 更新対象 |
| 案件設計書 | [`Project.completion-forecast-refactor.spec.md`](../domain/features/Project.completion-forecast-refactor.spec.md) | 本案件の詳細仕様（作成予定） |
| 実装 | [`Project.ts`](../../../src/domain/Project.ts) | 修正対象 |
| 関連Issue | #139 | 直近N日のSPI計算機能（将来統合予定） |
| 関連Issue | #142 (PR #143) | 重複アクセサ削除（対応済み） |

---

## 7. 備考

### 7.1 設計の経緯

- PR #143 で `bac`, `totalEv`, `etcPrime` の直接アクセサが削除され、`statisticsByProject` に統一
- その際、`calculateCompletionForecast()` が `statisticsByProject[0]` を参照する構造となった
- 結果として、高性能版を呼ぶと簡易版の計算も走る非効率な状態に
- 本リファクタリングで、高性能版を核に据えた設計に統一

### 7.2 互換性

- **後方互換**: 既存の `calculateCompletionForecast()` 呼び出しは引き続き動作
- **新機能**: フィルタ対応、タスク配列渡し対応が追加
- **内部変更**: `getStatistics()` の内部実装が変更されるが、返り値は同一

### 7.3 将来の拡張

- #139（直近N日のSPI計算）も高性能版に追加する想定
- `spiOverride` オプションの追加で累積SPI / 直近SPIを切り替え可能に
