import { dateFromSn, excel2json2 } from 'excel-csv-read-write'
import { Project } from '../domain/Project'
import { ProjectCreator } from '../domain/ProjectCreator'
import { MappingProjectCreator } from './MappingProjectCreator'
import { HolidayData } from '../domain/HolidayData'

export class ExcelProjectCreator implements ProjectCreator {
    constructor(private _excelPath: string) {}

    async createProject(): Promise<Project> {
        const mappings = await excel2json2({
            filePath: this._excelPath,
            sheetName: 'ガントチャート',
            option: {
                startIndex: 0,
                useHeader: false,
                // columnEndIndex: 26,
            },
        })

        const holidayRawDatas = (await excel2json2({
            filePath: this._excelPath,
            sheetName: '休日テーブル',
        })) as Record<string, any>[]

        const holidayDatas = holidayRawDatas.map((rawData) => {
            return new HolidayData(
                dateFromSn(rawData['日付'] as number),
                rawData['祝日'] as string,
                rawData['祝日定義ルール'] as string,
                rawData['振替'] as string | undefined
            )
        })
        // typeof rawData['日付'] === 'number' ? dateFromSn(rawData['日付']) : undefined

        // プロジェクト名
        const projectName = getFilenameWithoutExtension(this._excelPath)
        // 基準日をセット

        return new MappingProjectCreator(mappings, projectName, holidayDatas).createProject()
    }
}

const getFilenameWithoutExtension = (fullPath: string): string => {
    const filename = fullPath.split(/[/\\]/).pop() ?? ''
    return filename.replace(/\.[^/.]+$/, '') // 最後の .xxx を除去
}
