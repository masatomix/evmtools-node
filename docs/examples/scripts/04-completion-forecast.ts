#!/usr/bin/env ts-node
/**
 * 04-completion-forecast.md のコード検証スクリプト
 */

import { ExcelProjectCreator } from '../../../src/infrastructure'
import { ProjectService } from '../../../src/domain'

async function example0_projectStats() {
    console.log('=== Example 0: 前提: プロジェクト統計の取得 ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const stats = project.getStatistics()

    console.log('| 指標 | 値 | 説明 |')
    console.log('|------|-----|------|')
    console.log(`| BAC | ${stats.totalWorkloadExcel}人日 | 総予定工数 |`)
    console.log(`| PV | ${stats.totalPvCalculated}人日 | 計画価値（基準日時点） |`)
    console.log(`| EV | ${stats.totalEv}人日 | 出来高 |`)
    console.log(`| SPI | ${stats.spi?.toFixed(3)} | スケジュール効率 |`)
    console.log('')
}

async function example1_basicForecast() {
    console.log('=== Example 1: 基本的な完了予測 ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const forecast = project.calculateCompletionForecast()

    if (forecast) {
        // 遅延日数を計算
        const scheduledEnd = project.endDate
        const forecastEnd = forecast.forecastDate
        const delayDays =
            scheduledEnd && forecastEnd
                ? Math.ceil((forecastEnd.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
                : undefined

        console.log('| 項目 | 値 |')
        console.log('|------|-----|')
        console.log(`| usedDailyPv | ${forecast.usedDailyPv?.toFixed(3)}人日/day |`)
        console.log(`| usedSpi | ${forecast.usedSpi?.toFixed(3)} |`)
        console.log(`| 残作業量 (BAC - EV) | ${forecast.remainingWork?.toFixed(1)}人日 |`)
        console.log(`| ETC' | ${forecast.etcPrime?.toFixed(1)}人日 |`)
        console.log(`| 完了予測日 | ${forecast.forecastDate?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 予定終了日 | ${project.endDate?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 遅延日数 | ${delayDays}日 |`)
        console.log(`| 信頼度 | ${forecast.confidence} |`)
        console.log(`| 信頼度理由 | ${forecast.confidenceReason} |`)
    }
    console.log('')
}

async function example2_dailyPvOverride() {
    console.log('=== Example 2: 外部指定のパラメータで完了予測する（2パターン比較） ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    // 自動算出（直近7日の平均PVを使用）
    const forecastDefault = project.calculateCompletionForecast()

    // 均等配分の dailyPv を算出（BAC / 総稼働日数）
    const stats = project.getStatistics()
    const bac = stats.totalWorkloadExcel ?? 0
    let totalWorkingDays = 0
    const current = new Date(project.startDate!)
    while (current <= project.endDate!) {
        if (!project.isHoliday(current)) totalWorkingDays++
        current.setDate(current.getDate() + 1)
    }
    const plannedDailyPv = bac / totalWorkingDays

    // 均等配分の dailyPv で予測（PV指定）
    const forecastPlanned = project.calculateCompletionForecast({
        dailyPvOverride: plannedDailyPv,
    })

    // 遅延日数を計算するヘルパー
    const calcDelayDays = (forecastDate: Date | undefined) => {
        const scheduledEnd = project.endDate
        if (!scheduledEnd || !forecastDate) return undefined
        return Math.ceil((forecastDate.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
    }

    console.log(`均等配分 dailyPv: ${plannedDailyPv.toFixed(3)} 人日/day`)
    console.log(`（BAC ${bac}人日 / 総稼働日数 ${totalWorkingDays}日）`)
    console.log('')
    console.log('| 項目 | 自動算出 | PV指定 |')
    console.log('|------|---------|--------|')
    console.log(
        `| usedDailyPv | ${forecastDefault?.usedDailyPv?.toFixed(3)} | ${forecastPlanned?.usedDailyPv?.toFixed(3)} |`
    )
    console.log(
        `| usedSpi | ${forecastDefault?.usedSpi?.toFixed(3)} | ${forecastPlanned?.usedSpi?.toFixed(3)} |`
    )
    console.log(
        `| dailyBurnRate | ${forecastDefault?.dailyBurnRate?.toFixed(3)} | ${forecastPlanned?.dailyBurnRate?.toFixed(3)} |`
    )
    console.log(
        `| 完了予測日 | ${forecastDefault?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastPlanned?.forecastDate?.toLocaleDateString('ja-JP')} |`
    )
    console.log(
        `| 遅延日数 | ${calcDelayDays(forecastDefault?.forecastDate)}日 | ${calcDelayDays(forecastPlanned?.forecastDate)}日 |`
    )
    console.log('')
}

async function example3_threePatternComparison() {
    console.log('=== Example 3: 3パターンの比較（自動算出、PV指定、PV,SPI指定） ===\n')

    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    console.log(`基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}`)

    // 自動算出
    const forecastDefault = projectNow.calculateCompletionForecast()

    // 均等配分の dailyPv を算出
    const stats = projectNow.getStatistics()
    const bac = stats.totalWorkloadExcel ?? 0
    let totalWorkingDays = 0
    const current = new Date(projectNow.startDate!)
    while (current <= projectNow.endDate!) {
        if (!projectNow.isHoliday(current)) totalWorkingDays++
        current.setDate(current.getDate() + 1)
    }
    const plannedDailyPv = bac / totalWorkingDays

    // PV指定
    const forecastPlanned = projectNow.calculateCompletionForecast({
        dailyPvOverride: plannedDailyPv,
    })

    // 直近SPIを計算
    const service = new ProjectService()
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    // PV,SPI指定
    const forecastOptimized = projectNow.calculateCompletionForecast({
        dailyPvOverride: plannedDailyPv,
        spiOverride: recentSpi!,
    })

    // 遅延日数を計算するヘルパー
    const calcDelayDays = (forecastDate: Date | undefined) => {
        const scheduledEnd = projectNow.endDate
        if (!scheduledEnd || !forecastDate) return undefined
        return Math.ceil((forecastDate.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
    }

    console.log(`均等配分 dailyPv: ${plannedDailyPv.toFixed(3)} 人日/day`)
    console.log(`直近SPI: ${recentSpi?.toFixed(3)}`)
    console.log('')
    console.log('| 予測方式 | dailyPv | SPI | dailyBurnRate | 完了予測日 | 遅延日数 |')
    console.log('|---------|---------|-----|---------------|-----------|---------|')
    console.log(
        `| 自動算出 | ${forecastDefault?.usedDailyPv?.toFixed(3)} | ${forecastDefault?.usedSpi?.toFixed(3)} | ${forecastDefault?.dailyBurnRate?.toFixed(3)} | ${forecastDefault?.forecastDate?.toLocaleDateString('ja-JP')} | ${calcDelayDays(forecastDefault?.forecastDate)}日 |`
    )
    console.log(
        `| PV指定 | ${forecastPlanned?.usedDailyPv?.toFixed(3)} | ${forecastPlanned?.usedSpi?.toFixed(3)} | ${forecastPlanned?.dailyBurnRate?.toFixed(3)} | ${forecastPlanned?.forecastDate?.toLocaleDateString('ja-JP')} | ${calcDelayDays(forecastPlanned?.forecastDate)}日 |`
    )
    console.log(
        `| PV,SPI指定 | ${forecastOptimized?.usedDailyPv?.toFixed(3)} | ${forecastOptimized?.usedSpi?.toFixed(3)} | ${forecastOptimized?.dailyBurnRate?.toFixed(3)} | ${forecastOptimized?.forecastDate?.toLocaleDateString('ja-JP')} | ${calcDelayDays(forecastOptimized?.forecastDate)}日 |`
    )
    console.log('')
}

async function example4_scenarioAnalysis() {
    console.log('=== Example 4: シナリオ分析（悲観・楽観） ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    // 累積SPIでの予測
    const forecastCumulative = project.calculateCompletionForecast()

    // 悲観的シナリオ（SPI=0.5）
    const forecastPessimistic = project.calculateCompletionForecast({
        spiOverride: 0.5,
    })

    // 楽観的シナリオ（SPI=1.0）
    const forecastOptimistic = project.calculateCompletionForecast({
        spiOverride: 1.0,
    })

    const calcDelayDays = (forecastDate: Date | undefined) => {
        const scheduledEnd = project.endDate
        if (!scheduledEnd || !forecastDate) return undefined
        return Math.ceil((forecastDate.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
    }

    console.log('| 項目 | 累積SPI | 悲観(SPI=0.5) | 楽観(SPI=1.0) |')
    console.log('|------|---------|---------------|---------------|')
    console.log(`| usedSpi | ${forecastCumulative?.usedSpi?.toFixed(3)} | 0.500 | 1.000 |`)
    console.log(
        `| 完了予測日 | ${forecastCumulative?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastPessimistic?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastOptimistic?.forecastDate?.toLocaleDateString('ja-JP')} |`
    )
    console.log(
        `| 遅延日数 | ${calcDelayDays(forecastCumulative?.forecastDate)}日 | ${calcDelayDays(forecastPessimistic?.forecastDate)}日 | ${calcDelayDays(forecastOptimistic?.forecastDate)}日 |`
    )
    console.log(
        `| 信頼度 | ${forecastCumulative?.confidence} | ${forecastPessimistic?.confidence} | ${forecastOptimistic?.confidence} |`
    )
    console.log('')
}

async function example5_recentSpi() {
    console.log('=== Example 5: 直近SPIで完了予測する ===\n')

    // 複数日のスナップショットを読み込む
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    console.log(`前回基準日: ${projectPrev.baseDate.toLocaleDateString('ja-JP')}`)
    console.log(`今回基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}\n`)

    // ProjectService で直近 SPI を計算
    const service = new ProjectService()
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    console.log(`直近SPI（2スナップショット間）: ${recentSpi?.toFixed(3)}`)
    console.log('')

    if (recentSpi) {
        // 累積SPIと直近SPIで比較
        const forecastCumulative = projectNow.calculateCompletionForecast()
        const forecastRecent = projectNow.calculateCompletionForecast({
            spiOverride: recentSpi,
        })

        const calcDelayDays = (forecastDate: Date | undefined) => {
            const scheduledEnd = projectNow.endDate
            if (!scheduledEnd || !forecastDate) return undefined
            return Math.ceil((forecastDate.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
        }

        console.log('| 項目 | 累積SPI | 直近SPI |')
        console.log('|------|---------|---------|')
        console.log(
            `| usedSpi | ${forecastCumulative?.usedSpi?.toFixed(3)} | ${forecastRecent?.usedSpi?.toFixed(3)} |`
        )
        console.log(
            `| 完了予測日 | ${forecastCumulative?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastRecent?.forecastDate?.toLocaleDateString('ja-JP')} |`
        )
        console.log(
            `| 遅延日数 | ${calcDelayDays(forecastCumulative?.forecastDate)}日 | ${calcDelayDays(forecastRecent?.forecastDate)}日 |`
        )
    }
    console.log('')
}

async function example6_confidenceLevels() {
    console.log('=== Example 6: 信頼度レベルについて ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    // 異なるSPIで信頼度を確認
    const spiValues = [0.3, 0.6, 0.9, 1.0, 1.2]

    console.log('| SPI | 信頼度 | 信頼度理由 |')
    console.log('|-----|--------|-----------|')

    for (const spi of spiValues) {
        const forecast = project.calculateCompletionForecast({ spiOverride: spi })
        console.log(`| ${spi.toFixed(1)} | ${forecast?.confidence} | ${forecast?.confidenceReason} |`)
    }
    console.log('')
}

async function main() {
    await example0_projectStats()
    await example1_basicForecast()
    await example2_dailyPvOverride()
    await example3_threePatternComparison()
    await example4_scenarioAnalysis()
    await example5_recentSpi()
    await example6_confidenceLevels()
}

main().catch(console.error)
