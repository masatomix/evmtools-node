# 調査・設計判断テンプレート

## 概要
- **機能**: `phase3-earned-schedule-0.0.32`
- **ディスカバリー範囲**: 拡張（既存 `Project`/`TaskRow` ドメインへの新指標追加。Light Discovery + ドメイン理論調査）
- **主要な知見**:
  - Earned Schedule（ES）は追加入力なしに既存の累積PV曲線・EV・基準日のみで算出でき、古典 SPI の終盤 1.0 収束欠陥を根本解決する。
  - 累積PV曲線の構築に必要な部品（`generateBaseDates`・`isHoliday`・`sumCalculatePVs`・`plannedWorkDays`）はすべて `Project` に実装済みで、暦日展開ループ（`calculateCompletionForecast` 740-747）が完了予測日算出のパターンとして再利用できる。
  - domain 層を純粋に保つため、ES の数学的コア（補間・SPI(t)/SV(t)/IEAC(t)）を Date/Project 非依存の純関数として切り出し、曲線構築と暦日展開は `Project` 側に置く分割が最適。

## 調査ログ

### Earned Schedule 理論（Walt Lipke / PMI 標準）
- **背景**: 古典 SPI（EV/PV）は完了時に EV=PV=BAC となり必ず 1.0 に収束するため、終盤の遅延を表現できない（要件 3 / 知見ⓑ）。ES はスケジュール差異を時間軸に射影して解決する。
- **参照ソース**: PMI Practice Standard for EVM 2nd Ed. Appendix D、Walt Lipke "Schedule is Different"（Earned Schedule 提唱）、本リポジトリ `docs/brainstorm-evm-indicators.md`（知見ⓑ 実運用データ）。
- **知見**:
  - ES = C + I。C は「累積PV(C) <= 現在EV」を満たす完了済み時間増分の数、I = (EV − 累積PV(C)) / (累積PV(C+1) − 累積PV(C)) の線形補間。
  - AT（Actual Time）= 開始から基準日までの経過時間（本実装では稼働日数）。
  - SPI(t) = ES / AT、SV(t) = ES − AT。IEAC(t) = PD / SPI(t)（独立完了予測、稼働日単位）。
  - ES は 1.0 収束せず、完了時には「実所要期間 / 計画所要期間」に対応する真のスケジュール効率へ収束する。
- **示唆**: 時間単位は本ライブラリの一貫性から「稼働日」を採用（月ではなく稼働日増分でカーブを刻む）。ES/AT/SV(t)/IEAC(t) はすべて稼働日単位、完了予測日のみ暦日展開する。

### 既存部品の再利用可能性（コードベース分析）
- **背景**: ES 算出に必要な曲線構築・稼働日計数・暦日展開を新規実装せず既存資産で賄えるか確認する。
- **参照ソース**: `src/domain/Project.ts`、`src/domain/TaskRow.ts`、`src/common/utils.ts`。
- **知見**:
  - `Project.plannedWorkDays`（613）= `generateBaseDates(start,end).filter(!isHoliday).length` がそのまま PD。
  - 稼働日配列は `generateBaseDates(startDate, baseDate/endDate)` + `isHoliday` フィルタで得られる。AT も同パターン（開始→基準日）。
  - 累積PV曲線の各点は `sumCalculatePVs(leafRows, workDay)`（860 付近、phase0 で土日/祝日除外済み）。`_internalPvByProjectLong(true)`（434）が同種の稼働日別累積PV集計を行っており、集計方式の参考になる。
  - 完了予測日の暦日展開は `calculateCompletionForecast` の 740-747 ループ（`isHoliday` をスキップしつつ日数を進める）と同一パターン。
  - タスク部分集合の解決は `_resolveTasks(options)`（256）がリーフフィルタ込みで提供済み。EV は `getStatistics(options).totalEv`（281-283 の `sumEVs`）。
- **示唆**: 新規ファイルは ES の型と数学コアのみ。`Project.calculateEarnedSchedule()` が曲線構築・AT/PD 計数・暦日展開を担い、コアへ数値を渡す。

### Statistics 拡張の後方互換性
- **背景**: 既存 `Statistics` 型（901-922）と `StatisticsOptions`（953、現状 `TaskFilterOptions` の別名）に ES を非破壊で足す必要がある（要件 4）。
- **参照ソース**: `src/domain/Project.ts` 901-953、steering `roadmap.md`（Shared seams: Statistics を phase3/phase5 がそれぞれオプショナル拡張、フィールド名衝突に注意）。
- **知見**: 既存の拡張プロパティ（`etcPrime?`・`completionForecast?`）と同様にオプショナル追加すれば戻り値形状は不変。`StatisticsOptions` に `includeEarnedSchedule?: boolean`（既定 off）を足しても既存呼び出しに影響しない。
- **示唆**: ES 算出は曲線構築コストがあるためデフォルト off。phase5 も同型を拡張するためフィールド名は `spiT`/`svT`/`esForecastDate` と ES 専用命名で衝突を回避。

