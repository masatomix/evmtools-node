# 要件定義書: CompletionForecast に spiOverride オプション追加

**要件ID**: REQ-SPI-002
**GitHub Issue**: #147
**作成日**: 2026-01-28
**ステータス**: Draft
**優先度**: High
**前提要件**: REQ-SPI-001（直近N日SPI計算機能）

---

## 1. 概要

`CompletionForecast` の計算で、累積SPIではなく外部から指定したSPI（直近N日SPIなど）を使用できるオプションを追加する。

**参照**: GitHub Issue #147

---

## 2. 背景・目的

### 2.1 背景

Issue #145 で Statistics と CompletionForecast の設計方針を整理した際、以下の結論に至った：

| 指標 | 使用するSPI | 使用するdailyPv |
|------|------------|-----------------|
| Statistics.spi | 累積SPI | - |
| Statistics.etcPrime | 累積SPI | - |
| CompletionForecast.etcPrime | 累積SPI（※） | - |
| CompletionForecast.forecastDate | 累積SPI（※） | 直近7日平均PV |

**※ 現状は累積SPIを使用。本要件で直近N日SPIを使用可能にする**

### 2.2 現状の課題

1. 累積SPIは「プロジェクト開始からの平均」であり、直近の生産性を反映していない
2. 完了予測に直近の生産性（直近N日SPI）を反映したいユースケースがある
3. Issue #139 で `ProjectService.calculateRecentSpi()` が実装済みだが、CompletionForecast で使用する手段がない

### 2.3 目的

1. CompletionForecast の計算で、外部から指定したSPIを使用できるようにする
2. `ProjectService.calculateRecentSpi()` で計算した直近N日SPIを完了予測に反映できるようにする
3. 累積SPIとの使い分けをユーザーの判断に委ねる柔軟な設計

### 2.4 制約

- 既存の `calculateCompletionForecast()` のデフォルト動作（累積SPI使用）は変更しない
- `spiOverride` が指定された場合のみ、指定されたSPIを使用する
- 直近N日SPIの計算自体はスコープ外（REQ-SPI-001 で実装済み）

---

## 3. 機能要件

### 3.1 主要機能

#### FR-01: spiOverride オプションの追加

`CompletionForecastOptions` に `spiOverride` プロパティを追加する。

```typescript
interface CompletionForecastOptions {
  dailyPvOverride?: number     // 既存: 手入力の日あたりPV
  lookbackDays?: number        // 既存: 直近PV平均の計算日数
  maxForecastDays?: number     // 既存: 計算を打ち切る最大日数
  spiOverride?: number         // 新規: 外部から指定するSPI
}
```

#### FR-02: spiOverride 使用時の動作

- `spiOverride` が指定された場合、累積SPIの代わりに指定値を使用
- ETC' の計算: `etcPrime = remainingWork / spiOverride`
- 日あたり消化量: `dailyBurnRate = dailyPv × spiOverride`
- CompletionForecast.usedSpi に指定値が設定される

#### FR-03: 信頼性判定への影響

- `spiOverride` 指定時は `confidence: 'high'` を返す
- `confidenceReason: 'ユーザーがSPIを指定'`
- dailyPvOverride と同様の扱い（ユーザー指定は高信頼）

### 3.2 スコープ外

| 項目 | 理由 |
|------|------|
| Statistics.spi の変更 | 累積SPIは従来通り維持 |
| 直近N日SPIの自動計算 | 複数Projectが必要なため呼び出し側の責務 |
| CompletionForecast.usedSpi の型変更 | 既存互換性維持 |

---

## 4. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の `calculateCompletionForecast()` のデフォルト動作に影響を与えないこと |
| NF-02 | `spiOverride` 未指定時は累積SPIを使用すること（後方互換性） |
| NF-03 | `spiOverride: 0` が指定された場合は undefined を返すこと（0除算回避） |
| NF-04 | `spiOverride` と累積SPIの両方が利用可能な場合、`spiOverride` が優先されること |

---

## 5. 受け入れ基準

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | `CompletionForecastOptions` に `spiOverride?: number` が追加されている |
| AC-02 | `spiOverride` 指定時、ETC' が `remainingWork / spiOverride` で計算される |
| AC-03 | `spiOverride` 指定時、`dailyBurnRate` が `dailyPv × spiOverride` で計算される |
| AC-04 | `spiOverride` 指定時、`CompletionForecast.usedSpi` が指定値を返す |
| AC-05 | `spiOverride` 指定時、`confidence: 'high'` が返される |
| AC-06 | `spiOverride: 0` の場合、`undefined` が返される（0除算回避） |
| AC-07 | `spiOverride` 未指定時、累積SPIが使用される（後方互換性） |
| AC-08 | マスター設計書（Project.spec.md）が更新されている |
| AC-09 | 単体テストが実装され、全てPASSしている |
| AC-10 | 既存テストが全てPASSしている |

