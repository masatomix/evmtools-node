import { tidy, filter, summarize, groupBy } from '@tidyjs/tidy'
import { average, dateStr, generateBaseDates, sum } from '../common'
import { TaskNode } from './TaskNode'
import { TaskService } from './TaskService'
import { TaskRow } from './TaskRow'

export class Project {
    private _taskService = new TaskService()

    // PV/EV/SPIとか出してあげたい(baseDateの)
    constructor(
        private _taskNodes: TaskNode[],
        private _baseDate: Date,
        private _startDate?: Date,
        private _endDate?: Date,
        private _name?: string
    ) {}

    get baseDate() {
        return this._baseDate
    }
    get taskNodes() {
        return this._taskNodes
    }

    get startDate() {
        return this._startDate
    }
    get endDate() {
        return this._endDate
    }
    get name() {
        return this._name
    }

    get length() {
        return this.toTaskRows().length
    }

    toTaskRows(): TaskRow[] {
        return this._taskService.convertToTaskRows(this._taskNodes)
    }

    printAndGetRawData = (printRowNum?: number) => {
        console.log(`プロジェクト名: ${this._name}`)
        console.log(`開始日: ${dateStr(this._startDate)}`)
        console.log(`終了日: ${dateStr(this._endDate)}`)
        console.log(`基準日: ${dateStr(this._baseDate)}`)
        // console.table(this._taskNodes)

        const taskRows = this.toTaskRows()
        const rows = taskRows.map((taskRow) => {
            const {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                calculatePV,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                calculatePVs,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                plotMap,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                checkStartEndDateAndPlotMap,
                startDate,
                endDate,
                actualStartDate,
                actualEndDate,
                expectedProgressDate,
                ...rest // ココのデータだけが出力される
            } = taskRow
            return {
                ...rest,
                予定開始日: dateStr(startDate),
                予定終了日: dateStr(endDate),
                実績開始日: dateStr(actualStartDate),
                実績終了日: dateStr(actualEndDate),
                進捗応当日: dateStr(expectedProgressDate),
            }
        })

        // ユーザ入力値か、未指定なら全部。入力値が大きいときも全部
        // const num = printRowNum && printRowNum <= rows.length ? printRowNum : rows.length
        const taskCount = rows.length
        console.log(`タスク数:${taskCount}件`)
        const numToShow = Math.min(printRowNum ?? taskCount, taskCount)
        console.log(`先頭${numToShow}行データ:`)
        console.table(rows.slice(0, numToShow))
        return rows
    }

    /**
     * Project単位の統計情報を返す
     * @param project
     * @returns
     */
    get statisticsByProject(): ProjectStatistics[] {
        const name = this._name
        const baseDate = this._baseDate
        const startDate = this._startDate
        const endDate = this._endDate
        const rows = this.toTaskRows()
        const result = tidy(
            rows,
            filter((row) => row.isLeaf!), //フォルダの情報は不要
            summarize({
                プロジェクト名: () => name,
                開始予定日: () => dateStr(startDate),
                終了予定日: () => dateStr(endDate),
                全体タスク数: (group) => group.length,
                ['全体工数の和(Excel)']: sumWorkload,
                ['全体工数の和(計算)']: (group) => sumCalculatePVs(group, endDate!),
                全体工数平均: averageWorkload,
                基準日: () => dateStr(baseDate),
                ['基準日終了時PV累積(Excel)']: sumPVs,
                ['基準日終了時PV累積(計算)']: (group) => sumCalculatePVs(group, baseDate),
            })
        )
        // console.table(result)
        return result
    }

    get statisticsByName(): AssigneeStatistics[] {
        const baseDate = this._baseDate
        const endDate = this._endDate
        const rows = this.toTaskRows()

        const result = tidy(
            rows,
            filter((row) => row.isLeaf!), //フォルダの情報は不要
            groupBy('assignee', [
                summarize({
                    全体タスク数: (group) => group.length,
                    ['全体工数の和(Excel)']: sumWorkload,
                    ['全体工数の和(計算)']: (group) => sumCalculatePVs(group, endDate!),
                    全体工数平均: averageWorkload,
                    基準日: () => dateStr(baseDate),
                    ['基準日終了時PV累積(Excel)']: sumPVs,
                    ['基準日終了時PV累積(計算)']: (group) => sumCalculatePVs(group, baseDate),
                }),
            ])
        )
        // console.table(result)
        return result
    }

