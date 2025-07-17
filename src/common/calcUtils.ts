export const isValidNumber = (value: unknown): value is number =>
    typeof value === 'number' && !Number.isNaN(value)

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

export const subtract = (a: number | undefined, b: number | undefined): number | undefined => {
    if (typeof a !== 'number' || typeof b !== 'number') {
        return undefined
    }
    return a - b
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
 * a/bを返す。a,b数字かつb!=0 の時だけa/b それ以外はundefined
 * @param a
 * @param b
 * @returns a/b
 */
export const calcRate = (a: number | undefined, b: number | undefined) => {
    if (isValidNumber(b) && isValidNumber(a) && b !== 0) {
        return a / b
    }
    return undefined
}
