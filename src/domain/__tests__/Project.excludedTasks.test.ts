import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../Project'
import { TaskNode } from '../TaskNode'

/**
 * テスト用のヘルパー関数：plotMapを生成
 * 指定した開始日から終了日までの稼働日（土日除外）をplotMapに追加
 */
function createPlotMap(startDate: Date, endDate: Date): Map<number, boolean> {
    const plotMap = new Map<number, boolean>()
    const current = new Date(startDate)

    while (current <= endDate) {
        const dayOfWeek = current.getDay()
        // 土日以外をプロット
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            plotMap.set(date2Sn(current), true)
        }
        current.setDate(current.getDate() + 1)
    }

    return plotMap
}

/**
 * テスト用のTaskNode生成ヘルパー
 */
function createTaskNode(overrides: Partial<{
    sharp: number
    id: number
    level: number
    name: string
    assignee: string
    workload: number
    startDate: Date
    endDate: Date
    actualStartDate: Date
    actualEndDate: Date
    progressRate: number
    scheduledWorkDays: number
    pv: number
    ev: number
    spi: number
    expectedProgressDate: Date
    delayDays: number
    remarks: string
    parentId: number
    isLeaf: boolean
    plotMap: Map<number, boolean>
    children: TaskNode[]
}> = {}): TaskNode {
    const defaults = {
        sharp: 1,
        id: 1,
        level: 1,
        name: 'テストタスク',
        isLeaf: true,
    }

    const merged = { ...defaults, ...overrides }

    return new TaskNode(
        merged.sharp,
        merged.id,
        merged.level,
        merged.name,
        merged.assignee,
        merged.workload,
        merged.startDate,
        merged.endDate,
        merged.actualStartDate,
        merged.actualEndDate,
        merged.progressRate,
        merged.scheduledWorkDays,
        merged.pv,
        merged.ev,
        merged.spi,
        merged.expectedProgressDate,
        merged.delayDays,
        merged.remarks,
        merged.parentId,
        merged.isLeaf,
        merged.plotMap,
        merged.children ?? []
    )
}

describe('Project.excludedTasks', () => {
    const baseDate = new Date('2025-01-15')
    const startDate = new Date('2025-01-06')
    const endDate = new Date('2025-01-31')

    describe('TC-01: 全タスクが有効な場合', () => {
        it('excludedTasksが空配列を返す', () => {
            const validTask = createTaskNode({
                id: 1,
                name: '有効なタスク',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })

            const project = new Project([validTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks).toEqual([])
        })
    })

    describe('TC-02: 開始日が未設定のタスクがある場合', () => {
        it('該当タスクがexcludedTasksに含まれる', () => {
            const invalidTask = createTaskNode({
                id: 1,
                name: '開始日なしタスク',
                workload: 5,
                startDate: undefined, // 開始日未設定
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                isLeaf: true,
            })

            const project = new Project([invalidTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks.length).toBe(1)
            expect(project.excludedTasks[0].task.id).toBe(1)
            expect(project.excludedTasks[0].reason).toContain('日付エラー')
        })
    })

    describe('TC-03: 終了日が未設定のタスクがある場合', () => {
        it('該当タスクがexcludedTasksに含まれる', () => {
            const invalidTask = createTaskNode({
                id: 2,
                name: '終了日なしタスク',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: undefined, // 終了日未設定
                scheduledWorkDays: 5,
                isLeaf: true,
            })

            const project = new Project([invalidTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks.length).toBe(1)
            expect(project.excludedTasks[0].task.id).toBe(2)
            expect(project.excludedTasks[0].reason).toContain('日付エラー')
        })
    })

    describe('TC-04: plotMapが未設定のタスクがある場合', () => {
        it('該当タスクがexcludedTasksに含まれる', () => {
            const invalidTask = createTaskNode({
                id: 3,
                name: 'plotMapなしタスク',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: undefined, // plotMap未設定
                isLeaf: true,
            })

            const project = new Project([invalidTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks.length).toBe(1)
            expect(project.excludedTasks[0].task.id).toBe(3)
            expect(project.excludedTasks[0].reason).toContain('plotMapエラー')
        })
    })

    describe('TC-05: 稼働予定日数が0のタスクがある場合', () => {
        it('該当タスクがexcludedTasksに含まれる', () => {
            const invalidTask = createTaskNode({
                id: 4,
                name: '稼働日数ゼロタスク',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 0, // 稼働予定日数0
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })

            const project = new Project([invalidTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks.length).toBe(1)
            expect(project.excludedTasks[0].task.id).toBe(4)
            expect(project.excludedTasks[0].reason).toContain('日数エラー')
        })
    })

    describe('TC-06: 複数の無効タスクがある場合', () => {
        it('全ての無効タスクがexcludedTasksに含まれる', () => {
            const validTask = createTaskNode({
                id: 1,
                name: '有効なタスク',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })

            const invalidTask1 = createTaskNode({
                id: 2,
                name: '無効タスク1',
                startDate: undefined,
                endDate: new Date('2025-01-10'),
                isLeaf: true,
            })

            const invalidTask2 = createTaskNode({
                id: 3,
                name: '無効タスク2',
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 0,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })

            const project = new Project(
                [validTask, invalidTask1, invalidTask2],
                baseDate,
                [],
                startDate,
                endDate,
                'テストプロジェクト'
            )

            expect(project.excludedTasks.length).toBe(2)
            const excludedIds = project.excludedTasks.map(e => e.task.id)
            expect(excludedIds).toContain(2)
            expect(excludedIds).toContain(3)
        })
    })

    describe('TC-07: タスクが0件の場合', () => {
        it('excludedTasksが空配列を返す', () => {
            const project = new Project([], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks).toEqual([])
        })
    })

    describe('TC-08: 親タスク（isLeaf=false）のみ無効な場合', () => {
        it('excludedTasksが空配列を返す（親は対象外）', () => {
            const parentTask = createTaskNode({
                id: 1,
                name: '親タスク',
                startDate: undefined, // 無効な設定
                isLeaf: false, // 親タスク
            })

            const childTask = createTaskNode({
                id: 2,
                name: '子タスク',
                parentId: 1,
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })

            parentTask.children = [childTask]

            const project = new Project([parentTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            // 親タスクは無効だがisLeaf=falseなので対象外
            // 子タスクは有効
            expect(project.excludedTasks).toEqual([])
        })
    })

    describe('TC-09: 日付エラーの場合のreason', () => {
        it('"日付エラー"を含む形式であること', () => {
            const invalidTask = createTaskNode({
                id: 1,
                name: 'テスト',
                startDate: undefined,
                isLeaf: true,
            })

            const project = new Project([invalidTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks[0].reason).toMatch(/日付エラー/)
            expect(project.excludedTasks[0].reason).toMatch(/タスクID:1/)
        })
    })

    describe('TC-10: 日数エラーの場合のreason', () => {
        it('"日数エラー"を含む形式であること', () => {
            const invalidTask = createTaskNode({
                id: 5,
                name: 'テスト',
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 0,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })

            const project = new Project([invalidTask], baseDate, [], startDate, endDate, 'テストプロジェクト')

            expect(project.excludedTasks[0].reason).toMatch(/日数エラー/)
            expect(project.excludedTasks[0].reason).toMatch(/タスクID:5/)
        })
    })
})
