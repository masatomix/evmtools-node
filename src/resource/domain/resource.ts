export const attrTypeStrs = ['ユニットコード', 'ユニット名', '役職', '名前'] as const
export type AttrType = (typeof attrTypeStrs)[number] // これと等価 export type AttrType = 'ユニットコード' | 'ユニット名' | '役職' | '名前'
export type AttrTypes = { [key in AttrType]: string }
export type AttrTypesArray = { [key in AttrType]: string[] }

export const monthTypeStrs = [
    '11月',
    '12月',
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
] as const
export type MonthType = (typeof monthTypeStrs)[number]
// export type MonthType = '11月' | '12月' | '1月' | '2月' | '3月' | '4月' | '5月' | '6月' | '7月' | '8月' | '9月' | '10月'
export type MonthTypes = { [key in MonthType]?: number }
export type MonthTypesArray = { [key in MonthType]: number[] }

export type PriceTypes = {
    社内単価: number
    プロジェクト単価?: number
}

export type PriceTypesArray = {
    社内単価: number[]
    プロジェクト単価?: number[]
}

export type ResourcePlan = AttrTypes & PriceTypes & MonthTypes
export type GroupingResourcePlan = AttrTypesArray & PriceTypesArray & MonthTypesArray

export const isResourcePlan = (arg: unknown): arg is ResourcePlan => {
    const instance = arg as ResourcePlan

    return instance.役職 !== undefined
}

// export const isResourcePlans = (arg: unknown[]): arg is ResourcePlan[] => {
//   return arg.every((instance) => isResourcePlan(instance))
// }

export type UnitInfo = {
    ユニットコード: string
    ユニット名: string
    社内平均単価: number
    プロジェクト平均単価?: number
} & MonthTypes

export type MemberInfo = {
    役職: string
    名前: string
    社内単価: number
}
