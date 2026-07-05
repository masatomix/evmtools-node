/**
 * spec: phase5-evmethod-knowledge-0.0.34 要件1, 要件2, 要件3, 要件4
 *
 * StatisticsOptions.evMethod の統合テスト（Project 統計経路への一貫反映）。
 * - 要件1.1, 1.3: 未指定 / 'progressRate' で既存の戻り値と完全一致（回帰保証）
 * - 要件4.1: 方式別 EV で SPI を算出
 * - 要件4.2: 完了予測（残作業・etcPrime・完了予測日）への反映
 * - 要件4.3: Earned Schedule（ES / SPI(t) / IEAC(t) / 完了予測日）への反映
 * - 要件4.4: PV・BAC は方式非依存
 * - 要件4.5: 担当者別統計への反映
 * - 要件1.5: TaskRow.ev（Excel 読み込み値）を書き換えない
 */
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
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            plotMap.set(date2Sn(current), true)
        }
        current.setDate(current.getDate() + 1)
    }

    return plotMap
}

/**
 * テスト用のTaskNode生成ヘルパー（actualStartDate 指定可能）
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
        progressRate: number
        scheduledWorkDays: number
        ev: number
        parentId: number
        isLeaf: boolean
        plotMap: Map<number, boolean>
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
        undefined, // actualEndDate
        merged.progressRate,
        merged.scheduledWorkDays,
        undefined, // pv
        merged.ev,
        undefined, // spi
        undefined, // expectedProgressDate
        undefined, // delayDays
        undefined, // remarks
        merged.parentId,
        merged.isLeaf,
        merged.plotMap,
        []
    )
}

/**
 * 固定フィクスチャ:
 * プロジェクト 2025-01-06（月）〜2025-01-10（金）の5稼働日、基準日 2025-01-08（水）。
 * 各タスク workload=5, scheduledWorkDays=5（workloadPerDay=1）。
 * 基準日時点の累積PV: タスクごとに 3、全体で 9。BAC=15。
 *
 * | タスク | 状態 | progressRate | actualStartDate | ev(Excel) |
 * |--------|------|--------------|-----------------|-----------|
 * | A(alice) | 完了 | 1.0 | あり | 5 |
 * | B(bob)   | 仕掛 | 0.4 | あり | 2 |
 * | C(bob)   | 未着手 | 0 | なし | 0 |
 *
 * 方式別の全体EV: progressRate=7 / 0/100=5 / 50/50=7.5
 */
const START = new Date('2025-01-06')
const END = new Date('2025-01-10')
const BASE = new Date('2025-01-08')

const taskDefaults = () => ({
    workload: 5,
    startDate: START,
    endDate: END,
    scheduledWorkDays: 5,
    plotMap: createPlotMap(START, END),
    isLeaf: true,
})

const createTasks = () => [
    createTaskNode({
        ...taskDefaults(),
        id: 1,
        name: '完了タスクA',
        assignee: 'alice',
        progressRate: 1.0,
        actualStartDate: new Date('2025-01-06'),
        ev: 5,
    }),
    createTaskNode({
        ...taskDefaults(),
        id: 2,
        name: '仕掛タスクB',
        assignee: 'bob',
        progressRate: 0.4,
        actualStartDate: new Date('2025-01-06'),
        ev: 2,
    }),
    createTaskNode({
        ...taskDefaults(),
        id: 3,
        name: '未着手タスクC',
        assignee: 'bob',
        progressRate: 0,
        ev: 0,
    }),
]

const createTestProject = () => new Project(createTasks(), BASE, [], START, END, 'evMethodテスト')

