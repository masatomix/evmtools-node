import { tidy, groupBy, summarize } from '@tidyjs/tidy'
import { Project } from './Project'
import { TaskRow } from './TaskRow'
import { formatRelativeDays, formatRelativeDaysNumber, sum } from '../common/utils'

export class ProjectService {
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

            const fullName = this.buildFullTaskName(nowTask, nowTasksMap)

            const isOverdueAt = nowTask.isOverdueAt(now.baseDate)

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

            const fullName = this.buildFullTaskName(prevTask, prevTasksMap)
            const isOverdueAt = prevTask.isOverdueAt(prev.baseDate)

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
                deltaPV: (group) => sumDelta(group.map((g) => g.deltaPV)),
                deltaEV: (group) => sumDelta(group.map((g) => g.deltaEV)),
                // deltaSPI: (group) => sumDelta(group.map((g) => g.deltaSPI)), // これはおかしい。
                prevPV: (group) => sumDelta(group.filter((g) => g.hasPvDiff).map((g) => g.prevPV)),
                prevEV: (group) => sumDelta(group.filter((g) => g.hasEvDiff).map((g) => g.prevEV)),
                currentPV: (group) =>
                    sumDelta(group.filter((g) => g.hasPvDiff).map((g) => g.currentPV)),
                currentEV: (group) =>
                    sumDelta(group.filter((g) => g.hasEvDiff).map((g) => g.currentEV)),
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
                    deltaPV: (group) => sumDelta(group.map((g) => g.deltaPV)),
                    deltaEV: (group) => sumDelta(group.map((g) => g.deltaEV)),
                    // deltaSPI: (group) => sumDelta(group.map((g) => g.deltaSPI)), // これはおかしい。
                    prevPV: (group) =>
                        sumDelta(group.filter((g) => g.hasPvDiff).map((g) => g.prevPV)),
                    prevEV: (group) =>
                        sumDelta(group.filter((g) => g.hasEvDiff).map((g) => g.prevEV)),
                    currentPV: (group) =>
                        sumDelta(group.filter((g) => g.hasPvDiff).map((g) => g.currentPV)),
                    currentEV: (group) =>
                        sumDelta(group.filter((g) => g.hasEvDiff).map((g) => g.currentEV)),
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
     * 親を遡って、名前を"/"でjoinする
     * @param task  子のタスク
     * @param taskMap 親のタスクIDも存在する、<id,TaskRow>なMap
     * @returns
     */
    private buildFullTaskName(task: TaskRow, taskMap: Map<number, TaskRow>): string {
        const names: string[] = []
        let current: TaskRow | undefined = task

        while (current) {
            names.unshift(current.name)
            current = current.parentId ? taskMap.get(current.parentId) : undefined
        }

        return names.join('/')
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
    readonly prevTask?: TaskRow
    readonly currentTask?: TaskRow
    readonly prevBaseDate?: Date
    readonly currentBaseDate?: Date
    readonly baseDate?: Date
    readonly daysOverdueAt?: number
    readonly daysStrOverdueAt?: string
} & TaskDiffBase

const sumDelta = (numbers: (number | undefined)[]): number | undefined =>
    sum(
        numbers.filter((v): v is number => v !== undefined),
        3
    )
