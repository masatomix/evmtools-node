# CLI.tree タスク管理

**要件ID**: REQ-TREE-001
**GitHub Issue**: [#161](https://github.com/masatomix/evmtools-node/issues/161)
**ブランチ**: `feature/161-tree-command`
**作成日**: 2026-01-30

---

## タスク一覧

### フェーズ 1: 仕様作成

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|------|------|------|
| 1 | 要件定義書作成 | ✅ | - | `REQ-TREE-001.md` |
| 2 | 詳細仕様書作成 | ✅ | - | `CLI.tree.spec.md` |

### フェーズ 2: 実装

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|------|------|------|
| 3 | TreeFormatter 単体テスト作成 | ✅ | - | TC-01〜TC-06 |
| 4 | TreeFormatter 実装 | ✅ | - | `src/common/TreeFormatter.ts` |
| 5 | TreeFormatter エクスポート追加 | ✅ | - | `src/common/index.ts` |
| 6 | CLI 統合テスト作成 | ✅ | - | TC-07〜TC-09 |
| 7 | cli-pbevm-tree.ts 実装 | ✅ | - | `src/presentation/` |
| 8 | package.json bin 登録 | ✅ | - | `pbevm-tree` |
| 12 | Project.getTree() テスト作成 | ✅ | - | TC-10, TC-11 |
| 13 | Project.getTree() 実装 | ✅ | - | `src/domain/Project.ts` |

### フェーズ 3: 検証・完了

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|------|------|------|
| 9 | 全テスト実行・PASS確認 | ✅ | - | `npm test` 262 passed |
| 10 | トレーサビリティ更新 | ✅ | - | AC → TC 結果記入 |
| 11 | コミット・プッシュ | ⬜ | - | feature ブランチ |

---

## 進捗サマリ

- **完了**: 12 / 13
- **残り**: 1 タスク（#11 コミット）

---

## テストケース対応表

| TC-ID | テスト内容 | 対応タスク | 状態 |
|-------|-----------|-----------|------|
| TC-01 | 単一ルート・テキスト形式 | #3 | ✅ |
| TC-02 | 複数ルート・テキスト形式 | #3 | ✅ |
| TC-03 | depth=1 指定 | #3 | ✅ |
| TC-04 | depth=0 指定 | #3 | ✅ |
| TC-05 | JSON形式出力 | #3 | ✅ |
| TC-06 | 空配列（ルートなし） | #3 | ✅ |
| TC-07 | --help オプション | #6 | ✅ |
| TC-08 | --path でファイル指定 | #6 | ⏭️ skip |
| TC-09 | --depth --json 組み合わせ | #6 | ⏭️ skip |
| TC-10 | getTree() が TreeNode[] を返す | #12 | ✅ |
| TC-11 | 子ノードが再帰的に変換される | #12 | ✅ |

> TC-08, TC-09 はテストデータ（Excel）が必要なため skip

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-30 | 初版作成 |
| 2026-01-30 | 実装完了、テスト PASS |
| 2026-01-30 | Project.getTree() 実装完了（TC-10, TC-11 PASS） |
