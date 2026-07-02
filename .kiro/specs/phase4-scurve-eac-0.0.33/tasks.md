# 実装計画

> 方針: テスト先行（RED → GREEN）。domain の予測バリエーション → usecase の系列合成 → CLI → docs → 検証・リリースの順。
> 着手前ゲート: phase2-skill-integration-0.0.31（`getDailyPvByAssignee`）と phase3-earned-schedule-0.0.32（`calculateEarnedSchedule`）が develop にマージ済みであることを確認する。未マージの場合、タスク 1 の悲観シナリオ（spiT）とタスク 2 のオプション系列（3.x）は着手不可。
> ブランチ例: `feature/scurve-eac`（develop から worktree 分岐、`--no-track`）。

- [ ] 1. domain: calculateForecastVariants（3 点完了予測）
- [ ] 1.1 予測バリエーションのテストを追加（RED）
  - `src/domain/__tests__/Project.forecastVariants.test.ts` を新設
  - 楽観=SPI1/標準=累積SPI/悲観=min(periodSpi, spiT) の選定、periodSpi のみ・spiT のみ・両方欠落時の標準フォールバック（pessimisticBasis の値含む）、`spiOverride` 直接呼び出しとの等価性（薄いラッパー性）をケース化
  - 完了条件: 追加テストが未実装メソッドに対して RED
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - _Boundary: Project_
- [ ] 1.2 calculateForecastVariants を実装（GREEN）
  - `src/domain/Project.ts` に `ForecastVariants` / `ForecastVariantsOptions` 型と `calculateForecastVariants(options?)` を追加（`calculateCompletionForecast` の内部は不変）
  - `src/domain/index.ts` に型 export を追加
  - 完了条件: 1.1 のテストが GREEN、既存の completionForecast 系テストが全て無変更で緑
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.2, 8.3_
  - _Boundary: Project_
  - _Depends: 1.1_

- [ ] 2. usecase: S カーブ系列合成
- [ ] 2.1 系列合成のテストを追加（RED）
  - `src/usecase/__tests__/pbevm-scurve-usecase.test.ts` を新設
  - 単一入力（計画PV 曲線 + EV 1 点、AC 1.1-1.4）、フィルタ指定（1.5）、開始/終了日欠損・空タスクで空配列（1.6）、複数入力の EV実績/SPI実績合成・欠損日補完（2.1-2.4）、1 件フォールバック（2.5）、`includeEs`/`byAssignee` の on/off・算出不能時の当該系列スキップ（3.1-3.4）、`toCsv` の列構成（baseDate,series,value）とソート順をケース化
  - 完了条件: 追加テストが未実装 usecase に対して RED
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_
  - _Boundary: ScurveUsecase_
- [ ] 2.2 pbevm-scurve-usecase を実装（GREEN）
  - `src/usecase/pbevm-scurve-usecase.ts` に `ScurveRecord` / `ScurveOptions` / `buildScurveRecords` / `toCsv` を実装（design のインターフェース仕様どおり）
  - 計画PV は `pvsByProjectLong`、実績トレンドは `mergeProjectStatistics`+`fillMissingDates`、ES 系列は `calculateEarnedSchedule()?.spiT`、担当者別は `getDailyPvByAssignee` を利用
  - `src/usecase/index.ts` に export を追記（既存 4 行は不変）
  - 完了条件: 2.1 のテストが GREEN
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 8.1_
  - _Boundary: ScurveUsecase_
  - _Depends: 2.1_

- [ ] 3. presentation: pbevm-scurve CLI
- [ ] 3.1 CLI を実装し bin 登録
  - `src/presentation/cli-pbevm-scurve.ts` を `cli-pbevm-show-pv.ts` の yargs 構造踏襲で新設（`--file`（複数可）/`--output`/`--filter`/`--es`/`--by-assignee`、ロジックは usecase へ委譲）
  - `package.json` の bin に `"pbevm-scurve": "./dist/presentation/cli-pbevm-scurve.js"` を追加
  - `src/presentation/__tests__/cli-pbevm-scurve.test.ts` を既存 CLI テスト（cli-pbevm-tree.test.ts / cli-shebang.test.ts）のパターンで追加
  - 完了条件: `npm run build` 後に `node dist/presentation/cli-pbevm-scurve.js --help` が動作し、テストが緑
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.3_
  - _Boundary: ScurveCli, package.json_
  - _Depends: 2.2_

