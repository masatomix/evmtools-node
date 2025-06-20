import { TaskNode, TaskRow } from '../domain'

/**
 * FROM/TOの日付を渡して、日付配列を作る。今のところJSTで作成する事
 * @param from 例 new Date('2025-06-01T00:00:00+09:00'),
 * @param to   例 new Date('2025-06-30T00:00:00+09:00')
 * @returns
 */
export const generateBaseDates = (from: Date, to: Date): Date[] => {
    const dates: Date[] = []
    const current = new Date(from) // from を複製

    while (current <= to) {
        dates.push(new Date(current)) // コピーして格納
        current.setDate(current.getDate() + 1) // 1日進める
    }
    return dates
}

/**
 * date をyyyy/mmdd表記する
 * @param date
 * @returns
 */
export const dateStr = (date: Date | undefined): string => {
    if (!date) return ''
    return date.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
}

export function printTaskNodes(taskNodes: TaskNode[], baseDates: Date[]) {
    // TaskNode自体が Iterable なので、rootTaskごとにIterateする
    for (const rootTask of taskNodes) {
        // rootTaskごとにfor文を回せば良い
        for (const row of rootTask) {
            printTask(row, baseDates)
        }
    }
}

export function printTaskRows(rows: TaskRow[], baseDates: Date[]) {
    for (const row of rows) {
        printTask(row, baseDates)
    }
}

export function printTask(row: TaskRow, baseDates: Date[]) {
    if (!row.isLeaf) return
    console.log('-----')

    console.log(
        'row.id',
        'row.name',
        'row.isLeaf',
        'baseDateDisp',
        'row.calculatePV(baseDate)',
        'row.calculatePVs(baseDate)'
        // baseDatesn,
        // 'baseDate'
    )
    for (const baseDate of baseDates) {
        // const baseDatesn = date2Sn(baseDate)
        const baseDateDisp = dateStr(baseDate)
        console.log(
            row.id,
            row.name,
            row.isLeaf,
            baseDateDisp,
            row.calculatePV(baseDate),
            row.calculatePVs(baseDate)
            // baseDatesn,
            // baseDate
        )
    }
}

/**
 * 足し算する
 */
const sumFunc = (prev: number, current: number): number => (current ? prev + current : prev)

export const sum = (numbers?: number[], scale?: number): number | undefined => {
    if (numbers) {
        // const nonNullDatas = numbers.filter((number) => !!number) // undefinedを除去
        const nonNullDatas = numbers.filter((number) => number != null) // null または undefined を除去
        if (nonNullDatas.length > 0) {
            const result = nonNullDatas.reduce(sumFunc, 0)

            return round(result, scale)
        }
    }
}

/**
 * 四捨五入して、scale位にする
 * @param num
 * @param scale
 * @returns
 */
export const round = (num: number, scale = 10): number =>
    Math.round(num * 10 ** scale) / 10 ** scale

/**
 *
 * @param numbers 平均
 * @returns
 */
export const average = (numbers?: number[], scale = 3): number | undefined => {
    if (numbers) {
        // const nonNullDatas = numbers.filter((data) => !!data) // undefinedを除去
        const nonNullDatas = numbers.filter((data) => data != null) // null または undefined を除去
        // console.log(nonNullDatas)
        if (nonNullDatas.length > 0) {
            const result = (sum(nonNullDatas) as number) / nonNullDatas.length

            return round(result, scale)
        }
    }
}

/**
 * Date配列を引数にとり、MaxやMinを選んで返す
 *
 * @param dates
 * @param maxOrMinDate
 * @returns
 */
const maxOrMinDate = (
    dates: (Date | undefined)[],
    maxOrMinDate: (...numbers: number[]) => number
): Date | undefined => {
    const datesNum = dates
        .filter((date): date is Date => !(date === undefined))
        .map((date) => date.getTime())

    return datesNum.length > 0 ? new Date(maxOrMinDate(...datesNum)) : undefined
}

export const maxDate = (dates: (Date | undefined)[]): Date | undefined =>
    maxOrMinDate(dates, Math.max)

export const minDate = (dates: (Date | undefined)[]): Date | undefined =>
    maxOrMinDate(dates, Math.min)

// if (!module.parent) { /* empty */ }
