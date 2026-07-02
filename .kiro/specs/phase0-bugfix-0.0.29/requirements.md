# 要件定義書

## はじめに

evmtools-node の EVM 計算コアには複数の確定バグが存在し、利用側（masatomix/task の evmtools スキル、evmtools-webui）が誤った数値やワークアラウンドを抱えている。本 spec（phase0-bugfix-0.0.29）は、これらのバグを一括修正して数値の正確性を回復し、後続フェーズ（phase1〜4）が安全に依存できるコア基盤を確立することを目的とする。

対象は次の 4 系統である。

1. **期間SPI（#170）**: `ProjectService.calculateRecentSpi` が Issue #139 で合意した仕様「期間SPI = ΔEV/ΔPV（窓端2点）」ではなく「各スナップショットの累積SPIの単純平均」を返している。累積SPIの母数効果・終盤1.0収束をそのまま引き継ぎ、回復/失速が平滑化される。この値は完了予測の `spiOverride` に接続されるため予測日も歪む。
2. **空 diff の undefined**: `ProjectService.calculateProjectDiffs` に空配列を渡すと PV/EV フィールドが undefined の結果になり、利用側がデフォルト値マージのワークアラウンドを実装している。
3. **日付境界バグ群**: 遅延日数の off-by-one、Excel シリアル比較の時刻依存ずれ、`finished` の浮動小数厳密等価、親（非 leaf）タスクの累積 PV への土日混入。
4. **TZ 依存とドキュメント/Issue 整合**: TZ 差で結果が変わる回帰を CI で検出できていない。ドキュメント（EVM-MANAGEMENT-GUIDE）と feature/master 設計書が実装とずれている。実装済み Issue（#161/#124）や対象外 Issue（#41/#27）のクローズ漏れがある。

本リリースは semver 上パッチだが、期間SPI の戻り値が変わるため **Behavior Change** をリリースノートに明記する。

## 範囲（境界コンテキスト）

- **対象範囲**:
  - `ProjectService.calculateRecentSpi` の値のみを #139 仕様（ΔEV/ΔPV）に置き換える（シグネチャ不変）
  - `ProjectService.calculateProjectDiffs` の空入力に対するデフォルト ProjectDiff 返却
  - 日付境界の共通ヘルパー新設と、遅延日数・シリアル比較・`finished`・親タスク累積PV への適用
  - TZ 二重実行（Asia/Tokyo / UTC）の CI 追加による TZ 回帰防止
  - feature/master 設計書・EVM-MANAGEMENT-GUIDE の同期
  - Issue 整理（GitHub 操作）と release/0.0.29 準備（CHANGELOG の Behavior Change 明記）
- **対象外**:
  - Earned Schedule 等の新指標（phase3）
  - 軽微 Issue の実装（phase1）、task スキルロジックの取り込み（phase2）
  - task リポジトリ側のワークアラウンド撤去作業そのもの（本 spec では「撤去可能なことの検証」までを担う）
  - `calcUtils.round` の丸め改善（工数超過時は phase1 へ繰り越し可）
- **隣接システム/仕様への期待**:
  - 利用側（task スキル、webui）は本ライブラリの公開 API（サブパス export、`getStatistics({filter})`、`getDelayedTasks()` 等）が後方互換であることを前提にできる
  - task スキルは SPI 閾値判定に期間SPI を利用する。値が「より正確」になる方向の変更であり、結合確認時に閾値再調整の要否を判定する

## 要件

### 要件 1: 期間SPI（calculateRecentSpi）の #139 仕様準拠化

**目的:** ライブラリ利用者として、`calculateRecentSpi` から Issue #139 で合意した期間SPI（窓端2点の ΔEV/ΔPV）を得たい。それにより、直近の回復/失速が累積SPIに平滑化されず、完了予測の `spiOverride` に正確な直近効率を反映できる。

#### 受入基準（Acceptance Criteria）

