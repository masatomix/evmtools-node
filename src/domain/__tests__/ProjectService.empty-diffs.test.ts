import { ProjectService, TaskDiff } from '../ProjectService'

/**
 * phase0-bugfix-0.0.29 要件2: calculateProjectDiffs の空入力デフォルト値保証
 *
 * 従来は tidy/summarize が空配列に対して PV/EV フィールド undefined の結果を返し、
 * 利用側（task スキルの compare.ts など）がデフォルト値へのマージを強いられていた。
 */

function createTaskDiff(overrides: Partial<TaskDiff> = {}): TaskDiff {
    return {
        id: 1,
        name: 'タスク',
        fullName: 'プロジェクト/タスク',
        assignee: '担当者A',
        parentId: undefined,
        deltaProgressRate: 0.1,
        deltaPV: 1,
        deltaEV: 2,
        prevPV: 5,
        prevEV: 4,
        currentPV: 6,
        currentEV: 6,
        prevProgressRate: 0.4,
        currentProgressRate: 0.5,
        hasDiff: true,
        hasProgressRateDiff: true,
        hasPvDiff: true,
        hasEvDiff: true,
        diffType: 'modified',
        finished: false,
        isOverdueAt: false,
        workload: 10,
        prevBaseDate: new Date('2025-06-09'),
        currentBaseDate: new Date('2025-06-10'),
        baseDate: new Date('2025-06-10'),
        daysOverdueAt: undefined,
        daysStrOverdueAt: undefined,
        currentTask: undefined,
        prevTask: undefined,
        ...overrides,
    }
}

describe('ProjectService.calculateProjectDiffs（空入力デフォルト値）', () => {
    let service: ProjectService

    beforeEach(() => {
        service = new ProjectService()
    })

    it('空配列で全数値フィールド0のデフォルト ProjectDiff を1件返す（undefined フィールドなし）', () => {
        const result = service.calculateProjectDiffs([])

        expect(result).toHaveLength(1)
        const diff = result[0]
        expect(diff.deltaPV).toBe(0)
        expect(diff.deltaEV).toBe(0)
        expect(diff.prevPV).toBe(0)
        expect(diff.prevEV).toBe(0)
        expect(diff.currentPV).toBe(0)
        expect(diff.currentEV).toBe(0)
        expect(diff.modifiedCount).toBe(0)
        expect(diff.addedCount).toBe(0)
        expect(diff.removedCount).toBe(0)
        expect(diff.hasDiff).toBe(false)
        expect(diff.finished).toBe(true) // 空集合の every() と同じ扱い

        // undefined のフィールドが1つもないこと
        for (const [key, value] of Object.entries(diff)) {
            expect(value).not.toBeUndefined()
            void key
        }
    })

    it('全件 hasDiff:false（フィルタ後空）でもデフォルト ProjectDiff を返す', () => {
        const noDiff = createTaskDiff({
            hasDiff: false,
            diffType: 'none',
            deltaPV: 0,
            deltaEV: 0,
            hasPvDiff: false,
            hasEvDiff: false,
            hasProgressRateDiff: false,
        })

        const result = service.calculateProjectDiffs([noDiff, { ...noDiff, id: 2 }])

        expect(result).toHaveLength(1)
        expect(result[0].hasDiff).toBe(false)
        expect(result[0].deltaPV).toBe(0)
        expect(result[0].currentEV).toBe(0)
    })

    it('非空入力（差分あり）は従来どおり集計する（回帰なし）', () => {
        const d1 = createTaskDiff({ id: 1, deltaPV: 1, deltaEV: 2 })
        const d2 = createTaskDiff({ id: 2, deltaPV: 3, deltaEV: 4 })

        const result = service.calculateProjectDiffs([d1, d2])

        expect(result).toHaveLength(1)
        expect(result[0].deltaPV).toBe(4)
        expect(result[0].deltaEV).toBe(6)
        expect(result[0].modifiedCount).toBe(2)
        expect(result[0].hasDiff).toBe(true)
    })
})
