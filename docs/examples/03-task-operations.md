# タスク操作

タスクの絞り込みや遅延タスクの抽出方法を説明します。

## SPI で遅れているタスクを取得する

SPI（スケジュール効率指数）が 1.0 未満のタスクは、予定より遅れています。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TaskRow } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    const tasks = project.toTaskRows()

    // SPI < 1.0 で遅れているタスク（PV > 0 のリーフのみ）
    const behindScheduleTasks = tasks.filter((t: TaskRow) =>
        t.isLeaf &&
        t.pv !== undefined &&
        t.pv > 0 &&
        t.spi !== undefined &&
        t.spi < 1.0
    )

    console.log(`遅れているタスク数: ${behindScheduleTasks.length}件`)
    console.log('')
    console.log('| id | fullName | progressRate | spi |')
    console.log('|----|----------|--------------|-----|')

    for (const task of behindScheduleTasks) {
        const fullName = project.getFullTaskName(task)
        const progress = task.progressRate !== undefined
            ? `${(task.progressRate * 100).toFixed(0)}%`
            : '-'
        console.log(`| ${task.id} | ${fullName} | ${progress} | ${task.spi?.toFixed(2)} |`)
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

遅れているタスク数: 4件

| id | fullName | progressRate | spi |
|----|----------|--------------|-----|
| 9 | 開発/機能1 | 10% | 0.20 |
| 10 | 開発/機能2 | 20% | 0.40 |
| 11 | 開発/機能3 | 30% | 0.60 |
| 12 | 開発/機能4 | 40% | 0.80 |
```

> 開発フェーズの4タスクが SPI < 1.0 で予定より遅れています。特に機能1（SPI=0.20）は大幅に遅延しています。

---

## 期限切れタスクを取得する（getDelayedTasks）

`getDelayedTasks()` は**予定終了日を過ぎて未完了のタスク**を取得します。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    // 期限切れタスクを取得（予定終了日 < 基準日 かつ 未完了）
    const overdueTasks = project.getDelayedTasks(0)

    console.log(`期限切れタスク数: ${overdueTasks.length}件`)

    if (overdueTasks.length > 0) {
        console.log('| id | name | endDate | progressRate |')
        console.log('|----|------|---------|--------------|')

        for (const task of overdueTasks.slice(0, 5)) {
            const progress = task.progressRate !== undefined
                ? `${(task.progressRate * 100).toFixed(0)}%`
                : '-'
            console.log(
                `| ${task.id} | ${task.name} | ${task.endDate?.toLocaleDateString('ja-JP')} | ${progress} |`
            )
        }
    } else {
        console.log('期限切れタスクはありません')
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

期限切れタスク数: 0件

期限切れタスクはありません
```

> 基準日（2025/7/25）時点で、予定終了日を過ぎた未完了タスクはありません。
> 開発フェーズのタスク（id=9-12）は予定終了日が 2025/8/1 なので、まだ期限内です。

---

## 指定日数以上の期限切れタスクを取得する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    // 3日以上遅延しているタスク
    const delayedTasks = project.getDelayedTasks(3)

    console.log(`3日以上遅延タスク数: ${delayedTasks.length}件`)

    if (delayedTasks.length > 0) {
        console.log('| id | fullName | endDate |')
        console.log('|----|----------|---------|')

        for (const task of delayedTasks) {
            const fullName = project.getFullTaskName(task)
            console.log(
                `| ${task.id} | ${fullName} | ${task.endDate?.toLocaleDateString('ja-JP')} |`
            )
        }
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

3日以上遅延タスク数: 0件
```

---

## 担当者でタスクを絞り込む

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TaskRow } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    const tasks = project.toTaskRows()

    // 要員A のタスクを抽出
    const assigneeTasks = tasks.filter((t: TaskRow) => t.assignee === '要員A' && t.isLeaf)

    console.log(`要員A のタスク数: ${assigneeTasks.length}件`)
    console.log('| id | name | progressRate | spi |')
    console.log('|----|------|--------------|-----|')

    for (const task of assigneeTasks) {
        const progress = task.progressRate !== undefined
            ? `${(task.progressRate * 100).toFixed(0)}%`
            : '-'
        const spi = task.spi?.toFixed(2) ?? '-'
        console.log(`| ${task.id} | ${task.name} | ${progress} | ${spi} |`)
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

要員A のタスク数: 8件

| id | name | progressRate | spi |
|----|------|--------------|-----|
| 2 | 機能全体 | 100% | 1.00 |
| 4 | 機能1 | 100% | 1.00 |
| 5 | 機能2 | 100% | 1.00 |
| 7 | 機能4 | 100% | 1.00 |
| 9 | 機能1 | 10% | 0.20 |
| 14 | 単体テスト | - | 0.00 |
| 15 | 連結テスト | - | 0.00 |
| 16 | 総合テスト | - | 0.00 |
```

> 要員Aは要件定義・設計フェーズは順調（SPI=1.00）ですが、開発フェーズ（id=9）で遅延（SPI=0.20）が発生しています。

---

## 進捗率でタスクを絞り込む

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TaskRow } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    const tasks = project.toTaskRows()

    // 進捗率が50%未満のタスク（リーフのみ）
    const inProgressTasks = tasks.filter((t: TaskRow) =>
        t.isLeaf &&
        t.progressRate !== undefined &&
        t.progressRate < 0.5 &&
        t.progressRate > 0
    )

    console.log(`進捗率 0-50% のタスク数: ${inProgressTasks.length}件`)
    console.log('| id | fullName | progressRate |')
    console.log('|----|----------|--------------|')

    for (const task of inProgressTasks) {
        const fullName = project.getFullTaskName(task)
        const progress = `${(task.progressRate! * 100).toFixed(0)}%`
        console.log(`| ${task.id} | ${fullName} | ${progress} |`)
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

進捗率 0-50% のタスク数: 4件

| id | fullName | progressRate |
|----|----------|--------------|
| 9 | 開発/機能1 | 10% |
| 10 | 開発/機能2 | 20% |
| 11 | 開発/機能3 | 30% |
| 12 | 開発/機能4 | 40% |
```

> 開発フェーズの4タスクが進行中（10-40%）であることがわかります。

---

## 期限切れタスクを確認する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TaskRow } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()
    const baseDate = project.baseDate

    console.log(`基準日: ${baseDate.toLocaleDateString('ja-JP')}`)

    // isOverdueAt で期限切れを判定
    const overdueTasks = tasks.filter((t: TaskRow) => t.isLeaf && t.isOverdueAt(baseDate))

    console.log(`期限切れタスク数: ${overdueTasks.length}件`)

    if (overdueTasks.length > 0) {
        console.log('| id | name | endDate | progressRate |')
        console.log('|----|------|---------|--------------|')

        for (const task of overdueTasks) {
            const progress = task.progressRate !== undefined
                ? `${(task.progressRate * 100).toFixed(0)}%`
                : '-'
            console.log(
                `| ${task.id} | ${task.name} | ${task.endDate?.toLocaleDateString('ja-JP')} | ${progress} |`
            )
        }
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

期限切れタスク数: 0件
```

> `isOverdueAt(baseDate)` は、基準日時点で終了予定日を過ぎているが未完了のタスクを判定します。

---

## 次のステップ

- [完了予測](./04-completion-forecast.md) - 完了予測日とオプション
- [スナップショット比較](./05-diff-snapshots.md) - 2時点間の差分
- [プロジェクト統計](./02-project-statistics.md) - 担当者別統計
