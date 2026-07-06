#!/usr/bin/env ts-node
/**
 * 08-ev-method.md のコード検証スクリプト
 * spec: phase5-evmethod-knowledge-0.0.34（EV 算定方式オプション）
 *
 * 実行方法（リポジトリルートから）:
 *   npx ts-node docs/examples/scripts/08-ev-method.ts
 */

import { date2Sn } from 'excel-csv-read-write'
import { Project } from '../../../src/domain/Project'
import { TaskNode } from '../../../src/domain/TaskNode'

// ============================================
// ヘルパー: 5稼働日にまたがるタスク（workload 5人日）
// ============================================
const days = ['2025-08-01', '2025-08-04', '2025-08-05', '2025-08-06', '2025-08-07'].map(
    (d) => new Date(d)
)
const baseDate = new Date('2025-08-05') // 3稼働日目（中間）

function createTask(
    id: number,
    name: string,
    progressRate: number,
    actualStartDate: Date | undefined
): TaskNode {
    const workload = 5
    const plotMap = new Map<number, boolean>()
    for (const d of days) plotMap.set(date2Sn(d), true)
    const plannedDays = days.filter((d) => d <= baseDate).length
    const pv = (workload / days.length) * plannedDays // 基準日までの計画値 = 3
    const ev = workload * progressRate

    return new TaskNode(
        id, id, 1, name,
        undefined, // assignee
        workload,
        days[0], days[days.length - 1],
        actualStartDate, undefined, // actualStartDate, actualEndDate
        progressRate,
        days.length, // scheduledWorkDays
        pv, ev,
        pv > 0 ? ev / pv : 0,
        undefined, undefined, undefined, undefined,
        true, // isLeaf
        plotMap,
        []
    )
}

const started = days[0]
const tasks = [
    createTask(1, '設計（完了）', 1.0, started),
    createTask(2, '実装（40%・着手記録あり）', 0.4, started),
    createTask(3, '試験（40%・着手記録なし）', 0.4, undefined), // ← 50/50 の罠の実演
    createTask(4, 'リリース（未着手）', 0, undefined),
]
const project = new Project(tasks, baseDate, [], days[0], days[days.length - 1], 'evMethod例')

// ============================================
// Example 1: 3方式の EV / SPI 比較
// ============================================
console.log('=== Example 1: 3方式の EV / SPI 比較 ===\n')
console.log('| 方式 | EV | SPI | 意味 |')
console.log('|------|-----|------|------|')
for (const evMethod of ['progressRate', '0/100', '50/50'] as const) {
    const s = project.getStatistics({ evMethod })
    console.log(
        `| ${evMethod} | ${s.totalEv} | ${s.spi?.toFixed(3)} | ` +
            (evMethod === 'progressRate'
                ? '進捗率按分（既定・従来どおり）|'
                : evMethod === '0/100'
                  ? '完了時のみ計上（最も保守的）|'
                  : '着手で半分+完了で残り |')
    )
}
console.log('')

// ============================================
// Example 2: 50/50 の罠 — actualStartDate が無いと EV=0
// ============================================
console.log('=== Example 2: 50/50 の着手判定は actualStartDate ===\n')
const s5050 = project.getStatistics({ evMethod: '50/50' })
console.log(`50/50 の EV = ${s5050.totalEv}`)
console.log('内訳: 完了5.0 + 着手記録あり2.5 + 着手記録なし0 + 未着手0')
console.log('→ タスク3 は進捗率40%でも actualStartDate 未入力のため EV=0（主観排除のため意図的）')
console.log('→ 50/50 を使う場合は実績開始日の入力運用が前提')
console.log('')

// ============================================
// Example 3: 保守的な完了予測（0/100）と ES への反映
// ============================================
console.log('=== Example 3: 完了予測・Earned Schedule への反映 ===\n')
for (const evMethod of ['progressRate', '0/100'] as const) {
    const f = project.calculateCompletionForecast({ evMethod })
    const es = project.calculateEarnedSchedule({ evMethod })
    console.log(
        `${evMethod.padEnd(12)}: 残作業(ETC')=${f?.etcPrime?.toFixed(1)}人日 ` +
            `予測完了=${f?.forecastDate?.toLocaleDateString('ja-JP')} SPI(t)=${es?.spiT?.toFixed(2)}`
    )
}
console.log('→ 0/100 は仕掛かり分を EV に数えないため、予測が保守的（遅め）に出る')
console.log('→ PV/BAC は方式によらず不変（EV 側だけが変わる）')
