/**
 * spec: phase3-earned-schedule-0.0.32 要件2, 要件3, 要件5, 要件6
 *
 * Project.calculateEarnedSchedule の統合テスト。
 * - 累積PV曲線の稼働日構成（要件6.1）・メモ化（要件6.2）・休日跨ぎ一貫性（要件6.3）
 * - 完了予測日の暦日展開（要件2.8）
 * - フィルタ部分集合（要件5.1〜5.3）
 * - 終盤の古典 SPI 1.0 収束 vs SPI(t) 乖離の実証（要件3.1, 3.2）
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
        progressRate: number
        scheduledWorkDays: number
        ev: number
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
        undefined, // actualStartDate
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
        merged.children ?? []
    )
}

/**
 * テスト用Projectを生成するヘルパー
 */
function createTestProject(
    tasks: TaskNode[],
    options?: {
        baseDate?: Date
        startDate?: Date
        endDate?: Date
    }
): Project {
    const baseDate = options?.baseDate ?? new Date('2025-01-08')
    const startDate = options?.startDate ?? new Date('2025-01-06')
    const endDate = options?.endDate ?? new Date('2025-01-10')

    return new Project(tasks, baseDate, [], startDate, endDate, 'テストプロジェクト')
}

/**
 * 5稼働日（2025-01-06 月〜2025-01-10 金）× workload 5（workloadPerDay=1）のタスク。
 * 累積PV曲線は [1,2,3,4,5] となる。
 */
const createFiveDayTask = (ev: number, overrides: Parameters<typeof createTaskNode>[0] = {}) =>
    createTaskNode({
        id: 1,
        workload: 5,
        ev,
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-01-10'),
        scheduledWorkDays: 5,
        plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
        isLeaf: true,
        ...overrides,
    })

/**
 * 10稼働日（2025-01-06 月〜2025-01-17 金、土日を挟む）× workload 10 のタスク。
 * 累積PV曲線は稼働日ベースで [1,2,...,10] となる。
 */
const createTenDayTask = (ev: number, overrides: Parameters<typeof createTaskNode>[0] = {}) =>
    createTaskNode({
        id: 1,
        workload: 10,
        ev,
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-01-17'),
        scheduledWorkDays: 10,
        plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
        isLeaf: true,
        ...overrides,
    })

