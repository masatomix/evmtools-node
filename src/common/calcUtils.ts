export const isValidNumber = (value: unknown): value is number =>
    typeof value === 'number' && !Number.isNaN(value)

/**
 *  undefined や空配列なら 0 を返す
 *  実際に数値があれば合計値を返す
 *  戻り値の型は number （undefinedは返さない）
 * @param numbers
 * @param scale
 * @returns
 */
export const sumOrZero = (numbers?: (number | undefined)[], scale?: number): number => {
    if (!numbers || numbers.length === 0) return 0

    const nonNullDatas = numbers.filter((n) => n != null)
    if (nonNullDatas.length === 0) return 0

    const result = nonNullDatas.reduce((a, b) => a + b, 0)
    return round(result, scale)
}

/**
 * 足し算する
 */
// const sumFunc = (prev: number, current: number): number => (current ? prev + current : prev)

// export const sum = (numbers?: (number | undefined)[], scale?: number): number | undefined => {
//     if (numbers) {
//         // const nonNullDatas = numbers.filter((number) => !!number) // undefinedを除去 (0も除外されてた)
//         const nonNullDatas = numbers.filter((number) => number != null) // null または undefined を除去
//         if (nonNullDatas.length > 0) {
//             const result = nonNullDatas.reduce(sumFunc, 0)

//             return round(result, scale)
//         }
//     }
// }

/**
 * 引数がundefined、引数はあるけど空配列とかのときはundefined
 * 配列中の undefined/nullは除去して足し算する
 * @param numbers (number | undefined)[] は、基本numberの配列だけど要素にundefinedもありえる型
 * @param scale
 * @returns
 */
export const sum = (numbers?: (number | undefined)[], scale?: number): number | undefined => {
    if (!numbers) return undefined //そもそも配列がundefined、もしくは空配列

    const nonNullDatas = numbers.filter((n) => n != null) // undefined / nullを除去
    if (nonNullDatas.length === 0) return undefined // なくなったらundefined

    const result = nonNullDatas.reduce((a, b) => a + b, 0)
    return round(result, scale)
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

// /**
//  *
//  * @param numbers 平均
//  * @returns
//  */
// export const average = (
//     numbers?: (number | undefined)[],
//     scale?: number
// ): number | undefined => {
//     if (numbers) {
//         // const nonNullDatas = numbers.filter((data) => !!data) // undefinedを除去
//         const nonNullDatas = numbers.filter((data) => data != null) // null または undefined を除去
//         // console.log(nonNullDatas)
//         if (nonNullDatas.length > 0) {
//             const result = (sum(nonNullDatas) as number) / nonNullDatas.length

//             return round(result, scale)
//         }
//     }
// }

export const averageOrZero = (numbers?: (number | undefined)[], scale?: number): number => {
    if (!numbers) return 0 //そもそも配列がundefined、もしくは空配列

    const nonNullDatas = numbers.filter((n) => n != null) // undefined / nullを除去
    if (nonNullDatas.length === 0) return 0

    const total = sum(nonNullDatas)
    if (total === undefined) return 0

    const result = total / nonNullDatas.length
    return round(result, scale)
}

export const average = (numbers?: (number | undefined)[], scale?: number): number | undefined => {
    if (!numbers) return undefined //そもそも配列がundefined、もしくは空配列

    const nonNullDatas = numbers.filter((n) => n != null) // undefined / nullを除去
    if (nonNullDatas.length === 0) return undefined

    const total = sum(nonNullDatas)
    if (total === undefined) return undefined

    const result = total / nonNullDatas.length
    return round(result, scale)
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
