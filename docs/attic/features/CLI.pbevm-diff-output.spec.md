# PbevmDiffUsecase.cli-output-cleanup 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2025-12-24
**要件ID**: REQ-CLI-003
**GitHub Issue**: -
**ソースファイル**: `src/usecase/pbevm-diff-usecase.ts`

---

## 1. 概要

### 1.1 目的

`pbevm-diff` コマンドのタスクDiff出力から、内部実装用プロパティ（`currentTask`, `prevTask`）を除外し、ユーザーにとって意味のある差分情報のみを表示する。

### 1.2 現状の問題

| 問題点 | 内容 |
|-------|------|
| `currentTask` プロパティ | オブジェクト参照のため `[TaskRow]` としか表示されず意味がない |
| `prevTask` プロパティ | 同上 |

### 1.3 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/usecase/pbevm-diff-usecase.ts` | `save()` メソッド内の `console.table()` 呼び出しを修正 |

---

## 2. インターフェース仕様

### 2.1 型定義

```typescript
/**
 * 表示用TaskDiff（内部プロパティを除外）
 */
type DisplayTaskDiff = Omit<TaskDiff, 'currentTask' | 'prevTask'>
```

### 2.2 メソッド/プロパティ追加

```typescript
/**
 * TaskDiff配列から表示用オブジェクト配列を生成
 *
 * @param taskDiffs - TaskDiff配列
 * @returns currentTask, prevTaskを除外したオブジェクト配列
 *
 * @remarks
 * - hasDiff === true のタスクのみをフィルタ
 * - currentTask, prevTask を除外（console.tableで意味のある表示にならないため）
 */
export const formatTaskDiffsForDisplay = (
    taskDiffs: TaskDiff[]
): DisplayTaskDiff[]
```

---

## 3. 処理仕様

### 3.1 処理ロジック

```
1. taskDiffsから hasDiff === true の要素をフィルタ
2. 各要素から currentTask, prevTask を除外
3. 残りのプロパティを持つオブジェクト配列を返却
```

### 3.2 擬似コード

```typescript
export const formatTaskDiffsForDisplay = (taskDiffs: TaskDiff[]) => {
    return taskDiffs
        .filter((row) => row.hasDiff)
        .map(({ currentTask, prevTask, ...rest }) => rest)
}
```

### 3.3 除外対象プロパティ

| プロパティ | 型 | 除外理由 |
|-----------|-----|---------|
| `currentTask` | `TaskRow \| undefined` | オブジェクト参照。console.tableでは意味のある表示にならない |
| `prevTask` | `TaskRow \| undefined` | 同上 |

### 3.4 表示されるプロパティ

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

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | displayTaskDiffsに `currentTask` が含まれない | 全要素で `currentTask` プロパティが存在しない |
| TC-02 | displayTaskDiffsに `prevTask` が含まれない | 全要素で `prevTask` プロパティが存在しない |
| TC-03 | displayTaskDiffsに必要なプロパティが含まれる | `id`, `name`, `diffType` 等が存在する |

### 4.2 境界値

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-04 | 空のtaskDiffs配列 | 空配列を返す |
| TC-05 | hasDiff=falseのみの配列 | 空配列を返す |

---

## 5. エクスポート

該当なし（ユースケース内部の表示整形のみ）

---

## 6. 使用例

該当なし（CLI出力の改善のため、使用方法に変更なし）

---

## 7. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-CLI-003 AC-01 | `pbevm-diff` の出力に `currentTask` が含まれない | TC-01 | ✅ PASS |
| REQ-CLI-003 AC-02 | `pbevm-diff` の出力に `prevTask` が含まれない | TC-02 | ✅ PASS |
| REQ-CLI-003 AC-03 | 差分情報（diffType, progressRateDelta等）は引き続き表示される | TC-03 | ✅ PASS |
| REQ-CLI-003 AC-04 | タスクの識別情報（id, name）は表示される | TC-03 | ✅ PASS |

**テストファイル**: `src/usecase/__tests__/pbevm-diff-usecase.test.ts`

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-24 | 初版作成 | REQ-CLI-003 |
