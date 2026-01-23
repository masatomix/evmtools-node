# 要件定義書: 遅延タスク抽出機能

**要件ID**: REQ-DELAY-001
**GitHub Issue**: #115
**作成日**: 2026-01-23
**ステータス**: Draft
**優先度**: Medium

---

## 1. 概要

### 1.1 目的

プロジェクト管理において、遅延しているタスクを早期に特定し対処することは重要である。現在、スキル側（`my-pbtask`）で遅延タスク抽出ロジックを実装しているが、これは純粋なEVMドメインロジックであり、evmtools-node 本体で提供すべき機能である。

`Project` クラスに遅延タスク抽出メソッドを追加し、他のユーザーにも汎用的に利用可能な機能として提供する。

### 1.2 背景

- スキル側で evmtools-node の API をラップして遅延タスク抽出を行っている
- `TaskRow.finished`（完了判定）、`Project.getFullTaskName()`（フルパス名取得）は既に本体に存在
- 遅延日数計算に必要な `formatRelativeDaysNumber()` も既に存在（`TaskDiff.daysOverdueAt` で使用中）
- 遅延タスクの抽出は純粋なドメインロジックであり、本体に統合することで再利用性が向上

### 1.3 設計方針

> **重要**: 遅延日数は `baseDate` と `endDate` から **動的に計算** する。`TaskRow.delayDays`（Excel読み込み値）は使用しない。
>
> - **計算式**: `delayDays = baseDate - endDate`（日数）
> - 既存の `formatRelativeDaysNumber()` を活用（符号を反転して使用）
> - `Project.baseDate` を基準日として使用
>
> **理由**: Excel の値に依存せず、任意の基準日で遅延状況を判定できるようにするため。

### 1.4 スコープ

| 項目 | 対象 |
|------|:----:|
| Project.getDelayedTasks() メソッドの追加 | ✅ |
| 遅延日数の動的計算ロジック（フィルタリング用） | ✅ |
| DelayedTask 型の定義 | ❌ 不要（TaskRow をそのまま返す） |
| CLIコマンドでの表示 | Phase 2 |

---

## 2. 機能要件

### 2.1 遅延タスク抽出メソッド

`Project` クラスに、遅延しているタスクを抽出するメソッドを追加する。

#### 2.1.1 対象となる「遅延タスク」

以下の条件を **すべて** 満たすタスク:

1. `isLeaf === true`（リーフタスクのみ）
2. `finished === false`（未完了）
3. `delayDays > minDays`（指定した閾値より遅延日数が大きい）

#### 2.1.2 出力項目

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | `number` | タスクID |
| `name` | `string` | タスク名 |
| `fullTaskName` | `string` | フルパス名（親タスク含む） |
| `assignee` | `string \| undefined` | 担当者 |
| `delayDays` | `number` | 遅延日数 |
| `dueDate` | `Date \| undefined` | 予定終了日 |
| `progressRate` | `number \| undefined` | 進捗率 |

### 2.2 メソッドシグネチャ

```typescript
getDelayedTasks(minDays?: number): DelayedTask[]
```

- `minDays`: 遅延日数の閾値（デフォルト: 0）
- 戻り値: 遅延日数の降順でソートされた `DelayedTask` 配列

### 2.3 ソート順

遅延日数（`delayDays`）の降順でソートする。遅延が大きいタスクが先頭に来る。

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の PV/EV 計算に影響を与えないこと |
| NF-02 | `toTaskRows()` のキャッシュを活用し、パフォーマンスへの影響を最小化すること |

---

## 4. インターフェース設計

### 4.1 Project クラスへの追加

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
   * - 遅延日数は baseDate - endDate で動的に計算される
   * - TaskRow をそのまま返す（新しい型は定義しない）
   * - フルパス名が必要な場合は getFullTaskName(task) を使用
   */
  getDelayedTasks(minDays?: number): TaskRow[]
}
```

### 4.2 使用例

```typescript
const project = await creator.createProject()

// 遅延タスクの取得（すべての遅延）
const allDelayed = project.getDelayedTasks()

// 3日以上遅延しているタスク
const severeDelays = project.getDelayedTasks(3)

// 結果の表示
severeDelays.forEach(task => {
  const fullName = project.getFullTaskName(task)
  console.log(`${fullName} (担当: ${task.assignee ?? '未割当'})`)
})
```

---

## 5. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | `Project.getDelayedTasks()` メソッドが実装されている | ⬜ | - |
| AC-02 | `delayDays`（動的計算: baseDate - endDate）`> minDays` かつ未完了のタスクのみ抽出される | ⬜ | - |
| AC-03 | 遅延日数の降順でソートされる | ⬜ | - |
| AC-04 | リーフタスクのみが対象となる | ⬜ | - |
| AC-05 | 単体テストが PASS する | ⬜ | - |

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| 設計書 | [`Project.delayedTasks.spec.md`](../domain/features/Project.delayedTasks.spec.md) | 詳細仕様（作成予定） |
| 用語集 | [`GLOSSARY.md`](../../GLOSSARY.md) | EVM用語、ドメインモデル定義 |
| 移行元 | `my-pbtask/.claude/skills/evmtools/scripts/src/core/delayed.ts` | スキル側の既存実装 |

---

## 7. 備考

### 7.1 既存実装との関係

**使用するもの:**
- `TaskRow.finished`: 完了判定（progressRate === 1.0）
- `TaskRow.endDate`: 予定終了日（遅延計算に使用）
- `Project.baseDate`: 基準日（遅延計算に使用）
- `Project.getFullTaskName()`: フルパス名取得（既存メソッド）
- `formatRelativeDaysNumber()`: 日数計算ユーティリティ（`TaskDiff.daysOverdueAt` で使用中）

**使用しないもの:**
- `TaskRow.delayDays`: Excel から読み込んだ遅延日数（本機能では使用しない）

### 7.2 移行元のロジック

```typescript
// スキル側の既存実装（参考）
// ※ 本実装では task.delayDays（Excel値）ではなく動的計算を使用
export function getDelayedTasksCore(
  project: Project,
  taskRows: TaskRow[],
  minDays: number = 0
): DelayedResult {
  const delayedTasks = taskRows
    .filter(task => task.delayDays > minDays && !task.finished)  // ← 動的計算に変更
    .map(task => ({
      id: task.id,
      name: task.name,
      fullTaskName: project.getFullTaskName(task),
      assignee: task.assignee,
      delayDays: task.delayDays,  // ← 動的計算に変更
      dueDate: task.endDate,
      progressRate: task.progressRate,
    }))
    .sort((a, b) => b.delayDays - a.delayDays)
  // ...
}
```

### 7.3 Phase 2での拡張予定

- CLIコマンド `pbevm-show-delayed` の追加
- Excel出力時の遅延タスクハイライト
