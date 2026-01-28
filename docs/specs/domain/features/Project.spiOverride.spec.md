# Project.calculateCompletionForecast spiOverride オプション詳細設計書

**バージョン**: 1.0.0
**作成日**: 2026-01-28
**要件ID**: REQ-SPI-002
**GitHub Issue**: #147

---

## 1. 概要

### 1.1 目的

`CompletionForecast` の計算で、累積SPIではなく外部から指定したSPI（直近N日SPIなど）を使用できる `spiOverride` オプションを追加する。

### 1.2 コンセプト

**「dailyPvOverride と同様に、SPIもユーザー指定できるようにする」**

- `dailyPvOverride` が日あたりPVを上書きするように、`spiOverride` がSPIを上書き
- `ProjectService.calculateRecentSpi()` で計算した直近N日SPIを渡すユースケースを想定
- 累積SPIとの使い分けはユーザーの判断に委ねる

### 1.3 対象クラス

| 項目 | 値 |
|------|-----|
| クラス | `Project` |
| ファイル | `src/domain/Project.ts` |
| 対象メソッド | `calculateCompletionForecast()` |
| 対象型 | `CompletionForecastOptions` |

---

## 2. インターフェース仕様

### 2.1 型定義の変更

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
     * @example
     * const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])
     * project.calculateCompletionForecast({ spiOverride: recentSpi })
     */
    spiOverride?: number
}
```

### 2.2 メソッドシグネチャ（変更なし）

```typescript
calculateCompletionForecast(): CompletionForecast | undefined
calculateCompletionForecast(
    options: CompletionForecastOptions & StatisticsOptions
): CompletionForecast | undefined
calculateCompletionForecast(
    tasks: TaskRow[],
    options?: CompletionForecastOptions
): CompletionForecast | undefined
```

### 2.3 戻り値の変更点

| プロパティ | 変更内容 |
|-----------|---------|
| `usedSpi` | `spiOverride` 指定時は指定値を返す |
| `confidence` | `spiOverride` 指定時は `'high'` |
| `confidenceReason` | `spiOverride` 指定時は `'ユーザーがSPIを指定'` |

---

## 3. 処理仕様

### 3.1 SPI決定ロジック

```typescript
// 変更前（行667-670）
const spi = basicStats.spi
if (spi === undefined || spi === null || spi === 0) {
    return undefined
}

// 変更後
const usedSpi = options?.spiOverride ?? basicStats.spi
if (usedSpi === undefined || usedSpi === null || usedSpi <= 0) {
    return undefined
}
```

**優先順位**: `spiOverride` > `累積SPI`

### 3.2 ETC' 計算

```typescript
// 変更前（行700）
const etcPrime = remainingWork / spi

// 変更後
const etcPrime = remainingWork / usedSpi
```

### 3.3 日あたり消化量計算

```typescript
// 変更前（行703）
const dailyBurnRate = usedDailyPv * spi

// 変更後
const dailyBurnRate = usedDailyPv * usedSpi
```

### 3.4 完了済みの場合（行678-689）

```typescript
// 変更前
if (remainingWork <= 0) {
    return {
        // ...
        usedSpi: spi,  // ← basicStats.spi
        // ...
    }
}

// 変更後
if (remainingWork <= 0) {
    return {
        // ...
        usedSpi: usedSpi,  // ← spiOverride または basicStats.spi
        // ...
    }
}
```

### 3.5 戻り値（行731-740）

```typescript
// 変更前
return {
    // ...
    usedSpi: spi,
    // ...
}

// 変更後
return {
    // ...
    usedSpi: usedSpi,
    // ...
}
```

### 3.6 信頼性判定の変更

```typescript
// 変更前（行746-777）
private determineConfidence(
    spi: number,
    hasDailyPvOverride: boolean,
    forecastDate: Date
): { confidence: 'high' | 'medium' | 'low'; confidenceReason: string }

// 変更後
private determineConfidence(
    spi: number,
    hasDailyPvOverride: boolean,
    hasSpiOverride: boolean,  // 新規パラメータ
    forecastDate: Date
): { confidence: 'high' | 'medium' | 'low'; confidenceReason: string } {
    // spiOverride 指定時は高信頼（最優先）
    if (hasSpiOverride) {
        return { confidence: 'high', confidenceReason: 'ユーザーがSPIを指定' }
    }

    // dailyPvOverride 指定時は高信頼（既存）
    if (hasDailyPvOverride) {
        return { confidence: 'high', confidenceReason: 'ユーザーが日あたりPVを指定' }
    }

    // ...既存のロジック（SPI範囲判定など）...
}
```

### 3.7 呼び出し元の変更（行725-729）

```typescript
// 変更前
const { confidence, confidenceReason } = this.determineConfidence(
    spi,
    options?.dailyPvOverride !== undefined,
    currentDate
)

