/**
 * spec: phase3-earned-schedule-0.0.32 要件1, 要件2, 要件3
 *
 * EarnedSchedule 純関数コアの単体テスト。
 * 手組み小規模プロジェクト（5稼働日 × workload5、workloadPerDay=1 →
 * 累積PV曲線 [1,2,3,4,5]）を基準に、手計算一致・境界値を検証する。
 *
 * 索引規約（design.md 補足参照）:
 * - pvCurve[i] は i 番目の稼働日終了時点の累積PV（開始日 = 0 番目の稼働日）
 * - ES は「到達した稼働日数」（仮想始点 C(0)=0、C(i)=pvCurve[i-1] の 1 始点表現）
 * - EV=pvCurve[k-1] にちょうど一致 → ES=k（k 稼働日ぶん到達）
 */
import { calculateEarnedSchedule, EarnedScheduleInput } from '../EarnedSchedule'

/** 5稼働日 × workloadPerDay=1（workload=5）の累積PV曲線 */
const PV_CURVE_5DAYS = [1, 2, 3, 4, 5]
const PD_5DAYS = 5

const input = (overrides: Partial<EarnedScheduleInput>): EarnedScheduleInput => ({
    pvCurve: PV_CURVE_5DAYS,
    ev: 0,
    at: 3,
    pd: PD_5DAYS,
    ...overrides,
})

