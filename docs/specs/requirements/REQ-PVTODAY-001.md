# 要件定義書: pbevm-show-pv出力に「今日のPV」カラムを追加

**要件ID**: REQ-PVTODAY-001
**GitHub Issue**: #86
**作成日**: 2026-01-22
**ステータス**: Draft
**優先度**: Medium

---

## 1. 概要

`pbevm-show-pv` コマンドの出力に、タスクごとの「今日のPV」（計画PVと実行PV）を表示するカラムを追加する。

## 2. 背景・目的

### 2.1 背景

現在の出力では累積PV（`pv`）は表示されるが、「今日消化すべきPV」が直接わからない。プロジェクト管理において、日次の計画値を確認したいニーズがある。

### 2.2 目的

- タスクごとの日次計画値（計画PV）を可視化する
- 進捗を反映した実態値（実行PV）を可視化する
- 遅れ/前倒しの状況を定量的に把握できるようにする

## 3. 機能要件

### 3.1 主要機能

#### 3.1.1 計画PV（pvToday）

- 計算式: `workload / scheduledWorkDays`
- 計画段階で決まる固定値
- 既存の `workloadPerDay` ゲッターを利用

#### 3.1.2 実行PV（pvTodayActual）

- 計算式: `残工数 / 残日数`
- 進捗を反映した実態値
- 残工数: `workload × (1 - progressRate)`
- 残日数: 基準日から予定終了日までの営業日数（plotMap考慮）

#### 3.1.3 残日数（remainingDays）

- 基準日〜終了日の間でplotMapにプロットされている日数
- 基準日を含む

#### 3.1.4 出力対象

- `pbevm-show-pv` コマンドのテーブル出力
- Excel出力

### 3.2 スコープ外

- 担当者ごとの合計表示（オプション扱い、本要件では必須としない）
- 過去日付での実行PV計算（progressRateが基準日のスナップショットのため）

## 4. 非機能要件

- **パフォーマンス**: 既存の出力速度を維持
- **互換性**: 既存の出力カラムはそのまま維持し、新カラムを追加

## 5. 受け入れ基準

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | `TaskRow` に `calculateRemainingDays(baseDate)` メソッドが追加され、基準日〜終了日のplotMapプロット日数を返す |
| AC-02 | `TaskRow` に `calculatePvTodayActual(baseDate)` メソッドが追加され、`残工数 / 残日数` を返す |
| AC-03 | `pbevm-show-pv` コマンド出力に `pvToday`（計画PV）カラムが表示される |
| AC-04 | `pbevm-show-pv` コマンド出力に `pvTodayActual`（実行PV）カラムが表示される |
| AC-05 | 残日数が0の場合（基準日が終了日より後）、`calculatePvTodayActual` は `undefined` を返す |
| AC-06 | progressRateが未設定の場合、`calculatePvTodayActual` は `undefined` を返す |
| AC-07 | 完了タスク（progressRate = 1.0）の場合、`calculatePvTodayActual` は `0` を返す |

## 6. インターフェース設計（案）

```typescript
// TaskRow クラスへの追加

/**
 * 基準日から終了日までの残日数（plotMapでプロットされている日のみカウント）
 * 基準日を含む
 * @param baseDate 基準日
 * @returns 残日数。計算不能な場合は undefined
 */
calculateRemainingDays(baseDate: Date): number | undefined

/**
 * 実行PV（残工数 / 残日数）
 * 進捗を反映した「今日やるべきPV」
 * @param baseDate 基準日
 * @returns 実行PV。計算不能な場合は undefined。完了タスクは 0
 */
calculatePvTodayActual(baseDate: Date): number | undefined
```

### 6.1 計算ロジック

```
計画PV = workload / scheduledWorkDays  （既存: workloadPerDay）

実行PV = 残工数 / 残日数
       = workload × (1 - progressRate) / remainingDays

残日数 = 基準日から終了日までのplotMap内でtrue（プロット有り）の日数
       ※基準日を含む
```

### 6.2 ユースケース例

**タスクA（遅れ）: 工数2.5MD, 予定日数3日, 進捗率60%, 基準日=終了日**

| 指標 | 計算 | 値 |
|------|------|-----|
| 計画PV | 2.5 / 3 | 0.833 |
| 残工数 | 2.5 × 0.4 | 1.0 |
| 残日数 | 1日 | - |
| 実行PV | 1.0 / 1 | **1.000**（計画より多い→遅れ） |

**タスクB（前倒し）: 工数2.5MD, 予定日数3日, 進捗率60%, 基準日=終了日-1**

| 指標 | 計算 | 値 |
|------|------|-----|
| 計画PV | 2.5 / 3 | 0.833 |
| 残工数 | 2.5 × 0.4 | 1.0 |
| 残日数 | 2日 | - |
| 実行PV | 1.0 / 2 | **0.500**（計画より少ない→前倒し） |

## 7. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| 設計書 | [`TaskRow.pvToday.spec.md`](../domain/features/TaskRow.pvToday.spec.md) |
| テスト | [`TaskRow.pvToday.test.ts`](../../../src/domain/__tests__/TaskRow.pvToday.test.ts) |
| 実装 | [`TaskRow.ts`](../../../src/domain/TaskRow.ts) |
| 用語集 | [`GLOSSARY.md`](../../GLOSSARY.md) |

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-22 | 初版作成 | Claude Code |