1. When 2 点以上の Project スナップショットが渡された場合, the ProjectService shall baseDate 昇順で並べた最古点と最新点の統計から `ΔEV = totalEv(最新) − totalEv(最古)`、`ΔPV = totalPvCalculated(最新) − totalPvCalculated(最古)` を求め、`ΔEV / ΔPV` を期間SPI として返す。
2. If `ΔPV <= 0` である場合, then the ProjectService shall `undefined` を返す。
3. If 窓端いずれかの `totalEv` または `totalPvCalculated` が undefined である場合, then the ProjectService shall `undefined` を返す。
4. When Project が 1 点のみ渡された場合, the ProjectService shall `undefined` を返す（窓が構成できず ΔPV = 0 となるため。利用側は累積SPIへフォールバックする）。
5. If 空配列が渡された場合, then the ProjectService shall `undefined` を返す。
6. Where フィルタ条件（options）が指定された場合, the ProjectService shall 各窓端の統計取得（`getStatistics(options)`）に同一の options を適用し、フィルタ後のタスク集合に対する ΔEV/ΔPV を返す。
7. While 窓端2点の baseDate 差が警告閾値（既定 30 日、`warnThresholdDays` で変更可）を超える場合, the ProjectService shall 警告ログを出力したうえで計算を継続する。
8. The ProjectService shall `calculateRecentSpi(projects: Project[], options?: RecentSpiOptions): number | undefined` のシグネチャと `RecentSpiOptions` 型を変更せずに維持する。

### 要件 2: 空入力に対するデフォルト ProjectDiff

**目的:** ライブラリ利用者として、差分対象タスクが無い（空配列またはフィルタ後空）場合でも、集計フィールドが数値として確定した ProjectDiff を得たい。それにより、利用側でデフォルト値をマージするワークアラウンドを撤去できる。

#### 受入基準（Acceptance Criteria）

1. When 空配列が `calculateProjectDiffs` に渡された場合, the ProjectService shall 全ての数値集計フィールド（deltaPV, deltaEV, prevPV, prevEV, currentPV, currentEV, modifiedCount, addedCount, removedCount）が `0`、`hasDiff` が `false`、`finished` が既定値である 1 件の ProjectDiff を返す。
2. When 全 TaskDiff が `hasDiff === false`（フィルタ後実質空）で渡された場合, the ProjectService shall 要件 2 の AC-1 と同一のデフォルト ProjectDiff を返す。
3. The ProjectService shall いずれの数値集計フィールドも `undefined` としないことを保証する。
4. When 差分のある TaskDiff が 1 件以上渡された場合, the ProjectService shall 従来どおりの集計結果を返す（既存挙動を回帰させない）。

### 要件 3: 日付境界ヘルパーの新設と共通化

**目的:** ライブラリ利用者および保守者として、遅延日数・稼働日シリアル比較を実行環境の時刻/タイムゾーンに依存しない共通ヘルパーで一元化したい。それにより、off-by-one やシリアルずれといった散在した日付バグを解消し、以後のフェーズが同じヘルパーを再利用できる。

#### 受入基準（Acceptance Criteria）

1. The 共通ユーティリティ shall ローカル日付の 0 時に切り詰める `truncateToLocalDate(date)` と、切り詰め後の暦日差を返す `diffCalendarDays(base, target)` を提供する。
2. When base と target が同一暦日で時刻成分のみ異なる場合, the 遅延日数計算 shall `0` を返す（時刻差による off-by-one を発生させない）。
3. When target が base の翌暦日である場合, the 遅延日数計算 shall base/target の時刻成分に関わらず `+1` を返し、前暦日である場合 `-1` を返す。
4. The 遅延日数計算（`formatRelativeDaysNumber` および依存する `formatRelativeDays`）shall 上記の暦日差ヘルパーを用いて算出する。
5. When baseDate の時刻成分が 0 時以外である場合, the 稼働日シリアル比較（TaskRow の PV/残日数計算）shall 暦日単位で一貫した結果を返す（時刻成分でシリアルが±1日ずれない）。
6. The 遅延日数・シリアル比較 shall 月跨ぎ・年跨ぎの境界でも暦日ベースで正しい差分を返す。

### 要件 4: finished 判定の許容誤差化

**目的:** ライブラリ利用者として、進捗率が浮動小数誤差で 1.0 に厳密一致しない（例: 0.9999999）場合や 1.0 を超える場合でも、完了タスクを正しく完了として扱いたい。それにより、遅延抽出（`isOverdueAt`）や差分の `finished` 集約が誤判定しないようにする。

#### 受入基準（Acceptance Criteria）

1. When 進捗率が 1.0 に十分近い（許容誤差内）または 1.0 を超える場合, the TaskRow shall `finished` を `true` とする。
2. When 進捗率が 1.0 を許容誤差より下回る場合, the TaskRow shall `finished` を `false` とする。
3. When 進捗率が undefined である場合, the TaskRow shall `finished` を `false`（未完了扱い）とする。
4. The TaskRow shall `finished` と `isOverdueAt` の完了判定を対称にする（`finished === true` となる進捗率で `isOverdueAt` が未完了扱いしない）。

### 要件 5: 親タスク累積PVからの土日除外

