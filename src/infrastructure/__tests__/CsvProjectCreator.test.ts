/**
 * CsvProjectCreator テスト
 *
 * 仕様書: docs/specs/domain/CsvProjectCreator.spec.yaml
 * 要件ID: REQ-CSV-001
 *
 * テストケースID対応:
 * - TC-CSV-001: UTF-8のCSVファイルからProjectを生成できる
 * - TC-CSV-002: Shift-JISのCSVファイルからProjectを生成できる
 * - TC-CSV-003: 進捗率のパーセント表記を正規化する
 * - TC-CSV-004: 存在しないファイルパスでエラーが発生する
 * - TC-CSV-005: ファイル名パターン不一致でエラーが発生する
 * - TC-CSV-006: 不正な行があっても処理を継続する
 *
 * 同値クラス:
 * - EQ-CSV-001〜005: ファイル読み込み
 * - EQ-CSV-010〜015: データ変換
 * - EQ-CSV-020〜023: 日付パース
 */

import * as path from 'path'
import * as fs from 'fs'
import iconv from 'iconv-lite'
import { CsvProjectCreator } from '../CsvProjectCreator'
import { Project } from '../../domain/Project'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

/**
 * ローカル日付を作成（タイムゾーンに依存しない比較用）
 */
function createLocalDate(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day)
}

/**
 * Shift-JIS エンコードのテスト用CSVファイルを生成
 */
function createShiftJisCsvFile(filename: string, content: string): string {
    const filePath = path.join(FIXTURES_DIR, filename)
    const sjisBuffer = iconv.encode(content, 'Shift_JIS')
    fs.writeFileSync(filePath, sjisBuffer)
    return filePath
}

/**
 * テスト後にファイルをクリーンアップ
 */
function cleanupFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }
}

