import { CSVData } from 'excel-csv-read-write/dist/data'
import XlsxPopulate from 'xlsx-populate'
import { ResourcePlan } from './resource'

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

        // ユニットコードの切り替わりを判定して、罫線つける

        const results = instances as ResourcePlan[]
        let prevUnit = {
            ユニットコード: '',
            ユニット名: '',
        }
        // console.log('===')
        // for (const [index, result] of results.entries()) {
        //   const record = result
        //   const currentUnit = (({ ユニットコード, ユニット名 }) => ({ ユニットコード, ユニット名 }))(record) // そのプロパティだけ取り出す

        //   // 各ユニットの先頭の行にしか、ユニット関連情報がないので、ユニットの切り替わりまで、前行の情報を引き継ぐ
        //   if (currentUnit.ユニットコード !== prevUnit.ユニットコード) {
        //     console.log(index)
        //     prevUnit = (({ ユニットコード, ユニット名 }) => ({ ユニットコード, ユニット名 }))(currentUnit) // 前回情報を返却値から取り出して持っておく
        //   }
        // }
        // console.log('===')
        const numbers = results.reduce<number[]>((prev, current, index) => {
            const record = current
            const currentUnit = (({ ユニットコード, ユニット名 }) => ({
                ユニットコード,
                ユニット名,
            }))(record) // そのプロパティだけ取り出す

            // 各ユニットの先頭の行にしか、ユニット関連情報がないので、ユニットの切り替わりまで、前行の情報を引き継ぐ
            if (currentUnit.ユニットコード !== prevUnit.ユニットコード) {
                prev.push(index)
                prevUnit = (({ ユニットコード, ユニット名 }) => ({ ユニットコード, ユニット名 }))(
                    currentUnit
                ) // 前回情報を返却値から取り出して持っておく
            }

            return prev
        }, [])
        // console.log(numbers)

        for (const count of numbers) {
            // データがあるところには罫線を引く(細いヤツ)
            const startCell = sheet.cell(`A${count + 1}`)
            const endCell = startCell.relativeCell(0, columnCount - 1)

            sheet.range(startCell, endCell).style('border', {
                top: { style: 'hair' },
                left: { style: 'hair' },
                bottom: { style: 'thin' },
                right: { style: 'hair' },
            })
        }
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
