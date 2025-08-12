import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { getLogger } from '../../logger'
import {
    toCost,
    toGroupBy,
    toMemberInfo,
    toProjectMemberInfo,
    toSales,
    toUnitInfo,
    toUnitInfoArray,
    単価単位調整,
} from '../domain/resourceUtils'
import path from 'node:path'
import fs from 'node:fs'
import { createStyles } from '../domain/styles'
import { style0, style1, style2, style21, style3, style4 } from '../../common/myStyles'

export class PbevmShowResourcePlanUsecase {
    private logger = getLogger('PbevmShowResourcePlanUsercase')

    async execute() {
        const unitResults = await toUnitInfoArray('要員計画202009.xlsx')
        const outputDir = 'output'
        fs.existsSync(outputDir) || fs.mkdirSync(outputDir)

        const workbook = await createWorkbook()
        console.log('素データ')
        console.table(unitResults)

        const byNameInfo = toGroupBy('名前', unitResults)

        console.log('名前ごと')
        console.table(byNameInfo)

        console.log('プロジェクト情報,人ごと')
        const projectMemberInfo = toProjectMemberInfo(unitResults)
        console.table(projectMemberInfo)

        console.log('ユニット一覧')
        const unitInfo = toUnitInfo(unitResults)
        console.table(unitInfo)

        console.log('メンバー一覧')
        const memberInfo = toMemberInfo(unitResults)
        console.table(memberInfo)

        json2workbook({
            instances: byNameInfo,
            workbook,
            sheetName: 'メンバーごとの工数',
            applyStyles: createStyles(style0),
        })

        json2workbook({
            instances: projectMemberInfo,
            workbook,
            sheetName: 'プロジェクト、人ごとの工数',
            applyStyles: createStyles(style1),
        })

        // for (const targetColumn of attrTypeStrs) {
        //   console.log(`${targetColumn} でGroup Byした結果:`)
        //   const result = toGroupBy(targetColumn, unitResults)
        //   console.table(result)
        //   json2workbook({ instances: result, workbook, sheetName: targetColumn, applyStyles })
        // }

        console.log('単価調整素データ')
        const 単価調整素データ = unitResults.map((unitResult) => 単価単位調整(unitResult))
        console.table(単価調整素データ)

        json2workbook({
            instances: 単価調整素データ,
            workbook,
            sheetName: '要員(工数)',
            applyStyles: createStyles(style2),
        })

        const costs = 単価調整素データ.map((unitResult) => toCost(unitResult))
        console.table(costs)
        json2workbook({
            instances: costs,
            workbook,
            sheetName: '要員(コスト)',
            applyStyles: createStyles(style21),
        })

        const sales = 単価調整素データ.map((unitResult) => toSales(unitResult))
        console.table(sales)
        json2workbook({
            instances: sales,
            workbook,
            sheetName: '要員(売上)',
            applyStyles: createStyles(style21),
        })

        const costsByUnit = toGroupBy('ユニットコード', costs)
        console.table(costsByUnit)

        const salesByUnit = toGroupBy('ユニットコード', sales)
        console.table(salesByUnit)

        json2workbook({
            instances: costsByUnit,
            workbook,
            sheetName: 'ユニットごとコスト',
            applyStyles: createStyles(style3),
        })
        json2workbook({
            instances: salesByUnit,
            workbook,
            sheetName: 'ユニットごと売上',
            applyStyles: createStyles(style3),
        })

        json2workbook({
            instances: unitInfo,
            workbook,
            sheetName: 'ユニットごと工数',
            applyStyles: createStyles(style4),
        })
        json2workbook({
            instances: memberInfo,
            workbook,
            sheetName: 'メンバー一覧',
            applyStyles: createStyles(style4),
        })
        workbook.deleteSheet('Sheet1')

        await toFileAsync(workbook, path.join(outputDir, '要員計画集計.xlsx'))

        // const project = await this._creator.createProject()
        // const holidayDatas = project.holidayDatas
        // console.table(holidayDatas)
        // console.log(isHoliday(new Date('2025-07-21'), project))
        // console.log(project.isHoliday(new Date('2025-07-21')))
        // await this._repository.save(project)
    }
}
