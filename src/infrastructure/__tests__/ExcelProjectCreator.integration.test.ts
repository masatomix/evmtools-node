/**
 * spec: excel-io-tests（回帰の穴埋め）
 *
 * Excel 読み込み経路（ExcelProjectCreator / ExcelBufferProjectCreator /
 * MappingProjectCreator / TaskRowCreatorImpl / ExcelTaskRowCreator）の統合テスト。
 *
 * フィクスチャ: fixtures/ExcelTest.xlsx（再生成: npx ts-node src/infrastructure/__tests__/fixtures/generate-excel-fixture.ts）
 *
 * フィクスチャの WBS 設計（詳細は fixtures/generate-excel-fixture.ts 冒頭コメント参照）:
 * - 基準日: 2025/01/10(金)（ガントチャート1行目・列インデックス26 のシリアル値）
 * - 休日テーブル: 2025/01/01(元日) と 2025/01/14(テスト祝日。タスク期間内の火曜)
 * - タスク:
 *   - id=1 開発（LV1 親。土日込みで 01/06〜01/17 の12日をプロット）
 *     - id=2 設計（田中・工数5・01/06(月)〜01/10(金)・進捗100%・EV=5）完了
 *     - id=3 実装（鈴木・工数8・01/08(水)〜01/16(木)・進捗40%・EV=3.2）仕掛
 *       プロットは 08,09,10,13,15,16 の6稼働日（土日 11,12 と祝日 14 を跨ぐ）
 *     - id=4 テスト（田中・工数3・01/15(水)〜01/17(金)・進捗0%・EV=0）未着手
 *
 * EVM 期待値の手計算根拠（基準日 2025/01/10）:
 * - 設計: workloadPerDay = 5/5 = 1。累積PV = 5日 × 1 = 5
 * - 実装: workloadPerDay = 8/6。01/10 までのプロットは 08,09,10 の3日 → 累積PV = 3 × 8/6 = 4
 * - テスト: 01/10 時点でプロットなし → 累積PV = 0
 * - totalPvCalculated = 5 + 4 + 0 = 9 / totalEv = 5 + 3.2 + 0 = 8.2 / SPI = 8.2/9 ≒ 0.9111
 * - BAC(totalWorkloadExcel) = 5 + 8 + 3 = 16 / totalPvExcel = 5 + 4 + 3 = 12
 * - EV(0/100方式) = 完了タスク（設計）の工数のみ = 5
 * - 稼働日（01/06〜01/17 から土日と祝日 01/14 を除外）: 06,07,08,09,10,13,15,16,17 の9日
 *   → plannedWorkDays = PD = 9、AT（01/06〜01/10 の稼働日）= 5
 * - 累積PV曲線（稼働日ごと・小数第3位丸め）:
 *   [1, 2, 4.333, 6.667, 9, 10.333, 12.667, 15, 16]（末尾 = BAC = 16）
 * - ES: 累積PV(4日目)=6.667 <= EV(8.2) < 累積PV(5日目)=9
 *   → ES = 4 + (8.2 - 6.667)/(9 - 6.667) ≒ 4.6571
 *   → SPI(t) = ES/AT ≒ 0.9314 / SV(t) = ES - AT ≒ -0.3429 / IEAC(t) = PD/SPI(t) ≒ 9.6627
 *   → 完了予測日 = 01/06 から ceil(9.6627)=10 稼働日目 = 2025/01/20(月)
 */

import * as path from 'path'
import * as fs from 'fs'
import { spawnSync } from 'child_process'
import { date2Sn } from 'excel-csv-read-write'
import { ExcelProjectCreator } from '../ExcelProjectCreator'
import { ExcelBufferProjectCreator } from '../ExcelBufferProjectCreator'
import { ExcelTaskRowCreator } from '../ExcelTaskRowCreator'
import { TaskRowFactory } from '../TaskRowFactory'
import { Project } from '../../domain/Project'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')
const EXCEL_PATH = path.join(FIXTURES_DIR, 'ExcelTest.xlsx')

/** ローカル日付の Excel シリアル値（整数）。plotMap のキー突合に使う */
const sn = (year: number, month1: number, day: number): number =>
    date2Sn(new Date(year, month1 - 1, day))

