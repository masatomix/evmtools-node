import { getLogger } from '../logger'
import { tidy, groupBy, summarize } from '@tidyjs/tidy'
import { TaskRow } from '../domain'
import { TaskRowCreator } from '../domain/TaskRowCreator'
import { average, dateStr, sum } from '../common'

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

        console.table(dispRows)

        // aggregate の練習
        const showAggregate = () => {
            const result = tidy(
                rows,
                groupBy('assignee', [
                    summarize({
                        担当のタスク数: (group) => group.length,
                        担当の工数の和: (group) => sum(group.map((d) => d.workload ?? 0)),
                        担当の工数の平均: (group) => average(group.map((d) => d.workload ?? 0)),
                        // pv: (group) => group.map((d) => d.pv),
                        // calcPv_baseDate_の列: (group) => group.map((d) => d.calculatePV(baseDate)),
                        [`${dateStr(baseDate)}までのPV累積`]: (group) =>
                            sum(
                                group.map((d) => d.calculatePVs(baseDate)),
                                3
                            ),
                        [`${dateStr(baseDate)}のPV`]: (group) =>
                            sum(
                                group.map((d) => d.calculatePV(baseDate) ?? 0),
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
