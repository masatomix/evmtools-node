# プロジェクト統計

プロジェクト全体の EVM 指標を取得する方法を説明します。

> **完了予測について**: 完了予測日の計算方法やオプションの詳細は [完了予測](./04-completion-forecast.md) を参照してください。

## プロジェクト統計を取得する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    // プロジェクト統計を取得
    const stats = project.getStatistics()

    console.log('| 指標 | 値 | 説明 |')
    console.log('|------|-----|------|')
    console.log(`| BAC | ${stats.totalWorkloadExcel}人日 | 総予定工数 |`)
    console.log(`| PV | ${stats.totalPvCalculated}人日 | 計画価値（基準日時点） |`)
    console.log(`| EV | ${stats.totalEv}人日 | 出来高 |`)
    console.log(`| SPI | ${stats.spi?.toFixed(3)} | スケジュール効率 |`)
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 指標 | 値 | 説明 |
|------|-----|------|
| BAC | 66人日 | 総予定工数 |
| PV | 34人日 | 計画価値（基準日時点） |
| EV | 26.5人日 | 出来高 |
| SPI | 0.779 | スケジュール効率 |
```

---

## フィルタして統計を取得する

特定のタスクに絞って統計を取得できます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    // フルパス名に「開発」を含むタスクでフィルタ
    const stats = project.getStatistics({ filter: '開発' })

    console.log('「開発」フェーズの統計:')
    console.log('')
    console.log('| 指標 | 値 |')
    console.log('|------|-----|')
    console.log(`| タスク数 | ${stats.totalTasksCount}件 |`)
    console.log(`| BAC | ${stats.totalWorkloadExcel}人日 |`)
    console.log(`| PV | ${stats.totalPvCalculated}人日 |`)
    console.log(`| EV | ${stats.totalEv}人日 |`)
    console.log(`| SPI | ${stats.spi?.toFixed(3)} |`)
}

main()
```

### 出力例

```
基準日: 2025/7/25

「開発」フェーズの統計:

| 指標 | 値 |
|------|-----|
| タスク数 | 4件 |
| BAC | 30人日 |
| PV | 15人日 |
| EV | 7.5人日 |
| SPI | 0.500 |
```

> プロジェクト全体の SPI（0.779）より、開発フェーズの SPI（0.500）が低いことがわかります。

---

## 担当者別の統計を取得する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    // 担当者別統計を取得
    const statsByName = project.getStatisticsByName()

    console.log('| 担当者 | タスク数 | BAC | PV | EV | SPI |')
    console.log('|--------|---------|-----|-----|-----|-----|')

    for (const stats of statsByName) {
        const spi = stats.spi?.toFixed(3) ?? '-'
        console.log(`| ${stats.assignee} | ${stats.totalTasksCount} | ${stats.totalWorkloadExcel} | ${stats.totalPvCalculated} | ${stats.totalEv} | ${spi} |`)
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 担当者 | タスク数 | BAC | PV | EV | SPI |
|--------|---------|-----|-----|-----|-----|
| 要員A | 8 | 39 | 19 | 15 | 0.789 |
| 要員B | 3 | 15 | 10 | 7.5 | 0.750 |
| 要員C | 3 | 12 | 5 | 4 | 0.800 |
```

---

## 複数スナップショットから平均 SPI を計算する

複数日のプロジェクトスナップショットから、平均の SPI を計算することができます。通常のSPIはプロジェクト開始からいままでの生産性をあらわす指標ですが、直近のスナップショットを複数渡すことで、最近の生産性をあらわす指標を作成することができます。

`calculateRecentSpi()` は複数のスナップショットを受け取り、各スナップショットのSPIを平均して返します。たとえば直近1週間の日次スナップショットを渡すことで、その期間のSPI平均を取得できます。

### コード例（2スナップショット）

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    // 2つのスナップショットを読み込む
    const projectPrev = await new ExcelProjectCreator('./prev.xlsm').createProject()
    const projectNow = await new ExcelProjectCreator('./now.xlsm').createProject()

    console.log(`前回基準日: ${projectPrev.baseDate.toLocaleDateString('ja-JP')}`)
    console.log(`今回基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}`)

    // ProjectService で直近 SPI を計算
    const service = new ProjectService()
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    console.log(`直近SPI: ${recentSpi?.toFixed(3)}`)
}

main()
```

