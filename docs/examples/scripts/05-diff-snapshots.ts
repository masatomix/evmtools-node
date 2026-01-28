#!/usr/bin/env ts-node
/**
 * 05-diff-snapshots.md のコード検証スクリプト
 */

import { ExcelProjectCreator } from '../../../src/infrastructure'
import { ProjectService } from '../../../src/domain'

async function example1_basicDiff() {
    console.log('=== Example 1: 基本的な差分比較 ===\n')

    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    console.log('比較元（prev）:')
    console.log(`  基準日: ${projectPrev.baseDate.toLocaleDateString('ja-JP')}`)
    const statsPrev = projectPrev.getStatistics()
    console.log(`  PV: ${statsPrev.totalPvCalculated}人日, EV: ${statsPrev.totalEv}人日`)
    console.log('')

    console.log('比較先（now）:')
    console.log(`  基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}`)
    const statsNow = projectNow.getStatistics()
    console.log(`  PV: ${statsNow.totalPvCalculated}人日, EV: ${statsNow.totalEv}人日`)
    console.log('')

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
    console.log('')
}

async function example2_taskDiffs() {
    console.log('=== Example 2: タスク単位の差分詳細 ===\n')

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

    for (const diff of changedTasks.slice(0, 10)) {
        const deltaProgress = diff.deltaProgressRate !== undefined
            ? `${(diff.deltaProgressRate * 100).toFixed(0)}%`
            : '-'
        const deltaPV = diff.deltaPV?.toFixed(1) ?? '-'
        const deltaEV = diff.deltaEV?.toFixed(1) ?? '-'
        console.log(`| ${diff.id} | ${diff.name} | ${diff.diffType} | ${deltaProgress} | ${deltaPV} | ${deltaEV} |`)
    }
    console.log('')
}

async function example3_projectDiffs() {
    console.log('=== Example 3: プロジェクト全体の差分サマリー ===\n')

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
    console.log('')
}

async function example4_assigneeDiffs() {
    console.log('=== Example 4: 担当者別の差分 ===\n')

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
    console.log('')
}

async function example5_progressAnalysis() {
    console.log('=== Example 5: 進捗分析（期間内の進捗量） ===\n')

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
    console.log('')
}

async function main() {
    await example1_basicDiff()
    await example2_taskDiffs()
    await example3_projectDiffs()
    await example4_assigneeDiffs()
    await example5_progressAnalysis()
}

main().catch(console.error)