describe('CsvProjectCreator', () => {
    // ========================================
    // 正常系テスト
    // ========================================
    describe('正常系', () => {
        // TC-CSV-001: UTF-8のCSVファイルからProjectを生成できる
        describe('TC-CSV-001: UTF-8 CSVからProject生成', () => {
            it('UTF-8エンコードのCSVファイルからProjectを生成できる', async () => {
                // Given: UTF-8エンコードのCSVファイル "TestProject_20251216.csv"
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')

                // When: CsvProjectCreator(csvPath).createProject()を呼び出す
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                // Then: Projectが返される
                expect(project).toBeInstanceOf(Project)

                // Then: project.nameが "TestProject" である
                expect(project.name).toBe('TestProject')

                // Then: project.baseDateが 2025-12-16 である
                expect(project.baseDate).toEqual(createLocalDate(2025, 12, 16))

                // Then: project.taskNodesに3件のタスクが含まれる
                const taskRows = project.toTaskRows()
                expect(taskRows.length).toBe(3)

                // Then: project.holidayDatasが空配列である
                expect(project.holidayDatas).toEqual([])
            })

            it('タスクの各プロパティが正しく設定されている', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()
                const taskRows = project.toTaskRows()

                // 最初のタスクを検証
                const task1 = taskRows.find((t) => t.id === 1)
                expect(task1).toBeDefined()
                expect(task1!.name).toBe('設計')
                expect(task1!.assignee).toBe('田中')
                expect(task1!.workload).toBe(5)
                expect(task1!.progressRate).toBe(1)
                expect(task1!.isLeaf).toBe(true)
                expect(task1!.parentId).toBeUndefined()
            })
        })

        // TC-CSV-002: Shift-JISのCSVファイルからProjectを生成できる
        describe('TC-CSV-002: Shift-JIS CSVからProject生成', () => {
            const sjisFilename = 'ShiftJisTest_20251216.csv'
            let sjisFilePath: string

            beforeAll(() => {
                const content = `タスクID,名称,担当,予定工数,予定開始日,予定終了日,実績開始日,実績終了日,進捗率,稼働予定日数,PV,EV
1,設計タスク,山田太郎,5,2025/01/06,2025/01/10,2025/01/06,2025/01/10,1,5,5,5
2,日本語タスク名,鈴木花子,10,2025/01/13,2025/01/24,,,0.5,10,10,5`
                sjisFilePath = createShiftJisCsvFile(sjisFilename, content)
            })

            afterAll(() => {
                cleanupFile(sjisFilePath)
            })

            it('Shift-JISエンコードのCSVファイルからProjectを生成できる', async () => {
                // When: CsvProjectCreator(path, { encoding: 'shift-jis' }).createProject()を呼び出す
                const creator = new CsvProjectCreator(sjisFilePath, { encoding: 'shift-jis' })
                const project = await creator.createProject()

                // Then: Projectが返される
                expect(project).toBeInstanceOf(Project)

                // Then: 日本語のタスク名が正しく読み込まれている
                const taskRows = project.toTaskRows()
                expect(taskRows.length).toBe(2)

                const task1 = taskRows.find((t) => t.id === 1)
                expect(task1!.name).toBe('設計タスク')
                expect(task1!.assignee).toBe('山田太郎')

                const task2 = taskRows.find((t) => t.id === 2)
                expect(task2!.name).toBe('日本語タスク名')
                expect(task2!.assignee).toBe('鈴木花子')
            })
        })

        // TC-CSV-003: 進捗率のパーセント表記を正規化する
        describe('TC-CSV-003: 進捗率の正規化', () => {
            it('進捗率が50（%表記）の場合、0.5に正規化される', async () => {
                // Given: 進捗率が "50" と記載されたCSV
                const csvPath = path.join(FIXTURES_DIR, 'PercentProgress_20251216.csv')

                // When: createProject()を呼び出す
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                // Then: TaskRowのprogressRateが 0.5 になる
                const taskRows = project.toTaskRows()
                const task2 = taskRows.find((t) => t.id === 2)
                expect(task2!.progressRate).toBe(0.5)

                // 進捗率=100は1に正規化
                const task1 = taskRows.find((t) => t.id === 1)
                expect(task1!.progressRate).toBe(1)

                // 進捗率=0はそのまま0
                const task3 = taskRows.find((t) => t.id === 3)
                expect(task3!.progressRate).toBe(0)
            })
        })

        // EQ-CSV-003: タスク0件のCSV（ヘッダーのみ）
        describe('EQ-CSV-003: 空のCSV', () => {
            it('ヘッダーのみのCSVからtaskNodes空のProjectを生成する', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'EmptyProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                expect(project).toBeInstanceOf(Project)
                expect(project.toTaskRows()).toEqual([])
                expect(project.name).toBe('EmptyProject')
            })
        })

        // EQ-CSV-020, EQ-CSV-021: 日付形式
        describe('EQ-CSV-020/021: 日付形式パース', () => {
            it('yyyy/MM/dd形式とyyyy-MM-dd形式の両方をパースできる', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'DateFormat_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                const taskRows = project.toTaskRows()

                // yyyy-MM-dd形式
                const task1 = taskRows.find((t) => t.id === 1)
                expect(task1!.startDate).toEqual(createLocalDate(2025, 1, 6))
                expect(task1!.endDate).toEqual(createLocalDate(2025, 1, 10))

                // yyyy/MM/dd形式
                const task2 = taskRows.find((t) => t.id === 2)
                expect(task2!.startDate).toEqual(createLocalDate(2025, 1, 13))
                expect(task2!.endDate).toEqual(createLocalDate(2025, 1, 24))
            })
        })
    })

    // ========================================
    // 異常系テスト
    // ========================================
    describe('異常系', () => {
        // TC-CSV-004: 存在しないファイルパスでエラーが発生する
        describe('TC-CSV-004: ファイル不在エラー', () => {
            it('存在しないファイルパスでエラーが発生する', async () => {
                // Given: 存在しないファイルパス "not_exist.csv"
                const csvPath = path.join(FIXTURES_DIR, 'NotExist_20251216.csv')

                // When: CsvProjectCreator("not_exist.csv").createProject()を呼び出す
                const creator = new CsvProjectCreator(csvPath)

                // Then: ファイルI/Oエラーが発生する
                await expect(creator.createProject()).rejects.toThrow(/File not found|ENOENT/)
            })
        })

        // TC-CSV-005: ファイル名パターン不一致でエラーが発生する
        describe('TC-CSV-005: ファイル名パターン不一致', () => {
            it('ファイル名が規則に従わない場合エラーが発生する', async () => {
                // Given: ファイル名が "invalid_filename.csv"（日付部分なし）
                const csvPath = path.join(FIXTURES_DIR, 'invalid_filename.csv')

                // When: CsvProjectCreator("invalid_filename.csv").createProject()を呼び出す
                const creator = new CsvProjectCreator(csvPath)

                // Then: パースエラーが発生する
                await expect(creator.createProject()).rejects.toThrow(
                    /Invalid filename format|Expected.*_yyyyMMdd\.csv/
                )
            })
        })

        // TC-CSV-006: 不正な行があっても処理を継続する
        describe('TC-CSV-006: 不正行のスキップ', () => {
            it('タスクIDが空または数値でない行はスキップされる', async () => {
                // Given: タスクIDが空の行を含むCSV
                const csvPath = path.join(FIXTURES_DIR, 'InvalidRows_20251216.csv')

                // When: createProject()を呼び出す
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                // Then: Projectが返される
                expect(project).toBeInstanceOf(Project)

                // Then: 不正な行はスキップされる（2件のみ読み込まれる）
                const taskRows = project.toTaskRows()
                expect(taskRows.length).toBe(2) // ID=1とID=3のみ

                // 有効なタスクが含まれていることを確認
                expect(taskRows.map((t) => t.id)).toEqual(expect.arrayContaining([1, 3]))
            })
        })
    })

    // ========================================
    // 同値クラス・境界値テスト
    // ========================================
    describe('同値クラス・境界値', () => {
        // EQ-CSV-010〜014: 進捗率の変換
        describe('進捗率の変換', () => {
            it.each([
                // [入力値, 期待値, 説明]
                ['0.5', 0.5, 'EQ-CSV-010: 小数表記'],
                ['50', 0.5, 'EQ-CSV-011: %表記'],
                ['0', 0, 'EQ-CSV-012: 境界値0'],
                ['1', 1, 'EQ-CSV-013: 境界値1'],
                ['100', 1, 'EQ-CSV-014: 境界値100'],
            ])('進捗率=%sの場合、%sに変換される (%s)', async (input, expected, _desc) => {
                // テスト用に動的にCSVを生成
                const filename = `ProgressTest_${Date.now()}_20251216.csv`
                const content = `タスクID,名称,担当,予定工数,予定開始日,予定終了日,実績開始日,実績終了日,進捗率,稼働予定日数,PV,EV
1,テスト,担当者,5,2025/01/06,2025/01/10,,,${input},5,5,0`
                const filePath = path.join(FIXTURES_DIR, filename)
                fs.writeFileSync(filePath, content, 'utf-8')

                try {
                    const creator = new CsvProjectCreator(filePath)
                    const project = await creator.createProject()
                    const taskRows = project.toTaskRows()
                    expect(taskRows[0].progressRate).toBe(expected)
                } finally {
                    cleanupFile(filePath)
                }
            })
        })

        // EQ-CSV-022: 空文字の日付
        describe('EQ-CSV-022: 空文字の日付', () => {
            it('空文字の日付はundefinedになる', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                // タスク2は実績終了日が空
                const task2 = project.toTaskRows().find((t) => t.id === 2)
                expect(task2!.actualEndDate).toBeUndefined()

                // タスク3は実績開始日・終了日が空
                const task3 = project.toTaskRows().find((t) => t.id === 3)
                expect(task3!.actualStartDate).toBeUndefined()
                expect(task3!.actualEndDate).toBeUndefined()
            })
        })
    })

    // ========================================
    // 不変条件（Invariants）テスト
    // ========================================
    describe('不変条件', () => {
        // INV-CSV-01: createProject()は常にProjectインスタンスを返す
        describe('INV-CSV-01: Projectインスタンスを返す', () => {
            it('正常系では必ずProjectインスタンスを返す', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const result = await creator.createProject()
                expect(result).toBeInstanceOf(Project)
            })
        })

        // INV-CSV-02: Projectは有効な状態
        describe('INV-CSV-02: Projectは有効な状態', () => {
            it('baseDate, taskNodes, holidayDatasが設定されている', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                expect(project.baseDate).toBeDefined()
                expect(project.taskNodes).toBeDefined()
                expect(project.holidayDatas).toBeDefined()
            })
        })

        // INV-CSV-03: 全てのtaskNodesはisLeaf=true
        describe('INV-CSV-03: 全てisLeaf=true', () => {
            it('生成されるtaskNodesは全てisLeaf=true', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                const taskRows = project.toTaskRows()
                expect(taskRows.every((t) => t.isLeaf === true)).toBe(true)
            })
        })
    })

    // ========================================
    // 事後条件（Postconditions）テスト
    // ========================================
    describe('事後条件', () => {
        // POST-CSV-05: 全てのTaskNodeはparentId=undefined
        describe('POST-CSV-05: parentId=undefined', () => {
            it('全てのTaskNodeはparentId=undefined', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                const taskRows = project.toTaskRows()
                expect(taskRows.every((t) => t.parentId === undefined)).toBe(true)
            })
        })

        // POST-CSV-06: startDate/endDateの設定
        describe('POST-CSV-06: startDate/endDate', () => {
            it('startDateはタスクの最小開始日、endDateは最大終了日', async () => {
                const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
                const creator = new CsvProjectCreator(csvPath)
                const project = await creator.createProject()

                // タスク1: 2025/01/06 - 2025/01/10
                // タスク2: 2025/01/13 - 2025/01/24
                // タスク3: 2025/01/27 - 2025/01/29
                expect(project.startDate).toEqual(createLocalDate(2025, 1, 6))
                expect(project.endDate).toEqual(createLocalDate(2025, 1, 29))
            })
        })
    })

    // ========================================
    // エンコーディング自動判定テスト
    // ========================================
    describe('エンコーディング自動判定', () => {
        const autoDetectFilename = 'AutoDetect_20251216.csv'
        let autoDetectFilePath: string

        afterEach(() => {
            if (autoDetectFilePath) {
                cleanupFile(autoDetectFilePath)
            }
        })

        it('encoding=autoでUTF-8を自動判定できる', async () => {
            const csvPath = path.join(FIXTURES_DIR, 'TestProject_20251216.csv')
            const creator = new CsvProjectCreator(csvPath, { encoding: 'auto' })
            const project = await creator.createProject()

            expect(project).toBeInstanceOf(Project)
            const task = project.toTaskRows().find((t) => t.id === 1)
            expect(task!.name).toBe('設計')
        })

        it('encoding=autoでShift-JISを自動判定できる', async () => {
            const content = `タスクID,名称,担当,予定工数,予定開始日,予定終了日,実績開始日,実績終了日,進捗率,稼働予定日数,PV,EV
1,自動判定テスト,日本語担当,5,2025/01/06,2025/01/10,,,0,5,5,0`
            autoDetectFilePath = createShiftJisCsvFile(autoDetectFilename, content)

            const creator = new CsvProjectCreator(autoDetectFilePath, { encoding: 'auto' })
            const project = await creator.createProject()

            expect(project).toBeInstanceOf(Project)
            const task = project.toTaskRows().find((t) => t.id === 1)
            expect(task!.name).toBe('自動判定テスト')
        })
    })
})
