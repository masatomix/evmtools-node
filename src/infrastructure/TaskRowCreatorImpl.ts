import { dateFromSn } from 'excel-csv-read-write'
import { TaskRowCreator } from '../domain/TaskRowCreator'
import { TaskRow } from '../domain/TaskRow'
import { TaskRow as TaskRowDto } from './types'
import { TaskRowFactory } from './TaskRowFactory'
import { round } from '../common'

export class TaskRowCreatorImpl implements TaskRowCreator {
    constructor(private _mappings: unknown[]) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    async createRowData(): Promise<TaskRow[]> {
        const header = this._mappings.find(
            (mapping) => (mapping as Record<string, any>)[0] === '#'
        ) as Record<string, any>[]

        const taskRowsWithoutParentid = (this._mappings as Record<string, any>[])
            .filter((mapping) => mapping[0] !== '#' && mapping[0] !== undefined)
            // .filter((mapping) => mapping[0] === 2) ////////
            .filter((mapping) => checkTaskName(mapping))
            .map((mapping) => convertToTaskRow(mapping, header))

        // console.table(aaa)

        const dtos = markLeafRows(addParentIds(taskRowsWithoutParentid))

        return TaskRowFactory.fromDtos(dtos)
    }
}

function toDate(data: Record<string, any>, index: number): Date | undefined {
    const result =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        typeof data[index.toString()] === 'number' ? dateFromSn(data[index.toString()]) : undefined
    return result
}

// 任意文字列を含むデータ行を TaskRow に変換する関数
export function convertToTaskRow(
    data: Record<string, any>,
    header: Record<string, any>
): TaskRowDto {
    const { level, name } = getTaskName(data)
    return {
        sharp: Number(data['0']),
        id: Number(data['1']),
        level,
        name,
        assignee: toStr(data, 13),
        workload: toNumber(data, 14),
        startDate: toDate(data, 15),
        endDate: toDate(data, 16),
        actualStartDate: toDate(data, 17),
        actualEndDate: toDate(data, 18),
        progressRate: toNumber(data, 19),
        scheduledWorkDays: toNumber(data, 20),
        pv: toNumber(data, 21),
        ev: toNumber(data, 22),
        spi: toNumber(data, 23),
        expectedProgressDate: toDate(data, 24),
        delayDays: toNumber(data, 25),
        remarks: toStr(data, 26),
        plotMap: extractTaskPlotMapBySerial(data, header),
    }
}

export function checkTaskName(data: Record<string, any>): boolean {
    const { name } = getTaskName(data)
    // console.log(`${level},${name}`, name.trim() !== '')
    return name.trim() !== ''
}

// infraにもっていく
type TaskName = {
    level: number
    name: string
}

function getTaskName(data: any): TaskName {
    // タスク名とレベル抽出（LV1～LV9：インデックス4～12）
    let level = 0
    let name = ''
    for (let i = 4; i <= 12; i++) {
        const val = data[i.toString()]
        if (typeof val === 'string' && val.trim() !== '') {
            level = i - 3
            name = val.trim()
            break
        }
    }
    return {
        level,
        name,
    }
}


function toNumber(data: Record<string, any>, index: number): number | undefined {
    const result =
        typeof data[index.toString()] === 'number' ? round(data[index.toString()]) : undefined
    return result
}

function toStr(data: Record<string, unknown>, index: number): string | undefined {
    const result = typeof data[index.toString()] === 'string' ? data[index.toString()] : undefined
    return result as string | undefined
}

function addParentIds(rows: TaskRowDto[]): TaskRowDto[] {
    const stack: TaskRowDto[] = []
    const result: TaskRowDto[] = []

    for (const row of rows) {
        // スタックから、自分のノードレベルと 同レベ以下をPopして除去
        while (stack.length > 0 && stack[stack.length - 1].level >= row.level) {
            stack.pop()
        }
        // 同レベ以下を除去したので親levelになってる
        const parent = stack[stack.length - 1]
        row.parentId = parent ? parent.id : undefined

        // 親になるかもなので、スタックに追加
        stack.push(row)

        // return する配列
        result.push(row)
    }

    return result
}

function markLeafRows(rows: TaskRowDto[]): TaskRowDto[] {
    // 各rowの親IDを集める
    const parentIdSet = new Set(rows.map((row) => row.parentId).filter((id) => id !== undefined))

    // 親IDセットに出現しないrowは、末端Row
    return rows.map((row) => ({
        ...row,
        isLeaf: !parentIdSet.has(row.id),
    }))
}

function extractTaskPlotMapBySerial(
    row: Record<string, any>,
    header: Record<string, any>
): Map<number, boolean> {
    const map = new Map<number, boolean>()
    const headerKeys = Object.keys(header)

    for (let i = 27; i < headerKeys.length && i < headerKeys.length; i++) {
        const col = header[i]
        const val = row[i]

        if (typeof col === 'number') {
            // const result = val ? true : false
            if (val) {
                map.set(col, true)
            } else {
                // map.set(col, false)
            }
        }
    }

    return map
}
// export * from './TaskNode'
// export * from './TaskRow'
