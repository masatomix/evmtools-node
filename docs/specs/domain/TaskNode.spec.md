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
| **分類** | **エンティティ（Entity）** - 階層構造を持つタスク |
| **パッケージ** | `src/domain/TaskNode.ts` |
| **継承** | `extends TaskRow implements Iterable<TaskNode>` |
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

### 3.1 追加プロパティ（TaskRowから追加）

| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `children` | `TaskNode[]` | `[]` | 子ノードの配列 |

### 3.2 継承プロパティ

TaskRowの全プロパティを継承（`sharp`, `id`, `level`, `name`, `assignee`, `workload`, `startDate`, `endDate`, `actualStartDate`, `actualEndDate`, `progressRate`, `scheduledWorkDays`, `pv`, `ev`, `spi`, `expectedProgressDate`, `delayDays`, `remarks`, `parentId`, `isLeaf`, `plotMap`）

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

### 4.2 事後条件

| ID | 条件 |
|----|------|
| POST-CON-01 | 親クラスTaskRowが適切に初期化される |
| POST-CON-02 | childrenが指定値またはデフォルト空配列で初期化される |

---

## 5. メソッド仕様

### 5.1 `[Symbol.iterator](): IterableIterator<TaskNode>`

| 項目 | 内容 |
|------|------|
| **目的** | ツリー構造を深さ優先で走査可能にする |
| **戻り値** | `IterableIterator<TaskNode>` |

#### アルゴリズム

```
1. 自身(this)をyield
2. 各childに対して再帰的にyield*
```

#### 事後条件

| ID | 条件 |
|----|------|
| POST-ITER-01 | 自身を最初に返す |
| POST-ITER-02 | 子ノードを深さ優先順で返す |
| POST-ITER-03 | 全ての子孫ノードを走査する |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-ITER-001 | 正常系 | 子ノード2件 | 自身+子2件の計3件 |
| EQ-ITER-002 | 正常系 | 3階層構造 | 深さ優先順で全件 |
| EQ-ITER-003 | 境界値 | 子ノード0件 | 自身のみ |

---

### 5.2 `static fromRow(row: TaskRow, children: TaskNode[] = []): TaskNode`

| 項目 | 内容 |
|------|------|
| **目的** | TaskRowからTaskNodeを生成するファクトリメソッド |
| **引数** | `row: TaskRow` - 元のTaskRow, `children: TaskNode[]` - 子ノード配列 |
| **戻り値** | `TaskNode` |

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

## 7. 関連オブジェクト

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `TaskRow` | extends | TaskRowを継承 |
| `Project` | used by | ProjectがTaskNode[]を保持 |
| `TaskService` | creates | TaskServiceがTaskRow[]からTaskNode[]を構築 |

---

## 8. テストケース数サマリ

| カテゴリ | テストケース数 |
|----------|--------------|
| コンストラクタ | 2件 |
| Iterator | 3件 |
| fromRow | 2件 |
| **合計** | **約7件** |
