import { dateFromSn, excelBuffer2json } from 'excel-csv-read-write'
import { Project } from '../domain/Project'
import { ProjectCreator } from '../domain/ProjectCreator'
import { MappingProjectCreator } from './MappingProjectCreator'
import { HolidayData } from '../domain/HolidayData'

export class ExcelBufferProjectCreator implements ProjectCreator {
    constructor(
        private _buffer: ArrayBuffer,
        private _projectName: string
    ) {}

    async createProject(): Promise<Project> {
        const mappings = await excelBuffer2json(this._buffer, 'ガントチャート', undefined, {
            startIndex: 0,
            useHeader: false,
            // columnEndIndex: 26,
        })

        const holidayRawDatas = (await excelBuffer2json(this._buffer, '休日テーブル')) as Record<
            string,
            any
        >[]

        const holidayDatas = holidayRawDatas.map((rawData) => {
            return new HolidayData(
                dateFromSn(rawData['日付'] as number),
                rawData['祝日'] as string,
                rawData['祝日定義ルール'] as string,
                rawData['振替'] as string | undefined
            )
        })

        // プロジェクト名
        const projectName = this._projectName
        return new MappingProjectCreator(mappings, projectName, holidayDatas).createProject()
    }
}
