import { date2Sn } from 'excel-csv-read-write'
import { ProjectService, TaskDiff } from '../ProjectService'
import { Project } from '../Project'
import { TaskRow } from '../TaskRow'
import { TaskNode } from '../TaskNode'

/**
 * TaskDiff.isReschedule のテスト
 * REQ 2 / Issue #138: リスケ検知プロパティの追加
 *
 * コンセプト: 「計画価値の後退（deltaPV < 0）をリスケとして検知する」
 * - deltaPV が定義済みかつ deltaPV < 0 → isReschedule = true（AC 2.1）
 * - deltaPV が undefined または deltaPV >= 0 → isReschedule = false（AC 2.2）
 * - removed タスクは deltaPV の符号に関わらず isReschedule = false 固定（AC 2.3）
 * - isReschedule は readonly な boolean として TaskDiff に追加され、後方互換を保つ（AC 2.4）
 */

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

function createProject(taskRows: TaskRow[], baseDate: Date): Project {
    const taskNodes = taskRows.map((row) => TaskNode.fromRow(row, []))
    return new Project(
        taskNodes,
        baseDate,
        [], // holidayDatas
        new Date('2025-06-09'),
        new Date('2025-06-13'),
        'テストプロジェクト'
    )
}

/**
 * now/prev の PV 値（undefined 可）からタスク差分を1件生成するヘルパー。
 * 同一 id のタスクを両スナップショットに置き、calculateTaskDiffs の結果を返す。
 */
function diffWithPvs(
    service: ProjectService,
    nowPv: number | undefined,
    prevPv: number | undefined
): TaskDiff {
    const prev = createProject([createTaskRow({ id: 1, pv: prevPv })], new Date('2025-06-10'))
    const now = createProject([createTaskRow({ id: 1, pv: nowPv })], new Date('2025-06-11'))

    const diffs = service.calculateTaskDiffs(now, prev)
    expect(diffs).toHaveLength(1)
    return diffs[0]
}

describe('ProjectService.calculateTaskDiffs - TaskDiff.isReschedule (#138)', () => {
    let service: ProjectService

    beforeEach(() => {
        service = new ProjectService()
    })

    describe('AC 2.1: deltaPV < 0 でリスケ検知', () => {
        it('TC-01: deltaPV < 0（PVが後退） - isReschedule = true', () => {
            // now.pv=3, prev.pv=5 → deltaPV = -2
            const diff = diffWithPvs(service, 3, 5)

            expect(diff.deltaPV).toBe(-2)
            expect(diff.isReschedule).toBe(true)
        })
    })

    describe('AC 2.2: deltaPV が undefined または >= 0 は false', () => {
        it('TC-02: deltaPV = 0（PV変化なし） - isReschedule = false', () => {
            const diff = diffWithPvs(service, 5, 5)

            expect(diff.deltaPV).toBe(0)
            expect(diff.isReschedule).toBe(false)
        })

        it('TC-03: deltaPV > 0（PVが前進） - isReschedule = false', () => {
            const diff = diffWithPvs(service, 7, 5)

            expect(diff.deltaPV).toBe(2)
            expect(diff.isReschedule).toBe(false)
        })

        it('TC-04: deltaPV = undefined（両時点で PV 未定義） - isReschedule = false', () => {
            const diff = diffWithPvs(service, undefined, undefined)

            expect(diff.deltaPV).toBeUndefined()
            expect(diff.isReschedule).toBe(false)
        })

        it('TC-05: added タスク（prev に存在しない） - deltaPV >= 0 なので false', () => {
            const prev = createProject([], new Date('2025-06-10'))
            const now = createProject([createTaskRow({ id: 1, pv: 5 })], new Date('2025-06-11'))

            const diffs = service.calculateTaskDiffs(now, prev)

            expect(diffs).toHaveLength(1)
            expect(diffs[0].diffType).toBe('added')
            expect(diffs[0].deltaPV).toBe(5)
            expect(diffs[0].isReschedule).toBe(false)
        })
    })

    describe('AC 2.3: removed タスクは false 固定', () => {
        it('TC-06: removed タスク - deltaPV < 0 でも isReschedule = false（固定）', () => {
            // prev にのみ存在（pv=5）→ removed diff の deltaPV = -5 (< 0) だが false 固定
            const prev = createProject([createTaskRow({ id: 1, pv: 5 })], new Date('2025-06-10'))
            const now = createProject([], new Date('2025-06-11'))

            const diffs = service.calculateTaskDiffs(now, prev)

            expect(diffs).toHaveLength(1)
            expect(diffs[0].diffType).toBe('removed')
            expect(diffs[0].deltaPV).toBe(-5)
            expect(diffs[0].isReschedule).toBe(false)
        })
    })

    describe('AC 2.4: 型と後方互換', () => {
        it('TC-07: すべての TaskDiff で isReschedule が boolean として定義される', () => {
            const prev = createProject(
                [
                    createTaskRow({ id: 1, pv: 5 }), // PV 後退（modified）
                    createTaskRow({ id: 2, sharp: 2, pv: 3 }), // removed
                ],
                new Date('2025-06-10')
            )
            const now = createProject(
                [
                    createTaskRow({ id: 1, pv: 3 }),
                    createTaskRow({ id: 3, sharp: 3, pv: 2 }), // added
                ],
                new Date('2025-06-11')
            )

            const diffs = service.calculateTaskDiffs(now, prev)

            expect(diffs).toHaveLength(3)
            for (const diff of diffs) {
                expect(typeof diff.isReschedule).toBe('boolean')
            }
        })

        it('TC-08: 既存プロパティの後方互換 - isReschedule 追加後も既存フィールドは不変', () => {
            const diff = diffWithPvs(service, 3, 5)

            // 既存の主要フィールドが従来どおり存在・算出されること
            expect(diff.id).toBe(1)
            expect(diff.deltaPV).toBe(-2)
            expect(diff.prevPV).toBe(5)
            expect(diff.currentPV).toBe(3)
            expect(diff.hasPvDiff).toBe(true)
            expect(diff.diffType).toBe('modified')
        })
    })
})
