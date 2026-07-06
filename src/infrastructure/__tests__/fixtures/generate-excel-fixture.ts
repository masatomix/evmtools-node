/**
 * Excel 統合テスト用フィクスチャ生成スクリプト
 *
 * spec: excel-io-tests（回帰の穴埋め）
 *
 * 生成物（すべて本スクリプトと同じ fixtures/ ディレクトリに出力）:
 * - ExcelTest.xlsx      : 実型に忠実な小規模 WBS（正常系）
 * - MissingGantt.xlsx   : 「ガントチャート」シートが無い異常系
 * - MissingHoliday.xlsx : 「休日テーブル」シートが無い異常系
 *
 * 再生成方法:
 *   npx ts-node src/infrastructure/__tests__/fixtures/generate-excel-fixture.ts
 *
 * レイアウト（ガントチャート。列インデックスは usedRange 先頭=A列 起点の 0 始まり。
 * TaskRowCreatorImpl.convertToTaskRow の数値キー→フィールド対応に合わせている）:
 * - 行1: 基準日行。列インデックス26（AA列）に基準日のシリアル値
 * - 行2: ヘッダ行。列インデックス0（A列）に '#'、列インデックス27以降に日付シリアル値
 * - 行3以降: タスク行
 *   - 0:#(sharp) / 1:ID / 4-12:LV1..LV9(タスク名) / 13:担当 / 14:予定工数
 *   - 15:開始日 / 16:終了日 / 17:実績開始 / 18:実績終了 / 19:進捗率
 *   - 20:稼働予定日数 / 21:PV / 22:EV / 23:SPI / 24:進捗応当日 / 25:遅延日数 / 26:備考
 *   - 27以降: プロット（稼働予定日に 1）
 *
 * カレンダー設計（2025年1月）:
 * - プロット列: 2025/01/05(日)〜2025/01/18(土)（土日と祝日を跨ぐ）
 * - 基準日: 2025/01/10(金)
 * - 休日テーブル: 2025/01/01(元日) と 2025/01/14(テスト祝日。タスク期間内の火曜)
 */
import * as path from 'path'
import { createWorkbook, date2Sn, toFileAsync } from 'excel-csv-read-write'
// 型のみ参照（実行時は excel-csv-read-write 経由で使用するため runtime import しない）
import type XlsxPopulate from 'xlsx-populate'

const FIXTURES_DIR = __dirname

// 日付シリアル値（ローカル日付の 0:00 から算出。整数値になるので TZ 非依存）
const sn = (year: number, month1: number, day: number): number =>
    date2Sn(new Date(year, month1 - 1, day))

// プロット列: 2025/01/05(日) 〜 2025/01/18(土) の14日分（列インデックス 27..40）
const PLOT_START_DAY = 5
const PLOT_END_DAY = 18
const plotSerials: number[] = []
for (let day = PLOT_START_DAY; day <= PLOT_END_DAY; day++) {
    plotSerials.push(sn(2025, 1, day))
}

// シリアル値 → プロット列の Excel 列番号（1始まり）。列インデックス27 = 28列目(AB)
const plotColumn = (serial: number): number => 28 + (serial - sn(2025, 1, PLOT_START_DAY))

type TaskFixtureRow = {
    sharp: number
    id: number
    /** タスク名を書く列インデックス（4=LV1, 5=LV2, ...） */
    nameIndex: number
    name: string
    assignee?: string
    workload?: number
    startDay?: number
    endDay?: number
    actualStartDay?: number
    actualEndDay?: number
    progressRate?: number
    scheduledWorkDays?: number
    pv?: number
    ev?: number
    spi?: number
    expectedProgressDay?: number
    delayDays?: number
    remarks?: string
    /** プロットする日（1月の日にち） */
    plotDays: number[]
}

const TASKS: TaskFixtureRow[] = [
    {
        // 親タスク（LV1）。実ファイル同様、土日・祝日込みで全期間プロット
        sharp: 1,
        id: 1,
        nameIndex: 4,
        name: '開発',
        startDay: 6,
        endDay: 17,
        plotDays: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    },
    {
        // 完了タスク: 01/06(月)〜01/10(金) 5営業日
        sharp: 2,
        id: 2,
        nameIndex: 5,
        name: '設計',
        assignee: '田中',
        workload: 5,
        startDay: 6,
        endDay: 10,
        actualStartDay: 6,
        actualEndDay: 10,
        progressRate: 1,
        scheduledWorkDays: 5,
        pv: 5,
        ev: 5,
        spi: 1,
        plotDays: [6, 7, 8, 9, 10],
    },
    {
        // 仕掛タスク: 01/08(水)〜01/16(木)。土日(11,12)と祝日(14)を跨ぐ6稼働日
        sharp: 3,
        id: 3,
        nameIndex: 5,
        name: '実装',
        assignee: '鈴木',
        workload: 8,
        startDay: 8,
        endDay: 16,
        actualStartDay: 8,
        progressRate: 0.4,
        scheduledWorkDays: 6,
        pv: 4,
        ev: 3.2,
        spi: 0.8,
        expectedProgressDay: 9,
        delayDays: 1,
        remarks: '備考テスト',
        plotDays: [8, 9, 10, 13, 15, 16],
    },
    {
        // 未着手タスク: 01/15(水)〜01/17(金) 3稼働日
        sharp: 4,
        id: 4,
        nameIndex: 5,
        name: 'テスト',
        assignee: '田中',
        workload: 3,
        startDay: 15,
        endDay: 17,
        progressRate: 0,
        scheduledWorkDays: 3,
        pv: 3,
        ev: 0,
        plotDays: [15, 16, 17],
    },
]

