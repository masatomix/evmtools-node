# TaskNode 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16
**ソースファイル**: `src/domain/TaskNode.ts`

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **クラス名** | `TaskNode` |
| **分類** | **エンティティ（Entity）** |
| **実装インターフェース** | `Iterable<TaskNode>` |
| **パッケージ** | `src/domain/TaskNode.ts` |
| **継承** | `extends TaskRow` |
| **責務** | TaskRowをラップし、階層構造（ツリー）を表現する。Iterableによりツリー走査をサポート |

### 1.2 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| タスクノード | `TaskNode` | 階層構造を持つタスク表現 |
| 子ノード | `children` | このノードの直下にある子タスクの配列 |
| ルートノード | - | parentIdがundefinedのノード |

### 1.3 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────────────────────────┐
│                      domain 層                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     TaskRow                          │   │
│  │  - プロパティ、EVM計算ロジック                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ▲                                  │
│                          │ extends                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     TaskNode                         │   │
│  │  - children: TaskNode[]                              │   │
│  │  - Iterable<TaskNode> 実装                           │   │
│  │  - static fromRow()                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          │ used by                          │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     Project                          │   │
│  │  - taskNodes: TaskNode[]                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-TN-01 | `children`は常に配列（空配列可）である | 生成時・全操作 |
| INV-TN-02 | TaskRowの全不変条件を継承する | 生成時・全操作 |
| INV-TN-03 | Iterableプロトコルを実装している | 常時 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数

| プロパティ | 型 | 必須 | 制約 | デフォルト | 説明 |
|-----------|-----|:----:|------|-----------|------|
| `children` | `TaskNode[]` | - | - | `[]` | 子ノードの配列 |
| (継承) | - | - | - | - | TaskRowの全プロパティを継承 |

### 3.2 公開プロパティ（getter）

| プロパティ | 戻り型 | 説明 |
|-----------|--------|------|
| `children` | `TaskNode[]` | 子ノードの配列 |
| (継承) | - | TaskRowの全プロパティを継承 |

### 3.3 内部キャッシュ

該当なし

---

## 4. コンストラクタ仕様

### 4.1 シグネチャ

```typescript
constructor(
    sharp: number,
    id: number,
    level: number,
    name: string,
    assignee?: string,
    workload?: number,
    startDate?: Date,
    endDate?: Date,
    actualStartDate?: Date,
    actualEndDate?: Date,
    progressRate?: number,
    scheduledWorkDays?: number,
    pv?: number,
    ev?: number,
    spi?: number,
    expectedProgressDate?: Date,
    delayDays?: number,
    remarks?: string,
    parentId?: number,
    isLeaf?: boolean,
    plotMap?: Map<number, boolean>,
    children: TaskNode[] = []
)
```

### 4.2 事前条件（Preconditions）

TaskRowと同様

### 4.3 事後条件（Postconditions）

| ID | 条件 |
|----|------|
| POST-CON-01 | 親クラスTaskRowが適切に初期化される |
| POST-CON-02 | childrenが指定値またはデフォルト空配列で初期化される |

---

## 5. メソッド仕様

### 5.1 `[Symbol.iterator](): IterableIterator<TaskNode>`

#### 目的
ツリー構造を深さ優先で走査可能にする

#### シグネチャ
```typescript
[Symbol.iterator](): IterableIterator<TaskNode>
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-ITER-01 | 自身を最初に返す |
| POST-ITER-02 | 子ノードを深さ優先順で返す |
| POST-ITER-03 | 全ての子孫ノードを走査する |

#### アルゴリズム

```
1. 自身(this)をyield
2. 各childに対して再帰的にyield*
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-ITER-001 | 正常系 | 子ノード2件 | 自身+子2件の計3件 |
| EQ-ITER-002 | 正常系 | 3階層構造 | 深さ優先順で全件 |
| EQ-ITER-003 | 境界値 | 子ノード0件 | 自身のみ |

---

### 5.2 `static fromRow(row: TaskRow, children: TaskNode[] = []): TaskNode`

#### 目的
TaskRowからTaskNodeを生成するファクトリメソッド

#### シグネチャ
```typescript
static fromRow(row: TaskRow, children: TaskNode[] = []): TaskNode
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-FR-01 | rowがnullでない | 例外 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-FR-01 | rowの全プロパティを引き継いだTaskNodeを返す |
| POST-FR-02 | childrenが指定されていれば設定、未指定なら空配列 |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-FR-001 | 正常系 | 有効なTaskRow, 子ノード2件 | TaskNode(children.length=2) |
| EQ-FR-002 | 正常系 | 有効なTaskRow, children省略 | TaskNode(children.length=0) |

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 Iterable実装

```gherkin
Scenario: ツリー構造を深さ優先で走査する
  Given 親ノード(id=1)
  And   子ノード(id=2, id=3)を持つ
  When  for...of でイテレート
  Then  id=1, id=2, id=3 の順で取得できる

Scenario: 子がないノードは自身のみ返す
  Given 子ノードを持たないTaskNode
  When  for...of でイテレート
  Then  自身のみ取得できる

Scenario: 3階層構造の走査
  Given 親(id=1) → 子(id=2) → 孫(id=3)の構造
  When  [...node] でスプレッド
  Then  [id=1, id=2, id=3] の配列が得られる
```

### 6.2 fromRow

```gherkin
Scenario: TaskRowからTaskNodeを生成する
  Given TaskRow(id=1, name="テスト")
  And   子ノード2件
  When  TaskNode.fromRow(row, children)を呼び出す
  Then  id=1, name="テスト", children.length=2のTaskNodeが返される

Scenario: children省略時は空配列
  Given TaskRow(id=1)
  When  TaskNode.fromRow(row)を呼び出す
  Then  children.length=0のTaskNodeが返される
```

---

## 7. 外部依存

| 名前 | 種別 | 説明 |
|------|------|------|
| `TaskRow` | 内部モジュール | 親クラス |

---

## 8. 関連オブジェクト

### 8.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                       TaskNode                              │
│  (エンティティ)                                             │
├─────────────────────────────────────────────────────────────┤
│                          │                                  │
│                          │ extends                          │
│                          ▼                                  │
│                       TaskRow                               │
│                          │                                  │
│                          │ used by                          │
│                          ▼                                  │
│       ┌─────────────────────────────────────┐               │
│       │          Project / TaskService       │               │
│       └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 関係一覧

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `TaskRow` | extends | TaskRowを継承 |
| `Project` | used by | ProjectがTaskNode[]を保持 |
| `TaskService` | creates | TaskServiceがTaskRow[]からTaskNode[]を構築 |

---

## 9. テストケース数サマリ

| カテゴリ | 計画 | 実装 |
|----------|------|------|
| コンストラクタ | 2件 | 2件 |
| Iterator | 3件 | 3件 |
| fromRow | 2件 | 2件 |
| **合計** | **7件** | **7件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

該当なし（基盤クラスのため特定の要件に紐づかない）

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/domain/__tests__/TaskNode.test.ts` | 単体テスト | 7件 |

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2025-12-16
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

---

## 12. 設計上の課題・改善提案

該当なし

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
