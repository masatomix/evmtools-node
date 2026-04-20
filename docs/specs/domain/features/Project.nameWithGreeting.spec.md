# Project.getNameWithGreeting 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2026-04-20
**要件ID**: REQ-HELLO-001
**GitHub Issue**: #166
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 概要

### 1.1 目的

`Project` クラスに `getNameWithGreeting()` メソッドを追加し、プロジェクト名の末尾に固定文字列「 Hello World.」を付与した文字列を返す機能を提供する。

### 1.2 設計方針

- **純粋関数**: 副作用なし、`this.name` の値のみに依存
- **引数なし**: プロジェクト名のみから戻り値が決定される
- **シンプルな文字列連結**: `` `${this.name} Hello World.` `` をそのまま返す
- **インスタンスメソッド**: `Project` インスタンスの状態（`this.name`）を参照するため、static ではなくインスタンスメソッドとする

### 1.3 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/domain/Project.ts` | `getNameWithGreeting()` メソッドを追加 |

---

## 2. インターフェース仕様

### 2.1 メソッド追加

```typescript
class Project {
  // 既存メソッド・プロパティ...

  /**
   * プロジェクト名の末尾に「 Hello World.」を付加した文字列を返す
   *
   * @returns `${this.name} Hello World.` 形式の文字列
   *
   * @remarks
   * - 副作用なし（this.name の値は変更しない）
   * - this.name が空文字でも動作する（戻り値: " Hello World."）
   */
  getNameWithGreeting(): string
}
```

---

## 3. 処理仕様

### 3.1 処理ロジック

```
1. this.name を参照
2. 末尾に半角スペースと "Hello World." を連結
3. 連結した文字列を返す
```

### 3.2 擬似コード

```typescript
getNameWithGreeting(): string {
  return `${this.name} Hello World.`
}
```

### 3.3 エッジケース

| ケース | 挙動 |
|-------|------|
| `this.name` が通常の文字列 | `"{name} Hello World."` を返す |
| `this.name` が空文字 `""` | `" Hello World."`（先頭にスペース）を返す |
| `this.name` が日本語を含む | そのまま連結（Unicode対応） |

---

## 4. テストケース

### 4.1 正常系

| TC-ID | テスト内容 | 入力 `project.name` | 期待結果 |
|-------|-----------|--------------------|----------|
| TC-01 | 通常の英字プロジェクト名 | `"SamplePJ"` | `"SamplePJ Hello World."` |
| TC-02 | 空文字のプロジェクト名 | `""` | `" Hello World."` |
| TC-03 | 日本語を含むプロジェクト名 | `"日本語PJ"` | `"日本語PJ Hello World."` |

### 4.2 副作用の検証

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-04 | 呼び出し後も `project.name` が変更されない | 呼び出し前後で `project.name` が同一 |

---

## 5. 使用例

```typescript
import { Project } from 'evmtools-node/domain'

const project = new Project(
  'サンプルプロジェクト',  // name
  new Date('2026-04-01'),   // baseDate
  [],                        // taskRows
  []                         // taskNodes
)

console.log(project.getNameWithGreeting())
// 出力: "サンプルプロジェクト Hello World."
```

---

## 6. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-HELLO-001 AC-01 | 通常のプロジェクト名に対して `"{name} Hello World."` を返す | TC-01 | ✅ PASS |
| REQ-HELLO-001 AC-02 | 空文字のプロジェクト名に対して `" Hello World."` を返す | TC-02 | ✅ PASS |
| REQ-HELLO-001 AC-03 | 日本語を含むプロジェクト名でも正しく連結される | TC-03 | ✅ PASS |

**テストファイル**: `src/domain/__tests__/Project.nameWithGreeting.test.ts`
**テスト実行結果**: 4/4 PASS (2026-04-20)
**実装補足**: `_name` が `undefined` の場合は `??` により空文字として扱う（`" Hello World."` を返す）

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2026-04-20 | 初版作成 | REQ-HELLO-001 |
| 1.0.1 | 2026-04-20 | 実装完了、テスト4件PASS、トレーサビリティ✅更新 | REQ-HELLO-001 |
