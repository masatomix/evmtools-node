# TaskService 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16
**ソースファイル**: `src/domain/TaskService.ts`

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **クラス名** | `TaskService` |
| **分類** | **ドメインサービス（Domain Service）** |
| **実装インターフェース** | - |
| **パッケージ** | `src/domain/TaskService.ts` |
| **責務** | TaskRowとTaskNode間の変換処理を担当。フラットな配列⇔ツリー構造の相互変換 |

### 1.2 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| タスクツリー | `TaskNode[]` | 階層構造を持つタスクのルートノード配列 |
| フラット化 | `convertToTaskRows` | ツリー構造を一次元配列に展開 |
| ツリー構築 | `buildTaskTree` | フラットな配列から階層構造を構築 |

### 1.3 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────────────────────────┐
│                      domain 層                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   TaskService                        │   │
│  │                                                      │   │
│  │  buildTaskTree(): TaskRow[] → TaskNode[]             │   │
│  │  convertToTaskRows(): TaskNode[] → TaskRow[]         │   │
│  └─────────────────────────────────────────────────────┘   │
│              │                         │                    │
│              ▼                         ▼                    │
│        ┌──────────┐             ┌──────────┐               │
│        │ TaskRow  │             │ TaskNode │               │
│        │ (フラット)│             │ (ツリー) │               │
│        └──────────┘             └──────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-TS-01 | TaskServiceはステートレスである | 常時 |
| INV-TS-02 | buildTaskTree後のツリーはparentIdに従った親子関係を持つ | 変換後 |
| INV-TS-03 | convertToTaskRows後の配列はツリーの深さ優先順になる | 変換後 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数

該当なし（ステートレス）

### 3.2 公開プロパティ（getter）

該当なし

### 3.3 内部キャッシュ

該当なし

---

## 4. コンストラクタ仕様

該当なし（デフォルトコンストラクタ）

---

## 5. メソッド仕様

### 5.1 `buildTaskTree(rows: TaskRow[]): TaskNode[]`

#### 目的
TaskRowの配列からparentIdに従ってツリー構造のTaskNode[]を構築する

#### シグネチャ
```typescript
buildTaskTree(rows: TaskRow[]): TaskNode[]
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-BT-01 | rowsが配列である | 例外 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-BT-01 | parentIdがundefinedのノードがルートノードとして返される |
| POST-BT-02 | parentIdが設定されたノードは対応する親ノードのchildrenに追加される |
| POST-BT-03 | 元のTaskRowのプロパティは全て保持される |
| POST-BT-04 | 入力配列の順序に従って処理される（先に登場したノードが親になる前提） |

#### アルゴリズム

```
1. nodeMap = new Map<number, TaskNode>()
2. roots = []
3. 各rowに対して:
   a. node = TaskNode.fromRow(row)
   b. nodeMap.set(row.id, node)
   c. if (row.parentId !== undefined):
        parentNode = nodeMap.get(row.parentId)
        parentNode?.children.push(node)
      else:
        roots.push(node)
4. return roots
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-BT-01 | 親ノードは子ノードより先に配列に存在する必要がある | 順序依存 |
| BR-BT-02 | 存在しないparentIdを持つノードは孤児となる | childrenに追加されない |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-BT-001 | 正常系 | 親1件、子2件 | roots.length=1, roots[0].children.length=2 |
| EQ-BT-002 | 正常系 | ルートのみ3件 | roots.length=3, 全てchildren空 |
| EQ-BT-003 | 正常系 | 3階層構造 | 正しい入れ子構造 |
| EQ-BT-004 | 境界値 | 空配列 | roots.length=0 |
| EQ-BT-005 | 異常系 | 存在しないparentId | 孤児ノード |

---

### 5.2 `convertToTaskRows(nodes: TaskNode[]): TaskRow[]`

#### 目的
TaskNodeツリーを深さ優先でフラット化したTaskRow[]を返す

#### シグネチャ
```typescript
convertToTaskRows(nodes: TaskNode[]): TaskRow[]
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-CT-01 | nodesが配列である | 例外 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-CT-01 | 深さ優先順で全ノードが配列に展開される |
| POST-CT-02 | parentIdはツリー構造に基づいて再計算される |
| POST-CT-03 | levelはツリー構造に基づいて再計算される（ルート=1） |

#### アルゴリズム

```
1. result = []
2. dfs(node, parentId, level):
   a. result.push(TaskRow.fromNode(node, level, parentId))
   b. node.children.forEach(child => dfs(child, node.id, level + 1))
3. nodes.forEach(root => dfs(root, undefined, 1))
4. return result
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-CT-001 | 正常系 | 親1件、子2件 | 3件の配列、level順 |
| EQ-CT-002 | 正常系 | 3階層構造 | level=1,2,3の順 |
| EQ-CT-003 | 境界値 | 空配列 | 空配列 |
| EQ-CT-004 | 正常系 | ルートのみ3件 | 3件の配列、全てlevel=1 |

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 buildTaskTree

```gherkin
Scenario: フラットなTaskRow配列からツリーを構築する
  Given TaskRow配列:
    | id | parentId | name    |
    | 1  | -        | 親タスク |
    | 2  | 1        | 子タスク1 |
    | 3  | 1        | 子タスク2 |
  When  buildTaskTree(rows)を呼び出す
  Then  ルートノードが1件返される
  And   ルートノードのchildrenが2件

Scenario: 空配列の場合は空のルートを返す
  Given 空のTaskRow配列
  When  buildTaskTree([])を呼び出す
  Then  空配列が返される

Scenario: 全てルートノードの場合
  Given parentIdがすべてundefinedのTaskRow配列
  When  buildTaskTree(rows)を呼び出す
  Then  全てがルートノードとして返される
```

### 6.2 convertToTaskRows

```gherkin
Scenario: ツリー構造をフラット化する
  Given 親ノード(id=1)に子ノード(id=2,3)がある構造
  When  convertToTaskRows(nodes)を呼び出す
  Then  3件のTaskRowが返される
  And   id=1はlevel=1, parentId=undefined
  And   id=2,3はlevel=2, parentId=1

Scenario: 3階層構造のフラット化
  Given 親(id=1) → 子(id=2) → 孫(id=3)の構造
  When  convertToTaskRows(nodes)を呼び出す
  Then  id=1(level=1), id=2(level=2), id=3(level=3)の順で返される
```

---

## 7. 外部依存

| 名前 | 種別 | 説明 |
|------|------|------|
| `TaskRow` | 内部モジュール | 入出力として使用 |
| `TaskNode` | 内部モジュール | 入出力として使用 |

---

## 8. 関連オブジェクト

### 8.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                      TaskService                            │
│  (ドメインサービス)                                         │
├─────────────────────────────────────────────────────────────┤
│                          │                                  │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│     TaskRow         TaskNode          Project               │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 関係一覧

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `TaskRow` | uses | 入出力として使用 |
| `TaskNode` | uses | 入出力として使用 |
| `MappingProjectCreator` | used by | ツリー構築時に使用される |
| `Project` | used by | toTaskRowsの内部処理で使用 |

---

## 9. テストケース数サマリ

| カテゴリ | 計画 | 実装 |
|----------|------|------|
| buildTaskTree | 5件 | 5件 |
| convertToTaskRows | 4件 | 4件 |
| **合計** | **9件** | **9件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

該当なし（基盤サービスのため特定の要件に紐づかない）

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/domain/__tests__/TaskService.test.ts` | 単体テスト | 9件 |

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2025-12-16
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

---

## 12. 設計上の課題・改善提案

該当なし

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
