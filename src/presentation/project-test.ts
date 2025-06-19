import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getLogger } from '../logger'
import { ExcelProjectCreator } from '../infrastructure/ExcelProjectCreator'
import { ShowProjectUsecase } from '../usercase/show-project-usecase'

const logger = getLogger('main')

const main = () => {
    const { excelPath, output } = createArgs()

    const creator = new ExcelProjectCreator(excelPath)
    new ShowProjectUsecase(creator).execute().catch((error) => console.error(error))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .option('excelPath', {
            type: 'string',
            description: 'Excel file Path',
            default: './classdata.xlsx',
        })
        .option('output', {
            type: 'string',
            description: 'Output directory',
            default: './output',
        })
        .help()
        .parseSync() // 型付きで取得
    return argv
}

main()