/** ES の期待値（手計算。ヘッダコメントの累積PV曲線を参照） */
const EXPECTED_ES = 4 + (8.2 - 6.667) / (9 - 6.667)

const createProject = async (): Promise<Project> => {
    return new ExcelProjectCreator(EXCEL_PATH).createProject()
}

describe('ExcelProjectCreator 統合テスト', () => {
    let project: Project

    beforeAll(async () => {
        project = await createProject()
    })

    describe('プロジェクトのメタ情報', () => {
        it('プロジェクト名はファイル名（拡張子なし）になる', () => {
            expect(project.name).toBe('ExcelTest')
        })

        it('基準日はガントチャート1行目・列インデックス26 のシリアル値から取得される', () => {
            expect(project.baseDate).toEqual(new Date(2025, 0, 10))
        })

        it('開始日・終了日はリーフタスクの開始日最小値・終了日最大値になる', () => {
            expect(project.startDate).toEqual(new Date(2025, 0, 6))
            expect(project.endDate).toEqual(new Date(2025, 0, 17))
        })
    })

    describe('休日テーブル', () => {
        it('休日テーブルの2件が holidayDatas に読み込まれる', () => {
            expect(project.holidayDatas.length).toBe(2)
            expect(project.holidayDatas[0].date).toEqual(new Date(2025, 0, 1))
            expect(project.holidayDatas[1].date).toEqual(new Date(2025, 0, 14))
        })

        it('isHoliday が休日テーブルの祝日と土日を休日と判定する', () => {
            expect(project.isHoliday(new Date(2025, 0, 14))).toBe(true) // テスト祝日(火)
            expect(project.isHoliday(new Date(2025, 0, 11))).toBe(true) // 土曜
            expect(project.isHoliday(new Date(2025, 0, 12))).toBe(true) // 日曜
            expect(project.isHoliday(new Date(2025, 0, 13))).toBe(false) // 平日(月)
            expect(project.isHoliday(new Date(2025, 0, 15))).toBe(false) // 平日(水)
        })

        it('plannedWorkDays は期間から土日と祝日を除いた9日になる', () => {
            expect(project.plannedWorkDays).toBe(9)
        })
    })

    describe('タスクツリー構造', () => {
        it('ルート1件（開発）の下に子タスク3件がぶら下がる', () => {
            expect(project.taskNodes.length).toBe(1)
            const root = project.taskNodes[0]
            expect(root.name).toBe('開発')
            expect(root.isLeaf).toBe(false)
            expect(root.children.map((c) => c.name)).toEqual(['設計', '実装', 'テスト'])
            expect(root.children.every((c) => c.isLeaf)).toBe(true)
        })

        it('フラット化した TaskRow の level / parentId が正しい', () => {
            const rows = project.toTaskRows()
            expect(rows.length).toBe(4)
            expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4])
            expect(rows.map((r) => r.level)).toEqual([1, 2, 2, 2])
            expect(rows.map((r) => r.parentId)).toEqual([undefined, 1, 1, 1])
        })
    })

    describe('リーフタスクの各フィールド', () => {
        it('完了タスク（id=2 設計）の全フィールドが読み込まれる', () => {
            const task = project.getTask(2)!
            expect(task.sharp).toBe(2)
            expect(task.name).toBe('設計')
            expect(task.assignee).toBe('田中')
            expect(task.workload).toBe(5)
            expect(task.startDate).toEqual(new Date(2025, 0, 6))
            expect(task.endDate).toEqual(new Date(2025, 0, 10))
            expect(task.actualStartDate).toEqual(new Date(2025, 0, 6))
            expect(task.actualEndDate).toEqual(new Date(2025, 0, 10))
            expect(task.progressRate).toBe(1)
            expect(task.scheduledWorkDays).toBe(5)
            expect(task.pv).toBe(5)
            expect(task.ev).toBe(5)
            expect(task.spi).toBe(1)
            expect(task.isLeaf).toBe(true)
            expect(task.finished).toBe(true)
            expect(task.validStatus.isValid).toBe(true)
            // plotMap: 01/06(月)〜01/10(金) の5日
            expect(Array.from(task.plotMap!.keys())).toEqual([
                sn(2025, 1, 6),
                sn(2025, 1, 7),
                sn(2025, 1, 8),
                sn(2025, 1, 9),
                sn(2025, 1, 10),
            ])
        })

        it('仕掛タスク（id=3 実装）の全フィールドが読み込まれる', () => {
            const task = project.getTask(3)!
            expect(task.sharp).toBe(3)
            expect(task.name).toBe('実装')
            expect(task.assignee).toBe('鈴木')
            expect(task.workload).toBe(8)
            expect(task.startDate).toEqual(new Date(2025, 0, 8))
            expect(task.endDate).toEqual(new Date(2025, 0, 16))
            expect(task.actualStartDate).toEqual(new Date(2025, 0, 8))
            expect(task.actualEndDate).toBeUndefined()
            expect(task.progressRate).toBe(0.4)
            expect(task.scheduledWorkDays).toBe(6)
            expect(task.pv).toBe(4)
            expect(task.ev).toBe(3.2)
            expect(task.spi).toBe(0.8)
            expect(task.expectedProgressDate).toEqual(new Date(2025, 0, 9))
            expect(task.delayDays).toBe(1)
            expect(task.remarks).toBe('備考テスト')
            expect(task.finished).toBe(false)
        })

        it('仕掛タスク（id=3）の plotMap は土日と祝日を含まない6稼働日になる', () => {
            const task = project.getTask(3)!
            expect(Array.from(task.plotMap!.keys())).toEqual([
                sn(2025, 1, 8),
                sn(2025, 1, 9),
                sn(2025, 1, 10),
                sn(2025, 1, 13),
                sn(2025, 1, 15),
                sn(2025, 1, 16),
            ])
            expect(task.plotMap!.has(sn(2025, 1, 11))).toBe(false) // 土曜
            expect(task.plotMap!.has(sn(2025, 1, 12))).toBe(false) // 日曜
            expect(task.plotMap!.has(sn(2025, 1, 14))).toBe(false) // 祝日
        })

        it('未着手タスク（id=4 テスト）は進捗0・EV=0 で読み込まれる', () => {
            const task = project.getTask(4)!
            expect(task.name).toBe('テスト')
            expect(task.assignee).toBe('田中')
            expect(task.workload).toBe(3)
            expect(task.startDate).toEqual(new Date(2025, 0, 15))
            expect(task.endDate).toEqual(new Date(2025, 0, 17))
            expect(task.actualStartDate).toBeUndefined()
            expect(task.actualEndDate).toBeUndefined()
            expect(task.progressRate).toBe(0)
            expect(task.ev).toBe(0)
            expect(task.finished).toBe(false)
            expect(Array.from(task.plotMap!.keys())).toEqual([
                sn(2025, 1, 15),
                sn(2025, 1, 16),
                sn(2025, 1, 17),
            ])
        })

        it('親タスク（id=1 開発）の plotMap には土日もプロットされている', () => {
            const parent = project.getTask(1)!
            expect(parent.isLeaf).toBe(false)
            expect(parent.plotMap!.size).toBe(12) // 01/06〜01/17 の12日（土日祝込み）
            expect(parent.plotMap!.has(sn(2025, 1, 11))).toBe(true) // 土曜もプロットあり
            expect(parent.plotMap!.has(sn(2025, 1, 12))).toBe(true) // 日曜もプロットあり
        })
    })

    describe('EVM計算（end-to-end）', () => {
        it('calculatePV / calculatePVs が plotMap と整合する', () => {
            const task3 = project.getTask(3)!
            // 稼働日: workloadPerDay = 8/6
            expect(task3.calculatePV(new Date(2025, 0, 8))).toBeCloseTo(8 / 6, 10)
            // 土日・祝日はプロットなし → 0
            expect(task3.calculatePV(new Date(2025, 0, 11))).toBe(0)
            expect(task3.calculatePV(new Date(2025, 0, 14))).toBe(0)
            // 基準日までの累積PV: 3日 × 8/6 = 4
            expect(task3.calculatePVs(new Date(2025, 0, 10))).toBeCloseTo(4, 10)
            const task2 = project.getTask(2)!
            expect(task2.calculatePVs(new Date(2025, 0, 10))).toBe(5)
        })

        it('getStatistics() が手計算の期待値と一致する', () => {
            const stats = project.getStatistics()
            expect(stats.projectName).toBe('ExcelTest')
            expect(stats.startDate).toBe('2025/01/06')
            expect(stats.endDate).toBe('2025/01/17')
            expect(stats.baseDate).toBe('2025/01/10')
            expect(stats.totalTasksCount).toBe(3) // リーフのみ
            expect(stats.totalWorkloadExcel).toBe(16) // 5 + 8 + 3
            expect(stats.totalWorkloadCalculated).toBe(16) // 終了日までの累積PV = BAC
            expect(stats.averageWorkload).toBeCloseTo(16 / 3, 8)
            expect(stats.totalPvExcel).toBe(12) // 5 + 4 + 3
            expect(stats.totalPvCalculated).toBe(9) // 5 + 4 + 0
            expect(stats.totalEv).toBe(8.2) // 5 + 3.2 + 0
            expect(stats.spi).toBeCloseTo(8.2 / 9, 10) // ≒ 0.9111
            expect(stats.delayedTaskCount).toBe(0)
            expect(stats.averageDelayDays).toBe(0)
            expect(stats.maxDelayDays).toBe(0)
            // ETC' = 残作業(16 - 8.2 = 7.8) / SPI(8.2/9) = 7.8 × 9 / 8.2
            expect(stats.etcPrime).toBeCloseTo((7.8 * 9) / 8.2, 8)
        })

        it('getStatistics({evMethod: "0/100"}) の EV は完了タスクの工数のみになる', () => {
            const stats = project.getStatistics({ evMethod: '0/100' })
            expect(stats.totalEv).toBe(5) // 完了は設計（工数5）のみ
            expect(stats.spi).toBeCloseTo(5 / 9, 10)
            // PV/BAC は方式非依存
            expect(stats.totalPvCalculated).toBe(9)
            expect(stats.totalWorkloadExcel).toBe(16)
        })

        it('getStatisticsByName() が担当者別に集計される', () => {
            const stats = project.getStatisticsByName()
            const tanaka = stats.find((s) => s.assignee === '田中')!
            expect(tanaka.totalTasksCount).toBe(2) // 設計 + テスト
            expect(tanaka.totalWorkloadExcel).toBe(8) // 5 + 3
            expect(tanaka.totalEv).toBe(5) // 5 + 0
            const suzuki = stats.find((s) => s.assignee === '鈴木')!
            expect(suzuki.totalTasksCount).toBe(1)
            expect(suzuki.totalWorkloadExcel).toBe(8)
            expect(suzuki.totalEv).toBe(3.2)
        })

        it('calculateEarnedSchedule() が定義どおりの値を返す', () => {
            const es = project.calculateEarnedSchedule()!
            expect(es).toBeDefined()
            expect(es.pd).toBe(9) // 計画総稼働日数
            expect(es.at).toBe(5) // 01/06〜01/10 の稼働日数
            expect(es.es).toBeCloseTo(EXPECTED_ES, 10) // ≒ 4.6571
            expect(es.spiT).toBeCloseTo(EXPECTED_ES / 5, 10) // ≒ 0.9314
            expect(es.svT).toBeCloseTo(EXPECTED_ES - 5, 10) // ≒ -0.3429
            expect(es.iEacT).toBeCloseTo(9 / (EXPECTED_ES / 5), 10) // ≒ 9.6627
            // 01/06 から ceil(9.6627) = 10 稼働日目（土日と祝日 01/14 をスキップ）
            expect(es.esForecastDate).toEqual(new Date(2025, 0, 20))
        })

        it('計算から除外されたタスクはない', () => {
            expect(project.excludedTasks).toEqual([])
        })
    })
})

