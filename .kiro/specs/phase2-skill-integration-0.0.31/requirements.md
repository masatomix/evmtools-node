# 要件定義書

> **スコープ改訂（2026-07-04、ユーザー判断）**: steering「公開 API 追加の基準」の適用により、
> **要件2（AlertService）と要件3（detectActiveSubprojects）は取り下げ**。
> いずれも公開 API（getStatisticsByName / getDelayedTasks / calculateRecentSpi / getTree / calculateTaskDiffs）
> だけで利用側が合成可能であり、閾値・文言・「アクティブ」定義は利用側固有のポリシーのため。
> **要件1（getDailyPvByAssignee）のみ実施**。合成できない理由（基準4）: ライブラリ内部の同一 EVM 計算
> （_internalPvByNameLong 相当）をスキルが再実装しており、丸め・(未割当)・日付ラベルの細部乖離による
> **数値不一致リスクの解消（計算の単一ソース化）**。getStatistics({filter})（#393→0.0.25）と同一パターン。
> リリースは 0.0.31 単独ではなく **0.0.30（phase1 残置分と合流）** に変更。



## はじめに

masatomix/task リポジトリの evmtools スキル（`/Users/masatomix/git/task/.claude/skills/evmtools/`）は、本来ライブラリ（evmtools-node）に置くべき EVM 計算ロジックを 3 本独自実装している。これは「計算は evmtools-node に集約し、WebUI・CLI・スキルで数値を一致させる」というプロジェクト方針（roadmap / REQ-EVM-SKILL-003A）に反する。

対象の 3 本は次のとおり:

1. **日次PV担当者別集計**（スキル `scripts/src/cli/check-daily-pv.ts` の `calculateDailyPvByAssignee`）。コメントに「`Project._internalPvByNameLong()` と同等のロジックだが、フィルタ済みタスクを受け取れるようにしている」と明記されている。ライブラリ内部関数（`src/domain/Project.ts` の `_internalPvByNameLong`, 518-558 行）がフィルタ・担当者絞り込み・タスク明細に非対応のため再実装された。
2. **アラート判定**（スキル `scripts/src/core/alerts.ts` の `checkAlertsCore`）。SPI 閾値・遅延日数・期限超過・担当タスク過多（10 件超）の判定と重要度分類をスキル側で完全実装している。
3. **アクティブサブプロジェクト検出**（スキル `scripts/src/core/detect-active.ts` の `detectActiveSubprojects`）。`getTree()` と差分計算を組み合わせ、差分のあるサブツリーのルートを再帰的に絞り込むアルゴリズム。

本フェーズ（v0.0.31）は、この 3 本をライブラリの**公開 API**として取り込み、リリースする。スキル側コードの恒久的な書き換えはスコープ外であり、リリース後に task リポジトリの Issue として起票する。

対象ユーザーはライブラリ利用側（task の evmtools スキル、evmtools-webui、CLI 利用者）であり、同一入力に対して同一の数値・判定結果が得られることが最大の価値である。本フェーズは phase0-bugfix-0.0.29（期間SPI 修正・日付ヘルパー整備）を前提とする。

## 範囲（境界コンテキスト）

- **対象範囲**: 3 機能（日次PV担当者別集計 / アラート判定 / アクティブサブプロジェクト検出）の公開 API 化とテスト、新規型の export、既存公開 API の後方互換維持、`npm pack` を用いた task スキルとの結合確認（数値一致の実証）、v0.0.31 リリース準備、feature/master 設計書の作成・同期、リリース後の task リポジトリへの後続 Issue 起票。
- **対象外**: task スキル側コードの恒久書き換え（新 API への差し替えそのもの。task リポジトリの Issue として起票するのみ）、WBS の Excel 書き出し（task#687）、日次PV マトリクスの Excel 装飾（プレゼン層のためスキル側に残す）、異常値の統計的検知（task#436 の本格版。アラート閾値判定までが本フェーズ）、コスト系 EVM。
- **隣接システム/仕様への期待**:
  - phase0-bugfix-0.0.29 が `ProjectService.calculateRecentSpi`（ΔEV/ΔPV）と日付ヘルパー（`truncateToLocalDate` / `diffCalendarDays`）および `calculateProjectDiffs` の空入力デフォルト値を提供済みであること。
  - スキル側の参照実装（`check-daily-pv.ts` / `alerts.ts` / `detect-active.ts`）が数値一致検証の基準（オラクル）であること。

## 要件

### 要件 1: 日次PV担当者別集計 API（getDailyPvByAssignee）

**目的:** ライブラリ利用者として、担当者ごと・日ごとの計画価値（PV）を、サブプロジェクト・担当者・期間で絞り込みつつタスク明細付きで取得したい。それにより、スキル側で独自実装している日次PV集計（過負荷検出・PV=0 レンジ集約）を、ライブラリの公開 API に置き換えられる。

#### 受入基準（Acceptance Criteria）

