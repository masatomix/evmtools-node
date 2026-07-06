# 技術設計書: schedule-adherence

> **実装ゲート**: 本 spec は設計まで。実装トリガー（利用側スキルでの plan-adherence 系レポート定着）成立後に `/kiro-impl schedule-adherence` で着手する。requirements.md 冒頭の注記参照。

## 概要

Lipke の P-Factor（Schedule Adherence）を Project に追加する。P = Σj min(PVj(ES), EVj) / Σj PVj(ES) により「出来高を計画どおりの順序で積んでいるか」を単一スナップショットから測定し、SPI(t) が良好でも隠れる先食い（手戻りリスク）を検出可能にする。phase3（Earned Schedule）・phase5（evMethod）で確立した「純関数コア + Project 統合」の2層パターンを踏襲する。

### ゴール
- `Project.calculateScheduleAdherence(options?: StatisticsOptions)` で P-Factor とタスク別内訳（先食い/遅れ/順守）を返す
- ES・EV の算出を既存パイプライン（`calculateEarnedSchedule` / `resolveTaskEv`）と厳密に一致させる（数値の単一ソース化）
- 既存 API・既存テストへの影響ゼロ（純追加）

### 非ゴール
- Lipke の発展系（effective EV = P·EV、手戻り量予測）
- CLI コマンド・Excel 出力
- 利用側スキルの plan-adherence（2スナップショット4象限）の置き換え（別指標として共存）

## 境界コミットメント

### この spec が担うもの
- 新規純関数コア `src/domain/ScheduleAdherence.ts`（型2つ + コア関数）
- `Project.calculateScheduleAdherence` メソッドと ES 算出コンテキストの内部共通化
- バレルの type export、テスト、ドキュメント同期（GLOSSARY / EVM-PRIMER / master spec）

### 境界の外
- `EarnedSchedule.ts` / `EvMethod.ts` / 既存メソッドの変更（読み取り専用で再利用する）
- `Statistics` 型・`StatisticsOptions` 型の変更（オプションは既存のまま受け取る）
- resource モジュール・presentation 層

### 許容する依存関係
- `ScheduleAdherence.ts` → `TaskRow` 型のみ（Date/Project/common に依存しない。EarnedSchedule.ts と同じ純度制約）
- `Project.ts` → `ScheduleAdherence.ts` / `EarnedSchedule.ts`（core） / `EvMethod.ts`（resolveTaskEv） / 既存 private ヘルパー

### 再検証トリガー
- `calculateEarnedSchedule` の ES 定義・索引規約・クランプ仕様の変更
- `StatisticsOptions` / `EvMethod` の型変更
- `_buildPvCurve` のメモ化キー設計の変更

## アーキテクチャ

### 既存アーキテクチャ分析
- ES 算出は `Project.calculateEarnedSchedule`（Project.ts:1007-1047）に確立済み: `_resolveTasks` → 稼働日配列（`generateBaseDates` + `isHoliday`）→ `_buildPvCurve`（フィルタキーでメモ化）→ `calculateEarnedScheduleCore`
- タスク単位の方式別 EV は `resolveTaskEv(task, evMethod)`（EvMethod.ts、module export・バレル非公開）
- 本機能は同じパイプラインの**途中成果物（tasks / workDays / pvCurve / es）を共有**する必要がある → private 共通ヘルパーへの抽出（既存メソッドの外部挙動は不変）

### アーキテクチャパターン・境界マップ

```
Project.calculateEarnedSchedule ──┐
                                  ├─→ _computeEsContext（新 private・共通化）
Project.calculateScheduleAdherence┘        │
        │                                  │ tasks / workDays / pvCurve / es / at / pd
        │ タスク別 PVj(ES)（2点補間）        ▼
        │ EVj = resolveTaskEv        calculateEarnedScheduleCore（既存・不変）
        ▼
calculateScheduleAdherenceCore（新・純関数）→ ScheduleAdherenceResult
```

### 技術スタック
既存スタックのまま（TypeScript strict / Jest）。新規依存なし。

## ファイル構成計画

### 新規ファイル

| パス | 責務 |
|------|------|
| `src/domain/ScheduleAdherence.ts` | 純関数コア。`ScheduleAdherenceResult` / `TaskAdherenceDetail` 型、`calculateScheduleAdherenceCore(input)`（P 計算・分類・ソート）。TaskRow 型以外に依存しない |
| `src/domain/__tests__/ScheduleAdherence.test.ts` | コア純関数のテスト（手計算一致・境界・分類・ソート） |
| `src/domain/__tests__/Project.scheduleAdherence.test.ts` | Project 統合テスト（ES 一致・フィルタ・evMethod・回帰） |

