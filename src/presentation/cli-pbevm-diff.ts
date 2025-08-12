import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import { getLogger } from '../logger'
import { ExcelProjectCreator } from '../infrastructure'
import { PbevmDiffUsercase } from '../usecase/pbevm-diff-usercase'
import { ProjectService } from '../domain'

// const logger = getLogger('main')

const main = () => {
    const { path, prevPath } = createArgs()

    const creator = new ExcelProjectCreator(path)
    const prevCreator = new ExcelProjectCreator(prevPath)
    const service = new ProjectService()

    new PbevmDiffUsercase(creator, prevCreator, service)
        .execute()
        .catch((error) => console.error(error))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: npx pbevm-diff [options]')
        .example('npx pbevm-diff --path now.xlsm --prevPath prev.xlsm', '')
        .option('path', {
            type: 'string',
            description: 'Excel file Path',
            default: './now.xlsm',
        })
        .option('prevPath', {
            type: 'string',
            description: 'Excel file Path',
            default: './prev.xlsm',
        })
        .help()
        .parseSync() // 型付きで取得
    return argv
}

main()
