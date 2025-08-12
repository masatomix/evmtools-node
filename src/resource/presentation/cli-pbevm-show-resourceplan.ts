// import yargs from 'yargs'
// import { hideBin } from 'yargs/helpers'
import { PbevmShowResourcePlanUsecase } from '../usecase/pbevm-show-resourceplan-usecase'

// const logger = getLogger('main')

const main = () => {
    // const { path } = createArgs()
    new PbevmShowResourcePlanUsecase().execute().catch((error) => console.error(error))
}

// const createArgs = () => {
//     const argv = yargs(hideBin(process.argv))
//         .usage('Usage: npx pbevm-show-project [options]')
//         .example('npx pbevm-show-project --path ./now.xlsm', '')
//         .option('path', {
//             type: 'string',
//             description: 'Excel file Path',
//             default: './now.xlsm',
//         })
//         // .option('output', {
//         //     type: 'string',
//         //     description: 'Output directory',
//         //     default: './output',
//         // })
//         .help()
//         .parseSync() // 型付きで取得
//     return argv
// }

main()
