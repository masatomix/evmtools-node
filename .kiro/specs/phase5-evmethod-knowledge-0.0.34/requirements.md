# 要件定義書

> **スコープ再改訂（2026-07-06、ユーザー判断）**: 先送りとしていた **evMethod（要件1〜4）を実装へ格上げ**。
> 根拠: EV 測定技法（0/100・50/50）は PMI 標準のドメイン計算であり、EV 導出は統計計算内部にあるため利用側では合成不可
> （公開 API 追加の基準4を満たす）。本 spec の design（resolveTaskEv/sumEvsBy/calculateSpiBy）に従い実装する。
> 知識ベース化（要件5）は実施済み。



> **スコープ改訂（本セッション、ユーザー判断）**: 本 spec のうち **#171 知識ベース化（要件5・docsのみ）のみ実施**。
> EV 算定方式オプション evMethod（要件1〜4, 0/100・50/50）は、実運用ニーズが未確認かつ StatisticsOptions 拡張を伴うため **Backlog に先送り**（知識ベースからは「主観バイアス対処の将来候補」として参照）。
> リリースは docs のみのため番号を消費せず、次リリースに同乗。



## はじめに

evmtools-node の EV（出来高）は現在、出来高按分方式（`EV = progressRate × workload`）一択で算出されている。`progressRate` は Excel で PM が手動入力する主観値であり、進捗の水増し・楽観バイアスが混入しうる。標準 EVM には、完了時のみ計上する **0/100 ルール**や、着手で半分・完了で全部を計上する **50/50 ルール**などの客観的 %complete 方式が存在し、これらをオプションとして提供すると進捗測定の健全性が上がる。重要なのは、**必要なデータが既存の Excel カラム（完了状態・実績開始日・工数）から導出可能で、新規入力を一切要求しない**点である。

本 spec（phase5-evmethod-knowledge-0.0.34）は 2 つの成果を提供する。

1. **EV 算定方式オプション**: 統計取得オプションに `evMethod`（`'progressRate'` / `'0/100'` / `'50/50'`）を追加する。デフォルトは `'progressRate'` で現行挙動を完全維持し、既存テストが無変更で通ることを受け入れ条件とする。実装は Project の統計計算側（EV の導出）に閉じ、Excel 読み込み値である `TaskRow.ev` 自体は変更しない。選択した方式は SPI・SV・完了予測・Earned Schedule など EV を用いる下流指標へ一貫して反映する。
2. **#171 EVM 知見の知識ベース化**: 実運用 WBS 分析で得た知見ⓐ〜ⓗ を `docs/EVM-KNOWLEDGE.md` として体系化する。各知見に「現象」「理論的背景」「本ツールでの確認方法（該当 API / CLI）」「対処・解決状況」を紐づける。終盤 SPI 収束は phase3 の Earned Schedule、回復/失速の検出は phase0 の期間SPI、予測の幅は phase4 の 3 点予測を参照する。実装を伴う機能化候補 3 件は本 spec では実装せず Backlog Issue として起票する。

前提として、0/100・50/50 の完了判定は phase0-bugfix-0.0.29 で定義された許容誤差付き `finished`（`progressRate >= 1.0 − EPSILON`）に依存する。本リリースは v0.0.34 相当で、既存 API を破壊しない非破壊拡張とする。

## 範囲（境界コンテキスト）

- **対象範囲**:
  - EV 算定方式オプション `evMethod`（`'progressRate'` / `'0/100'` / `'50/50'`、既定 `'progressRate'`）の追加と、Project 統計計算側での方式別 EV 導出
  - 選択方式の下流指標（プロジェクト SPI / SV / etcPrime / 完了予測日 / Earned Schedule の SPI(t) / IEAC(t)）および担当者別統計への一貫反映
  - 3 方式 ×（未着手 / 仕掛 / 完了）のマトリクスと下流指標への反映を検証するテスト
  - `docs/EVM-KNOWLEDGE.md` の新設（知見ⓐ〜ⓗ の体系化）と、README / GLOSSARY からのリンク・EV 算定方式の用語追加
  - 機能化候補 3 件（ⓗ′ / ⓒ / ⓕ）の Backlog Issue 起票
  - master 設計書（`Project.spec.md`）の同期、要件トレーサビリティ、release/0.0.34 準備
- **対象外**:
  - 機能化候補ⓗ′（タスク name 変化警告）・ⓒ（停滞タスク経時追跡）・ⓕ（BAC トレンド）の機能実装（Backlog へ先送り）
  - `progressRate` 入力方式そのものの変更、Excel テンプレートの変更、新規入力カラムの追加
  - EV 履歴の永続化（スナップショット管理は現行の複数ファイル方式のまま）
  - コスト系 EVM（AC / CPI 等。AC 入力が必要なため対象外。設計メモは phase4 で作成済み）
