# 要件定義書

## はじめに

evmtools-node には、軽微だが利用価値のあるオープン Issue が 5 件滞留している。いずれも既存部品の小拡張で実現でき、v0.0.30 として一括リリースする。本 spec（phase1-minor-issues-0.0.30）は、これら 5 件を非破壊（プロパティ追加・新メソッドのみ）で実装し、テスト・設計書同期・サンプル/ドキュメント更新・リリース準備までを担う。

対象 Issue は次の 5 系統である。いずれも相互に独立しており、並行実装が可能である。

1. **#166 グリーティング文字列（`Project.getNameWithGreeting()`）**: cc-sdd フルプロセスの練習題材となる極小デモ機能。プロジェクト名の末尾に `Hello World.` を付加した文字列を返す。既存リモートブランチ `origin/worktree-evmtools` のコミット `e8c497b` に実装済みコードと設計書が存在するため、これを取り込み・照合する。
2. **#138 リスケ検知（`TaskDiff.isReschedule`）**: 2 時点の差分（TaskDiff）に、計画価値の後退（`deltaPV < 0`）でリスケを検知する真偽値プロパティを追加する。
3. **#153 フルパス名キャッシュ**: 現状 `Project.getFullTaskName()` は毎回タスクツリーを親方向へ遡って算出している。タスクにフルパス名をキャッシュし、2 回目以降は再走査せず高速に返せるようにする。task スキルが本メソッドを多用するため、性能改善効果がある。
4. **#165 今日までの未完了タスク取得**: 「今日時点で遅延している未完了タスク」と「今日稼働予定の未完了タスク」をマージ・重複排除して返す新 API を追加する。既存の遅延タスク取得と当日タスク取得を素材とする。
5. **#160 「今日のPV」サンプル掲載**: 「今日のPV」（計画PV と実行PV `pvTodayActual` の比較）を示すサンプルを、EVM 指標比較サンプルスクリプトに追加し、対応するドキュメントへ反映する。機能自体（`TaskRow.pvTodayActual`、CLI `pbevm-show-pv`）は実装済みで、サンプルへの掲載のみが未対応である。

本リリースは semver 上パッチであり、いずれの変更も既存 API のシグネチャ・戻り値を変えない後方互換な追加である。

## 範囲（境界コンテキスト）

- **対象範囲**:
  - #166: `Project.getNameWithGreeting()` の追加（既存コミット `e8c497b` の取り込み・照合を含む）
  - #138: `TaskDiff` 型への `isReschedule` プロパティ追加と判定ロジック
  - #153: タスクのフルパス名キャッシュ機構の追加（`Project.getFullTaskName()` のメモ化）
  - #165: 今日までの未完了タスクを返す新規メソッドの追加
  - #160: 「今日のPV」サンプルの追加と対応ドキュメントの更新
  - 上記に対応するユニット/統合テスト、案件設計書・master 設計書の同期、release/0.0.30 準備
- **対象外**:
  - 新規 EVM 指標（Earned Schedule 等、phase3 以降）
  - task スキル独自ロジックの取り込み（phase2）
  - `TaskDiff` の他フィールド拡張や差分アルゴリズム自体の変更
  - フルパス名を用いた検索/フィルタ機能の拡張（Backlog）
  - Issue の棚卸し・クローズ作業（phase0 が担当）
- **隣接システム/仕様への期待**:
  - 本 spec は phase0-bugfix-0.0.29 が確立した基盤に依存する。とくに #165 の「未完了（`finished`）」判定は、phase0 が導入した許容誤差付き `finished`（`PROGRESS_RATE_EPSILON`）の定義を用いる。また日付境界の暦日ヘルパー（`truncateToLocalDate` / `diffCalendarDays`）を新設せず、phase0 が提供したものを利用する。
  - 利用側（masatomix/task の evmtools スキル、evmtools-webui）は、本ライブラリの公開 API（サブパス export、既存メソッドのシグネチャ）が後方互換であることを前提にできる。
  - #166 の実装・設計書は、既存コミット `e8c497b` が新設した設計書（`Project.nameWithGreeting`）と矛盾しないことを前提とする。

