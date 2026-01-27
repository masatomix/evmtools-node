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

**入力**: Project配列 + オプションのフィルタ条件
**出力**: 期間SPI（number | undefined）
**計算方法**: 渡されたProjectの累積SPIの平均

```
各ProjectのSPIを取得: spi_0, spi_1, ..., spi_N
期間SPI = average(spi_0, spi_1, ..., spi_N)
```

| 渡す数 | 結果 |
|:------:|------|
| 1点 | 1つの平均 = そのProject の累積SPI |
| 2点 | 2つの累積SPI の平均 |
| N点 | N個の累積SPI の平均 |

**場合分け不要。常に平均。**

#### FR-02: フィルタ対応

- 各Projectに対してフィルタを適用し、対象タスクの統計を取得
- フィルタなしの場合はプロジェクト全体を対象

#### FR-03: 期間チェックと警告

- 最古と最新のProjectのbaseDate差が閾値（デフォルト: 30日）を超えた場合、警告ログを出力
- 警告を出しつつ計算は続行する（エラーにはしない）

```typescript
if (daysDiff > threshold) {
  logger.warn(`calculateRecentSpi: 期間が ${daysDiff} 日と長いです。直近SPIとしては不適切な可能性があります`)
}
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
| AC-01 | `ProjectService.calculateRecentSpi(projects, filter?)` メソッドが追加されている |
| AC-02 | 渡されたProject群の累積SPIの平均を返す |
| AC-03 | 1点渡し: そのProjectの累積SPIを返す（1つの平均 = そのまま） |
| AC-04 | フィルタ条件を指定できる |
| AC-05 | 全ProjectのSPIがundefinedの場合、undefinedを返す |
| AC-06 | 期間が閾値（30日）を超えた場合、警告ログを出力して計算続行 |
| AC-07 | 既存の累積SPI計算に影響がない（既存テストが全てPASS） |
| AC-08 | 単体テストが実装され、全てPASSしている |

---

## 6. インターフェース設計（案）

### 6.1 配置場所

**ProjectService** に追加（既存の `getDifference()` と同じ場所）

### 6.2 メソッドシグネチャ

```typescript
class ProjectService {
  // 既存メソッド...
  getDifference(prev: Project, now: Project): TaskDiff[]

  /**
   * 複数のProjectスナップショットから期間SPIを計算する
   * 渡されたProject群の累積SPIの平均を返す
   *
   * @param projects Project配列
   * @param filter フィルタ条件（省略可）
   * @returns 期間SPI。計算不能な場合はundefined
   *
   * @example
   * // 1点: そのProjectの累積SPI
   * service.calculateRecentSpi([projectNow])
   *
   * // 2点: 2つの累積SPIの平均
   * service.calculateRecentSpi([project7DaysAgo, projectNow])
   *
   * // N点: N個の累積SPIの平均
   * service.calculateRecentSpi([day7, day6, ..., now])
   *
   * // フィルタ付き
   * service.calculateRecentSpi([prev, now], { filter: "認証機能" })
   */
  calculateRecentSpi(
    projects: Project[],
    filter?: TaskFilterOptions
  ): number | undefined
}
```

### 6.3 計算ロジック（擬似コード）

```typescript
calculateRecentSpi(
  projects: Project[],
  filter?: TaskFilterOptions
): number | undefined {
  // 各ProjectのSPIを取得
  const spis = projects
    .map(p => p.getStatistics(filter ?? {}).spi)
    .filter((spi): spi is number => spi !== undefined)

  // 全てundefinedなら計算不能
  if (spis.length === 0) return undefined

  // 平均を返す
  return spis.reduce((a, b) => a + b, 0) / spis.length
}
```

**シンプル。場合分けなし。**

---

## 7. 使用例

### 7.1 基本的な使い方

```typescript
import { ExcelProjectCreator, ProjectService } from 'evmtools-node/infrastructure'

const service = new ProjectService()

// 各基準日のProjectを作成
const projectNow = await new ExcelProjectCreator('now.xlsx').createProject()
const project7DaysAgo = await new ExcelProjectCreator('prev_7days.xlsx').createProject()

// 2点の平均SPI
const recentSpi = service.calculateRecentSpi([project7DaysAgo, projectNow])
console.log(`直近7日のSPI: ${recentSpi}`)

// フィルタ付き
const filteredSpi = service.calculateRecentSpi(
  [project7DaysAgo, projectNow],
  { filter: "認証機能" }
)
console.log(`認証機能の直近7日SPI: ${filteredSpi}`)
```

### 7.2 毎日のスナップショットがある場合

```typescript
// 8日分のProjectを作成
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
const preciseSpi = service.calculateRecentSpi(projects)
```

### 7.3 1点のみの場合（フォールバック）

```typescript
// 過去データがない場合 → 1つの平均 = そのProjectの累積SPI
const spi = service.calculateRecentSpi([projectNow])
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
| 1.2.0 | 2026-01-27 | 計算方法を「常に平均」に統一（場合分け廃止）、配置場所をProjectServiceに決定 | Claude Code |
| 1.3.0 | 2026-01-27 | 期間チェックと警告機能を追加（30日超で警告、計算は続行） | Claude Code |
