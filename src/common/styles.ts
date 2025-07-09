import { CSVData } from 'excel-csv-read-write/dist/data'
import XlsxPopulate from 'xlsx-populate'

export type StyleFC = (props: {
    instances: unknown[]
    sheet: XlsxPopulate.Sheet
    rowCount: number
    columnCount: number
    columnNames: string[]
    startCell: XlsxPopulate.Cell
    endCell: XlsxPopulate.Cell
}) => void

export const createStyles = (styles?: StyleFC) => {
    // applyStylesが欲しがっている関数を返す
    return function (
        instances: unknown[],
        workbook: XlsxPopulate.Workbook,
        sheetName: string
    ): void {
        const rowCount = instances.length
        const columnNames = Object.keys(instances[0] as CSVData)
        const columnCount = columnNames.length
        const sheet = workbook.sheet(sheetName)

        const startCell = sheet.cell(`A$1`)
        const endCell = startCell.relativeCell(rowCount, columnCount - 1)

        sheet.range(startCell, endCell).style('fontFamily', 'メイリオ')
        // sheet.cell('A1').style('fontFamily', 'メイリオ')

        const headerStartCell = sheet.cell(`A1`)
        const headerEndCell = headerStartCell.relativeCell(0, columnCount - 1)

        sheet
            .range(headerStartCell, headerEndCell)
            .style('fill', { type: 'solid', color: { theme: 8, tint: '0.8' } })

        if (styles) {
            styles({ instances, sheet, rowCount, columnCount, columnNames, startCell, endCell })
        }

        // よくある整形パタン。
        // sheet.range(`C2:C${rowCount + 1}`).style('numberFormat', '@') // 書式: 文字(コレをやらないと、見かけ上文字だが、F2で抜けると数字になっちゃう)
        // sheet.range(`E2:F${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd') // 書式: 日付
        // sheet.range(`H2:H${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd hh:mm') // 書式: 日付+時刻
    }
}
