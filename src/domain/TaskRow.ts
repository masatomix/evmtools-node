import { date2Sn, dateFromSn } from 'excel-csv-read-write'
import { getLogger } from '../logger'
import { calcRate, dateStr, isValidNumber, subtract } from '../common'
import { TaskNode } from './TaskNode'

/**
 * 進捗率の完了判定に用いる許容誤差。
 * 浮動小数点誤差（例: 0.9999999...）でも完了として扱えるようにする。
 */
export const PROGRESS_RATE_EPSILON = 1e-9

/**
 * Date を「日単位の Excel シリアル値（整数）」に変換する。
 * date2Sn はローカル時刻ベースで、時刻成分がシリアル値の小数部になるため
 * （例: JST 9:00 → .375）、floor して日単位に正規化する。
 * 日付比較では date2Sn の直呼びではなく必ずこのラッパを経由すること。
 */
const toDaySerial = (date: Date): number => Math.floor(date2Sn(date))

/**
 * plotMap のキー（シリアル値）も時刻成分の小数部を持ち得るため、
 * 日単位（整数）に正規化して返す。
 */
const toDaySerialFromKey = (serial: number): number => Math.floor(serial)

/**
 * 指定した日シリアル値の日に plotMap のプロットがあるか（日単位で突合）
 */
const hasPlotOnDay = (plotMap: Map<number, boolean>, daySerial: number): boolean => {
    // 整数キー（Excel由来の通常ケース）の高速パス
    if (plotMap.get(daySerial) === true) return true
    // 小数部付きキー（時刻成分を持つ Date から生成されたケース）のフォールバック
    for (const [serial, value] of plotMap.entries()) {
        if (value === true && toDaySerialFromKey(serial) === daySerial) return true
    }
    return false
}

/**
 * タスクを表す基本エンティティ（リーフまたは中間ノード）
 */
export class TaskRow {
    private logger = getLogger('domain/TaskRow')
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
     * フルパス名（親名を "/" で連結した名称）のキャッシュ（#153）。
     * readonly なコンストラクタ引数とは別の可変クラスフィールド。
     * 書き込みは Project.getFullTaskName() からのみ行う想定。
     */
    private _fullName?: string

    /**
     * キャッシュ済みのフルパス名を返す。未キャッシュなら undefined。
     * @see docs/specs/domain/master/TaskRow.spec.md（phase1-minor-issues-0.0.30 要件3）
     */
    get fullName(): string | undefined {
        return this._fullName
    }

    /**
     * フルパス名をキャッシュに格納する。
     * @param fullName 親名を "/" で連結したフルパス名
     */
    setFullName(fullName: string): void {
        this._fullName = fullName
    }

    /**
     * 予定工数 / 稼働予定日数 による一日あたりの工数（任意）
     * 計算不能な場合は undefined
     */
    get workloadPerDay(): number | undefined {
        const { workload, scheduledWorkDays } = this
        const { id, name } = this

        if (
            isValidNumber(workload) &&
            isValidNumber(scheduledWorkDays) &&
            scheduledWorkDays !== 0
        ) {
            return workload / scheduledWorkDays
        }
        this.logger.warn(
            `タスクID:${id} 日数エラー(0/空)。稼動予定日数:[${scheduledWorkDays}],予定工数:[${workload}]. タスク名: ${name}`
        )

        return undefined
    }

    /**
     * 進捗率が100%（許容誤差 PROGRESS_RATE_EPSILON 込み）以上ならtrueそれ以外はfalse。
     * 1.0を超える値（入力誤り等）も完了として扱う。
     */
    get finished(): boolean {
        return this.progressRate !== undefined && this.progressRate >= 1.0 - PROGRESS_RATE_EPSILON
    }

    /**
     * 指定した基準日で、タスクが期限切れかどうかを判定する。
     * - 終了日 <= 基準日 かつ 未完了 の場合に true を返す
     * (あくまで基準日の業務が終わったときの状況を算出する考えなので、等号を入れた)
     * progressRate はundefinedの場合もある(未完了と見なす)
     * 完了判定は finished と対称（同じ許容誤差を使用）
     */
    isOverdueAt(baseDate: Date): boolean {
        if (!this.endDate) return false

        return !this.finished && this.endDate <= baseDate
    }

