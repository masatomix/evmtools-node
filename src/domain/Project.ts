import { tidy, filter, summarize, groupBy } from '@tidyjs/tidy'
import { average, dateStr, formatRelativeDaysNumber, generateBaseDates, isHoliday, sum } from '../common'
import { TaskNode } from './TaskNode'
import { TaskService } from './TaskService'
import { TaskRow } from './TaskRow'
import { HolidayData } from './HolidayData'
import { calcRate } from '../common/calcUtils'
import { getLogger } from '../logger'

export class Project {
    private logger = getLogger('domain/Project')
    private _taskService = new TaskService()
    private _cachedTaskRows?: TaskRow[]
    private _cachedTaskMap?: Map<number, TaskRow>

    constructor(
        private readonly _taskNodes: TaskNode[],
        private readonly _baseDate: Date,
        private readonly _holidayDatas: HolidayData[],
        private readonly _startDate?: Date,
        private readonly _endDate?: Date,
        private readonly _name?: string
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

    get holidayDatas() {
        return this._holidayDatas
    }

    get length() {
        return this.toTaskRows().length
    }

    getTask(id: number): TaskRow | undefined {
        if (!this._cachedTaskMap) {
            this._cachedTaskMap = new Map(this.toTaskRows().map((row) => [row.id, row]))
        }
        return this._cachedTaskMap.get(id)
    }

    toTaskRows(): TaskRow[] {
        if (!this._cachedTaskRows) {
            this._cachedTaskRows = this._taskService.convertToTaskRows(this._taskNodes)
        }
        return this._cachedTaskRows
        // return this._taskService.convertToTaskRows(this._taskNodes)
    }

    /**
     * 親を遡って、名前を"/"でjoinする
     * @param task  子のタスク
     * @param taskMap 親のタスクIDも存在する、<id,TaskRow>なMap
     * @returns
     */
    getFullTaskName(task?: TaskRow): string {
        const names: string[] = []
        let current = task

        while (current) {
            names.unshift(current.name) // 先頭に名前追加
            current = current.parentId ? this.getTask(current.parentId) : undefined
        }

        return names.join('/')
    }

    /**
     * 指定された期間、担当者のタスク配列を返す。親タスクは除外しています。
     * @param fromDate
     * @param toDate
     * @param assignee
     * @returns
     */
    getTaskRows(fromDate: Date, toDate?: Date, assignee?: string): TaskRow[] {
        const baseDates = generateBaseDates(fromDate, toDate ?? fromDate)
        const taskRows = this.toTaskRows().filter((taskRow) => taskRow.isLeaf)

        return taskRows.filter((taskRow) => {
            // const hasPV = baseDates.some((baseDate) => taskRow.calculatePV(baseDate) !== 0) //0じゃないヤツが、その日にあるタスク
            const hasPV = baseDates.some((baseDate) => {
                const pv = taskRow.calculatePV(baseDate)
                return typeof pv === 'number' && pv !== 0
            })
            const assigneeMatch = !assignee || taskRow.assignee === assignee
            return hasPV && assigneeMatch
        })
    }

    printAndGetRawData = (printRowNum?: number) => {
        this.logger.info(`プロジェクト名: ${this._name}`)
        this.logger.info(`開始日: ${dateStr(this._startDate)}`)
        this.logger.info(`終了日: ${dateStr(this._endDate)}`)
        this.logger.info(`基準日: ${dateStr(this._baseDate)}`)
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
        this.logger.info(`タスク数:${taskCount}件`)
        const numToShow = Math.min(printRowNum ?? taskCount, taskCount)
        this.logger.info(`先頭${numToShow}行データ:`)
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
            // mutate({
            //     assignee: (row) => row.assignee?.trim() ?? '', // 🔧 trim()を適用
            //   }),
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

    isHoliday(date: Date): boolean {
        return isHoliday(date, this)
    }

    /**
     * 計算から除外されたタスクの一覧を取得
     *
     * @returns 除外されたタスクとその理由の配列
     *
     * @remarks
     * - isLeaf === true のタスクのみを対象とする
     * - validStatus.isValid === false のタスクを返す
     */
    get excludedTasks(): ExcludedTask[] {
        return this.toTaskRows()
            .filter((task) => task.isLeaf)
            .filter((task) => !task.validStatus.isValid)
            .map((task) => ({
                task,
                reason: task.validStatus.invalidReason ?? '理由不明',
            }))
    }

    /**
     * 遅延しているタスクの一覧を取得
     *
     * @param minDays 遅延日数の閾値（デフォルト: 0）
     * @returns 遅延タスクの配列（遅延日数降順）
     *
     * @remarks
     * - 遅延日数は baseDate - endDate で動的に計算される（工期ベース、カレンダー日数）
     * - TaskRow をそのまま返す（新しい型は定義しない）
     * - isLeaf === true のタスクのみを対象とする
     * - finished === false（未完了）のタスクのみを対象とする
     * - 遅延日数 > minDays のタスクを返す
     * - 結果は遅延日数の降順でソートされる
     * - フルパス名が必要な場合は getFullTaskName(task) を使用
     */
    getDelayedTasks(minDays: number = 0): TaskRow[] {
        const baseDate = this.baseDate

        // 遅延日数を計算するヘルパー関数
        // formatRelativeDaysNumber は endDate - baseDate を返すので符号反転
        const calcDelayDays = (task: TaskRow): number => {
            return -(formatRelativeDaysNumber(baseDate, task.endDate) ?? 0)
        }

        return this.toTaskRows()
            .filter((task) => task.isLeaf)
            .filter((task) => !task.finished)
            .filter((task) => task.endDate !== undefined)
            .filter((task) => calcDelayDays(task) > minDays)
            .sort((a, b) => calcDelayDays(b) - calcDelayDays(a))
    }
}

const sumWorkload = (group: TaskRow[]) => sum(group.map((d) => d.workload))
const averageWorkload = (group: TaskRow[]) => average(group.map((d) => d.workload))
const sumCalculatePV = (group: TaskRow[], baseDate: Date) =>
    sum(
        group.map((d) => d.calculatePV(baseDate)),
        3
    )
const sumCalculatePVs = (group: TaskRow[], baseDate: Date) =>
    sum(
        group.map((d) => d.calculatePVs(baseDate)),
        3
    )
const sumPVs = (group: TaskRow[]) =>
    sum(
        group.map((d) => d.pv),
        3
    ) // 基準日ごとに、担当者でグルーピングされたPVデータを足している

const sumEVs = (group: TaskRow[]) =>
    sum(
        group.map((d) => d.ev),
        3
    )

const calculateSPI = (group: TaskRow[], baseDate: Date) => {
    const ev = sumEVs(group)
    const pv = sumCalculatePVs(group, baseDate)
    return calcRate(ev, pv)
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

/**
 * 計算から除外されたタスクの情報
 */
export type ExcludedTask = {
    /** 除外されたタスク */
    task: TaskRow
    /** 除外理由（validStatus.invalidReason） */
    reason: string
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
