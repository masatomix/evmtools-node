# プロジェクト統計

プロジェクト全体の EVM 指標を取得する方法を説明します。

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

## 完了予測を取得する

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    // 完了予測を計算
    const forecast = project.calculateCompletionForecast()

    if (forecast) {
        // 遅延日数を計算
        const scheduledEnd = project.endDate
        const forecastEnd = forecast.forecastDate
        const delayDays = scheduledEnd && forecastEnd
            ? Math.ceil((forecastEnd.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
            : undefined

        console.log('| 項目 | 値 |')
        console.log('|------|-----|')
        console.log(`| 使用SPI | ${forecast.usedSpi?.toFixed(3)} |`)
        console.log(`| 残作業量 (BAC - EV) | ${forecast.remainingWork?.toFixed(1)}人日 |`)
        console.log(`| ETC' | ${forecast.etcPrime?.toFixed(1)}人日 |`)
        console.log(`| 完了予測日 | ${forecast.forecastDate?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 予定終了日 | ${project.endDate?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 遅延日数 | ${delayDays}日 |`)
        console.log(`| 信頼度 | ${forecast.confidence} |`)
        console.log(`| 信頼度理由 | ${forecast.confidenceReason} |`)
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 項目 | 値 |
|------|-----|
| 使用SPI | 0.779 |
| 残作業量 (BAC - EV) | 39.5人日 |
| ETC' | 50.7人日 |
| 完了予測日 | 2025/8/21 |
| 予定終了日 | 2025/8/26 |
| 遅延日数 | -5日 |
| 信頼度 | medium |
| 信頼度理由 | やや遅れ気味（SPI: 0.5-0.8） |
```

> 遅延日数がマイナスの場合、予定より早く完了する見込みです。

---

## 外部指定の SPI で完了予測する

直近 N 日の SPI など、外部で計算した SPI を使って完了予測ができます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    // 累積SPIでの予測
    const forecastCumulative = project.calculateCompletionForecast()

    // 直近SPIを外部指定して予測（例: 0.5）
    const customSpi = 0.5
    const forecastCustom = project.calculateCompletionForecast({
        spiOverride: customSpi,
    })

    // 遅延日数を計算するヘルパー
    const calcDelayDays = (forecastDate: Date | undefined) => {
        const scheduledEnd = project.endDate
        if (!scheduledEnd || !forecastDate) return undefined
        return Math.ceil((forecastDate.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
    }

    console.log('| 項目 | 累積SPI | 外部指定SPI |')
    console.log('|------|---------|------------|')
    console.log(`| 使用SPI | ${forecastCumulative?.usedSpi?.toFixed(3)} | ${forecastCustom?.usedSpi?.toFixed(3)} |`)
    console.log(`| 完了予測日 | ${forecastCumulative?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastCustom?.forecastDate?.toLocaleDateString('ja-JP')} |`)
    console.log(`| 遅延日数 | ${calcDelayDays(forecastCumulative?.forecastDate)}日 | ${calcDelayDays(forecastCustom?.forecastDate)}日 |`)
    console.log(`| 信頼度 | ${forecastCumulative?.confidence} | ${forecastCustom?.confidence} |`)
}

main()
```

### 出力例

```
基準日: 2025/7/25

外部指定SPI: 0.5

| 項目 | 累積SPI | 外部指定SPI |
|------|---------|------------|
| 使用SPI | 0.779 | 0.500 |
| 完了予測日 | 2025/8/21 | 2025/9/5 |
| 遅延日数 | -5日 | 10日 |
| 信頼度 | medium | high |
```

> **Note**: `spiOverride` を指定すると `confidence: 'high'` になります（ユーザーが明示的に SPI を指定したため）

---

## フィルタして統計を取得する

特定のタスクに絞って統計を取得できます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

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
import { TaskRow } from 'evmtools-node/domain'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()

    // 担当者をユニークに取得（リーフタスクのみ）
    const leafTasks = tasks.filter((t: TaskRow) => t.isLeaf)
    const assignees = [...new Set(leafTasks.map((t) => t.assignee).filter(Boolean))]

    console.log('| 担当者 | タスク数 | BAC | PV | EV | SPI |')
    console.log('|--------|---------|-----|-----|-----|-----|')

    for (const assignee of assignees) {
        const assigneeTasks = leafTasks.filter((t: TaskRow) => t.assignee === assignee)
        const bac = assigneeTasks.reduce((sum, t) => sum + (t.workload ?? 0), 0)
        const pv = assigneeTasks.reduce((sum, t) => sum + (t.pv ?? 0), 0)
        const ev = assigneeTasks.reduce((sum, t) => sum + (t.ev ?? 0), 0)
        const spi = pv > 0 ? (ev / pv).toFixed(3) : '-'

        console.log(`| ${assignee} | ${assigneeTasks.length} | ${bac} | ${pv} | ${ev} | ${spi} |`)
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

## 複数スナップショットから直近 SPI を計算する

複数日のプロジェクトスナップショットから、直近の SPI を計算できます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    // 複数日のスナップショットを読み込む
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    // ProjectService で直近 SPI を計算
    const service = new ProjectService()
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    console.log(`直近SPI（2スナップショット間）: ${recentSpi?.toFixed(3)}`)

    // 直近SPIで完了予測
    if (recentSpi) {
        const forecast = projectNow.calculateCompletionForecast({
            spiOverride: recentSpi,
        })
        console.log(`完了予測日（直近SPI使用）: ${forecast?.forecastDate?.toLocaleDateString('ja-JP')}`)
    }
}

main()
```

### 出力例

```
前回基準日: 2025/7/4
今回基準日: 2025/7/25

直近SPI（2スナップショット間）: 1.252

完了予測日（直近SPI使用）: 2025/8/12
```

> 直近 SPI が 1.0 を超えている場合、最近の進捗が予定より早いことを示します。

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
| 9 | 機能1 | 6 | 1.000 | 1.500 | 遅れ |
| 10 | 機能2 | 6 | 0.500 | 0.667 | 遅れ |
| 11 | 機能3 | 6 | 0.500 | 0.583 | 遅れ |
| 12 | 機能4 | 6 | 1.000 | 1.000 | 予定通り |
```

### 解釈

- **実行PV > 計画PV**: 遅れている（今日やるべき量が計画より多い）
- **実行PV < 計画PV**: 前倒し（今日やるべき量が計画より少ない）
- **実行PV = 計画PV**: 予定通り

> 機能1〜3は「遅れ」状態です。機能1は計画PV（1.000）に対して実行PV（1.500）と1.5倍のペースで進める必要があります。
> 機能4は進捗40%で残日数6日、計画通りのペースです。

---

## 次のステップ

- [タスク操作](./03-task-operations.md) - 遅延タスクの抽出
- [完了予測の詳細](./04-completion-forecast.md) - オプション詳細
- [スナップショット比較](./05-diff-snapshots.md) - 2時点間の差分
