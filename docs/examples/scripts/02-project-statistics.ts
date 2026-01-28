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

async function example2_filterStats() {
    console.log('=== Example 2: フィルタして統計を取得する ===\n')

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

async function example3_assigneeStats() {
    console.log('=== Example 3: 担当者別の統計を取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    // 担当者別統計を取得
    const statsByName = project.getStatisticsByName()

    console.log('| 担当者 | タスク数 | BAC | PV | EV | SPI |')
    console.log('|--------|---------|-----|-----|-----|-----|')

    for (const stats of statsByName) {
        const spi = stats.spi?.toFixed(3) ?? '-'
        console.log(
            `| ${stats.assignee} | ${stats.totalTasksCount} | ${stats.totalWorkloadExcel} | ${stats.totalPvCalculated} | ${stats.totalEv} | ${spi} |`
        )
    }
    console.log('')
}

async function example4_recentSpi() {
    console.log('=== Example 4: 複数スナップショットから平均SPIを計算する ===\n')

    // 2つのスナップショットを読み込む
    const projectPrev = await new ExcelProjectCreator('./prev.xlsm').createProject()
    const projectNow = await new ExcelProjectCreator('./now.xlsm').createProject()

    console.log(`前回基準日: ${projectPrev.baseDate.toLocaleDateString('ja-JP')}`)
    console.log(`今回基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}\n`)

    const service = new ProjectService()
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    console.log(`直近SPI: ${recentSpi?.toFixed(3)}`)
    console.log('')

    // 複数スナップショットの場合（コメントのみ）
    // const files = ['0718.xlsm', '0722.xlsm', '0723.xlsm', '0724.xlsm', '0725.xlsm']
    // const projects = await Promise.all(
    //     files.map(f => new ExcelProjectCreator(`./${f}`).createProject())
    // )
    // const weeklyAvgSpi = service.calculateRecentSpi(projects)
    // console.log(`直近1週間のSPI平均: ${weeklyAvgSpi?.toFixed(3)}`)
}

async function example5_pvToday() {
    console.log('=== Example 5: 今日のPV（計画PV と 実行PV） ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const baseDate = project.baseDate
    console.log(`基準日: ${baseDate.toLocaleDateString('ja-JP')}\n`)

    const tasks = project.toTaskRows()

    // 進行中タスク（PV > 0 かつ 未完了）を抽出
    const inProgressTasks = tasks.filter(
        (t: TaskRow) =>
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
    await example2_filterStats()
    await example3_assigneeStats()
    await example4_recentSpi()
    await example5_pvToday()
}

main().catch(console.error)
