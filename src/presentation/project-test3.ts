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

    const projectDiffs = new ProjectService().calculateProjectDiffs(nowP, prevP)
    console.table(projectDiffs.filter((row) => row.hasDiff))

    const assigneeDiffs = new ProjectService().calculateAssigneeDiffs(nowP, prevP)
    console.table(assigneeDiffs.filter((row) => row.hasDiff))

    const taskDiffs = new ProjectService().calculateTaskDiffs(nowP, prevP)
    console.table(taskDiffs.filter((row) => row.hasDiff))
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
