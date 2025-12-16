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

describe('TaskRow', () => {
    describe('workloadPerDay', () => {
        it('予定工数と稼働予定日数から1日あたりの工数を計算する', () => {
            const task = createTaskRow({
                workload: 10,
                scheduledWorkDays: 5,
            })
            expect(task.workloadPerDay).toBe(2)
        })

        it('稼働予定日数が0の場合はundefinedを返す', () => {
            const task = createTaskRow({
                workload: 10,
                scheduledWorkDays: 0,
            })
            expect(task.workloadPerDay).toBeUndefined()
        })

        it('workloadがundefinedの場合はundefinedを返す', () => {
            const task = createTaskRow({
                scheduledWorkDays: 5,
            })
            expect(task.workloadPerDay).toBeUndefined()
        })

        it('scheduledWorkDaysがundefinedの場合はundefinedを返す', () => {
            const task = createTaskRow({
                workload: 10,
            })
            expect(task.workloadPerDay).toBeUndefined()
        })
    })

    describe('finished', () => {
        it('進捗率が1.0の場合はtrueを返す', () => {
            const task = createTaskRow({ progressRate: 1.0 })
            expect(task.finished).toBe(true)
        })

        it('進捗率が1.0未満の場合はfalseを返す', () => {
            const task = createTaskRow({ progressRate: 0.5 })
            expect(task.finished).toBe(false)
        })

        it('進捗率が0の場合はfalseを返す', () => {
            const task = createTaskRow({ progressRate: 0 })
            expect(task.finished).toBe(false)
        })

        it('進捗率がundefinedの場合はfalseを返す', () => {
            const task = createTaskRow({})
            expect(task.finished).toBe(false)
        })
    })

    describe('isOverdueAt', () => {
        it('終了日が基準日以前かつ未完了の場合はtrueを返す', () => {
            const task = createTaskRow({
                endDate: new Date('2025-06-10'),
                progressRate: 0.5,
            })
            const baseDate = new Date('2025-06-10')
            expect(task.isOverdueAt(baseDate)).toBe(true)
        })

        it('終了日が基準日より後の場合はfalseを返す', () => {
            const task = createTaskRow({
                endDate: new Date('2025-06-15'),
                progressRate: 0.5,
            })
            const baseDate = new Date('2025-06-10')
            expect(task.isOverdueAt(baseDate)).toBe(false)
        })

        it('完了している場合はfalseを返す', () => {
            const task = createTaskRow({
                endDate: new Date('2025-06-10'),
                progressRate: 1.0,
            })
            const baseDate = new Date('2025-06-15')
            expect(task.isOverdueAt(baseDate)).toBe(false)
        })

        it('進捗率がundefinedの場合は未完了と見なす', () => {
            const task = createTaskRow({
                endDate: new Date('2025-06-10'),
            })
            const baseDate = new Date('2025-06-10')
            expect(task.isOverdueAt(baseDate)).toBe(true)
        })

        it('終了日がundefinedの場合はfalseを返す', () => {
            const task = createTaskRow({
                progressRate: 0.5,
            })
            const baseDate = new Date('2025-06-10')
            expect(task.isOverdueAt(baseDate)).toBe(false)
        })
    })

    describe('validStatus', () => {
        it('すべての必須データが揃っている場合はisValid=trueを返す', () => {
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
            expect(task.validStatus.isValid).toBe(true)
        })

        it('開始日がundefinedの場合はisValid=falseを返す', () => {
            const endDate = new Date('2025-06-13')

            const task = createTaskRow({
                endDate,
                plotMap: new Map(),
                workload: 5,
                scheduledWorkDays: 5,
            })
            expect(task.validStatus.isValid).toBe(false)
            expect(task.validStatus.invalidReason).toContain('日付エラー')
        })

        it('終了日がundefinedの場合はisValid=falseを返す', () => {
            const startDate = new Date('2025-06-09')

            const task = createTaskRow({
                startDate,
                plotMap: new Map(),
                workload: 5,
                scheduledWorkDays: 5,
            })
            expect(task.validStatus.isValid).toBe(false)
            expect(task.validStatus.invalidReason).toContain('日付エラー')
        })

        it('plotMapがundefinedの場合はisValid=falseを返す', () => {
            const task = createTaskRow({
                startDate: new Date('2025-06-09'),
                endDate: new Date('2025-06-13'),
                workload: 5,
                scheduledWorkDays: 5,
            })
            expect(task.validStatus.isValid).toBe(false)
            expect(task.validStatus.invalidReason).toContain('plotMapエラー')
        })

        it('稼働予定日数が0の場合はisValid=falseを返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 5,
                scheduledWorkDays: 0,
            })
            expect(task.validStatus.isValid).toBe(false)
            expect(task.validStatus.invalidReason).toContain('日数エラー')
        })
    })

    describe('calculatePV', () => {
        it('稼働日の場合、1日あたりの工数を返す', () => {
            // 2025-06-09(月)〜2025-06-13(金)の5日間
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            // 2025-06-10(火)のPV
            const baseDate = new Date('2025-06-10')
            expect(task.calculatePV(baseDate)).toBe(2) // 10 / 5 = 2
        })

        it('タスク期間外の場合は0を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            // タスク開始前
            const baseDateBefore = new Date('2025-06-06')
            expect(task.calculatePV(baseDateBefore)).toBe(0)

            // タスク終了後
            const baseDateAfter = new Date('2025-06-16')
            expect(task.calculatePV(baseDateAfter)).toBe(0)
        })

        it('土日（plotMapにない日）の場合は0を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-15') // 日曜日を含む
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            // 2025-06-14(土)のPV
            const baseDate = new Date('2025-06-14')
            expect(task.calculatePV(baseDate)).toBe(0)
        })

        it('必須データが不足している場合はundefinedを返す', () => {
            const task = createTaskRow({
                workload: 10,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-10')
            expect(task.calculatePV(baseDate)).toBeUndefined()
        })
    })

    describe('calculatePVs', () => {
        it('基準日までの累積PVを計算する', () => {
            // 2025-06-09(月)〜2025-06-13(金)の5日間
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            // 2025-06-11(水)までの累積PV = 3日分
            const baseDate = new Date('2025-06-11')
            expect(task.calculatePVs(baseDate)).toBe(6) // (10/5) * 3 = 6
        })

        it('タスク開始前は0を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-06')
            expect(task.calculatePVs(baseDate)).toBe(0)
        })

        it('タスク終了後は全工数を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-20')
            expect(task.calculatePVs(baseDate)).toBe(10)
        })

        it('必須データが不足している場合は0を返す', () => {
            const task = createTaskRow({
                workload: 10,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-10')
            expect(task.calculatePVs(baseDate)).toBe(0)
        })
    })

    describe('calculateSPI', () => {
        it('SPI = EV / 累積PV を計算する', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
                ev: 4, // 出来高は4
            })

            // 2025-06-11(水)までの累積PV = 6
            // SPI = 4 / 6 = 0.666...
            const baseDate = new Date('2025-06-11')
            const spi = task.calculateSPI(baseDate)
            expect(spi).toBeCloseTo(0.6667, 3)
        })

        it('累積PVが0の場合はundefinedを返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
                ev: 4,
            })

            // タスク開始前の累積PV = 0
            const baseDate = new Date('2025-06-06')
            expect(task.calculateSPI(baseDate)).toBeUndefined()
        })

        it('EVがundefinedの場合はundefinedを返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-11')
            expect(task.calculateSPI(baseDate)).toBeUndefined()
        })
    })

    describe('calculateSV', () => {
        it('SV = EV - 累積PV を計算する', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
                ev: 4,
            })

            // 2025-06-11(水)までの累積PV = 6
            // SV = 4 - 6 = -2
            const baseDate = new Date('2025-06-11')
            expect(task.calculateSV(baseDate)).toBe(-2)
        })

        it('EVがundefinedの場合はundefinedを返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
            })

            const baseDate = new Date('2025-06-11')
            expect(task.calculateSV(baseDate)).toBeUndefined()
        })

        it('予定より進んでいる場合は正の値を返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
                workload: 10,
                scheduledWorkDays: 5,
                ev: 8,
            })

            // 2025-06-11(水)までの累積PV = 6
            // SV = 8 - 6 = 2
            const baseDate = new Date('2025-06-11')
            expect(task.calculateSV(baseDate)).toBe(2)
        })
    })

    describe('checkStartEndDateAndPlotMap', () => {
        it('すべてのデータが揃っている場合はtrueを返す', () => {
            const startDate = new Date('2025-06-09')
            const endDate = new Date('2025-06-13')
            const plotMap = createPlotMap(startDate, endDate)

            const task = createTaskRow({
                startDate,
                endDate,
                plotMap,
            })

            expect(task.checkStartEndDateAndPlotMap()).toBe(true)
        })

        it('開始日がundefinedの場合はfalseを返す', () => {
            const task = createTaskRow({
                endDate: new Date('2025-06-13'),
                plotMap: new Map(),
            })

            expect(task.checkStartEndDateAndPlotMap()).toBe(false)
        })

        it('終了日がundefinedの場合はfalseを返す', () => {
            const task = createTaskRow({
                startDate: new Date('2025-06-09'),
                plotMap: new Map(),
            })

            expect(task.checkStartEndDateAndPlotMap()).toBe(false)
        })

        it('plotMapがundefinedの場合はfalseを返す', () => {
            const task = createTaskRow({
                startDate: new Date('2025-06-09'),
                endDate: new Date('2025-06-13'),
            })

            expect(task.checkStartEndDateAndPlotMap()).toBe(false)
        })
    })
})
