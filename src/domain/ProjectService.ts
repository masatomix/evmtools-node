import { tidy, groupBy, summarize } from '@tidyjs/tidy'
import { Project } from './Project'
import { TaskRow } from './TaskRow'
import { sum } from '../common/utils'

export class ProjectService {
    calculateTaskDiffs(now: Project, prev: Project): TaskDiff[] {
        const prevTasks = prev.toTaskRows()
        // key:TaskRow#id, value: TaskRow のMap
        const prevTasksMap = new Map(prevTasks.map((row) => [row.id, row]))
        const nowTasks = now.toTaskRows()
        const nowTasksMap = new Map(nowTasks.map((row) => [row.id, row]))

        const diffs: TaskDiff[] = []

        // 変更 or 追加 の処理を1ループにまとめる
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

            const fullName = this.buildFullTaskName(nowTask, nowTasksMap)
            const finished = nowTask.progressRate === 1.0

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
                diffType: isNew ? 'added' : hasAnyChange ? 'modified' : 'none',
                finished,
                taskRow: nowTask,
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

            const fullName = this.buildFullTaskName(prevTask, prevTasksMap)
            const finished = prevTask.progressRate === 1.0

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
                diffType: 'removed',
                finished,
                taskRow: prevTask,
            })
        }

        return diffs
    }

    // private _calcProgressRafe(group: TaskDiff[]) {
    //     const pv = sumDelta(group.map((g) => g.deltaPV))
    //     const ev = sumDelta(group.map((g) => g.deltaEV))
    //     return calcRate(ev, pv)
    // }

    calculateProjectDiffs(now: Project, prev: Project): ProjectDiff[] {
        const taskDiffs = this.calculateTaskDiffs(now, prev)
        const result: ProjectDiff[] = tidy(
            taskDiffs,
            summarize({
                // deltaProgressRate: (group) => this._calcProgressRate(group),
                deltaPV: (group) => sumDelta(group.map((g) => g.deltaPV)),
                deltaEV: (group) => sumDelta(group.map((g) => g.deltaEV)),
                // deltaSPI: (group) => sumDelta(group.map((g) => g.deltaSPI)), // これはおかしい。
                prevPV: (group) => sumDelta(group.map((g) => g.prevPV)),
                prevEV: (group) => sumDelta(group.map((g) => g.prevEV)),
                currentPV: (group) => sumDelta(group.map((g) => g.currentPV)),
                currentEV: (group) => sumDelta(group.map((g) => g.currentEV)),
                modifiedCount: (group) => group.filter((g) => g.diffType === 'modified').length,
                addedCount: (group) => group.filter((g) => g.diffType === 'added').length,
                removedCount: (group) => group.filter((g) => g.diffType === 'removed').length,
                hasDiff: (group) =>
                    group.some((g) => ['modified', 'added', 'removed'].includes(g.diffType)),
                finished: (group) => group.every((g) => g.finished),
            })
        )
        return result
    }

    calculateAssigneeDiffs(now: Project, prev: Project): AssigneeDiff[] {
        const taskDiffs = this.calculateTaskDiffs(now, prev)
        const result = tidy(
            taskDiffs,
            groupBy('assignee', [
                summarize({
                    // deltaProgressRate: (group) => this._calcProgressRate(group),
                    deltaPV: (group) => sumDelta(group.map((g) => g.deltaPV)),
                    deltaEV: (group) => sumDelta(group.map((g) => g.deltaEV)),
                    // deltaSPI: (group) => sumDelta(group.map((g) => g.deltaSPI)), // これはおかしい。
                    prevPV: (group) => sumDelta(group.map((g) => g.prevPV)),
                    prevEV: (group) => sumDelta(group.map((g) => g.prevEV)),
                    currentPV: (group) => sumDelta(group.map((g) => g.currentPV)),
                    currentEV: (group) => sumDelta(group.map((g) => g.currentEV)),
                    modifiedCount: (group) => group.filter((g) => g.diffType === 'modified').length,
                    addedCount: (group) => group.filter((g) => g.diffType === 'added').length,
                    removedCount: (group) => group.filter((g) => g.diffType === 'removed').length,
                    hasDiff: (group) =>
                        group.some((g) => ['modified', 'added', 'removed'].includes(g.diffType)),
                    finished: (group) => group.every((g) => g.finished),
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
    readonly diffType: DiffType
    readonly taskRow: TaskRow
} & TaskDiffBase

const sumDelta = (numbers: (number | undefined)[]): number | undefined =>
    sum(
        numbers.filter((v): v is number => v !== undefined),
        3
    )
