/**
 * PbevmShowPvUsecase テスト
 * 要件ID: REQ-CLI-002
 * GitHub Issue: #72, #86
 */
import { TaskRow } from '../../domain'
import { dateStr } from '../../common'
import { date2Sn } from 'excel-csv-read-write'

describe('PbevmShowPvUsecase CLI出力整形', () => {
    /**
     * TaskRowから表示用データへの変換をシミュレート
     * 実際の変換ロジック（pbevm-show-pv-usecase.ts）と同じ構造
     * 明示的にプロパティを選択することで内部プロパティを除外
     * Issue #86: pvToday, remainingDays, pvTodayActual を追加
     */
    const convertToDisplayData = (taskRow: TaskRow, baseDate: Date) => ({
        sharp: taskRow.sharp,
        id: taskRow.id,
        level: taskRow.level,
        name: taskRow.name,
        assignee: taskRow.assignee,
        workload: taskRow.workload,
        予定開始日: dateStr(taskRow.startDate),
        予定終了日: dateStr(taskRow.endDate),
        実績開始日: dateStr(taskRow.actualStartDate),
        実績終了日: dateStr(taskRow.actualEndDate),
        progressRate: taskRow.progressRate,
        scheduledWorkDays: taskRow.scheduledWorkDays,
        pv: taskRow.pv,
        ev: taskRow.ev,
        spi: taskRow.spi,
        pvToday: taskRow.workloadPerDay,
        remainingDays: taskRow.calculateRemainingDays(baseDate),
        pvTodayActual: taskRow.calculatePvTodayActual(baseDate),
        進捗応当日: dateStr(taskRow.expectedProgressDate),
        delayDays: taskRow.delayDays,
        remarks: taskRow.remarks,
        parentId: taskRow.parentId,
        isLeaf: taskRow.isLeaf,
    })

    // テスト用のplotMapを作成（土日除外）
    const createPlotMap = (startDate: Date, endDate: Date): Map<number, boolean> => {
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

    // テスト用のTaskRowを作成
    const createTestTaskRow = (): TaskRow => {
        const startDate = new Date('2025-01-06') // 月曜日
        const endDate = new Date('2025-01-10') // 金曜日（5日間）
        const plotMap = createPlotMap(startDate, endDate)

        return new TaskRow(
            1, // sharp
            101, // id
            1, // level
            'テストタスク', // name
            '担当者A', // assignee
            5, // workload
            startDate, // startDate
            endDate, // endDate
            new Date('2025-01-06'), // actualStartDate
            undefined, // actualEndDate
            0.5, // progressRate
            5, // scheduledWorkDays
            5, // pv
            2.5, // ev
            0.5, // spi
            undefined, // expectedProgressDate
            0, // delayDays
            'テスト備考', // remarks
            undefined, // parentId
            true, // isLeaf
            plotMap // plotMap
        )
    }

    // テスト用のbaseDate
    const baseDate = new Date('2025-01-08') // 水曜日（中間日）

    describe('T-01: 出力オブジェクトに logger が含まれない', () => {
        it('logger プロパティが存在しないこと', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).not.toHaveProperty('logger')
        })
    })

    describe('T-02: 出力オブジェクトに calculateSPI が含まれない', () => {
        it('calculateSPI プロパティが存在しないこと', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).not.toHaveProperty('calculateSPI')
        })
    })

    describe('T-03: 出力オブジェクトに calculateSV が含まれない', () => {
        it('calculateSV プロパティが存在しないこと', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).not.toHaveProperty('calculateSV')
        })
    })

    describe('T-04: 必要なプロパティは保持される', () => {
        it('id, name, assignee などの主要プロパティが存在すること', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).toHaveProperty('id', 101)
            expect(displayData).toHaveProperty('name', 'テストタスク')
            expect(displayData).toHaveProperty('assignee', '担当者A')
            expect(displayData).toHaveProperty('workload', 5)
            expect(displayData).toHaveProperty('progressRate', 0.5)
            expect(displayData).toHaveProperty('ev', 2.5)
        })
    })

    describe('その他の除外対象プロパティも含まれない', () => {
        it('calculatePV, calculatePVs, plotMap, checkStartEndDateAndPlotMap が存在しないこと', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).not.toHaveProperty('calculatePV')
            expect(displayData).not.toHaveProperty('calculatePVs')
            expect(displayData).not.toHaveProperty('plotMap')
            expect(displayData).not.toHaveProperty('checkStartEndDateAndPlotMap')
        })
    })

    describe('T-05: pvToday関連プロパティが含まれる (Issue #86)', () => {
        it('pvToday（計画PV）が存在すること', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).toHaveProperty('pvToday')
            expect(displayData.pvToday).toBe(1) // 5 / 5 = 1
        })

        it('remainingDays（残日数）が存在すること', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).toHaveProperty('remainingDays')
            expect(displayData.remainingDays).toBe(3) // 水木金の3日間
        })

        it('pvTodayActual（実行PV）が存在すること', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow, baseDate)

            expect(displayData).toHaveProperty('pvTodayActual')
            // 残工数 = 5 * (1 - 0.5) = 2.5
            // 残日数 = 3
            // 実行PV = 2.5 / 3 = 0.833...
            expect(displayData.pvTodayActual).toBeCloseTo(0.833, 2)
        })
    })
})
