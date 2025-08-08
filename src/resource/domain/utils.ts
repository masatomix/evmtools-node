/**
 * 足し算する
 */
const sumFunc = (prev: number, current: number): number => (current ? prev + current : prev)

export const sum = (numbers?: number[], scale?: number): number | undefined => {
    if (numbers) {
        const nonNullDatas = numbers.filter((number) => !!number) // undefinedを除去
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
        const nonNullDatas = numbers.filter((data) => !!data) // undefinedを除去
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
    dates: Date[],
    maxOrMinDate: (...numbers: number[]) => number
): Date | undefined => {
    const datesNum = dates.filter((date) => !(date === undefined)).map((date) => date.getTime())

    return datesNum.length > 0 ? new Date(maxOrMinDate(...datesNum)) : undefined
}

export const maxDate = (dates: Date[]): Date | undefined => maxOrMinDate(dates, Math.max)

export const minDate = (dates: Date[]): Date | undefined => maxOrMinDate(dates, Math.min)

// if (!module.parent) { /* empty */ }
