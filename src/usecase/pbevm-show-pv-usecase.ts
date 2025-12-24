import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { Project, ProjectCreator, TaskRow } from '../domain'
import { dateStr } from '../common'
import { getLogger } from '../logger'

const logger = getLogger('main')

export class PbevmShowPvUsecase {
    constructor(private _projectCretor: ProjectCreator) {}

    async execute(fromDate: Date, toDate: Date, assignee?: string) {
        const project = await this._projectCretor.createProject()

        const results: TaskRow[] = project.getTaskRows(fromDate, toDate, assignee)
        await this.save(project, results)
    }

    async save(currentProject: Project, taskRows: TaskRow[]) {
        const path = `${currentProject.name}-pv.xlsx`

        // 表示用データに変換（内部プロパティを除外）
        // Issue #72: logger, calculateSPI, calculateSV などを除去
        const results = taskRows.map((taskRow) => ({
            sharp: taskRow.sharp,
            id: taskRow.id,
            level: taskRow.level,
            name: taskRow.name,
            assignee: taskRow.assignee,
            workload: taskRow.workload,
            予定開始日: dateStr(taskRow.startDate),
            予定終了日: dateStr(taskRow.endDate),
            実績開始日: dateStr(taskRow.actualStartDate),
            実績終了日: dateStr(taskRow.actualEndDate),
            progressRate: taskRow.progressRate,
            scheduledWorkDays: taskRow.scheduledWorkDays,
            pv: taskRow.pv,
            ev: taskRow.ev,
            spi: taskRow.spi,
            進捗応当日: dateStr(taskRow.expectedProgressDate),
            delayDays: taskRow.delayDays,
            remarks: taskRow.remarks,
            parentId: taskRow.parentId,
            isLeaf: taskRow.isLeaf,
        }))

        logger.info('pv出力')
        console.table(results)

        if (results.length > 0) {
            const workbook = await createWorkbook()
            json2workbook({
                instances: results,
                workbook,
                sheetName: `pv`,
            })

            workbook.deleteSheet('Sheet1')
            await toFileAsync(workbook, path)
        }
    }
}
