# VersionInfo 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2025-12-16
**要件ID**: REQ-VERSION-001
**ソースファイル**: src/common/VersionInfo.ts（新規作成）

---

## 1. 概要

package.jsonからバージョン情報を取得するユーティリティモジュール。

---

## 2. インターフェース定義

### 2.1 VersionInfo型

```typescript
interface VersionInfo {
    /** パッケージのバージョン番号 */
    version: string;
    /** パッケージ名 */
    name: string;
    /** パッケージの説明文 */
    description: string;
}
```

### 2.2 公開関数

```typescript
/**
 * バージョン情報を取得する
 * @returns VersionInfo オブジェクト
 */
function getVersionInfo(): VersionInfo;
```

---

## 3. 振る舞い仕様

### 3.1 getVersionInfo()

| 項目 | 内容 |
|------|------|
| 入力 | なし |
| 出力 | VersionInfo オブジェクト |
| 副作用 | なし |

#### 処理フロー

1. キャッシュが存在する場合、キャッシュを返す
2. package.jsonを読み込む
3. version, name, description を抽出
4. キャッシュに保存
5. VersionInfo オブジェクトを返す

#### エラー処理

| 条件 | 挙動 |
|------|------|
| package.jsonが存在しない | Error をスロー |
| JSONパースエラー | Error をスロー |
| version フィールドがない | 空文字を返す |
| name フィールドがない | 空文字を返す |
| description フィールドがない | 空文字を返す |

---

## 4. テストケース

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| TC-01 | getVersionInfo()を呼び出す | VersionInfoオブジェクトが返る |
| TC-02 | versionがpackage.jsonと一致する | 一致する |
| TC-03 | nameがpackage.jsonと一致する | 一致する |
| TC-04 | descriptionがpackage.jsonと一致する | 一致する |
| TC-05 | 2回呼び出しても同じ結果が返る（キャッシュ） | 同一オブジェクト |

---

## 5. 実装上の注意

- package.jsonの読み込みはESモジュール形式の `import` を使用（TypeScriptの`resolveJsonModule`オプション利用）
- キャッシュはモジュールスコープの変数に保持
- パスは相対パス `'../../package.json'` で指定（TypeScriptのモジュール解決に委ねる）

---

## 6. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| 要件定義 | [`REQ-VERSION-001.md`](../../requirements/REQ-VERSION-001.md) |
| テスト | src/common/__tests__/VersionInfo.test.ts |
| 実装 | src/common/VersionInfo.ts |
