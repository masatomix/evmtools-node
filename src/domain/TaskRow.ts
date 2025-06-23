import { date2Sn, dateFromSn } from 'excel-csv-read-write'
import { getLogger } from '../logger'
import { dateStr } from '../common'
import { TaskNode } from './TaskNode'

const logger = getLogger('domain/TaskRow')
/**
 * タスクを表す基本エンティティ（リーフまたは中間ノード）
 */
export class TaskRow {
    constructor(
        /**
         * 表示順や構造上の識別に使われる行番号（"#"に対応）
         */
        public readonly sharp: number,

        /**
         * タスクの一意なID
         */
        public readonly id: number,

        /**
         * タスクの階層レベル（1=ルート、2=子など）
         */
        public readonly level: number,

        /**
         * タスクの名称
         */
        public readonly name: string,

        /**
         * 担当者名（任意）
         */
        public readonly assignee?: string,

        /**
         * 予定工数（日単位など、任意）
         */
        public readonly workload?: number,

        /**
         * 予定の開始日（任意）
         */
        public readonly startDate?: Date,

        /**
         * 予定の終了日（任意）
         */
        public readonly endDate?: Date,

        // /**
        //  * 現時点での進捗率（任意、%値）
        //  */
        // public readonly progress?: number

        // --- 実績系 ---

        /**
         * 実際の開始日（任意）
         */
        public readonly actualStartDate?: Date,

        /**
         * 実際の終了日（任意）
         */
        public readonly actualEndDate?: Date,

        /**
         * 実績ベースの進捗率（任意）
         */
        public readonly progressRate?: number,

        /**
         * 予定された稼働日数（任意）
         */
        public readonly scheduledWorkDays?: number,

        /**
         * Planned Value：計画された作業価値（任意）
         */
        public readonly pv?: number,

        /**
         * Earned Value：実施された作業価値（任意）
         */
        public readonly ev?: number,

        /**
         * Schedule Performance Index：スケジュール効率指標（任意）
         */
        public readonly spi?: number,

        /**
         * 現在の進捗率に相当する予定日（任意）
         */
        public readonly expectedProgressDate?: Date,

        /**
         * 遅延日数（任意、マイナスで前倒し）
         */
        public readonly delayDays?: number,

        /**
         * 備考（任意）
         */
        public readonly remarks?: string,

        /**
         * 親タスクのID（任意、ツリー構造用）
         */
        public parentId?: number,

        /**
         * 子を持たないリーフノードであるかどうか（任意）
         * (便宜上任意だけど、セットすること)
         */
        public readonly isLeaf?: boolean,

        public readonly plotMap?: Map<number, boolean>
    ) {}

    /**
     * 予定工数 / 稼働予定日数 による一日あたりの工数（任意）
     * 計算不能な場合は undefined
     */
    get workloadPerDay(): number | undefined {
        const { workload, scheduledWorkDays } = this
        const { id, name } = this
        const isValidNumber = (value: unknown): value is number =>
            typeof value === 'number' && !Number.isNaN(value)

        if (
            isValidNumber(workload) &&
            isValidNumber(scheduledWorkDays) &&
            scheduledWorkDays !== 0
        ) {
            return workload / scheduledWorkDays
        }
        logger.warn(
            `タスクID:${id} 日数エラー(0/空)。稼動予定日数:[${scheduledWorkDays}],予定工数:[${workload}]. タスク名: ${name}`
        )

        return undefined
    }

    /**
     * 基準日(その日のみの)のPVを計算する。
     * 基本、稼働予定の日数 / 予定工数 の値。
     * その日に タスクがなければ0。
     * なんらかの理由で、稼働予定日数がNaN/undefined/ゼロの場合、undefinedを返す。
     * なんらかの理由で、予定工数がNaN/undefinedの場合、undefinedを返す。
     *
     * @param baseDate 基準日
     * @return
     */
    calculatePV = (baseDate: Date): number | undefined => {
        if (!this.checkStartEndDateAndPlotMap()) {
            return undefined
        }

        const {
            // scheduledWorkDays, // 稼働予定の日数を取得 N (calculatePVsにあわせるなら、ココホントはplotMapの数にすべきか)
            // workload, // 予定工数を取得 M
            startDate,
            endDate,
            plotMap,
        } = this

        const workloadPerDay = this.workloadPerDay
        if (workloadPerDay === undefined) {
            return undefined
        }

        // レンジ外なら0
        if (!isInRange(baseDate, startDate, endDate, plotMap)) {
            return 0.0
        }

        return workloadPerDay
    }

