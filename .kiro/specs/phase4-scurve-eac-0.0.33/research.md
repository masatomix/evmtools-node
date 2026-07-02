# 調査・設計判断テンプレート

## 概要

- **機能**: `phase4-scurve-eac-0.0.33`
- **ディスカバリー範囲**: 拡張（既存クリーンアーキテクチャへの CLI/usecase 追加 + domain 薄いラッパー + ドキュメント整理）
- **主要な知見**:
  - 可視化に必要なデータ（累積 PV 曲線 `pvsByProjectLong`、スナップショットマージ `mergeProjectStatistics` + `fillMissingDates`、担当者別 PV `getDailyPvByAssignee`、Earned Schedule `calculateEarnedSchedule`）は既に揃っており、本 spec の主目的はそれらを「グラフ用ロング形式」で束ねて外部出力する「出口」の新設である。
  - 完了予測は既存 `calculateCompletionForecast` が `spiOverride` を既に受け付けるため、3 点予測は内部を触らず SPI をオーバーライドして 3 回呼ぶ薄いラッパーで実現できる（内部ロジック非破壊）。
  - コスト系 EVM は AC（実績工数）入力が前提のため実装せず、将来判断のための設計メモに留める（ユーザー決定）。

## 調査ログ

### S カーブ用データの「出口」設計（ロング形式 vs ワイド形式）

- **背景**: Excel/BI でグラフ化しやすい形は何か。既存 usecase（`pbevm-show-pv`）はワイド形式（1 タスク 1 行、多数列）で `json2workbook` により Excel 出力している。
- **参照ソース**: `src/usecase/pbevm-show-pv-usecase.ts`（`json2workbook` による出力パターン）、`src/domain/Project.ts` の `pvsByProjectLong`（既にロング形式の PV 系列を保持）、`src/domain/ProjectService.ts` の `mergeProjectStatistics` / `fillMissingDates`。
- **知見**:
  - グラフ描画（特に複数系列の折れ線・面）にはロング形式（date × series × value）がピボット/BI で最も扱いやすく、系列追加（EV・SPI・SPI(t)・担当者別）に対して列を増やさずに済む。
  - 既存 `pvsByProjectLong` が「ロング形式の PV」を既に提供しており、命名・形状を踏襲すれば利用側の学習コストが低い。
- **示唆**: usecase の戻り値は「日付・系列名・値」の 3 項目レコード配列（ロング形式）に統一する。CSV 出力もこの 3 列で、Excel のピボット/グラフにそのまま載る。

### 完了予測 3 点バリエーションの実現方式

- **背景**: 楽観/標準/悲観の幅を出したいが、既存 `calculateCompletionForecast` の内部は変更しない制約がある。
- **参照ソース**: `src/domain/Project.ts` `calculateCompletionForecast`（661-772 付近）と `CompletionForecastOptions.spiOverride`（982 付近）、`ProjectService.calculateRecentSpi`（phase0 で ΔEV/ΔPV に準拠化）、`Project.calculateEarnedSchedule`（phase3、SPI(t)）。
- **知見**:
  - `CompletionForecastOptions` は既に `spiOverride` を持ち、これを与えると信頼度が自動的に high になる（domain.md）。3 シナリオはこの `spiOverride` を差し替えて 3 回呼ぶだけで構成できる。
  - 楽観 = SPI 1、標準 = 累積 SPI（オーバーライドなし、既存の既定挙動）、悲観 = min(期間 SPI, SPI(t))。期間 SPI・SPI(t) はいずれも undefined になり得るため、フォールバック順序を明確化する必要がある。
- **示唆**: `calculateForecastVariants` は domain 内の薄いラッパー。悲観 SPI の合成（min とフォールバック）だけが新規ロジックで、予測本体は既存メソッドに委譲する。

### 依存 spec との API 整合

- **背景**: phase2/phase3/phase0 の成果物を入力として正確に参照する必要がある。
- **参照ソース**:
  - phase2: `Project.getDailyPvByAssignee(options?: DailyPvByAssigneeOptions): DailyPvEntry[]`（`DailyPvEntry = { assignee, date, pv, taskCount, tasks }`）。担当者別系列はこの `assignee` を系列名、`date`/`pv` を日付/値に写像する。
  - phase3: `Project.calculateEarnedSchedule(options?): (EarnedScheduleResult & { esForecastDate }) | undefined`、`EarnedScheduleResult = { es, at, spiT, svT, iEacT, pd }`、`StatisticsOptions.includeEarnedSchedule`。SPI(t) 系列と悲観シナリオの SPI(t) はここから得る。
  - phase0: `ProjectService.calculateRecentSpi(projects: Project[], options?: RecentSpiOptions): number | undefined`（ΔEV/ΔPV、1 点/空/ΔPV<=0 は undefined）。悲観シナリオの期間 SPI はここから得る。
- **知見**: いずれもオプショナル/undefined を返し得る非破壊 API。S カーブ・予測バリエーションは undefined を「当該系列/シナリオを省略」に正規化して連携する。
- **示唆**: 再検証トリガーとして、これら上流 API のシグネチャ・戻り値形状の変更を design の「再検証トリガー」に明記する。

### コスト系 EVM を実装しない判断