- **隣接システム/仕様への期待**:
  - phase0-bugfix-0.0.29 が提供する許容誤差付き `finished`（`progressRate >= 1.0 − EPSILON`）を、0/100・50/50 の完了判定の前提として利用する。phase0 が未反映の場合、完了判定は厳密等価となり境界値の扱いが変わる。
  - phase3-earned-schedule-0.0.32 が追加した `Statistics` の ES フィールド（`spiT` / `svT` / `esForecastDate`）および `StatisticsOptions.includeEarnedSchedule` と、本 spec が追加する `evMethod` はフィールド名が衝突しないこと。ES の EV 入力（`getStatistics(options).totalEv`）経由で `evMethod` が一貫反映されること。
  - phase4-scurve-eac-0.0.33 の 3 点予測（`calculateForecastVariants`）を、知識ベースの「予測の幅」の解説対象として参照する。
  - 利用側（masatomix/task の evmtools スキル、evmtools-webui）は、既存の公開 API（サブパス export、`getStatistics({filter})` 等）が後方互換であることを前提にできる。`evMethod` はオプトインで追加され、既定の戻り値は変化しない。

## 要件

### 要件 1: EV 算定方式オプションの導入と後方互換

**目的:** ライブラリ利用者として、統計取得時に EV の算定方式を選べるようにしたい。それにより、主観的な進捗率按分だけでなく客観的な %complete 方式でも進捗を測定できる。同時に、方式を指定しない既存利用は一切影響を受けないことを保証したい。

#### 受入基準（Acceptance Criteria）

1. Where 統計取得オプションで EV 算定方式が指定されない、または `'progressRate'` が指定された場合, the Project shall 従来と同一の出来高按分（Excel 由来の各タスク `ev`）で EV を集計し、既存の統計・SPI・完了予測の戻り値を変えない。
2. Where 統計取得オプションで EV 算定方式が指定された場合, the Project shall `'progressRate'` / `'0/100'` / `'50/50'` のいずれかの方式に従って各リーフタスクの EV を導出する。
3. The Project shall EV 算定方式をオプショナルなプロパティとして統計取得オプションに追加し、当該プロパティを含まない既存の呼び出しの戻り値の形状（型・フィールド）を変えない。
4. The EV 算定方式 shall 既存の Excel 入力（工数・進捗率・実績開始日・完了状態）のみから EV を導出し、新規の入力カラムを要求しない。
5. The EV 算定方式 shall Excel 読み込み値である各タスクの `TaskRow.ev` を書き換えず、EV の導出は Project の統計計算側でのみ行う。

### 要件 2: 0/100 方式による EV 導出

**目的:** ライブラリ利用者として、完了したタスクのみ EV を計上する 0/100 ルールで進捗を測定したい。それにより、仕掛中の主観的な進捗率に依存しない、最も保守的で客観的な出来高を得られる。

#### 受入基準（Acceptance Criteria）

1. While EV 算定方式が `'0/100'` の場合, when タスクが完了している（`finished` が真）, the Project shall そのタスクの EV を当該タスクの工数（`workload`）とする。
2. While EV 算定方式が `'0/100'` の場合, when タスクが未完了（`finished` が偽）, the Project shall そのタスクの EV を `0` とする（未着手・仕掛を区別しない）。
3. The Project shall `'0/100'` 方式の完了判定に、phase0-bugfix-0.0.29 で定義された許容誤差付き `finished`（`progressRate >= 1.0 − EPSILON`）を用いる。
4. If 完了タスクの工数が未設定である場合, then the Project shall そのタスクの EV を `0` として扱う。

### 要件 3: 50/50 方式による EV 導出

**目的:** ライブラリ利用者として、着手で工数の半分・完了で全部を計上する 50/50 ルールで進捗を測定したい。それにより、進捗率の主観に依存せず、着手済みの仕掛作業を一定の客観ルールで出来高に反映できる。

#### 受入基準（Acceptance Criteria）

1. While EV 算定方式が `'50/50'` の場合, when タスクが完了している（`finished` が真）, the Project shall そのタスクの EV を当該タスクの工数（`workload`）とする。
2. While EV 算定方式が `'50/50'` の場合, when タスクが未完了かつ実績開始日（`actualStartDate`）が設定されている（仕掛）, the Project shall そのタスクの EV を `工数 × 0.5` とする。
3. While EV 算定方式が `'50/50'` の場合, when タスクが未完了かつ実績開始日が未設定（未着手）, the Project shall そのタスクの EV を `0` とする。
4. If タスクの工数が未設定である場合, then the Project shall そのタスクの EV を `0` として扱う。

### 要件 4: 下流指標への一貫反映

