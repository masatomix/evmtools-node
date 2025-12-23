# 要件定義書: バージョン情報ユーティリティ

**要件ID**: REQ-VERSION-001
**作成日**: 2025-12-16
**更新日**: 2025-12-16
**ステータス**: Approved
**優先度**: Low

---

## 1. 概要

### 1.1 目的

アプリケーションやライブラリのバージョン情報をプログラムから取得できるようにする。
ログ出力、デバッグ、ヘルプ表示などでバージョン情報を表示する際に利用する。

### 1.2 スコープ

| 項目 | 対応 |
|------|:----:|
| package.jsonからバージョン取得 | ✅ |
| パッケージ名の取得 | ✅ |
| 説明文の取得 | ✅ |
| ライセンス情報の取得 | - |
| 依存関係の取得 | - |

---

## 2. 機能要件

### 2.1 取得できる情報

| 項目 | 型 | 説明 |
|------|-----|------|
| version | string | バージョン番号（例: "0.0.17"） |
| name | string | パッケージ名（例: "evmtools-node"） |
| description | string | パッケージの説明文 |

### 2.2 インターフェース（案）

```typescript
interface VersionInfo {
    version: string;
    name: string;
    description: string;
}

function getVersionInfo(): VersionInfo;
```

### 2.3 制約・前提条件

| ID | 制約 |
|----|------|
| C-01 | package.jsonはプロジェクトルートに存在する |
| C-02 | package.jsonは有効なJSON形式である |
| C-03 | version, name フィールドは必須 |

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 同期的に即座に値を返すこと |
| NF-02 | package.jsonは起動時に1回だけ読み込み、キャッシュすること |

---

## 4. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | getVersionInfo()でバージョン情報を取得できる | ✅ PASS | TC-01 |
| AC-02 | 取得したversionがpackage.jsonと一致する | ✅ PASS | TC-02 |
| AC-03 | 取得したnameがpackage.jsonと一致する | ✅ PASS | TC-03 |

**確認日**: 2025-12-16
**テスト実行結果**: 5件全てPASS

---

## 5. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| 設計書 | `docs/specs/domain/master/VersionInfo.spec.md` | 詳細仕様 |
| 単体テスト | `src/common/__tests__/VersionInfo.test.ts` | 5件 |
| 実装 | `src/common/VersionInfo.ts` | 本体実装 |
| 実装 | `src/common/index.ts` | エクスポート追加 |

---

## 6. 備考

- 仮想案件: 開発フロー可視化のためのサンプル実装
