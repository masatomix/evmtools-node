import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../Project'
import { TaskRow } from '../TaskRow'
import { TaskNode } from '../TaskNode'

/**
 * spec: phase1-minor-issues-0.0.30 要件3（#153 getFullTaskName の内部メモ化）
 *
 * #153 は内部メモ化のみの性能改善（公開 API 追加なし・シグネチャ/戻り値不変）。
 * 検証は公開 API（getFullTaskName / getTask）のみで行う。
 */

function createPlotMap(startDate: Date, endDate: Date): Map<number, boolean> {
    const plotMap = new Map<number, boolean>()
    const current = new Date(startDate)
    while (current <= endDate) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) plotMap.set(date2Sn(current), true)
        current.setDate(current.getDate() + 1)
    }
    return plotMap
}

function createTaskRow(id: number, name: string, parentId?: number, isLeaf = true): TaskRow {
    const startDate = new Date('2025-06-09')
    const endDate = new Date('2025-06-13')
    return new TaskRow(
        id,
        id,
        1,
        name,
        '担当者A',
        5,
        startDate,
        endDate,
        undefined,
        undefined,
        0.5,
        5,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        parentId,
        isLeaf,
        createPlotMap(startDate, endDate)
    )
}

/** ルート(1) / 親(2) / 子(3) の3階層ツリーを持つ Project を作る */
function createThreeLevelProject(): Project {
    const child = TaskNode.fromRow(createTaskRow(3, '子タスク', 2), [])
    const parent = TaskNode.fromRow(createTaskRow(2, '親タスク', 1, false), [child])
    const root = TaskNode.fromRow(createTaskRow(1, 'ルートタスク', undefined, false), [parent])
    return new Project(
        [root],
        new Date('2025-06-10'),
        [],
        new Date('2025-06-09'),
        new Date('2025-06-13'),
        'テストプロジェクト'
    )
}

describe('Project.getFullTaskName（内部メモ化）', () => {
    it('TC-01: 初回呼び出しで親を"/"連結したフルパス名を返す', () => {
        const project = createThreeLevelProject()
        const child = project.getTask(3)!
        expect(project.getFullTaskName(child)).toBe('ルートタスク/親タスク/子タスク')
    })

    it('TC-02: 2回目の呼び出しも同一の結果を返す（結果不変）', () => {
        const project = createThreeLevelProject()
        const child = project.getTask(3)!
        const first = project.getFullTaskName(child)
        const second = project.getFullTaskName(child)
        expect(second).toBe(first)
        expect(second).toBe('ルートタスク/親タスク/子タスク')
    })

    it('TC-03: 2回目の呼び出しでは getTask による親の再走査をしない（メモ化）', () => {
        const project = createThreeLevelProject()
        const child = project.getTask(3)!

        // ウォームアップ（1回目: 親を getTask で走査してキャッシュされる）
        project.getFullTaskName(child)

        const spy = jest.spyOn(project, 'getTask')
        const result = project.getFullTaskName(child)

        expect(result).toBe('ルートタスク/親タスク/子タスク')
        expect(spy).not.toHaveBeenCalled() // キャッシュ命中時は再走査なし
        spy.mockRestore()
    })

    it('TC-04: 異なるタスク同士でキャッシュが混ざらない', () => {
        const project = createThreeLevelProject()
        const child = project.getTask(3)!
        const parent = project.getTask(2)!

        expect(project.getFullTaskName(child)).toBe('ルートタスク/親タスク/子タスク')
        expect(project.getFullTaskName(parent)).toBe('ルートタスク/親タスク')
        // キャッシュ済みの2回目も互いに正しい値
        expect(project.getFullTaskName(child)).toBe('ルートタスク/親タスク/子タスク')
        expect(project.getFullTaskName(parent)).toBe('ルートタスク/親タスク')
    })

    it('TC-05: ルートタスクは自名のみを返す', () => {
        const project = createThreeLevelProject()
        const root = project.getTask(1)!
        expect(project.getFullTaskName(root)).toBe('ルートタスク')
        expect(project.getFullTaskName(root)).toBe('ルートタスク') // 2回目も同一
    })

    it('TC-06: task 未指定は従来どおり空文字を返す', () => {
        const project = createThreeLevelProject()
        expect(project.getFullTaskName()).toBe('')
        expect(project.getFullTaskName(undefined)).toBe('')
    })
})
