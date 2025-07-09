import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { createStyles, style6 } from '../common'
import {
    AssigneeDiff,
    Project,
    ProjectCreator,
    ProjectDiff,
    ProjectService,
    TaskDiff,
} from '../domain'

export class PbevmDiffUsercase {
    constructor(
        private _nowProjectCreator: ProjectCreator,
        private _prevProjectCreator: ProjectCreator,
        private _projectService: ProjectService
    ) {}

    async execute() {
        const nowP = await this._nowProjectCreator.createProject()
        const prevP = await this._prevProjectCreator.createProject()

        const taskDiffs = this._projectService.calculateTaskDiffs(nowP, prevP)
        // console.table(taskDiffs.filter((row) => row.hasDiff))

        const projectDiffs = this._projectService.calculateProjectDiffs(taskDiffs)
        // console.table(projectDiffs.filter((row) => row.hasDiff))

        const assigneeDiffs = this._projectService.calculateAssigneeDiffs(taskDiffs)
        // console.table(assigneeDiffs.filter((row) => row.hasDiff))

        await this.save(nowP, prevP, projectDiffs, assigneeDiffs, taskDiffs)
    }

    async save(
        currentProject: Project,
        prevProject: Project,
        projectDiffs: ProjectDiff[],
        assigneeDiffs: AssigneeDiff[],
        taskDiffs: TaskDiff[]
    ) {
        const path = `${currentProject.name}-diff.xlsx`
        const workbook = await createWorkbook()

        if (projectDiffs) {
            console.log('プロジェクトDiff')
            console.table(projectDiffs.filter((row) => row.hasDiff))
            json2workbook({
                instances: projectDiffs,
                workbook,
                sheetName: `プロジェクトDiff`,
                applyStyles: createStyles(),
            })
        }
        if (assigneeDiffs) {
            console.log('担当Diff')
            console.table(assigneeDiffs.filter((row) => row.hasDiff))
            json2workbook({
                instances: assigneeDiffs,
                workbook,
                sheetName: '担当Diff',
                applyStyles: createStyles(),
            })
        }

        if (taskDiffs) {
            console.log('タスクDiff')
            console.table(taskDiffs.filter((row) => row.hasDiff))
            json2workbook({
                instances: taskDiffs,
                workbook,
                sheetName: `タスクDiff`,
                applyStyles: createStyles(style6), // 日付列のフォーマットを指定
                converters: {
                    // なんか、日付はコレやらないとキレイに出力できない
                    prevBaseDate: (value: unknown) => value,
                    currentBaseDate: (value: unknown) => value,
                    baseDate: (value: unknown) => value,
                },
            })
        }

        workbook.deleteSheet('Sheet1')
        await toFileAsync(workbook, path)
    }
}