- [ ] 4. docs: 理論整理・コスト系設計メモ
- [ ] 4.1 (P) EVM-MANAGEMENT-GUIDE に標準式対応表を追加
  - ETC=(BAC−EV)/SPI、工数版 EAC'=EV+ETC'、IEAC(t)=PD/SPI(t) と `etcPrime`・`calculateCompletionForecast`・`calculateEarnedSchedule`・`calculateForecastVariants` の対応表を追加
  - 完了条件: 対応表に本ライブラリ API 名が全て紐づいていること
  - _Requirements: 6.1_
  - _Boundary: docs/EVM-MANAGEMENT-GUIDE.md_
  - _Depends: 1.2_
- [ ] 4.2 (P) examples を更新
  - `docs/examples/04-completion-forecast.md` に期間 SPI（`ProjectService.calculateRecentSpi`）→ `spiOverride` 接続例と `calculateForecastVariants` の使用例を追記
  - `docs/examples/06-cli-commands.md` に `## pbevm-scurve` セクション（使用方法/オプション/出力例の既存パターン）、`## 利用可能なコマンド` リスト行、`## npm scripts` ブロック行を追加
  - 完了条件: 記載のコード例がビルド済みライブラリで実行可能であること
  - _Requirements: 6.2, 6.3_
  - _Boundary: docs/examples_
  - _Depends: 3.1_
- [ ] 4.3 (P) REQ-COST-EVM-DRAFT を新設
  - `docs/specs/requirements/REQ-COST-EVM-DRAFT.md` を作成: 冒頭に「実装しない設計案」明記、AC 入力ソース案（CSV カラムマップ `CsvProjectCreator.ts:334-359` の 12 列目以降への拡張点）、`Statistics` への `ac?/cpi?/cv?/eac?/tcpi?/vac?` オプショナル追加方針、導入判断前提（実工数の記録開始）、Backlog Issue 起票文面（タイトル・背景・スコープ）
  - 完了条件: 5 つの必須記載事項（AC 7.1-7.5）がすべて含まれること
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Boundary: docs/specs/requirements_

- [ ] 5. Validation: 検証・master 同期・リリース準備
- [ ] 5.1 検証ゲートと Excel 目視確認
  - `npm run lint && npm run format && npm test && npm run build` + `TZ=Asia/Tokyo npm test` / `TZ=UTC npm test` を通す
  - サンプルデータ（samples/ 配下）で `pbevm-scurve` を実行し、出力 CSV を Excel に取り込んで計画PV の S カーブと EV/SPI トレンドが描けることを目視確認（結果を PR に記録）
  - 完了条件: 全ゲート緑 + 目視確認のエビデンス（スクリーンショットまたは手順記録）
  - _Requirements: 9.1, 9.2_
  - _Depends: 3.1, 4.2_
- [ ] 5.2 feature/master 設計書の同期
  - `docs/specs/domain/features/Project.forecastVariants.spec.md` を作成（AC-ID → TC-ID の要件トレーサビリティ表必須）
  - `docs/specs/domain/master/Project.spec.md` に `calculateForecastVariants`・関連型・テストシナリオ・変更履歴（バージョン更新）を同期。S カーブ usecase は usecase 層のため master 対象外だが、`docs/examples` への反映で代替（判断を変更履歴に記録）
  - 完了条件: AC-ID が grep 可能な形式でトレーサビリティ表に存在すること
  - _Requirements: 9.3, 9.4_
  - _Boundary: docs/specs_
  - _Depends: 5.1_
- [ ] 5.3 release/0.0.33 準備
  - `package.json` バージョンを 0.0.33 に更新、CHANGELOG に Added（pbevm-scurve / calculateForecastVariants / REQ-COST-EVM-DRAFT）を記載
  - 完了条件: バージョン・CHANGELOG が更新され検証ゲートが緑
  - _Requirements: 8.3, 9.2_
  - _Depends: 5.2_
