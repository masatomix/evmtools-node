# 実装計画（phase2-skill-integration-0.0.31）

> 前提: phase0-bugfix-0.0.29（期間SPI ΔEV/ΔPV・日付ヘルパー・`calculateProjectDiffs` 空入力デフォルト）が develop に取り込み済みであること。3 機能（日次PV / アラート / アクティブ検出）は相互独立のため `(P)` を付与している。参照実装（task スキル 3 本）を数値一致のオラクルとする。

- [ ] 1. 基盤: テスト fixtures と依存前提の確立
- [ ] 1.1 参照一致テスト用の now/prev スナップショット fixtures を用意する
  - 階層構造（サブプロジェクト → 子ノード → リーフ）を持つ now/prev の 2 スナップショット（Excel または CSV）を fixtures として作成し、担当者・PV・EV・進捗率・予定終了日・delayDays を含める
  - 未割当タスク、休日を跨ぐ稼働日、過負荷（同日 PV>閾値）、PV=0 の連続、期限超過タスク、SPI 低下タスクを最低 1 件ずつ含める
  - 観測可能な完了条件: 3 機能のユニット/統合テストがこの fixtures を読み込んで Project を生成できる
  - _Requirements: 5.2, 5.3, 5.4_
- [ ] 1.2 phase0 依存と検証ゲートの現状を確認する
  - `calculateProjectDiffs([])` が全 0 / `hasDiff:false` のデフォルトを返すこと、日付ヘルパーが存在することを既存テストで確認する
  - `npm run lint && npm run format && npm test && npm run build` が現状グリーンであることを確認する
  - 観測可能な完了条件: 上記コマンドが成功し、phase0 デフォルト diff の挙動をテストで確認できる
  - _Requirements: 5.5_

- [ ] 2. 日次PV担当者別集計（Project）
- [ ] 2.1 (P) 担当者×日のPV明細集計を公開 API として実装する
  - リーフタスクを解決し、フィルタ（フルタスク名部分一致）・担当者絞り込み・期間（省略時はプロジェクト開始/終了日で補完、両端不明時はエラー）を適用する
  - 各稼働日で休日をスキップし、未割当を「(未割当)」に正規化し、計算PVが正のタスクのみを明細（タスク名・フルタスク名・小数第3位丸めPV）にする
  - 明細PVの合算を小数第3位で丸め、対象タスクを持つ担当者には正PVが無くても PV=0 エントリを出力する
  - 戻り値型・オプション型を定義し export する。既存の PV 系ゲッターは変更しない
  - 観測可能な完了条件: fixtures で呼ぶと担当者×稼働日のエントリ配列が返り、休日除外・PV=0 エントリ・丸めが参照実装と一致する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 4.2, 4.5_
  - _Boundary: Project.getDailyPvByAssignee_
- [ ] 2.2 (P) 日次PV集計のユニット/参照一致テストを追加する
  - 休日スキップ・未割当集約・フィルタ・担当者絞り込み・期間補完/エラー・丸め順序・PV=0 エントリ・リーフ限定・既存ゲッター回帰なしを検証する
  - 参照実装 `calculateDailyPvByAssignee`/`buildGapRanges` と同一入力で過負荷・gap・サマリ数値が一致することを統合テストで検証する（ヘッダーに要件ID/AC-ID 記載）
  - 観測可能な完了条件: 追加テストが TZ=Asia/Tokyo・TZ=UTC の双方で緑
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 5.2_
  - _Boundary: Project.getDailyPvByAssignee_
  - _Depends: 2.1_

- [ ] 3. アラート判定（AlertService）
- [ ] 3.1 (P) アラート判定ドメインサービスを新規実装する
  - 未完了タスク限定で、タスクSPI（Excel PV/EV、PV≤0 は 1.0）と Excel 遅延日数から CRITICAL_DELAY（<0.8 または >5 日）と WARNING_DELAY（<0.9 または >0 日、CRITICAL と排他）を判定する
  - 基準日時点の期限超過を独立の OVERDUE として追加し、担当者別未完了件数が上限（既定 10）超で HIGH_WORKLOAD を生成する
  - 各アラートに種別・重要度・対象名・タスクID・メッセージを持たせ、重要度別件数とサマリ文字列を返す。閾値はオプションで上書き可能にする
  - 型（Alert / AlertsResult / AlertOptions 等）とクラスを定義し、`evmtools-node/domain` から export する
  - 観測可能な完了条件: fixtures で呼ぶと 4 種別のアラート・counts・summary が返り、メッセージ文言が参照実装と一致する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.1, 4.5_
  - _Boundary: AlertService_
- [ ] 3.2 (P) アラート判定のユニット/参照一致テストを追加する
  - 未完了限定・CRITICAL/WARNING の境界と排他・OVERDUE 独立追加（同一タスクで 2 件）・HIGH_WORKLOAD・オプション上書き・counts/summary 書式・メッセージ文言を検証する
  - 参照実装 `checkAlertsCore` と同一入力で生成アラート（種別/重要度/対象/件数/サマリ）が一致することを統合テストで検証する
  - 観測可能な完了条件: 追加テストが TZ 二重実行で緑、メッセージ文言が固定される
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 5.3_
  - _Boundary: AlertService_
  - _Depends: 3.1_

