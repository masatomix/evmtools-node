# 完了予測

プロジェクトの完了予測日を計算する方法を説明します。

## 基本的な完了予測

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

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
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 項目 | 値 |
|------|-----|
| 使用SPI | 0.779 |
| 残作業量 (BAC - EV) | 39.5人日 |
| ETC' (残作業量/SPI) | 50.7人日 |
| 完了予測日 | 2025/8/21 |
| 信頼度 | medium |
| 信頼度理由 | やや遅れ気味（SPI: 0.5-0.8） |
```

> **ETC'（Estimate to Complete）**: 残作業量をSPIで割った値。現在のペースで残作業を完了するのに必要な工数です。

---

## 遅延日数を計算する

完了予測日と予定終了日から遅延日数を算出できます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

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
    }
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 項目 | 値 |
|------|-----|
| 予定終了日 | 2025/8/26 |
| 完了予測日 | 2025/8/21 |
| 遅延日数 | -5日 |

✅ 予定より 5 日早く完了する見込みです
```

> 遅延日数がマイナスの場合、予定より早く完了する見込みです。

---

## 外部SPIで完了予測する（シナリオ分析）

異なるSPI値で完了予測を比較し、最悪・最良シナリオを検討できます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

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
    console.log(`| 使用SPI | ${forecastCumulative?.usedSpi?.toFixed(3)} | ... | ... |`)
    console.log(`| 完了予測日 | ... | ... | ... |`)
    console.log(`| 遅延日数 | ... | ... | ... |`)
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 項目 | 累積SPI | 悲観(SPI=0.5) | 楽観(SPI=1.0) |
|------|---------|---------------|---------------|
| 使用SPI | 0.779 | 0.500 | 1.000 |
| 完了予測日 | 2025/8/21 | 2025/9/5 | 2025/8/15 |
| 遅延日数 | -5日 | 10日 | -11日 |
| 信頼度 | medium | high | high |
```

> **spiOverrideを指定した場合**:
> - 信頼度は `high` になります（ユーザーが明示的に指定したため）
> - シナリオ分析や直近SPIの使用に活用できます

---

## 直近SPIで完了予測する

複数スナップショットから算出した直近SPIを使用すると、より現実的な予測が得られます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import { ProjectService } from 'evmtools-node/domain'

async function main() {
    // 複数日のスナップショットを読み込む
    const creatorNow = new ExcelProjectCreator('./now.xlsm')
    const creatorPrev = new ExcelProjectCreator('./prev.xlsm')

    const projectNow = await creatorNow.createProject()
    const projectPrev = await creatorPrev.createProject()

    // ProjectService で直近 SPI を計算
    const service = new ProjectService()
    const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

    console.log(`直近SPI（2スナップショット間）: ${recentSpi?.toFixed(3)}`)

    if (recentSpi) {
        // 累積SPIと直近SPIで比較
        const forecastCumulative = projectNow.calculateCompletionForecast()
        const forecastRecent = projectNow.calculateCompletionForecast({
            spiOverride: recentSpi,
        })

        console.log('| 項目 | 累積SPI | 直近SPI |')
        console.log('|------|---------|---------|')
        console.log(`| 使用SPI | ${forecastCumulative?.usedSpi?.toFixed(3)} | ${forecastRecent?.usedSpi?.toFixed(3)} |`)
        // ...
    }
}

main()
```

### 出力例

```
前回基準日: 2025/7/4
今回基準日: 2025/7/25

直近SPI（2スナップショット間）: 1.252

| 項目 | 累積SPI | 直近SPI |
|------|---------|---------|
| 使用SPI | 0.779 | 1.252 |
| 完了予測日 | 2025/8/21 | 2025/8/12 |
| 遅延日数 | -5日 | -14日 |
```

> 直近SPIが1.0を超えている場合、最近の進捗が予定より早いことを示しています。
> このプロジェクトでは累積SPI（0.779）より直近SPI（1.252）が高く、最近は挽回傾向にあります。

---

## 信頼度レベルについて

完了予測の信頼度は以下の基準で決定されます。

| 信頼度 | 条件 | 意味 |
|--------|------|------|
| `high` | spiOverride指定時 | ユーザーが明示的にSPIを指定 |
| `high` | SPI ≥ 0.9 | 順調に進行中 |
| `medium` | 0.5 ≤ SPI < 0.9 | やや遅れ気味 |
| `low` | SPI < 0.5 | 大幅に遅延 |

### コード例

```typescript
// 異なるSPIで信頼度を確認
const spiValues = [0.3, 0.6, 0.9, 1.0, 1.2]

for (const spi of spiValues) {
    const forecast = project.calculateCompletionForecast({ spiOverride: spi })
    console.log(`SPI=${spi}: ${forecast?.confidence} - ${forecast?.confidenceReason}`)
}
```

### 出力例

```
基準日: 2025/7/25

| SPI | 信頼度 | 信頼度理由 |
|-----|--------|-----------|
| 0.3 | high | ユーザーがSPIを指定 |
| 0.6 | high | ユーザーがSPIを指定 |
| 0.9 | high | ユーザーがSPIを指定 |
| 1.0 | high | ユーザーがSPIを指定 |
| 1.2 | high | ユーザーがSPIを指定 |
```

> **Note**: `spiOverride` を指定した場合は常に `high` になります。
> プロジェクトの累積SPIから自動計算する場合のみ、SPI値に基づいた信頼度が設定されます。

---

## 次のステップ

- [スナップショット比較](./05-diff-snapshots.md) - 2時点間の差分分析
- [プロジェクト統計](./02-project-statistics.md) - BAC, PV, EV, SPI の集計
- [タスク操作](./03-task-operations.md) - 遅延タスクの抽出
