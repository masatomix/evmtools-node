import { excel2json2 } from 'excel-csv-read-write'
import { Project } from '../domain/Project'
import { ProjectCreator } from '../domain/ProjectCreator'
import { MappingProjectCreator } from './MappingProjectCreator'

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

        const holidayRawDatas = await excel2json2({
            filePath: this._excelPath,
            sheetName: '休日テーブル',
        })

        // プロジェクト名
        const projectName = getFilenameWithoutExtension(this._excelPath)
        // 基準日をセット

        return new MappingProjectCreator(mappings, projectName, holidayRawDatas).createProject()
    }
}

const getFilenameWithoutExtension = (fullPath: string): string => {
    const filename = fullPath.split(/[/\\]/).pop() ?? ''
    return filename.replace(/\.[^/.]+$/, '') // 最後の .xxx を除去
}
