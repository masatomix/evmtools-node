import { date2Sn } from 'excel-csv-read-write'
import { ProjectService } from '../ProjectService'
import { Project, ProjectStatistics } from '../Project'
import { TaskRow } from '../TaskRow'
import { TaskNode } from '../TaskNode'

/**
 * ProjectServiceのテスト
 * CLAUDE.mdの仕様に基づいて作成
 *
 * calculateTaskDiffs(now, prev):
 * - 2つのProjectを比較し、タスク単位の差分を計算
 * - isLeaf（リーフノード）のみを対象
 * - diffType: 'added' | 'modified' | 'removed' | 'none'
 * - 進捗率、PV、EVの変化量（delta）を計算
 *
 * calculateProjectDiffs(taskDiffs):
 * - タスク差分をプロジェクト全体で集約
 * - 変更・追加・削除の件数をカウント
 *
 * calculateAssigneeDiffs(taskDiffs):
 * - タスク差分を担当者別に集約
 *
 * mergeProjectStatistics(existing, incoming):
 * - 統計データのマージ（同じ基準日は上書き）
 *
 * fillMissingDates(stats):
 * - 欠落日（土日など）を前日データで補間
 */

// ヘルパー関数
function createPlotMap(startDate: Date, endDate: Date): Map<number, boolean> {
    const plotMap = new Map<number, boolean>()
    const current = new Date(startDate)

    while (current <= endDate) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            plotMap.set(date2Sn(current), true)
        }
        current.setDate(current.getDate() + 1)
    }

    return plotMap
}

function createTaskRow(overrides: Partial<{
    sharp: number
    id: number
    level: number
    name: string
    assignee: string
    workload: number
    startDate: Date
    endDate: Date
    progressRate: number
    scheduledWorkDays: number
    pv: number
    ev: number
    parentId: number
    isLeaf: boolean
    plotMap: Map<number, boolean>
}> = {}): TaskRow {
    const startDate = overrides.startDate ?? new Date('2025-06-09')
    const endDate = overrides.endDate ?? new Date('2025-06-13')
    const plotMap = overrides.plotMap ?? createPlotMap(startDate, endDate)

    return new TaskRow(
        overrides.sharp ?? 1,
        overrides.id ?? 1,
        overrides.level ?? 1,
        overrides.name ?? 'テストタスク',
        overrides.assignee ?? '担当者A',
        overrides.workload ?? 5,
        startDate,
        endDate,
        undefined, // actualStartDate
        undefined, // actualEndDate
        overrides.progressRate,
        overrides.scheduledWorkDays ?? 5,
        overrides.pv,
        overrides.ev,
        undefined, // spi
        undefined, // expectedProgressDate
        undefined, // delayDays
        undefined, // remarks
        overrides.parentId,
        overrides.isLeaf ?? true,
        plotMap
    )
}

function createTaskNode(taskRow: TaskRow, children: TaskNode[] = []): TaskNode {
    return TaskNode.fromRow(taskRow, children)
}

function createProject(
    taskNodes: TaskNode[],
    baseDate: Date,
    overrides: Partial<{
        startDate: Date
        endDate: Date
        name: string
    }> = {}
): Project {
    return new Project(
        taskNodes,
        baseDate,
        [], // holidayDatas
        overrides.startDate ?? new Date('2025-06-09'),
        overrides.endDate ?? new Date('2025-06-13'),
        overrides.name ?? 'テストプロジェクト'
    )
}

