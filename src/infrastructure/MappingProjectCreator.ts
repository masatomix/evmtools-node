import { dateFromSn } from 'excel-csv-read-write'
import { Project } from '../domain/Project'
import { ProjectCreator } from '../domain/ProjectCreator'
import { TaskRowCreatorImpl } from './TaskRowCreatorImpl'
import { TaskService } from '../domain/TaskService'
import { maxDate, minDate } from '../common'
import { HolidayData } from '../domain/HolidayData'

export class MappingProjectCreator implements ProjectCreator {
    constructor(
        private _mappings: unknown[],
        private _projectName: string,
        private _holidayDatas: HolidayData[]
    ) {}

    async createProject(): Promise<Project> {
        // プロジェクト名
        const projectName = this._projectName
        const mappings = this._mappings
        const baseDateRow = mappings.shift() // データじゃないので、取得して除去
        const baseDate = (baseDateRow as Record<string, number>)['26'] // ココに基準日が入ってる

        // データを渡してTaskRow[]を作ってもらう
        const taskRowCreator = new TaskRowCreatorImpl(mappings)
        const taskRows = await taskRowCreator.createRowData()

        // isLeafなヤツのstartDateで最小値
        const from = minDate(
            taskRows.map((taskRow) => (taskRow.isLeaf ? taskRow.startDate : undefined))
        )
        // isLeafなヤツのendtDateで最大値
        const to = maxDate(
            taskRows.map((taskRow) => (taskRow.isLeaf ? taskRow.endDate : undefined))
        )

        // TaskNode[]にBuildしてもらう
        const taskService = new TaskService()
        const taskNodes = taskService.buildTaskTree(taskRows)

        // 基準日をセット
        const project = new Project(
            taskNodes,
            dateFromSn(baseDate),
            this._holidayDatas,
            from,
            to,
            projectName
        )
        return project
    }
}
