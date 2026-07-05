# EVM進捗管理ガイド

evmtoolsを用いたITプロジェクトにおける進捗管理手法の重要事項をまとめる。



---

## 1. ある時点の進捗管理ファイルの解析

与えられたタスク群に対して、以下の情報は最重要である。

### 基本指標

- **プロジェクト全体のSPI（生産性）**

### 拡張指標（Statistics型）

以下はProjectStatisticsとAssigneeStatisticsの両方で利用可能。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| etcPrime | number | ETC'（残作業予測） - 現在のSPIで残りを完了するのに必要な工数 |
| completionForecast | Date | 完了予測日 - 現在のペースで完了する見込み日（※簡易版） |
| delayedTaskCount | number | 遅延タスク数 |
| averageDelayDays | number | 平均遅延日数 |
| maxDelayDays | number | 最大遅延日数 |

> **Note**: `completionForecast` は簡易版（日あたりPV=1.0固定）。より高精度な予測が必要な場合は `calculateCompletionForecast()` メソッドを使用する（直近N日平均PVを使用、詳細情報付き）。詳細は [#140](https://github.com/masatomix/evmtools-node/issues/140) を参照。


---

## 2. プロジェクト間の差分解析

**プロジェクト間の差分をとって解析する作業によって、その間でのプロジェクトの動きが見える。その動きを確認することは最重要である。**

### 「動き」とは

予定していたPVに対して、実際にEVがどうであったかということ。

### 標準出力フォーマット

以下のフォーマットは、ライブラリやCLIスキルで差分解析結果を出力する際の標準形式である。

#### プロジェクト単位

| 作業予定タスクのPV合計 | 進捗したタスクのEV合計 | 変更 | 追加 | 削除 |
| :--------------------- | :--------------------- | :--- | :--- | :--- |
| 1.55 (3.15 → 4.7)      | 4.59 (2.2 → 6.79)      | 22   | 123  | 1    |

#### 担当者単位

| 担当者 | 作業予定タスクのPV合計 | 進捗したタスクのEV合計 | 変更 | 追加 | 削除 |
| :----- | :--------------------- | :--------------------- | :--- | :--- | :--- |
| A      | 1.95 (1.15 → 3.1)      | 0.58 (0.72 → 1.3)      | 4    | 0    | 0    |
| B      | 0.3 (1.2 → 1.5)        | 2.1 (1.35 → 3.45)      | 3    | 0    | 0    |
| C      | 0 (0.05 → 0.05)        | 0.025 (0.025 → 0.05)   | 3    | 46   | 0    |
| D      | **-0.75** (0.75 → 0)   | 0.875 (0.025 → 0.9)    | 6    | 20   | 0    |
| E      | 0 (- → -)              | 0.24 (0 → 0.24)        | 1    | 20   | 0    |
| F      | 0.05 (0 → 0.05)        | 0.77 (0.08 → 0.85)     | 5    | 30   | 1    |
| G      | 0 (- → -)              | 0 (- → -)              | 0    | 7    | 0    |

#### カラムの意味

| カラム | 意味 |
|--------|------|
| 作業予定タスクのPV合計 | deltaPV（カッコ内は prevPV → currentPV） |
| 進捗したタスクのEV合計 | deltaEV（カッコ内は prevEV → currentEV） |
| 変更 | modifiedCount - PV/EV/進捗率のいずれかが変化したタスク数 |
| 追加 | addedCount - 新規タスク数 |
| 削除 | removedCount - 削除されたタスク数 |

#### 読み方のポイント

- **PVがマイナス値**: リスケ（タスクの後ろ倒し or 縮小）の可能性
- **`(- → -)`**: 前回データなし（途中参画 or 新規タスク）
- **追加が多い担当者**: 要件追加 or タスク分割が発生している領域

---





## 3. 日常的に確認すべき数値

### 前日との差分比較

前日のWBSファイルと比較して、標準出力フォーマット（2章参照）を用いて確認する。

#### プロジェクト単位

- 前日のEVが前日のPVに負けていないか
- 前日のPVの値が妥当か
  - **人数より少ない**: タスク不足
  - **人数より多い**: 無理なタスクをやっている

#### 担当者単位

- 前日のEVが前日のPVに負けていないか
- 前日のPVの値が**1.0近辺**か
  - **1.0未満**: タスク不足の可能性
  - **1.0より多い**: タスク過多の可能性
- そもそものPVとEVの値もチェック

### リスケタスクの確認

- `deltaPV < 0` のタスクがないかを確認（2章「読み方のポイント」参照）

### SPI時系列の確認

- SPIが一定水準を維持しているかを確認
- **課題**: サブプロジェクト単位でもSPI時系列を確認したい（現状は未実装）
- **前提**: 日々のデータを保存しておいて処理する必要がある
  - WebUIではプロジェクト統計の時系列処理を実装済み。
    - プロジェクト統計の時系列データをRead/Writeできるようにしてあって、そのファイルに「与えたWBSファイルの統計情報をAppendできる機能」を実装済み。
    - **実装箇所**: `copy-utils-generator-webui/src/pages/EvmSeries.tsx`
      - Read: `ExcelBufferProjectStatisticsCreator` でExcelから読み込み
      - Write: `json2workbook` でExcelに書き出し
      - Append: `ProjectService.mergeProjectStatistics()` で既存データにマージ

### 要員ごとのSPIについて（参考）

- WebUIの要員ごと統計でSPIを確認可能
- **注意**: 過去すべてのデータが加味された数値となるため、直近の動きを表していない場合がある

### 今日のPV確認

- 担当者ごとの本日PVが妥当（1.0前後）かを目視チェック

---

## 4. 標準 EVM 式と本ツールの対応

本ツールの指標を PMBOK / PMI Practice Standard for EVM / Earned Schedule（Lipke）の標準式に対応づける。
本ツールは**工数（人日）ベース・AC なし**のため、コスト系（右端列）は算出不可（設計メモ: [REQ-COST-EVM-DRAFT.md](specs/requirements/REQ-COST-EVM-DRAFT.md)、[#191](https://github.com/masatomix/evmtools-node/issues/191)）。

| 標準指標 | 標準式 | 本ツールの対応 | 状態 |
|---------|--------|---------------|------|
| PV (BCWS) | 計画価値 | `getStatistics().totalPvCalculated`（plotMap 日次積上げ） | ✅ |
| EV (BCWP) | 出来高 | `getStatistics().totalEv`（進捗率×工数） | ✅ |
| BAC | 完成時総予算 | `totalWorkloadExcel`（Σworkload、人日） | ✅ |
| SV | EV − PV | `TaskRow.calculateSV` / 統計から導出 | ✅ |
| SPI | EV / PV | `getStatistics().spi`（累積） | ✅ |
| 期間SPI（独自） | ΔEV / ΔPV（窓端2点） | `ProjectService.calculateRecentSpi(projects)` | ✅ 0.0.26 導入・0.0.29 で ΔEV/ΔPV に仕様準拠化 |
| ETC | (BAC − EV) / SPI | `etcPrime`（工数版。標準の AC 起点でなく EV 起点） | ✅（工数版） |
| 完了予測日 | — | `calculateCompletionForecast()`（日次消化 = 直近日次PV × SPI） | ✅（独自拡張） |
| **ES** | EV が計画上到達すべき時点 | `calculateEarnedSchedule().es`（稼働日・線形補間） | ✅ 0.0.31 |
| **SPI(t)** | ES / AT | `.spiT`（終盤でも 1.0 に収束しない） | ✅ 0.0.31 |
| **SV(t)** | ES − AT | `.svT`（「何稼働日遅れ」を直接表現） | ✅ 0.0.31 |
| **IEAC(t)** | PD / SPI(t) | `.iEacT`（暦日展開は `.esForecastDate`） | ✅ 0.0.31 |
| AC (ACWP) | 実コスト | — 入力経路なし | ❌ 未対応 |
| CPI / CV / EAC / TCPI / VAC / CR | コスト系 | — AC 依存のため算出不可 | ❌（#191） |

### 完了予測の3点見積（公式レシピ）

楽観/標準/悲観の幅を出すには、`spiOverride` に渡す SPI を切り替える（専用 API は設けず、このレシピを正とする）:

```typescript
const service = new ProjectService()
const periodSpi = service.calculateRecentSpi([prev, now])       // 期間SPI（直近の実勢）
const spiT = now.calculateEarnedSchedule()?.spiT                // 時間ベース SPI

const optimistic = now.calculateCompletionForecast({ spiOverride: 1.0 })   // 楽観: 計画どおりのペース
const standard   = now.calculateCompletionForecast()                       // 標準: 累積SPI
const candidates = [periodSpi, spiT].filter((x): x is number => x !== undefined && x > 0)
const pessimistic = now.calculateCompletionForecast({
    spiOverride: candidates.length ? Math.min(...candidates) : undefined,  // 悲観: 期間SPI と SPI(t) の低い方
})
```

- **悲観 SPI = min(期間SPI, SPI(t))** が推奨規則（直近の失速と時間ベースの遅延のうち悪い方を採用）
- 両方算出不能（スナップショット1点のみ等）なら標準にフォールバック

## 5. 今後の拡張候補

| 機能 | 説明 | Issue | 優先度 |
|-----|------|-------|:------:|
| **期間SPI計算（実装済み）** | `ProjectService.calculateRecentSpi(projects, options?)` が複数スナップショットの窓端2点から期間SPI（ΔEV/ΔPV）を返す。`calculateCompletionForecast({ spiOverride })` に渡すと直近の生産性を完了予測に反映できる。※Project 単体は EV 履歴を持たないため `Project.calculateRecentSpi(lookbackDays)` という API は存在しない | [#139](https://github.com/masatomix/evmtools-node/issues/139), [#170](https://github.com/masatomix/evmtools-node/issues/170) | **高** |
| **完了予測の整理とフィルタ対応** | `calculateCompletionForecast()` にフィルタ対応+直近SPI対応を追加 | [#140](https://github.com/masatomix/evmtools-node/issues/140) | **高** |
| `TaskDiff.isReschedule` フラグ | `deltaPV < 0` の場合に true。リスケ判定をライブラリ側で行う | [#138](https://github.com/masatomix/evmtools-node/issues/138) | 中 |
| SPIが低いタスク一覧抽出 | SPIが閾値以下のタスクを一覧抽出する機能 | - | - |
| 追加タスク数とSPIの相関分析 | 追加タスクが多い担当者のSPI推移を追跡 | - | - |
| サブプロジェクト単位のSPI時系列 | サブプロジェクト（フィルタ条件）ごとのSPI時系列を確認する機能 | - | - |

---

## 6. 参考資料

| ドキュメント | 内容 |
|-------------|------|
| [SAMPLE-PROJECT-OUTPUT.md](SAMPLE-PROJECT-OUTPUT.md) | EVM指標のサンプル出力（順調/遅延/失速プロジェクトの比較） |
| [brainstorm-evm-indicators.md](brainstorm-evm-indicators.md) | EVM指標拡張のブレインストーミング |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-01-26 | 初版作成 |
| 2026-07-06 | 標準EVM式との対応表・3点見積レシピを追加（phase4 の理論整理を docs で回収） |
