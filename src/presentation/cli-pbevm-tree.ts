#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ExcelProjectCreator } from '../infrastructure/ExcelProjectCreator'
import { TreeFormatter, TreeNode } from '../common/TreeFormatter'
import { TaskNode } from '../domain/TaskNode'

const main = async () => {
    const args = createArgs()

    try {
        const creator = new ExcelProjectCreator(args.path)
        const project = await creator.createProject()
        const taskNodes = project.taskNodes

        // TaskNode[] を TreeNode[] に変換
        const treeNodes = convertToTreeNodes(taskNodes)

        if (args.json) {
            // JSON形式で出力
            const result = TreeFormatter.toJson(treeNodes, { depth: args.depth })
            console.log(JSON.stringify(result, null, 2))
        } else {
            // テキスト形式で出力
            const result = TreeFormatter.toText(treeNodes, { depth: args.depth })
            console.log(result)
        }
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
    }
}

/**
 * TaskNode[] を TreeNode[] に変換
 */
const convertToTreeNodes = (taskNodes: TaskNode[]): TreeNode[] => {
    return taskNodes.map((node) => ({
        name: node.name,
        children: convertToTreeNodes(node.children),
    }))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: npx pbevm-tree [options]')
        .example('npx pbevm-tree --path ./now.xlsm', 'ツリー構造を表示')
        .example('npx pbevm-tree --depth 1', '1階層のみ表示')
        .example('npx pbevm-tree --json', 'JSON形式で出力')
        .option('path', {
            type: 'string',
            description: 'Excel file Path',
            default: './now.xlsm',
        })
        .option('depth', {
            type: 'number',
            description: '出力する階層の深さ（1=直下のみ）',
        })
        .option('json', {
            type: 'boolean',
            description: 'JSON形式で出力',
            default: false,
        })
        .help()
        .parseSync()
    return argv
}

main()
