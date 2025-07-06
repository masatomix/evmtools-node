import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
// import { getLogger } from '../logger'
import { ExcelProjectCreator } from '../infrastructure'
import { AssigneeDiff, ProjectDiff, ProjectService, TaskDiff } from '../domain/ProjectService'
import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { createStyles } from '../common'
import { Project } from '../domain'

// const logger = getLogger('main')

const main = async () => {
    const { excelPath, excelPrevPath } = createArgs()

    const creator = new ExcelProjectCreator(excelPath)
    const nowP = await creator.createProject()

    const prevCreator = new ExcelProjectCreator(excelPrevPath)
    const prevP = await prevCreator.createProject()

    
    const taskDiffs = new ProjectService().calculateTaskDiffs(nowP, prevP)
    // console.table(taskDiffs.filter((row) => row.hasDiff))

    const projectDiffs = new ProjectService().calculateProjectDiffs(taskDiffs)
    // console.table(projectDiffs.filter((row) => row.hasDiff))

    const assigneeDiffs = new ProjectService().calculateAssigneeDiffs(taskDiffs)
    // console.table(assigneeDiffs.filter((row) => row.hasDiff))


    await execute(nowP, prevP, projectDiffs, assigneeDiffs, taskDiffs)
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

async function execute(
    currentProject: Project,
    prevProject: Project,
    projectDiffs: ProjectDiff[],
    assigneeDiffs: AssigneeDiff[],
    taskDiffs: TaskDiff[]
) {
    const path = `${currentProject.name}-diff.xlsx`
    const workbook = await createWorkbook()
    // const dateStrHyphen = dateStr(currentProject.baseDate).replace(/\//g, '-')

    if (projectDiffs) {
        console.log('プロジェクトDiff')
        console.table(projectDiffs.filter((row) => row.hasDiff))
        json2workbook({
            instances: projectDiffs,
            workbook,
            sheetName: `プロジェクトDiff`,
            applyStyles: createStyles(),
        })
    }
    if (assigneeDiffs) {
        console.log('担当Diff')
        console.table(assigneeDiffs.filter((row) => row.hasDiff))
        json2workbook({
            instances: assigneeDiffs,
            workbook,
            sheetName: '担当Diff',
            applyStyles: createStyles(),
        })
    }

    if (taskDiffs) {
        console.log('タスクDiff')
        console.table(taskDiffs.filter((row) => row.hasDiff))
        json2workbook({
            instances: taskDiffs,
            workbook,
            sheetName: `タスクDiff`,
            applyStyles: createStyles(),
        })
    }

    workbook.deleteSheet('Sheet1')
    await toFileAsync(workbook, path)
}
