import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import { getLogger } from '../logger'
import { dateFromSn, excel2json2, excelBuffer2json } from 'excel-csv-read-write'
import { ProjectProgressCreator } from '../domain/ProjectProgressCreator'
import { ExcelProjectCreator } from '../infrastructure'
import { isValidNumber } from '../domain'
import { dateStr } from '../common'

// const logger = getLogger('main')

export class ProjectProgress {
    constructor(
        private _date: Date,
        private _pv?: number,
        private _ev?: number
    ) {}
    get spi(): number | undefined {
        const { _pv, _ev } = this
        return isValidNumber(_pv) && isValidNumber(_ev) && _pv !== 0 ? _ev / _pv : undefined
    }
    get date() {
        return this._date
    }
    get pv() {
        return this._pv
    }
    get ev() {
        return this._ev
    }
}

export class ProjectProgressBufferCreatorImpl implements ProjectProgressCreator {
    constructor(private _buffer: ArrayBuffer) {}

    async createProjectProgress(): Promise<ProjectProgress[]> {
        const rawDatas = (await excelBuffer2json(this._buffer, 'EVM記録')) as Record<string, any>[]

        return toProjectProgress(rawDatas)
    }
}

export class ProjectProgressCreatorImpl implements ProjectProgressCreator {
    constructor(private _excelPath: string) {}

    async createProjectProgress(): Promise<ProjectProgress[]> {
        const rawDatas = (await excel2json2({
            filePath: this._excelPath,
            sheetName: 'EVM記録',
        })) as Record<string, any>[]
        // console.table(rawDatas)

        return toProjectProgress(rawDatas)
    }
}

const toProjectProgress = (rawDatas: Record<string, any>[]): ProjectProgress[] => {
    return rawDatas
        .filter((rawData) => rawData['PV'] !== undefined || rawData['EV'] !== undefined)
        .map((rawData) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return new ProjectProgress(dateFromSn(rawData['日付']), rawData['PV'], rawData['EV'])
        })
}

const main = async () => {
    const { excelProjectPath, excelProgressPath } = createArgs()

    const projectProgressCreator = new ProjectProgressCreatorImpl(excelProgressPath)
    const datas = await projectProgressCreator.createProjectProgress()

    printTable(datas)

    const creator = new ExcelProjectCreator(excelProjectPath)
    const project = await creator.createProject()

    const stats = project.statisticsByProject
    console.table(stats)
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .option('excelProgressPath', {
            type: 'string',
            description: 'Excel file Path',
            default: './classdata.xlsx',
        })
        .option('excelProjectPath', {
            type: 'string',
            description: 'Excel file Path',
            default: './classdata.xlsx',
        })

        .help()
        .parseSync() // 型付きで取得
    return argv
}

main()

function printTable(datas: ProjectProgress[]) {
    const dispDatas = datas.map((data) => {
        return {
            date: dateStr(data.date),
            pv: data.pv,
            ev: data.ev,
            spi: data.spi,
        }
    })
    console.table(dispDatas)
}
