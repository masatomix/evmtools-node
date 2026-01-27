# 要件定義書: 直近N日のSPI計算機能

**要件ID**: REQ-SPI-001
**GitHub Issue**: #139
**作成日**: 2026-01-27
**ステータス**: Draft
**優先度**: High

---

## 1. 概要

複数の基準日のProjectスナップショットから、直近N日間のSPI（Schedule Performance Index）を計算する機能を追加する。完了予測（CompletionForecast）に直近の生産性を反映するための基盤機能。

**コンセプト: 「渡したProjectから取得できる最善のSPI」**

---

## 2. 背景・目的

### 2.1 背景

- 現在のSPIは「プロジェクト開始からの累積」で計算されている
- 過去すべてのデータが加味されるため、**直近の動きを表していない**
- 完了予測（etcPrime, completionForecast）に直近の生産性を反映したい

### 2.2 現状

| 指標 | 直近N日版 | 実装状況 |
|------|----------|:--------:|
| PV | `calculateRecentDailyPv(lookbackDays)` | ✅ 実装済み |
| SPI | - | ❌ **未実装** |

### 2.3 目的

1. 直近N日間のSPI（期間SPI）を計算する機能を提供する
2. Issue #147 (`spiLookbackDays` オプション) の前提機能として実装する
3. プロジェクトの「今の勢い」をより正確に把握できるようにする
4. データ量に応じた柔軟な計算（1点〜N点対応）

### 2.4 制約

- 累積SPIの計算ロジックには影響を与えない（新規関数として追加）
- 期間内にPVが0の場合は計算不能（undefined）
- 過去のProjectスナップショット（Excelファイル）が必要

---

## 3. 機能要件

### 3.1 主要機能

#### FR-01: 複数Projectからの期間SPI計算

**入力**: Project配列（古い順）+ オプションのフィルタ条件
**出力**: 期間SPI（number | undefined）

| 渡す数 | 計算方法 | 説明 |
|:------:|---------|------|
| 1点 | 累積SPI | `project.getStatistics(filter).spi` |
| 2点 | 期間SPI | `deltaEV / deltaPV` |
| N点 | 各点SPIの平均 | `average(spi_0, spi_1, ..., spi_N)` |

#### FR-02: フィルタ対応

- 各Projectに対してフィルタを適用し、対象タスクの統計を取得
- フィルタなしの場合はプロジェクト全体を対象

#### FR-03: 2点間の期間SPI計算

```
deltaPV = stats_new.totalPvCalculated - stats_old.totalPvCalculated
deltaEV = stats_new.totalEv - stats_old.totalEv
期間SPI = deltaEV / deltaPV
```

#### FR-04: N点の平均SPI計算

```
各Projectの累積SPIを取得: spi_0, spi_1, ..., spi_N
期間SPI = average(spi_0, spi_1, ..., spi_N)
```

### 3.2 スコープ外

| 項目 | 理由 |
|------|------|
| Statistics.spi の変更 | 累積SPIは従来通り維持 |
| CompletionForecast への統合 | Issue #147 で対応 |
| Excelファイルの自動収集 | 呼び出し側の責務 |

---

## 4. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存のSPI計算（累積）に影響を与えないこと |
| NF-02 | フィルタ機能と組み合わせて使用できること |
| NF-03 | 計算不能な場合は undefined を返すこと（エラーをthrowしない） |

---

## 5. 受け入れ基準

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | `calculateRecentSpi(projects, filter?)` 関数が追加されている |
| AC-02 | 1点渡し: その Project の累積SPI を返す |
| AC-03 | 2点渡し: deltaEV / deltaPV で期間SPI を計算する |
| AC-04 | N点渡し: 各点の累積SPI の平均を返す |
| AC-05 | フィルタ条件を指定できる |
| AC-06 | deltaPV = 0 の場合、undefined を返す |
| AC-07 | 既存の累積SPI計算に影響がない（既存テストが全てPASS） |
| AC-08 | 単体テストが実装され、全てPASSしている |

---

## 6. インターフェース設計（案）

### 6.1 関数シグネチャ

