#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import { getLogger } from '../logger'
import { TaskRowCreator } from '../domain/TaskRowCreator'
import { ExcelTaskRowCreator } from '../infrastructure/ExcelTaskRowCreator'
import { PbevmSummaryUsecase } from '../usecase/pbevm-summary-usercase'

// const logger = getLogger('main')

// TaskRowCreator を使ったサンプル。また tidy をつかって集計などをテストしてる
const main = () => {
    const { path } = createArgs()

    const reader: TaskRowCreator = new ExcelTaskRowCreator(path)
    new PbevmSummaryUsecase(reader).execute().catch((error) => console.error(error))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .option('path', {
            type: 'string',
            description: 'Excel file Path',
            default: './now.xlsm',
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
