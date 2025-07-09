import { ProjectCreator } from '../domain/ProjectCreator'
import { getLogger } from '../logger'
import { ProjectRepository } from '../domain/ProjectRepository'

// ProjectCreatorを使ったサンプル。プロジェクトを生成してSaveしている
// Projectがもつ属性をExcelに出力している。
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
