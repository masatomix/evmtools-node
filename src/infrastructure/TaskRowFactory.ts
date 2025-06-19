import { TaskRow } from '../domain/TaskRow'
import { TaskRow as TaskRowDto } from '../infrastructure/types' // DTOタイプ定義（元の type TaskRow）

export class TaskRowFactory {
    static fromDto(dto: TaskRowDto): TaskRow {
        return new TaskRow(
            dto.sharp,
            dto.id,
            dto.level,
            dto.name,
            dto.assignee,
            dto.workload,
            dto.startDate,
            dto.endDate,
            // dto.progress,
            dto.actualStartDate,
            dto.actualEndDate,
            dto.progressRate,
            dto.scheduledWorkDays,
            dto.pv,
            dto.ev,
            dto.spi,
            dto.expectedProgressDate,
            dto.delayDays,
            dto.remarks,
            dto.parentId,
            dto.isLeaf,
            dto.plotMap
        )
    }

    static toDto(entity: TaskRow): TaskRowDto {
        return {
            sharp: entity.sharp,
            id: entity.id,
            level: entity.level,
            name: entity.name,
            assignee: entity.assignee,
            workload: entity.workload,
            startDate: entity.startDate,
            endDate: entity.endDate,
            // progress: entity.progress,

            actualStartDate: entity.actualStartDate,
            actualEndDate: entity.actualEndDate,
            progressRate: entity.progressRate,
            scheduledWorkDays: entity.scheduledWorkDays,
            pv: entity.pv,
            ev: entity.ev,
            spi: entity.spi,
            expectedProgressDate: entity.expectedProgressDate,
            delayDays: entity.delayDays,
            remarks: entity.remarks,
            parentId: entity.parentId,
            isLeaf: entity.isLeaf,
            plotMap: entity.plotMap,
        }
    }

    static fromDtos(dtos: TaskRowDto[]): TaskRow[] {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        return dtos.map(this.fromDto)
    }

    static toDtos(entities: TaskRow[]): TaskRowDto[] {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        return entities.map(this.toDto)
    }
}
