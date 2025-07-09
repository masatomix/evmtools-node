import { Project } from './Project'
/**
 * Projectを生成するインタフェース
 */
export interface ProjectCreator {
    createProject(): Promise<Project>
}
