# 完了予測

プロジェクトの完了予測日を計算する方法を説明します。

## 前提: プロジェクト統計の取得

完了予測の前に、プロジェクトの基本的なEVM指標を確認します。

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

    // プロジェクト統計を取得
    const stats = project.getStatistics()

    console.log('| 指標 | 値 | 説明 |')
    console.log('|------|-----|------|')
    console.log(`| BAC | ${stats.totalWorkloadExcel}人日 | 総予定工数 |`)
    console.log(`| PV | ${stats.totalPvCalculated}人日 | 計画価値（基準日時点） |`)
    console.log(`| EV | ${stats.totalEv}人日 | 出来高 |`)
    console.log(`| SPI | ${stats.spi?.toFixed(3)} | スケジュール効率 |`)
}

main()
```

```
基準日: 2025/7/25

| 指標 | 値 | 説明 |
|------|-----|------|
| BAC | 66人日 | 総予定工数 |
| PV | 34人日 | 計画価値（基準日時点） |
| EV | 26.5人日 | 出来高 |
| SPI | 0.779 | スケジュール効率 |
```

> 詳細は [プロジェクト統計](./02-project-statistics.md) を参照してください。

---

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
        // 遅延日数を計算
        const scheduledEnd = project.endDate
        const forecastEnd = forecast.forecastDate
        const delayDays = scheduledEnd && forecastEnd
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
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 項目 | 値 |
|------|-----|
| usedDailyPv | 2.714人日/day |
| usedSpi | 0.779 |
| 残作業量 (BAC - EV) | 39.5人日 |
| ETC' | 50.7人日 |
| 完了予測日 | 2025/8/21 |
| 予定終了日 | 2025/8/26 |
| 遅延日数 | -5日 |
| 信頼度 | medium |
| 信頼度理由 | やや遅れ気味（SPI: 0.5-0.8） |
```

> **ETC'（Estimate to Complete）**: 残作業量をSPIで割った値。現在のペースで残作業を完了するのに必要な工数です。
>
> 遅延日数がマイナスの場合、予定より早く完了する見込みです。

---

## 計算ロジックの詳細

完了予測日は以下のように計算されます。

**原則**:

1. 基準日より未来の、日あたりの計画PVを算出
2. SPIによる生産性も考慮して、日あたり消化量（`dailyBurnRate`）を算出
3. 残作業量（BAC - EV）を `dailyBurnRate` で割って、完了までの日数を導出

### 1. 日あたり計画PV（usedDailyPv）の算出

直近7稼働日の計画PVの平均を使用します。

```
2025/7/25 : 3.000人日
2025/7/24 : 3.000人日
2025/7/23 : 3.000人日
2025/7/22 : 3.000人日
2025/7/21 : 3.000人日
2025/7/18 : 2.000人日
2025/7/17 : 2.000人日

usedDailyPv = (3×5 + 2×2) / 7 = 2.714人日/day
```

### 2. 日あたり消化量（dailyBurnRate）の算出

計画PVにSPIを掛けて、実際の消化ペースを算出します。

```
dailyBurnRate = usedDailyPv × usedSpi
              = 2.714 × 0.779
              = 2.116人日/day
```

### 3. 完了予測日の算出

残作業量を日あたり消化量で割って、必要な稼働日数を算出します。

```
必要稼働日数 = remainingWork / dailyBurnRate
             = 39.5 / 2.116
             = 18.7日 ≒ 19稼働日

基準日(7/25) + 19稼働日 = 2025/8/21
```

### 備考: なぜ SPI < 1.0 なのに、当初のスケジュールの予定より早く終わるのか？

| 項目 | 値 |
|------|-----|
| 基準日→予定終了日の稼働日数 | 23日 |
| 必要稼働日数 | 19日 |
| 差分 | 4日早い（カレンダー上は5日） |

スケジュール上は23稼働日の余裕がありますが、残作業（39.5人日）を消化するには19日で十分です。これは計画にバッファが含まれているか、リソース配分に余裕があることを示しています。

> **Note**: 遅延日数がマイナスの場合、予定より早く完了する見込みです。SPI が 1.0 未満でも、計画に余裕があれば予定より早く終わることがあります。

---

