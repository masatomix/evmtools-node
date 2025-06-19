import { StyleFC } from './styles'

export const style0: StyleFC = ({ sheet, rowCount }): void => {
    sheet.range(`E2:F${rowCount + 1}`).style('numberFormat', '#,##0')
}

export const style1: StyleFC = ({ sheet, rowCount }): void => {
    sheet.range(`E2:F${rowCount + 1}`).style('numberFormat', '#,##0')
    sheet.range(`G2:R${rowCount + 1}`).style('numberFormat', '#,##0.00')
}

export const style2: StyleFC = ({ sheet, rowCount }): void => {
    sheet.range(`E2:E${rowCount + 1}`).style('numberFormat', '#,##0')
    sheet.range(`R2:R${rowCount + 1}`).style('numberFormat', '#,##0')
    sheet.range(`F2:Q${rowCount + 1}`).style('numberFormat', '#,##0.00')
}
export const style21: StyleFC = ({ sheet, rowCount }): void => {
    sheet.range(`E2:E${rowCount + 1}`).style('numberFormat', '#,##0')
    sheet.range(`R2:R${rowCount + 1}`).style('numberFormat', '#,##0')
    sheet.range(`F2:Q${rowCount + 1}`).style('numberFormat', '#,##0')
}

export const style3: StyleFC = ({ sheet, rowCount }): void => {
    sheet.range(`E2:R${rowCount + 1}`).style('numberFormat', '#,##0')
}

export const style4: StyleFC = ({ sheet, rowCount }): void => {
    sheet.range(`C2:D${rowCount + 1}`).style('numberFormat', '#,##0')
    sheet.range(`E2:P${rowCount + 1}`).style('numberFormat', '#,##0.00')
}

export const style5: StyleFC = ({ sheet, rowCount }): void => {
    // よくある整形パタン。
    // sheet.range(`C2:C${rowCount + 1}`).style('numberFormat', '@') // 書式: 文字(コレをやらないと、見かけ上文字だが、F2で抜けると数字になっちゃう)
    sheet.range(`I2:J${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd') // 書式: 日付
    sheet.range(`L2:M${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd') // 書式: 日付
    sheet.range(`S2:S${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd') // 書式: 日付
    // sheet.range(`H2:H${rowCount + 1}`).style('numberFormat', 'yyyy/mm/dd hh:mm') // 書式: 日付+時刻
}
