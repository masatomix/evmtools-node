import { date2Sn } from 'excel-csv-read-write'
import { ProjectService } from '../ProjectService'
import { Project } from '../Project'
import { TaskRow } from '../TaskRow'
import { TaskNode } from '../TaskNode'
import { getLogger } from '../../logger'

/**
 * ProjectService.calculateRecentSpi のテスト
 * REQ-SPI-001 / Issue #139, #170: 期間SPI（ΔEV/ΔPV）
 *
 * コンセプト: 「窓端2点の増分で直近の実勢効率を測る」
 * - 期間SPI = (EV_newest - EV_oldest) / (PV_newest - PV_oldest)
 * - 累積SPIの平均ではない（#170 で修正）。母数効果・終盤1.0収束を引き継がない
 * - 2点未満・ΔPV<=0・統計取得不能は undefined
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
 * 共通のタスク期間（1日あたりPV=1.0 になる設定）
 * 2025-06-02(月)〜2025-06-27(金): 平日20日、workload=20, scheduledWorkDays=20
 *
 * 各 baseDate 時点の累積PV（自明な手計算値）:
 * - 2025-06-10(火): 7  (6/2〜6/6 の5日 + 6/9,6/10 の2日)
 * - 2025-06-11(水): 8
 * - 2025-06-13(金): 10
 */
const WINDOW_START = new Date('2025-06-02')
const WINDOW_END = new Date('2025-06-27')
const WINDOW_WORKLOAD = 20

/**
 * 指定した baseDate・累積EV を持つスナップショット Project を作成する。
 * タスクは全スナップショットで同一（期間・工数）で、EV のみが時点により異なる。
 */
function createSnapshot(baseDate: Date, ev: number): Project {
    const plotMap = createPlotMap(WINDOW_START, WINDOW_END)
    const task = createTaskRow({
        id: 1,
        workload: WINDOW_WORKLOAD,
        scheduledWorkDays: plotMap.size,
        startDate: WINDOW_START,
        endDate: WINDOW_END,
        ev,
        progressRate: ev / WINDOW_WORKLOAD,
        isLeaf: true,
        plotMap,
    })
    return createProject([createTaskNode(task)], baseDate, {
        startDate: WINDOW_START,
        endDate: WINDOW_END,
    })
}

/**
 * フィルタ用: 認証系とダッシュボードの2タスクを持つスナップショット
 */
function createSnapshotWithTasks(
    baseDate: Date,
    evs: { auth: number; dashboard: number }
): Project {
    const plotMap = createPlotMap(WINDOW_START, WINDOW_END)
    const make = (id: number, name: string, ev: number) =>
        createTaskNode(
            createTaskRow({
                id,
                name,
                workload: WINDOW_WORKLOAD,
                scheduledWorkDays: plotMap.size,
                startDate: WINDOW_START,
                endDate: WINDOW_END,
                ev,
                progressRate: ev / WINDOW_WORKLOAD,
                isLeaf: true,
                plotMap,
            })
        )
    return createProject(
        [make(1, '認証/ログイン', evs.auth), make(2, 'ダッシュボード', evs.dashboard)],
        baseDate,
        { startDate: WINDOW_START, endDate: WINDOW_END }
    )
}

