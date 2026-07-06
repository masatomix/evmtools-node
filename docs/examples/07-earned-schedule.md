# Earned Schedule（SPI(t) で時間ベースの遅延を見る）

`Project.calculateEarnedSchedule()`（0.0.31〜）の使い方を説明します。

## なぜ必要か — 古典 SPI は終盤で「必ず」1.0 に近づく

SPI = EV/PV は「量」の比較のため、プロジェクトが完了に近づくと EV も PV も BAC に収束し、**どんなに遅延していても SPI は 1.0 付近に見えます**（実運用データで確認済みの既知問題。詳細: [EVM-KNOWLEDGE.md 知見ⓑ](../EVM-KNOWLEDGE.md)）。

Earned Schedule（Lipke / PMI）は「**現在の出来高に、計画ならいつ到達していたはずか**」を求めて時間で測ることで、これを解消します。

| 指標 | 式 | 意味 |
|------|-----|------|
| ES | 累積PV曲線上で EV に到達する時点（稼働日・線形補間） | 出来高の時間換算 |
| AT | 開始日〜基準日の稼働日数 | 実際の経過時間 |
| **SPI(t)** | ES / AT | 時間ベースの効率。**終盤でも 1.0 に収束しない** |
| SV(t) | ES − AT | 「何稼働日遅れているか」を直接表す |
| IEAC(t) | PD / SPI(t) | この効率が続いた場合の総所要稼働日数 |

## Example 1: 終盤の隠れた失速を検出する

計画10稼働日のプロジェクト。全タスクが「99%」のまま完了せず、基準日は計画終了の1週間後という状況です。

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

const creator = new ExcelProjectCreator('./now.xlsm')
const project = await creator.createProject()

const stats = project.getStatistics()
console.log(`古典SPI = ${stats.spi?.toFixed(2)}`)

const es = project.calculateEarnedSchedule()
if (es) {
    console.log(`ES      = ${es.es.toFixed(1)} 稼働日`)
    console.log(`AT      = ${es.at} 稼働日`)
    console.log(`SPI(t)  = ${es.spiT?.toFixed(2)}`)
    console.log(`SV(t)   = ${es.svT.toFixed(1)} 稼働日`)
    console.log(`IEAC(t) = ${es.iEacT?.toFixed(1)} 稼働日`)
    console.log(`予測完了日 = ${es.esForecastDate?.toLocaleDateString('ja-JP')}`)
}
```

**出力例**（実測。検証スクリプト [scripts/07-earned-schedule.ts](scripts/07-earned-schedule.ts) より）:

```
古典SPI = 0.99  ← 1.0 目前。「ほぼ順調」に見える
ES      = 9.9 稼働日（出来高を時間に換算）
AT      = 15 稼働日（実際の経過時間）
SPI(t)  = 0.66  ← 時間ベースでは重度の遅延
SV(t)   = -5.1 稼働日（何稼働日遅れているか）
IEAC(t) = 15.2 稼働日（この効率だと総所要日数）
予測完了日 = 2025/8/22
```

**同じプロジェクトなのに、古典 SPI は 0.99（順調）、SPI(t) は 0.66（5.1稼働日の遅れ）**。これが「終盤の隠れた失速」で、SPI(t) だけが検出できます。

## Example 2: 中盤では両者はほぼ一致する

```
古典SPI = 0.75 / SPI(t) = 0.75
→ 中盤は両者がほぼ一致する。乖離が拡大するのは終盤（Example 1）
```

つまり **SPI(t) は常に SPI の代わりに使ってよい**指標です（中盤は同じ値、終盤は SPI(t) だけが正しい）。使い分けの指針は [EVM-PRIMER.md「判断レシピ」](../EVM-PRIMER.md) を参照してください。

## Example 3: フィルタで「どの工程が足を引っ張っているか」を見る

`TaskFilterOptions` の `filter`（タスク名部分一致）で部分集合の ES を算出できます。

```typescript
const all = project.calculateEarnedSchedule()
const design = project.calculateEarnedSchedule({ filter: '設計' })
const impl = project.calculateEarnedSchedule({ filter: '実装' })
```

**出力例**（前半5日=設計、後半5日=実装、6稼働日目時点）:

```
全体:           ES=3.0 SPI(t)=0.50
設計工程のみ:   ES=2.5 SPI(t)=0.42 ← 足を引っ張っている
実装工程のみ:   ES=5.5 SPI(t)=0.92 ← ほぼ計画どおり
※ AT/PD はプロジェクト全期間で共通（部分集合でも変わらない）
```

## 注意事項

- 戻り値が `undefined` になる条件: 対象タスクが空、開始日/終了日の欠損、BAC ≤ 0。`spiT` は AT=0（基準日が開始日前）で `undefined`
- **部分集合の早期完了**: フィルタした部分集合の EV が部分集合の BAC に達すると ES は PD（全期間）にクランプされ、SPI(t) > 1 になり得ます（早期完了の表現）
- EV 算定方式を変えて計算することもできます: `calculateEarnedSchedule({ evMethod: '0/100' })`（→ [08-ev-method.md](08-ev-method.md)）

## 検証スクリプト

このドキュメントの出力例は [scripts/07-earned-schedule.ts](scripts/07-earned-schedule.ts) で再現できます:

```bash
npx ts-node docs/examples/scripts/07-earned-schedule.ts
```

## 関連ドキュメント

- [GLOSSARY.md「Earned Schedule 系指標」](../GLOSSARY.md) — 用語定義
- [EVM-KNOWLEDGE.md 知見ⓑ](../EVM-KNOWLEDGE.md) — 終盤SPI収束の実運用知見
- [EVM-MANAGEMENT-GUIDE.md](../EVM-MANAGEMENT-GUIDE.md) — 3点見積レシピ（悲観SPI = min(期間SPI, SPI(t))）
- [Project.spec.md 5.18](../specs/domain/master/Project.spec.md) — API 詳細仕様