describe('ExcelBufferProjectCreator 統合テスト', () => {
    const readFixtureAsArrayBuffer = (): ArrayBuffer => {
        const buffer = fs.readFileSync(EXCEL_PATH)
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    }

    it('同一フィクスチャの Buffer からファイル版と同一の Project が生成される', async () => {
        const fileProject = await createProject()
        const bufferProject = await new ExcelBufferProjectCreator(
            readFixtureAsArrayBuffer(),
            'BufferProject'
        ).createProject()

        // プロジェクト名はコンストラクタ引数が使われる（ファイル名は使われない）
        expect(bufferProject.name).toBe('BufferProject')

        // タスク・基準日・休日はファイル版と完全一致する
        expect(bufferProject.baseDate).toEqual(fileProject.baseDate)
        expect(bufferProject.startDate).toEqual(fileProject.startDate)
        expect(bufferProject.endDate).toEqual(fileProject.endDate)
        expect(bufferProject.holidayDatas).toEqual(fileProject.holidayDatas)
        expect(TaskRowFactory.toDtos(bufferProject.toTaskRows())).toEqual(
            TaskRowFactory.toDtos(fileProject.toTaskRows())
        )

        // 統計もプロジェクト名以外は一致する
        const bufferStats = bufferProject.getStatistics()
        expect(fileProject.getStatistics()).toEqual({
            ...bufferStats,
            projectName: 'ExcelTest',
        })
    })
})

