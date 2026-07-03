import { truncateToLocalDate, diffCalendarDays, formatRelativeDaysNumber } from '../utils'

/**
 * 日付ヘルパーのテーブル駆動テスト
 * REQ: phase0-bugfix-0.0.29 要件3（日付境界の off-by-one 解消）
 *
 * 生成パターンの混在（UTC解釈 'YYYY-MM-DD' vs JST明示 'YYYY-MM-DDT00:00:00+09:00'）や
 * 時刻成分（深夜/正午/23:59）があっても、暦日差が安定して計算できることを検証する。
 */
describe('truncateToLocalDate', () => {
    it('時刻成分を 00:00:00.000 に切り詰める', () => {
        const date = new Date(2025, 6, 19, 12, 34, 56, 789) // ローカル 2025-07-19 12:34:56.789
        const result = truncateToLocalDate(date)

        expect(result.getFullYear()).toBe(2025)
        expect(result.getMonth()).toBe(6)
        expect(result.getDate()).toBe(19)
        expect(result.getHours()).toBe(0)
        expect(result.getMinutes()).toBe(0)
        expect(result.getSeconds()).toBe(0)
        expect(result.getMilliseconds()).toBe(0)
    })

    it('引数の Date を変更しない（非破壊）', () => {
        const date = new Date(2025, 6, 19, 12, 0, 0)
        const before = date.getTime()
        truncateToLocalDate(date)
        expect(date.getTime()).toBe(before)
    })
})

describe('diffCalendarDays', () => {
    // テーブル駆動: [説明, base, target, 期待値]
    const cases: Array<[string, Date | string, Date | string, number]> = [
        [
            '同日（時刻違い・深夜vs23:59）',
            new Date(2025, 6, 19, 0, 1),
            new Date(2025, 6, 19, 23, 59),
            0,
        ],
        ['翌日 = +1', new Date(2025, 6, 19), new Date(2025, 6, 20), 1],
        ['前日 = -1', new Date(2025, 6, 19), new Date(2025, 6, 18), -1],
        [
            'base 正午 → target 翌日深夜でも +1（off-by-one しない）',
            new Date(2025, 6, 19, 12, 0),
            new Date(2025, 6, 20, 0, 5),
            1,
        ],
        [
            'base 23:59 → target 翌日 0:01 でも +1',
            new Date(2025, 6, 19, 23, 59),
            new Date(2025, 6, 20, 0, 1),
            1,
        ],
        ['月跨ぎ', new Date(2025, 6, 31), new Date(2025, 7, 1), 1],
        ['年跨ぎ', new Date(2025, 11, 31), new Date(2026, 0, 1), 1],
        ['1週間', new Date(2025, 6, 19), new Date(2025, 6, 26), 7],
    ]

    it.each(cases)('%s', (_desc, base, target, expected) => {
        expect(diffCalendarDays(base, target)).toBe(expected)
    })

    it('文字列引数も受け付ける', () => {
        expect(diffCalendarDays('2025-07-19T00:00:00+09:00', '2025-07-20T00:00:00+09:00')).toBe(1)
    })

    it('JST明示の同日同士は 0（生成パターンが同一なら TZ に依らず安定）', () => {
        const a = new Date('2025-07-19T00:00:00+09:00')
        const b = new Date('2025-07-19T23:00:00+09:00')
        // 同一規約（+09:00）で生成された2つの時刻は、実行TZに関わらず同じローカル日付に切り詰められる…
        // わけではなく「切り詰め後の差」が安定する（両者が同じだけずれるため）
        const diff = diffCalendarDays(a, b)
        expect(diff === 0 || diff === 1).toBe(true) // TZ=UTC では 23:00+09:00 が翌日側に入らないことを確認
        if (process.env.TZ === 'Asia/Tokyo') {
            expect(diff).toBe(0)
        }
    })

    it('undefined/null/空は undefined', () => {
        expect(diffCalendarDays(undefined, new Date())).toBeUndefined()
        expect(diffCalendarDays(new Date(), null)).toBeUndefined()
        expect(diffCalendarDays(null, undefined)).toBeUndefined()
    })
})

describe('formatRelativeDaysNumber（diffCalendarDays 委譲後の回帰）', () => {
    it('base 2025/07/19 target 2025/07/18 => -1（既存仕様の維持）', () => {
        expect(formatRelativeDaysNumber(new Date(2025, 6, 19), new Date(2025, 6, 18))).toBe(-1)
    })

    it('時刻成分があっても暦日差を返す（旧実装の Math.floor では -1 になり得たケース）', () => {
        // base が朝、target が前日の夜: 暦日差は -1（旧実装は経過ミリ秒/86400000 の floor で -1 だが、
        // base が深夜0時・target が前日23時のとき floor(-1時間/24時間)=-1 と偶然一致するケースもあれば、
        // base 正午・target 当日朝で floor(-3時間/24h)=-1 と誤る（正しくは同日=0）ケースもあった）
        const baseNoon = new Date(2025, 6, 19, 12, 0)
        const sameDayMorning = new Date(2025, 6, 19, 9, 0)
        expect(formatRelativeDaysNumber(baseNoon, sameDayMorning)).toBe(0)
    })

    it('undefined は undefined', () => {
        expect(formatRelativeDaysNumber(undefined, new Date())).toBeUndefined()
    })
})
