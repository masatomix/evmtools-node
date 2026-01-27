# ProjectService.calculateRecentSpi 詳細設計書

**バージョン**: 1.0.0
**作成日**: 2026-01-27
**要件ID**: REQ-SPI-001
**GitHub Issue**: #139

---

## 1. 概要

### 1.1 目的

複数のProjectスナップショットから直近N日間のSPI（期間SPI）を計算する機能を `ProjectService` に追加する。

### 1.2 コンセプト

**「渡したProjectから取得できる最善のSPI」**

- 渡されたProject群の累積SPIの平均を返す
- 場合分け不要。常に平均。シンプル。

### 1.3 対象クラス

| 項目 | 値 |
|------|-----|
| クラス | `ProjectService` |
| ファイル | `src/domain/ProjectService.ts` |
| 追加メソッド | `calculateRecentSpi()` |

---

## 2. インターフェース仕様

### 2.1 メソッドシグネチャ

```typescript
/**
 * 複数のProjectスナップショットから期間SPIを計算する
 * 渡されたProject群の累積SPIの平均を返す
 *
 * @param projects Project配列
 * @param options オプション（フィルタ条件、警告閾値）
 * @returns 期間SPI。計算不能な場合はundefined
 */
calculateRecentSpi(
  projects: Project[],
  options?: RecentSpiOptions
): number | undefined
```

### 2.2 型定義

```typescript
import { TaskFilterOptions } from './Project'

/**
 * 期間SPI計算オプション
 */
interface RecentSpiOptions extends TaskFilterOptions {
  /**
   * 期間警告の閾値（日数）
   * この日数を超えると警告ログを出力
   * @default 30
   */
  warnThresholdDays?: number
}
```

### 2.3 戻り値

| 条件 | 戻り値 |
|------|--------|
| 正常計算 | `number`（期間SPI） |
| projects が空配列 | `undefined` |
| 全ProjectのSPIがundefined | `undefined` |

---

## 3. 処理仕様

### 3.1 メインロジック

```typescript
calculateRecentSpi(
  projects: Project[],
  options?: RecentSpiOptions
): number | undefined {
  // 1. 空配列チェック
  if (projects.length === 0) return undefined

  // 2. 期間チェックと警告
  this._warnIfPeriodTooLong(projects, options?.warnThresholdDays ?? 30)

  // 3. 各ProjectのSPIを取得
  const spis = projects
    .map(p => p.getStatistics(options ?? {}).spi)
    .filter((spi): spi is number => spi !== undefined)

  // 4. 全てundefinedなら計算不能
  if (spis.length === 0) return undefined

  // 5. 平均を返す
  return spis.reduce((a, b) => a + b, 0) / spis.length
}
```

### 3.2 期間チェック（内部メソッド）

```typescript
private _warnIfPeriodTooLong(
  projects: Project[],
  thresholdDays: number
): void {
  if (projects.length < 2) return

  // baseDateでソートして最古と最新を取得
  const sorted = [...projects].sort(
    (a, b) => a.baseDate.getTime() - b.baseDate.getTime()
  )
  const oldest = sorted[0].baseDate
  const newest = sorted[sorted.length - 1].baseDate

  // 日数差を計算
  const diffMs = newest.getTime() - oldest.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > thresholdDays) {
    logger.warn(
      `calculateRecentSpi: 期間が ${diffDays} 日と長いです。` +
      `直近SPIとしては不適切な可能性があります（閾値: ${thresholdDays} 日）`
    )
  }
}
```

### 3.3 処理フロー図