describe('calculateEarnedSchedule（純関数コア）', () => {
    describe('要件1.1: 線形補間による ES 算出（手計算一致）', () => {
        it('EV が曲線上の点に一致（EV=3, AT=3）→ ES=3', () => {
            const result = calculateEarnedSchedule(input({ ev: 3, at: 3 }))
            expect(result).toBeDefined()
            expect(result!.es).toBe(3)
        })

        it('補間中間値: EV=2.5 → ES=2.5（PV(2)=2 <= 2.5 < PV(3)=3 の区間を線形補間）', () => {
            const result = calculateEarnedSchedule(input({ ev: 2.5, at: 3 }))
            expect(result!.es).toBeCloseTo(2.5, 10)
        })

        it('補間中間値: EV=4.2 → ES=4.2', () => {
            const result = calculateEarnedSchedule(input({ ev: 4.2, at: 5 }))
            expect(result!.es).toBeCloseTo(4.2, 10)
        })

        it('EV が最初の区間内（EV=0.5）→ ES=0.5（仮想始点 0 からの補間）', () => {
            const result = calculateEarnedSchedule(input({ ev: 0.5, at: 1 }))
            expect(result!.es).toBeCloseTo(0.5, 10)
        })
    })

    describe('要件1.2: EV=0 → ES=0', () => {
        it('EV=0 → ES=0、SV(t)=-AT', () => {
            const result = calculateEarnedSchedule(input({ ev: 0, at: 3 }))
            expect(result!.es).toBe(0)
            expect(result!.svT).toBe(-3)
        })
    })

    describe('要件1.3: EV >= BAC → ES=PD（外挿しない）', () => {
        it('EV=BAC（=5）→ ES=PD（=5）', () => {
            const result = calculateEarnedSchedule(input({ ev: 5, at: 5 }))
            expect(result!.es).toBe(PD_5DAYS)
        })

        it('EV > BAC（EV=7）→ ES=PD にクランプ', () => {
            const result = calculateEarnedSchedule(input({ ev: 7, at: 5 }))
            expect(result!.es).toBe(PD_5DAYS)
        })
    })

    describe('要件1.4: 先行（EV >= AT時点の累積PV）→ ES >= AT', () => {
        it('EV=4 >= PV(AT=3)=3 → ES=4 >= AT=3', () => {
            const result = calculateEarnedSchedule(input({ ev: 4, at: 3 }))
            expect(result!.es).toBe(4)
            expect(result!.es).toBeGreaterThanOrEqual(result!.at)
            expect(result!.svT).toBe(1) // 正 = 先行
        })
    })

    describe('要件1.5: 遅延（EV < AT時点の累積PV）→ ES < AT', () => {
        it('EV=2 < PV(AT=3)=3 → ES=2 < AT=3', () => {
            const result = calculateEarnedSchedule(input({ ev: 2, at: 3 }))
            expect(result!.es).toBe(2)
            expect(result!.es).toBeLessThan(result!.at)
            expect(result!.svT).toBe(-1) // 負 = 遅延
        })
    })

    describe('要件1.6: ΔPV=0 区間（プラトー）では補間せず区間下端の k を用いる', () => {
        // 曲線 [1,2,2,3,5]: 2稼働日目〜3稼働日目に PV が増えないプラトーがある
        const plateauCurve = [1, 2, 2, 3, 5]

        it('EV がプラトー値に一致（EV=2）→ ES はプラトー末尾の整数値 3（NaN にならない）', () => {
            const result = calculateEarnedSchedule(input({ pvCurve: plateauCurve, ev: 2, at: 4 }))
            expect(result!.es).toBe(3)
            expect(Number.isNaN(result!.es)).toBe(false)
        })

        it('EV がプラトー直後の区間内（EV=2.5）→ ES=3.5（プラトー末尾から補間）', () => {
            const result = calculateEarnedSchedule(input({ pvCurve: plateauCurve, ev: 2.5, at: 4 }))
            expect(result!.es).toBeCloseTo(3.5, 10)
        })
    })

    describe('要件1.7: 算出不能な前提では undefined', () => {
        it('曲線が空 → undefined', () => {
            expect(
                calculateEarnedSchedule(input({ pvCurve: [], ev: 1, at: 1, pd: 5 }))
            ).toBeUndefined()
        })

        it('PD=0 → undefined', () => {
            expect(calculateEarnedSchedule(input({ ev: 1, at: 1, pd: 0 }))).toBeUndefined()
        })
    })

    describe('要件2.1/2.2: AT と PD を結果に含む', () => {
        it('at, pd が入力どおり返る', () => {
            const result = calculateEarnedSchedule(input({ ev: 3, at: 3 }))
            expect(result!.at).toBe(3)
            expect(result!.pd).toBe(PD_5DAYS)
        })
    })

    describe('要件2.3/2.4: SPI(t) = ES / AT（AT=0 は undefined）', () => {
        it('AT=3, EV=2.5 → SPI(t)=2.5/3', () => {
            const result = calculateEarnedSchedule(input({ ev: 2.5, at: 3 }))
            expect(result!.spiT).toBeCloseTo(2.5 / 3, 10)
        })

        it('AT=0 → SPI(t)=undefined、SV(t)=ES', () => {
            const result = calculateEarnedSchedule(input({ ev: 2, at: 0 }))
            expect(result!.spiT).toBeUndefined()
            expect(result!.svT).toBe(result!.es) // SV(t) = ES - 0
        })
    })

    describe('要件2.5: SV(t) = ES − AT（常に算出）', () => {
        it('EV=2.5, AT=4 → SV(t)=-1.5（稼働日1.5日の遅延）', () => {
            const result = calculateEarnedSchedule(input({ ev: 2.5, at: 4 }))
            expect(result!.svT).toBeCloseTo(-1.5, 10)
        })
    })

    describe('要件2.6/2.7: IEAC(t) = PD / SPI(t)（SPI(t) が undefined/0以下は undefined）', () => {
        it('EV=2.5, AT=3 → IEAC(t) = 5 / (2.5/3) = 6', () => {
            const result = calculateEarnedSchedule(input({ ev: 2.5, at: 3 }))
            expect(result!.iEacT).toBeCloseTo(6, 10)
        })

        it('SPI(t)=0（EV=0, AT>=1）→ IEAC(t)=undefined', () => {
            const result = calculateEarnedSchedule(input({ ev: 0, at: 3 }))
            expect(result!.spiT).toBe(0)
            expect(result!.iEacT).toBeUndefined()
        })

        it('SPI(t)=undefined（AT=0）→ IEAC(t)=undefined', () => {
            const result = calculateEarnedSchedule(input({ ev: 2, at: 0 }))
            expect(result!.iEacT).toBeUndefined()
        })
    })

    describe('要件3.1: 終盤の古典 SPI 1.0 収束 vs SPI(t) 乖離（コアレベルの数値実証）', () => {
        it('EV=9.9/BAC=10（古典SPI相当=0.99）でも AT=15 なら SPI(t)=0.66 と遅延を示す', () => {
            // 10稼働日の計画（BAC=10）に対し、計画終了から5稼働日経過（AT=15）した時点で
            // EV=9.9 まで到達しているケース。
            const pvCurve = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            const result = calculateEarnedSchedule(input({ pvCurve, ev: 9.9, at: 15, pd: 10 }))

            // 古典 SPI 相当（EV ÷ 基準日時点累積PV。終盤は累積PV=BAC）は 1.0 近傍
            const classicSpi = 9.9 / 10
            expect(classicSpi).toBeGreaterThan(0.95)

            // 一方 SPI(t) は 9.9 / 15 = 0.66 と明確に遅延を示す
            expect(result!.es).toBeCloseTo(9.9, 10)
            expect(result!.spiT).toBeCloseTo(9.9 / 15, 10)
            expect(result!.spiT!).toBeLessThan(0.7)
            expect(classicSpi - result!.spiT!).toBeGreaterThan(0.25)

            // SV(t) = 9.9 - 15 = -5.1 稼働日の遅延
            expect(result!.svT).toBeCloseTo(-5.1, 10)
        })
    })
})
