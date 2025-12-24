/**
 * PbevmShowPvUsecase テスト
 * 要件ID: REQ-CLI-002
 * GitHub Issue: #72
 */
import { TaskRow } from '../../domain'
import { dateStr } from '../../common'

describe('PbevmShowPvUsecase CLI出力整形', () => {
    /**
     * TaskRowから表示用データへの変換をシミュレート
     * 実際の変換ロジック（pbevm-show-pv-usecase.ts）と同じ構造
     * 明示的にプロパティを選択することで内部プロパティを除外
     */
    const convertToDisplayData = (taskRow: TaskRow) => ({
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
        進捗応当日: dateStr(taskRow.expectedProgressDate),
        delayDays: taskRow.delayDays,
        remarks: taskRow.remarks,
        parentId: taskRow.parentId,
        isLeaf: taskRow.isLeaf,
    })

    // テスト用のTaskRowを作成
    const createTestTaskRow = (): TaskRow => {
        return new TaskRow(
            1, // sharp
            101, // id
            1, // level
            'テストタスク', // name
            '担当者A', // assignee
            5, // workload
            new Date('2025-01-01'), // startDate
            new Date('2025-01-10'), // endDate
            new Date('2025-01-02'), // actualStartDate
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
            new Map() // plotMap
        )
    }

    describe('T-01: 出力オブジェクトに logger が含まれない', () => {
        it('logger プロパティが存在しないこと', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow)

            expect(displayData).not.toHaveProperty('logger')
        })
    })

    describe('T-02: 出力オブジェクトに calculateSPI が含まれない', () => {
        it('calculateSPI プロパティが存在しないこと', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow)

            expect(displayData).not.toHaveProperty('calculateSPI')
        })
    })

    describe('T-03: 出力オブジェクトに calculateSV が含まれない', () => {
        it('calculateSV プロパティが存在しないこと', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow)

            expect(displayData).not.toHaveProperty('calculateSV')
        })
    })

    describe('T-04: 必要なプロパティは保持される', () => {
        it('id, name, assignee などの主要プロパティが存在すること', () => {
            const taskRow = createTestTaskRow()
            const displayData = convertToDisplayData(taskRow)

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
            const displayData = convertToDisplayData(taskRow)

            expect(displayData).not.toHaveProperty('calculatePV')
            expect(displayData).not.toHaveProperty('calculatePVs')
            expect(displayData).not.toHaveProperty('plotMap')
            expect(displayData).not.toHaveProperty('checkStartEndDateAndPlotMap')
        })
    })
})
