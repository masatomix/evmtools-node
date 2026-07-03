import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../Project'
import { TaskNode } from '../TaskNode'
import { TaskRow } from '../TaskRow'

/**
 * #165 Project.getIncompleteTasksUpToToday(baseDate?) のテスト（RED フェーズ）
 *
 * 仕様（design.md #165 節 / requirements.md 要件 4）:
 * - 「今日時点で遅延している未完了タスク」と「今日稼働予定の未完了タスク」を
 *   マージし、同一 id の重複を排除した TaskRow 配列を返す（AC 4.1）
 * - 完了タスク（finished === true、PROGRESS_RATE_EPSILON 許容誤差込み）を除外（AC 4.2）
 * - 非 leaf（親タスク）を除外し、リーフのみ返す（AC 4.3）
 * - 遅延日数の降順・遅延日数が等しい場合は id の昇順でソート（AC 4.4）
 * - baseDate 引数指定時はそれを「今日」とし、未指定時は Project の baseDate を用いる（AC 4.5）
 */

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
 * テスト用のTaskNode生成ヘルパー
 */
function createTaskNode(
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
        children: TaskNode[]
    }> = {}
): TaskNode {
    const defaults = {
        sharp: 1,
        id: 1,
        level: 1,
        name: 'テストタスク',
        isLeaf: true,
    }

    const merged = { ...defaults, ...overrides }

    return new TaskNode(
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
        merged.plotMap,
        merged.children ?? []
    )
}

/**
 * 遅延タスク（endDate < 今日、未完了、leaf）を生成するヘルパー
 */
function createDelayedTaskNode(
    id: number,
    endDate: Date,
    overrides: Parameters<typeof createTaskNode>[0] = {}
): TaskNode {
    const startDate = new Date('2025-01-06')
    return createTaskNode({
        id,
        name: `遅延タスク${id}`,
        startDate,
        endDate,
        workload: 5,
        scheduledWorkDays: 5,
        plotMap: createPlotMap(startDate, endDate),
        isLeaf: true,
        progressRate: 0.5,
        ...overrides,
    })
}

/**
 * 当日稼働タスク（plotMap に今日が乗っている、未完了、leaf）を生成するヘルパー
 * PV が 0 にならないよう workload / scheduledWorkDays を必ず有効値にする
 */
function createTodayTaskNode(
    id: number,
    startDate: Date,
    endDate: Date,
    overrides: Parameters<typeof createTaskNode>[0] = {}
): TaskNode {
    return createTaskNode({
        id,
        name: `当日タスク${id}`,
        startDate,
        endDate,
        workload: 5,
        scheduledWorkDays: 5,
        plotMap: createPlotMap(startDate, endDate),
        isLeaf: true,
        progressRate: 0.5,
        ...overrides,
    })
}

/**
 * 未実装メソッドへのアクセス用交差キャスト。
 * 実装後（タスク 4.2）はそのまま GREEN になる形。
 */
type ProjectWithIncompleteTasks = Project & {
    getIncompleteTasksUpToToday(baseDate?: Date): TaskRow[]
}

function createProject(taskNodes: TaskNode[], baseDate: Date): ProjectWithIncompleteTasks {
    return new Project(
        taskNodes,
        baseDate,
        [],
        new Date('2025-01-06'),
        new Date('2025-01-31'),
        'テストプロジェクト'
    ) as ProjectWithIncompleteTasks
}

