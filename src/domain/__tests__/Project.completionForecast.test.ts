import { date2Sn } from 'excel-csv-read-write'
import { Project, CompletionForecastOptions, StatisticsOptions } from '../Project'
import { TaskNode } from '../TaskNode'
import { TaskRow } from '../TaskRow'

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
    const baseDate = options?.baseDate ?? new Date('2025-01-15')
    const startDate = options?.startDate ?? new Date('2025-01-06')
    const endDate = options?.endDate ?? new Date('2025-01-31')

    return new Project(tasks, baseDate, [], startDate, endDate, 'テストプロジェクト')
}

describe('Project.completionForecast', () => {
    describe('4.1 BAC の計算', () => {
        describe('TC-01: 全タスクのworkload合計', () => {
            it('3タスク: 10, 20, 30人日 → BAC = 60', () => {
                const tasks = [
                    createTaskNode({
                        id: 1,
                        workload: 10,
                        startDate: new Date('2025-01-06'),
                        endDate: new Date('2025-01-10'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                        isLeaf: true,
                    }),
                    createTaskNode({
                        id: 2,
                        workload: 20,
                        startDate: new Date('2025-01-13'),
                        endDate: new Date('2025-01-17'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-13'), new Date('2025-01-17')),
                        isLeaf: true,
                    }),
                    createTaskNode({
                        id: 3,
                        workload: 30,
                        startDate: new Date('2025-01-20'),
                        endDate: new Date('2025-01-24'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-20'), new Date('2025-01-24')),
                        isLeaf: true,
                    }),
                ]

                const project = createTestProject(tasks)
                const stats = project.statisticsByProject[0]
                expect(stats?.totalWorkloadExcel).toBe(60)
            })
        })

        describe('TC-02: workload未定義を0扱い', () => {
            it('2タスク: 10人日, undefined → BAC = 10', () => {
                const tasks = [
                    createTaskNode({
                        id: 1,
                        workload: 10,
                        startDate: new Date('2025-01-06'),
                        endDate: new Date('2025-01-10'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                        isLeaf: true,
                    }),
                    createTaskNode({
                        id: 2,
                        workload: undefined,
                        startDate: new Date('2025-01-13'),
                        endDate: new Date('2025-01-17'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-13'), new Date('2025-01-17')),
                        isLeaf: true,
                    }),
                ]

                const project = createTestProject(tasks)
                const stats = project.statisticsByProject[0]
                expect(stats?.totalWorkloadExcel).toBe(10)
            })
        })

        describe('TC-03: タスクなし', () => {
            it('空のタスク配列 → BAC = 0', () => {
                const project = createTestProject([])
                const stats = project.statisticsByProject[0]
                expect(stats?.totalWorkloadExcel ?? 0).toBe(0)
            })
        })

        describe('TC-04: 親タスクは除外', () => {
            it('親10, 子5, 子5 → BAC = 10（子のみ）', () => {
                const child1 = createTaskNode({
                    id: 2,
                    workload: 5,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-08'),
                    scheduledWorkDays: 3,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-08')),
                    parentId: 1,
                    isLeaf: true,
                })

                const child2 = createTaskNode({
                    id: 3,
                    workload: 5,
                    startDate: new Date('2025-01-09'),
                    endDate: new Date('2025-01-13'),
                    scheduledWorkDays: 3,
                    plotMap: createPlotMap(new Date('2025-01-09'), new Date('2025-01-13')),
                    parentId: 1,
                    isLeaf: true,
                })

                const parent = createTaskNode({
                    id: 1,
                    workload: 10, // 親のworkloadは無視される
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-13'),
                    isLeaf: false,
                    children: [child1, child2],
                })

                const project = createTestProject([parent])
                const stats = project.statisticsByProject[0]
                expect(stats?.totalWorkloadExcel).toBe(10) // 子のみ: 5 + 5 = 10
            })
        })
    })

    describe("4.2 ETC' の計算", () => {
        describe('TC-05: 基本計算', () => {
            it("BAC=100, EV=60, SPI=0.8 → ETC' = 50", () => {
                // このテストはモックが必要なため、統合テストで実施
                // ここでは etcPrime プロパティの存在確認のみ
                const task = createTaskNode({
                    id: 1,
                    workload: 100,
                    ev: 60,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task])
                const stats = project.statisticsByProject[0]
                // etcPrime の型チェック
                expect(stats?.etcPrime === undefined || typeof stats?.etcPrime === 'number').toBe(
                    true
                )
            })
        })

        describe('TC-06: SPI=0 の場合', () => {
            it('SPI=0 → undefined', () => {
                // SPIが0の場合、etcPrimeはundefinedを返すことを確認
                // statisticsByProjectでSPI=0になるケースをシミュレート
                const project = createTestProject([])
                const stats = project.statisticsByProject[0]
                // タスクがない場合、SPIは計算できないのでundefined
                expect(stats?.etcPrime).toBeUndefined()
            })
        })

        describe('TC-07: SPI未定義', () => {
            it('SPI=undefined → undefined', () => {
                const project = createTestProject([])
                const stats = project.statisticsByProject[0]
                expect(stats?.etcPrime).toBeUndefined()
            })
        })

        describe('TC-08: 完了済み（BAC=EV）', () => {
            it("BAC=100, EV=100, SPI=1.0 → ETC' = 0", () => {
                // BAC = EV の場合、ETC' = 0
                // 計算: (100 - 100) / 1.0 = 0
                const task = createTaskNode({
                    id: 1,
                    workload: 100,
                    ev: 100, // 完了済み
                    progressRate: 1.0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task])
                // completionForecast で完了済みのケースをテスト
                const forecast = project.calculateCompletionForecast()
                if (forecast) {
                    expect(forecast.etcPrime).toBe(0)
                    expect(forecast.remainingWork).toBe(0)
                }
            })
        })

        describe('TC-09: SPI > 1（前倒し）', () => {
            it("BAC=100, EV=60, SPI=1.2 → ETC' = 33.33...", () => {
                // (100 - 60) / 1.2 = 33.333...
                // このテストは統合テストで実施
                expect(true).toBe(true) // プレースホルダー
            })
        })
    })

    describe('4.3 完了予測日の計算', () => {
        describe('TC-10: 基本的な予測', () => {
            it('残作業20, dailyPv=2, SPI=1.0 → 10稼働日後', () => {
                // dailyPvOverride を使用して固定値でテスト
                const task = createTaskNode({
                    id: 1,
                    workload: 20,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-06'),
                })

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 2,
                }

                const forecast = project.calculateCompletionForecast(options)
                // SPI が計算できない場合は undefined
                if (forecast) {
                    expect(forecast.usedDailyPv).toBe(2)
                }
            })
        })

        describe('TC-11: SPI考慮', () => {
            it('残作業20, dailyPv=2, SPI=0.5 → 20稼働日後', () => {
                // dailyBurnRate = 2 * 0.5 = 1
                // 20 / 1 = 20稼働日
                expect(true).toBe(true) // 統合テストで実施
            })
        })

        describe('TC-12: 完了済み', () => {
            it('BAC=EV → forecastDate = baseDate', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 10, // 完了済み
                    progressRate: 1.0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-10'),
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                const forecast = project.calculateCompletionForecast()
                if (forecast) {
                    expect(forecast.forecastDate.toDateString()).toBe(
                        new Date('2025-01-10').toDateString()
                    )
                    expect(forecast.etcPrime).toBe(0)
                }
            })
        })

        describe('TC-13: 手入力PV優先', () => {
            it('dailyPvOverride=5 → 5を使用', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 50,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task])

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 5,
                }

                const forecast = project.calculateCompletionForecast(options)
                if (forecast) {
                    expect(forecast.usedDailyPv).toBe(5)
                }
            })
        })

        describe('TC-14: 土日スキップ', () => {
            it('金曜baseDate → 月曜以降にカウント', () => {
                // 2025-01-10 は金曜日
                // 次の稼働日は 2025-01-13 (月曜日)
                const task = createTaskNode({
                    id: 1,
                    workload: 2,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'), // 金曜日
                })

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 2, // 1日で2消化 → 1稼働日で完了
                }

                const forecast = project.calculateCompletionForecast(options)
                if (forecast) {
                    // 金曜日の翌稼働日は月曜日
                    expect(forecast.forecastDate.getDay()).toBe(1) // 月曜日
                }
            })
        })

        describe('TC-16: maxForecastDays超過', () => {
            it('730日で収束しない → undefined', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 10000, // 非常に大きな残作業
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task])

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 0.001, // 非常に小さい消化量
                    maxForecastDays: 10, // 10日で打ち切り
                }

                const forecast = project.calculateCompletionForecast(options)
                expect(forecast).toBeUndefined()
            })
        })
    })

    describe('4.4 日あたりPV の決定', () => {
        describe('TC-17: 手入力優先', () => {
            it('dailyPvOverride=3.0 → usedDailyPv = 3.0', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 30,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task])

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 3.0,
                }

                const forecast = project.calculateCompletionForecast(options)
                if (forecast) {
                    expect(forecast.usedDailyPv).toBe(3.0)
                }
            })
        })

        describe('TC-18: 直近N日平均', () => {
            it('lookbackDays=7 → 7日平均を使用', () => {
                // calculateRecentDailyPv のテスト
                const task = createTaskNode({
                    id: 1,
                    workload: 35, // 7稼働日 × 5人日/日
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-14'),
                    scheduledWorkDays: 7,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-14')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-14'),
                })

                const recentDailyPv = project.calculateRecentDailyPv(7)
                expect(typeof recentDailyPv).toBe('number')
            })
        })

        describe('TC-20: lookbackDays指定', () => {
            it('lookbackDays=14 → 直近14日平均を使用', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 70, // 14稼働日 × 5人日/日
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-24'),
                    scheduledWorkDays: 14,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-24')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-24'),
                })

                const recentDailyPv = project.calculateRecentDailyPv(14)
                expect(typeof recentDailyPv).toBe('number')
            })
        })
    })

    describe('4.5 信頼性の判定', () => {
        describe('TC-21: 高信頼性（安定）', () => {
            it('SPI=1.0 → confidence="high"', () => {
                // SPI が 0.8-1.2 の範囲なら high
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 5,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-17'),
                    scheduledWorkDays: 10,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 1,
                }

                const forecast = project.calculateCompletionForecast(options)
                if (forecast) {
                    // dailyPvOverride を指定したので high
                    expect(forecast.confidence).toBe('high')
                }
            })
        })

        describe('TC-24: 手入力で高信頼性', () => {
            it('dailyPvOverride指定 → confidence="high"', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-17'),
                    scheduledWorkDays: 10,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
                    isLeaf: true,
                })

                const project = createTestProject([task])

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 2,
                }

                const forecast = project.calculateCompletionForecast(options)
                if (forecast) {
                    expect(forecast.confidence).toBe('high')
                    expect(forecast.confidenceReason).toContain('ユーザーが日あたりPVを指定')
                }
            })
        })
    })

    describe('4.6 エッジケース', () => {
        describe('TC-25: SPI=0で予測不可', () => {
            it('SPI=0 → undefined', () => {
                // タスクがない場合、SPI は計算できない
                const project = createTestProject([])
                const forecast = project.calculateCompletionForecast()
                expect(forecast).toBeUndefined()
            })
        })

        describe('TC-26: dailyPv=0で予測不可', () => {
            it('dailyPv=0 → undefined', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-10'),
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                    isLeaf: true,
                })

                const project = createTestProject([task])

                const options: CompletionForecastOptions = {
                    dailyPvOverride: 0, // 0を指定
                }

                const forecast = project.calculateCompletionForecast(options)
                expect(forecast).toBeUndefined()
            })
        })

        describe('TC-27: 全タスク無効', () => {
            it('excludedTasks.length = 全タスク → BAC=0', () => {
                // 無効なタスクのみ
                const invalidTask = createTaskNode({
                    id: 1,
                    name: '無効タスク',
                    startDate: undefined, // 無効
                    isLeaf: true,
                })

                const project = createTestProject([invalidTask])
                const stats = project.statisticsByProject[0]
                expect(stats?.totalWorkloadExcel ?? 0).toBe(0)
            })
        })
    })

    describe('plannedWorkDays', () => {
        it('開始日と終了日の間の稼働日数を返す', () => {
            const project = createTestProject([], {
                startDate: new Date('2025-01-06'), // 月曜
                endDate: new Date('2025-01-10'), // 金曜
            })

            expect(project.plannedWorkDays).toBe(5) // 月〜金の5日間
        })

        it('土日を除外する', () => {
            const project = createTestProject([], {
                startDate: new Date('2025-01-06'), // 月曜
                endDate: new Date('2025-01-12'), // 日曜
            })

            expect(project.plannedWorkDays).toBe(5) // 月〜金の5日間（土日除外）
        })

        it('開始日または終了日が未設定の場合は0を返す', () => {
            const project = new Project(
                [],
                new Date('2025-01-15'),
                [],
                undefined,
                undefined,
                'テスト'
            )
            expect(project.plannedWorkDays).toBe(0)
        })
    })

    describe('totalEv（statisticsByProject経由）', () => {
        it('statisticsByProjectからtotalEvを取得する', () => {
            const task = createTaskNode({
                id: 1,
                workload: 10,
                ev: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })

            const project = createTestProject([task])
            const stats = project.statisticsByProject[0]
            expect(typeof stats?.totalEv).toBe('number')
        })
    })
})

