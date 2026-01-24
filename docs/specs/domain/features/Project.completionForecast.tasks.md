# Project.completionForecast タスク管理

**要件ID**: REQ-EVM-001
**GitHub Issue**: #94
**ブランチ**: `feature/94-evm-indicators-v2`
**作成日**: 2026-01-23

---

## 進捗サマリー

| フェーズ | 状況 | 完了数 |
|---------|------|--------|
| 仕様策定 | ✅ 完了 | 2/2 |
| 実装 | ✅ 完了 | 5/5 |
| 検証 | ✅ 完了 | 3/3 |
| **合計** | | **10/10** |

---

## タスク一覧

### Phase 1: 仕様策定

| ID | タスク | 状況 | 担当 | 備考 |
|----|--------|------|------|------|
| T-01 | 要件定義書作成 | ✅ 完了 | Claude | `REQ-EVM-001.md` |
| T-02 | 詳細仕様書作成 | ✅ 完了 | Claude | `Project.completionForecast.spec.md` |

### Phase 2: 実装

| ID | タスク | 状況 | 担当 | 備考 |
|----|--------|------|------|------|
| T-03 | 型定義の追加 | ✅ 完了 | Claude | `CompletionForecastOptions`, `CompletionForecast` |
| T-04 | テストコード作成 | ✅ 完了 | Claude | TC-01〜TC-27（27件）PASS |
| T-05 | Project.bac 実装 | ✅ 完了 | Claude | 全リーフタスクのworkload合計 |
| T-06 | Project.etcPrime 実装 | ✅ 完了 | Claude | (BAC - EV) / SPI |
| T-07 | Project.calculateCompletionForecast 実装 | ✅ 完了 | Claude | 完了予測日の計算 |

### Phase 3: 検証

| ID | タスク | 状況 | 担当 | 備考 |
|----|--------|------|------|------|
| T-08 | 単体テスト実行・PASS確認 | ✅ 完了 | Claude | 27件 PASS |
| T-09 | 既存テストの回帰確認 | ✅ 完了 | Claude | 134件 PASS（回帰なし） |
| T-10 | 要件トレーサビリティ更新 | ✅ 完了 | Claude | 結果を ✅ PASS に更新 |

---

## 依存関係

```
T-01 ─┬─▶ T-03 ─▶ T-04 ─┬─▶ T-05 ─▶ T-06 ─▶ T-07 ─▶ T-08 ─▶ T-09 ─▶ T-10
T-02 ─┘                  │
                         └─ テストファースト: テストを先に書く
```

---

## 実装詳細

### T-03: 型定義の追加

**ファイル**: `src/domain/Project.ts`

```typescript
export interface CompletionForecastOptions {
  dailyPvOverride?: number
  lookbackDays?: number      // デフォルト: 7
  maxForecastDays?: number   // デフォルト: 730
}

export interface CompletionForecast {
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

### T-04: テストコード作成

**ファイル**: `src/domain/__tests__/Project.completionForecast.test.ts`

テストケース（27件）:
- TC-01〜TC-04: BAC の計算
- TC-05〜TC-09: ETC' の計算
- TC-10〜TC-16: 完了予測日の計算
- TC-17〜TC-20: 日あたりPV の決定
- TC-21〜TC-24: 信頼性の判定
- TC-25〜TC-27: エッジケース

### T-05: Project.bac 実装

```typescript
get bac(): number {
  return this.toTaskRows()
    .filter(task => task.isLeaf)
    .reduce((sum, task) => sum + (task.workload ?? 0), 0)
}
```

### T-06: Project.etcPrime 実装

```typescript
get etcPrime(): number | undefined {
  const stats = this.statisticsByProject[0]
  const spi = stats?.spi
  if (!spi || spi === 0) return undefined

  const ev = stats?.totalEv ?? 0
  return (this.bac - ev) / spi
}
```

### T-07: Project.calculateCompletionForecast 実装

主要ロジック:
1. 残作業量 = BAC - EV
2. dailyPv = dailyPvOverride ?? 直近N日平均（固定）
3. 稼働日ごとに dailyPv × SPI を消化
4. 残作業量 ≤ 0 の日 = 完了予測日

---

## テスト実行コマンド

```bash
# 全テスト実行
npm test

# completionForecast のテストのみ
npm test -- --testPathPattern="completionForecast"

# ウォッチモード
npm test -- --watch --testPathPattern="completionForecast"
```

---

## 完了条件

- [x] 全テストケース（TC-01〜TC-27）が PASS
- [x] 既存テストが全て PASS（回帰なし）- 134件 PASS
- [x] 要件トレーサビリティが全て ✅ PASS
- [x] ESLint / Prettier エラーなし

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-23 | 初版作成 |
| 2026-01-23 | 実装完了（全タスク完了） |
