import { Project } from '../Project'
import { TaskNode } from '../TaskNode'
import { TreeNode } from '../../common/TreeFormatter'

describe('Project.getTree', () => {
    // テスト用のTaskNodeツリー構造を作成
    const createTestTaskNodes = (): TaskNode[] => {
        // 孫ノード
        const grandChild1 = new TaskNode(
            3, // sharp
            3, // id
            3, // level
            'タスク1-1', // name
            undefined, // assignee
            1, // workload
            undefined, // startDate
            undefined, // endDate
            undefined, // actualStartDate
            undefined, // actualEndDate
            0, // progressRate
            undefined, // scheduledWorkDays
            undefined, // pv
            undefined, // ev
            undefined, // spi
            undefined, // expectedProgressDate
            undefined, // delayDays
            undefined, // remarks
            2, // parentId
            true, // isLeaf
            undefined, // plotMap
            [] // children
        )

        const grandChild2 = new TaskNode(
            4, 4, 3, 'タスク1-2',
            undefined, 1, undefined, undefined,
            undefined, undefined, 0, undefined,
            undefined, undefined, undefined, undefined,
            undefined, undefined, 2, true, undefined,
            []
        )

        // 子ノード（孫を持つ）
        const child1 = new TaskNode(
            2, 2, 2, 'サブプロジェクト1',
            undefined, 2, undefined, undefined,
            undefined, undefined, 0, undefined,
            undefined, undefined, undefined, undefined,
            undefined, undefined, 1, false, undefined,
            [grandChild1, grandChild2]
        )

        // 子ノード（孫なし）
        const child2 = new TaskNode(
            5, 5, 2, 'サブプロジェクト2',
            undefined, 1, undefined, undefined,
            undefined, undefined, 0, undefined,
            undefined, undefined, undefined, undefined,
            undefined, undefined, 1, true, undefined,
            []
        )

        // ルートノード
        const root = new TaskNode(
            1, 1, 1, 'プロジェクトA',
            undefined, 4, undefined, undefined,
            undefined, undefined, 0, undefined,
            undefined, undefined, undefined, undefined,
            undefined, undefined, undefined, false, undefined,
            [child1, child2]
        )

        return [root]
    }

    // 複数ルートのテストデータ
    const createMultipleRootTaskNodes = (): TaskNode[] => {
        const root1 = new TaskNode(
            1, 1, 1, 'プロジェクトA',
            undefined, 2, undefined, undefined,
            undefined, undefined, 0, undefined,
            undefined, undefined, undefined, undefined,
            undefined, undefined, undefined, false, undefined,
            [
                new TaskNode(
                    2, 2, 2, 'タスクA-1',
                    undefined, 1, undefined, undefined,
                    undefined, undefined, 0, undefined,
                    undefined, undefined, undefined, undefined,
                    undefined, undefined, 1, true, undefined,
                    []
                ),
            ]
        )

        const root2 = new TaskNode(
            3, 3, 1, 'プロジェクトB',
            undefined, 2, undefined, undefined,
            undefined, undefined, 0, undefined,
            undefined, undefined, undefined, undefined,
            undefined, undefined, undefined, false, undefined,
            [
                new TaskNode(
                    4, 4, 2, 'タスクB-1',
                    undefined, 1, undefined, undefined,
                    undefined, undefined, 0, undefined,
                    undefined, undefined, undefined, undefined,
                    undefined, undefined, 3, true, undefined,
                    []
                ),
            ]
        )

        return [root1, root2]
    }

    // TC-10: getTree() が TreeNode[] を返す
    describe('TC-10: getTree() が TreeNode[] を返す', () => {
        it('name と children プロパティを持つ配列を返す', () => {
            const taskNodes = createTestTaskNodes()
            const project = new Project(taskNodes, new Date(), [])

            const tree = project.getTree()

            // 配列であること
            expect(Array.isArray(tree)).toBe(true)
            expect(tree.length).toBe(1)

            // TreeNode 形式であること
            const root = tree[0]
            expect(root).toHaveProperty('name')
            expect(root).toHaveProperty('children')
            expect(root.name).toBe('プロジェクトA')
            expect(Array.isArray(root.children)).toBe(true)
        })

        it('複数ルートの場合も正しく TreeNode[] を返す', () => {
            const taskNodes = createMultipleRootTaskNodes()
            const project = new Project(taskNodes, new Date(), [])

            const tree = project.getTree()

            expect(tree.length).toBe(2)
            expect(tree[0].name).toBe('プロジェクトA')
            expect(tree[1].name).toBe('プロジェクトB')
        })
    })

    // TC-11: 子ノードが再帰的に変換される
    describe('TC-11: 子ノードが再帰的に変換される', () => {
        it('孫ノードも TreeNode 形式に変換される', () => {
            const taskNodes = createTestTaskNodes()
            const project = new Project(taskNodes, new Date(), [])

            const tree = project.getTree()

            // ルート → 子 → 孫 の構造を検証
            const root = tree[0]
            expect(root.children.length).toBe(2)

            // 子ノード
            const child1 = root.children[0]
            expect(child1.name).toBe('サブプロジェクト1')
            expect(child1).toHaveProperty('name')
            expect(child1).toHaveProperty('children')

            // 孫ノード
            expect(child1.children.length).toBe(2)
            expect(child1.children[0].name).toBe('タスク1-1')
            expect(child1.children[0]).toHaveProperty('name')
            expect(child1.children[0]).toHaveProperty('children')
            expect(child1.children[0].children).toEqual([])

            expect(child1.children[1].name).toBe('タスク1-2')
            expect(child1.children[1].children).toEqual([])

            // 子なしノード
            const child2 = root.children[1]
            expect(child2.name).toBe('サブプロジェクト2')
            expect(child2.children).toEqual([])
        })

        it('TaskNode のプロパティ（name, children 以外）は含まれない', () => {
            const taskNodes = createTestTaskNodes()
            const project = new Project(taskNodes, new Date(), [])

            const tree = project.getTree()

            const root = tree[0]
            // TreeNode には name と children のみ
            expect(Object.keys(root).sort()).toEqual(['children', 'name'])

            // TaskNode 固有のプロパティが含まれていないこと
            expect(root).not.toHaveProperty('id')
            expect(root).not.toHaveProperty('sharp')
            expect(root).not.toHaveProperty('level')
            expect(root).not.toHaveProperty('workload')
        })
    })

    // 空配列のテスト
    describe('エッジケース', () => {
        it('taskNodes が空の場合は空配列を返す', () => {
            const project = new Project([], new Date(), [])

            const tree = project.getTree()

            expect(tree).toEqual([])
        })
    })
})
