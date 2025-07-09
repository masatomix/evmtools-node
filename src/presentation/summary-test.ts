#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import { getLogger } from '../logger'
import { TaskRowCreator } from '../domain/TaskRowCreator'
import { ExcelTaskRowCreator } from '../infrastructure/ExcelTaskRowCreator'

import { ShowSummaryUsecase } from '../usercase/show-summary-usecase'
// const logger = getLogger('main')

const main = () => {
    const { excelPath } = createArgs()

    const reader: TaskRowCreator = new ExcelTaskRowCreator(excelPath)
    new ShowSummaryUsecase(reader).execute().catch((error) => console.error(error))
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