## アーキテクチャパターン評価

| 案 | 説明 | 強み | リスク／制約 | 備考 |
|----|------|------|--------------|------|
| A: 数学コアを純関数として分離（採用） | ES 補間・SPI(t)/SV(t)/IEAC(t) を Date/Project 非依存の純関数に、曲線構築と暦日展開を Project に置く | domain 純度維持、手計算一致テストが容易、phase4 が数学コアを再利用可 | Project とコアの入出力契約を明示する必要 | steering `structure.md`（domain は外部依存なし）と整合 |
| B: すべて Project メソッド内に実装 | 曲線構築から補間まで `Project.calculateEarnedSchedule` に凝集 | ファイル数最小 | 純粋な数学部分がテストしづらく、phase4 再利用も不可 | 却下 |
| C: 稼働日ではなく月増分で ES | PMI 教科書どおり月単位で刻む | 文献の式にそのまま一致 | 本ライブラリは稼働日粒度で PV を刻むため不整合、日次精度が失われる | 却下 |

## 設計判断

### 判断: ES 数学コアの純関数分離
- **背景**: domain 層の外部非依存を保ちつつ、手計算一致テスト（要件 3/検証）と phase4 再利用を両立する必要がある。
- **検討した代替案**:
  1. 案 A — `EarnedSchedule.ts` に型 + 純関数（曲線配列・EV・AT・PD を受け取り ES/SPI(t)/SV(t)/IEAC(t) を返す）。
  2. 案 B — Project メソッドに全処理を凝集。
- **採用案**: 案 A。純関数は Date を扱わず数値配列と数値のみを入出力する。`Project.calculateEarnedSchedule()` が `generateBaseDates`+`isHoliday`+`sumCalculatePVs` で曲線を 1 回構築、AT/PD を計数し、コアへ渡す。完了予測日の暦日展開は Project 側（`isHoliday` 依存のため）。
- **理由**: domain 純度を保ちつつテスト容易性と再利用性を確保。phase4 の予測バリエーションが SPI(t) と ES 系列を直接利用できる。
- **トレードオフ**: Project とコアの契約（曲線の索引規約）を設計で明示する分の記述コスト。
- **フォローアップ**: 曲線の 0 始点（開始前 PV=0）を含めるか末尾に BAC を置くかの索引規約を実装時にテストで固定する。

### 判断: PV 曲線の 1 回構築とメモ化
- **背景**: ES 探索で候補インデックスごとに `sumCalculatePVs` を呼ぶと O(days² × tasks) になり大規模プロジェクトで劣化する。
- **検討した代替案**:
  1. 稼働日配列を 1 回走査して累積PV配列を構築し、線形/二分探索で k を求める。
  2. 探索のたびに `sumCalculatePVs(candidateDate)` を呼ぶ。
- **採用案**: 案 1。曲線を `number[]`（各稼働日の累積PV）として 1 回構築し、以降は配列参照のみ。`_internalPvByProjectLong(true)` の集計を流用して 1 パスで曲線化する余地も残す。
- **理由**: O(days × tasks) に抑えつつ、探索・補間を配列操作に閉じる（要件 6.2）。
- **トレードオフ**: 曲線配列をメモリに保持するが、稼働日数規模では無視できる。
- **フォローアップ**: フィルタ指定時は部分集合ごとに曲線を再構築する（キャッシュキーにフィルタを含める）。

## リスクと緩和策
- リスク: phase0-bugfix-0.0.29 が未リリースだと曲線に土日 PV が混入し ES がずれる — 緩和策: 本 spec は phase0 完了を着手前提とし、曲線が稼働日のみで構成されることを統合テストで確認。
- リスク: ES 索引規約（0 始点/1 始点、末尾 BAC）の解釈ブレで補間が ±1 日ずれる — 緩和策: 手組み小規模プロジェクトの手計算一致テストで索引規約を固定。
- リスク: `Statistics` フィールド名が phase5 の拡張と衝突 — 緩和策: ES 専用命名（`spiT`/`svT`/`esForecastDate`）を採用し roadmap の共有シーム注意に従う。
- リスク: AT=0（開始日=基準日）や EV=0/EV=BAC の境界で 0 除算・外挿 — 緩和策: 要件 1/2 の境界 AC を純関数のガード節で処理し、専用テストで検証。

## 参考文献
- PMI, *Practice Standard for Earned Value Management*, 2nd Ed., Appendix D — 古典 SPI の終盤 1.0 収束と ES の位置づけ。
- Walt Lipke, *Schedule is Different* / Earned Schedule 提唱資料 — ES = C + I の定義、SPI(t)/IEAC(t) の式。
- `docs/brainstorm-evm-indicators.md`（知見ⓑ） — 本リポジトリ実運用データでの終盤 SPI 1.0 収束の確認。
- `.kiro/specs/phase0-bugfix-0.0.29/design.md` — `calculatePVs` の土日/祝日除外（PV 曲線精度の前提）と `isHolidayFn` 注入設計。
