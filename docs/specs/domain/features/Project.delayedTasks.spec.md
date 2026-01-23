# Project.getDelayedTasks 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2026-01-23
**要件ID**: REQ-DELAY-001
**GitHub Issue**: #115
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 概要

### 1.1 目的

`Project` クラスに `getDelayedTasks()` メソッドを追加し、遅延しているタスクを一覧で取得できるようにする。スキル側（`my-pbtask`）にある遅延タスク抽出ロジックを evmtools-node 本体に移行する。

### 1.2 設計方針

> **重要**: 遅延日数は `baseDate` と `endDate` から **動的に計算** する。`TaskRow.delayDays`（Excel読み込み値）は使用しない。
>
> - **計算式**: `delayDays = baseDate - endDate`（カレンダー日数）
> - **工期ベース**: 遅延日数は「工期」（カレンダー日数）であり、「工数」（人日・作業量）ではない
> - 既存の `formatRelativeDaysNumber(baseDate, endDate)` を活用（符号を反転）
> - `Project.baseDate` を基準日として使用
> - `endDate` が未設定のタスクは遅延判定の対象外
> - 土日・祝日は考慮せず、単純なカレンダー日数差で計算
>
> **理由**: Excel の値に依存せず、任意の基準日で遅延状況を判定できるようにするため。
>
> **用語参照**: [GLOSSARY.md](../../../../GLOSSARY.md) の「工期」「工数」を参照。

### 1.3 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/domain/Project.ts` | `getDelayedTasks()` メソッドを追加 |

---

## 2. インターフェース仕様

### 2.1 メソッド追加

```typescript
class Project {
  // 既存メソッド...

  /**
   * 遅延しているタスクの一覧を取得
   *
   * @param minDays 遅延日数の閾値（デフォルト: 0）
   * @returns 遅延タスクの配列（遅延日数降順）
   *
   * @remarks
   * - TaskRow をそのまま返す（新しい型は定義しない）
   * - isLeaf === true のタスクのみを対象とする
   * - finished === false（未完了）のタスクのみを対象とする
   * - 遅延日数（baseDate - endDate）> minDays のタスクを返す
   * - 結果は遅延日数の降順でソートされる
   * - フルパス名が必要な場合は getFullTaskName(task) を使用
   */
  getDelayedTasks(minDays?: number): TaskRow[]
}
```

---

## 3. 処理仕様

### 3.1 処理ロジック

```
1. minDays のデフォルト値を 0 に設定
2. toTaskRows() でフラットなタスク配列を取得
3. isLeaf === true のタスクをフィルタ
4. finished === false（未完了）のタスクをフィルタ
5. endDate が設定されているタスクをフィルタ
6. 遅延日数を動的に計算: delayDays = baseDate - endDate
7. delayDays > minDays のタスクをフィルタ
8. delayDays の降順でソート
9. TaskRow[] として返却（型変換なし）
```

### 3.2 擬似コード

```typescript
import { formatRelativeDaysNumber } from '../common'

getDelayedTasks(minDays: number = 0): TaskRow[] {
  const baseDate = this.baseDate

  // 遅延日数を計算するヘルパー関数
  const calcDelayDays = (task: TaskRow): number => {
    // formatRelativeDaysNumber は endDate - baseDate を返すので符号反転
    return -(formatRelativeDaysNumber(baseDate, task.endDate) ?? 0)
  }

  return this.toTaskRows()
    .filter(task => task.isLeaf)
    .filter(task => !task.finished)
    .filter(task => task.endDate !== undefined)
    .filter(task => calcDelayDays(task) > minDays)
    .sort((a, b) => calcDelayDays(b) - calcDelayDays(a))
}
```

### 3.3 計算式の詳細

```
formatRelativeDaysNumber(baseDate, endDate) = endDate - baseDate
  → 期限まで何日か（正: 未来、負: 過去）

delayDays = -(endDate - baseDate) = baseDate - endDate
  → 何日遅延しているか（正: 遅延、負: 前倒し）

例:
  baseDate = 2025-01-20, endDate = 2025-01-17
  formatRelativeDaysNumber = -3 （3日前に期限切れ）
  delayDays = 3 （3日遅延）
```

### 3.4 パフォーマンス考慮事項

- `toTaskRows()` が既にキャッシュを持っているため、追加のキャッシュは不要
- 呼び出しごとに filter/map/sort が実行されるが、タスク数が数百程度なら問題なし
- `getFullTaskName()` は各タスクの親を辿るため O(depth) だが、通常のプロジェクト深度では問題なし

### 3.5 エッジケース

