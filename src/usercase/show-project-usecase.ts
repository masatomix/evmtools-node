import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { ProjectCreator } from '../domain/ProjectCreator'
import { getLogger } from '../logger'
import { createStyles } from '../common/styles'
import { average, dateStr, generateBaseDates, sum } from '../common'
import { TaskService } from '../domain/TaskService'
import { tidy, filter, groupBy, summarize } from '@tidyjs/tidy'
import { TaskRow } from '../domain'
import { Project } from '../domain/Project'

export class ShowProjectUsecase {
    private logger = getLogger('ShowProjectUsecase')

    constructor(private _creator: ProjectCreator) {}

    async execute() {
        const project = await this._creator.createProject()
        const projectData = project.printAndGetData(10)

        const baseDate = project.baseDate
        const projectName = project.name

        // const from = project.startDate
        // const to = project.endDate
        // if (!(from && to)) {
        //     throw new Error('fromかtoが取得できませんでした')
        // }

        const statisticsByProject = getStatisticsByProject(project)
        const statisticsByName = getStatisticsByName(project)

        const pvByProject = getPvByProject(project)
        const pvsByProject = getPvsByProject(project)
        const pvByName = getPvByName(project)
        const pvsByName = getPvsByName(project)
        const path = `${projectName}-summary.xlsx`

        await writeProjectInfo({
            statisticsByProject,
            statisticsByName,
            pvByProject,
            pvsByProject,
            pvByName,
            pvsByName,
            projectData,
            path,
            baseDate,
        })

        // writeError エラー情報
        // writeStatistics EVM指標
    }
}

const getStatisticsByProject = (project: Project) => {
    const name = project.name
    const baseDate = project.baseDate
    const startDate = project.startDate
    const endDate = project.endDate
    const rows = new TaskService().convertToTaskRows(project.taskNodes)

    const result = tidy(
        rows,
        filter((row) => row.isLeaf!), //フォルダの情報は不要
        summarize({
            プロジェクト名: () => name,
            開始予定日: () => dateStr(startDate),
            終了予定日: () => dateStr(endDate),
            基準日: () => dateStr(baseDate),
            全体タスク数: (group) => group.length,
            ['全体工数の和(Excel)']: (group) => sum(group.map((d) => d.workload ?? 0)),
            ['全体工数の和(計算)']: (group) =>
                sum(
                    group.map((d) => d.calculatePVs(endDate!) ?? 0),
                    3
                ), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
            全体工数平均: (group) => average(group.map((d) => d.workload ?? 0)),
            [`基準日終了時PV累積(Excel)`]: (group) =>
                sum(
                    group.map((d) => d.pv ?? 0),
                    3
                ), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
            [`基準日終了時PV累積(計算)`]: (group) =>
                sum(
                    group.map((d) => d.calculatePVs(baseDate)),
                    3
                ),
        })
    )
    console.table(result)
    return result
}

const getStatisticsByName = (project: Project) => {
    const baseDate = project.baseDate
    const endDate = project.endDate
    const rows = new TaskService().convertToTaskRows(project.taskNodes)

    const result = tidy(
        rows,
        filter((row) => row.isLeaf!), //フォルダの情報は不要
        groupBy('assignee', [
            summarize({
                全体タスク数: (group) => group.length,
                ['全体工数の和(Excel)']: (group) => sum(group.map((d) => d.workload ?? 0)),
                ['全体工数の和(計算)']: (group) =>
                    sum(
                        group.map((d) => d.calculatePVs(endDate!) ?? 0),
                        3
                    ), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
                全体工数平均: (group) => average(group.map((d) => d.workload ?? 0)),
                [`${dateStr(baseDate)}終了時PV累積(Excel)`]: (group) =>
                    sum(
                        group.map((d) => d.pv ?? 0),
                        3
                    ), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
                [`${dateStr(baseDate)}終了時PV累積(計算)`]: (group) =>
                    sum(
                        group.map((d) => d.calculatePVs(baseDate)),
                        3
                    ),
            }),
        ])
    )
    console.table(result)
    return result
}

const getPvByProject = (project: Project) => {
    // const baseDate = project.baseDate
    const from = project.startDate
    const to = project.endDate
    const projectName = project.name

    if (!(from && to)) {
        throw new Error('fromかtoが取得できませんでした')
    }

    const baseDates = generateBaseDates(from, to)
    const rows = new TaskService().convertToTaskRows(project.taskNodes)

    const wideMap = new Map<string, Record<string, any>>()
    for (const baseDate of baseDates) {
        const label = dateStr(baseDate)

        const result = tidy(
            rows,
            filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
            // filter((row: TaskRow) => row.assignee !== undefined),
            summarize({
                [`${label}`]: (group) =>
                    sum(
                        group.map((d) => d.calculatePV(baseDate) ?? 0),
                        3
                    ), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
            })
        )
        // console.table(result)

        // nameごとに、baseDate(label)プロパティを追加していく(pvデータを横並びにしたい)
        for (const row of result) {
            const name = (row.assignee ?? '(未割当)') as string
            if (!wideMap.has(name)) {
                wideMap.set(name, { プロジェクト名: projectName })
            }
            wideMap.get(name)![`${label}`] = row[`${label}`]
        }
    }

    const wideResult = Array.from(wideMap.values())
    return wideResult
}

