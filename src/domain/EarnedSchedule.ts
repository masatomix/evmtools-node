/**
 * Earned Schedule（ES）の数学コア。
 *
 * spec: phase3-earned-schedule-0.0.32 要件1, 要件2, 要件3
 *
 * 稼働日単位の累積PV曲線と EV/AT/PD から ES・SPI(t)・SV(t)・IEAC(t) を算出する
 * 純関数モジュール。Date/Project/common に依存せず、入出力は数値（+ undefined）のみ。
 * 曲線構築や完了予測日の暦日展開は Project 側（Project.calculateEarnedSchedule）が担う。
 *
 * 索引規約（design.md 補足参照）:
 * - `pvCurve[i]` は i 番目の稼働日（開始日 = 0 番目）終了時点の累積PVで単調非減少。
 *   `pvCurve.length === PD`、末尾 = BAC。
 * - ES は「到達した稼働日数」（1 始点）。仮想始点 C(0)=0、C(i)=pvCurve[i-1] とした曲線上で
 *   `C(k) <= EV < C(k+1)` を満たす最後の k を求め、線形補間する。
 *   EV が pvCurve[k-1] にちょうど一致する場合、ES=k（k 稼働日ぶん到達）。
 */

/** Earned Schedule の算出結果（時間単位はすべて稼働日） */
export interface EarnedScheduleResult {
    /** Earned Schedule（稼働日単位）。現在の EV に計画上到達しているはずだった時点 */
    es: number
    /** Actual Time（開始日→基準日の稼働日数） */
    at: number
    /** SPI(t) = ES / AT。AT=0 のとき undefined */
    spiT: number | undefined
    /** SV(t) = ES − AT（稼働日、正で先行・負で遅延） */
    svT: number
    /** IEAC(t) = PD / SPI(t)（稼働日）。SPI(t) が undefined または 0 以下のとき undefined */
    iEacT: number | undefined
    /** Planned Duration = 計画総稼働日数（PD） */
    pd: number
}

/** 純関数コアへの入力（Date 非依存） */
export interface EarnedScheduleInput {
    /** 稼働日ごとの累積PV曲線（単調非減少、length === pd、末尾が BAC） */
    pvCurve: number[]
    /** 現在の EV（リーフ合計） */
    ev: number
    /** Actual Time（稼働日数） */
    at: number
    /** Planned Duration（稼働日数、通常 pvCurve.length） */
    pd: number
}

/**
 * ES 指標を算出する純関数。
 *
 * - 曲線が空、または PD が 0 以下の場合は undefined（要件 1.7）
 * - EV=0 → ES=0（要件 1.2）、EV >= BAC → ES=PD にクランプ・外挿しない（要件 1.3）
 * - `累積PV(k) <= EV < 累積PV(k+1)` の最後の k を線形補間（要件 1.1）。
 *   区間差が 0 以下なら補間せず ES=k（要件 1.6）
 * - SPI(t) = ES/AT（AT=0 は undefined。要件 2.3, 2.4）、SV(t) = ES−AT（要件 2.5）、
 *   IEAC(t) = PD/SPI(t)（SPI(t) が undefined/0 以下は undefined。要件 2.6, 2.7）
 *
 * @param input 累積PV曲線・EV・AT・PD
 * @returns ES 指標。前提が満たせない場合は undefined
 */
export const calculateEarnedSchedule = (
    input: EarnedScheduleInput
): EarnedScheduleResult | undefined => {
    const { pvCurve, ev, at, pd } = input

    // 要件 1.7: 算出できない前提（曲線が空、計画総稼働日数が 0 等）
    if (pvCurve.length === 0 || pd <= 0) {
        return undefined
    }

    const es = calculateEs(pvCurve, ev, pd)

    // 要件 2.3, 2.4: SPI(t) = ES / AT（AT=0 は undefined）
    const spiT = at >= 1 ? es / at : undefined
    // 要件 2.5: SV(t) = ES − AT（常に算出）
    const svT = es - at
    // 要件 2.6, 2.7: IEAC(t) = PD / SPI(t)（SPI(t) が undefined または 0 以下は undefined）
    const iEacT = spiT !== undefined && spiT > 0 ? pd / spiT : undefined

    return { es, at, spiT, svT, iEacT, pd }
}

/**
 * ES（稼働日単位）を線形補間で算出する。
 *
 * 仮想始点 C(0)=0、C(i)=pvCurve[i-1]（i 稼働日終了時点の累積PV）とした曲線上で
 * `C(k) <= EV < C(k+1)` を満たす最後の k を求め、
 * `ES = k + (EV − C(k)) / (C(k+1) − C(k))` を返す。
 */
const calculateEs = (pvCurve: number[], ev: number, pd: number): number => {
    // 要件 1.2: EV=0 → ES=0
    if (ev <= 0) {
        return 0
    }

    // 要件 1.3: EV >= BAC（曲線末尾）→ ES=PD（曲線を超えて外挿しない）
    const bac = pvCurve[pvCurve.length - 1]
    if (ev >= bac) {
        return pd
    }

    // 仮想始点付き曲線: C(0)=0, C(i)=pvCurve[i-1]（i=1..pvCurve.length、C の末尾 = BAC）
    const curveAt = (i: number): number => (i <= 0 ? 0 : pvCurve[i - 1])

    // 要件 1.1: C(k) <= EV を満たす最後の k を探索
    // （EV < BAC のため k は必ず曲線内に存在し、C(k+1) が参照可能）
    let k = 0
    for (let i = 1; i <= pvCurve.length; i++) {
        if (curveAt(i) <= ev) {
            k = i
        }
    }

    const lower = curveAt(k)
    const delta = curveAt(k + 1) - lower

    // 要件 1.6: 隣接 2 点の累積PV差が 0 以下で線形補間が定義できない場合は
    // 補間せず区間下端の k を用いる（単調非減少曲線では最後の k の性質上
    // delta > 0 が保証されるため、防御的ガード）
    if (delta <= 0) {
        return k
    }

    return k + (ev - lower) / delta
}
