# Project.completionForecast 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2026-01-23
**要件ID**: REQ-EVM-001
**GitHub Issue**: #94
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 概要

### 1.1 目的

ProjectクラスにEVM指標を拡張し、プロジェクトの完了予測機能を提供する。

- **BAC**（Budget at Completion）: プロジェクト全体の予定工数
- **ETC'**（Estimate to Complete, SPI版）: 残作業完了に必要な計画工数換算
- **完了予測日**: 現在のSPIが続いた場合のプロジェクト完了予測日

### 1.2 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/domain/Project.ts` | `bac`, `etcPrime`, `calculateCompletionForecast()` を追加 |
| `src/domain/index.ts` | 新規型をエクスポート |

---

## 2. インターフェース仕様

### 2.1 型定義

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
}

/**
 * 完了予測結果
 */
export interface CompletionForecast {
  /** ETC': 残作業完了に必要な計画工数換算（人日） */
  etcPrime: number
  /** 完了予測日 */
  forecastDate: Date
  /** 残作業量（BAC - EV） */
  remainingWork: number
  /** 使用した日あたりPV */
  usedDailyPv: number
  /** 使用したSPI */
  usedSpi: number
  /** 日あたり消化量（usedDailyPv × usedSpi） */
  dailyBurnRate: number
  /** 予測の信頼性 */
  confidence: 'high' | 'medium' | 'low'
  /** 信頼性の理由 */
  confidenceReason: string
}
```

### 2.2 Projectクラスへの追加

```typescript
class Project {
  // 既存プロパティ...

  /**
   * プロジェクト全体のBAC（Budget at Completion）
   * 全リーフタスクの予定工数の合計
   *
   * @returns BAC（人日）。タスクがない場合は0
   */
  get bac(): number

  /**
   * プロジェクト全体の累積EV
   * 全リーフタスクのEVの合計
   *
   * @returns 累積EV（人日）
   */
  get totalEv(): number

  /**
   * プロジェクト全体のETC'（SPI版）
   * (BAC - 累積EV) / SPI
   *
   * @returns ETC'（人日）。SPI=0またはSPI未定義の場合はundefined
   */
  get etcPrime(): number | undefined

  /**
   * 完了予測を計算
   *
   * @param options 予測オプション
   * @returns 完了予測結果。計算不能な場合はundefined
   */
  calculateCompletionForecast(options?: CompletionForecastOptions): CompletionForecast | undefined

  /**
   * 計画稼働日数を取得
   * プロジェクト開始日から終了日までの、休日を除いた稼働日数
   *
   * @returns 稼働日数
   */
  get plannedWorkDays(): number

  /**
   * 直近N日平均PV（baseDate時点）
   * 完了予測の日あたり消化量として使用
   *
   * @param lookbackDays 直近何日の平均を取るか（デフォルト: 7）
   * @returns 直近N日平均PV（人日/日）
   */
  calculateRecentDailyPv(lookbackDays?: number): number
}
```

---

## 3. 処理仕様

### 3.1 BAC の計算

```
BAC = Σ(リーフタスクの workload)
```

- `isLeaf === true` のタスクのみ対象
- `workload` が `undefined` のタスクは 0 として扱う

### 3.2 ETC' の計算

```
ETC' = (BAC - EV) / SPI
```

**前提条件**:
- SPI > 0 であること
- SPI は `statisticsByProject[0].spi` を使用

**エッジケース**:
| 条件 | 結果 |
|------|------|
| SPI = 0 | `undefined` |
| SPI = undefined | `undefined` |
| BAC = EV（完了済み） | `0` |

### 3.3 完了予測日の計算

```
入力:
  - BAC: プロジェクト全体の予定工数
  - EV: 現在の累積EV
  - SPI: 現在のスケジュール効率
  - dailyPv: 日あたりPV（手入力 or 自動計算）

