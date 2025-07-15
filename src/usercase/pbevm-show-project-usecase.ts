import { ProjectCreator } from '../domain/ProjectCreator'
import { getLogger } from '../logger'
import { ProjectRepository } from '../domain/ProjectRepository'
// import { isHoliday } from '../common'

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

        // const holidayDatas = project.holidayDatas
        // console.table(holidayDatas)

        // console.log(isHoliday(new Date('2025-01-01')))
        await this._repository.save(project)
    }
}
