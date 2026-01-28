#!/usr/bin/env ts-node
/**
 * 03-task-operations.md のコード検証スクリプト
 */

import { ExcelProjectCreator } from '../../../src/infrastructure'
import { TaskRow } from '../../../src/domain'

async function example1_behindScheduleTasks() {
    console.log('=== Example 1: SPI で遅れているタスクを取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

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
    console.log('')
}

async function example2_overdueTasks() {
    console.log('=== Example 2: 期限切れタスクを取得する（getDelayedTasks） ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    // 期限切れタスクを取得（予定終了日 < 基準日 かつ 未完了）
    const overdueTasks = project.getDelayedTasks(0)

    console.log(`期限切れタスク数: ${overdueTasks.length}件`)
    console.log('')

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
    console.log('')
}

async function example3_overdueTasksWithMinDays() {
    console.log('=== Example 3: 指定日数以上の期限切れタスクを取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    // 3日以上遅延しているタスク
    const delayedTasks = project.getDelayedTasks(3)

    console.log(`3日以上遅延タスク数: ${delayedTasks.length}件`)
    console.log('')

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
    console.log('')
}

async function example4_filterByAssignee() {
    console.log('=== Example 4: 担当者でタスクを絞り込む ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const tasks = project.toTaskRows()

    // 要員A のタスクを抽出
    const assigneeTasks = tasks.filter((t: TaskRow) => t.assignee === '要員A' && t.isLeaf)

    console.log(`要員A のタスク数: ${assigneeTasks.length}件`)
    console.log('')
    console.log('| id | name | progressRate | spi |')
    console.log('|----|------|--------------|-----|')

    for (const task of assigneeTasks) {
        const progress = task.progressRate !== undefined
            ? `${(task.progressRate * 100).toFixed(0)}%`
            : '-'
        const spi = task.spi?.toFixed(2) ?? '-'
        console.log(`| ${task.id} | ${task.name} | ${progress} | ${spi} |`)
    }
    console.log('')
}

async function example5_filterByProgress() {
    console.log('=== Example 5: 進捗率でタスクを絞り込む ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const tasks = project.toTaskRows()

    // 進捗率が50%未満のタスク（リーフのみ）
    const inProgressTasks = tasks.filter((t: TaskRow) =>
        t.isLeaf &&
        t.progressRate !== undefined &&
        t.progressRate < 0.5 &&
        t.progressRate > 0
    )

    console.log(`進捗率 0-50% のタスク数: ${inProgressTasks.length}件`)
    console.log('')
    console.log('| id | fullName | progressRate |')
    console.log('|----|----------|--------------|')

    for (const task of inProgressTasks) {
        const fullName = project.getFullTaskName(task)
        const progress = `${(task.progressRate! * 100).toFixed(0)}%`
        console.log(`| ${task.id} | ${fullName} | ${progress} |`)
    }
    console.log('')
}

async function example6_taskWithOverdue() {
    console.log('=== Example 6: 期限切れタスクを確認する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()
    const baseDate = project.baseDate

    console.log(`基準日: ${baseDate.toLocaleDateString('ja-JP')}`)
    console.log('')

    // isOverdueAt で期限切れを判定
    const overdueTasks = tasks.filter((t: TaskRow) => t.isLeaf && t.isOverdueAt(baseDate))

    console.log(`期限切れタスク数: ${overdueTasks.length}件`)
    console.log('')

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
    console.log('')
}

async function main() {
    await example1_behindScheduleTasks()
    await example2_overdueTasks()
    await example3_overdueTasksWithMinDays()
    await example4_filterByAssignee()
    await example5_filterByProgress()
    await example6_taskWithOverdue()
}

main().catch(console.error)
