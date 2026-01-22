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
function createTaskRow(overrides: Partial<{
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
}> = {}): TaskRow {
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

describe('TaskRow.pvToday', () => {
    describe('calculateRemainingDays', () => {
        describe('正常系', () => {
            // TC-01: 基準日=開始日、3日間のタスク
            it('TC-01: 基準日=開始日の場合、全日数を返す', () => {
                // 2026-01-20(月)〜2026-01-22(水)の3日間
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-20') // 開始日
                expect(task.calculateRemainingDays(baseDate)).toBe(3)
            })

            // TC-02: 基準日=中間日、3日間のタスク
            it('TC-02: 基準日=中間日の場合、残日数を返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-21') // 火曜日（中間日）
                expect(task.calculateRemainingDays(baseDate)).toBe(2)
            })

            // TC-03: 基準日=終了日
            it('TC-03: 基準日=終了日の場合、1を返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-22') // 終了日
                expect(task.calculateRemainingDays(baseDate)).toBe(1)
            })
        })

        describe('境界値', () => {
            // TC-04: 基準日が終了日より後
            it('TC-04: 基準日が終了日より後の場合、0を返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-23') // 終了日より後
                expect(task.calculateRemainingDays(baseDate)).toBe(0)
            })

            // TC-05: 基準日が開始日より前
            it('TC-05: 基準日が開始日より前の場合、全日数を返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-17') // 開始日より前
                expect(task.calculateRemainingDays(baseDate)).toBe(3)
            })

            // TC-06: 1日のみのタスク
            it('TC-06: 1日のみのタスクの場合、1を返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-20') // 同一日
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 1,
                    scheduledWorkDays: 1,
                })

                const baseDate = new Date('2026-01-20')
                expect(task.calculateRemainingDays(baseDate)).toBe(1)
            })
        })

        describe('異常系', () => {
            // TC-07: startDateがundefined
            it('TC-07: startDateがundefinedの場合、undefinedを返す', () => {
                const endDate = new Date('2026-01-22')
                const plotMap = new Map<number, boolean>()

                const task = createTaskRow({
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-20')
                expect(task.calculateRemainingDays(baseDate)).toBeUndefined()
            })

            // TC-08: endDateがundefined
            it('TC-08: endDateがundefinedの場合、undefinedを返す', () => {
                const startDate = new Date('2026-01-20')
                const plotMap = new Map<number, boolean>()

                const task = createTaskRow({
                    startDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-20')
                expect(task.calculateRemainingDays(baseDate)).toBeUndefined()
            })

            // TC-09: plotMapがundefined
            it('TC-09: plotMapがundefinedの場合、undefinedを返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')

                const task = createTaskRow({
                    startDate,
                    endDate,
                    workload: 3,
                    scheduledWorkDays: 3,
                })

                const baseDate = new Date('2026-01-20')
                expect(task.calculateRemainingDays(baseDate)).toBeUndefined()
            })
        })
    })

    describe('calculatePvTodayActual', () => {
        describe('正常系', () => {
            // TC-10: 遅れタスク（基準日=終了日）
            it('TC-10: 遅れタスク（基準日=終了日）の場合、実行PVを返す', () => {
                // 工数2.5MD, 3日間, 進捗率60%, 基準日=終了日
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 2.5,
                    scheduledWorkDays: 3,
                    progressRate: 0.6,
                })

                const baseDate = new Date('2026-01-22') // 終了日、残日数=1
                // 残工数 = 2.5 * (1 - 0.6) = 1.0
                // 実行PV = 1.0 / 1 = 1.0
                expect(task.calculatePvTodayActual(baseDate)).toBe(1.0)
            })

            // TC-11: 前倒しタスク（基準日=終了日-1）
            it('TC-11: 前倒しタスク（基準日=終了日-1）の場合、実行PVを返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 2.5,
                    scheduledWorkDays: 3,
                    progressRate: 0.6,
                })

                const baseDate = new Date('2026-01-21') // 終了日-1、残日数=2
                // 残工数 = 2.5 * (1 - 0.6) = 1.0
                // 実行PV = 1.0 / 2 = 0.5
                expect(task.calculatePvTodayActual(baseDate)).toBe(0.5)
            })

            // TC-12: 予定通りタスク
            it('TC-12: 予定通りタスクの場合、計画PVと同等の実行PVを返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3.0,
                    scheduledWorkDays: 3,
                    progressRate: 0.5, // 50%完了
                })

                const baseDate = new Date('2026-01-21') // 2日目開始時点、残日数=2
                // 残工数 = 3.0 * (1 - 0.5) = 1.5
                // 実行PV = 1.5 / 2 = 0.75
                // （※予定通りの場合、1日目終了時点で33%なので、50%は少し前倒し）
                expect(task.calculatePvTodayActual(baseDate)).toBe(0.75)
            })
        })

        describe('境界値', () => {
            // TC-13: 完了タスク（progressRate=1.0）
            it('TC-13: 完了タスク（progressRate=1.0）の場合、0を返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                    progressRate: 1.0, // 完了
                })

                const baseDate = new Date('2026-01-21')
                expect(task.calculatePvTodayActual(baseDate)).toBe(0)
            })

            // TC-14: 進捗0%のタスク
            it('TC-14: 進捗0%のタスクの場合、workload/残日数を返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3.0,
                    scheduledWorkDays: 3,
                    progressRate: 0, // 0%
                })

                const baseDate = new Date('2026-01-20') // 残日数=3
                // 残工数 = 3.0 * (1 - 0) = 3.0
                // 実行PV = 3.0 / 3 = 1.0
                expect(task.calculatePvTodayActual(baseDate)).toBe(1.0)
            })

            // TC-15: 残日数=0（終了日過ぎ）
            it('TC-15: 残日数=0（終了日過ぎ）の場合、undefinedを返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                    progressRate: 0.5,
                })

                const baseDate = new Date('2026-01-23') // 終了日より後
                expect(task.calculatePvTodayActual(baseDate)).toBeUndefined()
            })
        })

        describe('異常系', () => {
            // TC-16: progressRateがundefined
            it('TC-16: progressRateがundefinedの場合、undefinedを返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    workload: 3,
                    scheduledWorkDays: 3,
                    // progressRate未設定
                })

                const baseDate = new Date('2026-01-21')
                expect(task.calculatePvTodayActual(baseDate)).toBeUndefined()
            })

            // TC-17: workloadがundefined
            it('TC-17: workloadがundefinedの場合、undefinedを返す', () => {
                const startDate = new Date('2026-01-20')
                const endDate = new Date('2026-01-22')
                const plotMap = createPlotMap(startDate, endDate)

                const task = createTaskRow({
                    startDate,
                    endDate,
                    plotMap,
                    // workload未設定
                    scheduledWorkDays: 3,
                    progressRate: 0.5,
                })

                const baseDate = new Date('2026-01-21')
                expect(task.calculatePvTodayActual(baseDate)).toBeUndefined()
            })

            // TC-18: 日付データ不正
            it('TC-18: 日付データが不正の場合、undefinedを返す', () => {
                const task = createTaskRow({
                    // startDate, endDate, plotMap未設定
                    workload: 3,
                    scheduledWorkDays: 3,
                    progressRate: 0.5,
                })

                const baseDate = new Date('2026-01-21')
                expect(task.calculatePvTodayActual(baseDate)).toBeUndefined()
            })
        })
    })

    describe('pvToday（計画PV）との比較', () => {
        it('遅れている場合: pvTodayActual > workloadPerDay', () => {
            const startDate = new Date('2026-01-20')
            const endDate = new Date('2026-01-22')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 2.5,
                scheduledWorkDays: 3,
                progressRate: 0.6, // 60%完了、残40%
            })

            const baseDate = new Date('2026-01-22') // 終了日

            const pvToday = task.workloadPerDay // 計画PV = 2.5/3 = 0.833...
            const pvTodayActual = task.calculatePvTodayActual(baseDate) // 実行PV = 1.0

            expect(pvToday).toBeCloseTo(0.833, 2)
            expect(pvTodayActual).toBe(1.0)
            expect(pvTodayActual!).toBeGreaterThan(pvToday!) // 遅れ
        })

        it('前倒しの場合: pvTodayActual < workloadPerDay', () => {
            const startDate = new Date('2026-01-20')
            const endDate = new Date('2026-01-22')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 2.5,
                scheduledWorkDays: 3,
                progressRate: 0.6, // 60%完了
            })

            const baseDate = new Date('2026-01-21') // 終了日-1

            const pvToday = task.workloadPerDay // 計画PV = 0.833...
            const pvTodayActual = task.calculatePvTodayActual(baseDate) // 実行PV = 0.5

            expect(pvToday).toBeCloseTo(0.833, 2)
            expect(pvTodayActual).toBe(0.5)
            expect(pvTodayActual!).toBeLessThan(pvToday!) // 前倒し
        })
    })
})
