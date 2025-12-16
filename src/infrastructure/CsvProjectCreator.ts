/**
 * CsvProjectCreator
 *
 * 仕様書: docs/specs/domain/CsvProjectCreator.spec.yaml
 * 要件ID: REQ-CSV-001
 *
 * CSVファイルパスを受け取り、ファイルを読み込んでProjectを生成するアダプター
 */

import * as fs from 'fs'
import * as path from 'path'
import iconv from 'iconv-lite'
import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../domain/Project'
import { ProjectCreator } from '../domain/ProjectCreator'
import { TaskRow } from '../domain/TaskRow'
import { TaskService } from '../domain/TaskService'
import { maxDate, minDate } from '../common'
import { getLogger } from '../logger'

/**
 * CsvProjectCreatorのオプション
 */
export type CsvProjectCreatorOptions = {
    /**
     * 文字エンコーディング
     * - 'utf-8': UTF-8
     * - 'shift-jis': Shift-JIS (CP932)
     * - 'auto': 自動判定（デフォルト）
     */
    encoding?: 'utf-8' | 'shift-jis' | 'auto'
}

/**
 * ファイル名パターン: {プロジェクト名}_{yyyyMMdd}.csv
 */
const FILENAME_PATTERN = /^(.+)_(\d{8})\.csv$/i

/**
 * CSVファイルからProjectを生成するクラス
 *
 * 不変条件:
 * - INV-CSV-01: createProject()は常にProjectインスタンスを返す（エラー時は例外）
 * - INV-CSV-02: 戻り値のProjectは有効な状態（baseDate, taskNodes, holidayDatasが設定済み）
 * - INV-CSV-03: 生成されるtaskNodesは全てisLeaf=true
 */
export class CsvProjectCreator implements ProjectCreator {
    private logger = getLogger('infrastructure/CsvProjectCreator')
    private _encoding: 'utf-8' | 'shift-jis' | 'auto'

    /**
     * コンストラクタ
     *
     * @param csvPath CSVファイルの絶対パスまたは相対パス
     * @param options オプション設定
     *
     * 事前条件:
     * - PRE-CSV-01: csvPathが有効なファイルパス
     * - PRE-CSV-02: 指定パスにCSVファイルが存在する
     * - PRE-CSV-03: ファイル名が規則に従う（{name}_{yyyyMMdd}.csv）
     */
    constructor(
        private _csvPath: string,
        options?: CsvProjectCreatorOptions
    ) {
        this._encoding = options?.encoding ?? 'auto'
    }

    /**
     * CSVファイルを読み込んでProjectオブジェクトを生成する
     *
     * 事後条件:
     * - POST-CSV-01: 戻り値のProjectにbaseDateが設定されている（ファイル名から抽出）
     * - POST-CSV-02: 戻り値のProjectにtaskNodesが設定されている（空配列可）
     * - POST-CSV-03: 戻り値のProjectのholidayDatasは空配列
     * - POST-CSV-04: 全てのTaskNodeはisLeaf=true
     * - POST-CSV-05: 全てのTaskNodeはparentId=undefined
     * - POST-CSV-06: startDateはタスクの最小開始日、endDateは最大終了日
     *
     * @returns Project
     * @throws ファイルが存在しない場合: "File not found: {path}"
     * @throws ファイル名パターン不一致: "Invalid filename format. Expected: {name}_{yyyyMMdd}.csv"
     * @throws CSV解析エラー: "Failed to parse CSV: {details}"
     */
    async createProject(): Promise<Project> {
        // 1. ファイル存在チェック
        if (!fs.existsSync(this._csvPath)) {
            throw new Error(`File not found: ${this._csvPath}`)
        }

        // 2. ファイル名からプロジェクト名と基準日を抽出
        const filename = path.basename(this._csvPath)
        const match = filename.match(FILENAME_PATTERN)
        if (!match) {
            throw new Error(
                `Invalid filename format. Expected: {name}_{yyyyMMdd}.csv, got: ${filename}`
            )
        }

        const projectName = match[1]
        const baseDateStr = match[2]
        const baseDate = this.parseDateFromString(baseDateStr)

        // 3. ファイル読み込みとエンコーディング処理
        const fileBuffer = fs.readFileSync(this._csvPath)
        const encoding = this._encoding === 'auto' ? this.detectEncoding(fileBuffer) : this._encoding
        const content = this.decodeBuffer(fileBuffer, encoding)

        // 4. CSVパース
        const taskRows = this.parseCsv(content)

        // 5. startDate/endDate算出
        const from = minDate(taskRows.map((row) => row.startDate))
        const to = maxDate(taskRows.map((row) => row.endDate))

        // 6. TaskNode[]にビルド
        const taskService = new TaskService()
        const taskNodes = taskService.buildTaskTree(taskRows)

        // 7. Project生成
        const project = new Project(
            taskNodes,
            baseDate,
            [], // holidayDatas: 空配列
            from,
            to,
            projectName
        )

        return project
    }

