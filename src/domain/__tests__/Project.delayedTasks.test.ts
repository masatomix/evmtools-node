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
function createTaskNode(
    overrides: Partial<{
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
    }> = {}
): TaskNode {
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

describe('Project.getDelayedTasks', () => {
    const projectStartDate = new Date('2025-01-06')
    const projectEndDate = new Date('2025-01-31')

    describe('TC-01: 遅延タスクがない場合', () => {
        it('空配列を返す', () => {
            const baseDate = new Date('2025-01-15')
            // endDate > baseDate なので遅延なし
            const task = createTaskNode({
                id: 1,
                name: '遅延なしタスク',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-20'), // baseDate(1/15)より後
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-20')),
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-02: 遅延タスクがある場合', () => {
        it('該当タスクが結果に含まれる', () => {
            const baseDate = new Date('2025-01-20')
            // endDate < baseDate なので遅延あり
            const delayedTask = createTaskNode({
                id: 1,
                name: '遅延タスク',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-17'), // baseDate(1/20)より前 → 3日遅延
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project(
                [delayedTask],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            const result = project.getDelayedTasks()
            expect(result.length).toBe(1)
            expect(result[0].id).toBe(1)
        })
    })

    describe('TC-03: 複数の遅延タスクがある場合', () => {
        it('遅延日数の降順でソートされる', () => {
            const baseDate = new Date('2025-01-20')

            const task1 = createTaskNode({
                id: 1,
                name: '3日遅延',
                endDate: new Date('2025-01-17'), // 3日遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            const task2 = createTaskNode({
                id: 2,
                name: '5日遅延',
                endDate: new Date('2025-01-15'), // 5日遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            const task3 = createTaskNode({
                id: 3,
                name: '1日遅延',
                endDate: new Date('2025-01-19'), // 1日遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project(
                [task1, task2, task3],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            const result = project.getDelayedTasks()
            expect(result.length).toBe(3)
            // 降順: 5日遅延 → 3日遅延 → 1日遅延
            expect(result[0].id).toBe(2) // 5日遅延
            expect(result[1].id).toBe(1) // 3日遅延
            expect(result[2].id).toBe(3) // 1日遅延
        })
    })

    describe('TC-04: minDaysを指定した場合', () => {
        it('閾値より大きい遅延のみ抽出される', () => {
            const baseDate = new Date('2025-01-20')

            const task1 = createTaskNode({
                id: 1,
                name: '3日遅延',
                endDate: new Date('2025-01-17'), // 3日遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            const task2 = createTaskNode({
                id: 2,
                name: '5日遅延',
                endDate: new Date('2025-01-15'), // 5日遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project(
                [task1, task2],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            // minDays=3: 3日より大きい遅延のみ（5日遅延のみ）
            const result = project.getDelayedTasks(3)
            expect(result.length).toBe(1)
            expect(result[0].id).toBe(2) // 5日遅延のみ
        })
    })

    describe('TC-05: 完了タスク（finished=true）', () => {
        it('結果に含まれない', () => {
            const baseDate = new Date('2025-01-20')

            const completedTask = createTaskNode({
                id: 1,
                name: '完了済み遅延タスク',
                endDate: new Date('2025-01-17'), // 3日遅延だが完了済み
                isLeaf: true,
                progressRate: 1.0, // 完了
            })

            const project = new Project(
                [completedTask],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-06: 親タスク（isLeaf=false）', () => {
        it('結果に含まれない', () => {
            const baseDate = new Date('2025-01-20')

            const parentTask = createTaskNode({
                id: 1,
                name: '親タスク',
                endDate: new Date('2025-01-17'), // 遅延しているが親
                isLeaf: false, // 親タスク
                progressRate: 0.5,
            })

            const childTask = createTaskNode({
                id: 2,
                name: '子タスク',
                parentId: 1,
                endDate: new Date('2025-01-25'), // 遅延なし
                isLeaf: true,
                progressRate: 0.5,
            })

            parentTask.children = [childTask]

            const project = new Project(
                [parentTask],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            // 親タスクは除外、子タスクは遅延なし
            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-07: endDateがundefined', () => {
        it('結果に含まれない', () => {
            const baseDate = new Date('2025-01-20')

            const taskWithoutEndDate = createTaskNode({
                id: 1,
                name: 'endDateなし',
                endDate: undefined, // endDate未設定
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project(
                [taskWithoutEndDate],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-08: delayDaysが0（minDays=0）', () => {
        it('結果に含まれない（> であり >= ではない）', () => {
            const baseDate = new Date('2025-01-20')

            // endDate = baseDate → delayDays = 0
            const task = createTaskNode({
                id: 1,
                name: '当日期限',
                endDate: new Date('2025-01-20'), // baseDate と同じ
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            // delayDays=0 は minDays=0 より大きくないので除外
            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-09: delayDaysが負（前倒し）', () => {
        it('結果に含まれない', () => {
            const baseDate = new Date('2025-01-20')

            // endDate > baseDate → delayDays = 負
            const task = createTaskNode({
                id: 1,
                name: '前倒しタスク',
                endDate: new Date('2025-01-23'), // 3日後
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-10: 返り値がTaskRow[]である', () => {
        it('TaskRowのプロパティがそのまま使える', () => {
            const baseDate = new Date('2025-01-20')

            const task = createTaskNode({
                id: 1,
                name: '遅延タスク',
                assignee: '担当者A',
                endDate: new Date('2025-01-17'),
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            const result = project.getDelayedTasks()
            expect(result.length).toBe(1)
            // TaskRowのプロパティにアクセス可能
            expect(result[0].id).toBe(1)
            expect(result[0].name).toBe('遅延タスク')
            expect(result[0].assignee).toBe('担当者A')
            expect(result[0].progressRate).toBe(0.5)
        })
    })

    describe('TC-11: getFullTaskName()と組み合わせて使用可能', () => {
        it('フルパス名を取得できる', () => {
            const baseDate = new Date('2025-01-20')

            const parentTask = createTaskNode({
                id: 1,
                name: '親タスク',
                endDate: new Date('2025-01-25'),
                isLeaf: false,
            })

            const childTask = createTaskNode({
                id: 2,
                name: '遅延子タスク',
                parentId: 1,
                endDate: new Date('2025-01-17'), // 遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            parentTask.children = [childTask]

            const project = new Project(
                [parentTask],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            const result = project.getDelayedTasks()
            expect(result.length).toBe(1)

            const fullName = project.getFullTaskName(result[0])
            expect(fullName).toBe('親タスク/遅延子タスク')
        })
    })

    describe('TC-12: タスクが0件の場合', () => {
        it('空配列を返す', () => {
            const baseDate = new Date('2025-01-20')

            const project = new Project([], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-13: minDays=5, delayDays=5', () => {
        it('含まれない（> であり >= ではない）', () => {
            const baseDate = new Date('2025-01-20')

            // 5日遅延
            const task = createTaskNode({
                id: 1,
                name: '5日遅延',
                endDate: new Date('2025-01-15'), // 20 - 15 = 5日遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            // minDays=5, delayDays=5 → 5 > 5 は false
            expect(project.getDelayedTasks(5)).toEqual([])
        })
    })

    describe('TC-14: minDays=5, delayDays=6', () => {
        it('含まれる', () => {
            const baseDate = new Date('2025-01-20')

            // 6日遅延
            const task = createTaskNode({
                id: 1,
                name: '6日遅延',
                endDate: new Date('2025-01-14'), // 20 - 14 = 6日遅延
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            // minDays=5, delayDays=6 → 6 > 5 は true
            const result = project.getDelayedTasks(5)
            expect(result.length).toBe(1)
            expect(result[0].id).toBe(1)
        })
    })

    describe('TC-15: baseDate=1/20, endDate=1/17', () => {
        it('delayDays=3（3日遅延）', () => {
            const baseDate = new Date('2025-01-20')

            const task = createTaskNode({
                id: 1,
                name: '3日遅延タスク',
                endDate: new Date('2025-01-17'),
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            // minDays=2 で取得できる（3 > 2）
            expect(project.getDelayedTasks(2).length).toBe(1)
            // minDays=3 で取得できない（3 > 3 は false）
            expect(project.getDelayedTasks(3).length).toBe(0)
        })
    })

    describe('TC-16: baseDate=1/20, endDate=1/20', () => {
        it('delayDays=0（対象外）', () => {
            const baseDate = new Date('2025-01-20')

            const task = createTaskNode({
                id: 1,
                name: '当日期限タスク',
                endDate: new Date('2025-01-20'),
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            expect(project.getDelayedTasks()).toEqual([])
        })
    })

    describe('TC-17: baseDate=1/20, endDate=1/23', () => {
        it('delayDays=-3（対象外）', () => {
            const baseDate = new Date('2025-01-20')

            const task = createTaskNode({
                id: 1,
                name: '前倒しタスク',
                endDate: new Date('2025-01-23'), // 3日後
                isLeaf: true,
                progressRate: 0.5,
            })

            const project = new Project([task], baseDate, [], projectStartDate, projectEndDate, 'テストプロジェクト')

            expect(project.getDelayedTasks()).toEqual([])
        })
    })
})
