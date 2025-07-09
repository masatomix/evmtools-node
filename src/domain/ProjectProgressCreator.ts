import { ProjectProgress } from '../presentation/project-test2'

export interface ProjectProgressCreator {
    createProjectProgress(): Promise<ProjectProgress[]>
}
