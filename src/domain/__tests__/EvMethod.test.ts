/**
 * spec: phase5-evmethod-knowledge-0.0.34 要件1, 要件2, 要件3
 *
 * EV 算定方式の純関数（resolveTaskEv / sumEvsBy）の単体テスト。
 * - 'progressRate': Excel 由来の TaskRow.ev をそのまま返す（既定挙動を厳密に不変に保つ。要件1.1, 1.5）
 * - '0/100': 完了タスクのみ workload を計上（要件2）
 * - '50/50': 着手で workload の半分、完了で全部を計上（要件3）
 * - 完了判定は phase0 の許容誤差付き finished（progressRate >= 1.0 − EPSILON）に依存（要件2.3）
 */
import { resolveTaskEv, sumEvsBy } from '../EvMethod'
import { TaskRow } from '../TaskRow'

/**
 * テスト用の TaskRow 生成ヘルパー（EV 導出に関与する値のみ指定可能）
 */
const createTask = (
    overrides: Partial<{
        workload: number
        progressRate: number
        actualStartDate: Date
        ev: number
    }> = {}
): TaskRow =>
    new TaskRow(
        1, // sharp
        1, // id
        1, // level
        'テストタスク',
        undefined, // assignee
        overrides.workload,
        undefined, // startDate
        undefined, // endDate
        overrides.actualStartDate,
        undefined, // actualEndDate
        overrides.progressRate,
        undefined, // scheduledWorkDays
        undefined, // pv
        overrides.ev,
        undefined, // spi
        undefined, // expectedProgressDate
        undefined, // delayDays
        undefined, // remarks
        undefined, // parentId
        true // isLeaf
    )

describe('resolveTaskEv', () => {
    describe("'progressRate'（既定方式。要件1.1, 1.5）", () => {
        it('Excel 由来の task.ev をそのまま返す', () => {
            const task = createTask({ workload: 5, progressRate: 0.4, ev: 2 })
            expect(resolveTaskEv(task, 'progressRate')).toBe(2)
        })

        it('ev が未設定なら undefined を返す（既存 sumEVs の undefined 除外に整合）', () => {
            const task = createTask({ workload: 5, progressRate: 0.4 })
            expect(resolveTaskEv(task, 'progressRate')).toBeUndefined()
        })

        it('再計算しない: ev と progressRate×workload が食い違っても ev を優先する', () => {
            // Excel 読み込み値の尊重（要件1.5: TaskRow.ev を導出し直さない）
            const task = createTask({ workload: 10, progressRate: 0.5, ev: 999 })
            expect(resolveTaskEv(task, 'progressRate')).toBe(999)
        })
    })

    describe("'0/100'（要件2）", () => {
        it('完了タスク（progressRate=1.0）→ workload を計上（要件2.1）', () => {
            const task = createTask({ workload: 5, progressRate: 1.0, ev: 5 })
            expect(resolveTaskEv(task, '0/100')).toBe(5)
        })

        it('仕掛タスク（actualStartDate あり・未完了）→ 0（仕掛と未着手を区別しない。要件2.2）', () => {
            const task = createTask({
                workload: 5,
                progressRate: 0.4,
                actualStartDate: new Date('2025-01-06'),
                ev: 2,
            })
            expect(resolveTaskEv(task, '0/100')).toBe(0)
        })

        it('未着手タスク（progressRate=0）→ 0（要件2.2）', () => {
            const task = createTask({ workload: 5, progressRate: 0, ev: 0 })
            expect(resolveTaskEv(task, '0/100')).toBe(0)
        })

        it('progressRate 未設定 → 未完了として 0（要件2.2）', () => {
            const task = createTask({ workload: 5 })
            expect(resolveTaskEv(task, '0/100')).toBe(0)
        })

        it('epsilon 境界: progressRate=0.9999999999 は完了扱いで workload を計上（要件2.3）', () => {
            // phase0 の許容誤差付き finished（1.0 − 1e-9 以上で完了）
            const task = createTask({ workload: 5, progressRate: 0.9999999999 })
            expect(resolveTaskEv(task, '0/100')).toBe(5)
        })

        it('epsilon 境界: progressRate=0.999999（許容誤差外）は未完了として 0（要件2.3）', () => {
            const task = createTask({ workload: 5, progressRate: 0.999999 })
            expect(resolveTaskEv(task, '0/100')).toBe(0)
        })

        it('完了タスクでも workload 未設定なら 0（要件2.4）', () => {
            const task = createTask({ progressRate: 1.0 })
            expect(resolveTaskEv(task, '0/100')).toBe(0)
        })
    })

    describe("'50/50'（要件3）", () => {
        it('完了タスク → workload を計上（要件3.1）', () => {
            const task = createTask({ workload: 5, progressRate: 1.0, ev: 5 })
            expect(resolveTaskEv(task, '50/50')).toBe(5)
        })

        it('仕掛タスク（未完了かつ actualStartDate あり）→ workload×0.5（要件3.2）', () => {
            const task = createTask({
                workload: 5,
                progressRate: 0.4,
                actualStartDate: new Date('2025-01-06'),
                ev: 2,
            })
            expect(resolveTaskEv(task, '50/50')).toBe(2.5)
        })

        it('未完了かつ actualStartDate なし（進捗率が入っていても）→ 0（要件3.3）', () => {
            const task = createTask({ workload: 5, progressRate: 0.4, ev: 2 })
            expect(resolveTaskEv(task, '50/50')).toBe(0)
        })

        it('未着手タスク（progressRate=0・actualStartDate なし）→ 0（要件3.3）', () => {
            const task = createTask({ workload: 5, progressRate: 0 })
            expect(resolveTaskEv(task, '50/50')).toBe(0)
        })

        it('epsilon 境界: progressRate=0.9999999999 かつ actualStartDate あり → 完了扱いで workload 全部（半分ではない）', () => {
            const task = createTask({
                workload: 5,
                progressRate: 0.9999999999,
                actualStartDate: new Date('2025-01-06'),
            })
            expect(resolveTaskEv(task, '50/50')).toBe(5)
        })

        it('epsilon 境界: progressRate=0.999999（許容誤差外）かつ actualStartDate あり → 仕掛として workload×0.5', () => {
            const task = createTask({
                workload: 5,
                progressRate: 0.999999,
                actualStartDate: new Date('2025-01-06'),
            })
            expect(resolveTaskEv(task, '50/50')).toBe(2.5)
        })

        it('workload 未設定: 完了タスク → 0（要件3.4）', () => {
            const task = createTask({ progressRate: 1.0 })
            expect(resolveTaskEv(task, '50/50')).toBe(0)
        })

        it('workload 未設定: 仕掛タスク → 0（要件3.4）', () => {
            const task = createTask({
                progressRate: 0.4,
                actualStartDate: new Date('2025-01-06'),
            })
            expect(resolveTaskEv(task, '50/50')).toBe(0)
        })
    })
})

