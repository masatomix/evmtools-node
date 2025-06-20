import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { ProjectCreator } from '../domain/ProjectCreator'
import { getLogger } from '../logger'
import { createStyles } from '../common/styles'
import { dateStr, generateBaseDates, sum } from '../common'
import { TaskService } from '../domain/TaskService'
import { tidy, filter, groupBy, summarize } from '@tidyjs/tidy'
import { TaskRow } from '../domain'

export class ShowProjectUsecase {
    private logger = getLogger('ShowProjectUsecase')

    constructor(private _creator: ProjectCreator) {}

    async execute() {
        const project = await this._creator.createProject()
        const projectData = project.printAndGetData()

        const baseDate = project.baseDate
        const from = project.startDate
        const to = project.endDate
        const projectName = project.name

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)

        const rows = new TaskService().convertToTaskRows(project.taskNodes)
        const summary = summaryPvByName(rows, baseDates)
        const path = `${projectName}-summary.xlsx`

        await writeProjectInfo({ baseDate, path, projectData, summary })

        // writeError エラー情報
        // writeStatistics EVM指標
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
            filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
            // filter((row: TaskRow) => row.assignee !== undefined),
            groupBy('assignee', [
                summarize({
                    [`${label}`]: (group) =>
                        sum(
                            group.map((d) => d.calculatePV(baseDate) ?? 0),
                            3
                        ), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
                }),
            ])
        )
        // console.table(result)

        // nameごとに、baseDate(label)プロパティを追加していく(pvデータを横並びにしたい)
        for (const row of result) {
            const name = (row.assignee ?? '(未割当)') as string
            if (!wideMap.has(name)) {
                wideMap.set(name, { assignee: name })
            }
            wideMap.get(name)![`${label}`] = row[`${label}`]
        }
    }

    const wideResult = Array.from(wideMap.values())
    return wideResult
}

const writeProjectInfo: (data: {
    baseDate: Date
    projectData?: Record<string, any>[]
    summary?: Record<string, any>[]
    path: string
}) => Promise<void> = async ({ baseDate, projectData, summary, path }) => {
    const workbook = await createWorkbook()

    const dateStrHyphen = dateStr(baseDate).replace(/\//g, '-')
    if (projectData) {
        json2workbook({
            instances: projectData,
            workbook,
            sheetName: `素データ_${dateStrHyphen}`,
            applyStyles: createStyles(),
        })
    }
    if (summary) {
        json2workbook({
            instances: summary,
            workbook,
            sheetName: '要員ごと',
            applyStyles: createStyles(),
        })
    }
    workbook.deleteSheet('Sheet1')
    await toFileAsync(workbook, path)
}
