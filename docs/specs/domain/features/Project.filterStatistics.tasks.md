# Project.filterStatistics タスク管理

**機能名**: filterStatistics
**要件ID**: [REQ-FILTER-STATS-001](../../requirements/REQ-FILTER-STATS-001.md)
**詳細設計**: [Project.filterStatistics.spec.md](Project.filterStatistics.spec.md)
**Issue**: [#120](https://github.com/masatomix/evmtools-node/issues/120)

---

## 進捗サマリー

| フェーズ | ステータス | 完了日 |
|---------|:--------:|-------|
| 要件定義 | ✅ | 2026-01-24 |
| 詳細設計 | ✅ | 2026-01-25 |
| テストコード作成 | ⬜ | - |
| 実装 | ⬜ | - |
| 統合テスト | ⬜ | - |
| トレーサビリティ更新 | ⬜ | - |
| マスター設計書反映 | ⬜ | - |

---

## タスク一覧

### 1. 要件定義書作成 ✅

- [x] GitHub Issue #120 の内容を確認
- [x] REQ-FILTER-STATS-001.md を作成
- [x] 受け入れ基準（AC-01 〜 AC-10）を定義
- [x] verify 結果を反映（v1.2.0）
- [x] コミット・プッシュ

**成果物**: `docs/specs/requirements/REQ-FILTER-STATS-001.md`

---

### 2. 詳細設計書作成 ✅

- [x] インターフェース仕様を定義（型定義、メソッドシグネチャ）
- [x] 処理仕様を定義（擬似コード、ロジック共通化設計）
- [x] テストケース（TC-01 〜 TC-33）を定義
- [x] 要件トレーサビリティを追加
- [x] verify 結果を反映（v1.3.0: filterTasks が親含む全タスクを返す）
- [x] コミット・プッシュ

**成果物**: `docs/specs/domain/features/Project.filterStatistics.spec.md`

---

### 3. テストコード作成 ⬜

- [ ] テストファイル作成 `src/domain/__tests__/Project.filterStatistics.test.ts`
- [ ] filterTasks() テスト（TC-01 〜 TC-08）
- [ ] getStatistics() テスト（TC-10 〜 TC-19）
- [ ] getStatisticsByName() テスト（TC-20 〜 TC-25）
- [ ] 統合テスト（TC-30 〜 TC-33）
- [ ] テスト実行・全 FAIL 確認（実装前なので FAIL が正常）

**成果物**: `src/domain/__tests__/Project.filterStatistics.test.ts`

---

### 4. 実装 ⬜

- [ ] 型定義を追加（TaskFilterOptions, StatisticsOptions）
- [ ] Statistics 型に拡張プロパティを追加
- [ ] filterTasks() メソッドを実装
- [ ] _resolveTasks() プライベートヘルパーを実装
- [ ] _calculateExtendedStats() プライベートヘルパーを実装
- [ ] _calculateDelayStats() プライベートヘルパーを実装
- [ ] getStatistics() オーバーロードを実装
- [ ] _calculateStatistics() を新設、statisticsByProject getter をリファクタリング
- [ ] getStatisticsByName() オーバーロードを実装
- [ ] _calculateAssigneeStats() を新設、statisticsByName getter をリファクタリング
- [ ] テスト実行・全 PASS 確認

**成果物**: `src/domain/Project.ts`（変更）

---

### 5. 統合テスト ⬜

- [ ] 既存テストが全て PASS することを確認
- [ ] 実際の Excel ファイルでの動作確認
- [ ] パフォーマンス確認（1000タスクで100ms以内、NFR-01-1）

---

### 6. トレーサビリティ更新 ⬜

- [ ] 詳細設計書の要件トレーサビリティ表を更新（⏳ → ✅）
- [ ] 要件定義書との整合性を最終確認

---

### 7. マスター設計書反映 ⬜

- [ ] Project.spec.md に filterTasks() メソッドを追加
- [ ] Project.spec.md に getStatistics() メソッドを追加
- [ ] Project.spec.md に getStatisticsByName() メソッドを追加
- [ ] 型定義セクションを更新（TaskFilterOptions, StatisticsOptions）
- [ ] Statistics 型に拡張プロパティを追加
- [ ] ProjectStatistics, AssigneeStatistics の拡張を反映
- [ ] 変更履歴を更新

**成果物**: `docs/specs/domain/master/Project.spec.md`（変更）

---

## 備考

- AC-11（CLI）は次回スコープ
- 既存の getter（statisticsByProject, statisticsByName）との後方互換性を維持
- filterTasks() は親タスク含む全タスクを返す、統計計算は内部でリーフのみを使用