describe('ProjectService.calculateRecentSpi', () => {
    let service: ProjectService

    beforeEach(() => {
        service = new ProjectService()
        jest.clearAllMocks()
    })

    describe('正常系（ΔEV/ΔPV）', () => {
        it('TC-01: 1点渡し - 期間が定義できないため undefined', () => {
            const project = createSnapshot(new Date('2025-06-10'), 7)

            const result = service.calculateRecentSpi([project])

            expect(result).toBeUndefined()
        })

        it('TC-02: 2点渡し - 窓端2点の ΔEV/ΔPV を返す（累積SPIの平均ではない）', () => {
            // p1@6/10: PV=7, EV=7   (累積SPI 1.0)
            // p2@6/13: PV=10, EV=8.5 (累積SPI 0.85)
            const p1 = createSnapshot(new Date('2025-06-10'), 7)
            const p2 = createSnapshot(new Date('2025-06-13'), 8.5)

            const result = service.calculateRecentSpi([p1, p2])

            // ΔEV=1.5, ΔPV=3 → 期間SPI=0.5
            expect(result).toBeCloseTo(0.5)
            // 旧実装（累積SPIの平均）なら (1.0+0.85)/2=0.925 になっていた
            expect(result).not.toBeCloseTo(0.925)
        })

        it('TC-03: N点渡し - 窓端2点のみ使用し、中間スナップショットは無視する', () => {
            const p1 = createSnapshot(new Date('2025-06-10'), 7)
            const mid = createSnapshot(new Date('2025-06-11'), 100) // 異常な中間値
            const p3 = createSnapshot(new Date('2025-06-13'), 8.5)

            const result = service.calculateRecentSpi([p1, mid, p3])

            expect(result).toBeCloseTo(0.5) // TC-02 と同じ（中間は無視）
        })

        it('TC-03b: 渡し順に依らず baseDate でソートして窓端を決める', () => {
            const p1 = createSnapshot(new Date('2025-06-10'), 7)
            const p2 = createSnapshot(new Date('2025-06-13'), 8.5)

            const result = service.calculateRecentSpi([p2, p1]) // 逆順で渡す

            expect(result).toBeCloseTo(0.5)
        })

        it('TC-04: フィルタ付き - フィルタ後タスク集合の ΔEV/ΔPV を返す', () => {
            // 認証: EV 7→8.5 (Δ1.5), ダッシュボード: EV 0→5 (Δ5)
            const p1 = createSnapshotWithTasks(new Date('2025-06-10'), { auth: 7, dashboard: 0 })
            const p2 = createSnapshotWithTasks(new Date('2025-06-13'), { auth: 8.5, dashboard: 5 })

            const result = service.calculateRecentSpi([p1, p2], { filter: '認証' })

            // 認証のみ: ΔEV=1.5, ΔPV=3 → 0.5
            expect(result).toBeCloseTo(0.5)

            // フィルタなしだと ΔEV=6.5, ΔPV=6 → 約1.083（フィルタが効いている確認）
            const unfiltered = service.calculateRecentSpi([p1, p2])
            expect(unfiltered).toBeCloseTo(6.5 / 6)
        })
    })

    describe('境界値', () => {
        it('TC-05: 空配列 - undefinedを返す', () => {
            const result = service.calculateRecentSpi([])

            expect(result).toBeUndefined()
        })

        it('TC-06: ΔPV=0（同一基準日の2点） - undefinedを返す', () => {
            const p1 = createSnapshot(new Date('2025-06-10'), 7)
            const p2 = createSnapshot(new Date('2025-06-10'), 8)

            const result = service.calculateRecentSpi([p1, p2])

            expect(result).toBeUndefined()
        })

        it('TC-07: ΔPV<0（再計画でPVが減少） - undefinedを返す', () => {
            // p1@6/13: PV=10
            const p1 = createSnapshot(new Date('2025-06-13'), 8)

            // p2@6/17: タスクが後ろ倒しに再計画され、累積PVが 3 に減った
            // 期間 6/16(月)〜7/11(金) 平日20日、6/17時点の累積PV = 2日分 = 2
            const newStart = new Date('2025-06-16')
            const newEnd = new Date('2025-07-11')
            const plotMap = createPlotMap(newStart, newEnd)
            const task = createTaskRow({
                id: 1,
                workload: WINDOW_WORKLOAD,
                scheduledWorkDays: plotMap.size,
                startDate: newStart,
                endDate: newEnd,
                ev: 8,
                progressRate: 8 / WINDOW_WORKLOAD,
                isLeaf: true,
                plotMap,
            })
            const p2 = createProject([createTaskNode(task)], new Date('2025-06-17'), {
                startDate: newStart,
                endDate: newEnd,
            })

            const result = service.calculateRecentSpi([p1, p2])

            expect(result).toBeUndefined()
        })

        it('TC-08: ΔEV=0（期間中に出来高なし） - 0を返す（0も有効な期間SPI）', () => {
            const p1 = createSnapshot(new Date('2025-06-10'), 7)
            const p2 = createSnapshot(new Date('2025-06-13'), 7) // EV変化なし

            const result = service.calculateRecentSpi([p1, p2])

            expect(result).toBeCloseTo(0)
        })
    })

    describe('警告テスト', () => {
        it('TC-09: 期間30日以内 - 警告なし', () => {
            const p1 = createSnapshot(new Date('2025-06-04'), 2)
            const p2 = createSnapshot(new Date('2025-06-10'), 7) // 6日差

            service.calculateRecentSpi([p1, p2])

            expect(mockWarn).not.toHaveBeenCalled()
        })

        it('TC-10: 期間30日超 - 警告あり、計算は成功', () => {
            const p1 = createSnapshot(new Date('2025-06-03'), 2)
            const p2 = createSnapshot(new Date('2025-07-18'), 8) // 45日差（タスク期間外だがPVは上限で計上）

            const result = service.calculateRecentSpi([p1, p2])

            expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('45 日と長いです'))
            expect(result).toBeDefined() // 警告が出ても計算は成功
        })

        it('TC-11: 閾値カスタム - 指定した閾値で警告', () => {
            const p1 = createSnapshot(new Date('2025-06-03'), 2)
            const p2 = createSnapshot(new Date('2025-06-23'), 8) // 20日差

            service.calculateRecentSpi([p1, p2], { warnThresholdDays: 15 })

            expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('20 日と長いです'))
        })

        it('TC-12: 1点のみ - 警告チェック対象外（結果も undefined）', () => {
            const p1 = createSnapshot(new Date('2025-06-10'), 7)

            const result = service.calculateRecentSpi([p1])

            expect(mockWarn).not.toHaveBeenCalled()
            expect(result).toBeUndefined()
        })
    })
})
