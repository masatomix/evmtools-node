import { excel2json } from 'excel-csv-read-write'
import { isResourcePlan, ResourcePlan } from '../domain/resource'
import { ResourcePlansCreator } from '../domain/ResourcePlansCreator'

export class ExcelResourcePlansCreator implements ResourcePlansCreator {
    constructor(
        private _path: string,
        private _sheetName?: string
    ) {}
    async createResourcePlans(): Promise<ResourcePlan[]> {
        return toUnitInfoArray(this._path, this._sheetName)
    }
}

/**
 * Excelファイルを読み込んで、UnitInfoデータの配列を作る
 * @param path
 * @returns
 */
const toUnitInfoArray = async (path: string, sheetName = '要員(工数)'): Promise<ResourcePlan[]> => {
    const results = await excel2json(path, sheetName)

    const createUnit = ({
        ユニットコード,
        ユニット名,
    }: {
        ユニットコード: string
        ユニット名: string
    }) => ({
        ユニットコード,
        ユニット名,
    }) // そのプロパティだけ取り出す
    return results
        .filter((result) => isResourcePlan(result))
        .reduce<ResourcePlan[]>((acc, record) => {
            const currentUnit = createUnit(record) // そのプロパティだけ取り出す
            const prevUnit =
                acc.length > 0
                    ? createUnit(acc[acc.length - 1]) // 前回情報を返却値から取り出して持っておく
                    : { ユニットコード: '', ユニット名: '' }

            // 各ユニットの先頭の行にしか、ユニット関連情報がないので、ユニットの切り替わりまで、前行の情報を引き継ぐ
            const currentRecord =
                currentUnit.ユニットコード === undefined ? { ...record, ...prevUnit } : record // ユニットコードが未定義だったら、前回ので上書き、そうでなかったらそのまま
            return [...acc, currentRecord]
        }, [])
    // .map((record) => {
    //     const currentUnit = (({ ユニットコード, ユニット名 }) => ({
    //         ユニットコード,
    //         ユニット名,
    //     }))(record) // そのプロパティだけ取り出す

    //     // 各ユニットの先頭の行にしか、ユニット関連情報がないので、ユニットの切り替わりまで、前行の情報を引き継ぐ
    //     const ret =
    //         currentUnit.ユニットコード === undefined ? { ...record, ...prevUnit } : record // ユニットコードが未定義だったら、前回ので上書き、そうでなかったらそのまま
    //     prevUnit = (({ ユニットコード, ユニット名 }) => ({ ユニットコード, ユニット名 }))(ret) // 前回情報を返却値から取り出して持っておく
    //     return ret
    // })
}
