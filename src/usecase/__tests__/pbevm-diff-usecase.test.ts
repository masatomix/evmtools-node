import { TaskDiff } from '../../domain/ProjectService'
import { TaskRow } from '../../domain/TaskRow'
import { formatTaskDiffsForDisplay } from '../pbevm-diff-usecase'

/**
 * pbevm-diff-usecaseのテスト
 *
 * REQ-CLI-003: pbevm-diff出力から不要なプロパティを除去
 *
 * formatTaskDiffsForDisplay関数:
 * - TaskDiff配列から表示用オブジェクト配列を生成
 * - currentTask, prevTask プロパティを除外
 * - hasDiff=true のもののみフィルタ
 */

// モックのTaskRowを作成（必要最小限のプロパティのみ）
const createMockTaskRow = (id: number): TaskRow => {
    return {
        sharp: id,
        id,
        level: 1,
        name: `Task ${id}`,
        isLeaf: true,
    } as TaskRow
}

// テスト用のTaskDiffを作成
const createTaskDiff = (
    id: number,
    hasDiff: boolean,
    includeTaskRefs: boolean = true
): TaskDiff => {
    const base: TaskDiff = {
        id,
        name: `Task ${id}`,
        fullName: `/Project/Task ${id}`,
        assignee: 'TestUser',
        diffType: hasDiff ? 'modified' : 'none',
        deltaProgressRate: hasDiff ? 0.1 : 0,
        prevProgressRate: 0.5,
        currentProgressRate: hasDiff ? 0.6 : 0.5,
        hasProgressRateDiff: hasDiff,
        hasPvDiff: false,
        hasEvDiff: false,
        isOverdueAt: false,
        hasDiff,
        finished: false,
        prevPV: 10,
        currentPV: 10,
        prevEV: 5,
        currentEV: hasDiff ? 6 : 5,
    }

    if (includeTaskRefs) {
        return {
            ...base,
            prevTask: createMockTaskRow(id),
            currentTask: createMockTaskRow(id),
        }
    }

    return base
}

describe('formatTaskDiffsForDisplay', () => {
    describe('プロパティ除外', () => {
        it('TC-01: 結果にcurrentTaskプロパティが含まれないこと', () => {
            const taskDiffs: TaskDiff[] = [createTaskDiff(1, true), createTaskDiff(2, true)]

            const result = formatTaskDiffsForDisplay(taskDiffs)

            result.forEach((item) => {
                expect(item).not.toHaveProperty('currentTask')
            })
        })

        it('TC-02: 結果にprevTaskプロパティが含まれないこと', () => {
            const taskDiffs: TaskDiff[] = [createTaskDiff(1, true), createTaskDiff(2, true)]

            const result = formatTaskDiffsForDisplay(taskDiffs)

            result.forEach((item) => {
                expect(item).not.toHaveProperty('prevTask')
            })
        })

        it('TC-03: 必要なプロパティ（id, name, diffType等）が含まれること', () => {
            const taskDiffs: TaskDiff[] = [createTaskDiff(1, true)]

            const result = formatTaskDiffsForDisplay(taskDiffs)

            expect(result).toHaveLength(1)
            expect(result[0]).toHaveProperty('id', 1)
            expect(result[0]).toHaveProperty('name', 'Task 1')
            expect(result[0]).toHaveProperty('diffType', 'modified')
            expect(result[0]).toHaveProperty('assignee', 'TestUser')
            expect(result[0]).toHaveProperty('deltaProgressRate', 0.1)
            expect(result[0]).toHaveProperty('hasDiff', true)
        })
    })

    describe('フィルタリング', () => {
        it('hasDiff=falseのタスクは除外されること', () => {
            const taskDiffs: TaskDiff[] = [
                createTaskDiff(1, true),
                createTaskDiff(2, false), // hasDiff = false
                createTaskDiff(3, true),
            ]

            const result = formatTaskDiffsForDisplay(taskDiffs)

            expect(result).toHaveLength(2)
            expect(result.map((r) => r.id)).toEqual([1, 3])
        })

        it('全てhasDiff=falseの場合、空配列を返すこと', () => {
            const taskDiffs: TaskDiff[] = [createTaskDiff(1, false), createTaskDiff(2, false)]

            const result = formatTaskDiffsForDisplay(taskDiffs)

            expect(result).toHaveLength(0)
        })

        it('空配列を渡すと空配列を返すこと', () => {
            const result = formatTaskDiffsForDisplay([])

            expect(result).toHaveLength(0)
        })
    })

    describe('TaskRow参照がundefinedの場合', () => {
        it('currentTask, prevTaskがundefinedでも正常に動作すること', () => {
            const taskDiffs: TaskDiff[] = [
                createTaskDiff(1, true, false), // TaskRow参照なし
            ]

            const result = formatTaskDiffsForDisplay(taskDiffs)

            expect(result).toHaveLength(1)
            expect(result[0]).not.toHaveProperty('currentTask')
            expect(result[0]).not.toHaveProperty('prevTask')
            expect(result[0]).toHaveProperty('id', 1)
        })
    })
})
