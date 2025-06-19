import { dateStr } from '../common'
import { TaskNode } from './TaskNode'
import { TaskService } from './TaskService'

export class Project {
    constructor(
        private _taskNodes: TaskNode[],
        private _baseDate: Date,
        private _startDate?: Date,
        private _endDate?: Date
    ) {}

    get baseDate() {
        return this._baseDate
    }
    get taskNodes() {
        return this._taskNodes
    }

    get startDate() {
        return this._startDate
    }
    get endDate() {
        return this._endDate
    }

    print = () => {
        console.log(`基準日: ${dateStr(this._baseDate)}`)
        console.log(`開始日: ${dateStr(this._startDate)}`)
        console.log(`終了日: ${dateStr(this._endDate)}`)
        console.table(this._taskNodes)

        const taskRows = new TaskService().convertToTaskRows(this._taskNodes)
        const rows = taskRows.map((taskRow) => {
            const {
                calculatePV,
                calculatePVs,
                plotMap,
                startDate,
                endDate,
                actualStartDate,
                actualEndDate,
                expectedProgressDate,
                ...rest
            } = taskRow
            return {
                ...rest,
                startDate: dateStr(startDate),
                endDate: dateStr(endDate),
                actualStartDate: dateStr(actualStartDate),
                actualEndDate: dateStr(actualEndDate),
                expectedProgressDate: dateStr(expectedProgressDate),
            }
        })
        console.table(rows)
        return rows

    }
}

// /**
//  * タスク情報
//  */
// private nu.mine.kino.entity.TaskInformation[] taskInformations;

// /**
//  * プロジェクト開始日
//  */
// private java.util.Date projectStartDate;

// /**
//  * プロジェクト終了日
//  */
// private java.util.Date projectEndDate;

// /**
//  * 基準日
//  */
// private java.util.Date baseDate;

// /**
//  * 休日カレンダー
//  */
// private nu.mine.kino.entity.Holiday[] holidays;