    /**
     * 基準日終了時点の累積PVを返す。タスクが始まっていなかったら0.
     * なんらかの理由で、予定工数がNaN/undefinedの場合、undefinedを返す。
     * なんらかの理由で、稼働予定日数がNaN/undefined/ゼロの場合、undefinedを返す。
     * plotMapからカウントしている。(Excelから読む際は稼働予定日数より□のプロット優先となるってこと)
     * plotMapが取れなかったらゼロ
     * 開始日終了日が取れなかったらゼロ
     *
     * @param baseDate
     * @return
     */
    calculatePVs = (baseDate: Date): number => {
        if (!this.checkStartEndDateAndPlotMap()) {
            return 0.0
        }

        let pvs = 0
        const baseSerial = date2Sn(baseDate)
        // plotMapのキー値(ExcelのDateのシリアル値)
        // 指定した基準日「まで(含む)」のpv値は足す。
        // ホントは土日を除去しないと、親タスクの計算はバグってしまう
        // (土日もプロットされているため。かつ、稼働予定日数も間違っている)
        for (const [serial, value] of this.plotMap.entries()) {
            if (serial <= baseSerial) {
                const pv = this.calculatePV(dateFromSn(serial))
                pvs += pv ?? 0.0
            }
        }
        return pvs
    }

    checkStartEndDateAndPlotMap = (): this is NonNullDateAndPlotMap => {
        const { startDate, endDate, plotMap, id, name } = this
        if (!startDate || !endDate) {
            logger.warn(
                `タスクID:${id} 日付エラー。開始日:[${dateStr(startDate)}],終了日:[${dateStr(endDate)}]が取得できず.タスク名: ${name}`
            )
            return false
        }

        if (!plotMap) {
            logger.warn(`タスクID:${id} plotMapエラー(undefined)`)
            return false
        }
        return true
    }

    /**
     * TaskNode から、TaskRowを作る
     * @param node 
     * @param level 
     * @param parentId 
     * @returns 
     */
    static fromNode(node: TaskNode, level: number, parentId?: number): TaskRow {
        return new TaskRow(
            node.sharp,
            node.id,
            level,
            node.name,
            node.assignee,
            node.workload,
            node.startDate,
            node.endDate,
            node.actualStartDate,
            node.actualEndDate,
            node.progressRate,
            node.scheduledWorkDays,
            node.pv,
            node.ev,
            node.spi,
            node.expectedProgressDate,
            node.delayDays,
            node.remarks,
            parentId,
            node.isLeaf,
            node.plotMap
        )
    }
}

/**
 * baseDateがレンジにあるかどうか
 * @param baseDate
 * @param startDate
 * @param endDate
 * @returns
 */
function isInRange(
    baseDate: Date,
    startDate: Date,
    endDate: Date,
    plotMap: Map<number, boolean>
): boolean {
    const baseSerial = date2Sn(baseDate)
    const startSerial = date2Sn(startDate)
    const endSerial = date2Sn(endDate)
    return plotMap.get(baseSerial) === true && startSerial <= baseSerial && baseSerial <= endSerial
    // return startDate <= baseDate && baseDate <= endDate
}

type NonNullDateAndPlotMap = {
    startDate: Date
    endDate: Date
    plotMap: Map<number, boolean>
    // id: number
}

// const baseDates = [
//     new Date('2025-06-09T00:00:00+09:00'),
//     new Date('2025-06-10T00:00:00+09:00'),
//     new Date('2025-06-11T00:00:00+09:00'),
//     new Date('2025-06-12T00:00:00+09:00'),
//     new Date('2025-06-13T00:00:00+09:00'),
// ]
// const startDate = new Date('2025-06-08T15:00:00.000Z')
// const endDate = new Date('2025-06-12T15:00:00.000Z')

// for (const baseDate of baseDates) {
//     const result = getElapsedDays(baseDate, startDate, endDate)
//     console.log(result) // => 11（日数：10日差 + 1）
// }
