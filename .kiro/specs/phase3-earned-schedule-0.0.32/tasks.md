# 実装計画（phase3-earned-schedule-0.0.32）

> **スコープ改訂（2026-07-04、ユーザー判断）**: steering「公開 API 追加の基準」の再評価により、
> **要件4（Statistics へのオプトイン統合: spiT/svT/esForecastDate + StatisticsOptions.includeEarnedSchedule）は取り下げ**。
> 利用者は `calculateEarnedSchedule()` を直接呼べばよく、統計戻り値への混ぜ込みは合成可能な便宜のため。
> これにより Statistics 型・StatisticsOptions は不変（phase5 とのフィールド調整問題も解消）。
> **採用**: `Project.calculateEarnedSchedule(options?: TaskFilterOptions): EarnedScheduleResult | undefined` + `EarnedScheduleResult` 型のみ。
> 追加理由（基準4）: ES/SPI(t)/SV(t)/IEAC(t) は EVM 理論の標準指標＝本ライブラリのドメイン計算そのもの。
> 精度が PV 曲線構築の細部（稼働日・休日・丸め）に依存するため、利用側再実装は数値乖離リスク（計算の単一ソース化）。
> リリース番号は 0.0.32 → **0.0.31** に繰り上げ（phase1/2 が 0.0.30 に合流したため）。



- [x] 1. 基盤: Earned Schedule 型と純関数モジュールの骨組み
- [x] 1.1 ES の型定義と domain バレル export
  - `EarnedScheduleResult`（es, at, spiT, svT, iEacT, pd）と純関数入力 `EarnedScheduleInput`（pvCurve, ev, at, pd）を新規モジュールに定義する（時間単位はすべて稼働日）
  - `calculateEarnedSchedule` 関数のシグネチャ（入力 → `EarnedScheduleResult | undefined`）をスタブとして用意し、Date/Project/common を import しない純粋モジュールとする
  - domain バレルから ES 型を export し、`evmtools-node/domain` から型が解決できることを型チェックで確認する
  - _Requirements: 2.1, 2.2_
  - _Boundary: EarnedSchedule コア_

- [x] 2. コア: Earned Schedule 数学ロジック
- [x] 2.1 線形補間による ES 算出と境界処理
  - 累積PV曲線と EV から `累積PV(k) <= EV < 累積PV(k+1)` の最後の k を求め、`ES = k + (EV − 累積PV(k)) / (累積PV(k+1) − 累積PV(k))` で線形補間する
  - 境界を処理する: EV=0 → ES=0、EV>=BAC（曲線末尾）→ ES=PD（外挿しない）、区間差<=0 → 補間せず ES=k、曲線空/PD=0 → undefined
  - 手組みの小規模曲線を関数に渡すと ES が手計算値と一致し、EV が AT 時点PV 以上なら ES>=AT・未満なら ES<AT の符号関係が観測できる
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - _Boundary: EarnedSchedule コア_

- [x] 2.2 SPI(t) / SV(t) / IEAC(t) の導出
  - ES・AT・PD から `SPI(t)=ES/AT`（AT>=1 のときのみ、AT=0 は undefined）、`SV(t)=ES−AT`（常時）、`IEAC(t)=PD/SPI(t)`（SPI(t) が定義かつ>0 のときのみ、それ以外 undefined）を算出し `EarnedScheduleResult` を組み立てる
  - AT=0 の入力で SPI(t) と IEAC(t) が undefined、SV(t) が ES と一致する結果が返ることを観測できる
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_
  - _Boundary: EarnedSchedule コア_
  - _Depends: 2.1_

- [x] ~~3. 統合: Project への配線と Statistics 拡張~~ **取り下げ（スコープ改訂）**
- [x] 3.1 累積PV曲線の1回構築とメモ化・AT/PD/EV の計数
  - リーフタスク部分集合を既存のタスク解決機構で解決し、開始日→終了日の稼働日配列（土日/祝日を除外）を生成、各稼働日の累積PV（稼働日除外済みの累積PV算出を利用）を 1 回だけ走査して曲線配列へメモ化する
  - AT（開始日→基準日の稼働日数）・PD（稼働日配列長 = 計画稼働日数）・EV（部分集合の合計 EV）を取得する
  - 土日/祝日を含むデータでも曲線が稼働日のみで構成され、曲線構築が稼働日ごとの全再計算にならない（1 パス構築）ことを観測できる
  - _Requirements: 5.1, 5.3, 6.1, 6.2_
  - _Boundary: Project.calculateEarnedSchedule_

- [x] 3.2 calculateEarnedSchedule メソッドと完了予測日の暦日展開
  - 曲線・EV・AT・PD を ES 数学コアへ渡して ES 指標を得て、IEAC(t) が算出できた場合は開始日から IEAC(t) 稼働日分を暦日展開（土日/祝日をスキップ）した完了予測日を付与する
  - タスク集合が空、または開始/終了日が欠損する場合は undefined を返し例外を発生させず、休日跨ぎの基準日でも稼働日インデックス基準の一貫した ES を返す
  - メソッド呼び出しで ES/SPI(t)/SV(t)/IEAC(t)/完了予測日を含む結果が得られ、空フィルタ結果では undefined が返ることを観測できる
  - _Requirements: 2.8, 5.2, 6.3_
  - _Boundary: Project.calculateEarnedSchedule_
  - _Depends: 2.2, 3.1_