- **背景**: CPI/CV/EAC(コスト) 等はユーザー決定により実装しない。ただし将来 AC 列を追加する場合の設計を残す。
- **参照ソース**: `src/infrastructure/CsvProjectCreator.ts`（341-347 付近のカラムマップ）、`Statistics` 型（`Project.ts`）。
- **知見**: AC を入れるにはカラムマップ拡張（実績工数列）と `Statistics` へのオプショナル型追加が入口になる。導入の前提は「利用者が実工数を記録し始めること」。
- **示唆**: 実装は行わず `docs/specs/requirements/REQ-COST-EVM-DRAFT.md` に設計メモ + Backlog Issue 文面として残す。

## アーキテクチャパターン評価

| 案 | 説明 | 強み | リスク／制約 | 備考 |
|----|------|------|--------------|------|
| usecase 集約（採用） | ロング形式生成ロジックを usecase に置き、CLI は薄く委譲。単一/複数入力・オプション系列を usecase が組み立てる | 既存 `pbevm-*` パターンに一致、CLI 非ロジック原則を維持、webui から usecase 戻り値型を再利用可能 | usecase が複数 domain API を協調させるため、境界（domain は触らない）を明確化する必要 | structure.md の presentation→usecase→domain に整合 |
| domain に集約 | S カーブ生成を Project のメソッドにする | 単一ファイル系列は domain で完結 | 複数スナップショット合成は ProjectService/複数 Project 協調で、domain 単体に収まらない。CLI 引数・CSV 整形は presentation/usecase 責務 | 却下 |
| 予測 3 点を新規計算ロジックで実装 | 楽観/標準/悲観を独自に再実装 | — | 既存 `calculateCompletionForecast` と二重実装・非破壊制約違反 | 却下。薄いラッパーを採用 |

## 設計判断

### 判断: S カーブ生成ロジックの配置（usecase 層）

- **背景**: 単一ファイル（PV 曲線 + EV）と複数スナップショット（EV/SPI トレンド合成）の両方、加えてオプション系列（ES・担当者別）を束ねる必要がある。
- **検討した代替案**:
  1. domain の Project メソッド化 — 複数スナップショット合成が domain 単体に収まらず却下。
  2. usecase 集約 — CLI 引数解釈・CSV 整形・複数入力協調を usecase が担い、domain API を読み出し専用で協調させる。
- **採用案**: usecase（`pbevm-scurve-usecase.ts`）に生成ロジックを集約。domain 側は既存 API のみ利用し、新規 domain ロジックは `calculateForecastVariants` のラッパーに限定。
- **理由**: structure.md の依存方向（presentation→usecase→domain）と既存 `pbevm-*` パターンに整合。webui は usecase 戻り値型を import して再利用できる。
- **トレードオフ**: usecase が複数 domain API を協調させ肥大化しうる。→ 系列生成を系列種別ごとの小関数に分割して緩和。
- **フォローアップ**: usecase 戻り値型（ロング形式レコード）を `usecase/index.ts` から export し、型が解決できることをテストで確認。

### 判断: 悲観シナリオの SPI 合成とフォールバック順序

- **背景**: 悲観 = min(期間 SPI, SPI(t)) だが、双方が undefined になり得る。
- **検討した代替案**:
  1. どちらか undefined ならエラー — 利用性が低い。
  2. 算出可能な指標のみで min、双方不能なら標準 SPI にフォールバック。
- **採用案**: 案 2。期間 SPI・SPI(t) の算出可能な値のみで最小値を採り、いずれも不能なら累積 SPI（標準）にフォールバック。
- **理由**: 既存の「算出不能は undefined、呼び出し側でフォールバック」方針（phase0/phase3）に一致。悲観が常に何らかの結果を返す。
- **トレードオフ**: フォールバック時、悲観 = 標準となり幅が出ない。→ 使用ドキュメントで前提を明記。
- **フォローアップ**: 期間 SPI のみ/SPI(t) のみ/双方あり/双方なしの 4 分岐をテストで固定。

## リスクと緩和策

- 系列命名（「計画PV」「EV実績」「SPI実績」「SPI(t)」「担当者名」）が利用側の期待とずれる — 系列名を設計で固定し、CLI ヘルプ/ドキュメントに明記。テストで系列名を固定。
- CSV の文字コード/区切りが Excel（日本語環境）で崩れる — 既存の Excel/CSV 出力ライブラリ（excel-csv-read-write / iconv-lite）に倣い、目視検証タスク（要件 9.1）で担保。
- 上流 API（phase2/phase3/phase0）の戻り値変更による回帰 — 再検証トリガーとして design に明記し、undefined 正規化で防御。
- usecase の複数 domain API 協調による責務肥大 — 系列種別ごとの小関数分割と境界注釈で緩和。

## 参考文献

- `.kiro/steering/roadmap.md` — フェーズ依存順・共有シーム（`calculateRecentSpi`・`calculateEarnedSchedule`・`Statistics`）
- `.kiro/steering/domain.md` — 完了予測の仕組み・SPI 集計方式・`spiOverride` の意味
- `.kiro/specs/phase3-earned-schedule-0.0.32/design.md` — `EarnedScheduleResult` / `calculateEarnedSchedule` / `StatisticsOptions.includeEarnedSchedule`
- `.kiro/specs/phase2-skill-integration-0.0.31/design.md` — `getDailyPvByAssignee` / `DailyPvEntry`
- `.kiro/specs/phase0-bugfix-0.0.29/design.md` — `calculateRecentSpi`（ΔEV/ΔPV）
- PMI Practice Standard for Earned Value Management / Earned Schedule（Walt Lipke）— IEAC(t) = PD / SPI(t) の理論根拠