const getPvsByProject = (project: Project) => {
    // const baseDate = project.baseDate
    const from = project.startDate
    const to = project.endDate
    const projectName = project.name

    if (!(from && to)) {
        throw new Error('fromかtoが取得できませんでした')
    }

    const baseDates = generateBaseDates(from, to)
    const rows = new TaskService().convertToTaskRows(project.taskNodes)

    const wideMap = new Map<string, Record<string, any>>()

    for (const baseDate of baseDates) {
        const label = dateStr(baseDate)

        const result = tidy(
            rows,
            filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
            // filter((row: TaskRow) => row.assignee !== undefined),
            summarize({
                [`${label}`]: (group) =>
                    sum(
                        group.map((d) => d.calculatePVs(baseDate) ?? 0),
                        3
                    ), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
            })
        )
        // console.table(result)

        // nameごとに、baseDate(label)プロパティを追加していく(pvデータを横並びにしたい)
        for (const row of result) {
            const name = (row.assignee ?? '(未割当)') as string
            if (!wideMap.has(name)) {
                wideMap.set(name, { プロジェクト名: projectName })
            }
            wideMap.get(name)![`${label}`] = row[`${label}`]
        }
    }

    const wideResult = Array.from(wideMap.values())
    return wideResult
}

/**
 *
 * @param rows ヒトで集計サンプル。
 * @param baseDatesff
 * @returns
 */
const getPvByName = (project: Project) => {
    // const baseDate = project.baseDate
    const from = project.startDate
    const to = project.endDate
    // const projectName = project.name

    if (!(from && to)) {
        throw new Error('fromかtoが取得できませんでした')
    }

    const baseDates = generateBaseDates(from, to)
    const rows = new TaskService().convertToTaskRows(project.taskNodes)

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

/**
 *
 * @param rows ヒトで集計サンプル。
 * @param baseDatesff
 * @returns
 */
const getPvsByName = (project: Project) => {
    // const baseDate = project.baseDate
    const from = project.startDate
    const to = project.endDate
    // const projectName = project.name

    if (!(from && to)) {
        throw new Error('fromかtoが取得できませんでした')
    }

    const baseDates = generateBaseDates(from, to)
    const rows = new TaskService().convertToTaskRows(project.taskNodes)

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
                            group.map((d) => d.calculatePVs(baseDate) ?? 0),
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
    statisticsByProject?: Record<string, any>[]
    statisticsByName?: Record<string, any>[]
    pvByProject?: Record<string, any>[]
    pvsByProject?: Record<string, any>[]
    pvByName?: Record<string, any>[]
    pvsByName?: Record<string, any>[]
    projectData?: Record<string, any>[]
    baseDate: Date
    path: string
}) => Promise<void> = async ({
    statisticsByProject,
    statisticsByName,
    pvByProject,
    pvsByProject,
    pvByName,
    pvsByName,
    projectData,
    baseDate,
    path,
}) => {
    const workbook = await createWorkbook()

    const dateStrHyphen = dateStr(baseDate).replace(/\//g, '-')

    if (statisticsByProject) {
        json2workbook({
            instances: statisticsByProject,
            workbook,
            sheetName: `プロジェクト情報`,
            applyStyles: createStyles(),
        })
    }
    if (statisticsByName) {
        json2workbook({
            instances: statisticsByName,
            workbook,
            sheetName: '要員ごと統計',
            applyStyles: createStyles(),
        })
    }

    if (pvByProject) {
        json2workbook({
            instances: pvByProject,
            workbook,
            sheetName: `プロジェクト日ごとPV`,
            applyStyles: createStyles(),
        })
    }
    if (pvsByProject) {
        json2workbook({
            instances: pvsByProject,
            workbook,
            sheetName: `プロジェクト日ごと累積PV`,
            applyStyles: createStyles(),
        })
    }

    if (pvByName) {
        json2workbook({
            instances: pvByName,
            workbook,
            sheetName: `要員ごと・日ごとPV`,
            applyStyles: createStyles(),
        })
    }
    if (pvsByName) {
        json2workbook({
            instances: pvsByName,
            workbook,
            sheetName: `要員ごと・日ごと累積PV`,
            applyStyles: createStyles(),
        })
    }

    if (projectData) {
        json2workbook({
            instances: projectData,
            workbook,
            sheetName: `素データ_${dateStrHyphen}`,
            applyStyles: createStyles(),
        })
    }
    workbook.deleteSheet('Sheet1')
    await toFileAsync(workbook, path)
}
