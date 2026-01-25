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
     * @returns ProjectStatistics配列（要素数1）
     */
    get statisticsByProject(): ProjectStatistics[] {
        return [this.getStatistics()]
    }

    /**
     * 担当者別の統計情報を返す
     * @returns AssigneeStatistics配列
     */
    get statisticsByName(): AssigneeStatistics[] {
        return this.getStatisticsByName()
    }

    /**
     * フィルタ条件に基づいてタスクを抽出する
     *
     * @param options フィルタオプション
     * @returns フィルタ結果の TaskRow[]（親タスク含む全タスク）
     *
     * @note 統計計算時は内部でリーフタスクのみを使用（二重カウント防止）
     *
     * @example
     * // "認証機能" を含むタスクを取得（親タスク含む）
     * const tasks = project.filterTasks({ filter: "認証機能" })
     *
     * // 引数なしは全タスクを返す
     * const allTasks = project.filterTasks()
     */
    filterTasks(options?: TaskFilterOptions): TaskRow[] {
        const allTasks = this.toTaskRows()

        if (!options?.filter || options.filter.trim() === '') {
            return allTasks
        }

        return allTasks.filter((task) => {
            const fullName = this.getFullTaskName(task)
            return fullName.includes(options.filter!)
        })
    }

    /**
     * プロジェクト統計情報を取得する
     *
     * オーバーロード:
     * 1. getStatistics() - プロジェクト全体の統計
     * 2. getStatistics({ filter }) - フィルタして統計
     * 3. getStatistics(TaskRow[]) - 渡されたタスクの統計
     */
    getStatistics(): ProjectStatistics
    getStatistics(options: StatisticsOptions): ProjectStatistics
    getStatistics(tasks: TaskRow[]): ProjectStatistics
    getStatistics(optionsOrTasks?: StatisticsOptions | TaskRow[]): ProjectStatistics {
        const tasks = this._resolveTasks(optionsOrTasks)
        return this._calculateStatistics(tasks)
    }

    /**
     * 担当者別統計情報を取得する
     *
     * オーバーロード:
     * 1. getStatisticsByName() - プロジェクト全体の担当者別統計
     * 2. getStatisticsByName({ filter }) - フィルタして担当者別統計
     * 3. getStatisticsByName(TaskRow[]) - 渡されたタスクの担当者別統計
     */
    getStatisticsByName(): AssigneeStatistics[]
    getStatisticsByName(options: StatisticsOptions): AssigneeStatistics[]
    getStatisticsByName(tasks: TaskRow[]): AssigneeStatistics[]
    getStatisticsByName(optionsOrTasks?: StatisticsOptions | TaskRow[]): AssigneeStatistics[] {
        const tasks = this._resolveTasks(optionsOrTasks)
        return this._calculateAssigneeStats(tasks)
    }

    /**
     * 引数を解決してリーフタスクのみを返す（統計計算用）
     * filterTasks() は全タスクを返すが、統計計算はリーフのみで行う
     */
    private _resolveTasks(optionsOrTasks?: StatisticsOptions | TaskRow[]): TaskRow[] {
        let tasks: TaskRow[]

        if (optionsOrTasks === undefined) {
            tasks = this.filterTasks()
        } else if (Array.isArray(optionsOrTasks)) {
            tasks = optionsOrTasks
        } else {
            tasks = this.filterTasks(optionsOrTasks)
        }

        // 統計計算はリーフタスクのみ（二重カウント防止）
        return tasks.filter((t) => t.isLeaf)
    }

    /**
     * プロジェクト統計を計算
     */
    private _calculateStatistics(tasks: TaskRow[]): ProjectStatistics {
        const name = this._name
        const baseDate = this._baseDate
        const startDate = this._startDate
        const endDate = this._endDate

        // 基本統計
        const totalPvCalculated = sumCalculatePVs(tasks, baseDate)
        const totalEv = sumEVs(tasks)
        const spi = calculateSPI(tasks, baseDate)
        const bac = sumWorkload(tasks)

        // 拡張統計
        const extendedStats = this._calculateExtendedStats(tasks, spi, bac, totalEv)

        return {
            projectName: name,
            startDate: dateStr(startDate),
            endDate: dateStr(endDate),
            totalTasksCount: tasks.length,
            totalWorkloadExcel: bac,
            totalWorkloadCalculated: endDate ? sumCalculatePVs(tasks, endDate) : undefined,
            averageWorkload: averageWorkload(tasks),
            baseDate: dateStr(baseDate),
            totalPvExcel: sumPVs(tasks),
            totalPvCalculated,
            totalEv,
            spi,
            ...extendedStats,
        }
    }

    /**
     * 担当者別統計を計算
     */
    private _calculateAssigneeStats(tasks: TaskRow[]): AssigneeStatistics[] {
        const baseDate = this._baseDate
        const endDate = this._endDate

        // 担当者ごとにグループ化
        const grouped = new Map<string | undefined, TaskRow[]>()
        for (const task of tasks) {
            const key = task.assignee
            if (!grouped.has(key)) {
                grouped.set(key, [])
            }
            grouped.get(key)!.push(task)
        }

        return Array.from(grouped.entries()).map(([assignee, assigneeTasks]) => {
            const totalPvCalculated = sumCalculatePVs(assigneeTasks, baseDate)
            const totalEv = sumEVs(assigneeTasks)
            const spi = calculateSPI(assigneeTasks, baseDate)
            const bac = sumWorkload(assigneeTasks)

            // 拡張統計（担当者ごとに計算）
            const extendedStats = this._calculateExtendedStats(assigneeTasks, spi, bac, totalEv)

            return {
                assignee: assignee || undefined,
                totalTasksCount: assigneeTasks.length,
                totalWorkloadExcel: bac,
                totalWorkloadCalculated: endDate ? sumCalculatePVs(assigneeTasks, endDate) : undefined,
                averageWorkload: averageWorkload(assigneeTasks),
                baseDate: dateStr(baseDate),
                totalPvExcel: sumPVs(assigneeTasks),
                totalPvCalculated,
                totalEv,
                spi,
                ...extendedStats,
            }
        })
    }

    /**
     * 拡張統計を計算（共通ヘルパー）
     */
    private _calculateExtendedStats(
        tasks: TaskRow[],
        spi: number | undefined,
        bac: number,
        totalEv: number
    ): {
        etcPrime?: number
        completionForecast?: Date
        delayedTaskCount: number
        averageDelayDays: number
        maxDelayDays: number
    } {
        // ETC'（SPI=0の場合はundefined）
        const etcPrime = spi && spi > 0 ? (bac - totalEv) / spi : undefined

        // 完了予測日（計算不能な場合はundefined）
        const completionForecast = this._calculateCompletionForecastForTasks(tasks, spi)

        // 遅延情報
        const { delayedTaskCount, averageDelayDays, maxDelayDays } = this._calculateDelayStats(tasks)

        return {
            etcPrime,
            completionForecast,
            delayedTaskCount,
            averageDelayDays,
            maxDelayDays,
        }
    }

    /**
     * 指定タスクに対する完了予測日を計算
     */
    private _calculateCompletionForecastForTasks(
        tasks: TaskRow[],
        spi: number | undefined
    ): Date | undefined {
        if (!spi || spi <= 0) return undefined

        const bac = sumWorkload(tasks)
        const totalEv = sumEVs(tasks)
        const remainingWork = bac - totalEv

        if (remainingWork <= 0) {
            return new Date(this._baseDate)
        }

        // 簡易的な完了予測日計算（日あたりPV = 1 と仮定）
        const etcPrime = remainingWork / spi
        const forecastDate = new Date(this._baseDate)
        let daysAdded = 0
        let workDaysAdded = 0

        while (workDaysAdded < etcPrime && daysAdded < 730) {
            forecastDate.setDate(forecastDate.getDate() + 1)
            daysAdded++
            if (!this.isHoliday(forecastDate)) {
                workDaysAdded++
            }
        }

        if (workDaysAdded < etcPrime) {
            return undefined
        }

        return forecastDate
    }

    /**
     * 遅延統計を計算
     */
    private _calculateDelayStats(tasks: TaskRow[]): {
        delayedTaskCount: number
        averageDelayDays: number
        maxDelayDays: number
    } {
        const baseDate = this._baseDate

        // 遅延日数計算
        const calcDelayDays = (task: TaskRow): number => {
            return -(formatRelativeDaysNumber(baseDate, task.endDate) ?? 0)
        }

        // 遅延タスク抽出（未完了かつ遅延日数 > 0）
        const delayedTasks = tasks
            .filter((task) => !task.finished)
            .filter((task) => task.endDate !== undefined)
            .filter((task) => calcDelayDays(task) > 0)

        const delayDays = delayedTasks.map(calcDelayDays)
        const delayedTaskCount = delayedTasks.length
        const averageDelayDays =
            delayDays.length > 0 ? delayDays.reduce((a, b) => a + b, 0) / delayDays.length : 0
        const maxDelayDays = delayDays.length > 0 ? Math.max(...delayDays) : 0

        return { delayedTaskCount, averageDelayDays, maxDelayDays }
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
     * プロジェクト全体のBAC（Budget at Completion）
     * 全リーフタスクの予定工数の合計
     *
     * @returns BAC（人日）。タスクがない場合は0
     *
     * @remarks
     * statisticsByProject.totalWorkloadExcel を再利用
     */
    get bac(): number {
        const stats = this.statisticsByProject[0]
        return stats?.totalWorkloadExcel ?? 0
    }

    /**
     * プロジェクト全体の累積EV
     * 全リーフタスクのEVの合計
     *
     * @returns 累積EV（人日）
     */
    get totalEv(): number {
        const stats = this.statisticsByProject[0]
        return stats?.totalEv ?? 0
    }

    /**
     * プロジェクト全体のETC'（SPI版）
     * (BAC - 累積EV) / SPI
     *
     * @returns ETC'（人日）。SPI=0またはSPI未定義の場合はundefined
     */
    get etcPrime(): number | undefined {
        const stats = this.statisticsByProject[0]
        const spi = stats?.spi
        if (spi === undefined || spi === null || spi === 0) return undefined

        const ev = this.totalEv
        return (this.bac - ev) / spi
    }

    /**
     * 計画稼働日数を取得
     * プロジェクト開始日から終了日までの、休日を除いた稼働日数
     *
     * @returns 稼働日数。開始日または終了日が未設定の場合は0
     *
     * @remarks
     * generateBaseDates と isHoliday を再利用
     */
    get plannedWorkDays(): number {
        if (!this._startDate || !this._endDate) return 0

        return generateBaseDates(this._startDate, this._endDate).filter(
            (date) => !this.isHoliday(date)
        ).length
    }

    /**
     * 直近N日平均PV（baseDate時点）
     * 完了予測の日あたり消化量として使用
     *
     * @param lookbackDays 直近何日の平均を取るか（デフォルト: 7）
     * @returns 直近N日平均PV（人日/日）。計算不能な場合は0
     */
    calculateRecentDailyPv(lookbackDays: number = 7): number {
        const rows = this.toTaskRows().filter((task) => task.isLeaf)
        const pvValues: number[] = []

        // baseDateから過去に遡って稼働日のPVを取得
        const current = new Date(this._baseDate)
        let daysChecked = 0

        while (pvValues.length < lookbackDays && daysChecked < lookbackDays * 3) {
            // 最大で3倍の日数まで遡る（休日考慮）
            if (!this.isHoliday(current)) {
                const dailyPv = sumCalculatePV(rows, current)
                if (dailyPv !== undefined) {
                    pvValues.push(dailyPv)
                }
            }
            current.setDate(current.getDate() - 1)
            daysChecked++
        }

        if (pvValues.length === 0) return 0
        return pvValues.reduce((a, b) => a + b, 0) / pvValues.length
    }

    /**
     * 完了予測を計算
     *
     * @param options 予測オプション
     * @returns 完了予測結果。計算不能な場合はundefined
     */
    calculateCompletionForecast(
        options?: CompletionForecastOptions
    ): CompletionForecast | undefined {
        const lookbackDays = options?.lookbackDays ?? 7
        const maxForecastDays = options?.maxForecastDays ?? 730

        // SPI を取得
        const stats = this.statisticsByProject[0]
        const spi = stats?.spi
        if (spi === undefined || spi === null || spi === 0) {
            return undefined
        }

        // 残作業量を計算
        const ev = this.totalEv
        const bac = this.bac
        const remainingWork = bac - ev

        // 完了済みの場合
        if (remainingWork <= 0) {
            return {
                etcPrime: 0,
                forecastDate: new Date(this._baseDate),
                remainingWork: 0,
                usedDailyPv: 0,
                usedSpi: spi,
                dailyBurnRate: 0,
                confidence: 'high',
                confidenceReason: 'プロジェクト完了済み',
            }
        }

        // 日あたりPVを決定
        const usedDailyPv = options?.dailyPvOverride ?? this.calculateRecentDailyPv(lookbackDays)

        // dailyPv が 0 の場合は予測不可
        if (usedDailyPv === 0) {
            return undefined
        }

        // ETC' を計算
        const etcPrime = remainingWork / spi

        // 日あたり消化量
        const dailyBurnRate = usedDailyPv * spi

        // 完了予測日を計算
        let currentRemaining = remainingWork
        const currentDate = new Date(this._baseDate)
        let daysElapsed = 0

        while (currentRemaining > 0 && daysElapsed < maxForecastDays) {
            currentDate.setDate(currentDate.getDate() + 1)
            daysElapsed++

            if (!this.isHoliday(currentDate)) {
                currentRemaining -= dailyBurnRate
            }
        }

        // maxForecastDays を超えた場合
        if (currentRemaining > 0) {
            return undefined
        }

        // 信頼性を判定
        const { confidence, confidenceReason } = this.determineConfidence(
            spi,
            options?.dailyPvOverride !== undefined,
            currentDate
        )

        return {
            etcPrime,
            forecastDate: currentDate,
            remainingWork,
            usedDailyPv,
            usedSpi: spi,
            dailyBurnRate,
            confidence,
            confidenceReason,
        }
    }

    /**
     * 信頼性を判定
     */
    private determineConfidence(
        spi: number,
        hasDailyPvOverride: boolean,
        forecastDate: Date
    ): { confidence: 'high' | 'medium' | 'low'; confidenceReason: string } {
        // 手入力PV使用の場合は高信頼
        if (hasDailyPvOverride) {
            return { confidence: 'high', confidenceReason: 'ユーザーが日あたりPVを指定' }
        }

        // 予測日が計画終了日を大幅に超過（2倍以上）
        if (this._endDate) {
            const plannedDuration = this._endDate.getTime() - (this._startDate?.getTime() ?? 0)
            const forecastDuration = forecastDate.getTime() - (this._startDate?.getTime() ?? 0)
            if (forecastDuration > plannedDuration * 2) {
                return { confidence: 'low', confidenceReason: '予測日が計画の2倍以上超過' }
            }
        }

        // SPI に基づく判定
        if (spi >= 0.8 && spi <= 1.2) {
            return { confidence: 'high', confidenceReason: '安定した進捗（SPI: 0.8-1.2）' }
        }
        if (spi >= 0.5 && spi < 0.8) {
            return { confidence: 'medium', confidenceReason: 'やや遅れ気味（SPI: 0.5-0.8）' }
        }
        if (spi > 1.2) {
            return { confidence: 'medium', confidenceReason: '前倒し進捗（SPI > 1.2）' }
        }
        // spi < 0.5
        return { confidence: 'low', confidenceReason: '大幅な遅延（SPI < 0.5）' }
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
    // 拡張プロパティ（REQ-FILTER-STATS-001）
    /** ETC'（残作業予測）。SPI=0の場合は計算不能のためundefined */
    etcPrime?: number
    /** 完了予測日。計算不能な場合はundefined */
    completionForecast?: Date
    /** 遅延タスク数 */
    delayedTaskCount: number
    /** 平均遅延日数（遅延タスクがない場合は0） */
    averageDelayDays: number
    /** 最大遅延日数（遅延タスクがない場合は0） */
    maxDelayDays: number
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
 * タスクフィルタオプション
 */
export interface TaskFilterOptions {
    /** fullTaskName による部分一致フィルタ */
    filter?: string
}

/**
 * 統計情報取得オプション
 * TaskFilterOptions を継承（フィルタ条件を含む）
 */
export interface StatisticsOptions extends TaskFilterOptions {
    // 将来の拡張用（例: includeDelayed, groupBy など）
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

/**
 * 完了予測オプション
 */
export interface CompletionForecastOptions {
    /** 手入力の日あたりPV（優先使用） */
    dailyPvOverride?: number
    /** 直近PV平均の計算日数（デフォルト: 7） */
    lookbackDays?: number
    /** 計算を打ち切る最大日数（デフォルト: 730 = 2年） */
    maxForecastDays?: number
}

/**
 * 完了予測結果
 */
export interface CompletionForecast {
    /** ETC': 残作業完了に必要な計画工数換算（人日） */
    etcPrime: number
    /** 完了予測日 */
    forecastDate: Date
    /** 残作業量（BAC - EV） */
    remainingWork: number
    /** 使用した日あたりPV */
    usedDailyPv: number
    /** 使用したSPI */
    usedSpi: number
    /** 日あたり消化量（usedDailyPv × usedSpi） */
    dailyBurnRate: number
    /** 予測の信頼性 */
    confidence: 'high' | 'medium' | 'low'
    /** 信頼性の理由 */
    confidenceReason: string
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