describe('Project evMethod 統合', () => {
    describe('回帰保証: evMethod 未指定は既存実装と完全同値（要件1.1, 1.3）', () => {
        it("getStatistics() / getStatistics({}) / getStatistics({ evMethod: 'progressRate' }) の全戻り値が一致する", () => {
            const project = createTestProject()

            const noArg = project.getStatistics()
            const emptyOptions = project.getStatistics({})
            const explicit = project.getStatistics({ evMethod: 'progressRate' })

            expect(emptyOptions).toEqual(noArg)
            expect(explicit).toEqual(noArg)

            // 従来値の絶対値も固定（出来高按分: EV=5+2+0=7, PV=9, SPI=7/9）
            expect(noArg.totalEv).toBe(7)
            expect(noArg.totalPvCalculated).toBe(9)
            expect(noArg.totalWorkloadExcel).toBe(15)
            expect(noArg.spi).toBeCloseTo(7 / 9, 10)
        })

        it("getStatisticsByName() と getStatisticsByName({ evMethod: 'progressRate' }) の全戻り値が一致する", () => {
            const project = createTestProject()
            expect(project.getStatisticsByName({ evMethod: 'progressRate' })).toEqual(
                project.getStatisticsByName()
            )
        })

        it("calculateCompletionForecast() と ({ evMethod: 'progressRate' }) の戻り値が一致する", () => {
            const project = createTestProject()
            expect(project.calculateCompletionForecast({ evMethod: 'progressRate' })).toEqual(
                project.calculateCompletionForecast()
            )
        })

        it("calculateEarnedSchedule() と ({ evMethod: 'progressRate' }) の戻り値が一致する", () => {
            const project = createTestProject()
            const noArg = project.calculateEarnedSchedule()
            const explicit = project.calculateEarnedSchedule({ evMethod: 'progressRate' })

            expect(explicit).toEqual(noArg)
            // 従来値: EV=7 → ES=2+(7-6)/3, SPI(t)=ES/3
            expect(noArg!.es).toBeCloseTo(2 + 1 / 3, 10)
            expect(noArg!.spiT).toBeCloseTo((2 + 1 / 3) / 3, 10)
        })
    })

    describe('方式別 EV / SPI（要件2, 3, 4.1）', () => {
        it("'0/100': EV=完了分のみ5, SPI=5/9", () => {
            const stats = createTestProject().getStatistics({ evMethod: '0/100' })
            expect(stats.totalEv).toBe(5)
            expect(stats.spi).toBeCloseTo(5 / 9, 10)
        })

        it("'50/50': EV=5+2.5+0=7.5, SPI=7.5/9", () => {
            const stats = createTestProject().getStatistics({ evMethod: '50/50' })
            expect(stats.totalEv).toBe(7.5)
            expect(stats.spi).toBeCloseTo(7.5 / 9, 10)
        })

        it('方式別に SPI が異なる（0/100 < progressRate < 50/50）', () => {
            const project = createTestProject()
            const zeroHundred = project.getStatistics({ evMethod: '0/100' }).spi!
            const progressRate = project.getStatistics({ evMethod: 'progressRate' }).spi!
            const fiftyFifty = project.getStatistics({ evMethod: '50/50' }).spi!

            expect(zeroHundred).toBeLessThan(progressRate)
            expect(progressRate).toBeLessThan(fiftyFifty)
        })

        it('PV（totalPvCalculated）と BAC（totalWorkloadExcel）は方式に依存しない（要件4.4）', () => {
            const project = createTestProject()
            for (const evMethod of ['progressRate', '0/100', '50/50'] as const) {
                const stats = project.getStatistics({ evMethod })
                expect(stats.totalPvCalculated).toBe(9)
                expect(stats.totalWorkloadExcel).toBe(15)
                expect(stats.totalPvExcel).toBeUndefined() // Excel 由来 pv 未設定のフィクスチャで不変
            }
        })

        it('TaskRow.ev（Excel 読み込み値）は書き換えられない（要件1.5）', () => {
            const project = createTestProject()
            project.getStatistics({ evMethod: '0/100' })
            project.getStatistics({ evMethod: '50/50' })
            project.getStatisticsByName({ evMethod: '0/100' })
            project.calculateEarnedSchedule({ evMethod: '0/100' })

            const evs = project
                .toTaskRows()
                .filter((t) => t.isLeaf)
                .map((t) => t.ev)
            expect(evs).toEqual([5, 2, 0])
        })
    })

    describe('完了予測への一貫反映（要件4.2）', () => {
        it('getStatistics({ evMethod }).etcPrime が方式別 EV で算出される', () => {
            const project = createTestProject()

            // etcPrime = (BAC − EV) / SPI
            expect(project.getStatistics().etcPrime).toBeCloseTo(8 / (7 / 9), 10) // 既定
            expect(project.getStatistics({ evMethod: '0/100' }).etcPrime).toBeCloseTo(
                10 / (5 / 9),
                10
            )
            expect(project.getStatistics({ evMethod: '50/50' }).etcPrime).toBeCloseTo(
                7.5 / (7.5 / 9),
                10
            )
        })

        it("'0/100' では EV が減り、完了予測日が既定より遅くなる方向に動く", () => {
            const project = createTestProject()

            // dailyPvOverride=3（1日あたり全体PV）で暦日展開を固定
            const base = project.calculateCompletionForecast({
                evMethod: 'progressRate',
                dailyPvOverride: 3,
            })
            const conservative = project.calculateCompletionForecast({
                evMethod: '0/100',
                dailyPvOverride: 3,
            })

            // 残作業: 8 vs 10、burnRate: 3×7/9 vs 3×5/9
            expect(base!.remainingWork).toBe(8)
            expect(conservative!.remainingWork).toBe(10)
            expect(base!.usedSpi).toBeCloseTo(7 / 9, 10)
            expect(conservative!.usedSpi).toBeCloseTo(5 / 9, 10)

            // 8 ÷ (7/3) → 4稼働日 → 2025-01-14（火）、10 ÷ (5/3) → 6稼働日 → 2025-01-16（木）
            expect(base!.forecastDate.toDateString()).toBe(new Date('2025-01-14').toDateString())
            expect(conservative!.forecastDate.toDateString()).toBe(
                new Date('2025-01-16').toDateString()
            )
            expect(conservative!.forecastDate.getTime()).toBeGreaterThan(
                base!.forecastDate.getTime()
            )
        })

        it("'50/50' の完了予測も方式別 EV（7.5）で算出される", () => {
            const project = createTestProject()
            const forecast = project.calculateCompletionForecast({
                evMethod: '50/50',
                dailyPvOverride: 3,
            })

            expect(forecast!.remainingWork).toBe(7.5)
            expect(forecast!.usedSpi).toBeCloseTo(7.5 / 9, 10)
            // 7.5 ÷ 2.5 = 3稼働日 → 2025-01-13（月）
            expect(forecast!.forecastDate.toDateString()).toBe(
                new Date('2025-01-13').toDateString()
            )
        })
    })

    describe('Earned Schedule への一貫反映（要件4.3）', () => {
        // 累積PV曲線 [3,6,9,12,15]、AT=3、PD=5

        it("'0/100': EV=5 → ES=1+(5-3)/3, SPI(t)=ES/3, IEAC(t)≈9, 予測日 2025-01-17", () => {
            const result = createTestProject().calculateEarnedSchedule({ evMethod: '0/100' })

            const expectedEs = 1 + 2 / 3
            expect(result!.es).toBeCloseTo(expectedEs, 10)
            expect(result!.spiT).toBeCloseTo(expectedEs / 3, 10)
            expect(result!.iEacT).toBeCloseTo(5 / (expectedEs / 3), 10) // ≈ 9
            // IEAC(t) は浮動小数点で 9.000000000000002 となり、phase3 の暦日展開は
            // ceil で 10 稼働日に切り上げるため 2025-01-17（金）になる（phase3 既存挙動）
            expect(result!.esForecastDate?.toDateString()).toBe(
                new Date('2025-01-17').toDateString()
            )
        })

        it("'50/50': EV=7.5 → ES=2.5, SPI(t)=2.5/3, IEAC(t)=6, 予測日 2025-01-13", () => {
            const result = createTestProject().calculateEarnedSchedule({ evMethod: '50/50' })

            expect(result!.es).toBeCloseTo(2.5, 10)
            expect(result!.spiT).toBeCloseTo(2.5 / 3, 10)
            expect(result!.iEacT).toBeCloseTo(6, 10)
            expect(result!.esForecastDate?.toDateString()).toBe(
                new Date('2025-01-13').toDateString()
            )
        })

        it("'0/100' では ES 完了予測日が既定より遅くなる方向に動く", () => {
            const project = createTestProject()
            const base = project.calculateEarnedSchedule() // EV=7 → IEAC(t)=45/7 → 7稼働日 → 2025-01-14
            const conservative = project.calculateEarnedSchedule({ evMethod: '0/100' })

            expect(base!.esForecastDate?.toDateString()).toBe(new Date('2025-01-14').toDateString())
            expect(conservative!.esForecastDate!.getTime()).toBeGreaterThan(
                base!.esForecastDate!.getTime()
            )
        })

        it('ES の PV 側入力（AT / PD）は方式に依存しない（要件4.4）', () => {
            const project = createTestProject()
            for (const evMethod of ['progressRate', '0/100', '50/50'] as const) {
                const result = project.calculateEarnedSchedule({ evMethod })
                expect(result!.at).toBe(3)
                expect(result!.pd).toBe(5)
            }
        })
    })

    describe('担当者別統計への一貫反映（要件4.5）', () => {
        const statsOf = (stats: { assignee?: string }[], assignee: string) =>
            stats.find((s) => s.assignee === assignee)

        it("'0/100': alice（完了のみ）EV=5、bob（仕掛+未着手）EV=0・SPI=0", () => {
            const stats = createTestProject().getStatisticsByName({ evMethod: '0/100' }) as ({
                assignee?: string
            } & { totalEv?: number; spi?: number; totalPvCalculated?: number })[]

            const alice = statsOf(stats, 'alice')!
            const bob = statsOf(stats, 'bob')!

            expect(alice.totalEv).toBe(5)
            expect(alice.spi).toBeCloseTo(5 / 3, 10) // aliceのPV=3
            expect(bob.totalEv).toBe(0)
            expect(bob.spi).toBe(0) // 0 ÷ 6
        })

        it("'50/50': bob は仕掛タスクの半分 2.5 が計上され SPI=2.5/6", () => {
            const stats = createTestProject().getStatisticsByName({ evMethod: '50/50' }) as ({
                assignee?: string
            } & { totalEv?: number; spi?: number })[]

            const bob = statsOf(stats, 'bob')!
            expect(bob.totalEv).toBe(2.5)
            expect(bob.spi).toBeCloseTo(2.5 / 6, 10)
        })

        it('担当者別でも PV は方式に依存しない（要件4.4）', () => {
            const project = createTestProject()
            for (const evMethod of ['progressRate', '0/100', '50/50'] as const) {
                const stats = project.getStatisticsByName({ evMethod })
                expect(statsOf(stats, 'alice')!.totalPvCalculated).toBe(3)
                expect(statsOf(stats, 'bob')!.totalPvCalculated).toBe(6)
            }
        })
    })

    describe('フィルタ併用（要件1.2 + filter）', () => {
        it("getStatistics({ filter, evMethod: '50/50' }) はフィルタ後の部分集合に方式を適用する", () => {
            const project = createTestProject()
            const stats = project.getStatistics({ filter: '仕掛', evMethod: '50/50' })

            expect(stats.totalTasksCount).toBe(1)
            expect(stats.totalEv).toBe(2.5) // 仕掛タスクB のみ → 5×0.5
            expect(stats.totalPvCalculated).toBe(3)
            expect(stats.spi).toBeCloseTo(2.5 / 3, 10)
        })

        it('filter のみ指定（evMethod 未指定）は従来どおり Excel 由来の ev を集計する', () => {
            const project = createTestProject()
            const stats = project.getStatistics({ filter: '仕掛' })
            expect(stats.totalEv).toBe(2)
        })
    })
})
