# Project.getDelayedTasks タスク管理

**要件ID**: REQ-DELAY-001
**GitHub Issue**: #115
**ブランチ**: `feature/115-delayed-tasks`
**作成日**: 2026-01-23

---

## タスク一覧

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|:----:|------|------|
| 1 | 要件定義書作成 | ✅ | - | `REQ-DELAY-001.md` |
| 2 | 詳細仕様書作成 | ✅ | - | `Project.delayedTasks.spec.md` |
| 3 | タスク管理ファイル作成 | ✅ | - | 本ファイル |
| 4 | テストコード作成 | ✅ | - | `Project.delayedTasks.test.ts` (17件) |
| 5 | 実装 | ✅ | - | `Project.ts` に `getDelayedTasks()` 追加 |
| 6 | テスト実行・PASS確認 | ✅ | - | 17/17 PASS |
| 7 | トレーサビリティ更新 | ✅ | - | AC → TC 対応表を更新 |
| 8 | コミット・プッシュ | ✅ | - | 814ca94 |

---

## 進捗サマリー

- **完了**: 8 / 8
- **残り**: 0

---

## タスク詳細

### タスク 4: テストコード作成

**ファイル**: `src/domain/__tests__/Project.delayedTasks.test.ts`

実装すべきテストケース（詳細設計書より）:

| TC-ID | テスト内容 |
|-------|-----------|
| TC-01 | 遅延タスクがない場合 → 空配列 |
| TC-02 | 遅延タスク（endDate < baseDate）がある場合 → 結果に含まれる |
| TC-03 | 複数の遅延タスク → 遅延日数の降順でソート |
| TC-04 | minDays を指定した場合 → 閾値より大きい遅延のみ |
| TC-05 | 完了タスク（finished=true） → 結果に含まれない |
| TC-06 | 親タスク（isLeaf=false） → 結果に含まれない |
| TC-07 | endDate が undefined → 結果に含まれない |
| TC-08 | delayDays が 0（minDays=0） → 結果に含まれない |
| TC-09 | delayDays が負（前倒し） → 結果に含まれない |
| TC-10 | 返り値が TaskRow[] である |
| TC-11 | getFullTaskName() と組み合わせて使用可能 |
| TC-12 | タスクが 0 件 → 空配列 |
| TC-13 | minDays=5, delayDays=5 → 含まれない（> であり >=ではない） |
| TC-14 | minDays=5, delayDays=6 → 含まれる |
| TC-15 | baseDate=1/20, endDate=1/17 → delayDays=3 |
| TC-16 | baseDate=1/20, endDate=1/20 → delayDays=0（対象外） |
| TC-17 | baseDate=1/20, endDate=1/23 → delayDays=-3（対象外） |

### タスク 5: 実装

**ファイル**: `src/domain/Project.ts`

```typescript
getDelayedTasks(minDays: number = 0): TaskRow[] {
  const baseDate = this.baseDate

  const calcDelayDays = (task: TaskRow): number => {
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

### タスク 7: トレーサビリティ更新

詳細設計書のトレーサビリティセクションを更新:
- テスト結果を ✅ PASS に変更
- テスト証跡（テストファイル・行番号）を追記

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-23 | 初版作成 |
