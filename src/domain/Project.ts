import { dateStr } from '../common'
import { TaskNode } from './TaskNode'
import { TaskService } from './TaskService'

export class Project {
    // PV/EV/SPIとか出してあげたい(baseDateの)
    constructor(
        private _taskNodes: TaskNode[],
        private _baseDate: Date,
        private _startDate?: Date,
        private _endDate?: Date,
        private _name?: string
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
    get name() {
        return this._name
    }

    printAndGetData = () => {
        console.log(`基準日: ${dateStr(this._baseDate)}`)
        console.log(`開始日: ${dateStr(this._startDate)}`)
        console.log(`終了日: ${dateStr(this._endDate)}`)
        console.log(`プロジェクト名: ${this._name}`)
        console.table(this._taskNodes)

        const taskRows = new TaskService().convertToTaskRows(this._taskNodes)
        const rows = taskRows.map((taskRow) => {
            const {
                calculatePV, 
                calculatePVs,
                plotMap,
                checkStartEndDateAndPlotMap,
                startDate,
                endDate,
                actualStartDate,
                actualEndDate,
                expectedProgressDate,
                ...rest // ココのデータだけが出力される
            } = taskRow
            return {
                ...rest,
                予定開始日: dateStr(startDate),
                予定終了日: dateStr(endDate),
                実績開始日: dateStr(actualStartDate),
                実績終了日: dateStr(actualEndDate),
                進捗応当日: dateStr(expectedProgressDate),
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
