# {クラス名}.{機能名} 詳細仕様

**バージョン**: 1.0.0
**作成日**: {YYYY-MM-DD}
**要件ID**: REQ-{XXX}-001
**GitHub Issue**: #{nn}
**ソースファイル**: `src/{layer}/{ClassName}.ts`

---

## 1. 概要

### 1.1 目的

{機能の目的を1-2文で説明}

### 1.2 現状の問題（該当する場合）

{修正・改善案件の場合、現状の問題点を記載}

| 問題点 | 内容 |
|-------|------|
| {問題1} | {説明} |

### 1.3 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/{layer}/{ClassName}.ts` | {修正内容} |

---

## 2. インターフェース仕様

### 2.1 型定義

```typescript
/**
 * {型の説明}
 */
export interface {TypeName} {
  /** {プロパティの説明} */
  property1: Type1
  /** {プロパティの説明} */
  property2: Type2
}
```

### 2.2 メソッド/プロパティ追加

```typescript
class {ClassName} {
  // 既存プロパティ...

  /**
   * {メソッド/プロパティの説明}
   *
   * @returns {戻り値の説明}
   *
   * @remarks
   * - {注意点1}
   * - {注意点2}
   */
  get {propertyName}(): {ReturnType}
}
```

---

## 3. 処理仕様

### 3.1 処理ロジック

```
1. {手順1}
2. {手順2}
3. {手順3}
```

### 3.2 擬似コード

```typescript
get {propertyName}(): {ReturnType} {
  return this.data
    .filter(item => item.condition)
    .map(item => ({
      ...item,
      additionalProperty: calculateValue(item)
    }))
}
```

### 3.3 パフォーマンス考慮事項（該当する場合）

{キャッシュ戦略、計算量、メモリ使用量などの考慮事項}

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | {テスト内容} | {期待結果} |
| TC-02 | {テスト内容} | {期待結果} |

### 4.2 境界値

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-10 | {空配列/0件の場合など} | {期待結果} |
| TC-11 | {境界条件} | {期待結果} |

### 4.3 異常系（該当する場合）

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-20 | {異常ケース} | {エラー/例外の内容} |

---

## 5. エクスポート（該当する場合）

`src/{layer}/index.ts` に以下を追加：

```typescript
export type { {TypeName} } from './{ClassName}'
```

---

## 6. 使用例（該当する場合）

```typescript
import { {ClassName} } from 'evmtools-node/{layer}'

const instance = new {ClassName}(...)

// {機能の使用例}
const result = instance.{propertyName}
console.log(`結果: ${result.length}件`)
```

---

## 7. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-{XXX}-001 AC-01 | {受け入れ基準の内容} | TC-01, TC-02 | ⏳ |
| REQ-{XXX}-001 AC-02 | {受け入れ基準の内容} | TC-10, TC-11 | ⏳ |

**テストファイル**: `src/{layer}/__tests__/{ClassName}.test.ts`

> **ステータス凡例**:
> - ⏳: 未実装
> - ✅ PASS: テスト合格
> - ❌ FAIL: テスト失敗

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | {YYYY-MM-DD} | 初版作成 | REQ-{XXX}-001 |
