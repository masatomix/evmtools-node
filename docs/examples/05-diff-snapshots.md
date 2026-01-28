# スナップショット比較

2時点間のプロジェクトスナップショットを比較し、差分を分析する方法を説明します。

## 基本的な差分比較

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    console.log('比較元（prev）:')
    console.log(`  基準日: ${projectPrev.baseDate.toLocaleDateString('ja-JP')}`)

    console.log('比較先（now）:')
    console.log(`  基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}`)

    const service = new ProjectService()
    const taskDiffs = service.calculateTaskDiffs(projectNow, projectPrev)

    const modifiedCount = taskDiffs.filter(d => d.diffType === 'modified').length
    const addedCount = taskDiffs.filter(d => d.diffType === 'added').length
    const removedCount = taskDiffs.filter(d => d.diffType === 'removed').length
    const unchangedCount = taskDiffs.filter(d => d.diffType === 'none').length

    console.log('| 差分種別 | 件数 |')
    console.log('|----------|------|')
    console.log(`| 変更 (modified) | ${modifiedCount} |`)
    console.log(`| 追加 (added) | ${addedCount} |`)
    console.log(`| 削除 (removed) | ${removedCount} |`)
    console.log(`| 変更なし (none) | ${unchangedCount} |`)
}

main()
```

### 出力例

```
比較元（prev）:
  基準日: 2025/7/4
  PV: 4人日, EV: 6.9人日

比較先（now）:
  基準日: 2025/7/25
  PV: 34人日, EV: 26.5人日

| 差分種別 | 件数 |
|----------|------|
| 変更 (modified) | 8 |
| 追加 (added) | 0 |
| 削除 (removed) | 0 |
| 変更なし (none) | 6 |
```

---

## タスク単位の差分詳細

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    const service = new ProjectService()
    const taskDiffs = service.calculateTaskDiffs(projectNow, projectPrev)

    // 変更があったタスクのみ表示
    const changedTasks = taskDiffs.filter(d => d.hasDiff)

    console.log(`変更タスク数: ${changedTasks.length}件\n`)
    console.log('| id | name | diffType | Δ進捗率 | ΔPV | ΔEV |')
    console.log('|----|------|----------|---------|-----|-----|')

    for (const diff of changedTasks) {
        const deltaProgress = diff.deltaProgressRate !== undefined
            ? `${(diff.deltaProgressRate * 100).toFixed(0)}%`
            : '-'
        const deltaPV = diff.deltaPV?.toFixed(1) ?? '-'
        const deltaEV = diff.deltaEV?.toFixed(1) ?? '-'
        console.log(`| ${diff.id} | ${diff.name} | ${diff.diffType} | ${deltaProgress} | ${deltaPV} | ${deltaEV} |`)
    }
}

main()
```

### 出力例

```
変更タスク数: 8件

| id | name | diffType | Δ進捗率 | ΔPV | ΔEV |
|----|------|----------|---------|-----|-----|
| 4 | 機能1 | modified | 100% | 3.0 | 3.0 |
| 5 | 機能2 | modified | 80% | 2.0 | 1.6 |
| 6 | 機能3 | modified | 50% | 5.0 | 2.5 |
| 7 | 機能4 | modified | 100% | 5.0 | 5.0 |
| 9 | 機能1 | modified | 10% | 5.0 | 1.0 |
| 10 | 機能2 | modified | 20% | 2.5 | 1.0 |
| 11 | 機能3 | modified | 30% | 2.5 | 1.5 |
| 12 | 機能4 | modified | 40% | 5.0 | 4.0 |
```

> 設計フェーズ（id=4-7）は完了し、開発フェーズ（id=9-12）が進行中であることがわかります。

---

## プロジェクト全体の差分サマリー

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    const service = new ProjectService()
    const taskDiffs = service.calculateTaskDiffs(projectNow, projectPrev)
    const projectDiffs = service.calculateProjectDiffs(taskDiffs)

    console.log('| 項目 | 値 |')
    console.log('|------|-----|')

    for (const diff of projectDiffs) {
        console.log(`| 変更タスク数 | ${diff.modifiedCount} |`)
        console.log(`| 追加タスク数 | ${diff.addedCount} |`)
        console.log(`| 削除タスク数 | ${diff.removedCount} |`)
        console.log(`| ΔPV | ${diff.deltaPV?.toFixed(1)} |`)
        console.log(`| ΔEV | ${diff.deltaEV?.toFixed(1)} |`)
    }
}

main()
```

### 出力例

```
| 項目 | 値 |
|------|-----|
| 変更タスク数 | 8 |
| 追加タスク数 | 0 |
| 削除タスク数 | 0 |
| ΔPV | 30.0 |
| ΔEV | 19.6 |
```

---

## 担当者別の差分

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    const service = new ProjectService()
    const taskDiffs = service.calculateTaskDiffs(projectNow, projectPrev)
    const assigneeDiffs = service.calculateAssigneeDiffs(taskDiffs)

    console.log('| 担当者 | 変更数 | ΔPV | ΔEV |')
    console.log('|--------|--------|-----|-----|')

    for (const diff of assigneeDiffs.filter(d => d.hasDiff)) {
        const assignee = diff.assignee || '(未割当)'
        console.log(
            `| ${assignee} | ${diff.modifiedCount} | ${diff.deltaPV?.toFixed(1)} | ${diff.deltaEV?.toFixed(1)} |`
        )
    }
}

main()
```

### 出力例

```
| 担当者 | 変更数 | ΔPV | ΔEV |
|--------|--------|-----|-----|
| 要員A | 4 | 15.0 | 10.6 |
| 要員B | 3 | 10.0 | 5.0 |
| 要員C | 1 | 5.0 | 4.0 |
```

> 担当者ごとの期間内の進捗量がわかります。

---

## 進捗分析（期間内の進捗量）

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    // 期間の計算
    const daysDiff = Math.ceil(
        (projectNow.baseDate.getTime() - projectPrev.baseDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const service = new ProjectService()
    const taskDiffs = service.calculateTaskDiffs(projectNow, projectPrev)

    // EV増分の合計を計算
    const totalDeltaEV = taskDiffs.reduce((sum, d) => sum + (d.deltaEV ?? 0), 0)

    // 直近SPIも計算
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    console.log('| 項目 | 値 |')
    console.log('|------|-----|')
    console.log(`| 比較期間 | ${daysDiff}日間 |`)
    console.log(`| 期間内EV増分 | ${totalDeltaEV.toFixed(1)}人日 |`)
    console.log(`| 1日あたりEV | ${(totalDeltaEV / daysDiff).toFixed(2)}人日/日 |`)
    console.log(`| 直近SPI | ${recentSpi?.toFixed(3)} |`)
}

main()
```

### 出力例

```
| 項目 | 値 |
|------|-----|
| 比較期間 | 21日間 |
| 期間内EV増分 | 19.6人日 |
| 1日あたりEV | 0.93人日/日 |
| 直近SPI | 1.252 |
```

> 直近SPIが1.0を超えている場合、最近の進捗が予定より早いことを示しています。

---

## diffType の種類

| diffType | 意味 |
|----------|------|
| `modified` | 進捗率・PV・EVのいずれかが変更された |
| `added` | 新規追加されたタスク |
| `removed` | 削除されたタスク |
| `none` | 変更なし |

---

## 次のステップ

- [CSV インポート](./06-csv-import.md) - CSVファイルからの読み込み
- [完了予測](./04-completion-forecast.md) - 直近SPIでの予測
- [プロジェクト統計](./02-project-statistics.md) - 担当者別統計
