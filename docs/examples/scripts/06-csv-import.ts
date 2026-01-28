#!/usr/bin/env ts-node
/**
 * 06-csv-import.md のコード検証スクリプト
 */

import { CsvProjectCreator } from '../../../src/infrastructure'
import { TaskRow } from '../../../src/domain'

async function example1_basicImport() {
    console.log('=== Example 1: CSVファイルからプロジェクトを読み込む ===\n')

    // CSVファイル名のフォーマット: {プロジェクト名}_{yyyyMMdd}.csv
    const creator = new CsvProjectCreator('./sample_20250725.csv')
    const project = await creator.createProject()

    console.log('| 項目 | 値 |')
    console.log('|------|-----|')
    console.log(`| プロジェクト名 | ${project.name} |`)
    console.log(`| 基準日 | ${project.baseDate.toLocaleDateString('ja-JP')} |`)
    console.log(`| 開始日 | ${project.startDate?.toLocaleDateString('ja-JP')} |`)
    console.log(`| 終了日 | ${project.endDate?.toLocaleDateString('ja-JP')} |`)
    console.log('')
}

async function example2_taskList() {
    console.log('=== Example 2: タスク一覧を取得する ===\n')

    const creator = new CsvProjectCreator('./sample_20250725.csv')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()

    console.log(`タスク数: ${tasks.length}件\n`)
    console.log('| id | name | assignee | workload | progressRate |')
    console.log('|----|------|----------|----------|--------------|')

    for (const task of tasks) {
        const progress = task.progressRate !== undefined
            ? `${(task.progressRate * 100).toFixed(0)}%`
            : '-'
        console.log(
            `| ${task.id} | ${task.name} | ${task.assignee ?? '-'} | ${task.workload ?? '-'} | ${progress} |`
        )
    }
    console.log('')
}

async function example3_statistics() {
    console.log('=== Example 3: プロジェクト統計を取得する ===\n')

    const creator = new CsvProjectCreator('./sample_20250725.csv')
    const project = await creator.createProject()

    const stats = project.getStatistics()

    console.log('| 指標 | 値 |')
    console.log('|------|-----|')
    console.log(`| BAC | ${stats.totalWorkloadExcel}人日 |`)
    console.log(`| PV | ${stats.totalPvCalculated}人日 |`)
    console.log(`| EV | ${stats.totalEv}人日 |`)
    console.log(`| SPI | ${stats.spi?.toFixed(3)} |`)
    console.log('')
}

async function example4_encodingOption() {
    console.log('=== Example 4: 文字エンコーディングを指定する ===\n')

    // UTF-8明示指定
    const creatorUtf8 = new CsvProjectCreator('./sample_20250725.csv', {
        encoding: 'utf-8'
    })
    const projectUtf8 = await creatorUtf8.createProject()

    console.log(`UTF-8読み込み: ${projectUtf8.name}`)

    // 自動判定（デフォルト）
    const creatorAuto = new CsvProjectCreator('./sample_20250725.csv', {
        encoding: 'auto'
    })
    const projectAuto = await creatorAuto.createProject()

    console.log(`自動判定: ${projectAuto.name}`)
    console.log('')
}

async function example5_filenameFormat() {
    console.log('=== Example 5: ファイル名の命名規則 ===\n')

    console.log('CSVファイル名は以下のフォーマットに従う必要があります:')
    console.log('')
    console.log('  {プロジェクト名}_{yyyyMMdd}.csv')
    console.log('')
    console.log('例:')
    console.log('  - MyProject_20250725.csv → プロジェクト名: "MyProject", 基準日: 2025/7/25')
    console.log('  - 開発プロジェクト_20251001.csv → プロジェクト名: "開発プロジェクト", 基準日: 2025/10/1')
    console.log('')

    // 実際に確認
    const creator = new CsvProjectCreator('./sample_20250725.csv')
    const project = await creator.createProject()

    console.log(`実際の読み込み結果:`)
    console.log(`  ファイル名: sample_20250725.csv`)
    console.log(`  プロジェクト名: ${project.name}`)
    console.log(`  基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)
    console.log('')
}

async function example6_csvFormat() {
    console.log('=== Example 6: CSVのカラム形式 ===\n')

    console.log('CSVファイルは以下のカラムが必要です:')
    console.log('')
    console.log('| カラム名 | 必須 | 説明 |')
    console.log('|----------|------|------|')
    console.log('| タスクID | ✅ | タスクの一意識別子（数値） |')
    console.log('| 名称 | ✅ | タスク名 |')
    console.log('| 担当 | - | 担当者名 |')
    console.log('| 予定工数 | - | 予定工数（人日） |')
    console.log('| 予定開始日 | - | yyyy/MM/dd形式 |')
    console.log('| 予定終了日 | - | yyyy/MM/dd形式 |')
    console.log('| 実績開始日 | - | yyyy/MM/dd形式 |')
    console.log('| 実績終了日 | - | yyyy/MM/dd形式 |')
    console.log('| 進捗率 | - | 0〜1または0%〜100% |')
    console.log('| 稼働予定日数 | - | 期間内の稼働日数 |')
    console.log('| PV | - | Planned Value |')
    console.log('| EV | - | Earned Value |')
    console.log('')
}

async function main() {
    await example1_basicImport()
    await example2_taskList()
    await example3_statistics()
    await example4_encodingOption()
    await example5_filenameFormat()
    await example6_csvFormat()
}

main().catch(console.error)