| ケース | 挙動 |
|-------|------|
| `endDate` が `undefined` のタスク | 除外（遅延判定不可） |
| `delayDays` が 0 のタスク（`minDays=0`） | 除外（`> 0` の条件を満たさない） |
| `delayDays` が負（前倒し）のタスク | 除外（遅延ではない） |
| `finished === true` のタスク | 除外（完了済み） |
| 親タスク（`isLeaf === false`） | 除外（集計対象外） |

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | 遅延タスクがない場合（全タスクの endDate > baseDate） | `getDelayedTasks()` が空配列 `[]` |
| TC-02 | 遅延タスク（endDate < baseDate）がある場合 | 該当タスクが結果に含まれ、delayDays が正しく計算される |
| TC-03 | 複数の遅延タスクがある場合 | 遅延日数の降順でソートされる |
| TC-04 | minDays を指定した場合 | minDays より大きい遅延のみ抽出 |

### 4.2 フィルタリング

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-05 | 完了タスク（finished=true）がある場合 | 結果に含まれない |
| TC-06 | 親タスク（isLeaf=false）のみ遅延の場合 | 空配列（親は対象外） |
| TC-07 | endDate が undefined のタスク | 結果に含まれない（遅延計算不可） |
| TC-08 | 計算された delayDays が 0 のタスク（minDays=0） | 結果に含まれない（>0 が条件） |
| TC-09 | 計算された delayDays が負（前倒し）のタスク | 結果に含まれない |

### 4.3 出力内容

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-10 | 返り値が TaskRow[] である | TaskRow のプロパティがそのまま使える |
| TC-11 | getFullTaskName() と組み合わせて使用可能 | フルパス名を取得できる |

### 4.4 遅延日数の計算

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-15 | baseDate=1/20, endDate=1/17 のタスク | delayDays = 3（3日遅延） |
| TC-16 | baseDate=1/20, endDate=1/20 のタスク | delayDays = 0（当日期限、遅延なし扱い） |
| TC-17 | baseDate=1/20, endDate=1/23 のタスク | delayDays = -3（3日前倒し、対象外） |

### 4.5 境界値

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-12 | タスクが 0 件の場合 | 空配列 `[]` |
| TC-13 | minDays = 5 で delayDays = 5 のタスク | 結果に含まれない（> であり >= ではない） |
| TC-14 | minDays = 5 で delayDays = 6 のタスク | 結果に含まれる |

---

## 5. 使用例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

const creator = new ExcelProjectCreator('project.xlsm')
const project = await creator.createProject()

// すべての遅延タスクを取得
const allDelayed = project.getDelayedTasks()
console.log(`遅延タスク: ${allDelayed.length}件`)

// 3日以上遅延しているタスクのみ
const severeDelays = project.getDelayedTasks(3)

// 結果の表示
severeDelays.forEach(task => {
  const fullName = project.getFullTaskName(task)
  console.log(`${fullName}`)
  console.log(`  担当: ${task.assignee ?? '未割当'}`)
  console.log(`  進捗: ${task.progressRate ? `${task.progressRate * 100}%` : '未設定'}`)
})

// 担当者別に集計
const byAssignee = allDelayed.reduce((acc, task) => {
  const key = task.assignee ?? '未割当'
  acc[key] = (acc[key] ?? 0) + 1
  return acc
}, {} as Record<string, number>)

console.log('担当者別遅延タスク数:', byAssignee)
```

---

## 6. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-DELAY-001 AC-01 | getDelayedTasks() が実装されている | TC-01〜TC-04 | ✅ PASS |
| REQ-DELAY-001 AC-02 | delayDays（動的計算）> minDays かつ未完了のみ抽出 | TC-04, TC-05, TC-08, TC-15〜TC-17 | ✅ PASS |
| REQ-DELAY-001 AC-03 | 遅延日数の降順でソート | TC-03 | ✅ PASS |
| REQ-DELAY-001 AC-04 | リーフタスクのみが対象 | TC-06 | ✅ PASS |
| REQ-DELAY-001 AC-05 | 単体テストが PASS | 全 TC (17件) | ✅ PASS |

**テストファイル**: `src/domain/__tests__/Project.delayedTasks.test.ts`
**テスト実行結果**: 17/17 PASS (2026-01-23)

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2026-01-23 | 初版作成 | REQ-DELAY-001 |
| 1.1.0 | 2026-01-23 | 遅延日数を動的計算に変更（Excel値を使用しない） | REQ-DELAY-001 |
| 1.2.0 | 2026-01-23 | TaskRow をそのまま返す設計に変更（DelayedTask 型を削除） | REQ-DELAY-001 |
| 1.3.0 | 2026-01-23 | 工期ベースであることを明記、実装完了、テスト17件PASS | REQ-DELAY-001 |
