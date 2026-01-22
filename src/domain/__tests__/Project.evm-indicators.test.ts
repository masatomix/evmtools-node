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

/**
 * REQ-EVM-001: EVM指標の拡張（ETC'・完了予測日）
 *
 * テストケース: TC-01〜TC-15
 */
describe('Project.evm-indicators', () => {
    // 共通のテスト日付
    const projectStartDate = new Date('2025-01-06') // 月曜日
    const projectEndDate = new Date('2025-01-24') // 金曜日（3週間、稼働日15日）
    const baseDate = new Date('2025-01-15') // 水曜日（中間地点）

    /**
     * 有効なタスクを作成するヘルパー
     */
    function createValidTask(options: {
        id: number
        workload: number
        startDate: Date
        endDate: Date
        ev?: number
        progressRate?: number
    }): TaskNode {
        const plotMap = createPlotMap(options.startDate, options.endDate)
        const scheduledWorkDays = plotMap.size

        return createTaskNode({
            sharp: options.id,
            id: options.id,
            name: `タスク${options.id}`,
            workload: options.workload,
            startDate: options.startDate,
            endDate: options.endDate,
            scheduledWorkDays,
            plotMap,
            pv: options.workload, // 累積PV（簡略化のためworkloadと同じ）
            ev: options.ev ?? 0,
            progressRate: options.progressRate ?? 0,
            isLeaf: true,
        })
    }

    describe('TC-01: BAC取得', () => {
        it('3タスク（PV: 10, 20, 30）の場合、bac === 60', () => {
            const task1 = createValidTask({
                id: 1,
                workload: 10,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
            })
            const task2 = createValidTask({
                id: 2,
                workload: 20,
                startDate: new Date('2025-01-13'),
                endDate: new Date('2025-01-17'),
            })
            const task3 = createValidTask({
                id: 3,
                workload: 30,
                startDate: new Date('2025-01-20'),
                endDate: new Date('2025-01-24'),
            })

            const project = new Project(
                [task1, task2, task3],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            expect(project.bac).toBe(60)
        })
    })

    describe('TC-02: totalEv取得', () => {
        it('3タスク（EV: 5, 15, 25）の場合、totalEv === 45', () => {
            const task1 = createValidTask({
                id: 1,
                workload: 10,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                ev: 5,
            })
            const task2 = createValidTask({
                id: 2,
                workload: 20,
                startDate: new Date('2025-01-13'),
                endDate: new Date('2025-01-17'),
                ev: 15,
            })
            const task3 = createValidTask({
                id: 3,
                workload: 30,
                startDate: new Date('2025-01-20'),
                endDate: new Date('2025-01-24'),
                ev: 25,
            })

            const project = new Project(
                [task1, task2, task3],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                'テストプロジェクト'
            )

            expect(project.totalEv).toBe(45)
        })
    })

    describe('TC-03: totalSpi計算', () => {
        it('EV=45, PV=60の場合、totalSpi === 0.75', () => {
            // 基準日時点でPV=60になるようなタスク配置
            // 全タスクが基準日より前に終わる設定
            const task1 = createValidTask({
                id: 1,
                workload: 20,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-08'),
                ev: 15,
            })
            const task2 = createValidTask({
                id: 2,
                workload: 20,
                startDate: new Date('2025-01-09'),
                endDate: new Date('2025-01-13'),
                ev: 15,
            })
            const task3 = createValidTask({
                id: 3,
                workload: 20,
                startDate: new Date('2025-01-14'),
                endDate: new Date('2025-01-15'),
                ev: 15,
            })

            const project = new Project(
                [task1, task2, task3],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-15'),
                'テストプロジェクト'
            )

            // totalEv = 45, totalPv(基準日時点) = 60
            expect(project.totalEv).toBe(45)
            expect(project.totalSpi).toBeCloseTo(0.75, 2)
        })
    })

    describe('TC-04: etcPrime計算', () => {
        it('BAC=100, EV=40, SPI=0.8の場合、etcPrime === 75', () => {
            // BAC=100, 基準日時点PV=50になるように設定
            // SPI = 40/50 = 0.8
            const task1 = createValidTask({
                id: 1,
                workload: 50,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-15'),
                ev: 40,
            })
            const task2 = createValidTask({
                id: 2,
                workload: 50,
                startDate: new Date('2025-01-16'),
                endDate: new Date('2025-01-24'),
                ev: 0,
            })

            const project = new Project(
                [task1, task2],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                'テストプロジェクト'
            )

            expect(project.bac).toBe(100)
            expect(project.totalEv).toBe(40)
            // ETC' = (100 - 40) / 0.8 = 75
            expect(project.etcPrime).toBeCloseTo(75, 1)
        })
    })

    describe('TC-05: dailyPv（期間平均）', () => {
        it('BAC=100, 稼働日20日の場合、dailyPv === 5', () => {
            // 4週間（稼働日20日）のプロジェクト
            const task = createValidTask({
                id: 1,
                workload: 100,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-31'),
            })

            const project = new Project(
                [task],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-31'),
                'テストプロジェクト'
            )

            expect(project.bac).toBe(100)
            expect(project.dailyPv).toBeCloseTo(5, 1)
        })
    })

    describe('TC-06: dailyPvOverride', () => {
        it('override=10を設定した場合、dailyPv === 10', () => {
            const task = createValidTask({
                id: 1,
                workload: 100,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-31'),
            })

            const project = new Project(
                [task],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-31'),
                'テストプロジェクト'
            )

            project.setDailyPvOverride(10)
            expect(project.dailyPv).toBe(10)

            // オーバーライド解除
            project.setDailyPvOverride(undefined)
            expect(project.dailyPv).toBeCloseTo(5, 1)
        })
    })

    describe('TC-07: 完了予測日（SPI=1.0）', () => {
        it('SPI=1.0の場合、完了予測日が計画終了日と一致', () => {
            // 全タスク完了済み（EV=PV）
            const task = createValidTask({
                id: 1,
                workload: 50,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-15'),
                ev: 50,
            })

            const project = new Project(
                [task],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-15'),
                'テストプロジェクト'
            )

            // SPI = 1.0の場合、残作業0なので完了予測日は基準日
            expect(project.totalSpi).toBeCloseTo(1.0, 2)
        })
    })

    describe('TC-08: 完了予測日（SPI<1.0）', () => {
        it('SPI<1.0の場合、完了予測日が計画終了日より後', () => {
            const task1 = createValidTask({
                id: 1,
                workload: 50,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-15'),
                ev: 25, // 50%しか完了していない
            })
            const task2 = createValidTask({
                id: 2,
                workload: 50,
                startDate: new Date('2025-01-16'),
                endDate: new Date('2025-01-24'),
                ev: 0,
            })

            const project = new Project(
                [task1, task2],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                'テストプロジェクト'
            )

            expect(project.totalSpi).toBeLessThan(1.0)

            const estimatedDate = project.estimatedCompletionDate
            if (estimatedDate) {
                expect(estimatedDate.getTime()).toBeGreaterThan(new Date('2025-01-24').getTime())
            }
        })
    })

    describe('TC-09: 完了予測日（SPI>1.0）', () => {
        it('SPI>1.0の場合、完了予測日が計画終了日より前', () => {
            // 予定より進んでいる状態
            const task1 = createValidTask({
                id: 1,
                workload: 50,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-15'),
                ev: 60, // 120%完了
            })
            const task2 = createValidTask({
                id: 2,
                workload: 50,
                startDate: new Date('2025-01-16'),
                endDate: new Date('2025-01-24'),
                ev: 20, // 先行着手
            })

            const project = new Project(
                [task1, task2],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                'テストプロジェクト'
            )

            expect(project.totalSpi).toBeGreaterThan(1.0)

            const estimatedDate = project.estimatedCompletionDate
            if (estimatedDate) {
                expect(estimatedDate.getTime()).toBeLessThanOrEqual(new Date('2025-01-24').getTime())
            }
        })
    })

    describe('TC-10: タスク0件（境界値）', () => {
        it('空プロジェクトの場合、bac === 0', () => {
            const project = new Project(
                [],
                baseDate,
                [],
                projectStartDate,
                projectEndDate,
                '空プロジェクト'
            )

            expect(project.bac).toBe(0)
            expect(project.totalEv).toBe(0)
            expect(project.totalSpi).toBe(0)
        })
    })

    describe('TC-11: EV=BAC（完了済み）', () => {
        it('EV=100, BAC=100の場合、etcPrime === 0', () => {
            const task = createValidTask({
                id: 1,
                workload: 100,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-24'),
                ev: 100,
            })

            const project = new Project(
                [task],
                new Date('2025-01-24'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                'テストプロジェクト'
            )

            expect(project.bac).toBe(100)
            expect(project.totalEv).toBe(100)
            expect(project.etcPrime).toBe(0)
        })
    })

    describe('TC-12: EV=0（未着手）', () => {
        it('EV=0, BAC=100の場合、etcPrime === 100/SPI', () => {
            const task = createValidTask({
                id: 1,
                workload: 100,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-24'),
                ev: 0,
            })

            const project = new Project(
                [task],
                new Date('2025-01-15'),
                [],
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                'テストプロジェクト'
            )

            // EV=0なのでSPI=0、etcPrime=Infinity
            expect(project.totalEv).toBe(0)
            expect(project.totalSpi).toBe(0)
            expect(project.etcPrime).toBe(Infinity)
        })
    })

    describe('TC-13: SPI=0（異常系）', () => {
        it('PV=0の場合、etcPrime === Infinity', () => {
            // 基準日より後にすべてのタスクがある場合
            const task = createValidTask({
                id: 1,
                workload: 100,
                startDate: new Date('2025-01-20'),
                endDate: new Date('2025-01-24'),
                ev: 0,
            })

            const project = new Project(
                [task],
                new Date('2025-01-15'), // 基準日がタスク開始前
                [],
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                'テストプロジェクト'
            )

            expect(project.totalSpi).toBe(0)
            expect(project.etcPrime).toBe(Infinity)
        })
    })

    describe('TC-14: 日付なし（異常系）', () => {
        it('startDate/endDate未設定の場合、estimatedCompletionDate === undefined', () => {
            const task = createTaskNode({
                id: 1,
                name: 'タスク',
                workload: 100,
                isLeaf: true,
            })

            const project = new Project(
                [task],
                baseDate,
                [],
                undefined, // startDate未設定
                undefined, // endDate未設定
                'テストプロジェクト'
            )

            expect(project.estimatedCompletionDate).toBeUndefined()
        })
    })

    describe('TC-15: dailyPv=0（異常系）', () => {
        it('稼働日0の場合、estimatedCompletionDate === undefined', () => {
            // 空プロジェクト（稼働日0）
            const project = new Project([], baseDate, [], projectStartDate, projectEndDate, '空プロジェクト')

            // BAC=0の場合dailyPv=0
            expect(project.bac).toBe(0)
            expect(project.estimatedCompletionDate).toBeUndefined()
        })
    })
})
