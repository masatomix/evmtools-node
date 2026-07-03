# Brief: phase3-earned-schedule-0.0.32

## Problem

本ライブラリのスケジュール指標は古典 SPI（EV/累積PV）のみで、EVM 理論上の既知の欠陥を抱える: **プロジェクト終盤で SPI が必ず 1.0 に収束し、遅延プロジェクトでも「順調」に見える**（PMI Practice Standard for EVM 2nd Ed. Appendix D。本リポジトリでも Issue #171 の知見ⓑ、`docs/brainstorm-evm-indicators.md` として実運用データで確認済み）。Earned Schedule（ES）理論はこれを根本解決し、「何日遅れているか」を時間単位で直接表現できる。

**追加入力データが一切不要**（累積PV曲線 + 現在EV + 基準日だけで算出可能）である点で、本ツールのコアスキル強化として最優先の機能（EVM理論ギャップ調査の結論）。

## Current State

v0.0.31 リリース後の develop。phase0 で `TaskRow.calculatePVs` の親タスク土日混入が修正済み（PV 曲線精度の前提）。実装済みの関連部品:
- `generateBaseDates(start, end)`（`src/common/utils.ts:12`）— 稼働日配列生成
- `Project.isHoliday`（`src/domain/Project.ts:581`）— プロジェクト固有祝日判定
- `sumCalculatePVs(leafRows, date)`（`Project.ts:860` 付近）— 指定日の累積PV合計
- `Project.plannedWorkDays`（`Project.ts:613`）— 計画総稼働日数（PD に使用）
- `calculateCompletionForecast` の暦日展開ループ（`Project.ts:740-747`）— 稼働日→暦日変換パターン
- `Statistics` 型（`Project.ts:900-923`）、`StatisticsOptions`、`_resolveTasks(options)` — フィルタ機構

## Desired Outcome

- `Project.calculateEarnedSchedule()` が ES / SPI(t) / SV(t) / IEAC(t) / 完了予測日を返す
- 終盤の古典 SPI 1.0 収束と SPI(t) の乖離をテストで実証（#171ⓑ の解決根拠）
- v0.0.32 リリース。`getStatistics` からもオプトインで取得可能

## Approach

新規 `src/domain/EarnedSchedule.ts`（型 + 計算ロジック）+ `Project.calculateEarnedSchedule()`。

型案:
```typescript
EarnedScheduleResult {
  es: number                // Earned Schedule（稼働日単位）
  at: number                // Actual Time（開始日→baseDate の稼働日数）
  spiT: number | undefined  // SPI(t) = ES / AT（AT=0 は undefined）
  svT: number               // SV(t) = ES − AT（稼働日）
  iEacT: number | undefined // IEAC(t) = PD / SPI(t)（稼働日）
  forecastDate: Date | undefined // IEAC(t) の暦日展開
  pd: number                // Planned Duration = plannedWorkDays
}
```

計算手順:
1. `generateBaseDates(startDate, baseDate)` + `isHoliday` で稼働日配列 → AT = 長さ
2. 稼働日ごとの累積 PV 曲線を **1 回だけ構築してメモ化**（全日再計算は O(days×tasks) のため。`_internalPvByProjectLong(true)` の集計流用も検討）
3. EV = `getStatistics().totalEv`。`PV(k) <= EV < PV(k+1)` となる k を探索し**線形補間**: ES = k + (EV − PV(k)) / (PV(k+1) − PV(k))。EV >= PV(baseDate) なら先行（ES >= AT）、EV >= PV(全期間) なら ES = PD
4. SPI(t) = ES/AT、SV(t) = ES−AT、IEAC(t) = PD/SPI(t)
5. forecastDate は `calculateCompletionForecast` の暦日展開ループと同じパターンで startDate から IEAC(t) 稼働日分進めた暦日
6. `Statistics` に `spiT?` / `svT?` / `esForecastDate?` をオプショナル追加。曲線構築コストがあるため `StatisticsOptions` に `includeEarnedSchedule?: boolean`（デフォルト off）を追加
7. フィルタ対応: `_resolveTasks(options)` 経由でタスク部分集合の ES も同一ロジックで算出可能にする

## Scope

- **In**: EarnedSchedule 型・計算ロジック・Project メソッド・Statistics 拡張・テスト・feature/master spec・GLOSSARY への ES 用語追加・`docs/brainstorm-evm-indicators.md` ⓑ の「ES で解決」注記
- **Out**: ES の CLI 出力（phase4 の Sカーブ CLI に含める）、EAC バリエーション（phase4）、知識ベース本体（phase5）

## Boundary Candidates

- ES 計算コア（EarnedSchedule.ts + PV 曲線メモ化）
- Project への統合（calculateEarnedSchedule / Statistics 拡張）
- ドキュメント（GLOSSARY / brainstorm 注記）

## Out of Boundary

- コスト系指標（AC/CPI 等）— 実装しない（設計メモは phase4）
- 可視化・CLI（phase4）

## Upstream / Downstream

- **Upstream**: phase0-bugfix-0.0.29（calculatePVs 土日修正 = PV 曲線精度の前提。**未リリースなら本 spec は着手不可**）
- **Downstream**: phase4（EAC 悲観シナリオが SPI(t) を利用、Sカーブが ES 系列を出力）、phase5（知識ベースⓑが ES を参照）

## Existing Spec Touchpoints

- **Extends**: `docs/specs/domain/master/Project.spec.md`（Statistics 拡張・新メソッド）
- **Adjacent**: `docs/GLOSSARY.md`（EVM 用語集に ES/SPI(t)/SV(t)/IEAC(t) を追加）、`docs/EVM-MANAGEMENT-GUIDE.md`

## Constraints

- 非破壊: Statistics のフィールドはすべてオプショナル、ES 計算はオプトイン（デフォルト off）
- テスト必須ケース: 手組み小規模プロジェクト（例 5 稼働日×2 タスク）での手計算一致、EV=0、EV=BAC、補間中間値、休日跨ぎ、**終盤の古典 SPI 1.0 収束 vs SPI(t) の乖離実証**
- 用語・式は Earned Schedule 標準（Walt Lipke / PMI）に準拠し、GLOSSARY に定義を明記
- 検証: 共通ゲート + TZ 二重実行 + サンプルデータでの CLI 経由確認（getStatistics オプトイン）
