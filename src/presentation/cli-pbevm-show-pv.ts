#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ExcelProjectCreator } from '../infrastructure'
import { PbevmShowPvUsecase } from '../usecase/pbevm-show-pv-usecase'
import { dateStr } from '../common'
import { getLogger } from '../logger'

const logger = getLogger('main')

const main = () => {
    const { path, fromDate, toDate, assignee } = createArgs()

    const fromDateD = new Date(`${fromDate}T00:00:00+0900`)
    const toDateD = toDate ? new Date(`${toDate}T00:00:00+0900`) : fromDateD

    logger.info(`path: ${path}`)
    logger.info(`from: ${dateStr(fromDateD)}`)
    logger.info(`to: ${dateStr(toDateD)}`)
    logger.info(`assignee: ${assignee}`)

    const creator = new ExcelProjectCreator(path)
    new PbevmShowPvUsecase(creator)
        .execute(fromDateD, toDateD, assignee)
        .catch((error) => console.error(error))
}

const createArgs = () => {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: npx pbevm-show-pv [options]')
        .example(
            `npx pbevm-show-pv --path now.xlsm --fromDate 2025-07-07 --toDate 2025-07-11 \
 --assignee '要員A'`,
            ''
        )
        .option('path', {
            type: 'string',
            description: 'Excel file Path',
            default: './now.xlsm',
        })
        .option('fromDate', {
            type: 'string',
            description: 'From Date',
            default: '2025-07-01',
        })
        .option('toDate', {
            type: 'string',
            description: 'To Date',
        })
        .option('assignee', {
            type: 'string',
            description: 'Assignee',
        })
        .help()
        .parseSync() // 型付きで取得
    return argv
}

main()