// 変更後
const { confidence, confidenceReason } = this.determineConfidence(
    usedSpi,
    options?.dailyPvOverride !== undefined,
    options?.spiOverride !== undefined,  // 新規引数
    currentDate
)
```

### 3.8 処理フロー図

```
calculateCompletionForecast(options)
    │
    ├── 基本統計取得: _calculateBasicStats(tasks)
    │
    ├── SPI決定（★変更点）
    │       ├── spiOverride指定あり → usedSpi = spiOverride
    │       └── spiOverride指定なし → usedSpi = basicStats.spi
    │
    ├── usedSpi <= 0 or undefined ?
    │       └── Yes → return undefined
    │
    ├── 残作業量計算: remainingWork = bac - ev
    │
    ├── 完了済みチェック
    │       └── remainingWork <= 0 → 完了済み結果を返す（usedSpi含む）
    │
    ├── 日あたりPV決定（既存）
    │       ├── dailyPvOverride指定あり → usedDailyPv = dailyPvOverride
    │       └── dailyPvOverride指定なし → usedDailyPv = calculateRecentDailyPv()
    │
    ├── ETC' 計算: etcPrime = remainingWork / usedSpi
    │
    ├── 日あたり消化量: dailyBurnRate = usedDailyPv * usedSpi
    │
    ├── 完了予測日計算（稼働日ループ）
    │
    └── 信頼性判定（★変更点）
            ├── hasSpiOverride → 'high', 'ユーザーがSPIを指定'
            ├── hasDailyPvOverride → 'high', 'ユーザーが日あたりPVを指定'
            └── ...既存ロジック...
```

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-01 | spiOverride 指定で usedSpi が設定される | `{ spiOverride: 0.9 }` | `usedSpi: 0.9` |
| TC-02 | spiOverride 指定で confidence が high | `{ spiOverride: 0.9 }` | `confidence: 'high'` |
| TC-03 | spiOverride + dailyPvOverride 併用 | `{ spiOverride: 0.9, dailyPvOverride: 2.0 }` | 両方が使用される |
| TC-04 | spiOverride + filter 併用 | `{ spiOverride: 0.8, filter: "認証" }` | フィルタ結果に対してspiOverride使用 |

### 4.2 ETC' 計算

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-05 | ETC' = remainingWork / spiOverride | 残作業20, spiOverride=0.8 | `etcPrime: 25` |
| TC-06 | dailyBurnRate = dailyPv * spiOverride | dailyPv=2, spiOverride=0.8 | `dailyBurnRate: 1.6` |

### 4.3 信頼性判定

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-07 | spiOverride で高信頼（SPI範囲外でも） | `{ spiOverride: 0.3 }` | `confidence: 'high'`（累積SPIなら'low'になる範囲） |
| TC-08 | confidenceReason が正しい | `{ spiOverride: 0.9 }` | `confidenceReason: 'ユーザーがSPIを指定'` |

### 4.4 境界値

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-09 | spiOverride: 0 | `{ spiOverride: 0 }` | `undefined`（0除算回避） |
| TC-10 | spiOverride: 負の値 | `{ spiOverride: -0.5 }` | `undefined`（無効な値） |
| TC-11 | spiOverride: 非常に小さい値 | `{ spiOverride: 0.001 }` | 正常計算（maxForecastDays 超過で undefined の可能性） |

### 4.5 後方互換性

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-12 | spiOverride 未指定時は累積SPI使用 | `{}` | 累積SPIを使用（既存動作） |
| TC-13 | 既存テストが全てPASS | - | 全テスト PASS |

---

## 5. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-SPI-002 AC-01 | `spiOverride?: number` が追加されている | TC-01 | ✅ PASS |
| REQ-SPI-002 AC-02 | ETC' が `remainingWork / spiOverride` で計算される | TC-05 | ✅ PASS |
| REQ-SPI-002 AC-03 | `dailyBurnRate` が `dailyPv × spiOverride` で計算される | TC-06 | ✅ PASS |
| REQ-SPI-002 AC-04 | `usedSpi` が指定値を返す | TC-01 | ✅ PASS |
| REQ-SPI-002 AC-05 | `confidence: 'high'` が返される | TC-02, TC-07 | ✅ PASS |
| REQ-SPI-002 AC-06 | `spiOverride: 0` で `undefined` | TC-09 | ✅ PASS |
| REQ-SPI-002 AC-07 | 未指定時は累積SPIを使用 | TC-12 | ✅ PASS |
| REQ-SPI-002 AC-08 | マスター設計書が更新されている | ドキュメント確認 | ✅ PASS |
| REQ-SPI-002 AC-09 | 単体テストが全てPASS | TC-01〜TC-13 | ✅ PASS (13件) |
| REQ-SPI-002 AC-10 | 既存テストが全てPASS | TC-13 | ✅ PASS (248件) |

> **ステータス凡例**:
> - ⏳: 未実装
> - ✅ PASS: テスト合格
> - ❌ FAIL: テスト失敗

---

## 6. 実装上の注意点

### 6.1 変更箇所一覧

| ファイル | 行番号（目安） | 変更内容 |
|----------|--------------|---------|
| `src/domain/Project.ts` | 928-935 | `CompletionForecastOptions` に `spiOverride` 追加 |
| `src/domain/Project.ts` | 667-670 | SPI決定ロジック変更 |
| `src/domain/Project.ts` | 678-689 | 完了済みケースの `usedSpi` 修正 |
| `src/domain/Project.ts` | 700 | ETC'計算で `usedSpi` 使用 |
| `src/domain/Project.ts` | 703 | dailyBurnRate計算で `usedSpi` 使用 |
| `src/domain/Project.ts` | 725-729 | `determineConfidence` 呼び出し変更 |
| `src/domain/Project.ts` | 736 | 戻り値の `usedSpi` 修正 |
| `src/domain/Project.ts` | 746-777 | `determineConfidence` シグネチャ・ロジック変更 |

### 6.2 負の値・無効値の扱い

```typescript
// spiOverride <= 0 は undefined 扱い（0除算回避）
const usedSpi = options?.spiOverride ?? basicStats.spi
if (usedSpi === undefined || usedSpi === null || usedSpi <= 0) {
    return undefined
}
```

### 6.3 エクスポート

`CompletionForecastOptions` は既にエクスポート済みのため、追加作業不要。

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

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-28 | 初版作成 | Claude Code |
