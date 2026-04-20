# Project.getNameWithGreeting タスク管理

**要件ID**: REQ-HELLO-001
**GitHub Issue**: #166
**ブランチ**: `worktree-evmtools`（SDDワークフロー体験のため現ブランチ継続）
**作成日**: 2026-04-20

---

## タスク一覧

| # | タスク | 状態 | 担当 | 備考 |
|---|--------|:----:|------|------|
| 1 | 要件定義書作成 | ✅ | Claude | `REQ-HELLO-001.md` |
| 2 | 詳細仕様書作成 | ✅ | Claude | `Project.nameWithGreeting.spec.md` |
| 3 | タスク管理ファイル作成 | ✅ | Claude | 本ファイル |
| 4 | テストコード作成 | ✅ | Claude | `Project.nameWithGreeting.test.ts` (TC-01〜TC-04) |
| 5 | 実装 | ✅ | Claude | `Project.ts` に `getNameWithGreeting()` 追加 |
| 6 | テスト実行・PASS確認 | ✅ | Claude | 全266件 PASS（回帰なし） |
| 7 | トレーサビリティ更新 | ✅ | Claude | AC-01〜AC-03 を ✅ PASS に更新 |
| 8 | マスター設計書反映 | ✅ | Claude | `Project.spec.md` v1.9.0 として反映 |
| 9 | コミット・プッシュ | ⬜ | Claude | SDDの終点 |

---

## 進捗サマリー

- **完了**: 8 / 9
- **残り**: 1（コミット・プッシュ）

---

## タスク詳細

### タスク 4: テストコード作成

**ファイル**: `src/domain/__tests__/Project.nameWithGreeting.test.ts`

実装すべきテストケース（詳細設計書より）:

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | 通常の英字プロジェクト名 `"SamplePJ"` | `"SamplePJ Hello World."` |
| TC-02 | 空文字のプロジェクト名 `""` | `" Hello World."` |
| TC-03 | 日本語を含むプロジェクト名 `"日本語PJ"` | `"日本語PJ Hello World."` |
| TC-04 | 呼び出し後も `project.name` が変更されないこと | 呼び出し前後で `project.name` が同一 |

### タスク 5: 実装

**ファイル**: `src/domain/Project.ts`

```typescript
/**
 * プロジェクト名の末尾に「 Hello World.」を付加した文字列を返す
 *
 * @returns `${this.name} Hello World.` 形式の文字列
 */
getNameWithGreeting(): string {
  return `${this.name} Hello World.`
}
```

### タスク 7: トレーサビリティ更新

詳細設計書（`Project.nameWithGreeting.spec.md`）のトレーサビリティセクションを更新:
- AC-01〜AC-03 の結果列を ⬜ → ✅ PASS に変更
- 変更履歴に v1.0.1（実装完了）を追記

### タスク 8: マスター設計書反映

`docs/specs/domain/master/Project.spec.md` に以下を反映:
- メソッド一覧に `getNameWithGreeting()` を追加
- 変更履歴にバージョンアップ（例: v1.X.0）を追記

### タスク 9: コミット・プッシュ

コミットメッセージ例:
```
feat: Project.getNameWithGreeting() メソッドを追加 (#166)

- Project クラスに getNameWithGreeting() を追加
- 戻り値: `${this.name} Hello World.`
- テストケース TC-01〜TC-04 全件 PASS

SDDワークフロー体験用の極小機能。
```

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-04-20 | 初版作成 |
