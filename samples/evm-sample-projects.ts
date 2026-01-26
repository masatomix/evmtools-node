/**
 * EVM指標サンプル出力
 *
 * 3つのプロジェクト（順調/遅延/失速）を比較して、EVM指標の意味を理解する。
 *
 * 共通設定:
 * - タスク数: 5タスク（各1人日）
 * - 期間: 5稼働日（2025-08-01 〜 2025-08-07）
 * - 基準日: 3日目（2025-08-05、中間地点）
 * - 日々のPV: 1.0人日（理想的な状態）
 *
 * 実行方法（リポジトリルートから）:
 *   npx ts-node samples/evm-sample-projects.ts
 *
 * 注意: node_modulesが必要なため、worktreeからではなくメインリポジトリから実行すること
 */

import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../src/domain/Project'
import { TaskNode } from '../src/domain/TaskNode'

// ============================================
// ヘルパー関数
// ============================================

/**
 * plotMapを生成（指定した日のみ）
 */
function createPlotMapForSingleDay(date: Date): Map<number, boolean> {
    const plotMap = new Map<number, boolean>()
    plotMap.set(date2Sn(date), true)
    return plotMap
}

/**
 * TaskNode生成ヘルパー
 */
function createTask(
    id: number,
    name: string,
    date: Date,
    progressRate: number
): TaskNode {
    const workload = 1 // 各タスク1人日
    const scheduledWorkDays = 1

    // PV: 基準日（8/5）までのタスクはPV=workload、それ以降は0
    // EV: workload × progressRate
    const baseDate = new Date('2025-08-05')
    const pv = date <= baseDate ? workload : 0
    const ev = workload * progressRate
    const spi = pv > 0 ? ev / pv : 0

    return new TaskNode(
        id, // sharp
        id, // id
        1, // level
        name,
        undefined, // assignee
        workload,
        date, // startDate
        date, // endDate (1日タスク)
        undefined, // actualStartDate
        undefined, // actualEndDate
        progressRate,
        scheduledWorkDays,
        pv,
        ev,
        spi,
        undefined, // expectedProgressDate
        undefined, // delayDays
        undefined, // remarks
        undefined, // parentId
        true, // isLeaf
        createPlotMapForSingleDay(date),
        [] // children
    )
}

/**
 * プロジェクト生成
 */
function createSampleProject(name: string, tasks: TaskNode[]): Project {
    const baseDate = new Date('2025-08-05') // 3日目（中間地点）
    const startDate = new Date('2025-08-01')
    const endDate = new Date('2025-08-07')

    return new Project(tasks, baseDate, [], startDate, endDate, name)
}

// ============================================
// 3つのサンプルプロジェクト
// ============================================

// 日付定義（5稼働日: 8/1金, 8/4月, 8/5火, 8/6水, 8/7木）
const day1 = new Date('2025-08-01') // 金
const day2 = new Date('2025-08-04') // 月
const day3 = new Date('2025-08-05') // 火（基準日）
const day4 = new Date('2025-08-06') // 水
const day5 = new Date('2025-08-07') // 木

/**
 * ケース1: 順調プロジェクト
 * - タスク1〜3: 完了（100%）
 * - タスク4〜5: 未着手（0%）
 */
const onTrackTasks = [
    createTask(1, 'タスク1', day1, 1.0),
    createTask(2, 'タスク2', day2, 1.0),
    createTask(3, 'タスク3', day3, 1.0),
    createTask(4, 'タスク4', day4, 0),
    createTask(5, 'タスク5', day5, 0),
]
const onTrackProject = createSampleProject('順調', onTrackTasks)

/**
 * ケース2: 遅延プロジェクト
 * - タスク1: 完了（100%）
 * - タスク2: 遅れ（50%）
 * - タスク3〜5: 未着手（0%）
 */
const delayedTasks = [
    createTask(1, 'タスク1', day1, 1.0),
    createTask(2, 'タスク2', day2, 0.5),
    createTask(3, 'タスク3', day3, 0),
    createTask(4, 'タスク4', day4, 0),
    createTask(5, 'タスク5', day5, 0),
]
const delayedProject = createSampleProject('遅延', delayedTasks)

/**
 * ケース3: 失速プロジェクト
 * - タスク1〜2: 完了（100%）
 * - タスク3: 急に失速（20%）
 * - タスク4〜5: 未着手（0%）
 */