describe('ProjectService', () => {
    let service: ProjectService

    beforeEach(() => {
        service = new ProjectService()
    })

    describe('calculateTaskDiffs - 2つのProjectを比較し、タスク単位の差分を計算', () => {
        it('変更されたタスクをmodifiedとして検出する', () => {
            const prevTask = createTaskRow({ id: 1, progressRate: 0.3, pv: 3, ev: 1.5, isLeaf: true })
            const nowTask = createTaskRow({ id: 1, progressRate: 0.5, pv: 5, ev: 2.5, isLeaf: true })

            const prevProject = createProject(
                [createTaskNode(prevTask)],
                new Date('2025-06-10')
            )
            const nowProject = createProject(
                [createTaskNode(nowTask)],
                new Date('2025-06-11')
            )

            const diffs = service.calculateTaskDiffs(nowProject, prevProject)

            expect(diffs).toHaveLength(1)
            expect(diffs[0].diffType).toBe('modified')
            expect(diffs[0].deltaProgressRate).toBe(0.2) // 0.5 - 0.3
            expect(diffs[0].deltaPV).toBe(2) // 5 - 3
            expect(diffs[0].deltaEV).toBe(1) // 2.5 - 1.5
        })

        it('追加されたタスクをaddedとして検出する', () => {
            const prevTask = createTaskRow({ id: 1, isLeaf: true })
            const nowTask1 = createTaskRow({ id: 1, isLeaf: true })
            const nowTask2 = createTaskRow({ id: 2, name: '新規タスク', isLeaf: true, pv: 3, ev: 1 })

            const prevProject = createProject(
                [createTaskNode(prevTask)],
                new Date('2025-06-10')
            )
            const nowProject = createProject(
                [createTaskNode(nowTask1), createTaskNode(nowTask2)],
                new Date('2025-06-11')
            )

            const diffs = service.calculateTaskDiffs(nowProject, prevProject)

            const addedDiff = diffs.find(d => d.id === 2)
            expect(addedDiff).toBeDefined()
            expect(addedDiff!.diffType).toBe('added')
        })

        it('削除されたタスクをremovedとして検出する', () => {
            const prevTask1 = createTaskRow({ id: 1, isLeaf: true })
            const prevTask2 = createTaskRow({ id: 2, name: '削除されるタスク', isLeaf: true, pv: 3, ev: 1 })
            const nowTask = createTaskRow({ id: 1, isLeaf: true })

            const prevProject = createProject(
                [createTaskNode(prevTask1), createTaskNode(prevTask2)],
                new Date('2025-06-10')
            )
            const nowProject = createProject(
                [createTaskNode(nowTask)],
                new Date('2025-06-11')
            )

            const diffs = service.calculateTaskDiffs(nowProject, prevProject)

            const removedDiff = diffs.find(d => d.id === 2)
            expect(removedDiff).toBeDefined()
            expect(removedDiff!.diffType).toBe('removed')
        })

        it('変更がないタスクをnoneとして検出する', () => {
            const prevTask = createTaskRow({ id: 1, progressRate: 0.5, pv: 5, ev: 2.5, isLeaf: true })
            const nowTask = createTaskRow({ id: 1, progressRate: 0.5, pv: 5, ev: 2.5, isLeaf: true })

            const prevProject = createProject(
                [createTaskNode(prevTask)],
                new Date('2025-06-10')
            )
            const nowProject = createProject(
                [createTaskNode(nowTask)],
                new Date('2025-06-11')
            )

            const diffs = service.calculateTaskDiffs(nowProject, prevProject)

            expect(diffs).toHaveLength(1)
            expect(diffs[0].diffType).toBe('none')
            expect(diffs[0].hasDiff).toBe(false)
        })

        it('isLeafがfalseのタスク（親タスク）は対象外', () => {
            const prevTask = createTaskRow({ id: 1, isLeaf: false })
            const nowTask = createTaskRow({ id: 1, progressRate: 0.5, isLeaf: false })

            const prevProject = createProject(
                [createTaskNode(prevTask)],
                new Date('2025-06-10')
            )
            const nowProject = createProject(
                [createTaskNode(nowTask)],
                new Date('2025-06-11')
            )

            const diffs = service.calculateTaskDiffs(nowProject, prevProject)

            expect(diffs).toHaveLength(0)
        })
    })

    describe('calculateProjectDiffs - タスク差分をプロジェクト全体で集約', () => {
        it('変更・追加・削除の件数をカウントする', () => {
            const prevTask1 = createTaskRow({ id: 1, progressRate: 0.3, pv: 3, ev: 1, isLeaf: true })
            const prevTask2 = createTaskRow({ id: 2, pv: 2, ev: 1, isLeaf: true })
            const nowTask1 = createTaskRow({ id: 1, progressRate: 0.5, pv: 5, ev: 2, isLeaf: true })
            const nowTask3 = createTaskRow({ id: 3, pv: 4, ev: 2, isLeaf: true })

            const prevProject = createProject(
                [createTaskNode(prevTask1), createTaskNode(prevTask2)],
                new Date('2025-06-10')
            )
            const nowProject = createProject(
                [createTaskNode(nowTask1), createTaskNode(nowTask3)],
                new Date('2025-06-11')
            )

            const taskDiffs = service.calculateTaskDiffs(nowProject, prevProject)
            const projectDiffs = service.calculateProjectDiffs(taskDiffs)

            expect(projectDiffs).toHaveLength(1)
            expect(projectDiffs[0].modifiedCount).toBe(1) // id:1が変更
            expect(projectDiffs[0].addedCount).toBe(1) // id:3が追加
            expect(projectDiffs[0].removedCount).toBe(1) // id:2が削除
            expect(projectDiffs[0].hasDiff).toBe(true)
        })
    })

    describe('calculateAssigneeDiffs - タスク差分を担当者別に集約', () => {
        it('担当者別にdeltaPV、deltaEVを集計する', () => {
            const prevTaskA = createTaskRow({ id: 1, assignee: '担当者A', pv: 3, ev: 1, isLeaf: true })
            const prevTaskB = createTaskRow({ id: 2, assignee: '担当者B', pv: 2, ev: 1, isLeaf: true })
            const nowTaskA = createTaskRow({ id: 1, assignee: '担当者A', pv: 5, ev: 3, isLeaf: true })
            const nowTaskB = createTaskRow({ id: 2, assignee: '担当者B', pv: 4, ev: 2, isLeaf: true })

            const prevProject = createProject(
                [createTaskNode(prevTaskA), createTaskNode(prevTaskB)],
                new Date('2025-06-10')
            )
            const nowProject = createProject(
                [createTaskNode(nowTaskA), createTaskNode(nowTaskB)],
                new Date('2025-06-11')
            )

            const taskDiffs = service.calculateTaskDiffs(nowProject, prevProject)
            const assigneeDiffs = service.calculateAssigneeDiffs(taskDiffs)

            const diffA = assigneeDiffs.find(d => d.assignee === '担当者A')
            const diffB = assigneeDiffs.find(d => d.assignee === '担当者B')

            expect(diffA).toBeDefined()
            expect(diffA!.deltaPV).toBe(2) // 5 - 3
            expect(diffA!.deltaEV).toBe(2) // 3 - 1

            expect(diffB).toBeDefined()
            expect(diffB!.deltaPV).toBe(2) // 4 - 2
            expect(diffB!.deltaEV).toBe(1) // 2 - 1
        })
    })

    describe('mergeProjectStatistics - 統計データのマージ（同じ基準日は上書き）', () => {
        it('同じ基準日のデータは上書きされる', () => {
            const existing: ProjectStatistics[] = [
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/10', totalPvExcel: 10 },
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/11', totalPvExcel: 15 },
            ]
            const incoming: ProjectStatistics[] = [
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/10', totalPvExcel: 12 }, // 上書き
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/12', totalPvExcel: 20 }, // 新規
            ]

            const merged = service.mergeProjectStatistics(existing, incoming)

            expect(merged).toHaveLength(3)

            const date10 = merged.find(s => s.baseDate === '2025/06/10')
            expect(date10!.totalPvExcel).toBe(12) // 上書きされている

            const date12 = merged.find(s => s.baseDate === '2025/06/12')
            expect(date12!.totalPvExcel).toBe(20) // 新規追加
        })

        it('結果は基準日の降順（新しい順）でソートされる', () => {
            const existing: ProjectStatistics[] = [
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/10' },
            ]
            const incoming: ProjectStatistics[] = [
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/12' },
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/08' },
            ]

            const merged = service.mergeProjectStatistics(existing, incoming)

            expect(merged[0].baseDate).toBe('2025/06/12')
            expect(merged[1].baseDate).toBe('2025/06/10')
            expect(merged[2].baseDate).toBe('2025/06/08')
        })
    })

    describe('fillMissingDates - 欠落日（土日など）を前日データで補間', () => {
        it('欠落している日付を前日のデータで補間する', () => {
            const stats: ProjectStatistics[] = [
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/09', totalPvExcel: 10 },
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/12', totalPvExcel: 20 },
            ]

            const filled = service.fillMissingDates(stats)

            expect(filled).toHaveLength(4) // 09, 10, 11, 12

            const date10 = filled.find(s => s.baseDate === '2025/06/10')
            expect(date10!.totalPvExcel).toBe(10) // 09のデータで補間

            const date11 = filled.find(s => s.baseDate === '2025/06/11')
            expect(date11!.totalPvExcel).toBe(10) // 09のデータで補間
        })

        it('空配列の場合は空配列を返す', () => {
            const filled = service.fillMissingDates([])

            expect(filled).toHaveLength(0)
        })

        it('結果は基準日の降順でソートされる', () => {
            const stats: ProjectStatistics[] = [
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/09', totalPvExcel: 10 },
                { projectName: 'P1', startDate: '2025/06/01', endDate: '2025/06/30', baseDate: '2025/06/11', totalPvExcel: 15 },
            ]

            const filled = service.fillMissingDates(stats)

            expect(filled[0].baseDate).toBe('2025/06/11')
            expect(filled[1].baseDate).toBe('2025/06/10')
            expect(filled[2].baseDate).toBe('2025/06/09')
        })
    })
})