## 外部指定のパラメータで完了予測する

`calculateCompletionForecast()` には `dailyPvOverride` と `spiOverride` オプションがあり、これらを指定することでより現実的な予測ができます。

### dailyPvOverride（PV指定）

基準日より未来のPVを明示的に指定できます。

```typescript
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

// PV指定で予測
const forecastPlanned = project.calculateCompletionForecast({
    dailyPvOverride: plannedDailyPv,
})
```

### spiOverride（SPI指定）

累積SPIの代わりに、任意のSPI値を指定できます。

```typescript
// SPI指定で予測
const forecastWithSpi = project.calculateCompletionForecast({
    spiOverride: 1.0,  // 楽観シナリオ
})
```

### コード例（2パターン比較）

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
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

    // PV指定で予測
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
    console.log(`| usedDailyPv | ${forecastDefault?.usedDailyPv?.toFixed(3)} | ${forecastPlanned?.usedDailyPv?.toFixed(3)} |`)
    console.log(`| usedSpi | ${forecastDefault?.usedSpi?.toFixed(3)} | ${forecastPlanned?.usedSpi?.toFixed(3)} |`)
    console.log(`| dailyBurnRate | ${forecastDefault?.dailyBurnRate?.toFixed(3)} | ${forecastPlanned?.dailyBurnRate?.toFixed(3)} |`)
    console.log(`| 完了予測日 | ${forecastDefault?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastPlanned?.forecastDate?.toLocaleDateString('ja-JP')} |`)
    console.log(`| 遅延日数 | ${calcDelayDays(forecastDefault?.forecastDate)}日 | ${calcDelayDays(forecastPlanned?.forecastDate)}日 |`)
}

main()
```

### 出力例

```
基準日: 2025/7/25
均等配分 dailyPv: 1.610 人日/day
（BAC 66人日 / 総稼働日数 41日）

| 項目 | 自動算出 | PV指定 |
|------|---------|--------|
| usedDailyPv | 2.714 | 1.610 |
| usedSpi | 0.779 | 0.779 |
| dailyBurnRate | 2.116 | 1.255 |
| 完了予測日 | 2025/8/21 | 2025/9/9 |
| 遅延日数 | -5日 | 14日 |
```

### 解釈

| 予測方式 | dailyPv の算出方法 | 結果 |
|---------|-------------------|------|
| 自動算出 | 直近7稼働日の平均（2.714） | 5日早く完了 |
| PV指定 | BAC / 総稼働日数（1.610） | 14日遅延 |

- **自動算出**: 直近の実績ベースで、たまたま高めの `dailyPv` が使われた
- **PV指定**: 均等配分の `dailyPv` で計算すると、SPI 0.779 の影響で遅延が発生

---

## さらに `spiOverride` を組み合わせて精度を上げる

累積SPI（0.779）はプロジェクト開始からの全体平均ですが、直近のSPI（生産性）は異なる場合があります。`spiOverride` に直近SPIを指定することで、より現実的な予測ができます。

たとえば、以下の関数で複数スナップショットのSPI平均を算出して使用します（詳細は「[プロジェクト統計 - 複数スナップショットから平均SPIを計算する](./02-project-statistics.md#複数スナップショットから平均-spi-を計算する)」を参照）。

```typescript
// 直近SPIを計算
const service = new ProjectService()
const recentSpi = service.calculateRecentSpi([projectPrev, projectNow])