    /**
     * yyyyMMdd形式の文字列からDateを生成
     */
    private parseDateFromString(dateStr: string): Date {
        const year = parseInt(dateStr.substring(0, 4), 10)
        const month = parseInt(dateStr.substring(4, 6), 10) - 1
        const day = parseInt(dateStr.substring(6, 8), 10)
        return new Date(year, month, day)
    }

    /**
     * エンコーディング自動判定
     *
     * BOM検出またはUTF-8の妥当性チェックで判定
     * UTF-8として有効でない場合のみShift-JISとして処理
     */
    private detectEncoding(buffer: Buffer): 'utf-8' | 'shift-jis' {
        // UTF-8 BOM検出
        if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
            return 'utf-8'
        }

        // UTF-8として妥当かどうかをチェック
        if (this.isValidUtf8(buffer)) {
            return 'utf-8'
        }

        return 'shift-jis'
    }

    /**
     * BufferがUTF-8として有効かどうかをチェック
     */
    private isValidUtf8(buffer: Buffer): boolean {
        let i = 0
        while (i < buffer.length) {
            const byte = buffer[i]

            // ASCII (0x00-0x7F)
            if (byte <= 0x7f) {
                i++
                continue
            }

            // 2バイトUTF-8 (0xC0-0xDF)
            if (byte >= 0xc2 && byte <= 0xdf) {
                if (i + 1 >= buffer.length) return false
                const next = buffer[i + 1]
                if (next < 0x80 || next > 0xbf) return false
                i += 2
                continue
            }

            // 3バイトUTF-8 (0xE0-0xEF) - 日本語はここ
            if (byte >= 0xe0 && byte <= 0xef) {
                if (i + 2 >= buffer.length) return false
                const next1 = buffer[i + 1]
                const next2 = buffer[i + 2]

                // 特別なケース: E0の場合、次のバイトはA0-BF
                if (byte === 0xe0 && (next1 < 0xa0 || next1 > 0xbf)) return false
                // 特別なケース: EDの場合、次のバイトは80-9F (サロゲート除外)
                if (byte === 0xed && (next1 < 0x80 || next1 > 0x9f)) return false
                // 通常のケース
                if (byte !== 0xe0 && byte !== 0xed && (next1 < 0x80 || next1 > 0xbf)) return false

                if (next2 < 0x80 || next2 > 0xbf) return false
                i += 3
                continue
            }

            // 4バイトUTF-8 (0xF0-0xF4)
            if (byte >= 0xf0 && byte <= 0xf4) {
                if (i + 3 >= buffer.length) return false
                const next1 = buffer[i + 1]
                const next2 = buffer[i + 2]
                const next3 = buffer[i + 3]

                if (byte === 0xf0 && (next1 < 0x90 || next1 > 0xbf)) return false
                if (byte === 0xf4 && (next1 < 0x80 || next1 > 0x8f)) return false
                if (byte !== 0xf0 && byte !== 0xf4 && (next1 < 0x80 || next1 > 0xbf)) return false

                if (next2 < 0x80 || next2 > 0xbf) return false
                if (next3 < 0x80 || next3 > 0xbf) return false
                i += 4
                continue
            }

            // 不正なバイト
            return false
        }

        return true
    }

    /**
     * BufferをエンコーディングでデコードしてstringにReturn
     */
    private decodeBuffer(buffer: Buffer, encoding: 'utf-8' | 'shift-jis'): string {
        if (encoding === 'utf-8') {
            // UTF-8 BOMがあれば除去
            if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
                return buffer.toString('utf-8').substring(1)
            }
            return buffer.toString('utf-8')
        } else {
            return iconv.decode(buffer, 'Shift_JIS')
        }
    }

    /**
     * CSVコンテンツをパースしてTaskRow[]を生成
     *
     * ビジネスルール:
     * - BR-CSV-01: 進捗率が1より大きい場合、100で割って0-1に正規化
     * - BR-CSV-02: タスクIDが空または数値でない行はスキップ（警告ログ出力）
     * - BR-CSV-03: 日付形式はyyyy/MM/ddまたはyyyy-MM-ddを許容
     */
    private parseCsv(content: string): TaskRow[] {
        const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '')

        if (lines.length === 0) {
            return []
        }

        // 1行目はヘッダー行としてスキップ
        const dataLines = lines.slice(1)
        const taskRows: TaskRow[] = []
        let sharp = 1

        for (let lineIndex = 0; lineIndex < dataLines.length; lineIndex++) {
            const line = dataLines[lineIndex]
            const columns = this.parseCSVLine(line)

            // BR-CSV-02: タスクIDが空または数値でない行はスキップ
            const taskIdStr = columns[0]?.trim()
            if (!taskIdStr) {
                this.logger.warn(`Line ${lineIndex + 2}: Empty task ID, skipping`)
                continue
            }

            const taskId = parseInt(taskIdStr, 10)
            if (isNaN(taskId)) {
                this.logger.warn(`Line ${lineIndex + 2}: Invalid task ID "${taskIdStr}", skipping`)
                continue
            }

            try {
                const taskRow = this.createTaskRowFromColumns(columns, sharp, taskId)
                taskRows.push(taskRow)
                sharp++
            } catch (error) {
                this.logger.warn(
                    `Line ${lineIndex + 2}: Failed to parse row: ${error instanceof Error ? error.message : error}`
                )
            }
        }

        return taskRows
    }

    /**
     * CSVの1行をパースしてカラム配列を返す
     * カンマ区切り、ダブルクォート対応
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = []
        let current = ''
        let inQuote = false

        for (let i = 0; i < line.length; i++) {
            const char = line[i]

            if (inQuote) {
                if (char === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"'
                        i++
                    } else {
                        inQuote = false
                    }
                } else {
                    current += char
                }
            } else {
                if (char === '"') {
                    inQuote = true
                } else if (char === ',') {
                    result.push(current)
                    current = ''
                } else {
                    current += char
                }
            }
        }
        result.push(current)

        return result
    }

    /**
     * カラム配列からTaskRowを生成
     *
     * CSV列マッピング:
     * 0: タスクID → id, sharp
     * 1: 名称 → name
     * 2: 担当 → assignee
     * 3: 予定工数 → workload
     * 4: 予定開始日 → startDate
     * 5: 予定終了日 → endDate
     * 6: 実績開始日 → actualStartDate
     * 7: 実績終了日 → actualEndDate
     * 8: 進捗率 → progressRate（0-1に正規化）
     * 9: 稼働予定日数 → scheduledWorkDays
     * 10: PV → pv
     * 11: EV → ev
     */
    private createTaskRowFromColumns(columns: string[], sharp: number, taskId: number): TaskRow {
        const name = columns[1]?.trim() ?? ''
        const assignee = columns[2]?.trim() || undefined
        const workload = this.parseNumber(columns[3])
        const startDate = this.parseDate(columns[4])
        const endDate = this.parseDate(columns[5])
        const actualStartDate = this.parseDate(columns[6])
        const actualEndDate = this.parseDate(columns[7])
        const progressRate = this.normalizeProgressRate(this.parseNumber(columns[8]))
        const scheduledWorkDays = this.parseNumber(columns[9])
        const pv = this.parseNumber(columns[10])
        const ev = this.parseNumber(columns[11])

        // Phase 1では固定値
        const level = 1 // 全て同一階層
        const isLeaf = true
        const parentId = undefined

        // plotMapを自動生成（EVM計算に必要）
        const plotMap = this.generatePlotMap(startDate, endDate)

        return new TaskRow(
            sharp,
            taskId,
            level,
            name,
            assignee,
            workload,
            startDate,
            endDate,
            actualStartDate,
            actualEndDate,
            progressRate,
            scheduledWorkDays,
            pv,
            ev,
            undefined, // spi
            undefined, // expectedProgressDate
            undefined, // delayDays
            undefined, // remarks
            parentId,
            isLeaf,
            plotMap
        )
    }

    /**
     * 文字列を数値にパース
     */
    private parseNumber(value: string | undefined): number | undefined {
        if (!value || value.trim() === '') {
            return undefined
        }
        const num = parseFloat(value.trim())
        return isNaN(num) ? undefined : num
    }

    /**
     * 日付文字列をパース
     *
     * BR-CSV-03: yyyy/MM/ddまたはyyyy-MM-ddを許容
     */
    private parseDate(value: string | undefined): Date | undefined {
        if (!value || value.trim() === '') {
            return undefined
        }

        const trimmed = value.trim()

        // yyyy/MM/dd または yyyy-MM-dd
        const match = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
        if (!match) {
            this.logger.warn(`Invalid date format: "${trimmed}"`)
            return undefined
        }

        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10) - 1
        const day = parseInt(match[3], 10)
        const date = new Date(year, month, day)

        // 有効な日付かチェック
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day
        ) {
            this.logger.warn(`Invalid date: "${trimmed}"`)
            return undefined
        }

        return date
    }

    /**
     * 進捗率を0-1に正規化
     *
     * BR-CSV-01: 進捗率が1より大きい場合、100で割って0-1に正規化
     */
    private normalizeProgressRate(value: number | undefined): number | undefined {
        if (value === undefined) {
            return undefined
        }

        // 1より大きい場合（例: 50, 100）は100で割る
        if (value > 1) {
            return value / 100
        }

        return value
    }

    /**
     * 開始日〜終了日の稼働日をplotMapとして生成
     *
     * 土日を除外した稼働日のみをプロット
     * 祝日はPhase 1では考慮しない（holidayDatasが空のため）
     */
    private generatePlotMap(startDate?: Date, endDate?: Date): Map<number, boolean> {
        const plotMap = new Map<number, boolean>()

        if (!startDate || !endDate) {
            return plotMap
        }

        const current = new Date(startDate)
        while (current <= endDate) {
            const dayOfWeek = current.getDay()
            // 土日以外をプロット（0=日曜, 6=土曜）
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                plotMap.set(date2Sn(current), true)
            }
            current.setDate(current.getDate() + 1)
        }

        return plotMap
    }
}
