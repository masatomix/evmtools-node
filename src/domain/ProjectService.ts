import { tidy, groupBy, summarize } from '@tidyjs/tidy'
import { Project } from './Project'
import { TaskRow } from './TaskRow'
import { sum } from '../common/utils'

export class ProjectService {
    calculateTaskDiffs(now: Project, prev: Project): TaskDiff[] {
        // key:TaskRow#id, value: TaskRow のMap
        const prevTasksMap = new Map(prev.toTaskRows().map((row) => [row.id, row]))
        const nowTasks = now.toTaskRows()
        const nowTasksMap = new Map(nowTasks.map((row) => [row.id, row]))

        return nowTasks
            .filter((nowTask) => nowTask.isLeaf && prevTasksMap.has(nowTask.id)) // isLeaf かつ prevにあるタスクのみ
            .map((nowTask) => {
                const prevTask = prevTasksMap.get(nowTask.id)! //フィルタしたので必ずある

                const deltaProgressRate = delta(nowTask.progressRate, prevTask.progressRate)
                const deltaPV = delta(nowTask.pv, prevTask.pv)
                const deltaEV = delta(nowTask.ev, prevTask.ev)
                // const deltaSPI = delta(nowTask.spi, prevTask.spi)

                const hasDiff = [deltaProgressRate, deltaPV, deltaEV /*deltaSPI*/].some(
                    (d) => d !== undefined && d !== 0
                )

                const fullName = this.buildFullTaskName(nowTask, nowTasksMap)
                const finished = nowTask.progressRate === 1.0

                const taskDiffs: TaskDiff = {
                    id: nowTask.id,
                    name: nowTask.name,
                    fullName,
                    assignee: nowTask.assignee,
                    parentId: nowTask.parentId,
                    deltaProgressRate,
                    deltaPV,
                    deltaEV,
                    // deltaSPI,
                    hasDiff,
                    finished,
                }

                return taskDiffs
            })
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
                hasDiff: (group) => group.some((g) => g.hasDiff),
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
                    hasDiff: (group) => group.some((g) => g.hasDiff),
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
 * a-bがゼロの場合は変化なしの意味でundefined
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

export type TaskDiffBase = {
    readonly deltaPV?: number
    readonly deltaEV?: number
    // readonly deltaSPI?: number
    readonly hasDiff: boolean
    readonly finished: boolean
}

export type ProjectDiff = {
    //
} & TaskDiffBase

export type AssigneeDiff = {
    readonly assignee?: string
} & TaskDiffBase

export type TaskDiff = {
    readonly id: number
    readonly name: string
    readonly fullName: string
    readonly assignee?: string
    readonly parentId?: number
    readonly deltaProgressRate?: number
} & TaskDiffBase

const sumDelta = (numbers: (number | undefined)[]): number | undefined =>
    sum(
        numbers.filter((v): v is number => v !== undefined),
        3
    )
