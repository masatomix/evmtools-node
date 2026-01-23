# 要件定義書: 今日のPV表示機能

**要件ID**: REQ-PV-TODAY-001
**GitHub Issue**: #86
**作成日**: 2026-01-23
**ステータス**: Draft
**優先度**: Medium

---

## 1. 概要

`pbevm-show-pv` コマンドの出力に、タスクごとの「今日のPV」を表示するカラムを追加する。計画PV（固定値）と実行PV（進捗反映値）の2種類を提供し、タスクの遅れ・前倒し状況を可視化する。

## 2. 背景・目的

### 2.1 背景

- 現在の出力では `pv`（累積PV）は表示されるが、「今日消化すべきPV」が直接わからない
- プロジェクト管理において、日次の計画値を確認したいニーズがある
- 既存の `workloadPerDay` は計画PVを提供するが、進捗を反映した実態値がない

### 2.2 目的

- 計画PV（`pvToday`）: 計画段階で決まる1日あたりの固定PV
- 実行PV（`pvTodayActual`）: 進捗を反映した「今日やるべき」実態PV
- これにより、タスクの遅れ・前倒し状況を数値で把握可能にする

## 3. 機能要件

### 3.1 主要機能

#### 3.1.1 計画PV（pvToday）

| 項目 | 内容 |
|------|------|
| 計算式 | `workload / scheduledWorkDays` |
| 説明 | 計画段階で決まる1日あたりの固定値 |
| 備考 | 既存の `workloadPerDay` と同等 |

#### 3.1.2 実行PV（pvTodayActual）

| 項目 | 内容 |
|------|------|
| 計算式 | `残工数 / 残日数` |
| 残工数 | `workload × (1 - progressRate)` |
| 残日数 | 基準日〜終了日の間でplotMapにプロットされている日数 |
| 説明 | 進捗を反映した実態値 |

#### 3.1.3 残日数（remainingDays）

| 項目 | 内容 |
|------|------|
| 計算式 | 基準日〜終了日でplotMapがtrueの日数 |
| 条件 | 基準日がタスク期間外の場合は0 |

### 3.2 解釈ルール

| 状況 | 条件 | 意味 |
|------|------|------|
| 前倒し | `pvTodayActual < pvToday` | 今日やるべき量が計画より少ない |
| 遅れ | `pvTodayActual > pvToday` | 今日やるべき量が計画より多い |
| 計画通り | `pvTodayActual ≒ pvToday` | 進捗が計画通り |

### 3.3 スコープ外

- 過去日を指定した実行PV計算（progressRateが基準日スナップショットのため）
- プロジェクト全体の本日PV集計（オプション扱い）
- 担当者ごとの合計に `pvToday` / `pvTodayActual` の合計を表示（オプション扱い）

## 4. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の `pbevm-show-pv` 出力に影響を与えないこと（追加カラムのみ） |
| NF-02 | 既存のPV/EV計算ロジックに影響を与えないこと |
| NF-03 | パフォーマンスに大きな影響を与えないこと |

## 5. 受け入れ基準

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | `TaskRow.remainingDays` で基準日〜終了日の残日数を取得できる |
| AC-02 | `TaskRow.pvTodayActual` で実行PV（残工数/残日数）を取得できる |
| AC-03 | 残日数が0の場合、`pvTodayActual` は0を返す（ゼロ除算回避） |
| AC-04 | 基準日がタスク期間外の場合、`remainingDays` は0を返す |
| AC-05 | `pbevm-show-pv` 出力（コンソール・Excel両方）に `pvToday` カラムが追加されている |
| AC-06 | `pbevm-show-pv` 出力（コンソール・Excel両方）に `pvTodayActual` カラムが追加されている |
| AC-07 | 進捗率100%のタスクは `pvTodayActual` が0になる |

## 6. インターフェース設計（案）

### 6.1 TaskRowクラスへの追加

```typescript
class TaskRow {
  // 既存プロパティ...

  /**
   * 基準日から終了日までの残日数
   * plotMapでプロットされている日のみカウント
   * 基準日がタスク期間外の場合は0
   *
   * @param baseDate 基準日（Project.baseDateを渡す）
   */
  remainingDays(baseDate: Date): number | undefined

  /**
   * 実行PV（今日やるべきPV）
   * = 残工数 / 残日数
   * = workload × (1 - progressRate) / remainingDays
   * 残日数が0の場合は0を返す
   *
   * @param baseDate 基準日（Project.baseDateを渡す）
   */
  pvTodayActual(baseDate: Date): number | undefined
}
```

> **設計根拠**: 既存の `calculatePV(baseDate)`, `calculateSPI(baseDate)` 等と同じパターンでメソッド引数として基準日を受け取る。

### 6.2 出力イメージ

```
┌──────────┬──────────┬──────┬──────────────┬────────┬─────────┬───────────────┐
│   name   │ workload │ days │ progressRate │ 残日数 │ pvToday │ pvTodayActual │
├──────────┼──────────┼──────┼──────────────┼────────┼─────────┼───────────────┤
│ タスクA  │   2.5    │   3  │     0.6      │    1   │  0.833  │     1.000     │
│ タスクB  │   2.5    │   3  │     0.6      │    2   │  0.833  │     0.500     │
└──────────┴──────────┴──────┴──────────────┴────────┴─────────┴───────────────┘
```

## 7. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| 設計書 | [`TaskRow.pv-today.spec.md`](../domain/features/TaskRow.pv-today.spec.md) |
| テスト | [`TaskRow.pv-today.test.ts`](../../../src/domain/__tests__/TaskRow.pv-today.test.ts) |
| 実装 | [`TaskRow.ts`](../../../src/domain/TaskRow.ts) |
| 用語集 | [`GLOSSARY.md`](../../../docs/GLOSSARY.md) |

## 8. 既存実装との関係

### 8.1 利用可能な既存機能

| 機能 | ファイル | 説明 |
|------|----------|------|
| `plotMap` | TaskRow.ts | Excelの「□」プロット情報を `Map<シリアル値, boolean>` で保持 |
| `isInRange()` | TaskRow.ts | 基準日がplotMapにプロットされていて、かつ期間内かを判定 |
| `workloadPerDay` | TaskRow.ts | `workload / scheduledWorkDays`（計画PV） |
| `generateBaseDates()` | utils.ts | FROM〜TOの日付配列を生成 |

### 8.2 設計上の制約

#### progressRate と基準日の関係

```
PV: ─●─●─●─●─●─●─→ 日ごとに計算可能
EV: ─────────●     基準日の1点のみ
```

- `progressRate` は **Projectの基準日時点のスナップショット** である
- したがって `pvTodayActual` も **Projectの基準日でのみ正しい値** が得られる
- `remainingDays` / `pvTodayActual` は技術的には任意の日付を受け取るが、**Projectの基準日以外を渡しても意味のある値にならない**

#### 正しい使い方

```typescript
// ✅ 正しい: Projectの基準日を使用
const baseDate = project.baseDate
const pvActual = task.pvTodayActual(baseDate)

// ⚠️ 意味がない: 別の日付を使用（progressRateはproject.baseDate時点の値のため）
const pvActual = task.pvTodayActual(someOtherDate)
```

#### 制約の理由

TaskRowはProjectに属しており、そのTaskRowの `progressRate` はProject読み込み時の基準日における進捗率である。別の日付で `pvTodayActual` を計算しても、`残工数 = workload × (1 - progressRate)` の progressRate が基準日時点の値であるため、整合性のある結果にならない。

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-23 | 初版作成 | Claude Code |
