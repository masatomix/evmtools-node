# 要件定義書: 計算除外レコードの可視化

**要件ID**: REQ-TASK-001
**GitHub Issue**: #42
**作成日**: 2025-12-22
**ステータス**: Approved
**優先度**: High

---

## 1. 概要

### 1.1 目的

PV/EV計算に必要な項目（開始日、終了日、plotMap、稼働予定日数、予定工数）が不足しているタスクは計算から除外される。現状、どのタスクが除外されたかを一覧で確認する手段がないため、合計が合わない原因の特定が困難である。

計算除外されたタスクを一覧で取得できるインターフェースを提供し、問題の特定を容易にする。

### 1.2 背景

- 各行を読み込んで処理する際、PV/EV計算に必要な項目が不足している場合はスキップされる
- スキップされた行がどれか分からず、合計が合わない原因の特定が困難
- 既存の`validStatus`プロパティで個別タスクの有効性は判定可能だが、一覧取得の手段がない

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| Projectから除外タスク一覧を取得 | ✅ |
| 除外理由の表示 | ✅ |
| CLIでの表示 | Phase 2 |

---

## 2. 機能要件

### 2.1 除外タスク一覧の取得

Projectクラスに、計算から除外されたタスクを取得するプロパティ/メソッドを追加する。

#### 2.1.1 対象となる「除外タスク」

`TaskRow.validStatus.isValid === false` のタスク。

#### 2.1.2 除外理由の種類

| 理由コード | 説明 | invalidReasonの例 |
|-----------|------|------------------|
| `DATE_MISSING` | 開始日または終了日が取得できない | `タスクID:1 日付エラー。開始日:[undefined]...` |
| `PLOTMAP_MISSING` | plotMapが取得できない | `タスクID:1 plotMapエラー(undefined)` |
| `WORKDAYS_INVALID` | 稼働予定日数または予定工数が無効 | `タスクID:1 日数エラー(0/空)...` |

### 2.2 出力仕様

```typescript
interface ExcludedTask {
  task: TaskRow           // 除外されたタスク
  reason: string          // 除外理由（validStatus.invalidReason）
}

// Projectクラスに追加
get excludedTasks(): ExcludedTask[]
```

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存のPV/EV計算に影響を与えないこと |
| NF-02 | パフォーマンスに大きな影響を与えないこと（キャッシュ活用可） |

---

## 4. インターフェース設計（案）

### 4.1 Projectクラスへの追加

```typescript
class Project {
  // 既存プロパティ...

  /**
   * 計算から除外されたタスクの一覧を取得
   * validStatus.isValid === false のリーフタスクを返す
   */
  get excludedTasks(): ExcludedTask[]
}
```

### 4.2 使用例

```typescript
const project = await creator.createProject()

// 除外タスクの確認
const excluded = project.excludedTasks
if (excluded.length > 0) {
  console.log(`${excluded.length}件のタスクが計算から除外されました:`)
  excluded.forEach(({ task, reason }) => {
    console.log(`- #${task.sharp} ${task.name}: ${reason}`)
  })
}

// 有効なタスクのみで集計
const validTasks = project.toTaskRows().filter(t => t.validStatus.isValid)
```

---

## 5. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | Project.excludedTasksで除外タスク一覧を取得できる | ✅ PASS | TC-02〜TC-06 |
| AC-02 | 除外理由（reason）が正しく設定されている | ✅ PASS | TC-09, TC-10 |
| AC-03 | 有効なタスクのみのプロジェクトではexcludedTasksが空配列 | ✅ PASS | TC-01, TC-07 |
| AC-04 | 既存のPV/EV計算に影響がない | ✅ PASS | 既存テスト95件全てPASS |

**確認日**: 2025-12-22
**テスト実行結果**: 10件全てPASS（新規追加分）、95件全てPASS（全体）

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| 設計書 | `docs/specs/domain/Project.excludedTasks.spec.md` | 詳細仕様 |
| 実装 | `src/domain/Project.ts` | excludedTasksプロパティ、ExcludedTask型 |
| テスト | `src/domain/__tests__/Project.excludedTasks.test.ts` | 10件 |

---

## 7. 備考

### 7.1 既存実装との関係

- `TaskRow.validStatus`: 個別タスクの有効性判定（既存）
- `Project.excludedTasks`: 除外タスクの一覧取得（本要件で追加）

### 7.2 Phase 2での拡張予定

- CLIコマンドでの除外タスク表示
- Excel出力時の除外タスクハイライト