## 要件

### 要件 1: グリーティング文字列の取得（#166）

**目的:** ライブラリ利用者および cc-sdd プロセスの学習者として、プロジェクト名に定型の挨拶を付加した文字列を `Project` から取得したい。それにより、SDD ワークフロー一周の体験題材としつつ、極小機能の追加パターンを確立する。

#### 受入基準（Acceptance Criteria）

1. When `getNameWithGreeting()` が呼ばれた場合, the Project shall プロジェクト名の末尾に半角スペースと `Hello World.` を連結した文字列（`{name} Hello World.`）を返す。
2. If プロジェクト名が undefined または空文字である場合, then the Project shall 先頭が半角スペースの ` Hello World.` を返す。
3. When プロジェクト名に日本語等の非 ASCII 文字が含まれる場合, the Project shall 文字コードに依存せずその名称と ` Hello World.` を連結して返す。
4. The Project shall `getNameWithGreeting()` の呼び出しによって `name` プロパティを変更しない（副作用を持たない）。

### 要件 2: リスケ検知プロパティの追加（#138）

**目的:** ライブラリ利用者として、2 時点のタスク差分から計画価値の後退（リスケジュール）を検知したい。それにより、遅延やスコープ後退の兆候を差分単位で判別し、後続フェーズのアラート種別等に利用できる。

#### 受入基準（Acceptance Criteria）

1. When TaskDiff の `deltaPV` が定義済みかつ `deltaPV < 0` である場合, the ProjectService shall その TaskDiff の `isReschedule` を `true` とする。
2. If `deltaPV` が undefined または `deltaPV >= 0` である場合, then the ProjectService shall その TaskDiff の `isReschedule` を `false` とする。
3. When 削除された（removed）タスクの TaskDiff が生成された場合, the ProjectService shall `isReschedule` を `false`（固定）とする。
4. The ProjectService shall `isReschedule` を TaskDiff の readonly な真偽値プロパティとして追加し、既存の TaskDiff プロパティおよび差分集計（ProjectDiff / AssigneeDiff）の後方互換を維持する。

### 要件 3: フルパス名のキャッシュ（#153）

**目的:** ライブラリ利用者として、同一タスクのフルパス名（親を "/" で連結した名称）を繰り返し取得する場合に、タスクツリーの再走査を避けて高速に取得したい。それにより、フルパス名を多用する利用側（task スキル）の性能を改善する。

#### 受入基準（Acceptance Criteria）

1. When 同一タスクのフルパス名が 2 回以上要求された場合, the Project shall 2 回目以降はキャッシュ済みの値を返し、タスクツリーを再走査しない。
2. The Project shall キャッシュの有無に関わらず `getFullTaskName(task)` の戻り値が従来（親名を "/" で連結した文字列）と同一であることを保証する。
3. When ルートまで親が存在しないタスクのフルパス名が要求された場合, the Project shall そのタスク名のみを返す。
4. The 変更 shall `getFullTaskName()` の公開シグネチャと戻り値を後方互換に保ち、既存の差分生成（TaskDiff の `fullName`）等の利用箇所を回帰させない。

### 要件 4: 今日までの未完了タスク取得（#165）

**目的:** ライブラリ利用者として、「今日時点で対応が必要な未完了タスク」（既に遅延しているタスクと、今日稼働予定のタスク）を一度に取得したい。それにより、当日の対応対象を一覧化し、遅延の見落としを防ぐ。

#### 受入基準（Acceptance Criteria）

