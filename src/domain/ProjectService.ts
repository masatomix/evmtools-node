import { Project } from './Project'

export class ProjectService {
    calculateProjectDiffs(now: Project, prev: Project): TaskDiff[] {
        // key:TaskRow#id, value: TaskRow のMap
        const prevTasksMap = new Map(prev.toTaskRows().map((row) => [row.id, row]))

        return now
            .toTaskRows()
            .filter((nowTask) => nowTask.isLeaf && prevTasksMap.has(nowTask.id)) // isLeaf かつ prevにあるタスクのみ
            .map((nowTask) => {
                const prevTask = prevTasksMap.get(nowTask.id)! //フィルタしたので必ずある
                return {
                    id: nowTask.id,
                    name: nowTask.name,
                    deltaProgressRate: subtract(nowTask.progressRate, prevTask.progressRate),
                    deltaPV: subtract(nowTask.pv, prevTask.pv),
                    deltaEV: subtract(nowTask.ev, prevTask.ev),
                    deltaSPI: subtract(nowTask.spi, prevTask.spi),
                }
            })
    }
}

function subtract(a?: number, b?: number): number | undefined {
    if (typeof a === 'number' && typeof b === 'number') {
        return a - b
    }
    return undefined
}
type TaskDiff = {
    id: number
    name: string
    deltaProgressRate?: number
    deltaPV?: number
    deltaEV?: number
    deltaSPI?: number
}