```typescript
/**
 * 複数のProjectスナップショットから期間SPIを計算する
 *
 * @param projects Project配列（古い順に並べる）
 * @param filter フィルタ条件（省略可）
 * @returns 期間SPI。計算不能な場合はundefined
 *
 * @example
 * // 1点: 累積SPI
 * calculateRecentSpi([projectNow])
 *
 * // 2点: 期間SPI（deltaEV / deltaPV）
 * calculateRecentSpi([project7DaysAgo, projectNow])
 *
 * // N点: 各点SPIの平均
 * calculateRecentSpi([day7, day6, day5, day4, day3, day2, day1, now])
 *
 * // フィルタ付き
 * calculateRecentSpi([prev, now], { filter: "認証機能" })
 */
function calculateRecentSpi(
  projects: Project[],
  filter?: TaskFilterOptions
): number | undefined
```

### 6.2 配置場所

| オプション | 説明 |
|-----------|------|
| A. ProjectService | 既存の差分計算と同じ場所 |
| B. スタンドアロン関数 | `src/domain/calculateRecentSpi.ts` |
| C. 新サービス | `SpiService` クラス |

**推奨**: A. ProjectService（既存の `getDifference()` と同じ場所）

### 6.3 計算ロジック（擬似コード）

```typescript
function calculateRecentSpi(
  projects: Project[],
  filter?: TaskFilterOptions
): number | undefined {
  if (projects.length === 0) return undefined

  // 1点: 累積SPI
  if (projects.length === 1) {
    const stats = projects[0].getStatistics(filter ?? {})
    return stats.spi
  }

  // 2点: 期間SPI
  if (projects.length === 2) {
    const [older, newer] = projects
    const statsOld = older.getStatistics(filter ?? {})
    const statsNew = newer.getStatistics(filter ?? {})

    const deltaPV = (statsNew.totalPvCalculated ?? 0) - (statsOld.totalPvCalculated ?? 0)
    const deltaEV = (statsNew.totalEv ?? 0) - (statsOld.totalEv ?? 0)

    if (deltaPV === 0) return undefined
    return deltaEV / deltaPV
  }

  // N点: 各点SPIの平均
  const spis = projects
    .map(p => p.getStatistics(filter ?? {}).spi)
    .filter((spi): spi is number => spi !== undefined)

  if (spis.length === 0) return undefined
  return spis.reduce((a, b) => a + b, 0) / spis.length
}
```

---

## 7. 使用例

### 7.1 基本的な使い方

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { calculateRecentSpi } from 'evmtools-node/domain'

// 各基準日のProjectを作成
const projectNow = await new ExcelProjectCreator('now.xlsx').createProject()
const project7DaysAgo = await new ExcelProjectCreator('prev_7days.xlsx').createProject()

// 2点間の期間SPI
const periodSpi = calculateRecentSpi([project7DaysAgo, projectNow])
console.log(`直近7日のSPI: ${periodSpi}`)

// フィルタ付き
const filteredSpi = calculateRecentSpi(
  [project7DaysAgo, projectNow],
  { filter: "認証機能" }
)
console.log(`認証機能の直近7日SPI: ${filteredSpi}`)
```

### 7.2 毎日のスナップショットがある場合

```typescript
// 8日分のProjectを作成（古い順）
const projects = await Promise.all([
  new ExcelProjectCreator('day7.xlsx').createProject(),
  new ExcelProjectCreator('day6.xlsx').createProject(),
  new ExcelProjectCreator('day5.xlsx').createProject(),
  new ExcelProjectCreator('day4.xlsx').createProject(),
  new ExcelProjectCreator('day3.xlsx').createProject(),
  new ExcelProjectCreator('day2.xlsx').createProject(),
  new ExcelProjectCreator('day1.xlsx').createProject(),
  new ExcelProjectCreator('now.xlsx').createProject(),
])

// 8点の平均SPI（凸凹を踏まえた精緻な値）
const preciseSpi = calculateRecentSpi(projects)
```

### 7.3 1点のみの場合（フォールバック）

```typescript
// 過去データがない場合は累積SPIを返す
const spi = calculateRecentSpi([projectNow])
// → projectNow.getStatistics().spi と同じ
```

---

## 8. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| 設計方針 | [`Project.spec.md` セクション12.1](../domain/master/Project.spec.md) |
| 関連Issue | #147 (spiLookbackDays オプション) |
| PV版実装 | `Project.calculateRecentDailyPv()` |
| ブレスト | `docs/brainstorm-evm-indicators.md` |

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-27 | 初版作成 | Claude Code |
| 1.1.0 | 2026-01-27 | 設計変更: 複数Project渡しに変更、フィルタ対応追加 | Claude Code |
