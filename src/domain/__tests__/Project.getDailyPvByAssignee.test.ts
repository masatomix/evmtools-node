/**
 * Project.getDailyPvByAssignee のテスト
 *
 * spec: phase2-skill-integration-0.0.31 要件1
 * 対応 AC: 要件1 AC 1.1〜1.12
 *
 * 参照実装（数値一致のオラクル）:
 *   task リポジトリ evmtools スキル check-daily-pv.ts の calculateDailyPvByAssignee
 *   - 休日スキップ / (未割当) 正規化 / PV>0 のみ明細化 / PV=0 でもエントリ出力
 *   - 丸め順序: 明細は個別に小数第3位丸め、合算は未丸め値を合算して最後に丸め
 */
import { date2Sn } from 'excel-csv-read-write'
import { dateStr } from '../../common'
import { Project } from '../Project'
import { TaskNode } from '../TaskNode'
import { HolidayData } from '../HolidayData'

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

describe('Project.getDailyPvByAssignee', () => {
    // 2025-01-06(月)〜2025-01-10(金) の 1 週間 + 週末 2025-01-11(土)/12(日)
    const baseDate = new Date('2025-01-08')
    const startDate = new Date('2025-01-06')
    const endDate = new Date('2025-01-10')

    /**
     * 標準テストプロジェクト
     * - 親「認証機能」(id:1)
     *   - 「ログイン実装」(id:2) 田中 workload=5, 01-06〜01-10 の5稼働日 → 1.0/日
     *   - 「ログアウト実装」(id:3) 佐藤 workload=2, 01-06〜01-07 の2稼働日 → 1.0/日
     * - 「未割当タスク」(id:4) 担当者なし workload=3, 01-08〜01-10 の3稼働日 → 1.0/日
     */
    function createTestProject(): Project {
        const authParent = createTaskNode({
            id: 1,
            level: 1,
            name: '認証機能',
            isLeaf: false,
            parentId: undefined,
        })

        const login = createTaskNode({
            id: 2,
            level: 2,
            name: 'ログイン実装',
            assignee: '田中',
            workload: 5,
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-01-10'),
            scheduledWorkDays: 5,
            plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
            isLeaf: true,
            parentId: 1,
        })

        const logout = createTaskNode({
            id: 3,
            level: 2,
            name: 'ログアウト実装',
            assignee: '佐藤',
            workload: 2,
            startDate: new Date('2025-01-06'),
            endDate: new Date('2025-01-07'),
            scheduledWorkDays: 2,
            plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-07')),
            isLeaf: true,
            parentId: 1,
        })

        authParent.children = [login, logout]

        const unassigned = createTaskNode({
            id: 4,
            level: 1,
            name: '未割当タスク',
            assignee: undefined,
            workload: 3,
            startDate: new Date('2025-01-08'),
            endDate: new Date('2025-01-10'),
            scheduledWorkDays: 3,
            plotMap: createPlotMap(new Date('2025-01-08'), new Date('2025-01-10')),
            isLeaf: true,
            parentId: undefined,
        })

        return new Project(
            [authParent, unassigned],
            baseDate,
            [],
            startDate,
            endDate,
            'テストプロジェクト'
        )
    }

    describe('TC-01: 引数なしで開始日〜終了日の稼働日×担当者のエントリを返す（AC 1.1）', () => {
        it('全稼働日（5日）× 全担当者（3名）のエントリが返される', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee()

            // 担当者: 田中・佐藤・(未割当) の3名 × 稼働日5日 = 15 エントリ
            expect(entries.length).toBe(15)

            const dates = [...new Set(entries.map((e) => e.date))]
            expect(dates).toEqual([
                dateStr(new Date('2025-01-06')),
                dateStr(new Date('2025-01-07')),
                dateStr(new Date('2025-01-08')),
                dateStr(new Date('2025-01-09')),
                dateStr(new Date('2025-01-10')),
            ])

            const assignees = [...new Set(entries.map((e) => e.assignee))].sort()
            expect(assignees).toEqual(['(未割当)', '佐藤', '田中'].sort())
        })

        it('担当者×日のPVが正しく計算される', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee()

            const tanaka0106 = entries.find(
                (e) => e.assignee === '田中' && e.date === dateStr(new Date('2025-01-06'))
            )
            expect(tanaka0106).toBeDefined()
            expect(tanaka0106!.pv).toBe(1)
            expect(tanaka0106!.taskCount).toBe(1)
            expect(tanaka0106!.tasks).toEqual([
                { name: 'ログイン実装', fullName: '認証機能/ログイン実装', pv: 1 },
            ])
        })
    })

    describe('TC-02: 休日（土日・プロジェクト祝日）はスキップされる（AC 1.2）', () => {
        it('期間に土日を含めても土日のエントリは出力されない', () => {
            const project = createTestProject()
            // 01-06(月)〜01-12(日): 土日を含む期間を明示指定
            const entries = project.getDailyPvByAssignee({
                from: new Date('2025-01-06'),
                to: new Date('2025-01-12'),
            })

            const dates = [...new Set(entries.map((e) => e.date))]
            expect(dates).not.toContain(dateStr(new Date('2025-01-11'))) // 土
            expect(dates).not.toContain(dateStr(new Date('2025-01-12'))) // 日
            expect(dates.length).toBe(5) // 平日のみ
        })

        it('プロジェクト祝日もスキップされる', () => {
            const projectBase = createTestProject()
            const holidayProject = new Project(
                projectBase.taskNodes,
                baseDate,
                [new HolidayData(new Date('2025-01-08'), 'テスト祝日')],
                startDate,
                endDate,
                'テストプロジェクト'
            )

            const entries = holidayProject.getDailyPvByAssignee()
            const dates = [...new Set(entries.map((e) => e.date))]
            expect(dates).not.toContain(dateStr(new Date('2025-01-08')))
            expect(dates.length).toBe(4)
        })
    })

    describe('TC-03: 担当者未設定のタスクは「(未割当)」で集計される（AC 1.3）', () => {
        it('assignee が undefined のタスクが (未割当) に集約される', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee()

            const unassigned0108 = entries.find(
                (e) => e.assignee === '(未割当)' && e.date === dateStr(new Date('2025-01-08'))
            )
            expect(unassigned0108).toBeDefined()
            expect(unassigned0108!.pv).toBe(1)
            expect(unassigned0108!.tasks).toEqual([
                { name: '未割当タスク', fullName: '未割当タスク', pv: 1 },
            ])
        })
    })

    describe('TC-04: PV が正（0超）のタスクのみ明細に含まれる（AC 1.4）', () => {
        it('期間外（PV=0）のタスクは明細に含まれない', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee()

            // 佐藤のタスクは 01-06〜01-07 のみ。01-08 は PV=0 なので明細なし
            const sato0108 = entries.find(
                (e) => e.assignee === '佐藤' && e.date === dateStr(new Date('2025-01-08'))
            )
            expect(sato0108).toBeDefined()
            expect(sato0108!.tasks).toEqual([])
            expect(sato0108!.taskCount).toBe(0)
        })

        it('calculatePV が undefined のタスク（scheduledWorkDays 未設定）は明細に含まれない', () => {
            const invalid = createTaskNode({
                id: 10,
                name: '不正タスク',
                assignee: '田中',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: undefined, // workloadPerDay が undefined になる
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })
            const project = new Project(
                [invalid],
                baseDate,
                [],
                startDate,
                endDate,
                'テストプロジェクト'
            )

            const entries = project.getDailyPvByAssignee()
            // 田中のエントリは出力されるが、明細は空・PV=0
            const tanaka = entries.filter((e) => e.assignee === '田中')
            expect(tanaka.length).toBe(5)
            for (const e of tanaka) {
                expect(e.pv).toBe(0)
                expect(e.taskCount).toBe(0)
                expect(e.tasks).toEqual([])
            }
        })

        it('明細には name / fullName / 小数第3位丸めの pv が入る', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee()

            const tanaka0106 = entries.find(
                (e) => e.assignee === '田中' && e.date === dateStr(new Date('2025-01-06'))
            )
            expect(tanaka0106!.tasks[0]).toEqual({
                name: 'ログイン実装',
                fullName: '認証機能/ログイン実装',
                pv: 1,
            })
        })
    })

    describe('TC-05: 合算は未丸め値を合算し最後に丸める（丸め順序）（AC 1.4, 1.5）', () => {
        it('明細は個別丸め・合算は未丸め合算後に丸め（0.333 + 0.333 → 0.667）', () => {
            // workload=1, 3稼働日 → 1/3 = 0.33333.../日 のタスクを 2 本
            const t1 = createTaskNode({
                id: 1,
                name: 'タスクA',
                assignee: '田中',
                workload: 1,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-08'),
                scheduledWorkDays: 3,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-08')),
                isLeaf: true,
            })
            const t2 = createTaskNode({
                id: 2,
                name: 'タスクB',
                assignee: '田中',
                workload: 1,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-08'),
                scheduledWorkDays: 3,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-08')),
                isLeaf: true,
            })
            const project = new Project(
                [t1, t2],
                baseDate,
                [],
                startDate,
                endDate,
                'テストプロジェクト'
            )

            const entries = project.getDailyPvByAssignee()
            const tanaka0106 = entries.find(
                (e) => e.assignee === '田中' && e.date === dateStr(new Date('2025-01-06'))
            )

            // 明細: 個別に round3(1/3) = 0.333
            expect(tanaka0106!.tasks.map((t) => t.pv)).toEqual([0.333, 0.333])
            // 合算: round3(1/3 + 1/3) = round3(0.66666...) = 0.667
            // （丸め済み明細の合算 0.666 ではない）
            expect(tanaka0106!.pv).toBe(0.667)
            expect(tanaka0106!.taskCount).toBe(2)
        })
    })

    describe('TC-06: 正のPVが無い稼働日でも PV=0 エントリを出力する（AC 1.6）', () => {
        it('対象タスクを持つ担当者は全稼働日にエントリを持つ', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee()

            // 佐藤のタスクは 01-06〜01-07 のみだが、全5稼働日のエントリがある
            const sato = entries.filter((e) => e.assignee === '佐藤')
            expect(sato.length).toBe(5)

            const zeroDays = sato.filter((e) => e.pv === 0)
            expect(zeroDays.map((e) => e.date)).toEqual([
                dateStr(new Date('2025-01-08')),
                dateStr(new Date('2025-01-09')),
                dateStr(new Date('2025-01-10')),
            ])
            for (const e of zeroDays) {
                expect(e.taskCount).toBe(0)
                expect(e.tasks).toEqual([])
            }
        })
    })

    describe('TC-07: filter でフルタスク名の部分一致に限定する（AC 1.7）', () => {
        it('filter に一致するタスクのみが集計対象になる', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee({ filter: '認証機能' })

            // 認証機能配下は 田中・佐藤 のみ。(未割当) は対象外
            const assignees = [...new Set(entries.map((e) => e.assignee))].sort()
            expect(assignees).toEqual(['佐藤', '田中'].sort())
        })

        it('一致するタスクが無い場合は空配列を返す', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee({ filter: '存在しない機能' })
            expect(entries).toEqual([])
        })
    })

    describe('TC-08: assignee で担当者を完全一致で絞り込む（AC 1.8）', () => {
        it('指定担当者のエントリのみが返される', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee({ assignee: '佐藤' })

            expect(entries.length).toBe(5)
            expect(entries.every((e) => e.assignee === '佐藤')).toBe(true)
        })

        it('部分一致では絞り込まれない（完全一致）', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee({ assignee: '佐' })
            expect(entries).toEqual([])
        })
    })

    describe('TC-09: from/to 指定と省略時のデフォルト（AC 1.9）', () => {
        it('from/to を指定すると指定期間のみ集計される', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee({
                from: new Date('2025-01-07'),
                to: new Date('2025-01-08'),
            })

            const dates = [...new Set(entries.map((e) => e.date))]
            expect(dates).toEqual([
                dateStr(new Date('2025-01-07')),
                dateStr(new Date('2025-01-08')),
            ])
        })

        it('from のみ指定すると to はプロジェクト終了日で補完される', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee({ from: new Date('2025-01-09') })

            const dates = [...new Set(entries.map((e) => e.date))]
            expect(dates).toEqual([
                dateStr(new Date('2025-01-09')),
                dateStr(new Date('2025-01-10')),
            ])
        })

        it('to のみ指定すると from はプロジェクト開始日で補完される', () => {
            const project = createTestProject()
            const entries = project.getDailyPvByAssignee({ to: new Date('2025-01-07') })

            const dates = [...new Set(entries.map((e) => e.date))]
            expect(dates).toEqual([
                dateStr(new Date('2025-01-06')),
                dateStr(new Date('2025-01-07')),
            ])
        })
    })

    describe('TC-10: 期間が決定できない場合は Error を送出する（AC 1.10）', () => {
        function createProjectWithoutDates(): Project {
            const task = createTaskNode({
                id: 1,
                name: 'タスク',
                assignee: '田中',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
            })
            // startDate / endDate を持たないプロジェクト
            return new Project([task], baseDate, [], undefined, undefined, 'テストプロジェクト')
        }

        it('startDate/endDate が無く from/to も未指定なら Error', () => {
            const project = createProjectWithoutDates()
            expect(() => project.getDailyPvByAssignee()).toThrow('fromかtoが取得できませんでした')
        })

        it('to が決定できない場合も Error', () => {
            const project = createProjectWithoutDates()
            expect(() => project.getDailyPvByAssignee({ from: new Date('2025-01-06') })).toThrow(
                'fromかtoが取得できませんでした'
            )
        })

        it('from/to を両方指定すればエラーにならない', () => {
            const project = createProjectWithoutDates()
            const entries = project.getDailyPvByAssignee({
                from: new Date('2025-01-06'),
                to: new Date('2025-01-10'),
            })
            expect(entries.length).toBe(5)
        })
    })

    describe('TC-11: 集計対象はリーフタスクのみ（AC 1.11）', () => {
        it('親タスク（isLeaf=false）は workload があっても集計されない', () => {
            const parent = createTaskNode({
                id: 1,
                name: '親タスク',
                assignee: '親担当',
                workload: 100,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: false,
                parentId: undefined,
            })
            const child = createTaskNode({
                id: 2,
                level: 2,
                name: '子タスク',
                assignee: '田中',
                workload: 5,
                startDate: new Date('2025-01-06'),
                endDate: new Date('2025-01-10'),
                scheduledWorkDays: 5,
                plotMap: createPlotMap(new Date('2025-01-06'), new Date('2025-01-10')),
                isLeaf: true,
                parentId: 1,
            })
            parent.children = [child]
            const project = new Project(
                [parent],
                baseDate,
                [],
                startDate,
                endDate,
                'テストプロジェクト'
            )

            const entries = project.getDailyPvByAssignee()
            const assignees = [...new Set(entries.map((e) => e.assignee))]
            expect(assignees).toEqual(['田中'])
            // 親の workload=100 が混入していないこと
            expect(entries.every((e) => e.pv <= 1)).toBe(true)
        })
    })

    describe('TC-12: 既存の PV 系ゲッターは不変（AC 1.12）', () => {
        it('pvByNameLong / pvsByNameLong / pvByName は従来どおり動作する', () => {
            const project = createTestProject()

            const long = project.pvByNameLong
            // 開始〜終了の 5 日 × 担当者 3 名 = 15（tidy 経路は休日を除外しないため
            // generateBaseDates の全日だが、本期間は平日のみ）
            expect(long.length).toBe(15)
            const tanaka0106 = long.find(
                (d) => d.assignee === '田中' && d.baseDate === dateStr(new Date('2025-01-06'))
            )
            expect(tanaka0106).toBeDefined()
            expect(tanaka0106!.value).toBe(1)

            const longs = project.pvsByNameLong
            expect(longs.length).toBe(15)

            const wide = project.pvByName
            expect(wide.length).toBe(3) // 担当者3名
        })

        it('getDailyPvByAssignee 呼び出し後も pvByNameLong の結果は変わらない', () => {
            const project = createTestProject()
            const before = project.pvByNameLong
            project.getDailyPvByAssignee()
            const after = project.pvByNameLong
            expect(after).toEqual(before)
        })
    })
})
