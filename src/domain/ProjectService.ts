import { tidy, groupBy, summarize } from '@tidyjs/tidy'
import { Project, ProjectStatistics, TaskFilterOptions } from './Project'
import { TaskRow } from './TaskRow'
import { dateStr, formatRelativeDays, formatRelativeDaysNumber, sum } from '../common'
import { getLogger } from '../logger'

const logger = getLogger('ProjectService')

/**
 * 期間SPI計算オプション
 */
export interface RecentSpiOptions extends TaskFilterOptions {
    /**
     * 期間警告の閾値（日数）
     * この日数を超えると警告ログを出力
     * @default 30
     */
    warnThresholdDays?: number
}

export class ProjectService {
    /**
     * 複数のProjectスナップショットから期間SPIを計算する
     * 渡されたProject群の累積SPIの平均を返す
     *
     * @param projects Project配列
     * @param options オプション（フィルタ条件、警告閾値）
     * @returns 期間SPI。計算不能な場合はundefined
     */
    calculateRecentSpi(projects: Project[], options?: RecentSpiOptions): number | undefined {
        // 1. 空配列チェック
        if (projects.length === 0) return undefined

        // 2. 期間チェックと警告
        this._warnIfPeriodTooLong(projects, options?.warnThresholdDays ?? 30)

        // 3. 各ProjectのSPIを取得
        const spis = projects
            .map((p) => p.getStatistics(options ?? {}).spi)
            .filter((spi): spi is number => spi !== undefined)

        // 4. 全てundefinedなら計算不能
        if (spis.length === 0) return undefined

        // 5. 平均を返す
        return spis.reduce((a, b) => a + b, 0) / spis.length
    }

    /**
     * 期間が閾値を超えている場合に警告ログを出力
     * @param projects Project配列
     * @param thresholdDays 閾値（日数）
     */
    private _warnIfPeriodTooLong(projects: Project[], thresholdDays: number): void {
        if (projects.length < 2) return

        // baseDateでソートして最古と最新を取得
        const sorted = [...projects].sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime())
        const oldest = sorted[0].baseDate
        const newest = sorted[sorted.length - 1].baseDate

