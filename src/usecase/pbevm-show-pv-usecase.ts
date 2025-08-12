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

        const results = taskRows.map((taskRow) => {
            const {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                calculatePV,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                calculatePVs,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                plotMap,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
