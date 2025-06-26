import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import { getLogger } from '../logger'
import { ExcelProjectCreator } from '../infrastructure'
import { ProjectService } from '../domain/ProjectService'

// const logger = getLogger('main')

const main = async () => {
    const { excelPath, excelPrevPath } = createArgs()

    const creator = new ExcelProjectCreator(excelPath)
    const nowP = await creator.createProject()

    const prevCreator = new ExcelProjectCreator(excelPrevPath)
    const prevP = await prevCreator.createProject()

    const result = new ProjectService().calculateProjectDiffs(nowP, prevP)
    console.table(result.filter(row=> row.hasDiff))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .option('excelPath', {
            type: 'string',
            description: 'Excel file Path',
            default: './classdata.xlsx',
        })
        .option('excelPrevPath', {
            type: 'string',
            description: 'Excel file Path',
            default: './classdata.xlsx',
        })

        .help()
        .parseSync() // 型付きで取得
    return argv
}

main()
