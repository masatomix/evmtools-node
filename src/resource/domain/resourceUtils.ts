import { excel2json } from 'excel-csv-read-write'
import {
    AttrType,
    isResourcePlan,
    MemberInfo,
    MonthTypes,
    monthTypeStrs,
    ResourcePlan,
    UnitInfo,
} from './resource'
import { average, round, sum } from './utils'
import { groupBy, summarize, tidy } from '@tidyjs/tidy'

/**
 * Excelファイルを読み込んで、UnitInfoデータの配列を作る
 * @param path
 * @returns
 */
export const toUnitInfoArray = async (
    path: string,
    sheetName = '要員(工数)'
): Promise<ResourcePlan[]> => {
    return await excel2json(path, sheetName)
        .then((results) => results.filter((result) => isResourcePlan(result)))
        .then((results) => {
            let prevUnit = {
                ユニットコード: '',
                ユニット名: '',
            }
            const resourcePlans = results.map((record) => {
                console.log(record)
                const currentUnit = (({ ユニットコード, ユニット名 }) => ({
                    ユニットコード,
                    ユニット名,
                }))(record) // そのプロパティだけ取り出す

                // 各ユニットの先頭の行にしか、ユニット関連情報がないので、ユニットの切り替わりまで、前行の情報を引き継ぐ
                const ret =
                    currentUnit.ユニットコード === undefined ? { ...record, ...prevUnit } : record // ユニットコードが未定義だったら、前回ので上書き、そうでなかったらそのまま
                prevUnit = (({ ユニットコード, ユニット名 }) => ({ ユニットコード, ユニット名 }))(
                    ret
                ) // 前回情報を返却値から取り出して持っておく
                return ret
            })
            console.table(resourcePlans)

            return resourcePlans
        })
}

export const toGroupBy = (key: AttrType, resourcePlans: ResourcePlan[]): ResourcePlan[] => {
    const unitAttrs = ['ユニットコード', 'ユニット名']

    const result = tidy(
        resourcePlans,
        groupBy(key, [
            summarize({
                ユニットコード: (instance) =>
                    unitAttrs.includes(key) ? instance[0].ユニットコード : '',
                ユニット名: (instance) => (unitAttrs.includes(key) ? instance[0].ユニット名 : ''),
                役職: (instance) => (['役職', '名前'].includes(key) ? instance[0].役職 : ''),
                名前: (instance) => (['名前'].includes(key) ? instance[0].名前 : ''),
                社内単価: (instance) => instance[0].社内単価,
                プロジェクト単価: (group) =>
                    average(group.map((instance) => instance.プロジェクト単価 as number)),
                // ユニットコード: unitAttrs.includes(key) ? instance.ユニットコード[0] : '',
                // ユニット名: unitAttrs.includes(key) ? instance.ユニット名[0] : '',
                // 役職: ['役職', '名前'].includes(key) ? instance.役職[0] : '',
                // 名前: ['名前'].includes(key) ? instance.名前[0] : '',
                // 社内単価: ['役職', '名前'].includes(key)
                // ? round(instance.社内単価[0], 0)
                // : (average(instance.社内単価) as number),
                // プロジェクト単価: average(instance.プロジェクト単価),
                ...monthlyAggregators(),
            }),
        ])
    )
    return result
}

export type Condition = {
    ユニットコード?: string
    ユニット名?: string
    役職?: string
    名前?: string
    社内単価?: number
    プロジェクト単価?: number
}

export const filter = (condition: Condition, target: ResourcePlan[]): ResourcePlan[] => {
    const { ユニットコード, ユニット名, 役職, 名前, 社内単価, プロジェクト単価 } = condition

    return target.filter(
        (info) =>
            // (役職 != null ? 役職 === info.役職 : true) &&
            // (名前 != null ? 名前 === info.名前 : true) &&
            // (単価 != null ? 単価 === info.単価 : true)
            (ユニットコード == null || ユニットコード === info.ユニットコード) &&
            (ユニット名 == null || ユニット名 === info.ユニット名) &&
            (役職 == null || 役職 === info.役職) &&
            (名前 == null || 名前 === info.名前) &&
            (社内単価 == null || 社内単価 === info.社内単価) &&
            (プロジェクト単価 == null || プロジェクト単価 === info.プロジェクト単価)
    )
}

/**
 *
 * ユニットコード、ユニット名を一覧する
 * @param resourcePlans
 * @returns
 */