- [x] ~~3.3 Statistics への ES 指標オプトイン統合~~ **取り下げ（スコープ改訂）**
  - `Statistics` 型に `spiT?`・`svT?`・`esForecastDate?` をオプショナル追加し、統計取得オプションに ES 算出フラグ（既定 off）を追加する
  - フラグ有効時のみ統計計算経路で ES を算出して統計へ合成し、既定（フラグ無指定）では ES を算出せず ES 関連フィールドを未設定のまま戻り値の形状を変えない
  - フラグ有効の統計取得で `spiT`/`svT`/`esForecastDate` が設定され、フラグ無指定の既存呼び出しでは戻り値が従来と同一形状であることを観測できる
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Boundary: Statistics 型拡張, Project.calculateEarnedSchedule_
  - _Depends: 3.2_

- [x] 4. 検証: 単体・統合・終盤乖離の実証
- [x] 4.1 (P) EarnedSchedule 数学コアの単体テスト
  - 手組み小規模プロジェクト（5 稼働日 × 2 タスク）の曲線で ES が手計算値と一致し、索引規約（0/1 始点・末尾 BAC）が固定されることを検証する
  - EV=0→ES=0、EV=BAC→ES=PD、補間中間値、ΔPV=0 区間で ES=k、AT=0 で SPI(t)/IEAC(t) が undefined・SV(t)=ES のケースを網羅する
  - 全ケースがグリーンで、ES/SPI(t)/SV(t)/IEAC(t) の境界挙動が回帰なく固定される
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 2.5, 2.6, 2.7_
  - _Boundary: EarnedSchedule コア（テスト）_
  - _Depends: 2.2_

- [x] ~~4.2 Project 統合テスト（曲線・フィルタ・完了予測日・Statistics）~~ **取り下げ（スコープ改訂）**
  - 土日/祝日を含むデータで曲線が稼働日のみで構成されること、休日跨ぎで ES が一貫すること、完了予測日が土日/祝日をスキップして暦日展開されることを検証する
  - フィルタ部分集合の ES 算出と空集合での undefined、`includeEarnedSchedule` 有効時のみ `Statistics.spiT`/`svT`/`esForecastDate` が設定され既定 off で未設定となることを検証する
  - 実データ相当の fixture で ES 指標と完了予測日がグリーンに算出され、フィルタ/オプトイン挙動が観測できる
  - _Requirements: 2.8, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_
  - _Boundary: Project.calculateEarnedSchedule（テスト）_
  - _Depends: 3.3_

- [x] 4.3 終盤の古典 SPI 1.0 収束 vs SPI(t) 乖離の実証テスト
  - EV が BAC に接近し実際には遅延している終盤シナリオを再現し、同一データで古典 `spi` が 1.0 近傍に収束する一方 `spiT` が 1.0 未満（遅延）を返すことをアサートする
  - テストが知見ⓑ（終盤の SPI 1.0 収束問題）の ES による解決根拠として機能し、乖離が数値で実証される
  - _Requirements: 3.1, 3.2_
  - _Boundary: Project.calculateEarnedSchedule（テスト）_
  - _Depends: 3.3_

- [x] 5. ドキュメント・設計書の同期
- [x] 5.1 (P) GLOSSARY への Earned Schedule 用語追加
  - `docs/GLOSSARY.md` に ES・SPI(t)・SV(t)・IEAC(t)・AT・PD の定義と算出式を Earned Schedule 標準（Walt Lipke / PMI）に準拠して追加する
  - 用語集を参照すると各指標の意味・式・稼働日単位が一貫して確認できる
  - _Requirements: 7.1_
  - _Boundary: docs/GLOSSARY.md_
  - _Depends: 3.3_

- [x] 5.2 (P) brainstorm 資料の知見ⓑ への解決注記
  - `docs/brainstorm-evm-indicators.md` の知見ⓑ（終盤の古典 SPI 1.0 収束問題）に「Earned Schedule（SPI(t)）で解決」の注記を追加する
  - ⓑ の記述から本 spec の ES 実装への解決トレースが辿れる
  - _Requirements: 7.2_
  - _Boundary: docs/brainstorm-evm-indicators.md_
  - _Depends: 3.3_

- [x] 5.3 (P) master 設計書（Project.spec.md）の同期
  - `docs/specs/domain/master/Project.spec.md` に `calculateEarnedSchedule` メソッド・`Statistics` 拡張・テストシナリオ・AC-ID→TC-ID の要件トレーサビリティ表・変更履歴（バージョン更新）を反映する
  - master 設計書がクラスの全体像として ES 追加を含み、AC-ID が grep で検索可能な形式でトレーサビリティが確認できる
  - _Requirements: 7.3, 7.4_
  - _Boundary: docs/specs/domain/master/Project.spec.md_
  - _Depends: 4.2, 4.3_

## Implementation Notes
- レビュー advisory: (1) シグネチャは TaskFilterOptions に修正済み (2) EarnedSchedule.ts の delta<=0 ガードは到達不能な防御コード（ミューテーション生存で実証、JSDoc 明記済み） (3) フィルタ部分集合の早期完了時 SPI(t)>1 の挙動は phase4 でドキュメント化推奨
- リリースタスク（バージョン/CHANGELOG）は release/0.0.31 ブランチで実施に読み替え
