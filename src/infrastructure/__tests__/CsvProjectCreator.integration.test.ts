/**
 * CsvProjectCreator 統合テスト
 *
 * 要件ID: REQ-CSV-001
 * 受け入れ基準: AC-04 - 生成されたProjectで既存のEVM計算が正しく動作する
 *
 * このテストでは、CsvProjectCreatorで読み込んだProjectが
 * 既存のEVM計算機能と正しく連携することを検証します。
 */

import * as path from 'path'
import * as fs from 'fs'
import { CsvProjectCreator } from '../CsvProjectCreator'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

/**
 * テスト用CSVデータを生成
 * EVM計算を検証するための既知のデータセット
 */
function createEvmTestCsv(): string {
    const filename = 'EvmTest_20250115.csv'
    const filePath = path.join(FIXTURES_DIR, filename)

    // 2025/01/06(月)〜2025/01/10(金): 5営業日
    // 2025/01/13(月)〜2025/01/17(金): 5営業日
    // 基準日: 2025/01/15(水)
    const content = `タスクID,名称,担当,予定工数,予定開始日,予定終了日,実績開始日,実績終了日,進捗率,稼働予定日数,PV,EV
1,タスクA,田中,5,2025/01/06,2025/01/10,2025/01/06,2025/01/10,1,5,5,5
2,タスクB,鈴木,10,2025/01/13,2025/01/17,2025/01/13,,0.5,5,10,5
3,タスクC,田中,5,2025/01/20,2025/01/24,,,0,5,5,0`

    fs.writeFileSync(filePath, content, 'utf-8')
    return filePath
}

function cleanupFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }
}