1. When 今日までの未完了タスク取得が呼ばれた場合, the Project shall 「今日時点で遅延している未完了タスク」と「今日稼働予定の未完了タスク」をマージし、同一タスク（同一 id）の重複を排除した TaskRow 配列を返す。
2. The Project shall 完了タスク（`finished === true`、phase0 の許容誤差付き `finished` 定義に基づく）を結果から除外する。
3. The Project shall 親（非 leaf）タスクを除外し、リーフタスクのみを返す。
4. The Project shall 結果を遅延日数の降順（最も遅延しているタスクを先頭）にソートし、遅延日数が等しい場合は id の昇順で安定した順序を保つ。
5. Where 基準日が引数で指定された場合, the Project shall その基準日を「今日」として遅延・当日判定に用い、未指定の場合は Project の基準日（`baseDate`）を用いる。
6. The Project shall 既存の遅延タスク取得（`getDelayedTasks()`）および当日タスク取得（`getTaskRows()`）のシグネチャと戻り値を変更せず、新規メソッドの追加のみとする。

### 要件 5: 「今日のPV」サンプルの掲載（#160）

**目的:** ライブラリ利用者として、「今日のPV」（計画PV と、進捗を反映した実行PV の比較）の使い方をサンプルで確認したい。それにより、実行PV が計画PV を上回る遅延圧の読み取り方を学べる。

#### 受入基準（Acceptance Criteria）

1. The EVM 指標比較サンプルスクリプト shall 各タスクについて計画PV（1 日あたり計画消化量）と実行PV（`pvTodayActual`）を並べて表示する「今日のPV」サンプルを含む。
2. When 実行PV が計画PV を上回る場合, the サンプル shall 遅延圧がかかっている旨、下回る場合は前倒しである旨の状態解釈を併記する。
3. The サンプルスクリプト shall リポジトリルートからの実行（`npx ts-node samples/evm-sample-projects.ts`）でエラーなく完了する。
4. The 対応ドキュメント（`docs/examples/` 配下の該当ファイル）shall 追加した「今日のPV」サンプルへの参照または説明を反映する。

### 要件 6: 設計書の同期とトレーサビリティ

**目的:** 保守者および将来の開発者として、本 spec の各追加が案件設計書・master 設計書に反映され、実装と一致した状態を保ちたい。それにより、CLAUDE.md のプロジェクト規約（トレーサビリティ必須・master 同期必須）を満たす。

#### 受入基準（Acceptance Criteria）

1. The 各 Issue に対応する案件設計書（`docs/specs/domain/features/` 配下）shall AC-ID → TC-ID の要件トレーサビリティ表を grep 可能な形式で含む。
2. When 案件設計書が追加または改訂された場合, the master 設計書（`docs/specs/domain/master/Project.spec.md`・`ProjectService.spec.md`・`TaskRow.spec.md`）shall 同一のメソッド仕様・テストシナリオ・変更履歴（バージョン更新）を反映する。
3. The #166 の案件設計書 shall 既存コミット `e8c497b` が新設した設計書（`Project.nameWithGreeting`）と整合し、重複や矛盾を生じさせない。

### 要件 7: リリース準備（release/0.0.30）

**目的:** プロジェクト管理者として、本追加を 0.0.30 としてリリース可能な状態に整えたい。それにより、利用側が新バージョンで結合確認できる。

#### 受入基準（Acceptance Criteria）

1. The リリース準備 shall パッケージのバージョンを 0.0.30 に更新する。
2. The CHANGELOG shall 5 件の追加内容（`getNameWithGreeting` / `isReschedule` / フルパス名キャッシュ / 今日までの未完了タスク取得 / 今日のPV サンプル）を追記する。
3. Before リリース, the 検証ゲート shall `npm run lint`・`npm run format`・`npm test`・`npm run build` を全て通過し、加えて TZ=Asia/Tokyo / TZ=UTC の二重テスト実行を通過する。
4. The 変更 shall サブパス export（domain / infrastructure / usecase / common / resource）と既存公開 API の後方互換を維持する。
