import { excel2json, excelBuffer2json } from 'excel-csv-read-write'
import { ProjectStatistics } from './Project'

export interface ProjectStatisticsCreator {
    createProjectStatistics(): Promise<ProjectStatistics[]>
}

export class ExcelProjectStatisticsCreator implements ProjectStatisticsCreator {
    constructor(private _excelPath: string) {}
    async createProjectStatistics(): Promise<ProjectStatistics[]> {
        const datas = await excel2json(this._excelPath, 'プロジェクト時系列情報')
        return datas as ProjectStatistics[]
    }
}

export class ExcelBufferProjectStatisticsCreator implements ProjectStatisticsCreator {
    constructor(private _arrayBuffer: ArrayBuffer) {}

    async createProjectStatistics(): Promise<ProjectStatistics[]> {
        const datas = await excelBuffer2json(this._arrayBuffer, 'プロジェクト時系列情報')
        return datas as ProjectStatistics[]
    }
}