1. When 利用者が引数なしで日次PV担当者別集計を呼び出したとき, the Project shall プロジェクト開始日から終了日までの各稼働日について、担当者ごとの日次PV明細を返す。
2. While 集計対象の基準日が休日であるとき, the Project shall その日をスキップし、結果に含めない。
3. The Project shall 担当者が未設定のタスクを「(未割当)」という担当者名で集計する。
4. When ある担当者・ある稼働日に対して集計するとき, the Project shall その担当者のタスクのうち計算PVが正の値（0 超）のものだけをタスク明細に含め、各明細にタスク名・フルタスク名・PV（小数第3位で丸め）を持たせる。
5. When ある担当者・ある稼働日の日次PVを算出するとき, the Project shall 明細に含まれたタスクの計算PVを合算し、合算値を小数第3位で丸めて返す。
6. Where 担当者・稼働日にPVが正のタスクが一つも無い場合でも, the Project shall その担当者が対象タスクを保有する限り、PV=0・タスク数0・空明細のエントリを出力する（PV=0 レンジ集約が可能な形にするため）。
7. Where フィルタ文字列が指定されたとき, the Project shall フルタスク名に当該文字列を部分一致で含むタスクのみを集計対象にする。
8. Where 担当者が指定されたとき, the Project shall その担当者のタスクのみを集計対象にする。
9. Where 開始日・終了日が指定されたとき, the Project shall 指定期間を集計範囲とし、未指定の端はプロジェクトの開始日・終了日で補完する。
10. If 集計範囲の開始日・終了日がいずれも決定できないとき, then the Project shall エラーを送出する。
11. The Project shall 集計対象をリーフタスク（`isLeaf === true`）のみに限定する。
12. The Project shall 既存の PV 系ゲッター（`pvByNameLong` / `pvsByNameLong` / `pvByName` 等）の戻り値・シグネチャを変更しない。

### 要件 2: アラート判定サービス（AlertService）

**目的:** ライブラリ利用者として、タスク一覧からスケジュール遅延・期限超過・担当過多のアラートを重要度付きで検出したい。それにより、スキル側で独自実装しているアラート判定を、ライブラリの公開ドメインサービスに置き換えられる。

#### 受入基準（Acceptance Criteria）

1. The AlertService shall 未完了タスク（`finished === false`）のみをアラート判定の対象にする。
2. When あるタスクのSPI（Excel由来のPV/EVから算出、PVが0以下のときは1.0とみなす）が 0.8 未満、または遅延日数が 5 を超えるとき, the AlertService shall 重要度 critical の「重大な遅延」アラートを生成する。
3. When あるタスクが「重大な遅延」に該当せず、かつSPIが警告閾値（既定 0.9）未満または遅延日数が 0 を超えるとき, the AlertService shall 重要度 warning の「遅延の兆候」アラートを生成する。
4. When あるタスクが基準日時点で期限超過（`isOverdueAt(baseDate)` が真）であるとき, the AlertService shall 遅延アラートとは独立に、重要度 critical の「期限超過」アラートを生成する。
5. When ある担当者の未完了タスク数が担当上限（既定 10）を超えるとき, the AlertService shall 重要度 warning の「担当タスク過多」アラートを生成する。
6. The AlertService shall 各アラートに種別（CRITICAL_DELAY / WARNING_DELAY / OVERDUE / HIGH_WORKLOAD）・重要度・対象名・（タスク単位の場合は）対象タスクID・メッセージ文字列を持たせる。
7. The AlertService shall アラートを重要度別（critical / warning / info）に集計した件数と、総件数を含むサマリ文字列を返す。
8. Where SPI 警告閾値・重大SPI閾値・重大遅延日数・担当上限のオプションが指定されたとき, the AlertService shall 既定値に代えて指定値を判定に用いる。
9. The AlertService shall 参照実装（スキルの `checkAlertsCore`）と同一入力に対して、生成されるアラートの種別・重要度・対象・件数・サマリが一致する結果を返す。

### 要件 3: アクティブサブプロジェクト検出（detectActiveSubprojects）

**目的:** ライブラリ利用者として、2 つのプロジェクトスナップショット間で「動きのあった」サブプロジェクトを自動特定したい。それにより、スキル側で独自実装している検出アルゴリズムを、ライブラリの公開 API に置き換えられる。

#### 受入基準（Acceptance Criteria）

1. When 現在と前回の 2 スナップショットが与えられたとき, the ProjectService shall プロジェクトツリーのルート直下の子ノードから探索を開始する。
2. While ある階層で差分（変更・追加・削除の合計件数が 1 以上）を持つ子候補が単一のとき, the ProjectService shall その子へ掘り下げを続ける。
3. When ある階層で差分を持つ子候補が複数存在し、かつ直前に単一の祖先候補があるとき, the ProjectService shall その直前の単一祖先を結果として返す。
4. When 探索の最初の階層（depth=1）で差分を持つ子候補が既に複数存在するとき, the ProjectService shall その階層の全候補を結果として返す。
5. When 掘り下げ先が葉ノードに達した、またはどの子にも差分が無いとき, the ProjectService shall 直前の単一祖先があればそれを返し、無ければ空の結果を返す。
6. Where 最大探索深さが指定されたとき, the ProjectService shall その深さに達した時点で掘り下げを打ち切り、その時点の単一候補を返す。
7. The ProjectService shall 各子候補の差分件数を、その子のフルタスク名で部分一致フィルタしたタスク集合に対する差分集計（変更＋追加＋削除件数）として算出する。
8. The ProjectService shall 結果として、検出されたサブプロジェクト名の配列・パスの配列・各階層の判定トレースを返す。
9. The ProjectService shall 参照実装（スキルの `detectActiveSubprojects`）と同一入力に対して、検出される名前・パス・トレースが一致する結果を返す。

