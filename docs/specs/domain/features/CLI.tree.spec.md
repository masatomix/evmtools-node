# CLI.tree 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2026-01-30
**要件ID**: REQ-TREE-001
**GitHub Issue**: [#161](https://github.com/masatomix/evmtools-node/issues/161)
**ソースファイル**: `src/presentation/cli-pbevm-tree.ts`

---

## 1. 概要

### 1.1 目的

プロジェクトファイル（Excel）からタスクのツリー構造をCLIで出力する。

### 1.2 背景

- プロジェクトの階層構造を可視化したい
- サブプロジェクト名の一覧を取得したい
- 他のツールやスキルからサブプロジェクト名を自動取得するための基盤

---

## 2. インターフェース仕様

### 2.1 コマンドライン引数

```typescript
interface TreeCommandArgs {
    /** Excelファイルのパス */
    path: string        // デフォルト: './now.xlsm'
    /** 出力する階層の深さ（1=直下のみ、undefined=全階層） */
    depth?: number
    /** JSON形式で出力するか */
    json: boolean       // デフォルト: false
}
```

### 2.2 yargs 定義

```typescript
yargs(hideBin(process.argv))
    .usage('Usage: npx pbevm-tree [options]')
    .example('npx pbevm-tree --path ./now.xlsm', 'ツリー構造を表示')
    .example('npx pbevm-tree --depth 1', '1階層のみ表示')
    .example('npx pbevm-tree --json', 'JSON形式で出力')
    .option('path', {
        type: 'string',
        description: 'Excel file Path',
        default: './now.xlsm',
    })
    .option('depth', {
        type: 'number',
        description: '出力する階層の深さ（1=直下のみ）',
    })
    .option('json', {
        type: 'boolean',
        description: 'JSON形式で出力',
        default: false,
    })
    .help()
```

---

## 3. 処理仕様

### 3.1 データフロー

```
Excel File
    ↓
ExcelProjectCreator.create()
    ↓
Project (taskNodes: TaskNode[])  ← ルートが複数の可能性あり
    ↓
TreeFormatter.format(taskNodes, options)
    ↓
stdout (テキスト or JSON)
```

### 3.2 ツリー出力フォーマッタ

新規ユーティリティ `TreeFormatter` を作成（`src/common/TreeFormatter.ts`）。

```typescript
export interface TreeNode {
    name: string
    children: TreeNode[]
}

export interface TreeFormatOptions {
    depth?: number      // 出力する深さ（undefined = 全階層）
}

export class TreeFormatter {
    /**
     * TaskNode[] をテキスト形式のツリーに変換
     * @param nodes ルートノードの配列（複数可）
     * @param options フォーマットオプション
     */
    static toText(nodes: TaskNode[], options?: TreeFormatOptions): string

    /**
     * TaskNode[] をJSON形式に変換
     * @param nodes ルートノードの配列（複数可）
     * @param options フォーマットオプション
     */
    static toJson(nodes: TaskNode[], options?: TreeFormatOptions): TreeNode[]
}
```

### 3.3 テキスト形式の出力仕様

#### 3.3.1 複数ルートの場合

ルートが複数ある場合は、それぞれを独立したツリーとして出力する。

```
プロジェクトA
├── サブプロジェクト1
│   ├── タスク1-1
│   └── タスク1-2
└── サブプロジェクト2

プロジェクトB
├── タスク2-1
└── タスク2-2
```

#### 3.3.2 単一ルートの場合

```
プロジェクトA
├── サブプロジェクト1
│   ├── タスク1-1
│   └── タスク1-2
├── サブプロジェクト2
│   └── タスク2-1
└── サブプロジェクト3
```

#### 3.3.3 罫線文字

| 位置 | 文字 | 説明 |
|-----|------|-----|
| 中間の子 | `├── ` | 分岐 |
| 最後の子 | `└── ` | 終端 |
| 継続線 | `│   ` | 縦線 |
| 空白 | `    ` | インデント（4文字） |

### 3.4 深さ指定の動作

| depth | 動作 |
|-------|------|
| `undefined` | 全階層を出力 |
| `1` | ルートの直下の子のみ出力 |
| `2` | ルートの孫まで出力 |
| `0` | ルートのみ出力（子なし） |

```
# --depth 1 の場合
プロジェクトA
├── サブプロジェクト1
├── サブプロジェクト2
└── サブプロジェクト3
```

### 3.5 JSON形式の出力仕様

```json
[
  {
    "name": "プロジェクトA",
    "children": [
      {
        "name": "サブプロジェクト1",
        "children": [
          { "name": "タスク1-1", "children": [] },
          { "name": "タスク1-2", "children": [] }
        ]
      }
    ]
  },
  {
    "name": "プロジェクトB",
    "children": []
  }
]
```

### 3.6 Project.getTree() メソッド

Project クラスにツリー構造を取得するメソッドを追加する。

```typescript
// Project.ts
import { TreeNode } from '../common/TreeFormatter'

class Project {
    /**
     * プロジェクトのタスクツリーを TreeNode 形式で取得
     * @returns TreeNode[] ルートノードの配列
     */
    getTree(): TreeNode[] {
        return this._taskNodes.map(node => this.toTreeNode(node))
    }

    /**
     * TaskNode を TreeNode に変換（再帰）
     */
    private toTreeNode(node: TaskNode): TreeNode {
        return {
            name: node.name,
            children: node.children.map(child => this.toTreeNode(child))
        }
    }
}
```

#### 使用例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TreeFormatter } from 'evmtools-node/common'

const creator = new ExcelProjectCreator('./now.xlsm')
const project = await creator.createProject()

// TreeNode[] を取得
const tree = project.getTree()

// テキスト形式で出力
console.log(TreeFormatter.toText(tree))

// JSON形式で出力
console.log(JSON.stringify(TreeFormatter.toJson(tree), null, 2))
```

---

## 4. テストケース

### 4.1 TreeFormatter 単体テスト

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | 単一ルート・テキスト形式 | 正しい罫線でツリー表示 |
| TC-02 | 複数ルート・テキスト形式 | 各ルートが空行で区切られる |
| TC-03 | depth=1 指定 | 直下の子のみ表示 |
| TC-04 | depth=0 指定 | ルートのみ表示（子なし） |
| TC-05 | JSON形式出力 | 正しいJSON構造 |
| TC-06 | 空配列（ルートなし） | 空文字列 / 空配列 |

### 4.2 CLI 統合テスト

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-07 | `--help` オプション | Usage文字列を含む、終了コード0 |
| TC-08 | `--path` でファイル指定 | 指定ファイルを読み込み |
| TC-09 | `--depth 1 --json` 組み合わせ | depth適用済みのJSON出力 |

### 4.3 Project.getTree() テスト

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-10 | getTree() が TreeNode[] を返す | name と children を持つ配列 |
| TC-11 | 子ノードが再帰的に変換される | 孫ノードも TreeNode 形式 |

---

## 5. エクスポート

### 5.1 package.json への追加

```json
{
  "bin": {
    "pbevm-tree": "dist/presentation/cli-pbevm-tree.js"
  }
}
```

### 5.2 TreeFormatter のエクスポート

`src/common/index.ts` からエクスポートし、`evmtools-node/common` で利用可能にする。

---

## 6. 使用例

```bash
# 基本的な使い方
npx pbevm-tree --path ./project.xlsm

# 1階層のみ表示（サブプロジェクト名の一覧取得）
npx pbevm-tree --path ./project.xlsm --depth 1

# JSON形式で出力（他ツール連携用）
npx pbevm-tree --path ./project.xlsm --json

# 組み合わせ
npx pbevm-tree --path ./project.xlsm --depth 2 --json
```

---

## 7. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-TREE-001 AC-01 | CLIコマンドとして実装（yargsベース） | TC-07 | ✅ PASS |
| REQ-TREE-001 AC-02 | ツリー構造が視覚的にわかりやすく出力される | TC-01, TC-02 | ✅ PASS |
| REQ-TREE-001 AC-03 | `--depth` オプションで深さ指定ができる | TC-03, TC-04 | ✅ PASS |
| REQ-TREE-001 AC-04 | `--json` オプションでJSON形式出力ができる | TC-05, TC-09 | ✅ PASS |
| REQ-TREE-001 AC-05 | `--help` オプションでヘルプが表示される | TC-07 | ✅ PASS |
| REQ-TREE-001 AC-06 | package.json の bin に登録されている | 目視確認 | ✅ OK |
| REQ-TREE-001 AC-07 | `Project.getTree()` メソッドが実装されている | TC-10, TC-11 | ✅ PASS |

**テストファイル**: `src/common/__tests__/TreeFormatter.test.ts`, `src/presentation/__tests__/cli-pbevm-tree.test.ts`, `src/domain/__tests__/Project.getTree.test.ts`

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2026-01-30 | 初版作成 | REQ-TREE-001 |
| 1.1.0 | 2026-01-30 | Project.getTree() メソッド追加 | REQ-TREE-001 AC-07 |
| 1.1.1 | 2026-01-30 | Project.getTree() 実装完了、AC-07 PASS | REQ-TREE-001 AC-07 |
