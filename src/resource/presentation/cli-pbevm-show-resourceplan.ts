import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { PbevmShowResourcePlanUsecase } from '../usecase/pbevm-show-resourceplan-usecase'

// const logger = getLogger('main')

const main = () => {
    const { path, output } = createArgs()
    new PbevmShowResourcePlanUsecase(path, output).execute().catch((error) => console.error(error))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: npx pbevm-show-resourceplan [options]')
        .example('npx pbevm-show-resourceplan --path ./要員計画202009.xlsx --output ./output', '')
        .option('path', {
            type: 'string',
            description: 'Excel file Path',
            default: './要員計画202009.xlsx',
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
