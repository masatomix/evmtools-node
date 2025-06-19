import { getLogger } from '../logger'
import { tidy, groupBy, summarize } from '@tidyjs/tidy'
import { TaskRow } from '../domain'
import { TaskRowCreator } from '../domain/TaskRowCreator'
import { dateStr, round } from '../common'

export class ShowSummaryUsecase {
    private logger = getLogger('ShowSummaryUsecase')

    constructor(private _creator: TaskRowCreator) {}

    async execute() {
        const rows: TaskRow[] = await this._creator.createRowData()

        const baseDate = new Date('2025-06-13T00:00:00+0900')
        const dispRows = rows.map((row) => {
            const { id, name, assignee, pv, calculatePV } = row
            return {
                id,
                name,
                assignee,
                pv,
                calcPv1: calculatePV(baseDate),
            }
        })

        // console.table(dispRows.filter((row) => row.assignee === '〇〇'))
        console.table(dispRows)

        // aggregate の練習
        const showAggregate = () => {
            const result = tidy(
                rows,
                groupBy('assignee', [
                    summarize({
                        担当のタスク数: (group) => group.length,
                        担当の工数の和: (group) =>
                            round(group.reduce((sum, d) => sum + (d.workload ?? 0), 0)),
                        担当の工数の平均: (group) =>
                            round(
                                group.reduce((sum, d) => sum + (d.workload ?? 0), 0) / group.length,
                                3
                            ),
                        // pv: (group) => group.map((d) => d.pv),
                        // calcPv_baseDate_の列: (group) => group.map((d) => d.calculatePV(baseDate)),
                        指定日までのpv累積: (group) =>
                            round(
                                group.reduce((sum, d) => sum + (d.calculatePVs(baseDate) ?? 0), 0),
                                3
                            ),
                        [`${dateStr(baseDate)}のPV`]: (group) =>
                            round(
                                group.reduce((sum, d) => sum + (d.calculatePV(baseDate) ?? 0), 0),
                                3
                            ),
                    }),
                ])
            )
            console.table(result)
        }
        showAggregate()
    }
}

// async function printData(rows: Record<string, any>[]) {
//     const workbook = await createWorkbook()

//     json2workbook({
//         instances: rows,
//         workbook,
//         sheetName: 'rows',
//         applyStyles: createStyles(),
//     })
//     workbook.deleteSheet('Sheet1')
//     await toFileAsync(workbook, 'result111.xlsx')
// }