        // 日数差を計算
        const diffMs = newest.getTime() - oldest.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays > thresholdDays) {
            logger.warn(
                `calculateRecentSpi: 期間が ${diffDays} 日と長いです。` +
                    `直近SPIとしては不適切な可能性があります（閾値: ${thresholdDays} 日）`
            )
        }
    }

    calculateTaskDiffs(now: Project, prev: Project): TaskDiff[] {
        const prevTasks = prev.toTaskRows()
        // key:TaskRow#id, value: TaskRow のMap
        const prevTasksMap = new Map(prevTasks.map((row) => [row.id, row]))
        const nowTasks = now.toTaskRows()
        const nowTasksMap = new Map(nowTasks.map((row) => [row.id, row]))

        const diffs: TaskDiff[] = []

        // 変更 or 追加 の処理を1ループにまとめる
        // nowTaskはあるがprevTaskはない、時がある
        for (const nowTask of nowTasks) {
            // isLeaf なタスクのみ後続処理
            if (!nowTask.isLeaf) continue

            const prevTask = prevTasksMap.get(nowTask.id)
            const isNew = !prevTask // prevTaskがなかったらNew

            const deltaProgressRate = delta(nowTask.progressRate, prevTask?.progressRate)
            const deltaPV = delta(nowTask.pv, prevTask?.pv)
            const deltaEV = delta(nowTask.ev, prevTask?.ev)
            // const deltaSPI = delta(nowTask.spi, prevTask.spi)
            const hasAnyChange =
                isNew ||
                [deltaProgressRate, deltaPV, deltaEV].some((d) => d !== undefined && d !== 0)

            // 個々の変更アリナシ
            const hasProgressRateDiff = deltaProgressRate !== undefined && deltaProgressRate !== 0
            const hasPvDiff = deltaPV !== undefined && deltaPV !== 0
            const hasEvDiff = deltaEV !== undefined && deltaEV !== 0

            const fullName = now.getFullTaskName(nowTask)
            const isOverdueAt = nowTask.isOverdueAt(now.baseDate)
            const workload = nowTask.workload

            const prevBaseDate = prevTask ? prev.baseDate : undefined
            const currentBaseDate = now.baseDate
            const baseDate = currentBaseDate

            const daysOverdueAt = formatRelativeDaysNumber(baseDate, nowTask.endDate)
            const daysStrOverdueAt = formatRelativeDays(baseDate, nowTask.endDate)

            diffs.push({
                id: nowTask.id,
                name: nowTask.name,
                fullName,
                assignee: nowTask.assignee,
                parentId: nowTask.parentId,
                deltaProgressRate,
                deltaPV,
                deltaEV,
                prevPV: prevTask?.pv,
                prevEV: prevTask?.ev,
                currentPV: nowTask.pv,
                currentEV: nowTask.ev,
                prevProgressRate: prevTask?.progressRate,
                currentProgressRate: nowTask.progressRate,
                hasDiff: hasAnyChange,
                hasProgressRateDiff,
                hasPvDiff,
                hasEvDiff,
                diffType: isNew ? 'added' : hasAnyChange ? 'modified' : 'none',
                finished: nowTask.finished,
                isOverdueAt,
                workload,
                prevBaseDate,
                currentBaseDate,
                baseDate,
                daysOverdueAt,
                daysStrOverdueAt,
                currentTask: nowTask,
                prevTask,
            })
            // console.log(nowTask.id)
            // console.log(nowTask.plotMap)
        }

        // 削除されたタスク
        for (const prevTask of prevTasks) {
            // isLeaf かつ nowにないタスクのみ後続処理
            if (!prevTask.isLeaf || nowTasksMap.has(prevTask.id)) continue

            const deltaProgressRate = delta(undefined, prevTask.progressRate)
            const deltaPV = delta(undefined, prevTask.pv)
            const deltaEV = delta(undefined, prevTask.ev)

            // 個々の変更アリナシ
            const hasProgressRateDiff = deltaProgressRate !== undefined && deltaProgressRate !== 0
            const hasPvDiff = deltaPV !== undefined && deltaPV !== 0
            const hasEvDiff = deltaEV !== undefined && deltaEV !== 0

            const fullName = prev.getFullTaskName(prevTask)
            const isOverdueAt = prevTask.isOverdueAt(prev.baseDate)
            const workload = prevTask.workload

            const prevBaseDate = prev.baseDate
            const currentBaseDate = undefined
            const baseDate = prevBaseDate

            const daysOverdueAt = formatRelativeDaysNumber(baseDate, prevTask.endDate)
            const daysStrOverdueAt = formatRelativeDays(baseDate, prevTask.endDate)

            diffs.push({
                id: prevTask.id,
                name: prevTask.name,
                fullName,
                assignee: prevTask.assignee,
                parentId: prevTask.parentId,
                deltaProgressRate,
                deltaPV,
                deltaEV,
                prevPV: prevTask.pv,
                prevEV: prevTask.ev,
                currentPV: undefined,
                currentEV: undefined,
                prevProgressRate: prevTask.progressRate,
                currentProgressRate: undefined,
                hasDiff: true, // 削除も常に差分ありとみなす
                hasProgressRateDiff,
                hasPvDiff,
                hasEvDiff,
                diffType: 'removed',
                finished: prevTask.finished,
                isOverdueAt,
                workload,
                prevBaseDate,
                currentBaseDate,
                baseDate,
                daysOverdueAt,
                daysStrOverdueAt,
                currentTask: undefined,
                prevTask,
            })
        }

        return diffs
    }

    // private _calcProgressRafe(group: TaskDiff[]) {
    //     const pv = sumDelta(group.map((g) => g.deltaPV))
    //     const ev = sumDelta(group.map((g) => g.deltaEV))
    //     return calcRate(ev, pv)
    // }

    calculateProjectDiffs(taskDiffs: TaskDiff[]): ProjectDiff[] {
        const result: ProjectDiff[] = tidy(
            taskDiffs.filter((taskDiff) => taskDiff.hasDiff),
            // taskDiffs,
            summarize({
                // deltaProgressRate: (group) => this._calcProgressRate(group),
                deltaPV: (group) => sum(group.map((g) => g.deltaPV)),
                deltaEV: (group) => sum(group.map((g) => g.deltaEV)),
                // deltaSPI: (group) => sumDelta(group.map((g) => g.deltaSPI)), // これはおかしい。
                prevPV: (group) => sum(group.filter((g) => g.hasPvDiff).map((g) => g.prevPV)),
                prevEV: (group) => sum(group.filter((g) => g.hasEvDiff).map((g) => g.prevEV)),
                currentPV: (group) => sum(group.filter((g) => g.hasPvDiff).map((g) => g.currentPV)),
                currentEV: (group) => sum(group.filter((g) => g.hasEvDiff).map((g) => g.currentEV)),
                modifiedCount: (group) => group.filter((g) => g.diffType === 'modified').length,
                addedCount: (group) => group.filter((g) => g.diffType === 'added').length,
                removedCount: (group) => group.filter((g) => g.diffType === 'removed').length,
                hasDiff: (group) =>
                    group.some((g) => ['modified', 'added', 'removed'].includes(g.diffType)),
                finished: (group) => group.every((g) => g.finished),
                // prevBaseDate:(group) => group.map((g) => g.prevBaseDate)?.[0],
                // currentBaseDate:(group) => group.map((g) => g.currentBaseDate)?.[0],
            })
        )
        return result
    }

    calculateAssigneeDiffs(taskDiffs: TaskDiff[]): AssigneeDiff[] {
        const result = tidy(
            taskDiffs.filter((taskDiff) => taskDiff.hasDiff),
            // taskDiffs,
            groupBy('assignee', [
                summarize({
                    // deltaProgressRate: (group) => this._calcProgressRate(group),
                    deltaPV: (group) => sum(group.map((g) => g.deltaPV)),
                    deltaEV: (group) => sum(group.map((g) => g.deltaEV)),
                    // deltaSPI: (group) => sumDelta(group.map((g) => g.deltaSPI)), // これはおかしい。
                    prevPV: (group) => sum(group.filter((g) => g.hasPvDiff).map((g) => g.prevPV)),
                    prevEV: (group) => sum(group.filter((g) => g.hasEvDiff).map((g) => g.prevEV)),
                    currentPV: (group) =>
                        sum(group.filter((g) => g.hasPvDiff).map((g) => g.currentPV)),
                    currentEV: (group) =>
                        sum(group.filter((g) => g.hasEvDiff).map((g) => g.currentEV)),
                    modifiedCount: (group) => group.filter((g) => g.diffType === 'modified').length,
                    addedCount: (group) => group.filter((g) => g.diffType === 'added').length,
                    removedCount: (group) => group.filter((g) => g.diffType === 'removed').length,
                    hasDiff: (group) =>
                        group.some((g) => ['modified', 'added', 'removed'].includes(g.diffType)),
                    finished: (group) => group.every((g) => g.finished),
                    // prevBaseDate:(group) => group.map((g) => g.prevBaseDate)?.[0],
                    // currentBaseDate:(group) => group.map((g) => g.currentBaseDate)?.[0],
                }),
            ])
        )
        return result
    }

    /**
     * existingに対してincomingをマージする。おなじプロジェクト名でおなじ基準日のデータは上書きする。
     * @param existing
     * @param incoming
     * @returns
     */
    mergeProjectStatistics = (
        existing: ProjectStatistics[],
        incoming: ProjectStatistics[]
    ): ProjectStatistics[] => {
        const map = new Map<string, ProjectStatistics>()
        for (const stat of existing) {
            const key = stat.baseDate
            map.set(key, stat)
        }

        for (const stat of incoming) {
            const key = stat.baseDate
            map.set(key, stat) // 同じ基準日は、上書き
        }
        // return Array.from(map.values());
        // 基準日で降順ソート（新しい順）
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.baseDate).getTime() - new Date(a.baseDate).getTime()
        )
    }

    /**
     * 欠落している間のデータを補間して返す
     * (たとえば、土日データを金曜日のデータで補間しています)
     * @param projectStatisticsArray
     * @returns
     */
    fillMissingDates = (projectStatisticsArray: ProjectStatistics[]) => {
        const filledStats: ProjectStatistics[] = []
        if (projectStatisticsArray.length === 0) return filledStats

        const sorted = [...projectStatisticsArray].sort(
            (a, b) => new Date(a.baseDate).getTime() - new Date(b.baseDate).getTime()
        )

        let prev = sorted[0]
        filledStats.push(prev)

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i]
            const date = new Date(prev.baseDate)
            const targetDate = new Date(current.baseDate)

            date.setDate(date.getDate() + 1)

            while (date < targetDate) {
                const clone: ProjectStatistics = {
                    ...prev,
                    baseDate: dateStr(date),
                }
                filledStats.push(clone)
                date.setDate(date.getDate() + 1)
            }

            filledStats.push(current)
            prev = current
        }

        const final = filledStats.sort(
            (a, b) => new Date(b.baseDate).getTime() - new Date(a.baseDate).getTime()
        )
        return final
    }
}

