import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import { getLogger } from '../logger'
import { ExcelProjectCreator } from '../infrastructure/ExcelProjectCreator'
import { PbevmShowProjectUsecase } from '../usercase/pbevm-show-project-usecase'
import { ProjectRepositoryImpl } from '../infrastructure/ProjectRepositoryImpl'

// const logger = getLogger('main')

const main = () => {
    const { path } = createArgs()

    const creator = new ExcelProjectCreator(path)
    const repository = new ProjectRepositoryImpl()
    new PbevmShowProjectUsecase(creator, repository)
        .execute()
        .catch((error) => console.error(error))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
    .usage('Usage: npx pbevm-show-project [options]')
    .example('npx pbevm-show-project --path ./now.xlsm', '')
        .option('path', {
            type: 'string',
            description: 'Excel file Path',
            default: './now.xlsm',
        })
        // .option('output', {
        //     type: 'string',
        //     description: 'Output directory',
        //     default: './output',
        // })
        .help()
        .parseSync() // 型付きで取得
    return argv
}

main()
