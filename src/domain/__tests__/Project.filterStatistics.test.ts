import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../Project'
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

describe('Project.filterStatistics', () => {
    const baseDate = new Date('2025-01-15')
    const startDate = new Date('2025-01-06')
    const endDate = new Date('2025-01-31')

    // テスト用データセットを作成
    function createTestProject(): Project {
        // 親タスク: 認証機能
        const authParent = createTaskNode({
            id: 1,
            level: 1,
            name: '認証機能',
            isLeaf: false,
            parentId: undefined,
        })

        // 認証機能の子タスク1: ログイン実装
        const authChild1 = createTaskNode({
            id: 2,
            level: 2,
            name: 'ログイン実装',
            assignee: '田中',
            workload: 5,
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-01-10'),
            progressRate: 1.0, // 100% = 1.0
            pv: 5,
            ev: 5,
            scheduledWorkDays: 5,
            plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
            isLeaf: true,
            parentId: 1,
        })

        // 認証機能の子タスク2: ログアウト実装（遅延）
        const authChild2 = createTaskNode({
            id: 3,
            level: 2,
            name: 'ログアウト実装',
            assignee: '田中',
            workload: 3,
            startDate: new Date('2025-01-13'),
            endDate: new Date('2025-01-14'), // 基準日より前に終了予定だが未完了=遅延
            progressRate: 0.5, // 50% = 0.5
            pv: 3,
            ev: 1.5,
            scheduledWorkDays: 2,
            plotMap: createPlotMap(new Date('2025-01-13'), new Date('2025-01-14')),
            isLeaf: true,
            parentId: 1,
        })

        authParent.children = [authChild1, authChild2]

        // 親タスク: API機能
        const apiParent = createTaskNode({
            id: 4,
            level: 1,
            name: 'API機能',
            isLeaf: false,
            parentId: undefined,
        })

        // API機能の子タスク: REST API実装
        const apiChild = createTaskNode({
            id: 5,
            level: 2,
            name: 'REST API実装',
            assignee: '佐藤',
            workload: 8,
            startDate: new Date('2025-01-20'),
            endDate: new Date('2025-01-29'),
            progressRate: 0,
            pv: 0,
            ev: 0,
            scheduledWorkDays: 8,
            plotMap: createPlotMap(new Date('2025-01-20'), new Date('2025-01-29')),
            isLeaf: true,
            parentId: 4,
        })

        apiParent.children = [apiChild]

        return new Project(
            [authParent, apiParent],
            baseDate,
            [],
            startDate,
            endDate,
            'テストプロジェクト'
        )
    }

    // ========================================
    // filterTasks() テストケース (TC-01 〜 TC-08)
    // ========================================
    describe('filterTasks()', () => {
        describe('TC-01: 引数なしで全タスク（親含む）を返す', () => {
            it('全タスク（親タスク含む）が返される', () => {
                const project = createTestProject()
                const tasks = project.filterTasks()

                // 親2 + 子3 = 5タスク
                expect(tasks.length).toBe(5)
            })
        })

        describe('TC-02: 空オブジェクトで全タスク（親含む）を返す', () => {
            it('filterTasks({}) で全タスクが返される', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({})

                expect(tasks.length).toBe(5)
            })
        })

        describe('TC-03: 空文字フィルタで全タスク（親含む）を返す', () => {
            it('filterTasks({ filter: "" }) で全タスクが返される', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: '' })

                expect(tasks.length).toBe(5)
            })

            it('filterTasks({ filter: "  " }) （空白のみ）で全タスクが返される', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: '  ' })

                expect(tasks.length).toBe(5)
            })
        })

        describe('TC-04: 部分一致でタスクを抽出（親含む）', () => {
            it('"認証" を含むタスクが抽出される', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: '認証' })

                // 認証機能（親）、ログイン実装、ログアウト実装
                expect(tasks.length).toBe(3)
                const names = tasks.map(t => t.name)
                expect(names).toContain('認証機能')
                expect(names).toContain('ログイン実装')
                expect(names).toContain('ログアウト実装')
            })
        })

        describe('TC-05: 親タスク名でも一致', () => {
            it('子タスクの fullTaskName に親タスク名が含まれている', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: '認証機能' })

                // fullTaskName に "認証機能" を含むタスク
                expect(tasks.length).toBeGreaterThan(0)
                expect(tasks.map(t => t.name)).toContain('認証機能')
            })
        })

        describe('TC-06: 一致するタスクがない場合', () => {
            it('空配列を返す', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: '存在しない機能' })

                expect(tasks).toEqual([])
            })
        })

        describe('TC-07: 大文字小文字を区別する', () => {
            it('"api" で API機能 は一致しない', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: 'api' })

                // 大文字小文字を区別するため、"API" とは一致しない
                expect(tasks.length).toBe(0)
            })

            it('"API" で API機能 が一致する', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: 'API' })

                expect(tasks.length).toBeGreaterThan(0)
            })
        })

        describe('TC-08: 親タスクとリーフタスク両方が含まれる', () => {
            it('"機能" でフィルタすると親とリーフ両方が返される', () => {
                const project = createTestProject()
                const tasks = project.filterTasks({ filter: '機能' })

                // 認証機能（親）、API機能（親）、およびそれらの子タスク
                const parentTasks = tasks.filter(t => !t.isLeaf)
                const leafTasks = tasks.filter(t => t.isLeaf)

                expect(parentTasks.length).toBeGreaterThan(0)
                expect(leafTasks.length).toBeGreaterThan(0)
            })
        })
    })

    // ========================================
    // getStatistics() テストケース (TC-10 〜 TC-19)
    // ========================================
    describe('getStatistics()', () => {
        describe('TC-10: 引数なしで全体統計を返す', () => {
            it('プロジェクト全体の統計が返される', () => {
                const project = createTestProject()
                const stats = project.getStatistics()

                expect(stats.projectName).toBe('テストプロジェクト')
                expect(stats.totalTasksCount).toBeDefined()
                expect(stats.totalPvCalculated).toBeDefined()
                expect(stats.totalEv).toBeDefined()
            })
        })

        describe('TC-11: フィルタオプションで統計を返す', () => {
            it('{ filter: "認証" } でフィルタ結果の統計が返される', () => {
                const project = createTestProject()
                const stats = project.getStatistics({ filter: '認証' })

                // 認証機能のリーフタスクのみの統計
                // リーフ: ログイン実装(workload=5), ログアウト実装(workload=3) = 計8
                expect(stats.totalTasksCount).toBe(2) // リーフのみカウント
            })
        })

        describe('TC-12: TaskRow[]を渡して統計を返す', () => {
            it('渡されたタスクの統計が返される', () => {
                const project = createTestProject()
                const filteredTasks = project.filterTasks({ filter: '認証' })
                const stats = project.getStatistics(filteredTasks)

                expect(stats.totalTasksCount).toBe(2) // リーフのみカウント
            })
        })

        describe('TC-13: EVM指標が正しく計算される', () => {
            it('totalPvCalculated, totalEv, spi が正しい', () => {
                const project = createTestProject()
                const stats = project.getStatistics()

                expect(stats.totalPvCalculated).toBeDefined()
                expect(stats.totalEv).toBeDefined()
                expect(stats.spi).toBeDefined()
            })
        })

        describe('TC-14: タスク数が正しくカウントされる', () => {
            it('totalTasksCount はリーフタスクのみ', () => {
                const project = createTestProject()
                const stats = project.getStatistics()

                // リーフタスク: ログイン実装, ログアウト実装, REST API実装 = 3
                expect(stats.totalTasksCount).toBe(3)
            })
        })

        describe('TC-15: ETC\'が正しく計算される', () => {
            it('etcPrime = (BAC - EV) / SPI', () => {
                const project = createTestProject()
                const stats = project.getStatistics()

                if (stats.spi && stats.spi > 0) {
                    const bac = stats.totalWorkloadExcel ?? 0
                    const ev = stats.totalEv ?? 0
                    const expectedEtcPrime = (bac - ev) / stats.spi
                    expect(stats.etcPrime).toBeCloseTo(expectedEtcPrime, 2)
                }
            })
        })

        describe('TC-16: 遅延情報が計算される', () => {
            it('delayedTaskCount, averageDelayDays, maxDelayDays が返される', () => {
                const project = createTestProject()
                const stats = project.getStatistics()

                expect(stats.delayedTaskCount).toBeDefined()
                expect(stats.averageDelayDays).toBeDefined()
                expect(stats.maxDelayDays).toBeDefined()
            })
        })

        describe('TC-17: PV=0の場合SPIはundefined', () => {
            it('全タスクのPVが0の場合、spiとetcPrimeがundefined', () => {
                // PV=0のプロジェクトを作成
                const task = createTaskNode({
                    id: 1,
                    name: '未計画タスク',
                    workload: 0,
                    startDate: new Date('2025-02-01'),
                    endDate: new Date('2025-02-05'),
                    progressRate: 0,
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-02-01'), new Date('2025-02-05')),
                    isLeaf: true,
                })

                const project = new Project(
                    [task],
                    baseDate,
                    [],
                    startDate,
                    endDate,
                    'PVゼロプロジェクト'
                )

                const stats = project.getStatistics()

                // baseDateが2025-01-15で、タスクは2025-02-01開始なのでPV=0
                expect(stats.totalPvCalculated).toBe(0)
                expect(stats.spi).toBeUndefined()
                expect(stats.etcPrime).toBeUndefined()
            })
        })

        describe('TC-18: 遅延タスクがない場合', () => {
            it('delayedTaskCount=0, averageDelayDays=0, maxDelayDays=0', () => {
                // 遅延なしのプロジェクト
                const task = createTaskNode({
                    id: 1,
                    name: '完了タスク',
                    workload: 5,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-10'),
                    progressRate: 1.0, // 100% = 1.0
                    pv: 5,
                    ev: 5,
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                    isLeaf: true,
                })

                const project = new Project(
                    [task],
                    baseDate,
                    [],
                    startDate,
                    endDate,
                    '遅延なしプロジェクト'
                )

                const stats = project.getStatistics()

                expect(stats.delayedTaskCount).toBe(0)
                expect(stats.averageDelayDays).toBe(0)
                expect(stats.maxDelayDays).toBe(0)
            })
        })

        describe('TC-19: 空配列を渡した場合', () => {
            it('totalTasksCount=0', () => {
                const project = createTestProject()
                const stats = project.getStatistics([])

                expect(stats.totalTasksCount).toBe(0)
            })
        })
    })

    // ========================================
    // getStatisticsByName() テストケース (TC-20 〜 TC-25)
    // ========================================
    describe('getStatisticsByName()', () => {
        describe('TC-20: 引数なしで全体の担当者別統計を返す', () => {
            it('全担当者の統計が返される', () => {
                const project = createTestProject()
                const stats = project.getStatisticsByName()

                expect(Array.isArray(stats)).toBe(true)
                expect(stats.length).toBeGreaterThan(0)

                const assignees = stats.map(s => s.assignee)
                expect(assignees).toContain('田中')
                expect(assignees).toContain('佐藤')
            })
        })

        describe('TC-21: フィルタオプションで担当者別統計を返す', () => {
            it('{ filter: "認証" } でフィルタ結果の担当者別統計', () => {
                const project = createTestProject()
                const stats = project.getStatisticsByName({ filter: '認証' })

                // 認証機能のタスクは田中のみ
                expect(stats.length).toBe(1)
                expect(stats[0].assignee).toBe('田中')
            })
        })

        describe('TC-22: TaskRow[]を渡して担当者別統計を返す', () => {
            it('渡されたタスクの担当者別統計', () => {
                const project = createTestProject()
                const filteredTasks = project.filterTasks({ filter: '認証' })
                const stats = project.getStatisticsByName(filteredTasks)

                expect(stats.length).toBe(1)
                expect(stats[0].assignee).toBe('田中')
            })
        })

        describe('TC-23: 担当者ごとにETC\'が計算される', () => {
            it('各担当者のetcPrimeが正しい', () => {
                const project = createTestProject()
                const stats = project.getStatisticsByName()

                stats.forEach(stat => {
                    if (stat.spi && stat.spi > 0) {
                        expect(stat.etcPrime).toBeDefined()
                    }
                })
            })
        })

        describe('TC-24: 担当者ごとに遅延情報が計算される', () => {
            it('各担当者のdelayedTaskCount等が正しい', () => {
                const project = createTestProject()
                const stats = project.getStatisticsByName()

                stats.forEach(stat => {
                    expect(stat.delayedTaskCount).toBeDefined()
                    expect(stat.averageDelayDays).toBeDefined()
                    expect(stat.maxDelayDays).toBeDefined()
                })
            })
        })

        describe('TC-25: 担当者未設定のタスクがある場合', () => {
            it('assignee=undefined のエントリが含まれる', () => {
                // 担当者未設定のタスクを含むプロジェクト
                const taskWithoutAssignee = createTaskNode({
                    id: 1,
                    name: '担当者なしタスク',
                    assignee: undefined,
                    workload: 3,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-08'),
                    progressRate: 0,
                    pv: 3,
                    ev: 0,
                    scheduledWorkDays: 3,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-08')),
                    isLeaf: true,
                })

                const taskWithAssignee = createTaskNode({
                    id: 2,
                    name: '担当者ありタスク',
                    assignee: '山田',
                    workload: 5,
                    startDate: new Date('2025-01-06'),
                    endDate: new Date('2025-01-10'),
                    progressRate: 0.5, // 50% = 0.5
                    pv: 5,
                    ev: 2.5,
                    scheduledWorkDays: 5,
                    plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                    isLeaf: true,
                })

                const project = new Project(
                    [taskWithoutAssignee, taskWithAssignee],
                    baseDate,
                    [],
                    startDate,
                    endDate,
                    '担当者混在プロジェクト'
                )

                const stats = project.getStatisticsByName()

                // assignee=undefined のエントリが含まれる
                const undefinedAssignee = stats.find(s => s.assignee === undefined)
                expect(undefinedAssignee).toBeDefined()
            })
        })
    })

    // ========================================
    // 統合テストケース (TC-30 〜 TC-33)
    // ========================================
    describe('統合テスト', () => {
        describe('TC-30: filterTasks → getStatistics の連携', () => {
            it('フィルタ→統計が正しく動作', () => {
                const project = createTestProject()
                const filteredTasks = project.filterTasks({ filter: '認証' })
                const statsFromTasks = project.getStatistics(filteredTasks)
                const statsFromOptions = project.getStatistics({ filter: '認証' })

                // 両方の結果が同じになる
                expect(statsFromTasks.totalTasksCount).toBe(statsFromOptions.totalTasksCount)
            })
        })

        describe('TC-31: filterTasks → getStatisticsByName の連携', () => {
            it('フィルタ→担当者別統計が正しく動作', () => {
                const project = createTestProject()
                const filteredTasks = project.filterTasks({ filter: '認証' })
                const statsFromTasks = project.getStatisticsByName(filteredTasks)
                const statsFromOptions = project.getStatisticsByName({ filter: '認証' })

                expect(statsFromTasks.length).toBe(statsFromOptions.length)
            })
        })

        describe('TC-32: getStatistics() と statisticsByProject[0] の整合性', () => {
            it('同じ結果を返す', () => {
                const project = createTestProject()
                const statsFromMethod = project.getStatistics()
                const statsFromGetter = project.statisticsByProject[0]

                expect(statsFromMethod.totalTasksCount).toBe(statsFromGetter.totalTasksCount)
                expect(statsFromMethod.totalPvCalculated).toBe(statsFromGetter.totalPvCalculated)
                expect(statsFromMethod.totalEv).toBe(statsFromGetter.totalEv)
                expect(statsFromMethod.spi).toBe(statsFromGetter.spi)
            })
        })

        describe('TC-33: getStatisticsByName() と statisticsByName の整合性', () => {
            it('同じ結果を返す', () => {
                const project = createTestProject()
                const statsFromMethod = project.getStatisticsByName()
                const statsFromGetter = project.statisticsByName

                expect(statsFromMethod.length).toBe(statsFromGetter.length)

                // 各担当者のデータを比較
                statsFromMethod.forEach((methodStat, index) => {
                    const getterStat = statsFromGetter[index]
                    expect(methodStat.assignee).toBe(getterStat.assignee)
                    expect(methodStat.totalTasksCount).toBe(getterStat.totalTasksCount)
                })
            })
        })
    })
})
