# Project.excludedTasks 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2025-12-22
**要件ID**: REQ-TASK-001
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 概要

Projectクラスに`excludedTasks`プロパティを追加し、PV/EV計算から除外されたタスクを一覧で取得できるようにする。

---

## 2. インターフェース仕様

### 2.1 ExcludedTask型

```typescript
/**
 * 計算から除外されたタスクの情報
 */
export interface ExcludedTask {
  /** 除外されたタスク */
  task: TaskRow
  /** 除外理由（validStatus.invalidReason） */
  reason: string
}
```

### 2.2 Projectクラスへの追加

```typescript
class Project {
  // 既存プロパティ...

  /**
   * 計算から除外されたタスクの一覧を取得
   *
   * @returns 除外されたタスクとその理由の配列
   *
   * @remarks
   * - isLeaf === true のタスクのみを対象とする
   * - validStatus.isValid === false のタスクを返す
   * - 結果はキャッシュされる（toTaskRows()と同様）
   */
  get excludedTasks(): ExcludedTask[]
}
```

---

## 3. 処理仕様

### 3.1 除外判定ロジック

```
1. toTaskRows() でフラットなタスク配列を取得
2. isLeaf === true のタスクをフィルタ
3. 各タスクの validStatus を確認
4. validStatus.isValid === false のタスクを収集
5. ExcludedTask[] として返却
```

### 3.2 擬似コード

```typescript
get excludedTasks(): ExcludedTask[] {
  return this.toTaskRows()
    .filter(task => task.isLeaf)
    .filter(task => !task.validStatus.isValid)
    .map(task => ({
      task,
      reason: task.validStatus.invalidReason ?? '理由不明'
    }))
}
```

### 3.3 キャッシュ戦略

- `toTaskRows()` が既にキャッシュを持っているため、追加のキャッシュは不要
- 呼び出しごとにfilter/mapが実行されるが、タスク数が数百程度なら問題なし
- 将来的にパフォーマンス問題が発生した場合は `_cachedExcludedTasks` を追加

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | 全タスクが有効な場合 | `excludedTasks` が空配列 `[]` |
| TC-02 | 開始日が未設定のタスクがある場合 | 該当タスクが `excludedTasks` に含まれる |
| TC-03 | 終了日が未設定のタスクがある場合 | 該当タスクが `excludedTasks` に含まれる |
| TC-04 | plotMapが未設定のタスクがある場合 | 該当タスクが `excludedTasks` に含まれる |
| TC-05 | 稼働予定日数が0のタスクがある場合 | 該当タスクが `excludedTasks` に含まれる |
| TC-06 | 複数の無効タスクがある場合 | 全ての無効タスクが `excludedTasks` に含まれる |

### 4.2 境界値

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-07 | タスクが0件の場合 | `excludedTasks` が空配列 `[]` |
| TC-08 | 親タスク（isLeaf=false）のみ無効な場合 | `excludedTasks` が空配列（親は対象外） |

### 4.3 reason の検証

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-09 | 日付エラーの場合のreason | `"タスクID:X 日付エラー..."` 形式 |
| TC-10 | 日数エラーの場合のreason | `"タスクID:X 日数エラー..."` 形式 |

---

## 5. エクスポート

`src/domain/index.ts` に以下を追加：

```typescript
export type { ExcludedTask } from './Project'
```

---

## 6. 使用例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

const creator = new ExcelProjectCreator('project.xlsm')
const project = await creator.createProject()

// 除外タスクの確認
const excluded = project.excludedTasks
console.log(`除外タスク: ${excluded.length}件`)

excluded.forEach(({ task, reason }) => {
  console.log(`- #${task.sharp} ${task.name}`)
  console.log(`  理由: ${reason}`)
})

// 統計情報と組み合わせて表示
const stats = project.statisticsByProject[0]
console.log(`有効タスク: ${stats.totalTasksCount}件`)
console.log(`除外タスク: ${excluded.length}件`)
console.log(`合計: ${stats.totalTasksCount! + excluded.length}件`)
```

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-22 | 初版作成 | REQ-TASK-001 |
