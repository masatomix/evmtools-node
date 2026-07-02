import { date2Sn } from 'excel-csv-read-write'
import { TaskRow, PROGRESS_RATE_EPSILON } from '../TaskRow'

/**
 * phase0-bugfix-0.0.29 要件4（finished の許容誤差化）・要件5（親タスク累積PVの土日除外）・
 * 要件3（シリアル比較の時刻成分正規化）のテスト
 */

function createTaskRow(
    overrides: Partial<{
        progressRate: number | undefined
        workload: number
        scheduledWorkDays: number
        startDate: Date
        endDate: Date
        isLeaf: boolean
        plotMap: Map<number, boolean>
    }> = {}
): TaskRow {
    const startDate = overrides.startDate ?? new Date(2025, 5, 9) // 2025-06-09 (月)
    const endDate = overrides.endDate ?? new Date(2025, 5, 13) // 2025-06-13 (金)
    return new TaskRow(
        1,
        1,
        1,
        'テストタスク',
        '担当者A',
        overrides.workload ?? 5,
        startDate,
        endDate,
        undefined,
        undefined,
        overrides.progressRate,
        overrides.scheduledWorkDays ?? 5,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        overrides.isLeaf ?? true,
        overrides.plotMap ?? createPlotMap(startDate, endDate, true)
    )
}

/** plotMap を作る。excludeWeekend=false なら土日もプロット（親タスク相当） */
function createPlotMap(
    startDate: Date,
    endDate: Date,
    excludeWeekend: boolean
): Map<number, boolean> {
    const plotMap = new Map<number, boolean>()
    const current = new Date(startDate)
    while (current <= endDate) {
        const day = current.getDay()
        if (!excludeWeekend || (day !== 0 && day !== 6)) {
            plotMap.set(date2Sn(current), true)
        }
        current.setDate(current.getDate() + 1)
    }
    return plotMap
}

describe('TaskRow.finished（許容誤差付き完了判定）', () => {
    const cases: Array<[string, number | undefined, boolean]> = [
        ['1.0 ちょうど', 1.0, true],
        ['浮動小数誤差 0.9999999999', 0.9999999999, true],
        ['1.0 超（入力誤り）', 1.2, true],
        ['1.0000001', 1.0000001, true],
        ['0.99 は未完了', 0.99, false],
        ['0.9999 は未完了（EPSILON=1e-9 より大きい差）', 0.9999, false],
        ['0 は未完了', 0, false],
        ['undefined は未完了', undefined, false],
    ]

    it.each(cases)('progressRate=%s (%s) => %s', (_desc, progressRate, expected) => {
        expect(createTaskRow({ progressRate }).finished).toBe(expected)
    })

    it('EPSILON は 1e-9（再検証トリガー: この値の変更は要仕様確認）', () => {
        expect(PROGRESS_RATE_EPSILON).toBe(1e-9)
    })
})

describe('TaskRow.isOverdueAt（finished と対称）', () => {
    const baseDate = new Date(2025, 5, 16) // endDate(6/13) より後

    it('浮動小数誤差 0.9999999999 は完了扱い → 期限切れでない', () => {
        expect(createTaskRow({ progressRate: 0.9999999999 }).isOverdueAt(baseDate)).toBe(false)
    })

    it('0.99 は未完了 → 期限切れ', () => {
        expect(createTaskRow({ progressRate: 0.99 }).isOverdueAt(baseDate)).toBe(true)
    })

    it('undefined は未完了 → 期限切れ', () => {
        expect(createTaskRow({ progressRate: undefined }).isOverdueAt(baseDate)).toBe(true)
    })
})

describe('TaskRow.calculatePVs（土日・祝日除外）', () => {
    // 期間: 2025-06-06(金) 〜 2025-06-11(水)。土日(6/7,6/8)を跨ぐ
    const startDate = new Date(2025, 5, 6)
    const endDate = new Date(2025, 5, 11)

    it('リーフ（平日のみプロット）は従来どおり: 稼働日数分の累積PV', () => {
        const plotMap = createPlotMap(startDate, endDate, true) // 金,月,火,水 = 4日
        const task = createTaskRow({
            startDate,
            endDate,
            workload: 4,
            scheduledWorkDays: 4,
            plotMap,
        })
        // 期間全体で workload=4 が積み上がる（1日1.0）
        expect(task.calculatePVs(new Date(2025, 5, 11))).toBeCloseTo(4)
    })

    it('親タスク相当（土日もプロット）でも、土日分は累積に混入しない', () => {
        const plotMap = createPlotMap(startDate, endDate, false) // 金,土,日,月,火,水 = 6日プロット
        const task = createTaskRow({
            startDate,
            endDate,
            workload: 6,
            scheduledWorkDays: 6, // 親タスクは稼働予定日数も土日込みで誤っているという前提を再現
            isLeaf: false,
            plotMap,
        })
        // workloadPerDay = 6/6 = 1.0。土日(6/7,6/8)はスキップされるため、
        // 累積は 金,月,火,水 の4日分 = 4.0（修正前は 6.0 になっていた）
        expect(task.calculatePVs(new Date(2025, 5, 11))).toBeCloseTo(4)
    })

    it('isHolidayFn を注入すると祝日も除外される', () => {
        const plotMap = createPlotMap(startDate, endDate, true)
        const task = createTaskRow({
            startDate,
            endDate,
            workload: 4,
            scheduledWorkDays: 4,
            plotMap,
        })
        const holiday = new Date(2025, 5, 9) // 6/9(月) を祝日とする
        const isHolidayFn = (d: Date) => d.getTime() === holiday.getTime()
        // 金,火,水 の3日分（月曜が祝日除外）
        expect(task.calculatePVs(new Date(2025, 5, 11), isHolidayFn)).toBeCloseTo(3)
    })

    it('baseDate に時刻成分があってもシリアル比較がずれない', () => {
        const plotMap = createPlotMap(startDate, endDate, true)
        const task = createTaskRow({
            startDate,
            endDate,
            workload: 4,
            scheduledWorkDays: 4,
            plotMap,
        })
        const morning = new Date(2025, 5, 10, 9, 30) // 6/10(火) 朝
        const midnight = new Date(2025, 5, 10) // 6/10(火) 0時
        expect(task.calculatePVs(morning)).toBeCloseTo(task.calculatePVs(midnight))
    })
})

describe('TaskRow.remainingDays（シリアル正規化の回帰）', () => {
    it('baseDate の時刻成分に依らず同じ残日数を返す', () => {
        const startDate = new Date(2025, 5, 9)
        const endDate = new Date(2025, 5, 13)
        const task = createTaskRow({ startDate, endDate })

        const midnight = new Date(2025, 5, 11)
        const evening = new Date(2025, 5, 11, 21, 0)
        expect(task.remainingDays(evening)).toBe(task.remainingDays(midnight))
    })
})
