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
