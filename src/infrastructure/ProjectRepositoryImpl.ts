import { createWorkbook, json2workbook, toFileAsync } from 'excel-csv-read-write'
import { dateStr } from '../common'
import { createStyles } from '../common/styles'
import { ProjectStatistics, AssigneeStatistics, Project } from '../domain'
import { ProjectRepository } from '../domain/ProjectRepository'

export class ProjectRepositoryImpl implements ProjectRepository {
    save(project: Project): void {
        const projectData = project.printAndGetRawData(20)

        const baseDate = project.baseDate
        const projectName = project.name

        // const from = project.startDate
        // const to = project.endDate
        // if (!(from && to)) {
        //     throw new Error('fromかtoが取得できませんでした')
        // }

        const statisticsByProject = project.statisticsByProject
        const statisticsByName = project.statisticsByName

        const pvByProject = project.pvByProject
        const pvsByProject = project.pvsByProject
        const pvByName = project.pvByName
        const pvsByName = project.pvsByName
        const path = `${projectName}-summary.xlsx`

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.writeProjectInfo({
            statisticsByProject,
            statisticsByName,
            pvByProject,
            pvsByProject,
            pvByName,
            pvsByName,
            projectData,
            baseDate,
            path,
        })
    }

    writeProjectInfo: (data: {
        statisticsByProject?: ProjectStatistics[]
        statisticsByName?: AssigneeStatistics[]
        pvByProject?: Record<string, unknown>[]
        pvsByProject?: Record<string, unknown>[]
        pvByName?: Record<string, unknown>[]
        pvsByName?: Record<string, unknown>[]
        projectData?: Record<string, unknown>[]
        baseDate: Date
        path: string
    }) => Promise<void> = async ({
        statisticsByProject,
        statisticsByName,
        pvByProject,
        pvsByProject,
        pvByName,
        pvsByName,
        projectData,
        baseDate,
        path,
    }) => {
        const workbook = await createWorkbook()

        const dateStrHyphen = dateStr(baseDate).replace(/\//g, '-')

        if (statisticsByProject) {
            console.log('プロジェクト情報')
            console.table(statisticsByProject)
            json2workbook({
                instances: statisticsByProject,
                workbook,
                sheetName: `プロジェクト情報`,
                applyStyles: createStyles(),
            })
        }
        if (statisticsByName) {
            console.log('要員ごと統計')
            console.table(statisticsByName)
            json2workbook({
                instances: statisticsByName,
                workbook,
                sheetName: '要員ごと統計',
                applyStyles: createStyles(),
            })
        }

        if (pvByProject) {
            json2workbook({
                instances: pvByProject,
                workbook,
                sheetName: `プロジェクト日ごとPV`,
                applyStyles: createStyles(),
            })
        }
        if (pvsByProject) {
            json2workbook({
                instances: pvsByProject,
                workbook,
                sheetName: `プロジェクト日ごと累積PV`,
                applyStyles: createStyles(),
            })
        }

        if (pvByName) {
            json2workbook({
                instances: pvByName,
                workbook,
                sheetName: `要員ごと・日ごとPV`,
                applyStyles: createStyles(),
            })
        }
        if (pvsByName) {
            json2workbook({
                instances: pvsByName,
                workbook,
                sheetName: `要員ごと・日ごと累積PV`,
                applyStyles: createStyles(),
            })
        }

        if (projectData) {
            json2workbook({
                instances: projectData,
                workbook,
                sheetName: `素データ_${dateStrHyphen}`,
                applyStyles: createStyles(),
            })
        }
        workbook.deleteSheet('Sheet1')
        await toFileAsync(workbook, path)
    }
}
