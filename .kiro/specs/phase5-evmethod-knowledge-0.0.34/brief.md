# Brief: phase5-evmethod-knowledge-0.0.34

## Problem

1. **EV 算定方式が按分一択**: 現状 EV = `progressRate × workload` の出来高按分のみ。progressRate は Excel 手動入力の主観値のため、進捗の水増し・楽観バイアスが混入しうる。標準 EVM では 0/100 ルール（完了時のみ計上）や 50/50 ルール（着手で半分、完了で全部）などの客観的 % complete 方式が知られており、オプションとして提供すると測定の健全性が上がる。**必要データは既存カラム（`finished`、`actualStartDate`）から導出可能で新規入力不要**。
2. **#171 EVM ドメイン知見の知識ベース化**: 実運用 WBS 分析で得た知見ⓐ〜ⓗ（`docs/brainstorm-evm-indicators.md`）が体系化されていない。ⓐ母数効果 / ⓑ終盤SPI 1.0 収束 / ⓒ停滞タスク隠蔽 / ⓓSV の横比較不可 / ⓔ再ベースライン起因ディップ / ⓕBAC 単調増加 / ⓖSV 負基調 / ⓗ′ID 突合 + name 変化警告。

## Current State

v0.0.33 リリース後の develop。phase3 の ES（ⓑの解決）、phase4 の 3 点予測・S カーブが利用可能。EV 集計は `Project._calculateBasicStats`（`src/domain/Project.ts:421-427`）と `sumEVs` で行われ、`TaskRow.ev` は Excel 読み込み値（`progressRate × workload`）。

## Desired Outcome

- `StatisticsOptions.evMethod?: 'progressRate' | '0/100' | '50/50'`（デフォルト `'progressRate'` = 現行維持）で EV 算定方式を切り替えられる
- `docs/EVM-KNOWLEDGE.md`（仮名）としてⓐ〜ⓗが体系化され、各知見に「ツールでの確認方法（該当 API/CLI）」「解決状況（例: ⓑ=ES で解決）」が紐づく
- 機能化候補（ⓗ′name 変化警告、ⓒ停滞タスク経時追跡、ⓕBAC トレンド）が Backlog Issue として分割起票される
- v0.0.34 リリース

## Approach

1. **% complete 方式**:
   - 実装位置は **Project の統計計算側**（TaskRow.ev は Excel 読み込み値なので変更しない）。`_calculateBasicStats` / `sumEVs` を、方式に応じてタスクごとの EV を導出する関数に差し替える
   - `'0/100'`: `finished ? workload : 0`（finished は phase0 の EPSILON 修正後の定義）
   - `'50/50'`: `finished ? workload : (actualStartDate あり ? workload * 0.5 : 0)`
   - `StatisticsOptions` 拡張（オプショナル、非破壊）。SPI・SV・完了予測・ES など EV を使う下流指標が evMethod を一貫して反映することを設計で確認（getStatistics 経由の系は自動反映されるはず。calculateEarnedSchedule 等の直接 totalEv 参照箇所に注意）
   - テスト: 3 方式 ×（未着手/仕掛/完了）のマトリクス + 下流指標（SPI）への反映確認
2. **知識ベース**:
   - `docs/brainstorm-evm-indicators.md` を元に `docs/EVM-KNOWLEDGE.md` を作成。各知見に: 現象の説明 → 理論的背景 → 本ツールでの確認方法（API/CLI 名）→ 対処・解決状況
   - ⓑは phase3 の ES、回復/失速の検出は phase0 の期間SPI、予測の幅は phase4 の 3 点予測を参照
   - 機能化候補 3 件（ⓗ′name 変化警告 / ⓒ停滞タスク経時追跡 / ⓕBAC トレンド）は本 spec では実装せず、Backlog Issue の起票文面を tasks に含める
   - README / GLOSSARY から知識ベースへのリンクを張る

## Scope

- **In**: evMethod オプション実装・テスト・spec 同期、EVM-KNOWLEDGE.md 作成、Backlog Issue 起票、リリース準備
- **Out**: ⓗ′/ⓒ/ⓕ の機能実装（Backlog）、progressRate 入力方式自体の変更、Excel テンプレートの変更

## Boundary Candidates

- evMethod（domain 層の統計計算）
- 知識ベース（docs のみ）
- Backlog Issue 起票（GitHub 操作）

## Out of Boundary

- EV 履歴の永続化（スナップショット管理は現行の複数ファイル方式のまま）
- 新しい入力カラム追加

## Upstream / Downstream

- **Upstream**: phase3-earned-schedule-0.0.32（知識ベースⓑの解決記述に必要）、phase4-scurve-eac-0.0.33（3 点予測の解説に必要）、phase0（finished の EPSILON 定義）
- **Downstream**: Backlog Issue 群（ⓗ′/ⓒ/ⓕ、コスト系 EVM）

## Existing Spec Touchpoints

- **Extends**: `docs/specs/domain/master/Project.spec.md`（StatisticsOptions 拡張）
- **Adjacent**: `docs/GLOSSARY.md`（EV 算定方式の用語追加）、`docs/brainstorm-evm-indicators.md`（元ネタ、リンクで残す）

## Constraints

- デフォルト挙動は完全に現行維持（evMethod 未指定 = progressRate 按分）。既存テストが全て無変更で通ること
- 知識ベースは日本語で、実運用者（プライムブレインズ社の PM）が読める粒度にする
- 検証: 共通ゲート + evMethod 3 方式の CLI 目視確認（サンプルデータ）