describe('CsvProjectCreator 統合テスト (AC-04)', () => {
    let testCsvPath: string

    beforeAll(() => {
        testCsvPath = createEvmTestCsv()
    })

    afterAll(() => {
        cleanupFile(testCsvPath)
    })

    describe('EVM計算の動作確認', () => {
        it('plotMapが自動生成され、calculatePVが動作する', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            const taskRows = project.toTaskRows()
            const task1 = taskRows.find((t) => t.id === 1)!

            // plotMapが生成されていることを確認
            expect(task1.plotMap).toBeDefined()
            expect(task1.plotMap!.size).toBeGreaterThan(0)

            // 稼働日のPV計算（2025/01/06は月曜日、稼働日）
            const pv = task1.calculatePV(new Date(2025, 0, 6))
            expect(pv).toBe(1) // workload(5) / scheduledWorkDays(5) = 1
        })

        it('calculatePVsが累積PVを正しく計算する', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            const taskRows = project.toTaskRows()
            const task1 = taskRows.find((t) => t.id === 1)!

            // 2025/01/08(水)までの累積PV（月火水の3日分）
            const pvs = task1.calculatePVs(new Date(2025, 0, 8))
            expect(pvs).toBe(3) // 3日 × 1/日 = 3
        })

        it('calculateSPIが正しく計算される', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            const taskRows = project.toTaskRows()
            const task2 = taskRows.find((t) => t.id === 2)!

            // タスク2: 2025/01/13-17、EV=5、基準日2025/01/15で累積PV=6
            // 2025/01/13(月),14(火),15(水) = 3日分のPV
            const pvs = task2.calculatePVs(new Date(2025, 0, 15))
            expect(pvs).toBe(6) // 3日 × 2/日 = 6

            const spi = task2.calculateSPI(new Date(2025, 0, 15))
            // SPI = EV(5) / PVs(6) ≈ 0.833
            expect(spi).toBeCloseTo(0.833, 2)
        })

        it('非稼働日（土日）のPVは0になる', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            const taskRows = project.toTaskRows()
            const task2 = taskRows.find((t) => t.id === 2)!

            // 2025/01/11(土)、2025/01/12(日)はplotMapに含まれない
            const pvSat = task2.calculatePV(new Date(2025, 0, 11))
            const pvSun = task2.calculatePV(new Date(2025, 0, 12))
            expect(pvSat).toBe(0)
            expect(pvSun).toBe(0)
        })
    })

    describe('Project統計の動作確認', () => {
        it('statisticsByProjectが正しく計算される', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            const stats = project.statisticsByProject
            expect(stats.length).toBe(1)

            const stat = stats[0]

            // プロジェクト情報
            expect(stat.projectName).toBe('EvmTest')
            expect(stat.totalTasksCount).toBe(3)

            // Excel値（CSVから読み込んだ値）
            expect(stat.totalWorkloadExcel).toBe(20) // 5 + 10 + 5
            expect(stat.totalPvExcel).toBe(20) // 5 + 10 + 5
            expect(stat.totalEv).toBe(10) // 5 + 5 + 0
        })

        it('statisticsByNameが担当者別に集計される', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            const stats = project.statisticsByName

            // 田中: タスクA(工数5,EV5) + タスクC(工数5,EV0)
            const tanaka = stats.find((s) => s.assignee === '田中')
            expect(tanaka).toBeDefined()
            expect(tanaka!.totalTasksCount).toBe(2)
            expect(tanaka!.totalWorkloadExcel).toBe(10)
            expect(tanaka!.totalEv).toBe(5)

            // 鈴木: タスクB(工数10,EV5)
            const suzuki = stats.find((s) => s.assignee === '鈴木')
            expect(suzuki).toBeDefined()
            expect(suzuki!.totalTasksCount).toBe(1)
            expect(suzuki!.totalWorkloadExcel).toBe(10)
            expect(suzuki!.totalEv).toBe(5)
        })
    })

    describe('タスク取得の動作確認', () => {
        it('getTaskRowsが期間でフィルタリングできる', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            // 2025/01/13-15の期間のタスクを取得
            const tasks = project.getTaskRows(new Date(2025, 0, 13), new Date(2025, 0, 15))

            // この期間にPVがあるのはタスク2のみ
            expect(tasks.length).toBe(1)
            expect(tasks[0].id).toBe(2)
        })

        it('getTaskRowsが担当者でフィルタリングできる', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            // 田中の2025/01/06-10のタスク
            const tasks = project.getTaskRows(
                new Date(2025, 0, 6),
                new Date(2025, 0, 10),
                '田中'
            )

            expect(tasks.length).toBe(1)
            expect(tasks[0].name).toBe('タスクA')
        })
    })

    describe('validStatusの確認', () => {
        it('plotMapが生成されたTaskRowはvalidStatus.isValid=trueになる', async () => {
            const creator = new CsvProjectCreator(testCsvPath)
            const project = await creator.createProject()

            const taskRows = project.toTaskRows()
            const task1 = taskRows.find((t) => t.id === 1)!

            // 全ての必須データが揃っているタスクはisValid=true
            expect(task1.validStatus.isValid).toBe(true)
        })

        it('日付がないタスクはvalidStatus.isValid=falseになる', async () => {
            // 日付なしのCSVを作成
            const noDateFilename = 'NoDateTask_20250115.csv'
            const noDatePath = path.join(FIXTURES_DIR, noDateFilename)
            const content = `タスクID,名称,担当,予定工数,予定開始日,予定終了日,実績開始日,実績終了日,進捗率,稼働予定日数,PV,EV
1,日付なしタスク,担当者,5,,,,,0,5,5,0`
            fs.writeFileSync(noDatePath, content, 'utf-8')

            try {
                const creator = new CsvProjectCreator(noDatePath)
                const project = await creator.createProject()
                const task = project.toTaskRows()[0]

                // 日付がないのでisValid=false
                expect(task.validStatus.isValid).toBe(false)
                expect(task.validStatus.invalidReason).toContain('日付エラー')
            } finally {
                cleanupFile(noDatePath)
            }
        })
    })
})