    get pvByProject() {
        // const baseDate = project.baseDate
        const from = this._startDate
        const to = this._endDate
        const projectName = this._name

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)
        const rows = this.toTaskRows()

        const wideMap = new Map<string, Record<string, unknown>>()
        for (const baseDate of baseDates) {
            const label = dateStr(baseDate)

            const result = tidy(
                rows,
                filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
                // filter((row: TaskRow) => row.assignee !== undefined),
                summarize({
                    [`${label}`]: (group) => sumCalculatePV(group, baseDate),
                    // 基準日ごとに、担当者でグルーピングされたPVデータを足している
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

    get pvsByProject() {
        // const baseDate = project.baseDate
        const from = this._startDate
        const to = this._endDate
        const projectName = this._name

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)
        const rows = this.toTaskRows()

        const wideMap = new Map<string, Record<string, unknown>>()

        for (const baseDate of baseDates) {
            const label = dateStr(baseDate)

            const result = tidy(
                rows,
                filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
                // filter((row: TaskRow) => row.assignee !== undefined),
                summarize({
                    [`${label}`]: (group) => sumCalculatePVs(group, baseDate),
                    // 基準日ごとに、担当者でグルーピングされたPVデータを足している
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
    get pvByName() {
        // const baseDate = project.baseDate
        const from = this._startDate
        const to = this._endDate
        // const projectName = project.name

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)
        const rows = this.toTaskRows()

        const wideMap = new Map<string, Record<string, unknown>>()

        for (const baseDate of baseDates) {
            const label = dateStr(baseDate)

            const result = tidy(
                rows,
                filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
                // filter((row: TaskRow) => row.assignee !== undefined),
                groupBy('assignee', [
                    summarize({
                        [`${label}`]: (group) => sumCalculatePV(group, baseDate), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
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
    get pvsByName() {
        // const baseDate = project.baseDate
        const from = this._startDate
        const to = this._endDate
        // const projectName = project.name

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)
        const rows = this.toTaskRows()

        const wideMap = new Map<string, Record<string, unknown>>()

        for (const baseDate of baseDates) {
            const label = dateStr(baseDate)

            const result = tidy(
                rows,
                filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
                // filter((row: TaskRow) => row.assignee !== undefined),
                groupBy('assignee', [
                    summarize({
                        [`${label}`]: (group) => sumCalculatePVs(group, baseDate),
                        // 基準日ごとに、担当者でグルーピングされたPVデータを足している
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
}

const sumWorkload = (group: TaskRow[]) => sum(group.map((d) => d.workload ?? 0))
const averageWorkload = (group: TaskRow[]) => average(group.map((d) => d.workload ?? 0))
const sumCalculatePV = (group: TaskRow[], baseDate: Date) =>
    sum(
        group.map((d) => d.calculatePV(baseDate) ?? 0),
        3
    )
const sumCalculatePVs = (group: TaskRow[], baseDate: Date) =>
    sum(
        group.map((d) => d.calculatePVs(baseDate) ?? 0),
        3
    )
const sumPVs = (group: TaskRow[]) =>
    sum(
        group.map((d) => d.pv ?? 0),
        3
    ) // 基準日ごとに、担当者でグルーピングされたPVデータを足している

export type Statistics = {
    全体タスク数?: number
    ['全体工数の和(Excel)']?: number
    ['全体工数の和(計算)']?: number
    ['全体工数平均']?: number
    基準日: string
    ['基準日終了時PV累積(Excel)']?: number
    ['基準日終了時PV累積(計算)']?: number
}

export type ProjectStatistics = {
    プロジェクト名?: string
    開始予定日: string // 日付を文字列化している
    終了予定日: string
} & Statistics

export type AssigneeStatistics = {
    assignee?: string
} & Statistics

// /**
//  * タスク情報
//  */
// private nu.mine.kino.entity.TaskInformation[] taskInformations;

// /**
//  * プロジェクト開始日
//  */
// private java.util.Date projectStartDate;

// /**
//  * プロジェクト終了日
//  */
// private java.util.Date projectEndDate;

// /**
//  * 基準日
//  */
// private java.util.Date baseDate;

// /**
//  * 休日カレンダー
//  */
// private nu.mine.kino.entity.Holiday[] holidays;
