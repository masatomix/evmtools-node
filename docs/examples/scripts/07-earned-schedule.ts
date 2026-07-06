#!/usr/bin/env ts-node
/**
 * 07-earned-schedule.md のコード検証スクリプト
 * spec: phase3-earned-schedule-0.0.32（Earned Schedule）
 *
 * 実行方法（リポジトリルートから）:
 *   npx ts-node docs/examples/scripts/07-earned-schedule.ts
 */

import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../../../src/domain/Project'
import { TaskNode } from '../../../src/domain/TaskNode'

// ============================================
// ヘルパー: 1日タスクを生成
// ============================================
function createTask(id: number, name: string, date: Date, progressRate: number, baseDate: Date): TaskNode {
    const workload = 1
    const pv = date <= baseDate ? workload : 0
    const ev = workload * progressRate
    const plotMap = new Map<number, boolean>()
    plotMap.set(date2Sn(date), true)

    return new TaskNode(
        id, id, 1, name,
        undefined, // assignee
        workload,
        date, date, // startDate, endDate
        undefined, undefined, // actual dates
        progressRate,
        1, // scheduledWorkDays
        pv, ev,
        pv > 0 ? ev / pv : 0, // spi
        undefined, undefined, undefined, undefined, // expectedProgressDate, delayDays, remarks, parentId
        true, // isLeaf
        plotMap,
        []
    )
}

// 計画10稼働日: 2025-08-01(金), 08-04〜08(月〜金), 08-11〜14(月〜木)
const plannedDays = [
    '2025-08-01', '2025-08-04', '2025-08-05', '2025-08-06', '2025-08-07',
    '2025-08-08', '2025-08-11', '2025-08-12', '2025-08-13', '2025-08-14',
].map((d) => new Date(d))

function buildProject(name: string, progressRates: number[], baseDate: Date): Project {
    const tasks = plannedDays.map((date, i) =>
        createTask(i + 1, `タスク${i + 1}`, date, progressRates[i], baseDate)
    )
    return new Project(tasks, baseDate, [], plannedDays[0], plannedDays[plannedDays.length - 1], name)
}

// ============================================
// Example 1: 終盤の隠れた失速 — 古典SPIは 0.99、SPI(t) は 0.66
// ============================================
function example1() {
    console.log('=== Example 1: 終盤の隠れた失速（基準日 = 計画終了の1週間後）===\n')

    // 全タスク 99% のまま完了しない。基準日は計画終了(8/14)の1週間後 8/21
    const baseDate = new Date('2025-08-21')
    const project = buildProject('終盤失速', Array(10).fill(0.99), baseDate)

    const stats = project.getStatistics()
    console.log(`古典SPI = ${stats.spi?.toFixed(2)}  ← 1.0 目前。「ほぼ順調」に見える`)

    const es = project.calculateEarnedSchedule()
    if (es) {
        console.log(`ES      = ${es.es.toFixed(1)} 稼働日（出来高を時間に換算）`)
        console.log(`AT      = ${es.at} 稼働日（実際の経過時間）`)
        console.log(`SPI(t)  = ${es.spiT?.toFixed(2)}  ← 時間ベースでは重度の遅延`)
        console.log(`SV(t)   = ${es.svT.toFixed(1)} 稼働日（何稼働日遅れているか）`)
        console.log(`IEAC(t) = ${es.iEacT?.toFixed(1)} 稼働日（この効率だと総所要日数）`)
        console.log(`予測完了日 = ${es.esForecastDate?.toLocaleDateString('ja-JP')}`)
    }
    console.log('')
}

// ============================================
// Example 2: 中盤では古典SPIと SPI(t) はほぼ一致する
// ============================================
function example2() {
    console.log('=== Example 2: 中盤の比較（基準日 = 6稼働日目）===\n')

    // 6稼働日経過時点で 4.5 タスク分完了（少し遅れ）
    const rates = [1, 1, 1, 1, 0.5, 0, 0, 0, 0, 0]
    const baseDate = new Date('2025-08-08') // 6稼働日目
    const project = buildProject('中盤', rates, baseDate)

    const stats = project.getStatistics()
    const es = project.calculateEarnedSchedule()
    console.log(`古典SPI = ${stats.spi?.toFixed(2)} / SPI(t) = ${es?.spiT?.toFixed(2)}`)
    console.log('→ 中盤は両者がほぼ一致する。乖離が拡大するのは終盤（Example 1）')
    console.log('')
}

// ============================================
// Example 3: フィルタで工程別の ES を見る（どこが足を引っ張っているか）
// ============================================
function example3() {
    console.log('=== Example 3: フィルタ併用（工程別の時間効率）===\n')

    // 前半5日=設計工程、後半5日=実装工程。基準日は6稼働日目
    const baseDate = new Date('2025-08-08')
    const rates = [1, 1, 0.5, 0, 0, 0.5, 0, 0, 0, 0]
    const tasks = plannedDays.map((date, i) =>
        createTask(i + 1, i < 5 ? `設計${i + 1}` : `実装${i + 1}`, date, rates[i], baseDate)
    )
    const project = new Project(tasks, baseDate, [], plannedDays[0], plannedDays[9], '工程別')

    const all = project.calculateEarnedSchedule()
    const design = project.calculateEarnedSchedule({ filter: '設計' })
    const impl = project.calculateEarnedSchedule({ filter: '実装' })
    console.log(`全体:           ES=${all?.es.toFixed(1)} SPI(t)=${all?.spiT?.toFixed(2)}`)
    console.log(`設計工程のみ:   ES=${design?.es.toFixed(1)} SPI(t)=${design?.spiT?.toFixed(2)} ← 足を引っ張っている`)
    console.log(`実装工程のみ:   ES=${impl?.es.toFixed(1)} SPI(t)=${impl?.spiT?.toFixed(2)} ← ほぼ計画どおり`)
    console.log('※ AT/PD はプロジェクト全期間で共通（部分集合でも変わらない）')
    console.log('')
}

example1()
example2()
example3()
