# pvToday タスク管理

**案件**: pbevm-show-pv出力に「今日のPV」カラムを追加
**要件ID**: REQ-PVTODAY-001
**GitHub Issue**: #86
**作成日**: 2026-01-22
**更新日**: 2026-01-22

---

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| ✅ 完了 | 10 |
| 🔄 進行中 | 0 |
| ⬜ 未着手 | 0 |
| ⏸️ ブロック | 0 |
| **合計** | **10** |

**進捗率**: 100%

---

## タスク一覧

### 1. 仕様フェーズ

| # | 状態 | タスク | 成果物 | 備考 |
|---|------|--------|--------|------|
| 1 | ✅ | 要件定義書作成 | `REQ-PVTODAY-001.md` | 2026-01-22 完了 |
| 2 | ✅ | 詳細仕様書作成 | `TaskRow.pvToday.spec.md` | 2026-01-22 完了 |

### 2. 実装フェーズ

| # | 状態 | タスク | 成果物 | 備考 |
|---|------|--------|--------|------|
| 3 | ✅ | テストコード作成（calculateRemainingDays） | `TaskRow.pvToday.test.ts` | TC-01〜TC-09 |
| 4 | ✅ | テストコード作成（calculatePvTodayActual） | `TaskRow.pvToday.test.ts` | TC-10〜TC-18 |
| 5 | ✅ | 実装（calculateRemainingDays） | `TaskRow.ts` | |
| 6 | ✅ | 実装（calculatePvTodayActual） | `TaskRow.ts` | |

### 3. 統合フェーズ

| # | 状態 | タスク | 成果物 | 備考 |
|---|------|--------|--------|------|
| 7 | ✅ | CLI出力対応（pbevm-show-pv） | `pbevm-show-pv-usecase.ts` | AC-03, AC-04 完了 |
| 8 | ✅ | 全テスト実行・PASS確認 | npm test PASS | 130件PASS |

### 4. 完了フェーズ

| # | 状態 | タスク | 成果物 | 備考 |
|---|------|--------|--------|------|
| 9 | ✅ | トレーサビリティ更新 | 仕様書更新 | AC→TC→実装 完了 |
| 10 | ✅ | マスター設計書反映 | `TaskRow.spec.md` | 任意（スキップ） |

---

## テストケース対応表

| TC-ID | テスト内容 | 対象メソッド | 状態 |
|-------|-----------|-------------|------|
| TC-01 | 基準日=開始日、3日間のタスク | calculateRemainingDays | ✅ |
| TC-02 | 基準日=中間日、3日間のタスク | calculateRemainingDays | ✅ |
| TC-03 | 基準日=終了日 | calculateRemainingDays | ✅ |
| TC-04 | 基準日が終了日より後 | calculateRemainingDays | ✅ |
| TC-05 | 基準日が開始日より前 | calculateRemainingDays | ✅ |
| TC-06 | 1日のみのタスク | calculateRemainingDays | ✅ |
| TC-07 | startDateがundefined | calculateRemainingDays | ✅ |
| TC-08 | endDateがundefined | calculateRemainingDays | ✅ |
| TC-09 | plotMapがundefined | calculateRemainingDays | ✅ |
| TC-10 | 遅れタスク（基準日=終了日） | calculatePvTodayActual | ✅ |
| TC-11 | 前倒しタスク（基準日=終了日-1） | calculatePvTodayActual | ✅ |
| TC-12 | 予定通りタスク | calculatePvTodayActual | ✅ |
| TC-13 | 完了タスク（progressRate=1.0） | calculatePvTodayActual | ✅ |
| TC-14 | 進捗0%のタスク | calculatePvTodayActual | ✅ |
| TC-15 | 残日数=0（終了日過ぎ） | calculatePvTodayActual | ✅ |
| TC-16 | progressRateがundefined | calculatePvTodayActual | ✅ |
| TC-17 | workloadがundefined | calculatePvTodayActual | ✅ |
| TC-18 | 日付データ不正 | calculatePvTodayActual | ✅ |

---

## 完了条件

- [x] テスト全件PASS (130件 - pvToday 20件 + usecase 3件追加)
- [x] CLI出力に pvToday, remainingDays, pvTodayActual カラムが表示される
- [x] 全タスクが ✅ Done
- [ ] PRレビュー完了