---

## 6. インターフェース設計

### 6.1 型定義の変更

```typescript
/**
 * 完了予測オプション
 */
export interface CompletionForecastOptions {
  /** 手入力の日あたりPV（優先使用） */
  dailyPvOverride?: number
  /** 直近PV平均の計算日数（デフォルト: 7） */
  lookbackDays?: number
  /** 計算を打ち切る最大日数（デフォルト: 730 = 2年） */
  maxForecastDays?: number
  /**
   * 外部から指定するSPI（優先使用）
   * ProjectService.calculateRecentSpi() で計算した直近N日SPIを指定可能
   */
  spiOverride?: number
}
```

### 6.2 calculateCompletionForecast() の変更

```typescript
// 変更箇所（擬似コード）
calculateCompletionForecast(...) {
  // ...既存のコード...

  // SPI の決定（spiOverride > 累積SPI）
  const usedSpi = options?.spiOverride ?? basicStats.spi

  if (usedSpi === undefined || usedSpi === null || usedSpi === 0) {
    return undefined
  }

  // ETC' の計算
  const etcPrime = remainingWork / usedSpi

  // 日あたり消化量
  const dailyBurnRate = usedDailyPv * usedSpi

  // ...完了予測日の計算...

  // 信頼性の判定
  const { confidence, confidenceReason } = this.determineConfidence(
    usedSpi,
    options?.dailyPvOverride !== undefined,
    options?.spiOverride !== undefined,  // 新規: spiOverride指定フラグ
    currentDate
  )

  return {
    etcPrime,
    forecastDate: currentDate,
    remainingWork,
    usedDailyPv,
    usedSpi,
    dailyBurnRate,
    confidence,
    confidenceReason,
  }
}
```

### 6.3 determineConfidence() の変更

```typescript
private determineConfidence(
  spi: number,
  hasDailyPvOverride: boolean,
  hasSpiOverride: boolean,  // 新規パラメータ
  forecastDate: Date
): { confidence: 'high' | 'medium' | 'low'; confidenceReason: string } {
  // spiOverride 指定時は高信頼
  if (hasSpiOverride) {
    return { confidence: 'high', confidenceReason: 'ユーザーがSPIを指定' }
  }

  // dailyPvOverride 指定時は高信頼（既存）
  if (hasDailyPvOverride) {
    return { confidence: 'high', confidenceReason: 'ユーザーが日あたりPVを指定' }
  }

  // ...既存のロジック...
}
```

---

## 7. 使用例

### 7.1 基本的な使い方

```typescript
import { ProjectService } from 'evmtools-node/domain'
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

const service = new ProjectService()

// 複数のProjectスナップショットを用意
const projectNow = await new ExcelProjectCreator('now.xlsx').createProject()
const projectPrev = await new ExcelProjectCreator('prev.xlsx').createProject()

// 直近N日SPIを計算（REQ-SPI-001）
const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

// 直近N日SPIを使用した完了予測
const forecast = projectNow.calculateCompletionForecast({
  spiOverride: recentSpi
})

console.log(`ETC': ${forecast?.etcPrime}`)
console.log(`完了予測日: ${forecast?.forecastDate}`)
console.log(`使用したSPI: ${forecast?.usedSpi}`)  // recentSpi と同じ
console.log(`信頼性: ${forecast?.confidence}`)      // 'high'
```

### 7.2 累積SPIとの比較

```typescript
// 累積SPIを使用（デフォルト）
const forecastCumulative = project.calculateCompletionForecast()

// 直近N日SPIを使用
const forecastRecent = project.calculateCompletionForecast({
  spiOverride: recentSpi
})

console.log('--- 累積SPI使用 ---')
console.log(`SPI: ${forecastCumulative?.usedSpi}`)
console.log(`完了予測日: ${forecastCumulative?.forecastDate}`)

console.log('--- 直近N日SPI使用 ---')
console.log(`SPI: ${forecastRecent?.usedSpi}`)
console.log(`完了予測日: ${forecastRecent?.forecastDate}`)
```

### 7.3 フィルタとの組み合わせ

```typescript
// 認証機能の直近N日SPI
const authRecentSpi = service.calculateRecentSpi(
  [projectPrev, projectNow],
  { filter: '認証' }
)

// 認証機能の完了予測（直近SPI使用）
const authForecast = project.calculateCompletionForecast({
  filter: '認証',
  spiOverride: authRecentSpi
})
```

---

## 8. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| 前提要件 | [REQ-SPI-001.md](./REQ-SPI-001.md) |
| マスター設計書 | [Project.spec.md](../domain/master/Project.spec.md) |
| 設計方針 | Project.spec.md セクション 12.1 |
| 関連Issue | #145 (設計方針整理), #139 (直近N日SPI計算) |

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-28 | 初版作成 | Claude Code |