// PV,SPI指定で予測
const forecastOptimized = project.calculateCompletionForecast({
    dailyPvOverride: plannedDailyPv,  // 1.610（均等配分）
    spiOverride: recentSpi,            // 1.252（直近SPI）
})
```

### 3パターンの比較

| 予測方式 | dailyPv | SPI | dailyBurnRate | 完了予測日 | 遅延日数 |
|---------|---------|-----|---------------|-----------|---------|
| 自動算出（※1） | 2.714 | 0.779 | 2.116 | 2025/8/21 | -5日 |
| PV指定（※2） | 1.610 | 0.779 | 1.255 | 2025/9/9 | +14日 |
| **PV,SPI指定**（※3） | 1.610 | 1.252 | 2.016 | 2025/8/22 | **-4日** |

- **※1 自動算出**: ライブラリのデフォルト。直近7稼働日の平均PV、累積SPIを使用
- **※2 PV指定**: `dailyPvOverride` で `dailyPv` を指定
  - 1.610 = 総工数（BAC）を総稼働日数で均等に割った値
- **※3 PV,SPI指定**: さらに `spiOverride` で SPI を指定
  - 1.252 = 直近2スナップショット間で算出したSPI（最近の生産性）

**SPIの違い**:

- **累積SPI（0.779）**: プロジェクト開始からの平均。初期の遅れが影響している
- **直近SPI（1.252）**: 最近は順調に進んでいる（1.0超で前倒しペース）

PV,SPI指定を組み合わせることで、「均等配分のリソースで、最近の生産性を維持した場合」の予測が得られます。

---

## シナリオ分析（悲観・楽観）

異なるSPI値で完了予測を比較し、最悪・最良シナリオを検討できます。

### コード例

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log(`基準日: ${project.baseDate.toLocaleDateString('ja-JP')}`)

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
    console.log(`| 完了予測日 | ${forecastCumulative?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastPessimistic?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastOptimistic?.forecastDate?.toLocaleDateString('ja-JP')} |`)
    console.log(`| 遅延日数 | ${calcDelayDays(forecastCumulative?.forecastDate)}日 | ${calcDelayDays(forecastPessimistic?.forecastDate)}日 | ${calcDelayDays(forecastOptimistic?.forecastDate)}日 |`)
    console.log(`| 信頼度 | ${forecastCumulative?.confidence} | ${forecastPessimistic?.confidence} | ${forecastOptimistic?.confidence} |`)
}

main()
```

### 出力例

```
基準日: 2025/7/25

| 項目 | 累積SPI | 悲観(SPI=0.5) | 楽観(SPI=1.0) |
|------|---------|---------------|---------------|
| usedSpi | 0.779 | 0.500 | 1.000 |
| 完了予測日 | 2025/8/21 | 2025/9/5 | 2025/8/15 |
| 遅延日数 | -5日 | 10日 | -11日 |
| 信頼度 | medium | high | high |
```

> **`spiOverride`を指定した場合**:
> - 信頼度は `high` になります（ユーザーが明示的に指定したため）
> - シナリオ分析や直近SPIの使用に活用できます

---

## 直近SPIで完了予測する

複数スナップショットから算出した直近SPIを使用すると、より現実的な予測が得られます。

平均SPIの計算方法については [プロジェクト統計 - 複数スナップショットから平均SPIを計算する](./02-project-statistics.md#複数スナップショットから平均-spi-を計算する) を参照してください。

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

    console.log(`前回基準日: ${projectPrev.baseDate.toLocaleDateString('ja-JP')}`)
    console.log(`今回基準日: ${projectNow.baseDate.toLocaleDateString('ja-JP')}`)

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

        const calcDelayDays = (forecastDate: Date | undefined) => {
            const scheduledEnd = projectNow.endDate
            if (!scheduledEnd || !forecastDate) return undefined
            return Math.ceil((forecastDate.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60 * 24))
        }

        console.log('')
        console.log('| 項目 | 累積SPI | 直近SPI |')
        console.log('|------|---------|---------|')
        console.log(`| usedSpi | ${forecastCumulative?.usedSpi?.toFixed(3)} | ${forecastRecent?.usedSpi?.toFixed(3)} |`)
        console.log(`| 完了予測日 | ${forecastCumulative?.forecastDate?.toLocaleDateString('ja-JP')} | ${forecastRecent?.forecastDate?.toLocaleDateString('ja-JP')} |`)
        console.log(`| 遅延日数 | ${calcDelayDays(forecastCumulative?.forecastDate)}日 | ${calcDelayDays(forecastRecent?.forecastDate)}日 |`)
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
| usedSpi | 0.779 | 1.252 |
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
| `high` | `spiOverride`指定時 | ユーザーが明示的にSPIを指定 |
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

- [プロジェクト統計](./02-project-statistics.md) - BAC, PV, EV, SPI の集計
- [タスク操作](./03-task-operations.md) - 遅延タスクの抽出
- [スナップショット比較](./05-diff-snapshots.md) - 2時点間の差分分析