- [ ] 4. アクティブサブプロジェクト検出（ProjectService）
- [ ] 4.1 (P) 差分のあるサブツリー検出を公開メソッドとして実装する
  - ツリーのルート直下から探索し、差分ありの子が単一なら掘り下げ、複数なら直前の単一祖先を返す（無ければその階層の全候補）、葉到達/差分なしなら直前の単一祖先か空を返す
  - 各子の差分件数を、その子のフルタスク名で絞ったタスク集合に対する差分集計（変更＋追加＋削除）として算出し、`calculateTaskDiffs` は一度だけ計算して再利用する
  - 最大探索深さオプションに対応し、名前・パス・階層トレース（decision 付き）を返す型を定義・export する
  - 観測可能な完了条件: fixtures で呼ぶと names/paths/trace が返り、単一掘り下げ・複数親返却・depth=1 複数・葉/差分なしの各分岐が参照実装と一致する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.3, 4.5_
  - _Boundary: ProjectService.detectActiveSubprojects_
- [ ] 4.2 (P) アクティブ検出のユニット/参照一致テストを追加する
  - 単一掘り下げ・複数で親返却・depth=1 複数・差分なし・葉到達・maxDepth 打ち切り・changeCount 定義・trace の depth/parentPath/decision を検証する
  - 参照実装 `detectActiveSubprojects` と同一入力で names/paths/trace が一致することを統合テストで検証する
  - 観測可能な完了条件: 追加テストが TZ 二重実行で緑、trace の decision 種別が固定される
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 5.4_
  - _Boundary: ProjectService.detectActiveSubprojects_
  - _Depends: 4.1_

- [ ] 5. 公開 API export と後方互換の統合
- [ ] 5.1 新規サービスの export と後方互換を確認する
  - AlertService とその型を domain バレルへ追加し、日次PV・アクティブ検出の型が `evmtools-node/domain` から解決できることを確認する
  - 既存サブパス export（domain/infrastructure/usecase/common/resource）と既存公開 API のシグネチャが不変であることを型・ビルドで確認する
  - 観測可能な完了条件: `evmtools-node/domain` から 3 機能の型/クラスが import でき、`npm run build` が型エラーなく成功する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Depends: 2.1, 3.1, 4.1_

- [ ] 6. 結合確認（数値一致の実証）
- [ ] 6.1 npm pack した tgz を task リポジトリへ file: インストールする
  - `npm pack` で tgz を生成し、task リポジトリへ `file:` 依存として導入してビルドが解決することを確認する
  - 観測可能な完了条件: task リポジトリ側で新バージョンの型が解決し、スキルがビルドできる
  - _Requirements: 5.1_
  - _Depends: 5.1_
- [ ] 6.2 スキル 3 本を新 API に置き換えて数値一致を確認する
  - `check-daily-pv` / `alerts` / `detect-active` を新公開 API へ一時置換し、同一 Excel・同一オプションで実行して、日次PV（過負荷・gap・サマリ）／アラート（種別・重要度・対象・件数・サマリ）／アクティブ検出（names・paths・trace）が現行出力と一致することを確認する（置換はコミットしない）
  - 観測可能な完了条件: 3 スキルの新旧出力が一致し、差分ゼロを確認できる
  - _Requirements: 5.2, 5.3, 5.4_
  - _Depends: 6.1_
- [ ] 6.3 共通検証ゲートを二重環境で通過させる
  - `npm run lint && npm run format && npm test && npm run build` を Node 20/22 かつ TZ=Asia/Tokyo・TZ=UTC で通過させる
  - 観測可能な完了条件: 全組み合わせで検証ゲートが緑
  - _Requirements: 5.5_
  - _Depends: 2.2, 3.2, 4.2_

- [ ] 7. 設計書同期とリリース準備
- [ ] 7.1 マスター設計書を新設・更新し要件トレーサビリティを同期する
  - AlertService のマスター設計書を新設し、日次PV を Project、アクティブ検出を ProjectService の各マスター設計書へ反映する
  - 各設計書に AC-ID → TC-ID の要件トレーサビリティ表を grep 可能な形式で記載し、feature 仕様（本 spec）と内容を同期する
  - 観測可能な完了条件: 3 つのマスター設計書に新メソッド/サービスとトレーサビリティ表が存在し、AC-ID が grep でヒットする
  - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - _Depends: 2.1, 3.1, 4.1_
- [ ] 7.2 バージョン更新と CHANGELOG 記載を行う
  - `package.json` を 0.0.31 に更新し、CHANGELOG に 3 機能の追加（新規公開 API）を記載する
  - 観測可能な完了条件: バージョンが 0.0.31 になり、CHANGELOG に 3 機能のエントリが載る
  - _Requirements: 6.1, 6.2_
  - _Depends: 6.3_

- [ ] 8. リリース後の後続 Issue 起票（task リポジトリ）
- [ ] 8.1 独自ロジック撤去 Issue を task リポジトリに起票する
  - v0.0.31 リリース後、task リポジトリに「evmtools-node を 0.0.31 へ更新し独自ロジック 3 本を新公開 API に置換・削除する」Issue を起票し、対象 3 ファイルと置換先 API 名、数値一致実証済みの旨を明記する
  - 観測可能な完了条件: 対象ファイル・置換先 API・結合確認結果を含む Issue が task リポジトリに作成される
  - _Requirements: 7.1, 7.2, 7.3_
  - _Depends: 7.2_