```
calculateRecentSpi(projects, options)
    │
    ├── projects.length === 0 ?
    │       └── Yes → return undefined
    │
    ├── _warnIfPeriodTooLong(projects, threshold)
    │       └── 期間 > threshold → logger.warn()
    │
    ├── 各ProjectのSPIを取得
    │       └── p.getStatistics(options).spi
    │
    ├── 有効なSPIをフィルタ
    │       └── .filter(spi => spi !== undefined)
    │
    ├── spis.length === 0 ?
    │       └── Yes → return undefined
    │
    └── return average(spis)
```

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-01 | 1点渡し | `[project]` (SPI=0.8) | `0.8` |
| TC-02 | 2点渡し | `[p1, p2]` (SPI=0.8, 1.0) | `0.9` |
| TC-03 | N点渡し | `[p1, p2, p3]` (SPI=0.8, 0.9, 1.0) | `0.9` |
| TC-04 | フィルタ付き | `[p1, p2], { filter: "認証" }` | フィルタ結果のSPI平均 |

### 4.2 境界値

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-05 | 空配列 | `[]` | `undefined` |
| TC-06 | 全SPIがundefined | `[p1, p2]` (両方SPI=undefined) | `undefined` |
| TC-07 | 一部SPIがundefined | `[p1, p2]` (SPI=0.8, undefined) | `0.8` |
| TC-08 | SPI=0のProject | `[p1, p2]` (SPI=0, 1.0) | `0.5` |

### 4.3 警告テスト

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-09 | 期間30日以内 | 期間=7日 | 警告なし、計算成功 |
| TC-10 | 期間30日超 | 期間=45日 | 警告あり、計算成功 |
| TC-11 | 閾値カスタム | 期間=20日, threshold=15 | 警告あり |
| TC-12 | 1点のみ | `[project]` | 警告なし（チェック対象外） |

### 4.4 既存機能への影響

| TC-ID | テストケース | 期待結果 |
|-------|-------------|----------|
| TC-13 | 既存テストが全てPASS | 既存テスト223件がPASS |

---

## 5. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-SPI-001 AC-01 | メソッドが追加されている | TC-01〜TC-04 | ⏳ |
| REQ-SPI-001 AC-02 | 累積SPIの平均を返す | TC-01, TC-02, TC-03 | ⏳ |
| REQ-SPI-001 AC-03 | 1点渡しで累積SPIを返す | TC-01 | ⏳ |
| REQ-SPI-001 AC-04 | フィルタ条件を指定できる | TC-04 | ⏳ |
| REQ-SPI-001 AC-05 | 全SPIがundefinedならundefined | TC-05, TC-06 | ⏳ |
| REQ-SPI-001 AC-06 | 期間超過で警告、計算続行 | TC-09, TC-10, TC-11 | ⏳ |
| REQ-SPI-001 AC-07 | 既存テストに影響なし | TC-13 | ⏳ |
| REQ-SPI-001 AC-08 | 単体テストが全てPASS | TC-01〜TC-13 | ⏳ |

---

## 6. 実装上の注意点

### 6.1 ロガーの取得

```typescript
import { getLogger } from '../logger'
const logger = getLogger('ProjectService')
```

### 6.2 TaskFilterOptions の再利用

`RecentSpiOptions` は `TaskFilterOptions` を拡張する。
`Project.getStatistics(options)` にそのまま渡せる設計。

### 6.3 日付差の計算

```typescript
// ミリ秒から日数へ変換
const diffMs = newest.getTime() - oldest.getTime()
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
```

---

## 7. 使用例

### 7.1 基本的な使い方

```typescript
import { ProjectService } from 'evmtools-node/domain'
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

const service = new ProjectService()

const projectNow = await new ExcelProjectCreator('now.xlsx').createProject()
const projectPrev = await new ExcelProjectCreator('prev.xlsx').createProject()

// 2点の平均SPI
const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])
console.log(`直近SPI: ${recentSpi}`)
```

### 7.2 フィルタ付き

```typescript
const filteredSpi = service.calculateRecentSpi(
  [projectPrev, projectNow],
  { filter: "認証機能" }
)
```

### 7.3 警告閾値をカスタマイズ

```typescript
const spi = service.calculateRecentSpi(
  [projectPrev, projectNow],
  { warnThresholdDays: 14 }  // 14日で警告
)
```

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-27 | 初版作成 | Claude Code |