const stalledTasks = [
    createTask(1, 'タスク1', day1, 1.0),
    createTask(2, 'タスク2', day2, 1.0),
    createTask(3, 'タスク3', day3, 0.2),
    createTask(4, 'タスク4', day4, 0),
    createTask(5, 'タスク5', day5, 0),
]
const stalledProject = createSampleProject('失速', stalledTasks)

// ============================================
// 出力
// ============================================

function printProjectStats(project: Project) {
    const stats = project.statisticsByProject[0]
    const bac = stats.totalWorkloadExcel ?? 0
    const pv = stats.totalPvCalculated ?? 0
    const ev = stats.totalEv ?? 0
    const spi = stats.spi ?? 0
    const etcPrime = stats.etcPrime
    const completionForecast = stats.completionForecast

    console.log(`\n### ${stats.projectName}`)
    console.log(`| 指標 | 値 | 説明 |`)
    console.log(`|-----|-----|------|`)
    console.log(`| BAC | ${bac}人日 | 総予定工数 |`)
    console.log(`| PV | ${pv}人日 | 3日目までの計画 |`)
    console.log(`| EV | ${ev}人日 | 実績 |`)
    console.log(`| SPI | ${spi.toFixed(3)} | EV / PV |`)
    if (etcPrime !== undefined) {
        console.log(`| ETC' | ${etcPrime.toFixed(2)}人日 | (BAC - EV) / SPI |`)
    }
    if (completionForecast) {
        console.log(
            `| 完了予測日 | ${completionForecast.toISOString().split('T')[0]} | |`
        )
    }

    // 終了予定日との比較
    const endDate = new Date(stats.endDate)
    if (completionForecast) {
        const delayMs = completionForecast.getTime() - endDate.getTime()
        const delayDays = Math.round(delayMs / (1000 * 60 * 60 * 24))
        console.log(`| 遅延日数 | ${delayDays}日 | |`)
    }
}

function printSummaryTable(projects: Project[]) {
    console.log(`\n## サマリ比較`)
    console.log(
        `| プロジェクト | BAC | PV | EV | SPI | 完了予測日 | 遅延日数 |`
    )
    console.log(`|-------------|-----|-----|-----|-----|-----------|---------|`)

    for (const project of projects) {
        const stats = project.statisticsByProject[0]
        const bac = stats.totalWorkloadExcel ?? 0
        const pv = stats.totalPvCalculated ?? 0
        const ev = stats.totalEv ?? 0
        const spi = stats.spi ?? 0
        const completionForecast = stats.completionForecast
        const endDate = new Date(stats.endDate)

        let forecastStr = '-'
        let delayStr = '-'
        if (completionForecast) {
            forecastStr = completionForecast.toISOString().split('T')[0]
            const delayMs = completionForecast.getTime() - endDate.getTime()
            const delayDays = Math.round(delayMs / (1000 * 60 * 60 * 24))
            delayStr = `${delayDays}日`
        }

        console.log(
            `| ${stats.projectName} | ${bac}人日 | ${pv}人日 | ${ev}人日 | ${spi.toFixed(3)} | ${forecastStr} | ${delayStr} |`
        )
    }
}

// メイン実行
console.log('# EVM指標サンプル出力')
console.log('')
console.log('基準日: 2025-08-05（3日目）')
console.log('期間: 2025-08-01 〜 2025-08-07（5稼働日）')

printProjectStats(onTrackProject)
printProjectStats(delayedProject)
printProjectStats(stalledProject)

printSummaryTable([onTrackProject, delayedProject, stalledProject])

// 累積SPIの落とし穴を示す
console.log(`\n## 累積SPIの落とし穴`)
console.log('')
console.log('失速プロジェクトの直近1日（タスク3）のSPIを計算:')
const task3Stalled = stalledTasks[2]
console.log(`- タスク3のPV: ${task3Stalled.pv}`)
console.log(`- タスク3のEV: ${task3Stalled.ev}`)
console.log(`- タスク3のSPI: ${task3Stalled.spi?.toFixed(3)} ← 深刻！`)
console.log('')
console.log('直近SPIで完了予測を再計算すると:')
const recentSpi = task3Stalled.spi ?? 0.2
const bac = 5
const ev = 2.2
const etcPrimeRecent = (bac - ev) / recentSpi
console.log(
    `- ETC' = (${bac} - ${ev}) / ${recentSpi} = ${etcPrimeRecent.toFixed(1)}人日`
)
console.log(`- 完了予測日 = 2025-08-05 + ${Math.ceil(etcPrimeRecent)}稼働日 ≒ 2025-08-25`)
console.log(`- 遅延日数 = 18日（累積SPI版の4.5倍！）`)
