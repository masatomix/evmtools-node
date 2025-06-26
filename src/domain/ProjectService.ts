import { Project } from './Project'
import { TaskRow } from './TaskRow'

export class ProjectService {
    calculateProjectDiffs(now: Project, prev: Project): TaskDiff[] {
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
                const deltaSPI = delta(nowTask.spi, prevTask.spi)

                const hasDiff = [deltaProgressRate, deltaPV, deltaEV, deltaSPI].some(
                    (d) => d !== undefined && d !== 0
                )

                const fullName = this.buildFullTaskName(nowTask, nowTasksMap)

                return {
                    id: nowTask.id,
                    name: fullName,
                    assignee: nowTask.assignee,
                    deltaProgressRate,
                    deltaPV,
                    deltaEV,
                    deltaSPI,
                    hasDiff,
                }
            })
    }

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

function delta(a?: number, b?: number): number | undefined {
    if (typeof a === 'number' && typeof b === 'number') {
        const result = a - b
        return result !== 0 ? result : undefined
    }
    return undefined
}

export type TaskDiff = {
    readonly id: number
    readonly name: string
    readonly assignee?: string
    readonly deltaProgressRate?: number
    readonly deltaPV?: number
    readonly deltaEV?: number
    readonly deltaSPI?: number
    readonly hasDiff: boolean
}
