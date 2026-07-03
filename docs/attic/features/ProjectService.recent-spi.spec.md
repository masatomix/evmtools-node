# ProjectService.calculateRecentSpi 詳細設計書

- 対象 Issue: [#139](https://github.com/masatomix/evmtools-node/issues/139), [#170](https://github.com/masatomix/evmtools-node/issues/170)
- 対象バージョン: 0.0.29
- 関連 spec: `.kiro/specs/phase0-bugfix-0.0.29/`

---

## 1. 概要

### 1.1 目的

複数の Project スナップショット（同一プロジェクトの異なる基準日の記録）から、**期間SPI（直近の実勢スケジュール効率）**を算出する。累積SPI（ΣEV/ΣPV）は過去全実績が母数に含まれ、終盤に 1.0 へ収束する・直近の回復/失速が平滑化される欠点があるため（Issue #171 知見ⓐⓑ）、期間中の増分のみで効率を測る。

### 1.2 コンセプト

**期間SPI = ΔEV / ΔPV（窓端2点）**

- ΔEV = EV(最新スナップショット) − EV(最古スナップショット)
- ΔPV = 累積PV(最新) − 累積PV(最古)
- 窓端2点のみを使用し、中間スナップショットは参照しない
- ΔPV ≤ 0（計画が進んでいない・再計画でPV減少）は効率が定義できないため `undefined`
- 2点未満は期間が定義できないため `undefined`

> **v0.0.28 以前からの Behavior Change（#170）**: 旧実装は「各スナップショットの累積SPIの単純平均」を返しており、#139 の仕様と異なっていた。0.0.29 で仕様どおりの ΔEV/ΔPV に修正。シグネチャは不変で戻り値のみ変わる。

> **設計判断**: `Project.calculateRecentSpi(lookbackDays)` という Project 単体の API は提供しない。Project は単一スナップショットであり EV の履歴を持たないため、期間SPI は複数スナップショットを受け取る ProjectService 側でのみ算出可能。

### 1.3 対象クラス

- `src/domain/ProjectService.ts` — `calculateRecentSpi(projects, options?)`

---

## 2. インターフェース仕様

### 2.1 メソッドシグネチャ

```typescript
calculateRecentSpi(projects: Project[], options?: RecentSpiOptions): number | undefined
```

### 2.2 型定義

```typescript
export interface RecentSpiOptions extends TaskFilterOptions {
    /**
     * 期間警告の閾値（日数）。この日数を超えると警告ログを出力
     * @default 30
     */
    warnThresholdDays?: number
}
```

### 2.3 戻り値

| 条件 | 戻り値 |
|------|--------|
| スナップショット2点以上・ΔPV > 0 | `ΔEV / ΔPV` |
| スナップショット2点未満（空配列・1点） | `undefined` |
| ΔPV ≤ 0（同一基準日・再計画によるPV減少） | `undefined` |
| 窓端いずれかの統計（`totalEv` / `totalPvCalculated`）が取得不能 | `undefined` |
| ΔEV = 0（期間中出来高なし） | `0`（有効値） |

---

## 3. 処理仕様

### 3.1 メインロジック

```
1. projects.length < 2 なら undefined
2. _warnIfPeriodTooLong(projects, warnThresholdDays ?? 30) で期間チェック（警告のみ、計算は続行）
3. baseDate 昇順にソートし、最古(oldest)・最新(newest)の getStatistics(options) を取得
4. いずれかの totalEv / totalPvCalculated が undefined なら undefined
5. ΔEV = newest.totalEv - oldest.totalEv
   ΔPV = newest.totalPvCalculated - oldest.totalPvCalculated
6. ΔPV <= 0 なら undefined
7. ΔEV / ΔPV を返す
```

- フィルタ（`options.filter`）は窓端2点の `getStatistics(options)` に適用されるため、サブプロジェクト単位の期間SPIが算出できる
- 渡し順は問わない（内部で baseDate ソート）

### 3.2 期間チェック（内部メソッド）

`_warnIfPeriodTooLong`: 最古と最新の baseDate の暦日差（`diffCalendarDays`、時刻成分によるoff-by-oneなし）が閾値を超えたら警告ログを出す。計算は続行する。

---

## 4. テストケース

テスト実体: `src/domain/__tests__/ProjectService.recent-spi.test.ts`

### 4.1 正常系（ΔEV/ΔPV）

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-01 | 1点渡し | `[project]` | `undefined`（期間が定義できない） |
| TC-02 | 2点渡し | p1(PV=7,EV=7), p2(PV=10,EV=8.5) | `0.5`（=1.5/3。累積SPI平均0.925ではない） |
| TC-03 | N点渡し | 中間に異常値を挟む3点 | 窓端2点のみで `0.5`（中間無視） |
| TC-03b | 逆順渡し | `[p2, p1]` | baseDateソートで `0.5` |
| TC-04 | フィルタ付き | `{ filter: "認証" }` | フィルタ後集合の ΔEV/ΔPV |

### 4.2 境界値

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-05 | 空配列 | `[]` | `undefined` |
| TC-06 | ΔPV=0（同一基準日2点） | `[p1, p2]`（同baseDate） | `undefined` |
| TC-07 | ΔPV<0（再計画でPV減少） | 後ろ倒し再計画 | `undefined` |
| TC-08 | ΔEV=0 | EV変化なしの2点 | `0`（有効値） |

### 4.3 警告テスト

| TC-ID | テストケース | 入力 | 期待結果 |
|-------|-------------|------|----------|
| TC-09 | 期間30日以内 | 期間=6日 | 警告なし |
| TC-10 | 期間30日超 | 期間=45日 | 警告あり、計算成功 |
| TC-11 | 閾値カスタム | 期間=20日, threshold=15 | 警告あり |
| TC-12 | 1点のみ | `[project]` | 警告なし、`undefined` |

### 4.4 既存機能への影響

| TC-ID | テストケース | 期待結果 |
|-------|-------------|----------|
| TC-13 | 全テストスイート（TZ=Asia/Tokyo, TZ=UTC の二重実行） | 全件PASS |

---

## 5. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-SPI-001 AC-01 | メソッドが提供されている（シグネチャ不変） | TC-01〜TC-04 | ✅ PASS |
| REQ-SPI-001 AC-02 | 期間SPI = ΔEV/ΔPV（窓端2点）を返す | TC-02, TC-03, TC-03b | ✅ PASS |
| REQ-SPI-001 AC-03 | 2点未満は undefined | TC-01, TC-05, TC-12 | ✅ PASS |
| REQ-SPI-001 AC-04 | フィルタ条件を指定できる | TC-04 | ✅ PASS |
| REQ-SPI-001 AC-05 | ΔPV<=0・統計取得不能は undefined | TC-06, TC-07 | ✅ PASS |
| REQ-SPI-001 AC-06 | 期間超過で警告、計算続行 | TC-09, TC-10, TC-11 | ✅ PASS |
| REQ-SPI-001 AC-07 | 既存テストに影響なし | TC-13（301件PASS） | ✅ PASS |
| REQ-SPI-001 AC-08 | 単体テストが全てPASS | TC-01〜TC-12 | ✅ PASS |

---

## 6. 実装上の注意点

### 6.1 統計の取得

窓端2点の統計は `Project.getStatistics(options)` の `totalEv` / `totalPvCalculated` を使用する（安定 API）。`spi` フィールド（累積SPI）は使用しない。

### 6.2 TaskFilterOptions の再利用

`RecentSpiOptions extends TaskFilterOptions` により、既存のフィルタ機構をそのまま利用する。

### 6.3 日付差の計算

期間警告の日数計算は `diffCalendarDays`（`src/common/utils.ts`）を使用する。時刻成分・タイムゾーン差による off-by-one を防ぐため、`Math.floor(diffMs/86400000)` による直接計算はしない。

---

## 7. 使用例

### 7.1 基本的な使い方（完了予測への接続）

```typescript
import { ProjectService } from 'evmtools-node/domain'

const service = new ProjectService()

// 直近2時点のスナップショットから期間SPIを算出
const periodSpi = service.calculateRecentSpi([prevProject, nowProject])

// 直近の実勢ペースで完了予測（悲観シナリオ等に使用）
const forecast = nowProject.calculateCompletionForecast({ spiOverride: periodSpi })
```

### 7.2 フィルタ付き（サブプロジェクト単位）

```typescript
const spi = service.calculateRecentSpi([prev, now], { filter: '認証' })
```

### 7.3 警告閾値をカスタマイズ

```typescript
const spi = service.calculateRecentSpi([prev, now], { warnThresholdDays: 14 })
```

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0 | 2026-01-26 | 初版（累積SPIの平均として実装） |
| 2.0 | 2026-07-03 | #170 対応: 期間SPI（ΔEV/ΔPV、窓端2点）へ仕様準拠修正。1点渡し・ΔPV<=0 は undefined に変更（Behavior Change）。テストケース・トレーサビリティ全面改訂 |