**目的:** ライブラリ利用者として、選択した EV 算定方式が SPI・SV・完了予測・Earned Schedule のすべてに一貫して反映されるようにしたい。それにより、単一の方式指定で進捗評価の全体系が整合する。

#### 受入基準（Acceptance Criteria）

1. Where EV 算定方式が指定された場合, the Project shall 選択方式で導出した EV を用いてプロジェクト SPI（合計EV ÷ 合計PV）および SV を算出する。
2. Where EV 算定方式が指定された場合, the Project shall 選択方式で導出した EV を用いて完了予測（残作業・etcPrime・完了予測日）を算出する。
3. Where EV 算定方式と Earned Schedule 算出（`includeEarnedSchedule`）がともに指定された場合, the Project shall Earned Schedule の EV 入力にも同一方式で導出した EV を用い、ES / SPI(t) / SV(t) / IEAC(t) / 完了予測日へ一貫反映する。
4. The Project shall EV 算定方式の指定に関わらず PV（計画価値）・累積PV曲線・BAC（総工数）を変化させない（方式は EV の導出のみに影響する）。
5. Where 担当者別統計を取得する場合, the Project shall 指定された EV 算定方式を担当者別の EV および SPI にも一貫して適用する。

### 要件 5: EVM 知識ベースの体系化（#171）

**目的:** プライムブレインズ社の PM および保守者として、実運用で得た EVM 知見を体系化されたリファレンスとして参照したい。それにより、各指標の落とし穴と本ツールでの確認方法・解決状況を一箇所で把握できる。

#### 受入基準（Acceptance Criteria）

1. The 知識ベース（`docs/EVM-KNOWLEDGE.md`）shall 知見ⓐ（母数効果）・ⓑ（終盤 SPI 1.0 収束）・ⓒ（停滞タスク隠蔽）・ⓓ（SV の横比較不可）・ⓔ（再ベースライン起因ディップ）・ⓕ（BAC 単調増加）・ⓖ（SV 負基調）・ⓗ′（ID 突合 + name 変化警告）のそれぞれについて、「現象」「理論的背景」「本ツールでの確認方法（該当 API / CLI 名）」「対処・解決状況」の 4 観点で記載する。
2. Where 知見ⓑ（終盤の古典 SPI 1.0 収束）を記載する場合, the 知識ベース shall phase3-earned-schedule-0.0.32 の Earned Schedule（SPI(t)）による解決を参照する。
3. Where 進捗の回復/失速の検出方法を記載する場合, the 知識ベース shall phase0-bugfix-0.0.29 の期間SPI（ΔEV/ΔPV, `ProjectService.calculateRecentSpi`）を参照する。
4. Where 完了予測の幅（楽観 / 標準 / 悲観）を記載する場合, the 知識ベース shall phase4-scurve-eac-0.0.33 の 3 点予測（`calculateForecastVariants`）を参照する。
5. Where 進捗率の主観バイアスへの対処を記載する場合, the 知識ベース shall 本 spec で追加する EV 算定方式（`'0/100'` / `'50/50'`）を客観的 %complete 方式として参照する。
6. The 知識ベース shall 日本語で、プライムブレインズ社の PM が読める粒度で記述し、元資料 `docs/brainstorm-evm-indicators.md` へのリンクを保持する。

### 要件 6: ドキュメント・設計書の同期と Backlog 起票

**目的:** 保守者として、EV 算定方式と知識ベースがプロジェクト規約どおりに用語集・master 設計書へ反映され、機能化候補が失われずに Backlog へ引き継がれる状態を保ちたい。それにより、CLAUDE.md の規約（トレーサビリティ必須・master 同期必須）とロードマップの継続性を満たす。

#### 受入基準（Acceptance Criteria）

1. The README および用語集（`docs/GLOSSARY.md`）shall `docs/EVM-KNOWLEDGE.md` へのリンクを張り、用語集に EV 算定方式（`progressRate` / `0/100` / `50/50`）の定義を追加する。
2. When EV 算定方式が実装された場合, the master 設計書（`docs/specs/domain/master/Project.spec.md`）shall 新オプション・方式別 EV 導出仕様・テストシナリオ・要件トレーサビリティ（AC-ID → TC-ID）・変更履歴（バージョン更新）を反映する。
3. The 案件設計書（本 spec の design.md）shall AC-ID が grep で検索可能な要件トレーサビリティ表を含む。
4. The プロジェクト shall 機能化候補 3 件（ⓗ′ タスク name 変化警告 / ⓒ 停滞タスク経時追跡 / ⓕ BAC トレンド）を本 spec では実装せず、それぞれ独立した Backlog Issue として起票する（起票用の文面を用意する）。
5. The リリース準備 shall `package.json` のバージョンを 0.0.34 に更新し、CHANGELOG に EV 算定方式オプションの追加（非破壊 Feature）を明記する。
