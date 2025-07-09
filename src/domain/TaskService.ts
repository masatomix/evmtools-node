import { TaskNode } from './TaskNode'
import { TaskRow } from './TaskRow'

export class TaskService {
    /**
     * TaskRowからparentIdに従って、ツリー構造のTaskNodeをビルドする
     * @param rows
     * @returns
     */
    buildTaskTree(rows: TaskRow[]): TaskNode[] {
        const nodeMap = new Map<number, TaskNode>()
        const roots: TaskNode[] = []

        for (const row of rows) {
            const node = TaskNode.fromRow(row)
            nodeMap.set(row.id, node)

            if (row.parentId !== undefined) {
                const parentNode = nodeMap.get(row.parentId)
                parentNode?.children.push(node)
            } else {
                roots.push(node)
            }
        }

        return roots
    }

    // const flattenTaskNodes = (nodes: TaskNode[]): TaskNode[] => {
    //     const result: TaskNode[] = []

    //     const dfs = (node: TaskNode) => {
    //         result.push({ ...node, children: [] }) // children は空でOK（再ツリー化の邪魔になるため）
    //         node.children.forEach(dfs)
    //     }

    //     nodes.forEach(dfs)
    //     return result
    // }

    /**
     * TaskNodeから、オブジェクト構造に従って、フラット化したTaskRowを返す
     * parentId,levelは再計算する
     * @param nodes
     * @returns
     */
    convertToTaskRows = (nodes: TaskNode[]): TaskRow[] => {
        const result: TaskRow[] = []

        const dfs = (node: TaskNode, parentId?: number, level: number = 1) => {
            result.push(TaskRow.fromNode(node, level, parentId))
            node.children.forEach((child) => dfs(child, node.id, level + 1))
        }

        nodes.forEach((root) => dfs(root, undefined, 1)) // ルートノードは親なし、level=1
        return result
    }
}