// 列インデックス（0始まり）→ Excel 列番号（1始まり）
const col = (index: number): number => index + 1

/** ガントチャートシートを構築する */
const buildGanttSheet = (sheet: XlsxPopulate.Sheet): void => {
    // 行1: 基準日行（列インデックス26 = AA列に基準日 2025/01/10 のシリアル値）
    sheet.cell(1, col(26)).value(sn(2025, 1, 10))

    // 行2: ヘッダ行
    const headerLabels = [
        '#', // 0
        'ID', // 1
        '工程', // 2
        '種別', // 3
        'LV1', // 4
        'LV2', // 5
        'LV3', // 6
        'LV4', // 7
        'LV5', // 8
        'LV6', // 9
        'LV7', // 10
        'LV8', // 11
        'LV9', // 12
        '担当', // 13
        '予定工数', // 14
        '予定開始日', // 15
        '予定終了日', // 16
        '実績開始日', // 17
        '実績終了日', // 18
        '進捗率', // 19
        '稼働予定日数', // 20
        'PV', // 21
        'EV', // 22
        'SPI', // 23
        '進捗応当日', // 24
        '遅延日数', // 25
        '備考', // 26
    ]
    headerLabels.forEach((label, index) => {
        sheet.cell(2, col(index)).value(label)
    })
    // ヘッダ行の列インデックス27以降: 日付シリアル値
    plotSerials.forEach((serial) => {
        sheet.cell(2, plotColumn(serial)).value(serial)
    })

    // 行3以降: タスク行
    TASKS.forEach((task, i) => {
        const row = 3 + i
        sheet.cell(row, col(0)).value(task.sharp)
        sheet.cell(row, col(1)).value(task.id)
        sheet.cell(row, col(task.nameIndex)).value(task.name)
        if (task.assignee !== undefined) sheet.cell(row, col(13)).value(task.assignee)
        if (task.workload !== undefined) sheet.cell(row, col(14)).value(task.workload)
        if (task.startDay !== undefined) sheet.cell(row, col(15)).value(sn(2025, 1, task.startDay))
        if (task.endDay !== undefined) sheet.cell(row, col(16)).value(sn(2025, 1, task.endDay))
        if (task.actualStartDay !== undefined)
            sheet.cell(row, col(17)).value(sn(2025, 1, task.actualStartDay))
        if (task.actualEndDay !== undefined)
            sheet.cell(row, col(18)).value(sn(2025, 1, task.actualEndDay))
        if (task.progressRate !== undefined) sheet.cell(row, col(19)).value(task.progressRate)
        if (task.scheduledWorkDays !== undefined)
            sheet.cell(row, col(20)).value(task.scheduledWorkDays)
        if (task.pv !== undefined) sheet.cell(row, col(21)).value(task.pv)
        if (task.ev !== undefined) sheet.cell(row, col(22)).value(task.ev)
        if (task.spi !== undefined) sheet.cell(row, col(23)).value(task.spi)
        if (task.expectedProgressDay !== undefined)
            sheet.cell(row, col(24)).value(sn(2025, 1, task.expectedProgressDay))
        if (task.delayDays !== undefined) sheet.cell(row, col(25)).value(task.delayDays)
        if (task.remarks !== undefined) sheet.cell(row, col(26)).value(task.remarks)
        task.plotDays.forEach((day) => {
            sheet.cell(row, plotColumn(sn(2025, 1, day))).value(1)
        })
    })
}

/** 休日テーブルシートを構築する */
const buildHolidaySheet = (sheet: XlsxPopulate.Sheet): void => {
    sheet.cell(1, 1).value('日付')
    sheet.cell(1, 2).value('祝日')
    sheet.cell(1, 3).value('祝日定義ルール')
    sheet.cell(1, 4).value('振替')

    sheet.cell(2, 1).value(sn(2025, 1, 1))
    sheet.cell(2, 2).value('元日')
    sheet.cell(2, 3).value('固定')

    sheet.cell(3, 1).value(sn(2025, 1, 14))
    sheet.cell(3, 2).value('テスト祝日')
    sheet.cell(3, 3).value('固定')
}

const generate = async (): Promise<void> => {
    // 正常系: ガントチャート + 休日テーブル
    const workbook = await createWorkbook()
    buildGanttSheet(workbook.sheet(0).name('ガントチャート'))
    buildHolidaySheet(workbook.addSheet('休日テーブル'))
    await toFileAsync(workbook, path.join(FIXTURES_DIR, 'ExcelTest.xlsx'))

    // 異常系: 「ガントチャート」シート欠損
    const noGantt = await createWorkbook()
    buildHolidaySheet(noGantt.sheet(0).name('休日テーブル'))
    await toFileAsync(noGantt, path.join(FIXTURES_DIR, 'MissingGantt.xlsx'))

    // 異常系: 「休日テーブル」シート欠損
    const noHoliday = await createWorkbook()
    buildGanttSheet(noHoliday.sheet(0).name('ガントチャート'))
    await toFileAsync(noHoliday, path.join(FIXTURES_DIR, 'MissingHoliday.xlsx'))

    console.log(`generated fixtures in ${FIXTURES_DIR}`)
}

generate().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
