import { ProjectStatistics, AssigneeStatistics } from './Project'

export interface ProjectRepository {
    writeProjectInfo: (data: {
        statisticsByProject?: ProjectStatistics[]
        statisticsByName?: AssigneeStatistics[]
        pvByProject?: Record<string, unknown>[]
        pvsByProject?: Record<string, unknown>[]
        pvByName?: Record<string, unknown>[]
        pvsByName?: Record<string, unknown>[]
        projectData?: Record<string, unknown>[]
        baseDate: Date
        path: string // コレジャマ、、。
    }) => Promise<void>
}
