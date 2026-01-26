# タスク管理: 完了予測機能の整理とフィルタ対応

**要件ID**: REQ-REFACTOR-002
**GitHub Issue**: #140
**ブランチ**: `feature/140-completion-forecast-refactor`
**作成日**: 2026-01-26

---

## 進捗サマリ

| フェーズ | 状態 | 進捗 |
|---------|------|------|
| 要件定義 | ✅ 完了 | 100% |
| 詳細設計 | ✅ 完了 | 100% |
| テストコード | ⬜ 未着手 | 0% |
| 実装 | ⬜ 未着手 | 0% |
| 統合テスト | ⬜ 未着手 | 0% |
| ドキュメント | ⬜ 未着手 | 0% |

**全体進捗**: 2/7 タスク完了 (29%)

---

## タスク一覧

### Phase 1: 仕様策定

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|------|------|------|
| 1 | 要件定義書作成 | ✅ 完了 | Claude | REQ-REFACTOR-002.md |
| 2 | 詳細設計書作成 | ✅ 完了 | Claude | Project.completion-forecast-refactor.spec.md |

### Phase 2: テストコード作成（テストファースト）

| # | タスク | 状態 | 担当 | 対応TC |
|---|--------|------|------|--------|
| 3 | `_calculateBasicStats()` テスト作成 | ⬜ 未着手 | - | TC-01〜TC-03 |
| 4 | オーバーロードテスト作成 | ⬜ 未着手 | - | TC-04〜TC-08 |
| 5 | 後方互換性テスト作成 | ⬜ 未着手 | - | TC-09〜TC-12 |
| 6 | リファクタリング検証テスト作成 | ⬜ 未着手 | - | TC-13〜TC-14 |
| 7 | 境界値テスト作成 | ⬜ 未着手 | - | TC-15〜TC-18 |

### Phase 3: 実装

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|------|------|------|
| 8 | `BasicStats` 型追加 | ⬜ 未着手 | - | 新規型定義 |
| 9 | `_calculateBasicStats()` 実装 | ⬜ 未着手 | - | 内部メソッド |
| 10 | `calculateCompletionForecast()` オーバーロード追加 | ⬜ 未着手 | - | 3パターン |
| 11 | `calculateCompletionForecast()` 内部修正 | ⬜ 未着手 | - | `_calculateBasicStats()` 使用 |
| 12 | `_calculateExtendedStats()` 修正 | ⬜ 未着手 | - | 高性能版呼び出し |
| 13 | `_calculateCompletionForecastForTasks()` 削除 | ⬜ 未着手 | - | 旧メソッド削除 |

### Phase 4: 検証・ドキュメント

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|------|------|------|
| 14 | 統合テスト実行 | ⬜ 未着手 | - | TC-19, TC-20 |
| 15 | 既存テスト全件PASS確認 | ⬜ 未着手 | - | `npm test` |
| 16 | 要件トレーサビリティ更新 | ⬜ 未着手 | - | spec.md 更新 |
| 17 | マスター設計書反映 | ⬜ 未着手 | - | Project.spec.md 更新 |

---

## 依存関係

```
[1] 要件定義 ──┐
              ├──▶ [3-7] テスト作成 ──▶ [8-13] 実装 ──▶ [14-15] 検証
[2] 詳細設計 ──┘                                          │
                                                          ▼
                                              [16-17] ドキュメント
```

---

## 実装メモ

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/domain/Project.ts` | `_calculateBasicStats()` 追加、`calculateCompletionForecast()` 修正、`_calculateExtendedStats()` 修正、`_calculateCompletionForecastForTasks()` 削除 |
| `src/domain/__tests__/Project.completionForecast.test.ts` | テストケース追加 |
| `docs/specs/domain/master/Project.spec.md` | 仕様更新 |
| `docs/specs/domain/features/Project.completion-forecast-refactor.spec.md` | トレーサビリティ更新 |

### 注意点

1. **循環参照回避**: `calculateCompletionForecast()` は `statisticsByProject` を参照せず、`_calculateBasicStats()` を使用
2. **後方互換性**: 既存の `calculateCompletionForecast()` 呼び出しが引き続き動作することを確認
3. **簡易版の挙動**: `_calculateExtendedStats()` は `dailyPvOverride: 1.0` で高性能版を呼び出し

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-26 | 初版作成 |