### 変更ファイル

| パス | 変更内容 |
|------|---------|
| `src/domain/Project.ts` | (1) `calculateEarnedSchedule` の前半を private `_computeEsContext(options?)` に抽出（外部挙動不変）(2) `calculateScheduleAdherence(options?)` を追加 (3) private `_taskPvAtEs(task, workDays, es, pd)`（2点補間） |
| `src/domain/index.ts` | `export type { ScheduleAdherenceResult, TaskAdherenceDetail } from './ScheduleAdherence'`（型のみ。コア関数は非公開 = 公開 API 追加の基準適用） |
| `docs/GLOSSARY.md` ほか docs | 実装タスクで同期（要件5） |

## システムフロー

```
calculateScheduleAdherence(options?)
  1. ctx = _computeEsContext(options)            … calculateEarnedSchedule と完全共有
     └─ undefined なら undefined を返す（要件1.4）。以下 es 値 = ctx.es.es、pd = ctx.es.pd と表記
  2. 各タスク j について
     plannedEv_j = _taskPvAtEs(task_j, ctx.workDays, ctx.es, ctx.pd)
       └─ k=floor(es), f=es−k, PVj(k)+f×(PVj(k+1)−PVj(k))。PVj(0)=0、k≥pd はクランプ
     ev_j = resolveTaskEv(task_j, options?.evMethod ?? 'progressRate') ?? 0
  3. calculateScheduleAdherenceCore({ items: [{id,name,plannedEv,ev}], es, at })
     ├─ plannedTotal = Σ plannedEv_j。0 以下なら undefined（要件1.5）
     ├─ earnedInPlan = Σ min(plannedEv_j, ev_j)
     ├─ pFactor = earnedInPlan / plannedTotal（構造的に 0 ≤ P ≤ 1）
     ├─ 分類: |ev−plannedEv| < EPS（=1e-9、PROGRESS_RATE_EPSILON と同値の定数） → 'conforming' / ev > plannedEv → 'ahead' / else 'behind'
     └─ details を |deviation| 降順でソート
```

## 要件トレーサビリティ

| 要件 | 実現箇所 | 検証 |
|------|---------|------|
| 1.1 | コアの P 計算式 + `_taskPvAtEs` | 手計算一致テスト（下記 数値例） |
| 1.2 | min による構造保証（丸めなし） | プロパティ的テスト（複数ケースで 0≤P≤1） |
| 1.3 | 全 j で ev ≥ plannedEv → 分子=分母 | 完全順守ケース |
| 1.4 | `_computeEsContext` undefined 伝播 | 空集合・日付欠損・BAC=0 |
| 1.5 | plannedTotal ≤ 0 → undefined | EV=0（ES=0）ケース |
| 1.6 | クランプ時 plannedEv=BACj、全完了で min=BACj | 完了プロジェクトで P=1 |
| 1.7 | 結果に es/at を含める + ES 共通化 | `calculateEarnedSchedule` との一致テスト |
| 2.1-2.4 | `TaskAdherenceDetail`（id/name/plannedEv/ev/deviation/classification）+ ソート | 分類・順序テスト |
| 3.1-3.4 | `_resolveTasks` / `resolveTaskEv` / `_buildPvCurve` の既存オプション経路 | フィルタ×evMethod 統合テスト |
| 4.1-4.3 | 純追加 + `_computeEsContext` 抽出の外部挙動不変 | 既存テスト無変更で全緑（リファクタ安全性は既存 ES テスト 33 件が固定） |
| 5.1-5.4 | docs タスク | リンク・記述整合の確認 |

## コンポーネント・インターフェース

### domain / ScheduleAdherence.ts（新規・純関数コア）

```typescript
/** タスク別の順守内訳（要件2） */
export interface TaskAdherenceDetail {
    id: number
    name: string
    /** PVj(ES): 時点 ES までに計画上積んでいるはずだった価値 */
    plannedEv: number
    /** EVj: 実際の出来高（evMethod 反映後） */
    ev: number
    /** ev − plannedEv（正=先食い、負=遅れ） */
    deviation: number
    classification: 'ahead' | 'behind' | 'conforming'
}

/** P-Factor 算出結果（要件1,2） */
export interface ScheduleAdherenceResult {
    /** P = earnedInPlan / plannedTotal ∈ [0,1]。1 = 完全順守 */
    pFactor: number
    /** 算出に使用した ES（calculateEarnedSchedule と同値） */
    es: number
    /** 算出に使用した AT */
    at: number
    /** Σ min(PVj(ES), EVj)（将来の effective EV 拡張に備え公開） */
    earnedInPlan: number
    /** Σ PVj(ES) */
    plannedTotal: number
    /** |deviation| 降順 */
    details: TaskAdherenceDetail[]
}

export interface ScheduleAdherenceInput {
    items: Array<{ id: number; name: string; plannedEv: number; ev: number }>
    es: number
    at: number
}

/** 純関数コア。plannedTotal <= 0 は undefined */
export const calculateScheduleAdherenceCore = (
    input: ScheduleAdherenceInput
): ScheduleAdherenceResult | undefined
```

