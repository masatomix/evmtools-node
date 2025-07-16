import { excelBuffer2json } from 'excel-csv-read-write'
import { Project } from '../domain/Project'
import { ProjectCreator } from '../domain/ProjectCreator'
import { MappingProjectCreator } from './MappingProjectCreator'

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

        const holidayRawDatas = await excelBuffer2json(this._buffer, '休日テーブル')

        // プロジェクト名
        const projectName = this._projectName
        return new MappingProjectCreator(mappings, projectName, holidayRawDatas).createProject()
    }
}
