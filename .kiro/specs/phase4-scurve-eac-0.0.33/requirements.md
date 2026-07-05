# 要件定義書

> **スコープ確定（2026-07-06、ユーザー判断で正式記録）**: 本 spec は**実装せず終結**。
> 経緯: v0.0.31 リリース後の価値再評価で見送り方向となったが記録が漏れていたため、監査を経てここに確定する。
> - ① pbevm-scurve CLI → **見送り**（計算データは公開済み。整形/出口はプレゼン層＝利用側の領分。再開条件つき Backlog: [#192](https://github.com/masatomix/evmtools-node/issues/192)）
> - ② calculateForecastVariants → **見送り**（`calculateCompletionForecast({spiOverride})`×3 で合成可能。公式レシピを docs/EVM-MANAGEMENT-GUIDE.md に記載）
> - ③ コスト系 EVM 設計メモ → **実施済み**（`docs/specs/requirements/REQ-COST-EVM-DRAFT.md`、Backlog: [#191](https://github.com/masatomix/evmtools-node/issues/191)）
> 承認済みの設計（ScurveRecord/buildScurveRecords 等）は再開時に本 spec から利用できる。



## はじめに

evmtools-node は PV（計画価値）・EV（出来高）・SPI（スケジュール効率指標）を算出するが、その出力は CLI のテキスト表示に限られ、EVM が最も価値を発揮する**可視化（S カーブ・SPI トレンド）用のグラフデータ出力**が存在しない。可視化に必要なデータ自体は既にドメイン層に揃っている——日次の累積 PV 曲線（`pvsByProjectLong`）、複数スナップショットをマージする機構（`ProjectService.mergeProjectStatistics` + `fillMissingDates`）——にもかかわらず、それらを外部の Excel/BI で読み込める形（グラフ用ロング形式）に出す「出口」が無い。

加えて、現行の完了予測（`calculateCompletionForecast`）は単一シナリオのみで、楽観/標準/悲観の幅を示せない。また `etcPrime = (BAC − EV) / SPI` という独自ロジックが標準 EVM の式体系（ETC / EAC / IEAC(t)）とどう対応するかが文書化されておらず、phase0 で修正された期間 SPI（ΔEV/ΔPV）を `spiOverride` に接続して悲観予測に使う手順も未整備である。

本 spec（phase4-scurve-eac-0.0.33）は、(1) グラフ用ロング形式時系列データを CSV/コンソールに出力する `pbevm-scurve` CLI とその usecase、(2) 楽観/標準/悲観の 3 点完了予測を返す `calculateForecastVariants`、(3) 標準 EVM 式との対応解説ドキュメントとコスト系 EVM の将来設計メモ、を非破壊で追加する。本リリースは v0.0.33 相当とする。

前提として、phase2-skill-integration-0.0.31 の担当者別日次 PV（`getDailyPvByAssignee`）、phase3-earned-schedule-0.0.32 の Earned Schedule（`calculateEarnedSchedule` / SPI(t)）、phase0-bugfix-0.0.29 の期間 SPI（`calculateRecentSpi` = ΔEV/ΔPV）が利用可能であることを利用する。

## 範囲（境界コンテキスト）

- **対象範囲**:
  - S カーブ/時系列可視化用のロング形式データ（日付 × 系列 × 値）を生成する usecase と、それを CSV/コンソールに出力する CLI（`pbevm-scurve`）の新設および package.json の bin 登録
  - 単一ファイル入力時の PV 累積曲線 + 現在 EV 点の出力、複数スナップショット入力時の EV/SPI 実績トレンド系列の合成出力
  - オプションによる Earned Schedule 系列（SPI(t) 等）出力と担当者別 PV 系列出力
  - 楽観/標準/悲観の 3 点完了予測を返す `calculateForecastVariants`（既存 `calculateCompletionForecast` の薄いラッパー）と、その戻り値型の usecase バレルからの再利用可能化
  - 標準 EVM 式（ETC / EAC / IEAC(t)）との対応解説（`docs/EVM-MANAGEMENT-GUIDE.md`）、期間 SPI → `spiOverride` 接続例（`docs/examples/04-completion-forecast.md`）、CLI 一覧への追記（`docs/examples/06-cli-commands.md`）
  - コスト系 EVM（AC/CPI/CV/EAC(コスト) 等）の将来設計メモ（`docs/specs/requirements/REQ-COST-EVM-DRAFT.md`、**実装しない旨を冒頭に明記**）と Backlog Issue 起票用文面
  - master 設計書（`Project.spec.md`）の同期と要件トレーサビリティ、出力 CSV を Excel に取り込んで S カーブが描けることの目視検証
- **対象外**:
  - グラフ描画そのもの（Excel/BI に委譲。本 spec は数値データ出力まで）
  - コスト系 EVM の実装（AC = 実績工数の入力が必要なため。設計メモのみ作成する）
  - Web API 化・WebUI への組み込み（戻り値型の export による利用可能化までとし、UI は対象外）
  - 既存 `calculateCompletionForecast` の内部ロジック変更（ラッパー追加のみ、内部は非破壊）
- **隣接システム/仕様への期待**:
  - phase3-earned-schedule-0.0.32 が提供する `Project.calculateEarnedSchedule(options?)`・`EarnedScheduleResult`（SPI(t)/SV(t)/ES）・`StatisticsOptions.includeEarnedSchedule` を、悲観シナリオと ES 系列出力の入力として利用する。
  - phase2-skill-integration-0.0.31 が提供する `Project.getDailyPvByAssignee(options?)`・`DailyPvEntry` を、担当者別系列出力の入力として利用する。
  - phase0-bugfix-0.0.29 が仕様準拠化した `ProjectService.calculateRecentSpi(projects, options?)`（ΔEV/ΔPV、算出不能時 undefined）を、悲観シナリオの期間 SPI として利用する。
  - 利用側（masatomix/task の evmtools スキル、evmtools-webui）は、既存の公開 API（サブパス export、`getStatistics({filter})` 等）が後方互換であることを前提にできる。新規 CLI・メソッド・型はすべて追加であり、既存の戻り値・シグネチャは変化しない。

## 要件

### 要件 1: S カーブ用ロング形式時系列データの生成（単一ファイル入力）

**目的:** ライブラリ利用者として、単一のプロジェクトファイルから計画累積 PV 曲線と現在の EV を「日付 × 系列 × 値」のロング形式データとして得たい。それにより、Excel/BI にそのまま取り込んで S カーブを描画できる。

#### 受入基準（Acceptance Criteria）

1. When 単一プロジェクトが入力された場合, the Sカーブ生成ロジック shall プロジェクト開始日から終了日までの各稼働日について、計画累積 PV を値とするロング形式レコード（日付・系列名・値）を系列「計画PV」として生成する。
2. The Sカーブ生成ロジック shall 各ロング形式レコードを、日付（`YYYY-MM-DD`）・系列名・数値の 3 項目で構成し、同一日付に複数系列が存在する場合は系列ごとに別レコードとして出力する。
3. When 単一プロジェクトが入力された場合, the Sカーブ生成ロジック shall 基準日時点の現在 EV を、系列「EV」の基準日レコードとして 1 点出力する。
4. The Sカーブ生成ロジック shall 計画累積 PV 曲線を、土日/祝日を除外した稼働日のみで構成する（phase0 で稼働日除外済みの累積 PV 算出を前提とする）。
5. If フィルタ条件が指定された場合, then the Sカーブ生成ロジック shall 既存の統計と同一のタスク解決機構でリーフタスク部分集合を解決し、その部分集合の累積 PV 曲線と EV から系列を生成する。
6. If プロジェクトの開始日または終了日が欠損している、あるいは対象タスク集合が空である場合, then the Sカーブ生成ロジック shall 空のレコード集合を返し例外を発生させない。

### 要件 2: 複数スナップショットの実績トレンド合成

**目的:** プロジェクト管理者として、複数時点のスナップショット（過去〜現在の記録）から EV と SPI の実績推移を時系列で得たい。それにより、計画 PV 曲線に実績 EV/SPI トレンドを重ねて進捗の推移を可視化できる。

#### 受入基準（Acceptance Criteria）

1. When 複数のプロジェクトスナップショットが入力された場合, the Sカーブ生成ロジック shall 既存のスナップショットマージ機構で各スナップショットの統計を時系列に統合し、各時点の EV を系列「EV実績」のロング形式レコードとして出力する。
2. When 複数のプロジェクトスナップショットが入力された場合, the Sカーブ生成ロジック shall 各時点の SPI を系列「SPI実績」のロング形式レコードとして出力する。
3. Where スナップショット間に欠損日が存在する場合, the Sカーブ生成ロジック shall 既存の欠損日補完機構で欠損日を補完し、時系列が連続したロング形式データを生成する。
4. When 複数スナップショット入力時, the Sカーブ生成ロジック shall 要件 1 の計画累積 PV 曲線（系列「計画PV」）を併せて出力し、計画 PV と実績 EV/SPI が同一の日付軸上で比較可能なロング形式データを構成する。
5. If 入力スナップショットが 1 件のみである場合, then the Sカーブ生成ロジック shall 実績トレンド系列を合成せず、要件 1 の単一ファイル出力（計画 PV 曲線 + 現在 EV 点）にフォールバックする。

### 要件 3: オプション系列の出力（Earned Schedule・担当者別）

**目的:** ライブラリ利用者として、S カーブ出力に Earned Schedule 指標系列や担当者別 PV 系列をオプションで追加したい。それにより、時間ベースのスケジュール遅延や要員別の負荷推移も同一の可視化データで扱える。

#### 受入基準（Acceptance Criteria）

1. Where Earned Schedule 系列出力がオプションで有効化された場合, the Sカーブ生成ロジック shall phase3 の Earned Schedule 算出結果（SPI(t) 等）を、時系列のロング形式レコード（系列「SPI(t)」等）として出力する。
2. Where 担当者別系列出力がオプションで有効化された場合, the Sカーブ生成ロジック shall phase2 の担当者別日次 PV 集計を、担当者名を系列名とするロング形式レコードとして出力する。
3. While Earned Schedule 系列・担当者別系列のいずれのオプションも指定されていない（既定）場合, the Sカーブ生成ロジック shall これらの系列を出力せず、要件 1・要件 2 の基本系列のみを生成する。
4. If オプションで有効化された系列の算出が前提を満たさず不能である場合, then the Sカーブ生成ロジック shall 当該系列を空（レコードなし）とし、他系列の出力と全体処理を継続する。

### 要件 4: pbevm-scurve CLI と出力形式

**目的:** CLI 利用者として、既存の `pbevm-*` コマンドと同じ操作感で S カーブ用データを CSV/コンソールに出力したい。それにより、慣れたワークフローでグラフ用データを取得できる。

#### 受入基準（Acceptance Criteria）

1. The pbevm-scurve CLI shall 既存の `pbevm-show-pv` と同一の yargs ベース構造で、入力ファイルパス・基準日・フィルタ・オプション系列の指定を受け付ける。
2. When CLI が実行された場合, the pbevm-scurve CLI shall 生成したロング形式時系列データをコンソールに表示する。
3. When CLI が実行された場合, the pbevm-scurve CLI shall 生成したロング形式時系列データを CSV ファイルとして出力し、その CSV が Excel/BI でそのまま S カーブ描画に取り込める列構成（日付・系列・値）を持つ。
4. The pbevm-scurve CLI shall package.json の bin セクションに登録され、`npx pbevm-scurve` として起動できる。
5. When 複数スナップショットを指定して CLI が実行された場合, the pbevm-scurve CLI shall 複数入力を usecase へ渡し、要件 2 の実績トレンド合成結果を出力する。
6. The pbevm-scurve CLI shall ビジネスロジックを保持せず、データ生成を usecase に委譲する（プレゼンテーション層の責務分離を守る）。

### 要件 5: 完了予測バリエーション（楽観/標準/悲観）

**目的:** プロジェクト管理者として、単一シナリオではなく楽観/標準/悲観の 3 点で完了予測を得たい。それにより、完了時期の幅（ベスト〜ワースト）を把握してリスク判断ができる。

#### 受入基準（Acceptance Criteria）

1. The 完了予測バリエーションロジック shall 楽観・標準・悲観の 3 つのシナリオそれぞれについて、既存の完了予測ロジックを呼び出して完了予測結果を返す。
2. The 完了予測バリエーションロジック shall 楽観シナリオを SPI = 1（計画どおりのペース）で算出する。
3. The 完了予測バリエーションロジック shall 標準シナリオを累積 SPI（ΣEV/ΣPV）で算出する。
4. The 完了予測バリエーションロジック shall 悲観シナリオを、期間 SPI（直近窓の ΔEV/ΔPV）と SPI(t)（Earned Schedule の時間ベース効率）のうち低い方で算出する。
5. If 悲観シナリオの期間 SPI または SPI(t) が算出不能である場合, then the 完了予測バリエーションロジック shall 算出可能な指標のみで悲観シナリオを構成し、いずれも算出不能なときは標準シナリオの SPI にフォールバックする。
6. The 完了予測バリエーションロジック shall 既存の完了予測メソッドの内部ロジックを変更せず、その薄いラッパーとして各シナリオの SPI をオーバーライドして呼び出す。
7. The 完了予測バリエーションロジック shall 3 シナリオの結果を単一の戻り値として返し、その戻り値型を usecase バレルから利用できるよう公開する。

### 要件 6: 標準 EVM 式との対応ドキュメントと期間 SPI 接続例

**目的:** 保守者および利用者として、本ライブラリの独自ロジックが標準 EVM の式体系とどう対応するか、また期間 SPI を完了予測にどう接続するかを、ドキュメントで理解したい。それにより、EVM 理論と実装の対応を把握し正しく利用できる。

#### 受入基準（Acceptance Criteria）

1. The EVM管理ガイド（`docs/EVM-MANAGEMENT-GUIDE.md`）shall ETC = (BAC − EV) / SPI、工数版 EAC' = EV + ETC'、IEAC(t) = PD / SPI(t) を含む標準 EVM 式と、本ライブラリの `etcPrime`・完了予測・Earned Schedule 指標との対応表を含む。
2. The 完了予測の使用例（`docs/examples/04-completion-forecast.md`）shall 期間 SPI（`calculateRecentSpi` の ΔEV/ΔPV）を `spiOverride` に接続して直近ペースで完了予測を行うコード例を含む。
3. The CLI コマンド一覧（`docs/examples/06-cli-commands.md`）shall `pbevm-scurve` コマンドの用途・オプション・実行例を、既存コマンドと同一の記載形式で含む。

### 要件 7: コスト系 EVM の将来設計メモ

**目的:** 保守者として、実装しないと決定したコスト系 EVM（AC/CPI/CV/EAC(コスト) 等）について、将来 AC（実績工数）列を導入する場合の設計判断材料を残したい。それにより、将来の意思決定時に一から検討し直さずに済む。

#### 受入基準（Acceptance Criteria）

1. The コスト系EVM設計メモ（`docs/specs/requirements/REQ-COST-EVM-DRAFT.md`）shall 冒頭に「本メモは設計案であり本 spec では実装しない」旨を明記する。
2. The コスト系EVM設計メモ shall AC（実績工数）の入力ソース案（Excel/CSV への実績工数列追加と、既存 CSV カラムマップの拡張ポイント）を記載する。
3. The コスト系EVM設計メモ shall 型拡張案（`Statistics` へ `ac?`/`cpi?`/`cv?`/`eac?`/`tcpi?`/`vac?` を将来オプショナル追加する方針）を記載する。
4. The コスト系EVM設計メモ shall コスト系導入の判断前提（利用者が実工数を記録し始めること）を記載する。
5. The コスト系EVM設計メモ shall Backlog Issue 起票用の文面（タイトル・背景・スコープ）を含む。

### 要件 8: 後方互換とライブラリ公開

**目的:** 利用側（evmtools スキル、webui）として、本リリース後も既存の import と API がそのまま動作し続けることを保証されたい。それにより、破壊的変更を伴わずに新機能を段階導入できる。

#### 受入基準（Acceptance Criteria）

1. The ライブラリ shall S カーブ usecase の戻り値型と `calculateForecastVariants` の戻り値型を、既存の公開エントリーポイント（usecase バレル）から追加のみで export し、既存 export を削除・改名しない。
2. The ライブラリ shall 既存の公開 API（サブパス export、`getStatistics`・`calculateCompletionForecast`・`getTaskRows` 等の既定シグネチャ・戻り値形状）を変更しない。
3. When 新規 CLI・メソッド・型が追加された場合, the ライブラリ shall それらをすべて追加（非破壊）とし、既存コマンド・既存呼び出しの挙動を変えない。

### 要件 9: 検証・ドキュメント同期・トレーサビリティ

**目的:** 保守者として、S カーブ出力が実際に描画可能であること、および CLAUDE.md 規約（トレーサビリティ必須・master 同期必須）が満たされることを保証したい。それにより、実装と仕様・ドキュメントの一貫性を保つ。

#### 受入基準（Acceptance Criteria）

1. The 検証プロセス shall `pbevm-scurve` をサンプルデータで実行して得た CSV を Excel に取り込み、計画 PV 曲線（S カーブ）と実績 EV/SPI トレンドがグラフとして描けることを目視で確認する手順を含む。
2. The 検証プロセス shall 共通の検証ゲート（lint / format / test / build、Node 20/22、TZ=Asia/Tokyo および TZ=UTC の二重実行）を満たす。
3. When S カーブ usecase・`calculateForecastVariants`・関連型が実装された場合, the master 設計書（`docs/specs/domain/master/Project.spec.md`）shall 新メソッド・関連型・テストシナリオ・要件トレーサビリティ（AC-ID → TC-ID）・変更履歴（バージョン更新）を反映する。
4. The 案件設計書（本 spec の design.md）shall AC-ID が grep で検索可能な要件トレーサビリティ表を含む。
