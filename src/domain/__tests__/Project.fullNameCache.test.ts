import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../Project'
import { TaskRow } from '../TaskRow'
import { TaskNode } from '../TaskNode'

/**
 * #153 フルパス名キャッシュのテスト（TDD RED フェーズ）
 * spec: .kiro/specs/phase1-minor-issues-0.0.30（要件 3）
 * design: TaskRow の _fullName/setFullName/get fullName と
 *         Project.getFullTaskName の遅延メモ化
 *
 * - 要件 3.1: 2回目以降はキャッシュ済みの値を返し、タスクツリーを再走査しない
 * - 要件 3.2: キャッシュ有無に関わらず戻り値は従来（親名を "/" 連結）と同一
 * - 要件 3.3: 親が存在しないタスクはそのタスク名のみを返す
 */

/**
 * 設計上のキャッシュ API（design.md #153 節）。
 * RED フェーズでは未実装のため、実行時には
 * setFullName は undefined（呼ぶと TypeError）、fullName は undefined となる。
 */
type FullNameCacheApi = {
    setFullName(fullName: string): void
    readonly fullName: string | undefined
}

const withCache = (task: TaskRow): TaskRow & FullNameCacheApi => task as TaskRow & FullNameCacheApi

// ヘルパー関数（ProjectService.recent-spi.test.ts のパターンを流用）
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
        undefined, // pv
        undefined, // ev
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

function createProject(taskNodes: TaskNode[], baseDate: Date = new Date('2025-06-10')): Project {
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
 * 3階層ツリー（ルート/親/子）の Project を作る。
 * parentId は Project.toTaskRows()（convertToTaskRows）が再計算する。
 */
function createThreeLevelProject(): Project {
    const leaf = createTaskNode(createTaskRow({ id: 3, name: '子タスク', isLeaf: true }))
    const mid = createTaskNode(createTaskRow({ id: 2, name: '親タスク', isLeaf: false }), [leaf])
    const root = createTaskNode(createTaskRow({ id: 1, name: 'ルートタスク', isLeaf: false }), [
        mid,
    ])
    return createProject([root])
}

describe('TaskRow フルパス名キャッシュ（#153 要件 3.2）', () => {
    it('TC-01: キャッシュ未設定時、fullName は undefined を返す', () => {
        const task = withCache(createTaskRow({ id: 1, name: 'タスクA' }))

        expect(task.fullName).toBeUndefined()
    })

    it('TC-02: setFullName で格納した値を fullName で取得できる', () => {
        const task = withCache(createTaskRow({ id: 1, name: 'タスクA' }))

        expect(typeof task.setFullName).toBe('function') // 未実装なら undefined で RED
        task.setFullName('ルート/親/タスクA')

        expect(task.fullName).toBe('ルート/親/タスクA')
    })
})

describe('Project.getFullTaskName メモ化（#153）', () => {
    it('TC-03: 1回目の呼び出しで親名を "/" で連結したフルパス名を返す（要件 3.2）', () => {
        const project = createThreeLevelProject()
        const task = project.getTask(3)!

        expect(project.getFullTaskName(task)).toBe('ルートタスク/親タスク/子タスク')
    })

    it('TC-04: 2回目の呼び出しでも 1回目と同一の結果を返す（要件 3.1, 3.2）', () => {
        const project = createThreeLevelProject()
        const task = project.getTask(3)!

        const first = project.getFullTaskName(task)
        const second = project.getFullTaskName(task)

        expect(first).toBe('ルートタスク/親タスク/子タスク')
        expect(second).toBe(first)
    })

    it('TC-05: 2回目はタスクツリーを再走査しない（getTask が呼ばれない）（要件 3.1）', () => {
        const project = createThreeLevelProject()
        const task = project.getTask(3)!

        // 1回目（ウォームアップ）: ここでキャッシュされる想定
        project.getFullTaskName(task)

        const getTaskSpy = jest.spyOn(project, 'getTask')
        const second = project.getFullTaskName(task)

        expect(second).toBe('ルートタスク/親タスク/子タスク')
        // メモ化済みなら親を getTask で辿らない。現行実装は親2件を再走査するため RED
        expect(getTaskSpy).not.toHaveBeenCalled()

        getTaskSpy.mockRestore()
    })

    it('TC-06: 初回算出後、TaskRow にフルパス名がキャッシュされている（要件 3.1）', () => {
        const project = createThreeLevelProject()
        const task = withCache(project.getTask(3)!)

        expect(task.fullName).toBeUndefined() // 算出前は未キャッシュ

        const result = project.getFullTaskName(task)

        expect(result).toBe('ルートタスク/親タスク/子タスク')
        expect(task.fullName).toBe('ルートタスク/親タスク/子タスク') // 算出値が書き込まれる
    })

    it('TC-07: 親が存在しないルートタスクは自名のみを返す（要件 3.3）', () => {
        const project = createThreeLevelProject()
        const rootTask = project.getTask(1)!

        expect(project.getFullTaskName(rootTask)).toBe('ルートタスク')
        // キャッシュ後も同一
        expect(project.getFullTaskName(rootTask)).toBe('ルートタスク')
    })

    it('TC-08: 中間タスクのフルパス名も従来どおり（要件 3.2）', () => {
        const project = createThreeLevelProject()
        const midTask = project.getTask(2)!

        expect(project.getFullTaskName(midTask)).toBe('ルートタスク/親タスク')
    })
})
