import { date2Sn } from 'excel-csv-read-write'
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
 * テスト用のTaskRow生成ヘルパー
 */
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
    }> = {}
): TaskRow {
    const defaults = {
        sharp: 1,
        id: 1,
        level: 1,
        name: 'テストタスク',
    }

    const merged = { ...defaults, ...overrides }

    return new TaskRow(
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
        merged.plotMap
    )
}

describe('TaskRow pv-today feature (REQ-PV-TODAY-001)', () => {
    // ===========================================
    // remainingDays 正常系 (TC-01〜TC-04)
    // ===========================================
    describe('remainingDays - 正常系', () => {
        it('TC-01: 基準日がタスク期間中央の場合、残りの稼働日数を返す', () => {
            // 2025-06-09(月)〜2025-06-13(金)の5日間タスク
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 5,
                scheduledWorkDays: 5,
            })

            // 基準日=2025-06-11(水) → 残り3日(水,木,金)
            const baseDate = new Date('2025-06-11')
            expect(task.remainingDays(baseDate)).toBe(3)
        })

        it('TC-02: 基準日がタスク開始日の場合、全稼働日数を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 5,
                scheduledWorkDays: 5,
            })

            // 基準日=開始日 → 残り5日
            const baseDate = new Date('2025-06-09')
            expect(task.remainingDays(baseDate)).toBe(5)
        })

        it('TC-03: 基準日がタスク終了日の場合、1日を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 5,
                scheduledWorkDays: 5,
            })

            // 基準日=終了日 → 残り1日
            const baseDate = new Date('2025-06-13')
            expect(task.remainingDays(baseDate)).toBe(1)
        })

        it('TC-04: 土日を含む期間でも稼働日のみカウントする', () => {
            // 2025-06-09(月)〜2025-06-17(火): 9日間だが稼働日は7日
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-17')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 7,
                scheduledWorkDays: 7,
            })

            // 基準日=2025-06-12(木) → 残り4日(木,金,月,火)
            const baseDate = new Date('2025-06-12')
            expect(task.remainingDays(baseDate)).toBe(4)
        })
    })

    // ===========================================
    // remainingDays 境界値 (TC-05〜TC-07)
    // ===========================================
    describe('remainingDays - 境界値', () => {
        it('TC-05: 基準日がタスク開始前の場合、0を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 5,
                scheduledWorkDays: 5,
            })

            // 基準日 < startDate
            const baseDate = new Date('2025-06-06')
            expect(task.remainingDays(baseDate)).toBe(0)
        })

        it('TC-06: 基準日がタスク終了後の場合、0を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 5,
                scheduledWorkDays: 5,
            })

            // 基準日 > endDate
            const baseDate = new Date('2025-06-16')
            expect(task.remainingDays(baseDate)).toBe(0)
        })

        it('TC-07: 残日数が1日の場合', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 5,
                scheduledWorkDays: 5,
            })

            // 基準日=終了日
            const baseDate = new Date('2025-06-13')
            expect(task.remainingDays(baseDate)).toBe(1)
        })
    })

    // ===========================================
    // remainingDays 異常系 (TC-08〜TC-10)
    // ===========================================
    describe('remainingDays - 異常系', () => {
        it('TC-08: startDateがundefinedの場合、undefinedを返す', () => {
            const endDate = new Date('2025-06-13')

            const task = createTaskRow({
                endDate,
                plotMap: new Map(),
                workload: 5,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-11')
            expect(task.remainingDays(baseDate)).toBeUndefined()
        })

        it('TC-09: endDateがundefinedの場合、undefinedを返す', () => {
            const startDate = new Date('2025-06-09')

            const task = createTaskRow({
                startDate,
                plotMap: new Map(),
                workload: 5,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-11')
            expect(task.remainingDays(baseDate)).toBeUndefined()
        })

        it('TC-10: plotMapがundefinedの場合、undefinedを返す', () => {
            const task = createTaskRow({
                startDate: new Date('2025-06-09'),
                endDate: new Date('2025-06-13'),
                workload: 5,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-11')
            expect(task.remainingDays(baseDate)).toBeUndefined()
        })
    })

    // ===========================================
    // pvTodayActual 正常系 (TC-11〜TC-14)
    // ===========================================
    describe('pvTodayActual - 正常系', () => {
        it('TC-11: 遅れタスク（実行PV > 計画PV）', () => {
            // 工数2.5, 3日予定, 進捗60%, 残1日
            // 計画PV = 2.5 / 3 = 0.833
            // 残工数 = 2.5 × 0.4 = 1.0
            // 実行PV = 1.0 / 1 = 1.0
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11') // 月火水の3日
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 2.5,
                scheduledWorkDays: 3,
                progressRate: 0.6,
            })

            // 基準日=終了日（残1日）
            const baseDate = new Date('2025-06-11')
            expect(task.pvTodayActual(baseDate)).toBeCloseTo(1.0, 5)
        })

        it('TC-12: 前倒しタスク（実行PV < 計画PV）', () => {
            // 工数2.5, 3日予定, 進捗60%, 残2日
            // 計画PV = 2.5 / 3 = 0.833
            // 残工数 = 2.5 × 0.4 = 1.0
            // 実行PV = 1.0 / 2 = 0.5
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 2.5,
                scheduledWorkDays: 3,
                progressRate: 0.6,
            })

            // 基準日=2日目（残2日）
            const baseDate = new Date('2025-06-10')
            expect(task.pvTodayActual(baseDate)).toBeCloseTo(0.5, 5)
        })

        it('TC-13: 計画通りタスク', () => {
            // 工数3.0, 3日予定, 進捗66.7%, 残1日
            // 計画PV = 3.0 / 3 = 1.0
            // 残工数 = 3.0 × 0.333 ≒ 1.0
            // 実行PV = 1.0 / 1 = 1.0
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 3.0,
                scheduledWorkDays: 3,
                progressRate: 2 / 3, // 約66.7%
            })

            // 基準日=終了日（残1日）
            const baseDate = new Date('2025-06-11')
            expect(task.pvTodayActual(baseDate)).toBeCloseTo(1.0, 5)
        })

        it('TC-14: 進捗0%のタスク', () => {
            // 工数3.0, 3日予定, 進捗0%, 残3日
            // 残工数 = 3.0 × 1.0 = 3.0
            // 実行PV = 3.0 / 3 = 1.0
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 3.0,
                scheduledWorkDays: 3,
                progressRate: 0,
            })

            // 基準日=開始日（残3日）
            const baseDate = new Date('2025-06-09')
            expect(task.pvTodayActual(baseDate)).toBeCloseTo(1.0, 5)
        })
    })

    // ===========================================
    // pvTodayActual 境界値 (TC-15〜TC-17)
    // ===========================================
    describe('pvTodayActual - 境界値', () => {
        it('TC-15: 進捗100%のタスクは0を返す（残工数0）', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 3.0,
                scheduledWorkDays: 3,
                progressRate: 1.0,
            })

            const baseDate = new Date('2025-06-10')
            expect(task.pvTodayActual(baseDate)).toBe(0)
        })

        it('TC-16: 残日数0の場合は0を返す（ゼロ除算回避）', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 3.0,
                scheduledWorkDays: 3,
                progressRate: 0.5,
            })

            // 基準日 > endDate → remainingDays = 0
            const baseDate = new Date('2025-06-16')
            expect(task.pvTodayActual(baseDate)).toBe(0)
        })

        it('TC-17: progressRateがundefinedの場合は0%として計算する', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 3.0,
                scheduledWorkDays: 3,
                // progressRate: undefined
            })

            // progressRate = 0として計算
            // 残工数 = 3.0 × 1.0 = 3.0
            // 基準日=開始日 → 残3日
            // 実行PV = 3.0 / 3 = 1.0
            const baseDate = new Date('2025-06-09')
            expect(task.pvTodayActual(baseDate)).toBeCloseTo(1.0, 5)
        })
    })

    // ===========================================
    // pvTodayActual 異常系 (TC-18〜TC-19)
    // ===========================================
    describe('pvTodayActual - 異常系', () => {
        it('TC-18: workloadがundefinedの場合、undefinedを返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-11')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                // workload: undefined
                scheduledWorkDays: 3,
                progressRate: 0.5,
            })

            const baseDate = new Date('2025-06-10')
            expect(task.pvTodayActual(baseDate)).toBeUndefined()
        })

        it('TC-19: remainingDaysがundefinedの場合、undefinedを返す', () => {
            const task = createTaskRow({
                // startDate, endDate, plotMap が不足
                workload: 3.0,
                scheduledWorkDays: 3,
                progressRate: 0.5,
            })

            const baseDate = new Date('2025-06-10')
            expect(task.pvTodayActual(baseDate)).toBeUndefined()
        })
    })
})