処理:
  1. 残作業量 = BAC - EV
  2. 残作業量 <= 0 の場合、完了予測日 = baseDate
  3. dailyPv = dailyPvOverride ?? 直近N日平均PV（baseDate時点で計算、固定）
  4. dailyBurnRate = dailyPv × SPI （日あたり消化量）
  5. currentDate = baseDate
  6. WHILE 残作業量 > 0 AND 経過日数 < maxForecastDays:
       6.1 currentDate を 1日進める
       6.2 currentDate が稼働日なら:
            - 消化量 = dailyPv × SPI （固定値を使用）
            - 残作業量 -= 消化量
  7. 完了予測日 = currentDate
```

### 3.4 日あたりPV の決定

| 優先度 | 条件 | 使用するPV |
|--------|------|-----------|
| 1 | `dailyPvOverride` が指定 | `dailyPvOverride` |
| 2 | それ以外 | baseDate時点の直近N日（lookbackDays）平均PV（固定） |

**ポイント**: 計画終了日以降も、baseDate時点で計算した直近N日平均を**固定で使用**する。
- 理由: 「今のペースが続いたら」という予測としてシンプルで一貫性がある
- 異常時（タスク待ち等）は `dailyPvOverride` で手動補正可能

**直近N日平均PV の計算**:
```
1. baseDate から lookbackDays 日前までの稼働日を取得
2. 各稼働日のプロジェクト全体PV（sumCalculatePV）を計算
3. 平均値を算出
4. この値を将来の全日に固定で適用
```

### 3.5 信頼性（confidence）の判定

| 条件 | 信頼性 | 理由 |
|------|--------|------|
| 手入力PV使用 | `high` | ユーザーが明示的に指定 |
| SPI >= 0.8 かつ SPI <= 1.2 | `high` | 安定した進捗 |
| SPI >= 0.5 かつ SPI < 0.8 | `medium` | やや遅れ気味 |
| SPI > 1.2 | `medium` | 前倒し（維持可能か不明） |
| SPI < 0.5 | `low` | 大幅な遅延 |
| 予測日が計画終了日を大幅に超過（例: 2倍以上） | `low` | 計画見直しが必要 |

---

## 4. テストケース

### 4.1 BAC の計算

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-01 | 全タスクのworkload合計 | 3タスク: 10, 20, 30人日 | BAC = 60 |
| TC-02 | workload未定義を0扱い | 2タスク: 10人日, undefined | BAC = 10 |
| TC-03 | タスクなし | 空のタスク配列 | BAC = 0 |
| TC-04 | 親タスクは除外 | 親10, 子5, 子5 | BAC = 10（子のみ） |

### 4.2 ETC' の計算

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-05 | 基本計算 | BAC=100, EV=60, SPI=0.8 | ETC' = 50 |
| TC-06 | SPI=0 の場合 | BAC=100, EV=60, SPI=0 | undefined |
| TC-07 | SPI未定義 | BAC=100, EV=60, SPI=undefined | undefined |
| TC-08 | 完了済み（BAC=EV） | BAC=100, EV=100, SPI=1.0 | ETC' = 0 |
| TC-09 | SPI > 1（前倒し） | BAC=100, EV=60, SPI=1.2 | ETC' = 33.33... |

### 4.3 完了予測日の計算

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-10 | 基本的な予測 | 残作業20, dailyPv=2, SPI=1.0 | 10稼働日後 |
| TC-11 | SPI考慮 | 残作業20, dailyPv=2, SPI=0.5 | 20稼働日後 |
| TC-12 | 完了済み | BAC=EV | forecastDate = baseDate |
| TC-13 | 手入力PV優先 | dailyPvOverride=5 | 5を使用 |
| TC-14 | 土日スキップ | 金曜baseDate | 月曜以降にカウント |
| TC-15 | 祝日スキップ | 祝日を含む期間 | 祝日をスキップ |
| TC-16 | maxForecastDays超過 | 730日で収束しない | undefined |

### 4.4 日あたりPV の決定

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-17 | 手入力優先 | dailyPvOverride=3.0 | usedDailyPv = 3.0 |
| TC-18 | 直近N日平均 | lookbackDays=7, 過去7日のPV | 7日平均を使用 |
| TC-19 | 計画終了日以降も固定 | baseDate > endDate | 直近N日平均を固定で使用 |
| TC-20 | lookbackDays指定 | lookbackDays=14 | 直近14日平均を使用 |

### 4.5 信頼性の判定

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-21 | 高信頼性（安定） | SPI=1.0 | confidence='high' |
| TC-22 | 中信頼性（遅延） | SPI=0.6 | confidence='medium' |
| TC-23 | 低信頼性（大遅延） | SPI=0.3 | confidence='low' |
| TC-24 | 手入力で高信頼性 | dailyPvOverride指定 | confidence='high' |

### 4.6 エッジケース

| TC-ID | テスト内容 | 入力 | 期待結果 |
|-------|-----------|------|---------|
| TC-25 | SPI=0で予測不可 | SPI=0 | undefined |
| TC-26 | dailyPv=0で予測不可 | dailyPv=0 | undefined |
| TC-27 | 全タスク無効 | excludedTasks.length = 全タスク | BAC=0, ETC'=0 |

---

## 5. 使用例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { CompletionForecastOptions } from 'evmtools-node/domain'

const creator = new ExcelProjectCreator('project.xlsm')
const project = await creator.createProject()

// BAC の取得
console.log(`BAC: ${project.bac}人日`)

// ETC' の取得
const etcPrime = project.etcPrime
if (etcPrime !== undefined) {
  console.log(`ETC': ${etcPrime.toFixed(1)}人日`)
}

