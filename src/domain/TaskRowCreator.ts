import { TaskRow } from './TaskRow'

/**
 * TaskRowを何らかの方法で生成する
 * Excelから、Mockから、Webから、など。。
 * parentIdや、isLeafなどもセットすること
 *
 */
export interface TaskRowCreator {
    createRowData(): Promise<TaskRow[]>
}