### 出力例

```
前回基準日: 2025/7/4
今回基準日: 2025/7/25

直近SPI: 1.252
```

### コード例（1週間分のスナップショット）

```typescript
// 直近1週間の日次スナップショットを読み込む
const files = ['0718.xlsm', '0722.xlsm', '0723.xlsm', '0724.xlsm', '0725.xlsm']
const projects = await Promise.all(
    files.map(f => new ExcelProjectCreator(`./${f}`).createProject())
)

const service = new ProjectService()
const weeklyAvgSpi = service.calculateRecentSpi(projects)

console.log(`直近1週間のSPI平均: ${weeklyAvgSpi?.toFixed(3)}`)
```

> 直近 SPI が 1.0 を超えている場合、最近の進捗が予定より早いことを示します。
>
> **完了予測への活用**: 直近SPIを使った完了予測については [完了予測 - 直近SPIで完了予測する](./04-completion-forecast.md#直近spiで完了予測する) を参照してください。

---

## 今日のPV（計画PV と 実行PV）

タスクごとの「今日消化すべきPV」を取得できます。

| 種類 | プロパティ/メソッド | 計算式 | 説明 |
|------|-------------------|--------|------|
| **計画PV** | `workloadPerDay` | workload / scheduledWorkDays | 計画段階で決まる固定値 |
| **実行PV** | `pvTodayActual(baseDate)` | 残工数 / 残日数 | 進捗を反映した実態値 |

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { TaskRow } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const baseDate = project.baseDate
    console.log(`基準日: ${baseDate.toLocaleDateString('ja-JP')}`)

    const tasks = project.toTaskRows()

    // 進行中タスク（PV > 0 かつ 未完了）を抽出
    const inProgressTasks = tasks.filter((t: TaskRow) =>
        t.isLeaf &&
        t.pv !== undefined &&
        t.pv > 0 &&
        t.progressRate !== undefined &&
        t.progressRate < 1.0
    )

    console.log('')
    console.log('| id | name | 残日数 | 計画PV | 実行PV | 状態 |')
    console.log('|----|------|--------|--------|--------|------|')

    for (const task of inProgressTasks) {
        const remainingDays = task.remainingDays(baseDate)
        const plannedPV = task.workloadPerDay?.toFixed(3) ?? '-'
        const actualPV = task.pvTodayActual(baseDate)?.toFixed(3) ?? '-'

        // 実行PV > 計画PV なら遅れ、実行PV < 計画PV なら前倒し
        let status = '-'
        if (task.workloadPerDay && actualPV !== '-') {
            const actual = parseFloat(actualPV)
            if (actual > task.workloadPerDay) {
                status = '遅れ'
            } else if (actual < task.workloadPerDay) {
                status = '前倒し'
            } else {
                status = '予定通り'
            }
        }

        console.log(`| ${task.id} | ${task.name} | ${remainingDays} | ${plannedPV} | ${actualPV} | ${status} |`)
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

| id | name | 残日数 | 計画PV | 実行PV | 状態 |
|----|------|--------|--------|--------|------|
| 9 | 機能1 | 5 | 1.000 | 1.800 | 遅れ |
| 10 | 機能2 | 5 | 0.500 | 0.800 | 遅れ |
| 11 | 機能3 | 5 | 0.500 | 0.700 | 遅れ |
| 12 | 機能4 | 5 | 1.000 | 1.200 | 遅れ |
```

### 解釈

- **実行PV > 計画PV**: 遅れている（今日やるべき量が計画より多い）
- **実行PV < 計画PV**: 前倒し（今日やるべき量が計画より少ない）
- **実行PV = 計画PV**: 予定通り

> 全タスクが「遅れ」状態です。機能1は計画PV（1.000）に対して実行PV（1.800）と1.8倍のペースで進める必要があります。
> 残日数は基準日の翌日から終了日までの稼働日数です（基準日終了時点の考え方）。

---

## 次のステップ

- [タスク操作](./03-task-operations.md) - 遅延タスクの抽出
- [完了予測](./04-completion-forecast.md) - 完了予測日の計算とオプション
- [スナップショット比較](./05-diff-snapshots.md) - 2時点間の差分
