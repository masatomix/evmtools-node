import { tidy, filter, summarize, groupBy } from '@tidyjs/tidy'
import { average, dateStr, generateBaseDates, sum } from '../common'
import { TaskNode } from './TaskNode'
import { TaskService } from './TaskService'
import { TaskRow } from './TaskRow'

export class Project {
    private _taskService = new TaskService()

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
        const startDate = this._startDate // Date|undefinedだけど、実際はほぼ確実に、存在する(タスクが0コとか)
        const endDate = this._endDate // Date|undefinedだけど、実際はほぼ確実に、存在する(タスクが0コとか)
        const rows = this.toTaskRows()
        const result: ProjectStatistics[] = tidy(
            rows,
            filter((row) => row.isLeaf!), //フォルダの情報は不要
            summarize({
                projectName: () => name,
                startDate: () => dateStr(startDate),
                endDate: () => dateStr(endDate),
                totalTasksCount: (group) => group.length,
                totalWorkloadExcel: sumWorkload, // Excel工数(task#workload) の 足し算
                totalWorkloadCalculated: (group) => sumCalculatePVs(group, endDate!), // endDate時の、計算、累積pv(したのヤツ) の、足し算
                averageWorkload: averageWorkload,
                baseDate: () => dateStr(baseDate),
                totalPvExcel: sumPVs, // Excel累積pv(TaskRow#pv) の足し算
                totalPvCalculated: (group) => sumCalculatePVs(group, baseDate), // 計算、累積pv(TaskRow#calculatePVs(baseDate)) の、足し算
                totalEv: sumEVs, // Excel累積Ev(TaskRow#ev) の足し算
                spi: (group) => calculateSPI(group, baseDate),
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
                    totalTasksCount: (group) => group.length,
                    totalWorkloadExcel: sumWorkload,
                    totalWorkloadCalculated: (group) => sumCalculatePVs(group, endDate!),
                    averageWorkload: averageWorkload,
                    baseDate: () => dateStr(baseDate),
                    totalPvExcel: sumPVs,
                    totalPvCalculated: (group) => sumCalculatePVs(group, baseDate),
                    totalEv: sumEVs,
                    spi: (group) => calculateSPI(group, baseDate),
                }),
            ])
        )
        // console.table(result)
        return result
    }

    /**
     * LongData形式のPV情報を返す
     * @param calcPVS 累積が欲しいときはtrue、デフォルトはfalse
     * @returns  LongData[]
     */
    private _internalPvByProjectLong(calcPVS: boolean = false) {
        // const baseDate = project.baseDate
        const from = this._startDate
        const to = this._endDate
        // const projectName = this._name

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)
        const rows = this.toTaskRows()

        const longFormat: LongData[] = []

        for (const baseDate of baseDates) {
            const label = dateStr(baseDate)

            const result = tidy(
                rows,
                filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
                // filter((row: TaskRow) => row.assignee !== undefined),
                summarize({
                    [`${label}`]: (group) =>
                        calcPVS
                            ? sumCalculatePVs(group, baseDate)
                            : sumCalculatePV(group, baseDate),
                    // 基準日ごとに、担当者でグルーピングされたPVデータを足している
                })
            )
            // console.table(result)

            for (const row of result) {
                const name = (row.assignee ?? '(未割当)') as string
                longFormat.push({
                    assignee: name,
                    baseDate: label,
                    value: row[label],
                })
            }
        }
        return longFormat
    }

    /**
     * Projectごともしくはヒトごとのデータについて、ひと単位の横並びデータに並び替える
     * Excelに表示するなどはこちらが良い
     * @param longDatas
     * @returns
     */
    private _toWideFormat(longDatas: LongData[]): Record<string, unknown>[] {
        const wideMap = new Map<string, Record<string, unknown>>()
        for (const { assignee, baseDate, value } of longDatas) {
            // const mapKey = `${assignee}::${fromClass}->${toClass}`
            // assigneeごとに、baseDateプロパティを追加していく(pvデータを横並びにしたい)
            const mapKey = assignee
            if (!wideMap.has(mapKey)) {
                wideMap.set(mapKey, { assignee })
            }
            wideMap.get(mapKey)![baseDate] = value
        }
        return Array.from(wideMap.values())
    }

    private _internalPvByProject(calcPVS: boolean = false) {
        const longDatas = this._internalPvByProjectLong(calcPVS)
        return this._toWideFormat(longDatas)
    }

    get pvByProjectLong() {
        return this._internalPvByProjectLong()
    }
    get pvsByProjectLong() {
        return this._internalPvByProjectLong(true)
    }

    get pvByProject() {
        return this._internalPvByProject()
    }

    get pvsByProject() {
        return this._internalPvByProject(true)
    }

    private _internalPvByNameLong(calcPVS: boolean = false) {
        const from = this._startDate
        const to = this._endDate

        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        const baseDates = generateBaseDates(from, to)
        const rows = this.toTaskRows()

        const longFormat: LongData[] = []
        for (const baseDate of baseDates) {
            const label = dateStr(baseDate)

            const result = tidy(
                rows,
                filter((row: TaskRow) => row.isLeaf!), //フォルダの情報は不要
                // filter((row: TaskRow) => row.assignee !== undefined),
                groupBy('assignee', [
                    summarize({
                        [`${label}`]: (group) =>
                            calcPVS
                                ? sumCalculatePVs(group, baseDate)
                                : sumCalculatePV(group, baseDate), // 基準日ごとに、担当者でグルーピングされたPVデータを足している
                    }),
                ])
            )
            // console.table(result)

            for (const row of result) {
                const name = (row.assignee ?? '(未割当)') as string
                longFormat.push({
                    assignee: name,
                    baseDate: label,
                    value: row[label],
                })
            }
        }
        return longFormat
    }

    private _internalPvByName(calcPVS: boolean = false) {
        const longDatas = this._internalPvByNameLong(calcPVS)
        return this._toWideFormat(longDatas)
    }

    get pvByNameLong() {
        return this._internalPvByNameLong()
    }

    get pvsByNameLong() {
        return this._internalPvByNameLong(true)
    }

    get pvByName() {
        return this._internalPvByName()
    }

    get pvsByName() {
        return this._internalPvByName(true)
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

const sumEVs = (group: TaskRow[]) =>
    sum(
        group.map((d) => d.ev ?? 0),
        3
    )

export const isValidNumber = (value: unknown): value is number =>
    typeof value === 'number' && !Number.isNaN(value)

// const calcSPI = (group: TaskRow[]) => {
//     const ev = sumEVs(group)
//     const pv = sumPVs(group)
//     return calcRate(ev, pv)
// }

const calculateSPI = (group: TaskRow[], baseDate: Date) => {
    const ev = sumEVs(group)
    const pv = sumCalculatePVs(group, baseDate)
    return calcRate(ev, pv)
}

export const calcRate = (a: number | undefined, b: number | undefined) => {
    if (isValidNumber(b) && isValidNumber(a) && b !== 0) {
        return a / b
    }
    return undefined
}

// export type Statistics = {
//     全体タスク数?: number
//     ['全体工数の和(Excel)']?: number
//     ['全体工数の和(計算)']?: number
//     ['全体工数平均']?: number
//     基準日: string
//     ['基準日終了時PV累積(Excel)']?: number
//     ['基準日終了時PV累積(計算)']?: number
//     ['基準日終了時EV累積']?: number
//     ['基準日終了時SPI']?: number
// }

// export type ProjectStatistics = {
//     プロジェクト名?: string
//     開始予定日: string // 日付を文字列化している
//     終了予定日: string
// } & Statistics

export type Statistics = {
    totalTasksCount?: number
    totalWorkloadExcel?: number
    totalWorkloadCalculated?: number
    averageWorkload?: number
    baseDate: string
    totalPvExcel?: number
    totalPvCalculated?: number
    totalEv?: number
    spi?: number
}

export type ProjectStatistics = {
    projectName?: string
    startDate: string
    endDate: string
} & Statistics

export type AssigneeStatistics = {
    assignee?: string
} & Statistics

export type LongData = {
    assignee: string
    baseDate: string
    value?: number
}

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