**目的:** ライブラリ利用者として、親（非 leaf）タスクの累積 PV に土日が混入せず、PV 曲線が稼働日のみで構成されるようにしたい。それにより、遅延統計や後続フェーズ（phase3 Earned Schedule）の PV 曲線精度の前提を満たす。

#### 受入基準（Acceptance Criteria）

1. While 累積PV を plotMap から算出する場合, the TaskRow shall 土日に該当するシリアルを加算対象から除外する。
2. Where 祝日判定関数がオプションで注入された場合, the TaskRow shall その関数で真となる日も除外する。既定（未注入時）は土日のみ除外する。
3. When 親タスクの plotMap に土日が含まれるデータが与えられた場合, the TaskRow shall 稼働日分のみを合算した累積PV を返す。
4. The 累積PV算出 shall leaf タスクの既存の累積PV 結果を回帰させない（leaf の plotMap は稼働日のみのため結果不変）。

### 要件 6: TZ 非依存性の CI 検証

**目的:** 保守者として、タイムゾーン設定に依存して結果が変わる回帰を CI で自動検出したい。それにより、日付境界修正の効果を継続的に保証する。

#### 受入基準（Acceptance Criteria）

1. The CI shall テストスイートを `TZ=Asia/Tokyo` と `TZ=UTC` の 2 つのタイムゾーン設定で実行する。
2. If いずれかのタイムゾーンでテストが失敗した場合, then the CI shall 当該ジョブを失敗として報告する。
3. The 日付ヘルパーおよび finished 境界のテスト shall 深夜・正午・23:59、月跨ぎ・年跨ぎを含むテーブル駆動ケースで、両タイムゾーンにおいて期待値を満たす。

### 要件 7: ドキュメントと設計書の同期

**目的:** 保守者および将来の開発者として、期間SPI の仕様変更が feature 設計書・master 設計書・利用ガイドに反映され、実装と一致した状態を保ちたい。それにより、CLAUDE.md のプロジェクト規約（トレーサビリティ必須・master 同期必須）を満たす。

#### 受入基準（Acceptance Criteria）

1. The feature 設計書（`docs/specs/domain/features/ProjectService.recent-spi.spec.md`）shall 期間SPI = ΔEV/ΔPV 仕様に改訂され、AC-ID → TC-ID の要件トレーサビリティ表を含む。
2. When feature 設計書が改訂された場合, the master 設計書（`docs/specs/domain/master/ProjectService.spec.md`、必要に応じ `Project.spec.md`・`TaskRow.spec.md`）shall 同一のメソッド仕様・テストシナリオ・変更履歴（バージョン更新）を反映する。
3. The 利用ガイド（`docs/EVM-MANAGEMENT-GUIDE.md`）shall 存在しない `Project.calculateRecentSpi(lookbackDays)` の参照を削除し、`ProjectService.calculateRecentSpi(projects, options)` を用いた正しい使用例に差し替える。
4. The 日付ヘルパー・finished・親タスクPV の変更 shall 対応する master 設計書（`TaskRow.spec.md` 等）に反映される。

### 要件 8: Issue 整理

**目的:** プロジェクト管理者として、実装済み・対象外の Issue を正しくクローズし、バックログを実態と一致させたい。それにより、Issue の棚卸し状態を維持する。

#### 受入基準（Acceptance Criteria）

1. When 本 spec のバグ修正がマージされた場合, the Issue 整理作業 shall #170 をクローズする。
2. The Issue 整理作業 shall 実装済みの #161（pbevm-tree）と #124（CI）をクローズする。
3. The Issue 整理作業 shall WebUI 対象の #41・#27 を、WebUI リポジトリへ転記した旨のコメントを付したうえでクローズする。
4. The Issue 整理作業 shall 後続フェーズ対象の Issue（#171/#166/#165/#160/#153/#138 等）はクローズしない。

### 要件 9: リリース準備（release/0.0.29）

**目的:** プロジェクト管理者として、本修正を 0.0.29 としてリリース可能な状態に整えたい。それにより、利用側が新バージョンで結合確認できる。

#### 受入基準（Acceptance Criteria）

1. The リリース準備 shall バージョンを 0.0.29 に更新する。
2. The CHANGELOG shall 期間SPI の戻り値変更を **Behavior Change** として明記する。
3. Before リリース, the 検証ゲート shall `npm run lint`・`npm run format`・`npm test`・`npm run build` を全て通過し、加えて TZ=Asia/Tokyo / TZ=UTC の二重テスト実行を通過する。
4. The 結合確認 shall `npm pack` で生成した tgz を task リポジトリへ file: インストールし、evmtools スキルが期間SPI で正しく動作すること、および task スキル側のデフォルト diff ワークアラウンドが撤去可能であることを確認する。