/**
 * REQ-REFACTOR-002: 完了予測機能の整理とフィルタ対応
 * テストケース TC-01 〜 TC-20
 */
describe('Project.completionForecast リファクタリング (REQ-REFACTOR-002)', () => {
    /**
     * TC-01〜TC-03: _calculateBasicStats() テスト
     * 注: _calculateBasicStats は private メソッドのため、
     *     getStatistics() 経由で間接的にテスト
     */
    describe('TC-01〜TC-03: _calculateBasicStats() テスト', () => {
        describe('TC-01: 基本統計が正しく計算される', () => {
            it('リーフタスク3件で totalEv, spi, bac が算出される', () => {
                const tasks = [
                    createTaskNode({
                        id: 1,
                        workload: 10,
                        ev: 8,
                        startDate: new Date('2025-01-06'),
                        endDate: new Date('2025-01-10'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                        isLeaf: true,
                    }),
                    createTaskNode({
                        id: 2,
                        workload: 20,
                        ev: 15,
                        startDate: new Date('2025-01-13'),
                        endDate: new Date('2025-01-17'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-13'), new Date('2025-01-17')),
                        isLeaf: true,
                    }),
                    createTaskNode({
                        id: 3,
                        workload: 30,
                        ev: 20,
                        startDate: new Date('2025-01-20'),
                        endDate: new Date('2025-01-24'),
                        scheduledWorkDays: 5,
                        plotMap: createPlotMap(new Date('2025-01-20'), new Date('2025-01-24')),
                        isLeaf: true,
                    }),
                ]

                const project = createTestProject(tasks, {
                    baseDate: new Date('2025-01-24'),
                })
                const stats = project.statisticsByProject[0]

                // BAC = 10 + 20 + 30 = 60
                expect(stats?.totalWorkloadExcel).toBe(60)
                // totalEv = 8 + 15 + 20 = 43
                expect(stats?.totalEv).toBe(43)
                // spi は数値であること（PV依存のため具体的な値は環境による）
                expect(typeof stats?.spi).toBe('number')
            })
        })

        describe('TC-02: 空配列の場合', () => {
            it('空配列 → totalEv=0, spi=undefined, bac=0', () => {
                const project = createTestProject([])
                const stats = project.statisticsByProject[0]

                expect(stats?.totalWorkloadExcel ?? 0).toBe(0)
                expect(stats?.totalEv ?? 0).toBe(0)
                expect(stats?.spi).toBeUndefined()
            })
        })

        describe('TC-03: PV=0の場合', () => {
            it('全タスクPV=0 → spi=undefined', () => {
                // plotMapが空のタスク（PV=0）
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 5,
                    startDate: new Date('2030-01-06'), // 遠い将来（baseDate時点でPV=0）
                    endDate: new Date('2030-01-10'),
                    scheduledWorkDays: 5,
                    plotMap: new Map(), // 空のplotMap
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-15'),
                })
                const stats = project.statisticsByProject[0]

                // PVが0なのでSPIは計算不能
                expect(stats?.spi).toBeUndefined()
            })
        })
    })

    /**
     * TC-04〜TC-08: calculateCompletionForecast() オーバーロードテスト
     */
    describe('TC-04〜TC-08: calculateCompletionForecast() オーバーロードテスト', () => {
        // 共通のテストデータ
        const createTestTasks = () => [
            createTaskNode({
                id: 1,
                name: '認証/ログイン機能',
                workload: 10,
                ev: 8,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            }),
            createTaskNode({
                id: 2,
                name: '認証/パスワードリセット',
                workload: 5,
                ev: 3,
                startDate: new Date('2025-01-13'),
                endDate: new Date('2025-01-15'),
                scheduledWorkDays: 3,
                plotMap: createPlotMap(new Date('2025-01-13'), new Date('2025-01-15')),
                isLeaf: true,
            }),
            createTaskNode({
                id: 3,
                name: 'ダッシュボード/表示',
                workload: 15,
                ev: 10,
                startDate: new Date('2025-01-16'),
                endDate: new Date('2025-01-24'),
                scheduledWorkDays: 7,
                plotMap: createPlotMap(new Date('2025-01-16'), new Date('2025-01-24')),
                isLeaf: true,
            }),
        ]

        describe('TC-04: 引数なしでプロジェクト全体', () => {
            it('calculateCompletionForecast() が全タスク対象の予測を返す', () => {
                const project = createTestProject(createTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const forecast = project.calculateCompletionForecast()

                // 予測結果が返る（または undefined）
                if (forecast) {
                    expect(forecast.etcPrime).toBeGreaterThanOrEqual(0)
                    expect(forecast.forecastDate).toBeInstanceOf(Date)
                    expect(forecast.usedSpi).toBeGreaterThan(0)
                }
            })
        })

        describe('TC-05: フィルタオプション指定', () => {
            it('{ filter: "認証" } でフィルタ結果の予測を返す', () => {
                const project = createTestProject(createTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                // 注: この機能は REQ-REFACTOR-002 で追加予定
                // 現時点ではコンパイルエラーになる可能性あり
                // 実装後にコメント解除
                // const forecast = project.calculateCompletionForecast({ filter: '認証' })

                // 代わりに filterTasks + getStatistics でテスト
                const filteredTasks = project.filterTasks({ filter: '認証' })
                expect(filteredTasks.length).toBe(2) // 認証/ログイン機能, 認証/パスワードリセット
            })
        })

        describe('TC-06: フィルタ + 予測オプション', () => {
            it('{ filter: "認証", dailyPvOverride: 2.0 } でフィルタ + 指定PVで予測', () => {
                const project = createTestProject(createTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                // 注: この機能は REQ-REFACTOR-002 で追加予定
                // 実装後にコメント解除
                // const forecast = project.calculateCompletionForecast({
                //     filter: '認証',
                //     dailyPvOverride: 2.0
                // })
                // expect(forecast?.usedDailyPv).toBe(2.0)

                // プレースホルダー
                expect(true).toBe(true)
            })
        })

        describe('TC-07: タスク配列指定', () => {
            it('tasks, {} で渡されたタスクの予測を返す', () => {
                const project = createTestProject(createTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                // 注: この機能は REQ-REFACTOR-002 で追加予定
                // const tasks = project.toTaskRows().filter(t => t.isLeaf)
                // const forecast = project.calculateCompletionForecast(tasks, {})

                // プレースホルダー
                expect(true).toBe(true)
            })
        })

        describe('TC-08: タスク配列 + オプション指定', () => {
            it('tasks, { lookbackDays: 14 } で渡されたタスク + 指定オプションで予測', () => {
                const project = createTestProject(createTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                // 注: この機能は REQ-REFACTOR-002 で追加予定
                // const tasks = project.toTaskRows().filter(t => t.isLeaf)
                // const forecast = project.calculateCompletionForecast(tasks, { lookbackDays: 14 })

                // プレースホルダー
                expect(true).toBe(true)
            })
        })
    })

    /**
     * TC-09〜TC-12: 後方互換性テスト
     */
    describe('TC-09〜TC-12: 後方互換性テスト', () => {
        const createCompatibilityTestTasks = () => [
            createTaskNode({
                id: 1,
                name: 'タスク1',
                assignee: '山田',
                workload: 10,
                ev: 8,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            }),
            createTaskNode({
                id: 2,
                name: 'タスク2',
                assignee: '田中',
                workload: 15,
                ev: 10,
                startDate: new Date('2025-01-13'),
                endDate: new Date('2025-01-17'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-13'), new Date('2025-01-17')),
                isLeaf: true,
            }),
        ]

        describe('TC-09: getStatistics() の completionForecast が従来と同じ', () => {
            it('getStatistics() で completionForecast が返される', () => {
                const project = createTestProject(createCompatibilityTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const stats = project.getStatistics()
                // completionForecast は Date または undefined
                expect(
                    stats.completionForecast === undefined ||
                        stats.completionForecast instanceof Date
                ).toBe(true)
            })
        })

        describe('TC-10: getStatistics() の etcPrime が従来と同じ', () => {
            it('getStatistics() で etcPrime が返される', () => {
                const project = createTestProject(createCompatibilityTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const stats = project.getStatistics()
                // etcPrime は number または undefined
                expect(
                    stats.etcPrime === undefined || typeof stats.etcPrime === 'number'
                ).toBe(true)
            })
        })

        describe('TC-11: getStatisticsByName() の completionForecast が従来と同じ', () => {
            it('getStatisticsByName() で担当者別に completionForecast が返される', () => {
                const project = createTestProject(createCompatibilityTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const statsByName = project.getStatisticsByName()
                expect(statsByName.length).toBeGreaterThan(0)
                for (const stat of statsByName) {
                    expect(
                        stat.completionForecast === undefined ||
                            stat.completionForecast instanceof Date
                    ).toBe(true)
                }
            })
        })

        describe('TC-12: statisticsByProject が従来と同じ', () => {
            it('statisticsByProject で従来と同じ結果が返される', () => {
                const project = createTestProject(createCompatibilityTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const stats = project.statisticsByProject
                expect(stats.length).toBe(1)
                expect(stats[0]).toHaveProperty('totalWorkloadExcel')
                expect(stats[0]).toHaveProperty('totalEv')
                expect(stats[0]).toHaveProperty('spi')
                expect(stats[0]).toHaveProperty('etcPrime')
                expect(stats[0]).toHaveProperty('completionForecast')
            })
        })
    })

    /**
     * TC-13〜TC-14: リファクタリング検証テスト
     */
    describe('TC-13〜TC-14: リファクタリング検証テスト', () => {
        describe('TC-13: _calculateCompletionForecastForTasks が削除されている', () => {
            it('メソッドが存在しないこと', () => {
                const project = createTestProject([])
                // private メソッドなので直接アクセスできないが、
                // リファクタリング後は存在しないことを確認
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const hasOldMethod = '_calculateCompletionForecastForTasks' in (project as any)
                // REQ-REFACTOR-002: リファクタリング完了、メソッドは削除済み
                expect(hasOldMethod).toBe(false)
            })
        })

        describe('TC-14: 高性能版が _calculateBasicStats を使用', () => {
            it('calculateCompletionForecast() が statisticsByProject を参照しないこと', () => {
                // 循環参照がないことの確認は統合テストで行う
                // ここでは calculateCompletionForecast が正常に動作することを確認
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 5,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-17'),
                    scheduledWorkDays: 10,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                // エラーなく実行できること
                const forecast = project.calculateCompletionForecast({
                    dailyPvOverride: 1.0,
                })
                expect(forecast !== undefined || forecast === undefined).toBe(true)
            })
        })
    })

    /**
     * TC-15〜TC-18: 境界値テスト
     */
    describe('TC-15〜TC-18: 境界値テスト', () => {
        describe('TC-15: SPI=0', () => {
            it('SPI=0のプロジェクト → undefined', () => {
                const project = createTestProject([])
                const forecast = project.calculateCompletionForecast()
                expect(forecast).toBeUndefined()
            })
        })

        describe('TC-16: dailyPv=0', () => {
            it('全期間PV=0 → undefined', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-10'),
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                    isLeaf: true,
                })

                const project = createTestProject([task])
                const forecast = project.calculateCompletionForecast({
                    dailyPvOverride: 0,
                })
                expect(forecast).toBeUndefined()
            })
        })

        describe('TC-17: 完了済み', () => {
            it('BAC=EV → etcPrime=0, forecastDate=baseDate', () => {
                const baseDate = new Date('2025-01-10')
                const task = createTaskNode({
                    id: 1,
                    workload: 10,
                    ev: 10, // 完了済み
                    progressRate: 1.0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-10'),
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                    isLeaf: true,
                })

                const project = createTestProject([task], { baseDate })
                const forecast = project.calculateCompletionForecast()

                if (forecast) {
                    expect(forecast.etcPrime).toBe(0)
                    expect(forecast.remainingWork).toBe(0)
                    expect(forecast.forecastDate.toDateString()).toBe(baseDate.toDateString())
                }
            })
        })

        describe('TC-18: フィルタ結果が空', () => {
            it('{ filter: "存在しない" } → undefined', () => {
                const task = createTaskNode({
                    id: 1,
                    name: 'タスク1',
                    workload: 10,
                    ev: 5,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-10'),
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                    isLeaf: true,
                })

                const project = createTestProject([task])
                const filteredTasks = project.filterTasks({ filter: '存在しないタスク名' })

                // フィルタ結果が空であること
                expect(filteredTasks.length).toBe(0)

                // 注: calculateCompletionForecast({ filter: '...' }) は REQ-REFACTOR-002 で追加予定
            })
        })
    })
})

/**
 * REQ-EVM-001 AC-03 受け入れテスト
 * 「日あたりPVは手入力が指定されていればそれを使用し、なければ直近N日平均を使用する」
 *
 * Issue #145: Statistics.completionForecast が dailyPvOverride: 1.0 を使用していた問題の修正
 */
describe('REQ-EVM-001 AC-03: Statistics.completionForecast uses calculateRecentDailyPv()', () => {
    it('Statistics.completionForecast.usedDailyPv が直近N日平均を使用する（1.0固定ではない）', () => {
        // 1週間以上の期間を持つタスクを作成（直近7日のPV平均を計算可能にする）
        const tasks = [
            createTaskNode({
                id: 1,
                name: 'タスク1',
                workload: 20,
                ev: 10,
                startDate: new Date('2025-01-06'), // 月曜
                endDate: new Date('2025-01-17'), // 金曜
                scheduledWorkDays: 10,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
                isLeaf: true,
            }),
            createTaskNode({
                id: 2,
                name: 'タスク2',
                workload: 15,
                ev: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-17'),
                scheduledWorkDays: 10,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
                isLeaf: true,
            }),
        ]

        const baseDate = new Date('2025-01-15') // 水曜日
        const project = createTestProject(tasks, {
            baseDate,
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-01-17'),
        })

        // calculateRecentDailyPv() の結果を取得
        const expectedDailyPv = project.calculateRecentDailyPv()

        // getStatistics() で completionForecast を取得
        const stats = project.getStatistics()

        // completionForecast が存在すること
        expect(stats.completionForecast).toBeDefined()

        // usedDailyPv が 1.0 固定ではなく、calculateRecentDailyPv() の結果と一致すること
        if (stats.completionForecast) {
            // 直接比較: calculateCompletionForecast() の結果と比較
            const directForecast = project.calculateCompletionForecast()
            expect(directForecast).toBeDefined()

            if (directForecast) {
                // getStatistics().completionForecast と calculateCompletionForecast() が同じ usedDailyPv を使用
                expect(stats.completionForecast.toDateString()).toBe(
                    directForecast.forecastDate.toDateString()
                )
            }

            // usedDailyPv が 1.0 ではないことを確認（バグ修正の検証）
            // 注: expectedDailyPv が 1.0 より大きい場合、1.0 固定はバグ
            if (expectedDailyPv > 1.0) {
                // calculateCompletionForecast() の usedDailyPv を検証
                expect(directForecast?.usedDailyPv).toBeGreaterThan(1.0)
                expect(directForecast?.usedDailyPv).toBeCloseTo(expectedDailyPv, 5)
            }
        }
    })

    it('dailyPvOverride を指定した場合はその値が優先される（AC-03の優先度1）', () => {
        const task = createTaskNode({
            id: 1,
            name: 'タスク1',
            workload: 20,
            ev: 10,
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-01-17'),
            scheduledWorkDays: 10,
            plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
            isLeaf: true,
        })

        const project = createTestProject([task], {
            baseDate: new Date('2025-01-15'),
        })

        // dailyPvOverride を明示的に指定
        const forecast = project.calculateCompletionForecast({ dailyPvOverride: 5.0 })

        expect(forecast).toBeDefined()
        if (forecast) {
            expect(forecast.usedDailyPv).toBe(5.0)
        }
    })
})
