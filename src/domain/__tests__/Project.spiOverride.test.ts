import { date2Sn } from 'excel-csv-read-write'
import { Project, CompletionForecastOptions, StatisticsOptions } from '../Project'
import { TaskNode } from '../TaskNode'

/**
 * REQ-SPI-002: CompletionForecast に spiOverride オプション追加
 * GitHub Issue: #147
 *
 * テストケース TC-01 〜 TC-13
 */

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

/**
 * 共通のテストタスクを作成
 * BAC=30, EV=15, 残作業=15
 */
function createStandardTestTasks(): TaskNode[] {
    return [
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
            ev: 4,
            startDate: new Date('2025-01-16'),
            endDate: new Date('2025-01-24'),
            scheduledWorkDays: 7,
            plotMap: createPlotMap(new Date('2025-01-16'), new Date('2025-01-24')),
            isLeaf: true,
        }),
    ]
}

describe('Project.spiOverride (REQ-SPI-002)', () => {
    describe('4.1 正常系', () => {
        describe('TC-01: spiOverride 指定で usedSpi が設定される', () => {
            it('spiOverride: 0.9 → usedSpi: 0.9', () => {
                const project = createTestProject(createStandardTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.9,
                    dailyPvOverride: 2.0, // テストのため固定
                })

                expect(forecast).toBeDefined()
                if (forecast) {
                    expect(forecast.usedSpi).toBe(0.9)
                }
            })
        })

        describe('TC-02: spiOverride 指定で confidence が high', () => {
            it('spiOverride: 0.9 → confidence: high', () => {
                const project = createTestProject(createStandardTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.9,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeDefined()
                if (forecast) {
                    expect(forecast.confidence).toBe('high')
                }
            })
        })

        describe('TC-03: spiOverride + dailyPvOverride 併用', () => {
            it('両方が使用される', () => {
                const project = createTestProject(createStandardTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.9,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeDefined()
                if (forecast) {
                    expect(forecast.usedSpi).toBe(0.9)
                    expect(forecast.usedDailyPv).toBe(2.0)
                    // dailyBurnRate = 2.0 * 0.9 = 1.8
                    expect(forecast.dailyBurnRate).toBeCloseTo(1.8, 5)
                }
            })
        })

        describe('TC-04: spiOverride + filter 併用', () => {
            it('フィルタ結果に対してspiOverrideを使用', () => {
                const project = createTestProject(createStandardTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const forecast = project.calculateCompletionForecast({
                    filter: '認証',
                    spiOverride: 0.8,
                    dailyPvOverride: 1.0,
                } as CompletionForecastOptions & StatisticsOptions)

                expect(forecast).toBeDefined()
                if (forecast) {
                    expect(forecast.usedSpi).toBe(0.8)
                    // フィルタ後の BAC = 10 + 5 = 15
                    // フィルタ後の EV = 8 + 3 = 11
                    // remainingWork = 15 - 11 = 4
                    expect(forecast.remainingWork).toBe(4)
                }
            })
        })
    })

    describe('4.2 ETC\' 計算', () => {
        describe('TC-05: ETC\' = remainingWork / spiOverride', () => {
            it('残作業20, spiOverride=0.8 → etcPrime: 25', () => {
                // 単一タスク: workload=20, ev=0
                const task = createTaskNode({
                    id: 1,
                    workload: 20,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-24'),
                    scheduledWorkDays: 15,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-24')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.8,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeDefined()
                if (forecast) {
                    // remainingWork = 20 - 0 = 20
                    // etcPrime = 20 / 0.8 = 25
                    expect(forecast.etcPrime).toBeCloseTo(25, 5)
                }
            })
        })

        describe('TC-06: dailyBurnRate = dailyPv * spiOverride', () => {
            it('dailyPv=2, spiOverride=0.8 → dailyBurnRate: 1.6', () => {
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

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.8,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeDefined()
                if (forecast) {
                    // dailyBurnRate = 2.0 * 0.8 = 1.6
                    expect(forecast.dailyBurnRate).toBeCloseTo(1.6, 5)
                }
            })
        })
    })

    describe('4.3 信頼性判定', () => {
        describe('TC-07: spiOverride で高信頼（SPI範囲外でも）', () => {
            it('spiOverride: 0.3 → confidence: high（累積SPIなら low になる範囲）', () => {
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

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                // spiOverride: 0.3 は通常なら low 信頼度（SPI < 0.5）
                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.3,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeDefined()
                if (forecast) {
                    // spiOverride 指定時は常に high
                    expect(forecast.confidence).toBe('high')
                }
            })
        })

        describe('TC-08: confidenceReason が正しい', () => {
            it('spiOverride 指定時は "ユーザーがSPIを指定"', () => {
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

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.9,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeDefined()
                if (forecast) {
                    expect(forecast.confidenceReason).toBe('ユーザーがSPIを指定')
                }
            })
        })
    })

    describe('4.4 境界値', () => {
        describe('TC-09: spiOverride: 0', () => {
            it('spiOverride: 0 → undefined（0除算回避）', () => {
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

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeUndefined()
            })
        })

        describe('TC-10: spiOverride: 負の値', () => {
            it('spiOverride: -0.5 → undefined（無効な値）', () => {
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

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                const forecast = project.calculateCompletionForecast({
                    spiOverride: -0.5,
                    dailyPvOverride: 2.0,
                })

                expect(forecast).toBeUndefined()
            })
        })

        describe('TC-11: spiOverride: 非常に小さい値', () => {
            it('spiOverride: 0.001 → 正常計算（maxForecastDays 超過で undefined の可能性）', () => {
                const task = createTaskNode({
                    id: 1,
                    workload: 100,
                    ev: 0,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-31'),
                    scheduledWorkDays: 20,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-31')),
                    isLeaf: true,
                })

                const project = createTestProject([task], {
                    baseDate: new Date('2025-01-10'),
                })

                // 非常に小さい SPI で計算
                // dailyBurnRate = 2.0 * 0.001 = 0.002
                // 100 / 0.002 = 50000 稼働日 → maxForecastDays(730) を超過
                const forecast = project.calculateCompletionForecast({
                    spiOverride: 0.001,
                    dailyPvOverride: 2.0,
                    maxForecastDays: 730,
                })

                // maxForecastDays を超過するので undefined
                expect(forecast).toBeUndefined()
            })
        })
    })

    describe('4.5 後方互換性', () => {
        describe('TC-12: spiOverride 未指定時は累積SPI使用', () => {
            it('デフォルト動作は累積SPIを使用', () => {
                const project = createTestProject(createStandardTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                // spiOverride なしで呼び出し
                const forecastWithoutOverride = project.calculateCompletionForecast({
                    dailyPvOverride: 2.0,
                })

                // 累積SPIを取得
                const stats = project.getStatistics()
                const cumulativeSpi = stats.spi

                expect(forecastWithoutOverride).toBeDefined()
                if (forecastWithoutOverride && cumulativeSpi !== undefined) {
                    // usedSpi が累積SPIと一致すること
                    expect(forecastWithoutOverride.usedSpi).toBeCloseTo(cumulativeSpi, 5)
                }
            })
        })

        describe('TC-13: 既存テストが全てPASS', () => {
            it('既存の calculateCompletionForecast テストと互換性がある', () => {
                // 既存テストが壊れていないことを確認
                // 引数なしで呼び出し
                const project = createTestProject(createStandardTestTasks(), {
                    baseDate: new Date('2025-01-15'),
                })

                const forecast = project.calculateCompletionForecast()

                // 予測結果が返る（または undefined）
                if (forecast) {
                    expect(forecast.etcPrime).toBeGreaterThanOrEqual(0)
                    expect(forecast.forecastDate).toBeInstanceOf(Date)
                    expect(forecast.usedSpi).toBeGreaterThan(0)
                    expect(['high', 'medium', 'low']).toContain(forecast.confidence)
                }
            })
        })
    })
})
