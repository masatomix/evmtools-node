# 要件定義書: VersionInfoへのauthorフィールド追加

**要件ID**: REQ-VERSION-002
**作成日**: 2025-12-18
**更新日**: 2025-12-18
**ステータス**: Approved
**優先度**: Low
**関連要件**: REQ-VERSION-001

---

## 1. 概要

### 1.1 目的

既存のVersionInfo機能を拡張し、パッケージの作者情報（author）を取得できるようにする。
CLIのヘルプ表示やライセンス表記で作者情報を表示する際に利用する。

### 1.2 スコープ

| 項目 | 対応 |
|------|:----:|
| authorフィールドの追加 | ✅ |
| 既存フィールド（version, name, description）の維持 | ✅ |

---

## 2. 機能要件

### 2.1 追加する情報

| 項目 | 型 | 説明 |
|------|-----|------|
| author | string | パッケージの作者名 |

### 2.2 インターフェース（修正後）

```typescript
interface VersionInfo {
    version: string;
    name: string;
    description: string;
    author: string;  // 追加
}
```

### 2.3 制約・前提条件

| ID | 制約 |
|----|------|
| C-01 | package.jsonのauthorフィールドは文字列またはオブジェクト形式 |
| C-02 | authorがオブジェクト形式の場合はnameプロパティを使用 |
| C-03 | authorフィールドが存在しない場合は空文字を返す |

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の動作（キャッシュ機構）を維持すること |
| NF-02 | 後方互換性を保つこと（既存のversion, name, descriptionは変更なし） |

---

## 4. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | getVersionInfo()でauthorを取得できる | ✅ PASS | TC-01, TC-06 |
| AC-02 | 取得したauthorがpackage.jsonと一致する | ✅ PASS | TC-06 |

**確認日**: 2025-12-18
**テスト実行結果**: 6件全てPASS

---

## 5. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| 設計書 | `docs/specs/domain/VersionInfo.spec.md` | 詳細仕様（修正対象） |
| 単体テスト | `src/common/__tests__/VersionInfo.test.ts` | テスト追加対象 |
| 実装 | `src/common/VersionInfo.ts` | 修正対象 |
| 元要件 | `docs/specs/requirements/REQ-VERSION-001.md` | 元の要件定義 |

---

## 6. 備考

- 既存機能への修正案件: 開発中の修正フロー検証用
