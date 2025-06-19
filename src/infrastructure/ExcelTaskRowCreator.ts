import { excel2json2 } from 'excel-csv-read-write'
import { TaskRowCreator } from '../domain/TaskRowCreator'
import { TaskRow } from '../domain/TaskRow'
import { TaskRowCreatorImpl } from './TaskRowCreatorImpl'

export class ExcelTaskRowCreator implements TaskRowCreator {
    constructor(private _excelPath: string) {}

    async createRowData(): Promise<TaskRow[]> {
        const mappings = await excel2json2({
            filePath: this._excelPath,
            sheetName: 'ガントチャート',
            option: {
                startIndex: 1,
                useHeader: false,
            },
        })
        const taskRowCreator = new TaskRowCreatorImpl(mappings)
        return taskRowCreator.createRowData()
    }
}