describe('Project.getIncompleteTasksUpToToday', () => {
    describe('TC-01: 遅延タスクのみの場合（AC 4.1）', () => {
        it('今日時点で遅延している未完了タスクが結果に含まれる', () => {
            const baseDate = new Date('2025-01-20') // 月曜
            // endDate(1/17) < baseDate(1/20) → 3日遅延
            const delayed = createDelayedTaskNode(1, new Date('2025-01-17'))
            // 今日は稼働しておらず遅延もしていないタスク（1/22開始）→ 対象外
            const future = createTodayTaskNode(2, new Date('2025-01-22'), new Date('2025-01-24'))

            const project = createProject([delayed, future], baseDate)

            const result = project.getIncompleteTasksUpToToday()
            expect(result.map((t) => t.id)).toEqual([1])
        })
    })

    describe('TC-02: 当日稼働タスクのみの場合（AC 4.1）', () => {
        it('今日稼働予定の未完了タスクが結果に含まれる', () => {
            const baseDate = new Date('2025-01-20') // 月曜
            // 1/6〜1/24 に稼働プロット → 1/20 に稼働予定、endDate > baseDate なので遅延なし
            const today = createTodayTaskNode(1, new Date('2025-01-06'), new Date('2025-01-24'))
            // 今日のプロットがないタスク（1/21開始）→ 対象外
            const notToday = createTodayTaskNode(2, new Date('2025-01-21'), new Date('2025-01-24'))

            const project = createProject([today, notToday], baseDate)

            const result = project.getIncompleteTasksUpToToday()
            expect(result.map((t) => t.id)).toEqual([1])
        })
    })

    describe('TC-03: 遅延タスクと当日タスクのマージ（AC 4.1）', () => {
        it('遅延タスクと当日稼働タスクの両方が結果に含まれる', () => {
            const baseDate = new Date('2025-01-20')
            const delayed = createDelayedTaskNode(1, new Date('2025-01-17')) // 3日遅延
            const today = createTodayTaskNode(2, new Date('2025-01-06'), new Date('2025-01-24'))

            const project = createProject([delayed, today], baseDate)

            const result = project.getIncompleteTasksUpToToday()
            // 遅延（+3日）が先、当日（遅延日数は負）が後
            expect(result.map((t) => t.id)).toEqual([1, 2])
        })
    })

    describe('TC-04: 遅延かつ当日のタスクは id で重複排除される（AC 4.1, 4.5）', () => {
        it('Project の baseDate では遅延扱い・引数 baseDate では当日稼働のタスクが 1 件のみ返る', () => {
            // this.baseDate(1/24) 基準では endDate(1/22) < 1/24 で遅延扱い。
            // 引数 baseDate(1/20) 基準では 1/20 に稼働プロットがあり当日タスク。
            // getDelayedTasks()（this.baseDate 固定）と getTaskRows(引数日) を
            // 素朴に連結すると同一タスクが二重に現れうるため、id 重複排除を検証する。
            const projectBaseDate = new Date('2025-01-24')
            const argToday = new Date('2025-01-20') // 月曜
            const both = createTodayTaskNode(1, new Date('2025-01-06'), new Date('2025-01-22'))

            const project = createProject([both], projectBaseDate)

            const result = project.getIncompleteTasksUpToToday(argToday)
            const idCount = result.filter((t) => t.id === 1).length
            expect(idCount).toBe(1)
            expect(result.map((t) => t.id)).toEqual([1])
        })
    })

    describe('TC-05: 完了タスクの除外（AC 4.2）', () => {
        it('progressRate=1.0 の遅延タスクは結果に含まれない', () => {
            const baseDate = new Date('2025-01-20')
            const finishedDelayed = createDelayedTaskNode(1, new Date('2025-01-17'), {
                progressRate: 1.0,
            })

            const project = createProject([finishedDelayed], baseDate)

            expect(project.getIncompleteTasksUpToToday()).toEqual([])
        })

        it('progressRate=0.9999999999 は許容誤差付き finished で完了扱いとなり除外される', () => {
            const baseDate = new Date('2025-01-20')
            // PROGRESS_RATE_EPSILON(1e-9) 込みで finished === true → 除外
            const almostDone = createTodayTaskNode(
                1,
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                {
                    progressRate: 0.9999999999,
                }
            )
            // 0.999999 は 1 - 1e-9 未満 → 未完了 → 含まれる
            const notDone = createTodayTaskNode(2, new Date('2025-01-06'), new Date('2025-01-24'), {
                progressRate: 0.999999,
            })

            const project = createProject([almostDone, notDone], baseDate)

            const result = project.getIncompleteTasksUpToToday()
            expect(result.map((t) => t.id)).toEqual([2])
        })
    })

    describe('TC-06: 非 leaf（親タスク）の除外（AC 4.3）', () => {
        it('遅延条件を満たす親タスクは除外され、リーフの子タスクのみ返る', () => {
            const baseDate = new Date('2025-01-20')

            const parentTask = createTaskNode({
                id: 1,
                name: '親タスク',
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-17'), // 遅延条件を満たすが非 leaf
                workload: 10,
                scheduledWorkDays: 10,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-17')),
                isLeaf: false,
                progressRate: 0.5,
            })
            const childTask = createDelayedTaskNode(2, new Date('2025-01-15'), {
                name: '遅延子タスク',
                parentId: 1,
            })
            parentTask.children = [childTask]

            const project = createProject([parentTask], baseDate)

            const result = project.getIncompleteTasksUpToToday()
            expect(result.map((t) => t.id)).toEqual([2])
        })

        it('当日稼働のプロットを持つ親タスクも除外される', () => {
            const baseDate = new Date('2025-01-20')

            const parentTask = createTaskNode({
                id: 1,
                name: '当日稼働の親タスク',
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-24'), // 1/20 にプロットあり、非 leaf
                workload: 10,
                scheduledWorkDays: 10,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-24')),
                isLeaf: false,
                progressRate: 0.5,
            })
            const childTask = createTodayTaskNode(
                2,
                new Date('2025-01-06'),
                new Date('2025-01-24'),
                { name: '当日子タスク', parentId: 1 }
            )
            parentTask.children = [childTask]

            const project = createProject([parentTask], baseDate)

            const result = project.getIncompleteTasksUpToToday()
            expect(result.map((t) => t.id)).toEqual([2])
        })
    })

    describe('TC-07: ソート順（AC 4.4）', () => {
        it('遅延日数の降順・遅延日数が等しい場合は id の昇順で返る', () => {
            const baseDate = new Date('2025-01-20')

            // 入力順はあえてバラす（安定ソートの入力順依存では PASS しないように、
            // 同遅延日数の id 4 を id 3 より先に、当日タスクの id 2 を id 1 より先に置く）
            const today2 = createTodayTaskNode(2, new Date('2025-01-06'), new Date('2025-01-24'))
            const delayed4 = createDelayedTaskNode(4, new Date('2025-01-17')) // 3日遅延
            const delayed5 = createDelayedTaskNode(5, new Date('2025-01-15')) // 5日遅延
            const delayed3 = createDelayedTaskNode(3, new Date('2025-01-17')) // 3日遅延
            const today1 = createTodayTaskNode(1, new Date('2025-01-06'), new Date('2025-01-24'))

            const project = createProject([today2, delayed4, delayed5, delayed3, today1], baseDate)

            const result = project.getIncompleteTasksUpToToday()
            // 5日遅延(id5) → 3日遅延(id3, id4 は id 昇順) → 当日(遅延日数同値の id1, id2 は id 昇順)
            expect(result.map((t) => t.id)).toEqual([5, 3, 4, 1, 2])
        })
    })

    describe('TC-08: baseDate 引数の指定と未指定（AC 4.5）', () => {
        // taskA: endDate 1/17。this.baseDate(1/15) では当日稼働・未遅延、1/24 基準では 7日遅延
        // taskB: 1/24 のみ稼働。this.baseDate(1/15) では対象外、1/24 基準では当日稼働
        const projectBaseDate = new Date('2025-01-15') // 水曜

        function buildProject(): ProjectWithIncompleteTasks {
            const taskA = createTodayTaskNode(1, new Date('2025-01-06'), new Date('2025-01-17'))
            const taskB = createTodayTaskNode(2, new Date('2025-01-24'), new Date('2025-01-24'), {
                workload: 1,
                scheduledWorkDays: 1,
            })
            return createProject([taskA, taskB], projectBaseDate)
        }

        it('引数指定時は指定日を「今日」として遅延・当日判定に用いる', () => {
            const project = buildProject()

            const result = project.getIncompleteTasksUpToToday(new Date('2025-01-24'))
            // taskA は 1/24 基準で 7日遅延、taskB は 1/24 当日稼働（遅延日数 0）
            expect(result.map((t) => t.id)).toEqual([1, 2])
        })

        it('引数未指定時は Project の baseDate を「今日」として用いる', () => {
            const project = buildProject()

            const result = project.getIncompleteTasksUpToToday()
            // this.baseDate(1/15) 基準: taskA は当日稼働（未遅延）、taskB は対象外
            expect(result.map((t) => t.id)).toEqual([1])
        })
    })

    describe('TC-09: 該当タスクがない場合', () => {
        it('タスクが 0 件なら空配列を返す', () => {
            const project = createProject([], new Date('2025-01-20'))
            expect(project.getIncompleteTasksUpToToday()).toEqual([])
        })

        it('遅延も当日稼働もないタスクのみなら空配列を返す', () => {
            const baseDate = new Date('2025-01-20')
            const future = createTodayTaskNode(1, new Date('2025-01-22'), new Date('2025-01-24'))
            const project = createProject([future], baseDate)
            expect(project.getIncompleteTasksUpToToday()).toEqual([])
        })
    })
})
