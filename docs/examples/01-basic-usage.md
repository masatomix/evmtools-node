# 基本的な使い方

evmtools-node ライブラリの基本的な使い方を説明します。

## インストール

```bash
npm install evmtools-node
```

## Excel ファイルからプロジェクトを読み込む

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    // Excel ファイルからプロジェクトを生成
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    // 基本情報を表示
    console.log('プロジェクト名:', project.name)
    console.log('基準日:', project.baseDate.toLocaleDateString('ja-JP'))
    console.log('開始日:', project.startDate?.toLocaleDateString('ja-JP'))
    console.log('終了日:', project.endDate?.toLocaleDateString('ja-JP'))
}

main()
```

### 出力例

```
プロジェクト名: now
基準日: 2025/7/25
開始日: 2025/7/1
終了日: 2025/8/26
```

---

## タスク一覧を取得する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    // 全タスクを取得
    const tasks = project.toTaskRows()

    console.log('タスク数:', tasks.length)
    console.log('')
    console.log('| id | name | assignee | workload | progressRate |')
    console.log('|----|------|----------|----------|--------------|')

    for (const task of tasks.slice(0, 8)) {
        const progress =
            task.progressRate !== undefined
                ? `${(task.progressRate * 100).toFixed(0)}%`
                : '-'
        console.log(
            `| ${task.id} | ${task.name} | ${task.assignee ?? '-'} | ${task.workload ?? '-'} | ${progress} |`
        )
    }
}

main()
```

### 出力例

```
タスク数: 19

| id | name | assignee | workload | progressRate |
|----|------|----------|----------|--------------|
| 1 | 要件定義 | - | 4 | 100% |
| 2 | 機能全体 | 要員A | 4 | 100% |
| 3 | 設計 | - | 15 | 100% |
| 4 | 機能1 | 要員A | 3 | 100% |
| 5 | 機能2 | 要員A | 2 | 100% |
| 6 | 機能3 | 要員B | 5 | 100% |
| 7 | 機能4 | 要員A | 5 | 100% |
| 8 | 開発 | - | 30 | 25% |
```

---

## タスクツリーを走査する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TaskNode } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    // ツリー構造で取得
    const taskNodes = project.taskNodes

    // 再帰的に表示
    function printTree(nodes: TaskNode[], indent: string = '') {
        for (const node of nodes) {
            const leaf = node.isLeaf ? '📄' : '📁'
            console.log(`${indent}${leaf} ${node.name}`)
            if (node.children.length > 0) {
                printTree(node.children, indent + '  ')
            }
        }
    }

    printTree(taskNodes)
}

main()
```

### 出力例

```
📁 要件定義
  📄 機能全体
📁 設計
  📄 機能1
  📄 機能2
  📄 機能3
  📄 機能4
📁 開発
  📄 機能1
  📄 機能2
  📄 機能3
  📄 機能4
📁 テスト
  📄 単体テスト
  📄 連結テスト
  📄 総合テスト
📁 リリース
  📄 準備
  📄 作業
```

---

## タスクのフルパス名を取得する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()

    console.log('| id | fullName |')
    console.log('|----|----------|')

    for (const task of tasks.slice(0, 8)) {
        const fullName = project.getFullTaskName(task)
        console.log(`| ${task.id} | ${fullName} |`)
    }
}

main()
```

### 出力例

```
| id | fullName |
|----|----------|
| 1 | 要件定義 |
| 2 | 要件定義/機能全体 |
| 3 | 設計 |
| 4 | 設計/機能1 |
| 5 | 設計/機能2 |
| 6 | 設計/機能3 |
| 7 | 設計/機能4 |
| 8 | 開発 |
```

---

## EVM 指標を確認する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TaskRow } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()

    console.log('| id | name | pv | ev | spi |')
    console.log('|----|------|-----|-----|-----|')

    // リーフタスクかつ PV > 0 のタスクのみ表示（親タスクを含めると工数がダブルカウントになる）
    for (const task of tasks.filter((t: TaskRow) => t.isLeaf && t.pv && t.pv > 0)) {
        const spi = task.spi?.toFixed(2) ?? '-'
        console.log(`| ${task.id} | ${task.name} | ${task.pv} | ${task.ev} | ${spi} |`)
    }
}

main()
```

### 出力例

```
| id | name | pv | ev | spi |
|----|------|-----|-----|-----|
| 2 | 機能全体 | 4 | 4 | 1.00 |
| 4 | 機能1 | 3 | 3 | 1.00 |
| 5 | 機能2 | 2 | 2 | 1.00 |
| 6 | 機能3 | 5 | 5 | 1.00 |
| 7 | 機能4 | 5 | 5 | 1.00 |
| 9 | 機能1 | 5 | 1 | 0.20 |
| 10 | 機能2 | 2.5 | 1 | 0.40 |
| 11 | 機能3 | 2.5 | 1.5 | 0.60 |
| 12 | 機能4 | 5 | 4 | 0.80 |
```

> 開発フェーズのタスク（id=9〜12）で SPI が 0.2〜0.8 と遅延が発生していることがわかります。
> id が歯抜けになっているのは、親タスク（要件定義、設計、開発など）を除外しているためです。

---

## 次のステップ

- [プロジェクト統計](./02-project-statistics.md) - BAC, PV, EV, SPI の集計
- [完了予測](./04-completion-forecast.md) - 完了予測日の計算
- [遅延タスク](./03-task-operations.md) - 遅延タスクの抽出