export const toUnitInfo = (resourcePlans: ResourcePlan[]): UnitInfo[] => {
    const result = tidy(
        resourcePlans,
        groupBy('ユニットコード', [
            summarize({
                ユニットコード: (instance) => instance[0].ユニットコード,
                ユニット名: (instance) => instance[0].ユニット名,
                社内平均単価: (group) =>
                    average(group.map((instance) => instance.社内単価)) as number,
                プロジェクト平均単価: (group) =>
                    average(group.map((instance) => instance.プロジェクト単価 as number)),
                ...monthlyAggregators(),
            }),
        ])
    )
    return result
}

/**
 *
 * 社員情報を一覧する
 * @param resourcePlans
 * @returns
 */
export const toMemberInfo = (resourcePlans: ResourcePlan[]): MemberInfo[] => {
    const result = tidy(
        resourcePlans,
        groupBy('名前', [
            summarize({
                役職: (instance) => instance[0].役職,
                名前: (instance) => instance[0].名前,
                社内単価: (instance) => instance[0].社内単価,
            }),
        ])
    )
    return result
}

// const monthlyAggregators = () => {
//     return {
//         '11月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['11月'] ?? 0)),
//         '12月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['12月'] ?? 0)),
//         '1月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['1月'] ?? 0)),
//         '2月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['2月'] ?? 0)),
//         '3月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['3月'] ?? 0)),
//         '4月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['4月'] ?? 0)),
//         '5月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['5月'] ?? 0)),
//         '6月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['6月'] ?? 0)),
//         '7月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['7月'] ?? 0)),
//         '8月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['8月'] ?? 0)),
//         '9月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['9月'] ?? 0)),
//         '10月': (group: ResourcePlan[]) => sum(group.map((instance) => instance['10月'] ?? 0)),
//     }
// }

function monthlyAggregators() {
    return Object.fromEntries(
        monthTypeStrs.map((month) => [
            month,
            (group: ResourcePlan[]) => sum(group.map((instance) => instance[month] ?? 0)),
        ])
    )
}

export const toProjectMemberInfo = (resourcePlans: ResourcePlan[]): ResourcePlan[] => {
    const result = tidy(
        resourcePlans,
        groupBy(
            ['ユニットコード', '名前'],
            [
                summarize({
                    ユニットコード: (instances) => instances[0].ユニットコード,
                    ユニット名: (instances) => instances[0].ユニット名,
                    役職: (instances) => instances[0].役職,
                    名前: (instances) => instances[0].名前,
                    社内単価: (instances) => instances[0].社内単価,
                    プロジェクト単価: (group) =>
                        average(group.map((instance) => instance.プロジェクト単価 as number)),
                    ...monthlyAggregators(),
                }),
            ]
        )
    )
    return result
}

export const 単価単位調整 = (instance: ResourcePlan, unit = 1000, scale = 4): ResourcePlan => {
    const calc = (resource?: number): number | undefined => {
        return resource != null ? round(resource / unit, scale) : undefined
    }

    return {
        ...instance,
        社内単価: calc(instance.社内単価) as number,
        プロジェクト単価: calc(instance.プロジェクト単価),
    }
}

/**
 * @param instance
 * @param price
 * @returns
 */
const 月ごと単価 = (instance: MonthTypes, price?: number, scale = 4): MonthTypes => {
    const calc = (resource?: number): number | undefined => {
        return resource != null && price != null ? round(resource * price, scale) : undefined
    }

    return {
        '11月': calc(instance['11月']),
        '12月': calc(instance['12月']),
        '1月': calc(instance['1月']),
        '2月': calc(instance['2月']),
        '3月': calc(instance['3月']),
        '4月': calc(instance['4月']),
        '5月': calc(instance['5月']),
        '6月': calc(instance['6月']),
        '7月': calc(instance['7月']),
        '8月': calc(instance['8月']),
        '9月': calc(instance['9月']),
        '10月': calc(instance['10月']),
    }
}

export const toCost = (instance: ResourcePlan): ResourcePlan => ({
    ...instance,
    ...月ごと単価(instance, instance.社内単価),
})

export const toSales = (instance: ResourcePlan): ResourcePlan => ({
    ...instance,
    ...月ごと単価(instance, instance.プロジェクト単価),
})

// // このオブジェクトをつくって、マージする処理に変える

// // checkProjectみたいなメソッドで、エラーがあるかをチェックする。1超えた、足りないヒト、月売上げの集計とかいろいろ
// // 売上げ計算もしたい
