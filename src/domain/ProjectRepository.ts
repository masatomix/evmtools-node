import { Project } from './Project'

export interface ProjectRepository {
    save(project: Project): void

    // writeProjectInfo: (data: {
    //     statisticsByProject?: ProjectStatistics[]
    //     statisticsByName?: AssigneeStatistics[]
    //     pvByProject?: Record<string, unknown>[]
    //     pvsByProject?: Record<string, unknown>[]
    //     pvByName?: Record<string, unknown>[]
    //     pvsByName?: Record<string, unknown>[]
    //     projectData?: Record<string, unknown>[]
    //     baseDate: Date
    //     path: string // コレジャマ、、。
    // }) => Promise<void>
}
