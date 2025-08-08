export const attrTypeStrs = ['分類', 'タスク名称', '担当', 'タスク概要'] as const
export type AttrType = (typeof attrTypeStrs)[number] // これと等価 export type AttrType = 'ユニットコード' | 'ユニット名' | '役職' | '名前'
// export type AttrTypes = { [key in AttrType]: string }
// export type AttrTypesArray = { [key in AttrType]: string[] }

export type Task = {
  No?: number
  タスクID?: number
  分類: string
  タスクprefix: string
  タスク名称: string
  先行タスクID?: number
  担当: string
  タスク概要: string
  主要アウトプット: string
  先週の活動実績報告: string
  今週の活動予定: string
  状況: string
  予定工数: number
  予定開始日?: Date
  予定終了日?: Date
  実績開始日?: Date
  実績終了日?: Date
  進捗率?: number
  稼動予定日数: number
  PV?: number
  EV?: number
  AC?: number
  備考: string
  PV日付?: Date[]
}


export const isTask = (arg: unknown): arg is Task => {
  const instance = arg as Task

  return instance.No !== undefined && instance.タスクID !== undefined
}

export type GroupTask = {
  No: number[]
  タスクID: number[]
  分類: string[]
  タスクprefix: string[]
  タスク名称: string[]
  先行タスクID: number[]
  担当: string[]
  タスク概要: string[]
  主要アウトプット: string[]
  先週の活動実績報告: string[]
  今週の活動予定: string[]
  状況: string[]
  予定工数: number[]
  予定開始日: Date[]
  予定終了日: Date[]
  実績開始日: Date[]
  実績終了日: Date[]
  進捗率: number[]
  稼動予定日数: number[]
  PV: number[]
  EV: number[]
  AC: number[]
  備考: string[]
  PV日付: Date[][]
}