### 要件 4: 公開 API エクスポートと後方互換

**目的:** ライブラリ利用者として、3 機能に関わる型・クラスを安定した公開 API として import したい。それにより、スキルや WebUI がサブパス import（`evmtools-node/domain`）で利用できる。

#### 受入基準（Acceptance Criteria）

1. The evmtools-node shall 新規のアラート判定サービスとその関連型を `evmtools-node/domain` サブパスから export する。
2. The evmtools-node shall 日次PV担当者別集計の戻り値型・オプション型を `evmtools-node/domain` サブパスから export する。
3. The evmtools-node shall アクティブサブプロジェクト検出の戻り値型・オプション型を `evmtools-node/domain` サブパスから export する。
4. The evmtools-node shall 既存のサブパス export（domain / infrastructure / usecase / common / resource）と既存公開 API のシグネチャを変更しない。
5. The evmtools-node shall 新規に追加する公開型で `any` を用いない。

### 要件 5: スキル結合確認（数値一致の実証）

**目的:** リリース担当者として、ライブラリに取り込んだ 3 機能が、スキル側の参照実装と同じ数値・判定を返すことを実データで確認したい。それにより、スキル側の独自ロジック撤去が安全であることを保証する。

#### 受入基準（Acceptance Criteria）

1. The リリース検証プロセス shall `npm pack` で生成した tgz を task リポジトリへ file: 依存としてインストールできることを確認する。
2. When 日次PV担当者別集計を、スキルの `check-daily-pv` と同一の入力（同一 Excel・フィルタ・担当者・期間・閾値）で実行したとき, the 検証プロセス shall 過負荷検出・PV=0 レンジ集約・サマリの数値がスキル出力と一致することを確認する。
3. When アラート判定を、スキルの `alerts` と同一の入力で実行したとき, the 検証プロセス shall 生成アラートの種別・重要度・対象・件数・サマリがスキル出力と一致することを確認する。
4. When アクティブサブプロジェクト検出を、スキルの `detect-active` と同一の入力で実行したとき, the 検証プロセス shall 検出される名前・パス・トレースがスキル出力と一致することを確認する。
5. The 検証プロセス shall 共通検証ゲート（`npm run lint && npm run format && npm test && npm run build`）を Node 20/22 および TZ=Asia/Tokyo・TZ=UTC の双方で通過することを確認する。

### 要件 6: リリース準備（0.0.31）とドキュメント同期

**目的:** リリース担当者として、v0.0.31 を Git Flow に沿って準備したい。それにより、変更内容と設計書・マスター設計書が整合した状態でリリースできる。

#### 受入基準（Acceptance Criteria）

1. The リリース準備 shall `package.json` のバージョンを 0.0.31 に更新する。
2. The リリース準備 shall CHANGELOG に 3 機能の追加（新規公開 API）を記載する。
3. The リリース準備 shall アラート判定サービスのマスター設計書（`docs/specs/domain/master/AlertService.spec.md`）を新設する。
4. The リリース準備 shall 日次PV担当者別集計を `Project` のマスター設計書に、アクティブサブプロジェクト検出を `ProjectService` のマスター設計書に反映する。
5. The 各設計書 shall 受け入れ基準ID（AC-ID）とテストケースID（TC-ID）の対応を示す要件トレーサビリティ表を、grep 可能な形式で含む。
6. The リリース準備 shall 案件設計書（feature 仕様）とマスター設計書の内容を同期する（master-spec-sync.md 準拠）。

### 要件 7: task リポジトリへの後続 Issue 起票

**目的:** メンテナとして、リリース後に task リポジトリ側の独自ロジック撤去作業を追跡したい。それにより、スキルの二重実装を解消できる。

#### 受入基準（Acceptance Criteria）

1. When v0.0.31 がリリースされた後, the メンテナ shall task リポジトリに「evmtools-node を 0.0.31 へ更新し、独自ロジック 3 本（日次PV集計・アラート判定・アクティブ検出）を新公開 API に置き換えて削除する」Issue を起票する。
2. The 起票 Issue shall 対象の 3 ファイル（`check-daily-pv.ts` / `alerts.ts` / `detect-active.ts`）と、置き換え先の公開 API 名を明記する。
3. The 起票 Issue shall 本フェーズの結合確認で数値一致が実証済みである旨を参照として記載する。
