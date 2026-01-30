# 要件定義書: プロジェクトツリー構造出力コマンド

**要件ID**: REQ-TREE-001
**GitHub Issue**: [#161](https://github.com/masatomix/evmtools-node/issues/161)
**関連Issue**: [masatomix/task#434](https://github.com/masatomix/task/issues/434)
**作成日**: 2026-01-30
**ステータス**: Draft
**優先度**: Medium

---

## 1. 概要

### 1.1 目的

プロジェクトファイル（Excel）からタスクの階層構造（ツリー）をCLIで出力するコマンドを提供する。

### 1.2 背景

- プロジェクトの階層構造を可視化したい
- サブプロジェクト名の一覧を取得したい
- 他のツールやスキルからサブプロジェクト名を自動取得するための基盤が必要

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| `pbevm-tree` CLIコマンドの実装 | ✅ |
| テキスト形式でのツリー出力 | ✅ |
| JSON形式での出力オプション | ✅ |
| 深さ指定オプション | ✅ |
| package.json への bin 登録 | ✅ |
| `Project.getTree()` メソッドの追加 | ✅ |

---

## 2. 機能要件

### 2.1 CLIコマンド

新規CLIコマンド `pbevm-tree` を追加する。

| ファイル | binコマンド |
|---------|------------|
| `cli-pbevm-tree.ts` | `pbevm-tree` |

### 2.2 コマンドオプション

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `--path` | string | `./now.xlsm` | Excelファイルのパス |
| `--depth` | number | `undefined`（全階層） | 出力する階層の深さ（1=直下のみ） |
| `--json` | boolean | `false` | JSON形式で出力する |

### 2.3 出力形式

> **注意**: `TaskNode[]` はルートが複数になる可能性がある。出力形式はこれに対応すること。

#### 2.3.1 テキスト形式（デフォルト）

複数ルートの場合、各ルートを空行で区切って出力する。

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

単一ルートの場合:

```
プロジェクトA
├── サブプロジェクト1
│   ├── タスク1-1
│   └── タスク1-2
└── サブプロジェクト2
```

#### 2.3.2 JSON形式（--json オプション）

ルートノードの配列として出力する（単一ルートでも配列）。

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
    "children": [
      { "name": "タスク2-1", "children": [] }
    ]
  }
]
```

### 2.4 深さ指定

| オプション | 動作 |
|-----------|------|
| `--depth 1` | ルート直下の子のみ表示 |
| `--depth 2` | ルート直下の子とその子まで表示 |
| 指定なし | 全階層を表示 |

### 2.5 Project.getTree() メソッド

Project クラスにツリー構造を取得するメソッドを追加する。

```typescript
// Project.ts
getTree(): TreeNode[] {
    return this.taskNodes.map(node => this.toTreeNode(node))
}

private toTreeNode(node: TaskNode): TreeNode {
    return {
        name: node.name,
        children: node.children.map(child => this.toTreeNode(child))
    }
}
```

これにより、ライブラリ利用者がプログラムからツリー構造を取得できる。

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の機能に影響を与えないこと |
| NF-02 | 既存の TaskNode 構造を活用すること |
| NF-03 | 他のCLIコマンドと一貫したインターフェースを持つこと |

---

## 4. インターフェース設計

### 4.1 実行方法

```bash
# 基本的な使い方
npx pbevm-tree --path ./project.xlsm

# 深さ指定
npx pbevm-tree --path ./project.xlsm --depth 1

# JSON形式で出力
npx pbevm-tree --path ./project.xlsm --json

# 組み合わせ
npx pbevm-tree --path ./project.xlsm --depth 2 --json
```

### 4.2 ヘルプ表示

```bash
npx pbevm-tree --help
```

---

## 5. 受け入れ基準

| ID | 基準 | 結果 |
|----|------|------|
| AC-01 | CLIコマンドとして実装されている（yargsベース） | ✅ |
| AC-02 | ツリー構造が視覚的にわかりやすく出力される | ✅ |
| AC-03 | `--depth` オプションで深さ指定ができる | ✅ |
| AC-04 | `--json` オプションでJSON形式出力ができる | ✅ |
| AC-05 | `--help` オプションでヘルプが表示される | ✅ |
| AC-06 | package.json の bin に登録されている | ✅ |
| AC-07 | `Project.getTree()` メソッドが実装されている | ✅ |

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| GitHub Issue | [#161](https://github.com/masatomix/evmtools-node/issues/161) | 機能要望 |
| 詳細仕様書 | `docs/specs/domain/features/CLI.tree.spec.md` | 詳細設計（作成予定） |
| TaskNode | `src/domain/TaskNode.ts` | ツリー構造のドメインモデル |
| 既存CLI参考 | `src/presentation/cli-pbevm-show-project.ts` | CLIコマンドの実装例 |

---

## 7. 備考

- TaskNode は既に Iterable を実装しており、ツリー走査が可能
- 出力形式は tree コマンドの標準的な罫線文字（├─, └─, │）を使用
- **複数ルート対応**: `TaskService.buildTaskTree()` は `TaskNode[]` を返すため、ルートノードが複数存在する可能性がある。出力形式はこれに対応すること
