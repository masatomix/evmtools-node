# TaskRow.pv-today タスク管理

**要件ID**: REQ-PV-TODAY-001
**GitHub Issue**: #86
**作成日**: 2026-01-23

---

## タスク一覧

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|:----:|------|------|
| 1 | 要件定義書作成 | ✅ | Claude | REQ-PV-TODAY-001.md |
| 2 | 詳細仕様書作成 | ✅ | Claude | TaskRow.pv-today.spec.md |
| 3 | テストコード作成 | ✅ | Claude | TC-01〜TC-19（単体）19件PASS |
| 4 | TaskRow実装 | ✅ | Claude | remainingDays, pvTodayActual |
| 5 | ユースケース修正 | ✅ | Claude | pbevm-show-pv出力カラム追加 |
| 6 | 統合テスト | ✅ | Claude | TC-20〜TC-22（手動確認） |
| 7 | トレーサビリティ更新 | ✅ | Claude | AC→TC結果を仕様書に反映 |

---

## タスク詳細

### タスク3: テストコード作成

**ファイル**: `src/domain/__tests__/TaskRow.pv-today.test.ts`

**対象テストケース**:
- TC-01〜TC-04: remainingDays 正常系
- TC-05〜TC-07: remainingDays 境界値
- TC-08〜TC-10: remainingDays 異常系
- TC-11〜TC-14: pvTodayActual 正常系
- TC-15〜TC-17: pvTodayActual 境界値
- TC-18〜TC-19: pvTodayActual 異常系

### タスク4: TaskRow実装

**ファイル**: `src/domain/TaskRow.ts`

**追加メソッド**:
```typescript
remainingDays(baseDate: Date): number | undefined
pvTodayActual(baseDate: Date): number | undefined
```

### タスク5: ユースケース修正

**ファイル**: `src/usecase/pbevm-show-pv-usecase.ts`

**修正内容**:
- 出力オブジェクトに `pvToday` (= workloadPerDay) 追加
- 出力オブジェクトに `pvTodayActual` 追加
- 出力オブジェクトに `remainingDays` 追加（オプション）

### タスク6: 統合テスト

**対象テストケース**:
- TC-20: pbevm-show-pvコンソール出力にpvTodayカラム
- TC-21: pbevm-show-pvコンソール出力にpvTodayActualカラム
- TC-22: pbevm-show-pvのExcel出力に両カラム含まれる

### タスク7: トレーサビリティ更新

**対象ファイル**: `docs/specs/domain/features/TaskRow.pv-today.spec.md`

**更新内容**: 要件トレーサビリティ表の「結果」列を ✅ PASS に更新

---

## 進捗サマリー

- **完了**: 7/7
- **残り**: 0タスク
- **ステータス**: 実装完了

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-23 | 初版作成、タスク1,2完了 |
| 2026-01-23 | タスク3〜7完了、実装完了 |
