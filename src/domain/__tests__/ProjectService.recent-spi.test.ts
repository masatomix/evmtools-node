import { date2Sn } from 'excel-csv-read-write'
import { ProjectService } from '../ProjectService'
import { Project } from '../Project'
import { TaskRow } from '../TaskRow'
import { TaskNode } from '../TaskNode'
import { getLogger } from '../../logger'

/**
 * ProjectService.calculateRecentSpi のテスト
 * REQ-SPI-001: 直近N日のSPI計算機能
 *
 * コンセプト: 「渡したProjectから取得できる最善のSPI」
 * - 渡されたProject群の累積SPIの平均を返す
 * - 場合分け不要。常に平均。
 */

// ロガーのモック
const mockWarn = jest.fn()

jest.mock('../../logger', () => ({
    getLogger: jest.fn(() => ({
        warn: (...args: unknown[]) => mockWarn(...args),
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    })),
}))

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

function createTaskRow(
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
        pv: number
        ev: number
        parentId: number
        isLeaf: boolean
        plotMap: Map<number, boolean>
    }> = {}
): TaskRow {
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

/**
 * SPI = EV / PV となるようなProjectを作成
 *
 * 仕組み:
 * - baseDateを基準に、そこまでにちょうど終わるタスクを作成
 * - タスクの開始〜終了日をbaseDateまでに設定することで、累積PV = workload
 * - EV = workload * spi なので、SPI = EV / PV = spi
 *
 * @param spi 目標SPI
 * @param baseDate 基準日（Projectの基準日）
 */
function createProjectWithSpi(spi: number, baseDate: Date): Project {
    // タスクの終了日をbaseDateより前に設定（baseDateにはPV全体が計上される）
    // タスク期間: baseDate の5稼働日前〜baseDateの前日
    const endDate = new Date(baseDate)
    endDate.setDate(endDate.getDate() - 1) // baseDateの前日を終了日

    // 5稼働日前を開始日（簡略化のため1週間前）
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6) // 1週間前

    const workload = 5
    const scheduledWorkDays = 5 // 仮に5稼働日

    // plotMapを作成（平日のみ）
    const plotMap = createPlotMap(startDate, endDate)
    const actualWorkDays = plotMap.size // 実際の稼働日数

    // EV = workload * spi でSPIが指定値になる
    const ev = workload * spi

    const task = createTaskRow({
        id: 1,
        workload,
        scheduledWorkDays: actualWorkDays, // plotMapの実際の日数を使用
        startDate,
        endDate,
        ev,
        progressRate: spi,
        isLeaf: true,
        plotMap,
    })

    // baseDateはタスク終了日より後なのでPV = workload（全て計上される）
    return createProject([createTaskNode(task)], baseDate, {
        startDate,
        endDate,
    })
}

/**
 * SPIがundefinedとなるProjectを作成（PV=0）
 *
 * baseDateをタスク開始日より前に設定することでPV=0になる
 */
function createProjectWithUndefinedSpi(baseDate: Date): Project {
    // タスクは未来（baseDateより後）に設定
    const startDate = new Date('2025-07-01')
    const endDate = new Date('2025-07-11')
    const plotMap = createPlotMap(startDate, endDate)

    const task = createTaskRow({
        id: 1,
        workload: 10,
        scheduledWorkDays: 9, // 9稼働日
        startDate,
        endDate,
        ev: 0,
        progressRate: 0,
        isLeaf: true,
        plotMap,
    })

    // baseDateはタスク開始日より前なのでPV=0、EV=0でSPIはundefined
    return createProject([createTaskNode(task)], baseDate, {
        startDate,
        endDate,
    })
}

/**
 * フィルタ用に複数タスクを持つProjectを作成
 *
 * baseDateより前にタスクが終わるように設定してPV=workloadになる
 */
function createProjectWithMultipleTasks(
    baseDate: Date,
    tasks: Array<{ id: number; name: string; pv: number; ev: number }>
): Project {
    // タスクの終了日をbaseDateより前に設定
    const endDate = new Date(baseDate)
    endDate.setDate(endDate.getDate() - 1)

    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6)

    const plotMap = createPlotMap(startDate, endDate)
    const actualWorkDays = plotMap.size

    const taskNodes = tasks.map((t) => {
        const taskRow = createTaskRow({
            id: t.id,
            name: t.name,
            workload: t.pv, // workload = pv でPV計算値が期待通りになる
            scheduledWorkDays: actualWorkDays,
            startDate,
            endDate,
            ev: t.ev,
            progressRate: t.pv > 0 ? t.ev / t.pv : 0,
            isLeaf: true,
            plotMap,
        })
        return createTaskNode(taskRow)
    })

    return createProject(taskNodes, baseDate, {
        startDate,
        endDate,
    })
}

