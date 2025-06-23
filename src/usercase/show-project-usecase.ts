import { ProjectCreator } from '../domain/ProjectCreator'
import { getLogger } from '../logger'
import { ProjectRepository } from '../domain/ProjectRepository'

export class ShowProjectUsecase {
    private logger = getLogger('ShowProjectUsecase')

    constructor(
        private _creator: ProjectCreator,
        private _repository: ProjectRepository
    ) {}

    async execute() {
        const project = await this._creator.createProject()
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
        this._repository.writeProjectInfo({
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
}
