# EV 算定方式（evMethod で進捗率の主観バイアスを排する）

`StatisticsOptions.evMethod`（0.0.33〜）の使い方を説明します。

## なぜ必要か — 進捗率は主観値

既定の EV は `進捗率 × 工数` で、進捗率は PM がExcel に手動入力する**主観値**です。「90% です」が何週間も続く（90%症候群）と EV が水増しされ、SPI が実態より良く見えます。

PMI 標準の **fixed formula 方式**は、主観の入り込む余地がない客観的な EV 測定技法です:

| 方式 | EV の式 | 特徴 |
|------|---------|------|
| `'progressRate'`（既定） | 進捗率 × 工数 | 従来どおり。**未指定なら全 API の挙動は完全に不変** |
| `'0/100'` | 完了時のみ工数を計上 | 最も保守的・客観的。仕掛かり中は EV=0 |
| `'50/50'` | 着手で半分、完了で残り | 中間的。着手判定は **actualStartDate の有無** |

## Example 1: 3方式の EV / SPI 比較

4タスク（完了 / 仕掛40%・着手記録あり / 仕掛40%・着手記録なし / 未着手、各5人日）を中間時点で見た例です。

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'
import type { EvMethod } from 'evmtools-node/domain'

const creator = new ExcelProjectCreator('./now.xlsm')
const project = await creator.createProject()

for (const evMethod of ['progressRate', '0/100', '50/50'] as const) {
    const s = project.getStatistics({ evMethod })
    console.log(`${evMethod}: EV=${s.totalEv} SPI=${s.spi?.toFixed(3)}`)
}
```

**出力例**（実測。検証スクリプト [scripts/08-ev-method.ts](scripts/08-ev-method.ts) より）:

```
| 方式 | EV | SPI | 意味 |
|------|-----|------|------|
| progressRate | 9 | 0.750 | 進捗率按分（既定・従来どおり）|
| 0/100 | 5 | 0.417 | 完了時のみ計上（最も保守的）|
| 50/50 | 7.5 | 0.625 | 着手で半分+完了で残り |
```

**同じプロジェクトでも SPI が 0.750 / 0.417 / 0.625 と変わります**。progressRate との差が大きいほど「進捗率の申告に依存した数字」だったことを意味します。定例で `progressRate` と `0/100` を併記すると、水増しの検出器になります。

## Example 2: 50/50 の罠 — actualStartDate が無いと EV=0

```
50/50 の EV = 7.5
内訳: 完了5.0 + 着手記録あり2.5 + 着手記録なし0 + 未着手0
→ タスク3 は進捗率40%でも actualStartDate 未入力のため EV=0（主観排除のため意図的）
→ 50/50 を使う場合は実績開始日の入力運用が前提
```

50/50 の着手判定に進捗率を使わないのは**意図的**です（進捗率を使うと排したはずの主観が再混入するため）。**実績開始日を入力する運用があるプロジェクトでのみ 50/50 を使ってください**。運用が無い場合は `0/100` が安全です。

## Example 3: 保守的な完了予測・Earned Schedule への反映

`evMethod` は統計だけでなく、完了予測と Earned Schedule の EV 入力にも一貫して反映されます。

```typescript
const forecast = project.calculateCompletionForecast({ evMethod: '0/100' })
const es = project.calculateEarnedSchedule({ evMethod: '0/100' })
```

**出力例**:

```
progressRate: 残作業(ETC')=14.7人日 予測完了=2025/8/18 SPI(t)=0.75
0/100       : 残作業(ETC')=36.0人日 予測完了=2025/9/4 SPI(t)=0.42
→ 0/100 は仕掛かり分を EV に数えないため、予測が保守的（遅め）に出る
→ PV/BAC は方式によらず不変（EV 側だけが変わる）
```

「最悪ケースの完了予測」として `0/100` の予測日を併記する使い方が実用的です。

## 注意事項

- **PV / BAC / AT / PD は evMethod の影響を受けません**（変わるのは EV とその派生指標のみ）
- 未指定（または `'progressRate'`）の場合、全 API の戻り値は従来と完全に同一です（回帰なし）
- 完了判定は許容誤差付き（progressRate ≥ 1.0 − 1e-9）。`0.9999999999` は完了扱いです
- 反映される API: `getStatistics` / `getStatisticsByName` / `calculateCompletionForecast` / `calculateEarnedSchedule`

## 検証スクリプト

```bash
npx ts-node docs/examples/scripts/08-ev-method.ts
```

## 関連ドキュメント

- [GLOSSARY.md「EV 算定方式」](../GLOSSARY.md) — 用語定義と 50/50 の罠
- [EVM-KNOWLEDGE.md 知見ⓕ](../EVM-KNOWLEDGE.md) — 進捗率の主観バイアス（移動ベースライン下の楽観バイアス）
- [07-earned-schedule.md](07-earned-schedule.md) — SPI(t) との併用
- [Project.spec.md 5.19](../specs/domain/master/Project.spec.md) — API 詳細仕様
