#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getLogger } from '../logger'
import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { TaskService } from '../domain/TaskService'
import { TaskRowCreator } from '../domain/TaskRowCreator'
import { ExcelTaskRowCreator } from '../infrastructure/ExcelTaskRowCreator'
import { generateBaseDates, printTaskNodes, style5 } from '../common'
import { TaskNode, TaskRow } from '../domain'
import { createStyles } from '../common/styles'

const logger = getLogger('main')

const main = async () => {
    const { excelPath, output } = createArgs()

    const reader: TaskRowCreator = new ExcelTaskRowCreator(excelPath)
    const rows: TaskRow[] = await reader.createRowData()

    const baseDates = generateBaseDates(
        new Date('2025-06-13T00:00:00+09:00'),
        new Date('2025-06-28T00:00:00+09:00')
    )

    // const filters = rows.filter((row) => row.id >= 23) //
    // printTaskRows(filters, baseDates)

    const taskService = new TaskService()
    const taskNodes = taskService.buildTaskTree(rows)

    const tasks = taskNodes.filter((row) => row.id >= 23) //
    printTaskNodes(tasks, baseDates)
    printTaskNodes1(tasks)

    const flatternRows = taskService.convertToTaskRows(taskNodes)

    const workbook = await createWorkbook()

    const converters = {
        // なんか、日付はコレやらないとキレイに出力できない
        startDate: (value: unknown) => value,
        endDate: (value: unknown) => value,
        actualStartDate: (value: unknown) => value,
        actualEndDate: (value: unknown) => value,
        expectedProgressDate: (value: unknown) => value,
    }

    json2workbook({
        instances: rows,
        workbook,
        sheetName: 'rows',
        applyStyles: createStyles(style5),
        converters,
    })
    json2workbook({
        instances: flatternRows,
        workbook,
        sheetName: 'flatternRows',
        applyStyles: createStyles(style5),
        converters,
    })
    workbook.deleteSheet('Sheet1')
    await toFileAsync(workbook, 'result.xlsx')

    // await sub()
    // console.table(flattern)
}

// const sub = async () => {
//     let robots: unknown[] = await csv2json('robotSample.csv')
//     // robots = robots.map((robot) => ({ ...robot, now: new Date() })) // 日付列を追加 unknown型には使えないので注意
//     robots = robots.map((robot) => Object.assign({}, robot, { now: new Date() })) // 日付列を追加
//     console.table(robots)

//     // なにも考えずにダンプ
//     // json2excel(robots, 'output/robots.xlsx').catch((error) => console.log(error))

//     // プロパティごとに、変換メソッドをかませたケース
//     // nowとIdというプロパティには、変換methodを指定
//     const converters: Converters = {
//         now: (value: unknown) => value,
//         Id: (value: string) => '0' + value,
//     }
//     json2excel(robots, 'output/robots1.xlsx', '', 'Sheet1', converters).catch((error) =>
//         console.log(error)
//     )

//     // プロパティごとに、変換メソッドをかませたケース.
//     // nowとIdというプロパティには、変換methodを指定
//     // さらにその列(M列) に、日付フォーマットでExcel出力する
//     const excelFormatter = (
//         instances: any[],
//         workbook: XlsxPopulate.Workbook,
//         sheetName: string
//     ) => {
//         const rowCount = instances.length
//         const sheet = workbook.sheet(sheetName)
//         sheet.range(`M2:M${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd hh:mm') // 書式: 日付+時刻
//         // よくある整形パタン。
//         // sheet.range(`C2:C${rowCount + 1}`).style('numberFormat', '@') // 書式: 文字(コレをやらないと、見かけ上文字だが、F2で抜けると数字になっちゃう)
//         // sheet.range(`E2:F${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd') // 書式: 日付
//         // sheet.range(`H2:H${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd hh:mm') // 書式: 日付+時刻
//     }
//     json2excel(robots, 'output/robots2.xlsx', '', 'Sheet1', converters, excelFormatter).catch(
//         (error) => console.log(error)
//     ) // プロパティ指定で、変換をかける
// }

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .option('excelPath', {
            type: 'string',
            description: 'Excel file Path',
            default: './classdata.xlsx',
        })
        .option('output', {
            type: 'string',
            description: 'Output directory',
            default: './output',
        })
        .help()
        .parseSync() // 型付きで取得
    return argv
}

main()

function printTaskNodes1(taskNodes: TaskNode[]) {
    for (const rootTask of taskNodes) {
        // root単位でfor文回せば良い
        for (const row of rootTask) {
            printTask1(row)
        }
    }
}

function printTask1(row: TaskNode) {
    console.log(row.id, row.name, row.assignee)
}