describe('ExcelTaskRowCreator 統合テスト', () => {
    it('ガントチャートシートから TaskRow 配列を生成する', async () => {
        const rows = await new ExcelTaskRowCreator(EXCEL_PATH).createRowData()
        expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4])
        expect(rows[0].isLeaf).toBe(false)
        expect(rows.slice(1).every((r) => r.isLeaf)).toBe(true)
        expect(rows[2].plotMap!.size).toBe(6)
    })
})

describe('異常系（現状の実挙動を固定する）', () => {
    it('「ガントチャート」シートがないファイルは TypeError で reject される', async () => {
        const creator = new ExcelProjectCreator(path.join(FIXTURES_DIR, 'MissingGantt.xlsx'))
        await expect(creator.createProject()).rejects.toThrow(
            /Cannot read properties of undefined \(reading 'usedRange'\)/
        )
    })

    it('「休日テーブル」シートがないファイルは TypeError で reject される', async () => {
        const creator = new ExcelProjectCreator(path.join(FIXTURES_DIR, 'MissingHoliday.xlsx'))
        await expect(creator.createProject()).rejects.toThrow(
            /Cannot read properties of undefined \(reading 'usedRange'\)/
        )
    })

    it('Excel 形式でない Buffer は reject される', async () => {
        const garbage = new TextEncoder().encode('this is not an excel file').buffer
        const creator = new ExcelBufferProjectCreator(garbage as ArrayBuffer, 'Garbage')
        await expect(creator.createProject()).rejects.toThrow(/central directory/)
    })

    it(
        '存在しないファイルは Promise が settle せずプロセスが uncaughtException で落ちる' +
            '（excelStream2json がストリームの error を処理しないため）',
        () => {
            // 現状の実挙動: fs.createReadStream の 'error' イベントにリスナーが無いため、
            // createProject() の Promise は resolve も reject もされず、
            // プロセス自体が ENOENT の uncaughtException で異常終了する。
            // Jest ワーカーを巻き込まないよう子プロセスで観測して挙動を固定する。
            const missingPath = path.join(FIXTURES_DIR, 'NotExist.xlsx')
            const creatorPath = path.join(__dirname, '..', 'ExcelProjectCreator.ts')
            const script = [
                `require('ts-node').register({ transpileOnly: true })`,
                `const { ExcelProjectCreator } = require(${JSON.stringify(creatorPath)})`,
                `new ExcelProjectCreator(${JSON.stringify(missingPath)}).createProject().then(`,
                `    () => console.log('SETTLED_RESOLVE'),`,
                `    () => console.log('SETTLED_REJECT')`,
                `)`,
            ].join('\n')

            const result = spawnSync(process.execPath, ['-e', script], {
                cwd: path.join(__dirname, '..', '..', '..'),
                encoding: 'utf-8',
                timeout: 60000,
            })

            expect(result.status).not.toBe(0) // プロセスが異常終了する
            expect(result.stderr).toContain('ENOENT') // 原因は ENOENT の uncaughtException
            expect(result.stdout).not.toContain('SETTLED') // Promise は settle しない
        },
        90000
    )
})
