#!/usr/bin/env ts-node
/**
 * 02-project-statistics.md のコード検証スクリプト
 */

import { ExcelProjectCreator } from '../../../src/infrastructure'
import { ProjectService, TaskRow } from '../../../src/domain'

async function example1_projectStats() {
    console.log('=== Example 1: プロジェクト統計を取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const stats = project.getStatistics()

    console.log('| 指標 | 値 | 説明 |')
    console.log('|------|-----|------|')
    console.log(`| BAC | ${stats.totalWorkloadExcel}人日 | 総予定工数 |`)
    console.log(`| PV | ${stats.totalPvCalculated}人日 | 計画価値（基準日時点） |`)
    console.log(`| EV | ${stats.totalEv}人日 | 出来高 |`)
    console.log(`| SPI | ${stats.spi?.toFixed(3)} | スケジュール効率 |`)
    console.log('')
}

async function example2_completionForecast() {
    console.log('=== Example 2: 完了予測を取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

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
    console.log('')
}

async function example3_spiOverride() {
    console.log('=== Example 3: 外部指定の SPI で完了予測する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

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

    console.log(`外部指定SPI: ${customSpi}`)
    console.log('')
    console.log('| 項目 | 累積SPI | 外部指定SPI |')
    console.log('|------|---------|------------|')
    console.log(
        `| 使用SPI | ${forecastCumulative?.usedSpi?.toFixed(3)} | ${forecastCustom?.usedSpi?.toFixed(3)} |`
    )
    console.log(
        `| 完了予測日 | ${forecastCumulative?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastCustom?.forecastDate?.toLocaleDateString('ja-JP')} |`
    )
    console.log(
        `| 遅延日数 | ${calcDelayDays(forecastCumulative?.forecastDate)}日 | ${calcDelayDays(forecastCustom?.forecastDate)}日 |`
    )
    console.log(
        `| 信頼度 | ${forecastCumulative?.confidence} | ${forecastCustom?.confidence} |`
    )
    console.log('')
}

async function example4_filterStats() {
    console.log('=== Example 4: フィルタして統計を取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

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
    console.log('')
}

async function example5_assigneeStats() {
    console.log('=== Example 5: 担当者別の統計を取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const tasks = project.toTaskRows()

    // 担当者をユニークに取得（リーフタスクのみ）
    const leafTasks = tasks.filter((t: TaskRow) => t.isLeaf)
    const assignees = [...new Set(leafTasks.map((t) => t.assignee).filter(Boolean))]

    console.log('| 担当者 | タスク数 | BAC | PV | EV | SPI |')
    console.log('|--------|---------|-----|-----|-----|-----|')

    for (const assignee of assignees) {
        const assigneeTasks = leafTasks.filter((t: TaskRow) => t.assignee === assignee)
        const bac = assigneeTasks.reduce((sum: number, t: TaskRow) => sum + (t.workload ?? 0), 0)
        const pv = assigneeTasks.reduce((sum: number, t: TaskRow) => sum + (t.pv ?? 0), 0)
        const ev = assigneeTasks.reduce((sum: number, t: TaskRow) => sum + (t.ev ?? 0), 0)
        const spi = pv > 0 ? (ev / pv).toFixed(3) : '-'

        console.log(`| ${assignee} | ${assigneeTasks.length} | ${bac} | ${pv} | ${ev} | ${spi} |`)
    }
    console.log('')
}

async function example6_recentSpiWithMultipleSnapshots() {
    console.log('=== Example 6: 複数スナップショットから直近SPIを計算する ===\n')

    // 注: 実際の使用では複数日のスナップショットを読み込む
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    console.log(`前回基準日: ${projectPrev.baseDate.toLocaleDateString('ja-JP')}`)
    console.log(`今回基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}\n`)

    const service = new ProjectService()
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    console.log(`直近SPI（2スナップショット間）: ${recentSpi?.toFixed(3)}`)
    console.log('')

    // 直近SPIで完了予測
    if (recentSpi) {
        const forecast = projectNow.calculateCompletionForecast({
            spiOverride: recentSpi,
        })
        console.log(`完了予測日（直近SPI使用）: ${forecast?.forecastDate?.toLocaleDateString('ja-JP')}`)
    }
    console.log('')
}

async function example7_pvToday() {
    console.log('=== Example 7: 今日のPV（計画PV と 実行PV） ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const baseDate = project.baseDate
    console.log(`基準日: ${baseDate.toLocaleDateString('ja-JP')}\n`)

    const tasks = project.toTaskRows()

    // 進行中タスク（PV > 0 かつ 未完了）を抽出
    const inProgressTasks = tasks.filter((t: TaskRow) =>
        t.isLeaf &&
        t.pv !== undefined &&
        t.pv > 0 &&
        t.progressRate !== undefined &&
        t.progressRate < 1.0
    )

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
    console.log('')
}

async function main() {
    await example1_projectStats()
    await example2_completionForecast()
    await example3_spiOverride()
    await example4_filterStats()
    await example5_assigneeStats()
    await example6_recentSpiWithMultipleSnapshots()
    await example7_pvToday()
}

main().catch(console.error)