// 完了予測（デフォルト設定）
const forecast = project.calculateCompletionForecast()
if (forecast) {
  console.log(`完了予測日: ${forecast.forecastDate.toLocaleDateString('ja-JP')}`)
  console.log(`残作業量: ${forecast.remainingWork.toFixed(1)}人日`)
  console.log(`日あたり消化: ${forecast.dailyBurnRate.toFixed(2)}人日`)
  console.log(`信頼性: ${forecast.confidence} (${forecast.confidenceReason})`)
}

// カスタム設定での予測
const options: CompletionForecastOptions = {
  dailyPvOverride: 5.0,     // タスク待ち解消後の想定PV
  maxForecastDays: 365,     // 1年以内で打ち切り
}
const customForecast = project.calculateCompletionForecast(options)
```

---

## 6. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-EVM-001 AC-01 | ETC'が正しく計算される | TC-05, TC-08, TC-09 | ✅ PASS |
| REQ-EVM-001 AC-02 | 完了予測日が正しく算出される | TC-10, TC-11, TC-12 | ✅ PASS |
| REQ-EVM-001 AC-03 | 日あたりPVの優先度 | TC-17, TC-18, TC-20 | ✅ PASS |
| REQ-EVM-001 AC-04 | 計画終了日以降も直近N日平均を固定使用 | TC-19 | ✅ PASS |
| REQ-EVM-001 AC-05 | SPI=0時はundefined | TC-06, TC-07, TC-25 | ✅ PASS |
| REQ-EVM-001 AC-06 | 既存テストへの影響なし | 既存テスト全件 | ✅ PASS (134件) |
| REQ-EVM-001 AC-07 | 完了済み時の動作 | TC-08, TC-12 | ✅ PASS |

**テストファイル**: `src/domain/__tests__/Project.completionForecast.test.ts`

---

## 7. 実装上の注意

### 7.1 既存コードとの統合

- `statisticsByProject` の `spi` を使用してプロジェクト全体のSPIを取得
- `sumCalculatePV`、`sumCalculatePVs` などの既存ヘルパー関数を活用
- `isHoliday()` を使用して稼働日判定

### 7.2 パフォーマンス考慮

- 完了予測計算はループが発生するため、キャッシュは行わない（毎回計算）
- `maxForecastDays` で無限ループを防止

### 7.3 エクスポート

`src/domain/index.ts` に以下を追加：

```typescript
export type { CompletionForecastOptions, CompletionForecast } from './Project'
```

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2026-01-23 | 初版作成 | REQ-EVM-001 |
