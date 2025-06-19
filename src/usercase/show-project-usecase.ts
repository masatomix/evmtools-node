import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { ProjectCreator } from '../domain/ProjectCreator'
import { getLogger } from '../logger'
import { createStyles } from '../common/styles'
import { dateStr, generateBaseDates, round } from '../common'
import { TaskService } from '../domain/TaskService'
import { tidy, filter, groupBy, summarize } from '@tidyjs/tidy'
import { TaskRow } from '../domain'

export class ShowProjectUsecase {
    private logger = getLogger('ShowProjectUsecase')

    constructor(private _creator: ProjectCreator) {}

    async execute() {
        const project = await this._creator.createProject()
        const dispData = project.print()

        const from = project.startDate
        const to = project.endDate

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)

        const rows = new TaskService().convertToTaskRows(project.taskNodes)
        const results = summaryPvByName(rows, baseDates)
        // console.table(results)
        // await writeData(results)

        await writeData(results, 'project-summary.xlsx')
        await writeData(dispData, 'project.xlsx')
    }
}

/**
 *
 * @param rows ヒトで集計サンプル。
 * @param baseDates
 * @returns
 */
const summaryPvByName = (rows: TaskRow[], baseDates: Date[]) => {
    const wideMap = new Map<string, Record<string, any>>()

    for (const baseDate of baseDates) {
        const label = dateStr(baseDate)

        const result = tidy(
            rows,
            filter((row: TaskRow) => row.isLeaf!),
            filter((row: TaskRow) => row.assignee !== undefined),
            groupBy('assignee', [
                summarize({
                    [`pv_${label}`]: (group: TaskRow[]) =>
                        group.reduce((sum, d) => sum + (d.calculatePV(baseDate) ?? 0), 0),
                }),
            ])
        )

        for (const row of result) {
            const name = row.assignee as string
            if (!wideMap.has(name)) {
                wideMap.set(name, { assignee: name })
            }
            wideMap.get(name)![`pv_${label}`] = round(row[`pv_${label}`])
        }
    }

    const wideResult = Array.from(wideMap.values())
    return wideResult
}

async function writeData(rows: Record<string, any>[], path: string) {
    const workbook = await createWorkbook()

    json2workbook({
        instances: rows,
        workbook,
        sheetName: 'rows',
        applyStyles: createStyles(),
    })
    workbook.deleteSheet('Sheet1')
    await toFileAsync(workbook, path)
}
