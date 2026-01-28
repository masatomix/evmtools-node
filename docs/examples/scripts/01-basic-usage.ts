#!/usr/bin/env ts-node
/**
 * 01-basic-usage.md のコード検証スクリプト
 */

import { ExcelProjectCreator } from '../../../src/infrastructure'
import { TaskNode, TaskRow } from '../../../src/domain'

async function example1_readExcel() {
    console.log('=== Example 1: Excel ファイルからプロジェクトを読み込む ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log('プロジェクト名:', project.name)
    console.log('基準日:', project.baseDate.toLocaleDateString('ja-JP'))
    console.log('開始日:', project.startDate?.toLocaleDateString('ja-JP'))
    console.log('終了日:', project.endDate?.toLocaleDateString('ja-JP'))
    console.log('')
}

async function example2_taskList() {
    console.log('=== Example 2: タスク一覧を取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

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
    console.log('')
}

async function example3_taskTree() {
    console.log('=== Example 3: タスクツリーを走査する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const taskTree = project.taskNodes

    function printTree(nodes: TaskNode[], indent: string = '') {
        for (const node of nodes) {
            const leaf = node.isLeaf ? '📄' : '📁'
            console.log(`${indent}${leaf} ${node.name}`)
            if (node.children.length > 0) {
                printTree(node.children, indent + '  ')
            }
        }
    }

    printTree(taskTree)
    console.log('')
}

async function example4_fullName() {
    console.log('=== Example 4: タスクのフルパス名を取得する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()

    console.log('| id | fullName |')
    console.log('|----|----------|')

    for (const task of tasks.slice(0, 8)) {
        const fullName = project.getFullTaskName(task)
        console.log(`| ${task.id} | ${fullName} |`)
    }
    console.log('')
}

async function example5_evmIndicators() {
    console.log('=== Example 5: EVM 指標を確認する ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()

    console.log('| id | name | pv | ev | spi |')
    console.log('|----|------|-----|-----|-----|')

    for (const task of tasks.filter((t: TaskRow) => t.pv && t.pv > 0)) {
        const spi = task.spi?.toFixed(2) ?? '-'
        console.log(`| ${task.id} | ${task.name} | ${task.pv} | ${task.ev} | ${spi} |`)
    }
    console.log('')
}

async function main() {
    await example1_readExcel()
    await example2_taskList()
    await example3_taskTree()
    await example4_fullName()
    await example5_evmIndicators()
}

main().catch(console.error)