    get validStatus(): ValidStatus {
        let invalidReason: string | undefined = undefined

        const { id, name } = this

        // checkStartEndDateAndPlotMap のチェック
        const { startDate, endDate, plotMap } = this
        if (!startDate || !endDate) {
            invalidReason = `タスクID:${id} 日付エラー。開始日:[${dateStr(startDate)}],終了日:[${dateStr(endDate)}]が取得できず.タスク名: ${name}`
            return { isValid: false, invalidReason }
        }
        if (!plotMap) {
            invalidReason = `タスクID:${id} plotMapエラー(undefined)`
            return { isValid: false, invalidReason }
        }
        // checkStartEndDateAndPlotMap のチェック

        // workloadPerDay のチェック
        const { workload, scheduledWorkDays } = this

        if (
            isValidNumber(workload) &&
            isValidNumber(scheduledWorkDays) &&
            scheduledWorkDays !== 0
        ) {
            return { isValid: true }
        }
        invalidReason = `タスクID:${id} 日数エラー(0/空)。稼動予定日数:[${scheduledWorkDays}],予定工数:[${workload}]. タスク名: ${name}`
        return { isValid: false, invalidReason }
        // workloadPerDay のチェック
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

        const { startDate, endDate, plotMap } = this

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
     * plotMapからカウントしている。(Excelから読む際は稼働予定日数より□のプロット優先となるってこと)
     * plotMapが取れなかったらゼロ
     * 開始日終了日が取れなかったらゼロ
     *
     * 親タスク（isLeaf === false）のplotMapには土日もプロットされているため、
     * 親タスクに限り土日のserialを累積から除外する。
     * リーフタスクは plotMap のプロットをそのまま尊重する（週末稼働を意図的に
     * プロットしたリーフの PV を取りこぼさないため、除外しない）。
     * プロジェクト固有の祝日は isHolidayFn を注入した場合のみ除外する
     * （注入経路は現状未接続。Project 側から this.isHoliday を渡す想定の将来拡張点）。
     *
     * @param baseDate
     * @param isHolidayFn 祝日判定関数（任意）。Project.isHoliday を渡すことを想定
     * @return
     */
    calculatePVs = (baseDate: Date, isHolidayFn?: (date: Date) => boolean): number => {
        if (!this.checkStartEndDateAndPlotMap()) {
            return 0.0
        }

        // 土日除外は親タスク限定（リーフの週末プロットは意図された稼働として尊重する）
        const isParent = this.isLeaf === false

        let pvs = 0
        const baseSerial = toDaySerial(baseDate)
        // plotMapのキー値(ExcelのDateのシリアル値)
        // 指定した基準日「まで(含む)」のpv値は足す。
        for (const [serial /*value*/] of this.plotMap.entries()) {
            const daySerial = toDaySerialFromKey(serial)
            if (daySerial > baseSerial) continue

            const date = dateFromSn(daySerial)
            if (isParent) {
                const day = date.getDay() // 0: 日, 6: 土
                if (day === 0 || day === 6) continue // 親タスクの土日混入を除外
                if (isHolidayFn?.(date)) continue // 注入時のみ祝日も除外
            }

            const pv = this.calculatePV(date)
            pvs += pv ?? 0.0
        }
        return pvs
    }

    /**
     * Schedule Performance Index (SPI = EV/PV)
     * baseDateを元に導出した累積PVを用いて計算した、SPI
     * @param baseDate
     * @returns
     */
    calculateSPI = (baseDate: Date): number | undefined => {
        const pvs = this.calculatePVs(baseDate)
        return calcRate(this.ev, pvs)
    }

    /**
     * Schedule Variance (SV = EV-PV)を返す
     * baseDateを元に導出した累積PVを用いて計算した、EV-PV
     * @param baseDate
     * @returns
     */
    calculateSV = (baseDate: Date): number | undefined => {
        const pvs = this.calculatePVs(baseDate)
        return subtract(this.ev, pvs)
    }

    /**
     * 基準日の翌日から終了日までの残日数を計算する。
     * plotMapでプロットされている日のみカウント。
     * ※基準日はExcelデータの「その日終了時点」を表すため、基準日自体は含まない。
     *
     * @param baseDate 基準日（Project.baseDateを渡す）
     * @returns 残日数。計算不能な場合は undefined
     *
     * @remarks
     * - 基準日がタスク期間外（startDate〜endDate外）の場合は 0
     * - startDate, endDate, plotMap が未設定の場合は undefined
     *
     * @see REQ-PV-TODAY-001
     */
    remainingDays = (baseDate: Date): number | undefined => {
        if (!this.checkStartEndDateAndPlotMap()) {
            return undefined
        }

        const { startDate, endDate, plotMap } = this

        const baseSerial = toDaySerial(baseDate)
        const startSerial = toDaySerial(startDate)
        const endSerial = toDaySerial(endDate)

        // タスク期間外チェック
        if (baseSerial < startSerial || baseSerial > endSerial) {
            return 0
        }

        // 残日数カウント: 基準日の翌日〜終了日で plotMap が true の日数
        // ※基準日自体は含まない（基準日終了時点の解釈）
        let count = 0
        for (const [serial, value] of plotMap.entries()) {
            const daySerial = toDaySerialFromKey(serial)
            if (value === true && daySerial > baseSerial && daySerial <= endSerial) {
                count++
            }
        }

        return count
    }

    /**
     * 実行PV（今日やるべきPV）を計算する。
     * = 残工数 / 残日数
     * = workload × (1 - progressRate) / remainingDays
     *
     * @param baseDate 基準日（Project.baseDateを渡す）
     * @returns 実行PV。計算不能な場合は undefined
     *
     * @remarks
     * - 残日数が 0 の場合は 0 を返す（ゼロ除算回避）
     * - progressRate が undefined の場合は 0 として扱う
     * - workload が undefined の場合は undefined を返す
     *
     * @see REQ-PV-TODAY-001
     */
    pvTodayActual = (baseDate: Date): number | undefined => {
        const remaining = this.remainingDays(baseDate)

        if (remaining === undefined) {
            return undefined
        }

        if (remaining === 0) {
            return 0 // ゼロ除算回避
        }

        const { workload, progressRate } = this

        if (workload === undefined) {
            return undefined
        }

        // progressRate が undefined なら 0 として扱う（進捗なし）
        const rate = progressRate ?? 0
        const remainingWorkload = workload * (1 - rate)

        return remainingWorkload / remaining
    }

    /**
     * startDate, endDate ,plotMap がundefinedだったらfalse
     * @returns
     */
    checkStartEndDateAndPlotMap = (): this is NonNullDateAndPlotMap => {
        const { startDate, endDate, plotMap, id, name } = this
        if (!startDate || !endDate) {
            this.logger.warn(
                `タスクID:${id} 日付エラー。開始日:[${dateStr(startDate)}],終了日:[${dateStr(endDate)}]が取得できず.タスク名: ${name}`
            )
            return false
        }

        if (!plotMap) {
            this.logger.warn(`タスクID:${id} plotMapエラー(undefined)`)
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
 * baseDateがplotMapにある、かつ、start/endに含まれていたらtrue
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
    const baseSerial = toDaySerial(baseDate)
    const startSerial = toDaySerial(startDate)
    const endSerial = toDaySerial(endDate)
    return hasPlotOnDay(plotMap, baseSerial) && startSerial <= baseSerial && baseSerial <= endSerial
    // return startDate <= baseDate && baseDate <= endDate
}

type NonNullDateAndPlotMap = {
    startDate: Date
    endDate: Date
    plotMap: Map<number, boolean>
    // id: number
}

type ValidStatus = {
    isValid: boolean
    invalidReason?: string
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