### domain / Project.ts（変更）

```typescript
/** ES 算出の共通コンテキスト（calculateEarnedSchedule から抽出、外部挙動不変） */
private _computeEsContext(options?: StatisticsOptions):
    | { tasks: TaskRow[]; workDays: Date[]; pvCurve: number[]; es: EarnedScheduleResult; startDate: Date }
    | undefined

/** タスク単位の PV@ES（k / k+1 の2点補間、仮想始点 PVj(0)=0、k>=pd クランプ） */
private _taskPvAtEs(task: TaskRow, workDays: Date[], es: number, pd: number): number

/** P-Factor（Schedule Adherence）。要件1〜3 */
calculateScheduleAdherence(options?: StatisticsOptions): ScheduleAdherenceResult | undefined
```

**索引規約**（EarnedSchedule.ts と同一）: i 番目の稼働日（1始まり）の PV は `calculatePVs(workDays[i-1])`。仮想始点 i=0 は 0。

## データモデル

新規永続データなし。型は上記2 interface のみ（バレルから type export）。`Statistics` / `StatisticsOptions` / `EarnedScheduleResult` は不変。

### 数値例（テスト期待値の基準）

5タスク×各1人日、稼働日5日、基準日=3稼働日目（AT=3）。実績: タスク1=100%、タスク3=100%、**タスク5=100%（先食い）**、タスク2・4=0%。

- 全体曲線 [1,2,3,4,5]、EV=3 → **ES=3**、SPI(t)=3/3=**1.0（順調に見える）**
- PVj(ES=3) = [1,1,1,0,0]、EVj = [1,0,1,0,1]
- plannedTotal = 3、earnedInPlan = min→ 1+0+1+0+0 = 2 → **P = 2/3 ≈ 0.667**
- 分類: タスク2=behind(−1)、タスク5=ahead(+1)、タスク1,3=conforming、タスク4=conforming(0)
- **SPI(t)=1.0 なのに P=0.67** — 本機能の存在意義を1ケースで実証

## エラー処理

### エラー処理戦略
ES 系と同一: **例外を投げず undefined を返す**（要件1.4/1.5）。undefined 条件は (a) `_computeEsContext` が undefined（空集合・日付欠損・PD=0・BAC≤0）(b) plannedTotal ≤ 0。数値は丸めない（表示丸めは利用側）。

### モニタリング
なし（純粋計算）。

## テスト戦略

- **コア（ScheduleAdherence.test.ts）**: 数値例の手計算一致（P=2/3）/ 完全順守 P=1（要件1.3）/ plannedTotal=0 → undefined / 分類3種と EPS 境界（deviation=±1e-10 は conforming）/ |deviation| 降順ソート / 0≤P≤1 の構造保証（ev > plannedEv 過剰ケース含む）
- **統合（Project.scheduleAdherence.test.ts）**: (1) 数値例の end-to-end（SPI(t)=1.0 × P=0.67 の同時実証）(2) **es/at が `calculateEarnedSchedule` と厳密一致**（要件1.7、フィルタ有無×evMethod 有無の4通り）(3) クランプなしケースで plannedTotal ≈ EV（補間整合）(4) 完了プロジェクト P=1（要件1.6）(5) EV=0 → undefined (6) フィルタ部分集合（要件3.1）(7) evMethod='0/100' で EVj が変わり P が変化（要件3.2、PVj は不変）(8) 小数 ES（EV=2.5 等）の補間手計算一致 (9) 既存テスト無変更・全緑（要件4.2、CI で担保）
- **grep 規約**: テスト冒頭に `spec: schedule-adherence 要件N` を記載

## 補足参照
- 理論根拠・索引規約の検討過程: [research.md](research.md)
- 基礎とする実装: `Project.calculateEarnedSchedule`（phase3-earned-schedule-0.0.32）、`resolveTaskEv`（phase5-evmethod-knowledge-0.0.34）
