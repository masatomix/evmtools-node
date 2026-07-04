import { tidy, filter, summarize, groupBy } from '@tidyjs/tidy'
import {
    average,
    dateStr,
    formatRelativeDaysNumber,
    generateBaseDates,
    isHoliday,
    sum,
} from '../common'
import { TreeNode } from '../common/TreeFormatter'
import { TaskNode } from './TaskNode'
import { TaskService } from './TaskService'
import { TaskRow } from './TaskRow'
import { HolidayData } from './HolidayData'
import { calcRate } from '../common/calcUtils'
import { getLogger } from '../logger'
import {
    calculateEarnedSchedule as calculateEarnedScheduleCore,
    EarnedScheduleResult,
} from './EarnedSchedule'

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

    /**
     * プロジェクトのタスクツリーを TreeNode 形式で取得
     * @returns TreeNode[] ルートノードの配列
     */
    getTree(): TreeNode[] {
        return this._taskNodes.map((node) => this.toTreeNode(node))
    }

    /**
     * TaskNode を TreeNode に変換（再帰）
     */
    private toTreeNode(node: TaskNode): TreeNode {
        return {
            name: node.name,
            children: node.children.map((child) => this.toTreeNode(child)),
        }
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
        if (!task) return ''

        // 内部メモ化: Project 内ではツリー不変・id 一意のため、id をキーに結果をキャッシュする。
        // 公開シグネチャ・戻り値は従来と同一（#153 は性能改善のみ、公開 API 追加なし）
        const cached = this._fullNameCache.get(task.id)
        if (cached !== undefined) return cached

        const names: string[] = []
        let current: TaskRow | undefined = task

        while (current) {
            names.unshift(current.name) // 先頭に名前追加
            current = current.parentId ? this.getTask(current.parentId) : undefined
        }

        const fullName = names.join('/')
        this._fullNameCache.set(task.id, fullName)
        return fullName
    }

    /** getFullTaskName の内部キャッシュ（task.id → フルパス名）。外部非公開 */
    private _fullNameCache = new Map<number, string>()

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
                totalWorkloadCalculated: endDate
                    ? sumCalculatePVs(assigneeTasks, endDate)
                    : undefined,
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
     * REQ-REFACTOR-002: 高性能版を使用
     * Issue #145: dailyPvOverride: 1.0 を削除し、REQ-EVM-001 AC-03 に準拠
     *             （直近N日平均を使用）
     */
    private _calculateExtendedStats(
        tasks: TaskRow[],
        spi: number | undefined,
        bac: number | undefined,
        totalEv: number | undefined
    ): {
        etcPrime?: number
        completionForecast?: Date
        delayedTaskCount: number
        averageDelayDays: number
        maxDelayDays: number
    } {
        // 高性能版を呼び出し（dailyPvOverride なし → calculateRecentDailyPv() を使用）
        const forecast = this.calculateCompletionForecast(tasks)

        // 遅延情報
        const { delayedTaskCount, averageDelayDays, maxDelayDays } =
            this._calculateDelayStats(tasks)

        return {
            etcPrime: forecast?.etcPrime,
            completionForecast: forecast?.forecastDate,
            delayedTaskCount,
            averageDelayDays,
            maxDelayDays,
        }
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
     * 基本統計のみを計算（循環参照回避用）
     * REQ-REFACTOR-002
     *
     * @param tasks リーフタスクの配列
     * @returns BasicStats
     */
    private _calculateBasicStats(tasks: TaskRow[]): BasicStats {
        return {
            totalEv: sumEVs(tasks),
            spi: calculateSPI(tasks, this._baseDate),
            bac: sumWorkload(tasks),
        }
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
                const name = row.assignee ?? '(未割当)'
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
     * REQ-REFACTOR-002: オーバーロード対応
     *
     * オーバーロード:
     * 1. calculateCompletionForecast() - プロジェクト全体
     * 2. calculateCompletionForecast(options) - フィルタ + 予測オプション
     * 3. calculateCompletionForecast(tasks, options?) - タスク配列指定
     */
    calculateCompletionForecast(): CompletionForecast | undefined
    calculateCompletionForecast(
        options: CompletionForecastOptions & StatisticsOptions
    ): CompletionForecast | undefined
    calculateCompletionForecast(
        tasks: TaskRow[],
        options?: CompletionForecastOptions
    ): CompletionForecast | undefined
    calculateCompletionForecast(
        optionsOrTasks?: (CompletionForecastOptions & StatisticsOptions) | TaskRow[],
        maybeOptions?: CompletionForecastOptions
    ): CompletionForecast | undefined {
        // 引数の型を判定してタスクとオプションを解決
        let tasks: TaskRow[]
        let options: CompletionForecastOptions | undefined

        if (optionsOrTasks === undefined) {
            // 引数なし: プロジェクト全体
            tasks = this._resolveTasks()
            options = undefined
        } else if (Array.isArray(optionsOrTasks)) {
            // TaskRow[] が渡された場合
            tasks = optionsOrTasks.filter((t) => t.isLeaf)
            options = maybeOptions
        } else {
            // StatisticsOptions & CompletionForecastOptions が渡された場合
            tasks = this._resolveTasks(optionsOrTasks)
            options = optionsOrTasks
        }

        const lookbackDays = options?.lookbackDays ?? 7
        const maxForecastDays = options?.maxForecastDays ?? 730

        // 基本統計を計算（循環参照を避けるため _calculateBasicStats を使用）
        const basicStats = this._calculateBasicStats(tasks)
        // SPI決定: spiOverride > 累積SPI (REQ-SPI-002)
        const usedSpi = options?.spiOverride ?? basicStats.spi
        if (usedSpi === undefined || usedSpi === null || usedSpi <= 0) {
            return undefined
        }

        // 残作業量を計算
        const ev = basicStats.totalEv ?? 0
        const bac = basicStats.bac ?? 0
        const remainingWork = bac - ev

        // 完了済みの場合
        if (remainingWork <= 0) {
            return {
                etcPrime: 0,
                forecastDate: new Date(this._baseDate),
                remainingWork: 0,
                usedDailyPv: 0,
                usedSpi: usedSpi,
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

        // ETC' を計算 (REQ-SPI-002: usedSpi を使用)
        const etcPrime = remainingWork / usedSpi

        // 日あたり消化量 (REQ-SPI-002: usedSpi を使用)
        const dailyBurnRate = usedDailyPv * usedSpi

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

        // 信頼性を判定 (REQ-SPI-002: hasSpiOverride パラメータ追加)
        const { confidence, confidenceReason } = this.determineConfidence(
            usedSpi,
            options?.dailyPvOverride !== undefined,
            options?.spiOverride !== undefined,
            currentDate
        )

        return {
            etcPrime,
            forecastDate: currentDate,
            remainingWork,
            usedDailyPv,
            usedSpi: usedSpi,
            dailyBurnRate,
            confidence,
            confidenceReason,
        }
    }

    /**
     * 信頼性を判定
     * @param spi 使用するSPI
     * @param hasDailyPvOverride dailyPvOverride が指定されたか
     * @param hasSpiOverride spiOverride が指定されたか (REQ-SPI-002)
     * @param forecastDate 予測日
     */
    private determineConfidence(
        spi: number,
        hasDailyPvOverride: boolean,
        hasSpiOverride: boolean,
        forecastDate: Date
    ): { confidence: 'high' | 'medium' | 'low'; confidenceReason: string } {
        // spiOverride 指定時は高信頼（最優先）(REQ-SPI-002)
        if (hasSpiOverride) {
            return { confidence: 'high', confidenceReason: 'ユーザーがSPIを指定' }
        }

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

    /**
     * 担当者ごと・稼働日ごとの計画価値（PV）をタスク明細付きで集計する
     *
     * spec: phase2-skill-integration-0.0.31 要件1（AC 1.1〜1.12）
     * 参照実装: task リポジトリ evmtools スキル check-daily-pv.ts の
     * calculateDailyPvByAssignee（数値一致のオラクル）
     *
     * @param options フィルタ（fullTaskName 部分一致）・担当者（完全一致）・期間
     * @returns 担当者×稼働日ごとの DailyPvEntry 配列
     *
     * @remarks
     * - 集計対象はリーフタスク（isLeaf === true）のみ（AC 1.11）
     * - 休日（isHoliday）はスキップする（AC 1.2）
     * - 担当者未設定は「(未割当)」に正規化する（AC 1.3）
     * - 明細は calculatePV が 0 超のタスクのみ。明細 pv は小数第3位で丸め、
     *   合算は未丸め値を合算して最後に小数第3位で丸める（AC 1.4, 1.5）
     * - 対象タスクを持つ担当者は、正の PV が無い稼働日でも PV=0 のエントリを
     *   出力する（PV=0 レンジ集約のため、AC 1.6）
     * - 期間は from ?? startDate / to ?? endDate。いずれかが決定できない場合は
     *   Error を送出する（AC 1.9, 1.10）
     */
    getDailyPvByAssignee(options?: DailyPvByAssigneeOptions): DailyPvEntry[] {
        // リーフ解決 + filter 部分一致（AC 1.7, 1.11）
        let tasks = this._resolveTasks(options)

        // 担当者の完全一致絞り込み（AC 1.8）
        if (options?.assignee !== undefined) {
            tasks = tasks.filter((task) => task.assignee === options.assignee)
        }

        // 期間決定（AC 1.9, 1.10）
        const from = options?.from ?? this._startDate
        const to = options?.to ?? this._endDate
        if (!(from && to)) {
            throw new Error('fromかtoが取得できませんでした')
        }

        // 担当者でグルーピング（AC 1.3。参照実装同様 Map で行い挿入順を保つ）
        const byAssignee = new Map<string, TaskRow[]>()
        for (const task of tasks) {
            const assignee = task.assignee ?? '(未割当)'
            if (!byAssignee.has(assignee)) {
                byAssignee.set(assignee, [])
            }
            byAssignee.get(assignee)!.push(task)
        }

        const entries: DailyPvEntry[] = []
        const round3 = (x: number): number => Math.round(x * 1000) / 1000

        for (const baseDate of generateBaseDates(from, to)) {
            // 休日はスキップ（AC 1.2）
            if (this.isHoliday(baseDate)) continue

            const label = dateStr(baseDate)

            for (const [assignee, assigneeTasks] of byAssignee) {
                let totalPv = 0
                const taskDetails: DailyPvTaskDetail[] = []

                for (const task of assigneeTasks) {
                    const pv = task.calculatePV(baseDate)
                    if (pv !== undefined && pv > 0) {
                        // 明細は個別丸め・合算は未丸め値を最後に丸める（AC 1.4, 1.5）
                        totalPv += pv
                        taskDetails.push({
                            name: task.name ?? '',
                            fullName: this.getFullTaskName(task),
                            pv: round3(pv),
                        })
                    }
                }

                // 対象タスクを持つ担当者は PV=0 の日もエントリ出力（AC 1.6）
                entries.push({
                    assignee,
                    date: label,
                    pv: round3(totalPv),
                    taskCount: taskDetails.length,
                    tasks: taskDetails,
                })
            }
        }

        return entries
    }

    /** 累積PV曲線のメモ化キャッシュ（フィルタ文字列 → 曲線）。外部非公開 */
    private _pvCurveCache = new Map<string, number[]>()

    /**
     * Earned Schedule（ES）指標を算出する
     *
     * spec: phase3-earned-schedule-0.0.32 要件2.8, 要件5, 要件6
     *
     * プロジェクト全体（options 省略時）または filter で絞ったリーフタスク部分集合に
     * 対して、稼働日単位の ES / SPI(t) / SV(t) / IEAC(t) と完了予測日を返す。
     *
     * @param options フィルタ（fullTaskName 部分一致）
     * @returns ES 指標 + 完了予測日。算出不能（タスク空・開始/終了日欠損・BAC=0 等）は undefined
     *
     * @remarks
     * - 累積PV曲線はプロジェクト全期間（開始日〜終了日）の稼働日（土日/祝日除外）で
     *   1 回だけ構築し、フィルタ文字列をキーにメモ化する（要件 6.1, 6.2）
     * - AT = 開始日→基準日の稼働日数、PD = 計画総稼働日数（plannedWorkDays と一致）
     * - 完了予測日は IEAC(t) が算出できた場合のみ、開始日から IEAC(t) 稼働日ぶんを
     *   暦日展開（土日/祝日スキップ）して算出する（要件 2.8）
     */
    calculateEarnedSchedule(
        options?: TaskFilterOptions
    ): (EarnedScheduleResult & { esForecastDate: Date | undefined }) | undefined {
        const startDate = this._startDate
        const endDate = this._endDate
        if (!startDate || !endDate) return undefined

        // リーフ部分集合を既存の統計と同一のタスク解決機構で解決（要件 5.1, 5.3）
        const tasks = this._resolveTasks(options)
        if (tasks.length === 0) return undefined // 要件 5.2: 空集合は undefined（例外にしない）

        // 稼働日配列 = プロジェクト全期間から土日/祝日を除外（要件 6.1）
        const workDays = generateBaseDates(startDate, endDate).filter(
            (date) => !this.isHoliday(date)
        )
        const pd = workDays.length
        if (pd === 0) return undefined

        // 累積PV曲線を 1 回だけ構築（メモ化。要件 6.2）
        const pvCurve = this._buildPvCurve(tasks, workDays, options?.filter)

        // 曲線末尾 BAC=0 のプロジェクトは算出不能
        const bac = pvCurve[pvCurve.length - 1] ?? 0
        if (bac <= 0) return undefined

        // AT = 開始日から基準日までの稼働日数（基準日が開始日より前なら 0）
        const at = generateBaseDates(startDate, this._baseDate).filter(
            (date) => !this.isHoliday(date)
        ).length

        // EV = 対象リーフタスクの ev 合計
        const ev = sumEVs(tasks) ?? 0

        const result = calculateEarnedScheduleCore({ pvCurve, ev, at, pd })
        if (!result) return undefined

        // 完了予測日: IEAC(t) が算出できた場合のみ暦日展開（要件 2.8）
        const esForecastDate = this._expandEsForecastDate(startDate, result.iEacT)

        return { ...result, esForecastDate }
    }

    /**
     * 累積PV曲線を構築する（フィルタ文字列をキーにメモ化）
     * pvCurve[i] = i 番目の稼働日終了時点の累積PV（要件 6.1, 6.2）
     */
    private _buildPvCurve(
        tasks: TaskRow[],
        workDays: Date[],
        filterKey: string | undefined
    ): number[] {
        const key = filterKey ?? ''
        const cached = this._pvCurveCache.get(key)
        if (cached) return cached

        const pvCurve = workDays.map((workDay) => sumCalculatePVs(tasks, workDay) ?? 0)
        this._pvCurveCache.set(key, pvCurve)
        return pvCurve
    }

    /**
     * 開始日から IEAC(t) 稼働日ぶんを暦日展開した完了予測日を返す（要件 2.8）
     * calculateCompletionForecast の暦日展開ループと同一の isHoliday スキップパターン
     */
    private _expandEsForecastDate(startDate: Date, iEacT: number | undefined): Date | undefined {
        if (iEacT === undefined || !Number.isFinite(iEacT) || iEacT <= 0) return undefined

        // 端数の稼働日は翌稼働日に食い込むため切り上げる
        const neededWorkDays = Math.ceil(iEacT)
        // 安全上限（暦日）: 全日休日のような異常カレンダーでの無限ループを防止
        const maxCalendarDays = neededWorkDays * 7 + 366

        const currentDate = new Date(startDate)
        let workDaysCount = this.isHoliday(currentDate) ? 0 : 1
        let calendarDays = 0

        while (workDaysCount < neededWorkDays && calendarDays < maxCalendarDays) {
            currentDate.setDate(currentDate.getDate() + 1)
            calendarDays++

            if (!this.isHoliday(currentDate)) {
                workDaysCount++
            }
        }

        if (workDaysCount < neededWorkDays) return undefined
        return currentDate
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
// 将来の拡張用（例: includeDelayed, groupBy など）。現状はフィルタ条件のみ。
export type StatisticsOptions = TaskFilterOptions

/**
 * 日次PV明細のタスク項目
 * spec: phase2-skill-integration-0.0.31 要件1
 */
export interface DailyPvTaskDetail {
    /** タスク名（未設定時は空文字） */
    name: string
    /** フルタスク名（getFullTaskName(task)） */
    fullName: string
    /** このタスクの計算PV（小数第3位で丸め） */
    pv: number
}

/**
 * 担当者×日ごとの日次PVエントリ
 * spec: phase2-skill-integration-0.0.31 要件1
 */
export interface DailyPvEntry {
    /** 担当者名。未割当は '(未割当)' */
    assignee: string
    /** 基準日ラベル（dateStr(baseDate)） */
    date: string
    /** 明細PVの合算（未丸め値を合算し小数第3位で丸め） */
    pv: number
    /** 明細タスク数（calculatePV が 0 超のもの） */
    taskCount: number
    /** タスク明細 */
    tasks: DailyPvTaskDetail[]
}

/**
 * 日次PV集計オプション
 * spec: phase2-skill-integration-0.0.31 要件1
 */
export interface DailyPvByAssigneeOptions extends TaskFilterOptions {
    /** 特定担当者のみ集計する（完全一致） */
    assignee?: string
    /** 集計開始日（省略時はプロジェクト開始日） */
    from?: Date
    /** 集計終了日（省略時はプロジェクト終了日） */
    to?: Date
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
    /**
     * 外部から指定するSPI（優先使用）
     * ProjectService.calculateRecentSpi() で計算した直近N日SPIを指定可能
     * @example
     * const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])
     * project.calculateCompletionForecast({ spiOverride: recentSpi })
     */
    spiOverride?: number
}

/**
 * 基本統計（循環参照回避用）
 * REQ-REFACTOR-002
 */
export interface BasicStats {
    /** 総EV（出来高） */
    totalEv: number | undefined
    /** SPI（スケジュール効率） */
    spi: number | undefined
    /** BAC（総工数） */
    bac: number | undefined
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
