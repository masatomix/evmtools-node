# 重複アクセサ削除 タスク管理

**案件**: Project 重複アクセサ削除
**要件ID**: REQ-REFACTOR-001
**GitHub Issue**: #142
**作成日**: 2026-01-26
**更新日**: 2026-01-26

---

## 進捗サマリー

| 状態 | 件数 |
|------|------|
| ✅ 完了 | 8 |
| 🔄 進行中 | 0 |
| ⬜ 未着手 | 0 |
| ⏸️ ブロック | 0 |
| **合計** | **8** |

**進捗率**: 100%

---

## タスク一覧

### 1. 仕様フェーズ

| # | 状態 | タスク | 成果物 | 備考 |
|---|------|--------|--------|------|
| 1 | ✅ | 要件定義書作成 | `REQ-REFACTOR-001.md` | 影響範囲調査含む |
| 2 | ✅ | 詳細仕様書作成 | `Project.remove-dup-accessors.spec.md` | |

### 2. 実装フェーズ

| # | 状態 | タスク | 成果物 | 備考 |
|---|------|--------|--------|------|
| 3 | ✅ | テストコード修正 | `Project.completionForecast.test.ts` | 削除プロパティ参照を修正 |
| 4 | ✅ | プロパティ削除 | `Project.ts` | `bac`, `totalEv`, `etcPrime` 削除 |
| 5 | ✅ | 内部参照修正 | `Project.ts` | `calculateCompletionForecast()` 修正 |
| 6 | ✅ | 統合テスト | 全テストPASS | `npm test` (203件PASS) |

### 3. 完了フェーズ

| # | 状態 | タスク | 成果物 | 備考 |
|---|------|--------|--------|------|
| 7 | ✅ | トレーサビリティ更新 | 仕様書更新 | AC→TC→実装 確認 |
| 8 | ✅ | マスター設計書反映 | `Project.spec.md` | プロパティ削除、変更履歴追記 |

---

## 実装詳細

### タスク3: テストコード修正

修正対象（`Project.completionForecast.test.ts`）:

| 行番号 | 現在の実装 | 修正後 |
|--------|-----------|--------|
| 143 | `expect(project.bac).toBe(60)` | `expect(stats?.totalWorkloadExcel).toBe(60)` |
| 171 | `expect(project.bac).toBe(10)` | `expect(stats?.totalWorkloadExcel).toBe(10)` |
| 178 | `expect(project.bac).toBe(0)` | `expect(stats?.totalWorkloadExcel).toBe(0)` |
| 216 | `expect(project.bac).toBe(10)` | `expect(stats?.totalWorkloadExcel).toBe(10)` |
| 624 | `expect(project.bac).toBe(0)` | `expect(stats?.totalWorkloadExcel).toBe(0)` |
| 675 | `expect(typeof project.totalEv).toBe('number')` | `expect(typeof stats?.totalEv).toBe('number')` |
| 239 | `expect(project.etcPrime === undefined ...)` | `expect(stats?.etcPrime === undefined ...)` |
| 251 | `expect(project.etcPrime).toBeUndefined()` | `expect(stats?.etcPrime).toBeUndefined()` |
| 258 | `expect(project.etcPrime).toBeUndefined()` | `expect(stats?.etcPrime).toBeUndefined()` |

### タスク4: プロパティ削除

削除対象（`Project.ts`）:

| 行番号 | 削除内容 |
|--------|---------|
| 608-611 | `get bac(): number` |
| 619-622 | `get totalEv(): number` |
| 630-637 | `get etcPrime(): number \| undefined` |

### タスク5: 内部参照修正

修正対象（`Project.ts` - `calculateCompletionForecast()`）:

| 行番号 | 現在の実装 | 修正後 |
|--------|-----------|--------|
| 707 | `const ev = this.totalEv` | `const ev = stats?.totalEv ?? 0` |
| 708 | `const bac = this.bac` | `const bac = stats?.totalWorkloadExcel ?? 0` |

※ `stats` は既に取得済み（700行付近）

### タスク8: マスター設計書反映

削除対象セクション:

1. **セクション3.2「公開プロパティ」** から以下を削除:
   - `bac` | `number` | プロジェクト全体のBAC...
   - `totalEv` | `number` | プロジェクト全体の累積EV...
   - `etcPrime` | `number \| undefined` | ETC'（SPI版）...

2. **セクション6.7「bac/totalEv/etcPrime テスト」** を削除

3. **セクション9「テストケース数サマリ」** の件数を更新:
   - `bac/totalEv/etcPrime` の 9件 を削除
   - 合計を 95件 → 86件 に更新

4. **変更履歴** に追記:
   ```
   | 1.5.0 | 2026-01-26 | 重複アクセサ（bac, totalEv, etcPrime）を削除 | REQ-REFACTOR-001 |
   ```

---

## 完了条件

- [x] 全タスクが ✅ Done
- [x] テスト全件PASS（`npm test`）（203件）
- [x] TypeScriptコンパイルエラーなし（`npm run build`）
- [x] マスター設計書が更新済み
- [x] バージョンを `0.0.26-SNAPSHOT` に戻す
- [ ] PRレビュー完了