describe('Project.calculateEarnedSchedule', () => {
    describe('基本ケース: 5稼働日 × workloadPerDay=1（手計算一致）', () => {
        it('計画どおり（EV=3, 基準日=3稼働日目）→ ES=3, SPI(t)=1, SV(t)=0, IEAC(t)=5, 予測日=計画終了日', () => {
            const project = createTestProject([createFiveDayTask(3)], {
                baseDate: new Date('2025-01-08'), // 水: AT=3
            })

            const result = project.calculateEarnedSchedule()
            expect(result).toBeDefined()
            expect(result!.es).toBe(3)
            expect(result!.at).toBe(3)
            expect(result!.pd).toBe(5)
            expect(result!.spiT).toBeCloseTo(1, 10)
            expect(result!.svT).toBeCloseTo(0, 10)
            expect(result!.iEacT).toBeCloseTo(5, 10)
            // IEAC(t)=5稼働日 → 開始日から5稼働日目 = 2025-01-10（金）= 計画終了日
            expect(result!.esForecastDate?.toDateString()).toBe(
                new Date('2025-01-10').toDateString()
            )
        })

        it('遅延（EV=2.5, AT=3）→ ES=2.5（補間）、予測日は土日を跨いで 2025-01-13（月）（要件2.8）', () => {
            const project = createTestProject([createFiveDayTask(2.5)], {
                baseDate: new Date('2025-01-08'),
            })

            const result = project.calculateEarnedSchedule()
            expect(result!.es).toBeCloseTo(2.5, 10)
            expect(result!.spiT).toBeCloseTo(2.5 / 3, 10)
            expect(result!.svT).toBeCloseTo(-0.5, 10)
            expect(result!.iEacT).toBeCloseTo(6, 10)
            // IEAC(t)=6稼働日 → 1/6〜1/10 で5稼働日、土日（1/11,1/12）をスキップして
            // 6稼働日目は 2025-01-13（月）
            expect(result!.esForecastDate?.toDateString()).toBe(
                new Date('2025-01-13').toDateString()
            )
        })

        it('EV=BAC → ES=PD にクランプ（要件1.3の統合確認）', () => {
            const project = createTestProject([createFiveDayTask(5)], {
                baseDate: new Date('2025-01-10'),
            })

            const result = project.calculateEarnedSchedule()
            expect(result!.es).toBe(5)
            expect(result!.pd).toBe(5)
        })
    })

    describe('要件6.1: 累積PV曲線が稼働日のみで構成される', () => {
        it('土日を挟む10稼働日プロジェクトで PD=plannedWorkDays=10、EV=6 → ES=6（暦日ではなく稼働日基準）', () => {
            // 2025-01-06〜2025-01-17 は暦日12日だが稼働日は10日
            const project = createTestProject([createTenDayTask(6)], {
                baseDate: new Date('2025-01-13'), // 月: AT=6（土日は数えない）
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-17'),
            })

            expect(project.plannedWorkDays).toBe(10)

            const result = project.calculateEarnedSchedule()
            expect(result!.pd).toBe(10)
            expect(result!.at).toBe(6)
            expect(result!.es).toBe(6) // 稼働日インデックス基準（暦日基準なら 8 になってしまう）
            expect(result!.svT).toBeCloseTo(0, 10)
            expect(result!.spiT).toBeCloseTo(1, 10)
        })
    })

    describe('要件6.3: 休日跨ぎでも稼働日インデックス基準で一貫した ES', () => {
        it('基準日が金曜と（土日を跨いだ）日曜で AT・ES・SV(t) が同一', () => {
            const makeProject = (baseDate: Date) =>
                createTestProject([createTenDayTask(5)], {
                    baseDate,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-17'),
                })

            const friday = makeProject(new Date('2025-01-10')).calculateEarnedSchedule()
            const sunday = makeProject(new Date('2025-01-12')).calculateEarnedSchedule()

            expect(friday!.at).toBe(5)
            expect(sunday!.at).toBe(5) // 土日は AT に数えない
            expect(sunday!.es).toBe(friday!.es)
            expect(sunday!.svT).toBe(friday!.svT)
            expect(sunday!.spiT).toBe(friday!.spiT)
        })
    })

    describe('要件6.2: 累積PV曲線は1回だけ構築されメモ化される', () => {
        it('2回目の呼び出しでは calculatePVs を再計算しない', () => {
            const project = createTestProject([createFiveDayTask(3)], {
                baseDate: new Date('2025-01-08'),
            })
            const row = project.toTaskRows()[0]
            const spy = jest.spyOn(row, 'calculatePVs')

            const first = project.calculateEarnedSchedule()
            const callsAfterFirst = spy.mock.calls.length
            expect(callsAfterFirst).toBeGreaterThan(0) // 曲線構築で呼ばれている

            const second = project.calculateEarnedSchedule()
            expect(spy.mock.calls.length).toBe(callsAfterFirst) // 曲線は再構築されない

            expect(second).toEqual(first)
        })
    })

    describe('要件5: タスクフィルタ対応', () => {
        const createFilterTasks = () => [
            createTaskNode({
                id: 1,
                name: 'ログイン機能',
                workload: 5,
                ev: 2.5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            }),
            createTaskNode({
                id: 2,
                name: '一覧画面',
                workload: 5,
                ev: 1,
                startDate: new Date('2025-01-13'),
                endDate: new Date('2025-01-17'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-13'), new Date('2025-01-17')),
                isLeaf: true,
            }),
        ]

        it('要件5.1/5.3: フィルタ部分集合の EV と累積PV曲線から同一ロジックで ES を算出する', () => {
            const project = createTestProject(createFilterTasks(), {
                baseDate: new Date('2025-01-08'), // AT=3
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-17'),
            })

            // プロジェクト全体: 曲線 [1..10]、EV=3.5 → ES=3.5
            const whole = project.calculateEarnedSchedule()
            expect(whole!.es).toBeCloseTo(3.5, 10)
            expect(whole!.pd).toBe(10)

            // フィルタ部分集合（ログイン機能のみ）: 曲線 [1,2,3,4,5,5,...,5]、EV=2.5 → ES=2.5
            const filtered = project.calculateEarnedSchedule({ filter: 'ログイン' })
            expect(filtered!.es).toBeCloseTo(2.5, 10)
            expect(filtered!.at).toBe(3)
            expect(filtered!.pd).toBe(10) // PD はプロジェクト全期間の稼働日数
            expect(filtered!.spiT).toBeCloseTo(2.5 / 3, 10)
        })

        it('要件5.2: フィルタ結果が空 → undefined（例外を発生させない）', () => {
            const project = createTestProject(createFilterTasks(), {
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-17'),
            })

            expect(() =>
                project.calculateEarnedSchedule({ filter: '存在しないタスク' })
            ).not.toThrow()
            expect(project.calculateEarnedSchedule({ filter: '存在しないタスク' })).toBeUndefined()
        })
    })

    describe('算出不能ケース（undefined 正規化）', () => {
        it('タスクが空のプロジェクト → undefined', () => {
            const project = createTestProject([])
            expect(project.calculateEarnedSchedule()).toBeUndefined()
        })

        it('startDate/endDate 欠損 → undefined', () => {
            const project = new Project(
                [createFiveDayTask(3)],
                new Date('2025-01-08'),
                [],
                undefined,
                undefined,
                'テスト'
            )
            expect(project.calculateEarnedSchedule()).toBeUndefined()
        })

        it('AT=0（基準日が開始日より前）→ SPI(t)/IEAC(t)/予測日は undefined、SV(t)=ES（要件2.4/2.7/2.8）', () => {
            const project = createTestProject([createFiveDayTask(1)], {
                baseDate: new Date('2025-01-05'), // 開始日前の日曜
            })

            const result = project.calculateEarnedSchedule()
            expect(result).toBeDefined()
            expect(result!.at).toBe(0)
            expect(result!.spiT).toBeUndefined()
            expect(result!.iEacT).toBeUndefined()
            expect(result!.esForecastDate).toBeUndefined()
            expect(result!.svT).toBe(result!.es)
        })
    })

    describe('要件3.1/3.2: 終盤の古典 SPI 1.0 収束 vs SPI(t) 乖離の実証', () => {
        it('計画終了後1週間、EV=9.9/BAC=10: 古典SPI=0.99（1.0近傍）だが SPI(t)=0.66・SV(t)=-5.1稼働日の遅延を示す', () => {
            // 計画: 2025-01-06〜2025-01-17（10稼働日、BAC=10）
            // 実績: 基準日 2025-01-24（計画終了の1週間後、AT=15稼働日）で EV=9.9（95%超の進捗）
            const project = createTestProject([createTenDayTask(9.9)], {
                baseDate: new Date('2025-01-24'),
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-17'),
            })

            // 古典 SPI: EV / 累積PV。終盤は累積PV が BAC=10 で頭打ちのため 1.0 に収束する
            const stats = project.getStatistics()
            expect(stats.spi).toBeCloseTo(0.99, 10)
            expect(Math.abs(1.0 - stats.spi!)).toBeLessThan(0.05) // 1.0 近傍（見かけ上「順調」）

            // SPI(t): ES=9.9稼働日 / AT=15稼働日 = 0.66 と、実態の遅延を検出する
            const result = project.calculateEarnedSchedule()
            expect(result!.es).toBeCloseTo(9.9, 10)
            expect(result!.at).toBe(15)
            expect(result!.spiT).toBeCloseTo(9.9 / 15, 10) // = 0.66
            expect(result!.spiT!).toBeLessThan(0.7)

            // 同一データで古典 SPI と SPI(t) が明確に乖離する（乖離幅 > 0.25）
            expect(stats.spi! - result!.spiT!).toBeGreaterThan(0.25)

            // SV(t) = 9.9 - 15 = -5.1 稼働日（約1週間の遅延を稼働日単位で直接示す）
            expect(result!.svT).toBeCloseTo(-5.1, 10)

            // IEAC(t) = 10 / 0.66 = 15.1515... 稼働日 → 切り上げて16稼働日目 = 2025-01-27（月）
            expect(result!.iEacT).toBeCloseTo(10 / (9.9 / 15), 10)
            expect(result!.esForecastDate?.toDateString()).toBe(
                new Date('2025-01-27').toDateString()
            )
        })
    })
})