describe('ProjectService.calculateRecentSpi', () => {
    let service: ProjectService

    beforeEach(() => {
        service = new ProjectService()
        jest.clearAllMocks()
    })

    describe('正常系', () => {
        it('TC-01: 1点渡し - そのProjectの累積SPIを返す', () => {
            const project = createProjectWithSpi(0.8, new Date('2025-06-10'))

            const result = service.calculateRecentSpi([project])

            expect(result).toBeCloseTo(0.8)
        })

        it('TC-02: 2点渡し - 2つの累積SPIの平均を返す', () => {
            const p1 = createProjectWithSpi(0.8, new Date('2025-06-10'))
            const p2 = createProjectWithSpi(1.0, new Date('2025-06-11'))

            const result = service.calculateRecentSpi([p1, p2])

            expect(result).toBeCloseTo(0.9) // (0.8 + 1.0) / 2
        })

        it('TC-03: N点渡し - N個の累積SPIの平均を返す', () => {
            const p1 = createProjectWithSpi(0.8, new Date('2025-06-09'))
            const p2 = createProjectWithSpi(0.9, new Date('2025-06-10'))
            const p3 = createProjectWithSpi(1.0, new Date('2025-06-11'))

            const result = service.calculateRecentSpi([p1, p2, p3])

            expect(result).toBeCloseTo(0.9) // (0.8 + 0.9 + 1.0) / 3
        })

        it('TC-04: フィルタ付き - フィルタ結果のSPI平均を返す', () => {
            const tasks = [
                { id: 1, name: '認証/ログイン', pv: 10, ev: 8 }, // SPI = 0.8
                { id: 2, name: '認証/ログアウト', pv: 10, ev: 10 }, // SPI = 1.0
                { id: 3, name: 'ダッシュボード', pv: 10, ev: 5 }, // SPI = 0.5 (フィルタ外)
            ]
            const p1 = createProjectWithMultipleTasks(new Date('2025-06-10'), tasks)
            const p2 = createProjectWithMultipleTasks(new Date('2025-06-11'), tasks)

            const result = service.calculateRecentSpi([p1, p2], { filter: '認証' })

            // 認証タスクのみ: PV=20, EV=18 → SPI=0.9
            // 両Projectで同じなので平均も0.9
            expect(result).toBeCloseTo(0.9)
        })
    })

    describe('境界値', () => {
        it('TC-05: 空配列 - undefinedを返す', () => {
            const result = service.calculateRecentSpi([])

            expect(result).toBeUndefined()
        })

        it('TC-06: 全SPIがundefined - undefinedを返す', () => {
            const p1 = createProjectWithUndefinedSpi(new Date('2025-06-10'))
            const p2 = createProjectWithUndefinedSpi(new Date('2025-06-11'))

            const result = service.calculateRecentSpi([p1, p2])

            expect(result).toBeUndefined()
        })

        it('TC-07: 一部SPIがundefined - 有効なSPIのみで平均を計算', () => {
            const p1 = createProjectWithSpi(0.8, new Date('2025-06-10'))
            const p2 = createProjectWithUndefinedSpi(new Date('2025-06-11'))

            const result = service.calculateRecentSpi([p1, p2])

            expect(result).toBeCloseTo(0.8) // undefinedは除外
        })

        it('TC-08: SPI=0のProject - 0も有効な値として計算', () => {
            const p1 = createProjectWithSpi(0, new Date('2025-06-10'))
            const p2 = createProjectWithSpi(1.0, new Date('2025-06-11'))

            const result = service.calculateRecentSpi([p1, p2])

            expect(result).toBeCloseTo(0.5) // (0 + 1.0) / 2
        })
    })

    describe('警告テスト', () => {
        it('TC-09: 期間30日以内 - 警告なし', () => {
            const p1 = createProjectWithSpi(0.8, new Date('2025-06-01'))
            const p2 = createProjectWithSpi(1.0, new Date('2025-06-07')) // 6日差

            service.calculateRecentSpi([p1, p2])

            expect(mockWarn).not.toHaveBeenCalled()
        })

        it('TC-10: 期間30日超 - 警告あり、計算は成功', () => {
            const p1 = createProjectWithSpi(0.8, new Date('2025-06-01'))
            const p2 = createProjectWithSpi(1.0, new Date('2025-07-16')) // 45日差

            const result = service.calculateRecentSpi([p1, p2])

            expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('45 日と長いです'))
            expect(result).toBeCloseTo(0.9) // 警告が出ても計算は成功
        })

        it('TC-11: 閾値カスタム - 指定した閾値で警告', () => {
            const p1 = createProjectWithSpi(0.8, new Date('2025-06-01'))
            const p2 = createProjectWithSpi(1.0, new Date('2025-06-21')) // 20日差

            service.calculateRecentSpi([p1, p2], { warnThresholdDays: 15 })

            expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('20 日と長いです'))
        })

        it('TC-12: 1点のみ - 警告チェック対象外', () => {
            const p1 = createProjectWithSpi(0.8, new Date('2025-06-01'))

            service.calculateRecentSpi([p1])

            expect(mockWarn).not.toHaveBeenCalled()
        })
    })
})
