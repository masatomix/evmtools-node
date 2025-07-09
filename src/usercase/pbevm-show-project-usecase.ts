import { ProjectCreator } from '../domain/ProjectCreator'
import { getLogger } from '../logger'
import { ProjectRepository } from '../domain/ProjectRepository'

export class PbevmShowProjectUsecase {
    private logger = getLogger('ShowProjectUsecase')

    constructor(
        private _creator: ProjectCreator,
        private _repository: ProjectRepository
    ) {}

    async execute() {
        const project = await this._creator.createProject()
        await this._repository.save(project)
    }
}