describe('sumEvsBy', () => {
    const finishedTask = () =>
        createTask({
            workload: 5,
            progressRate: 1.0,
            actualStartDate: new Date('2025-01-06'),
            ev: 5,
        })
    const inProgressTask = () =>
        createTask({
            workload: 5,
            progressRate: 0.4,
            actualStartDate: new Date('2025-01-06'),
            ev: 2,
        })
    const notStartedTask = () => createTask({ workload: 5, progressRate: 0, ev: 0 })

    describe('既定（未指定 / progressRate）は既存 sumEVs と同値（要件1.1）', () => {
        it('method 未指定は ev の合計（小数第3位丸め）を返す', () => {
            const tasks = [
                createTask({ ev: 1.111 }),
                createTask({ ev: 2.222 }),
                createTask({}), // ev 未設定は除外（既存 sum の挙動）
            ]
            expect(sumEvsBy(tasks)).toBe(3.333)
        })

        it("method 未指定と 'progressRate' 指定は同値", () => {
            const tasks = [finishedTask(), inProgressTask(), notStartedTask()]
            expect(sumEvsBy(tasks)).toBe(7)
            expect(sumEvsBy(tasks, 'progressRate')).toBe(sumEvsBy(tasks))
        })

        it('全タスクの ev が未設定なら undefined（既存 sumEVs の undefined 挙動を維持）', () => {
            const tasks = [createTask({ workload: 5 }), createTask({ workload: 3 })]
            expect(sumEvsBy(tasks)).toBeUndefined()
            expect(sumEvsBy(tasks, 'progressRate')).toBeUndefined()
        })

        it('空配列は undefined', () => {
            expect(sumEvsBy([])).toBeUndefined()
            expect(sumEvsBy([], '0/100')).toBeUndefined()
        })
    })

    describe('方式別の集計（要件2, 3）', () => {
        it("'0/100': 完了5 + 仕掛5 + 未着手5 → 完了分のみ 5", () => {
            const tasks = [finishedTask(), inProgressTask(), notStartedTask()]
            expect(sumEvsBy(tasks, '0/100')).toBe(5)
        })

        it("'0/100': 全タスク未完了 → 0（undefined ではなく数値 0 に正規化）", () => {
            const tasks = [inProgressTask(), notStartedTask()]
            expect(sumEvsBy(tasks, '0/100')).toBe(0)
        })

        it("'50/50': 完了5 + 仕掛2.5 + 未着手0 → 7.5", () => {
            const tasks = [finishedTask(), inProgressTask(), notStartedTask()]
            expect(sumEvsBy(tasks, '50/50')).toBe(7.5)
        })

        it("同一データでの EV 大小関係: '0/100' <= 'progressRate' <= '50/50'（本データ構成）", () => {
            const tasks = [finishedTask(), inProgressTask(), notStartedTask()]
            const zeroHundred = sumEvsBy(tasks, '0/100')!
            const progressRate = sumEvsBy(tasks, 'progressRate')!
            const fiftyFifty = sumEvsBy(tasks, '50/50')!
            expect(zeroHundred).toBeLessThan(progressRate)
            expect(progressRate).toBeLessThan(fiftyFifty)
        })
    })
})
