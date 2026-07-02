# Brief: phase4-scurve-eac-0.0.33

## Problem

1. **可視化データ出力の欠落**: EVM は PV/EV 累積の S カーブや SPI トレンドの可視化で真価を発揮するが、本ライブラリの出力は CLI テキストのみでグラフ用データ出力が無い。データ自体は存在する（PV 日次曲線 `pvsByProjectLong`、複数スナップショットのマージ機構 `ProjectService.mergeProjectStatistics`（`src/domain/ProjectService.ts:280`）+ `fillMissingDates`（同 307 行））のに出口が無い。
2. **完了予測の理論的裏付け不足**: 現行の `etcPrime = (BAC−EV)/SPI` と `calculateCompletionForecast`（`src/domain/Project.ts:661-772`）は独自ロジックで、標準 EVM の式体系（ETC/EAC/IEAC(t)）との対応が文書化されていない。また予測が単一シナリオのみで、楽観/標準/悲観の幅が出せない。#170 で修正された期間SPI（ΔEV/ΔPV）を `spiOverride` に接続する使用例も未整備。
3. **コスト系 EVM の将来設計**: ユーザー決定により CPI/CV/EAC(コスト) 等は実装しないが、将来 AC（実績工数）列を追加する場合の設計メモを残す。

## Current State

v0.0.32 リリース後の develop。phase3 で SPI(t)/IEAC(t) が利用可能。phase2 で getDailyPvByAssignee（担当者別日次PV）が利用可能。`CompletionForecastOptions` は既に `spiOverride` を持つ（`Project.ts:982`）。既存 CLI の構造は `src/presentation/cli-pbevm-show-pv.ts` + `src/usecase/pbevm-show-pv-usecase.ts` のペアが参考パターン。

## Desired Outcome

- `pbevm-scurve` CLI がグラフ用ロング形式データ（日付, 系列, 値）を CSV/コンソール出力し、Excel/BI でそのまま S カーブが描ける
- `calculateForecastVariants()` が楽観/標準/悲観の 3 点予測を返す
- `docs/EVM-MANAGEMENT-GUIDE.md` に標準 EVM 式との対応解説が載る
- コスト系 EVM 設計メモ（実装しない旨明記）が残る
- v0.0.33 リリース

## Approach

1. **Sカーブ**: `src/usecase/pbevm-scurve-usecase.ts` 新設。単一ファイル入力なら PV 累積曲線（`pvsByProjectLong`、`Project.ts:506-508`）+ 現在 EV。複数スナップショット入力なら `mergeProjectStatistics` + `fillMissingDates` で EV/SPI の実績トレンド系列も合成。phase3 の ES 系列（オプション）と phase2 の getDailyPvByAssignee（担当者別系列オプション）も出力候補。CLI `src/presentation/cli-pbevm-scurve.ts` 新設 + package.json bin 登録（`pbevm-show-pv` の yargs 構造踏襲）。戻り値型を export し webui からも利用可能に（`src/usecase/index.ts` に追記のみ、互換維持）
2. **EAC 理論整理**: `calculateForecastVariants()` を `calculateCompletionForecast` の薄いラッパーとして Project に追加 — 楽観（SPI=1）/ 標準（累積SPI）/ 悲観（期間SPI と SPI(t) の低い方）。docs: `EVM-MANAGEMENT-GUIDE.md` に ETC=(BAC−EV)/SPI、工数版 EAC'=EV+ETC'、IEAC(t)=PD/SPI(t) の対応表を追加。`docs/examples/04-completion-forecast.md` に期間SPI→spiOverride 接続例を追記
3. **コスト系設計メモ**: `docs/specs/requirements/REQ-COST-EVM-DRAFT.md` を作成（**実装しない旨を冒頭に明記**）。内容: AC 入力ソース案（Excel/CSV への実績工数列追加、`CsvProjectCreator.ts:341-347` のカラムマップ拡張点）、型拡張案（`Statistics` に `ac?/cpi?/cv?/eac?/tcpi?/vac?` を将来オプショナル追加）、導入判断の前提（ユーザーが実工数を記録し始めること）。Backlog Issue 起票用の文面も含める

## Scope

- **In**: scurve usecase/CLI、calculateForecastVariants、docs 整理、コスト系設計メモ、テスト、spec 同期、リリース準備
- **Out**: グラフ描画そのもの（Excel/BI に委譲）、コスト系の実装、Web API 化

## Boundary Candidates

- Sカーブ usecase + CLI（presentation/usecase 層）
- calculateForecastVariants（domain 層の薄いラッパー）
- docs（GUIDE / examples / コスト系メモ）

## Out of Boundary

- 既存 `calculateCompletionForecast` の内部ロジック変更（ラッパー追加のみ）
- Excel への直接グラフ埋め込み

## Upstream / Downstream

- **Upstream**: phase3-earned-schedule-0.0.32（悲観シナリオと ES 系列に SPI(t) を利用）、phase2-skill-integration-0.0.31（担当者別系列に getDailyPvByAssignee を流用）
- **Downstream**: phase5 の知識ベースが 3 点予測・Sカーブの読み方を解説対象にする

## Existing Spec Touchpoints

- **Extends**: `docs/specs/domain/master/Project.spec.md`（calculateForecastVariants）
- **Adjacent**: phase3 の ES spec（系列出力の型を参照）、`docs/examples/06-cli-commands.md`（CLI 一覧に pbevm-scurve 追加）

## Constraints

- CLI/usecase の追加は既存パターン（yargs、usecase 分離、bin 登録）に厳密に倣う
- 非破壊: 既存 export・API の互換維持
- 検証: 共通ゲート + `pbevm-scurve` をサンプルデータで実行し、出力 CSV を Excel に取り込んで S カーブが描けることを目視確認
