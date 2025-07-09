export type TaskRow = {
    sharp: number // #
    id: number // id
    level: number // level
    name: string //タスク名
    assignee?: string // 担当
    workload?: number // 予定工数
    startDate?: Date // 予定 開始日
    endDate?: Date // 予定 終了日
    // progress?: number // 進捗率

    ////////
    actualStartDate?: Date //実績 開始日
    actualEndDate?: Date // 実績 終了日
    progressRate?: number // 進捗率
    scheduledWorkDays?: number //稼働予定日数
    pv?: number // pv
    ev?: number // ev
    spi?: number // 基準日進捗率
    expectedProgressDate?: Date // 進捗率応当日
    delayDays?: number // 遅延日数
    remarks?: string //備考
    parentId?: number // 親id
    isLeaf?: boolean
    plotMap?: Map<number, boolean>
}

export type TaskNode = TaskRow & {
    children: TaskNode[] // サブタスク達
}

export const isTaskRowDtos = (arg: unknown[]): arg is TaskRow[] => {
    return Array.isArray(arg) && arg.every(isTaskRowDto)
}

// export type TaskNode = {
//     sharp: number // #
//     id: number // id
//     level: number // level
//     name: string //タスク名
//     assignee?: string // 担当
//     workload?: number // 予定工数
//     startDate?: Date // 予定 開始日
//     endDate?: Date // 予定 終了日
//     progress?: number // 進捗率
//     parentId?: number // 親id

//     ////////
//     actualStartDate?: Date //実績 開始日
//     actualEndDate?: Date // 実績 終了日
//     progressRate?: number // 進捗率
//     scheduledWorkDays?: number //稼働予定日数
//     pv?: number // pv
//     ev?: number // ev
//     spi?: number // 基準日進捗率
//     expectedProgressDate?: Date // 進捗率応当日
//     delayDays?: number // 遅延日数
//     remarks?: string //備考
// }

// created by ChatGPT
export const isTaskRowDto = (arg: unknown): arg is TaskRow => {
    if (typeof arg !== 'object' || arg === null) return false

    const obj = arg as Record<string, unknown>

    // 必須プロパティのチェック
    if (
        typeof obj.sharp !== 'number' ||
        typeof obj.id !== 'number' ||
        typeof obj.level !== 'number' ||
        typeof obj.name !== 'string'
    ) {
        return false
    }

    // オプショナルプロパティの型チェック（存在する場合）
    if (
        (obj.assignee !== undefined && typeof obj.assignee !== 'string') ||
        (obj.workload !== undefined && typeof obj.workload !== 'number') ||
        (obj.startDate !== undefined && !(obj.startDate instanceof Date)) ||
        (obj.endDate !== undefined && !(obj.endDate instanceof Date)) ||
        // (obj.progress !== undefined && typeof obj.progress !== 'number') ||
        (obj.actualStartDate !== undefined && !(obj.actualStartDate instanceof Date)) ||
        (obj.actualEndDate !== undefined && !(obj.actualEndDate instanceof Date)) ||
        (obj.progressRate !== undefined && typeof obj.progressRate !== 'number') ||
        (obj.scheduledWorkDays !== undefined && typeof obj.scheduledWorkDays !== 'number') ||
        (obj.pv !== undefined && typeof obj.pv !== 'number') ||
        (obj.ev !== undefined && typeof obj.ev !== 'number') ||
        (obj.spi !== undefined && typeof obj.spi !== 'number') ||
        (obj.expectedProgressDate !== undefined && !(obj.expectedProgressDate instanceof Date)) ||
        (obj.delayDays !== undefined && typeof obj.delayDays !== 'number') ||
        (obj.remarks !== undefined && typeof obj.remarks !== 'string') ||
        (obj.parentId !== undefined && typeof obj.parentId !== 'number') ||
        (obj.isLeaf !== undefined && typeof obj.isLeaf !== 'boolean')
    ) {
        return false
    }

    return true
}
