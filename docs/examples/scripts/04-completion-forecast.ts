#!/usr/bin/env ts-node
/**
 * 04-completion-forecast.md のコード検証スクリプト
 */

import { ExcelProjectCreator } from '../../../src/infrastructure'
import { ProjectService } from '../../../src/domain'

async function example1_basicForecast() {
    console.log('=== Example 1: 基本的な完了予測 ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const forecast = project.calculateCompletionForecast()

    if (forecast) {
        console.log('| 項目 | 値 |')
        console.log('|------|-----|')
        console.log(`| 使用SPI | ${forecast.usedSpi?.toFixed(3)} |`)
        console.log(`| 残作業量 (BAC - EV) | ${forecast.remainingWork?.toFixed(1)}人日 |`)
        console.log(`| ETC' (残作業量/SPI) | ${forecast.etcPrime?.toFixed(1)}人日 |`)
        console.log(`| 完了予測日 | ${forecast.forecastDate?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 信頼度 | ${forecast.confidence} |`)
        console.log(`| 信頼度理由 | ${forecast.confidenceReason} |`)
    }
    console.log('')
}

async function example2_forecastWithDelay() {
    console.log('=== Example 2: 遅延日数の計算 ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    const forecast = project.calculateCompletionForecast()

    if (forecast) {
        const scheduledEnd = project.endDate
        const forecastEnd = forecast.forecastDate

        // 遅延日数を計算
        const delayDays = scheduledEnd && forecastEnd
            ? Math.ceil((forecastEnd.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
            : undefined

        console.log('| 項目 | 値 |')
        console.log('|------|-----|')
        console.log(`| 予定終了日 | ${scheduledEnd?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 完了予測日 | ${forecastEnd?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 遅延日数 | ${delayDays}日 |`)

        if (delayDays !== undefined) {
            if (delayDays > 0) {
                console.log(`\n⚠️ 予定より ${delayDays} 日遅延の見込みです`)
            } else if (delayDays < 0) {
                console.log(`\n✅ 予定より ${Math.abs(delayDays)} 日早く完了する見込みです`)
            } else {
                console.log(`\n📅 予定通りの完了見込みです`)
            }
        }
    }
    console.log('')
}

async function example3_spiOverride() {
    console.log('=== Example 3: 外部SPIで完了予測 ===\n')

    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}\n`)

    // 累積SPIでの予測
    const forecastCumulative = project.calculateCompletionForecast()

    // 外部指定SPIで予測（悲観的シナリオ: SPI=0.5）
    const forecastPessimistic = project.calculateCompletionForecast({
        spiOverride: 0.5,
    })

    // 外部指定SPIで予測（楽観的シナリオ: SPI=1.0）
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
    console.log(
        `| 使用SPI | ${forecastCumulative?.usedSpi?.toFixed(3)} | ${forecastPessimistic?.usedSpi?.toFixed(3)} | ${forecastOptimistic?.usedSpi?.toFixed(3)} |`
    )
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

async function example4_recentSpi() {
    console.log('=== Example 4: 直近SPIで完了予測 ===\n')

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
            `| 使用SPI | ${forecastCumulative?.usedSpi?.toFixed(3)} | ${forecastRecent?.usedSpi?.toFixed(3)} |`
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

async function example5_confidenceLevels() {
    console.log('=== Example 5: 信頼度レベルの解釈 ===\n')

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
    await example1_basicForecast()
    await example2_forecastWithDelay()
    await example3_spiOverride()
    await example4_recentSpi()
    await example5_confidenceLevels()
}

main().catch(console.error)