/**
 * bのみがundefinedのばあいはa
 * aのみがundefinedの場合は-b
 * 両方undefinedの場合はundefined
 * あとは a-b
 * @param a
 * @param b
 * @returns
 */
function delta(a?: number, b?: number): number | undefined {
    const aIsNum = typeof a === 'number'
    const bIsNum = typeof b === 'number'

    if (aIsNum && bIsNum) {
        const diff = a - b
        // return diff !== 0 ? diff : undefined
        return diff
    }

    if (aIsNum) return a
    if (bIsNum) return -b

    return undefined
}

export type DiffType = 'modified' | 'added' | 'removed' | 'none'

export type TaskDiffBase = {
    readonly prevPV?: number
    readonly currentPV?: number
    readonly prevEV?: number
    readonly currentEV?: number
    readonly deltaPV?: number
    readonly deltaEV?: number
    // readonly deltaSPI?: number
    readonly hasDiff: boolean
    readonly finished: boolean
}

export type ProjectDiff = {
    modifiedCount: number
    addedCount: number
    removedCount: number
    //
} & TaskDiffBase

export type AssigneeDiff = {
    modifiedCount: number
    addedCount: number
    removedCount: number
    readonly assignee?: string
} & TaskDiffBase

export type TaskDiff = {
    readonly id: number
    readonly name: string
    readonly fullName: string
    readonly assignee?: string
    readonly parentId?: number
    readonly deltaProgressRate?: number
    readonly prevProgressRate?: number
    readonly currentProgressRate?: number
    readonly hasProgressRateDiff: boolean
    readonly hasPvDiff: boolean
    readonly hasEvDiff: boolean
    readonly diffType: DiffType
    readonly isOverdueAt: boolean
    readonly workload?: number
    readonly prevTask?: TaskRow
    readonly currentTask?: TaskRow
    readonly prevBaseDate?: Date
    readonly currentBaseDate?: Date
    readonly baseDate?: Date
    readonly daysOverdueAt?: number
    readonly daysStrOverdueAt?: string
} & TaskDiffBase
