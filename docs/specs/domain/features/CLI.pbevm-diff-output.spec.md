# pbevm-diff出力整形 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2025-12-24
**要件ID**: REQ-CLI-003
**ソースファイル**: `src/usecase/pbevm-diff-usecase.ts`

---

## 1. 概要

`pbevm-diff` コマンドのタスクDiff出力から、内部実装用プロパティ（`currentTask`, `prevTask`）を除外し、ユーザーにとって意味のある差分情報のみを表示する。

---

## 2. 変更仕様

### 2.1 対象ファイル

| ファイル | 変更箇所 |
|---------|---------|
| `src/usecase/pbevm-diff-usecase.ts` | `save()` メソッド内の `console.table()` 呼び出し |

### 2.2 除外対象プロパティ

| プロパティ | 型 | 除外理由 |
|-----------|-----|---------|
| `currentTask` | `TaskRow \| undefined` | オブジェクト参照。console.tableでは `[TaskRow]` としか表示されず意味がない |
| `prevTask` | `TaskRow \| undefined` | 同上 |

### 2.3 変更内容

`save()` メソッド内の taskDiffs 表示処理を変更：

**変更前**:
```typescript
if (taskDiffs) {
    console.log('タスクDiff')
    console.table(taskDiffs.filter((row) => row.hasDiff))
    // ...
}
```

**変更後**:
```typescript
if (taskDiffs) {
    console.log('タスクDiff')
    // currentTask, prevTask を除外して表示
    const displayTaskDiffs = taskDiffs
        .filter((row) => row.hasDiff)
        .map(({ currentTask, prevTask, ...rest }) => rest)
    console.table(displayTaskDiffs)
    // ...
}
```

### 2.4 表示されるプロパティ

変更後も表示されるプロパティ（TaskDiff型から `currentTask`, `prevTask` を除いたもの）：

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `id` | `number` | タスクID |
| `name` | `string` | タスク名 |
| `fullName` | `string` | フルパス名 |
| `assignee` | `string \| undefined` | 担当者 |
| `diffType` | `DiffType` | 差分種別 |
| `deltaProgressRate` | `number \| undefined` | 進捗率変化 |
| `prevProgressRate` | `number \| undefined` | 前回進捗率 |
| `currentProgressRate` | `number \| undefined` | 現在進捗率 |
| `prevPV` | `number \| undefined` | 前回PV |
| `currentPV` | `number \| undefined` | 現在PV |
| `deltaPV` | `number \| undefined` | PV変化 |
| `prevEV` | `number \| undefined` | 前回EV |
| `currentEV` | `number \| undefined` | 現在EV |
| `deltaEV` | `number \| undefined` | EV変化 |
| `hasDiff` | `boolean` | 差分有無 |
| その他 | - | TaskDiffの残りのプロパティ |

---

## 3. 影響範囲

### 3.1 影響あり

| 項目 | 影響内容 |
|------|---------|
| CLI出力 | `currentTask`, `prevTask` カラムが表示されなくなる |

### 3.2 影響なし

| 項目 | 理由 |
|------|------|
| Excel出力 | `json2workbook` には元の `taskDiffs` を渡すため変更なし |
| 他のDiff（ProjectDiff, AssigneeDiff） | TaskRow参照を持たないため対象外 |
| ドメインロジック | 表示整形のみのため影響なし |

---

## 4. テスト仕様

### 4.1 テストファイル

`src/usecase/__tests__/pbevm-diff-usecase.test.ts`

### 4.2 テストケース

| テストID | テスト内容 | 期待結果 |
|---------|----------|---------|
| TC-01 | displayTaskDiffsに `currentTask` が含まれない | 全要素で `currentTask` プロパティが存在しない |
| TC-02 | displayTaskDiffsに `prevTask` が含まれない | 全要素で `prevTask` プロパティが存在しない |
| TC-03 | displayTaskDiffsに必要なプロパティが含まれる | `id`, `name`, `diffType` 等が存在する |

### 4.3 テストアプローチ

表示整形ロジックを直接テストするため、ヘルパー関数を抽出してテスト可能にする。

```typescript
// テスト対象の関数を抽出
export const formatTaskDiffsForDisplay = (taskDiffs: TaskDiff[]) => {
    return taskDiffs
        .filter((row) => row.hasDiff)
        .map(({ currentTask, prevTask, ...rest }) => rest)
}
```

---

## 5. インターフェース仕様

### 5.1 formatTaskDiffsForDisplay 関数

```typescript
/**
 * TaskDiff配列から表示用オブジェクト配列を生成
 * @param taskDiffs - TaskDiff配列
 * @returns currentTask, prevTaskを除外したオブジェクト配列
 */
export const formatTaskDiffsForDisplay = (
    taskDiffs: TaskDiff[]
): Omit<TaskDiff, 'currentTask' | 'prevTask'>[]
```

---

## 6. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-CLI-003 AC-01 | `pbevm-diff` の出力に `currentTask` が含まれない | TC-01 | ✅ PASS |
| REQ-CLI-003 AC-02 | `pbevm-diff` の出力に `prevTask` が含まれない | TC-02 | ✅ PASS |
| REQ-CLI-003 AC-03 | 差分情報（diffType, progressRateDelta等）は引き続き表示される | TC-03 | ✅ PASS |
| REQ-CLI-003 AC-04 | タスクの識別情報（id, name）は表示される | TC-03 | ✅ PASS |

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-24 | 初版作成 | REQ-CLI-003 |
