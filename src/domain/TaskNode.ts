import { TaskRow } from './TaskRow'

export class TaskNode extends TaskRow implements Iterable<TaskNode> {
    constructor(
        public sharp: number,
        public id: number,
        public level: number,
        public name: string,
        public assignee?: string,
        public workload?: number,
        public startDate?: Date,
        public endDate?: Date,
        // public progress?: number,
        public actualStartDate?: Date,
        public actualEndDate?: Date,
        public progressRate?: number,
        public scheduledWorkDays?: number,
        public pv?: number,
        public ev?: number,
        public spi?: number,
        public expectedProgressDate?: Date,
        public delayDays?: number,
        public remarks?: string,
        public parentId?: number,
        public isLeaf?: boolean,
        public children: TaskNode[] = []
    ) {
        super(
            sharp,
            id,
            level,
            name,
            assignee,
            workload,
            startDate,
            endDate,
            // progress,
            actualStartDate,
            actualEndDate,
            progressRate,
            scheduledWorkDays,
            pv,
            ev,
            spi,
            expectedProgressDate,
            delayDays,
            remarks,
            parentId,
            isLeaf
        )
    }

    /**
     * Iterableであるための関数。子があれば子を返す。
     */
    *[Symbol.iterator](): IterableIterator<TaskNode> {
        yield this
        for (const child of this.children) {
            yield* child
        }
    }

    // addChild(child: TaskNode) {
    //     this.children.push(child)
    // }

    // // 例：全ての子孫の数を数える
    // countDescendants(): number {
    //     return this.children.reduce((sum, child) => sum + 1 + child.countDescendants(), 0)
    // }
}
