# Brief: phase0-bugfix-0.0.29

## Problem

EVM 計算の中核に確定バグがあり、利用側（task リポジトリの evmtools スキル、evmtools-webui）が誤った値やワークアラウンドを抱えている。

1. **#170（最重要）**: `ProjectService.calculateRecentSpi`（`src/domain/ProjectService.ts:30-47`）が Issue #139 の合意仕様「期間SPI = ΔEV/ΔPV（窓端2点）」ではなく「各スナップショットの累積SPIの単純平均」を返す。累積SPIの欠点（母数効果・終盤1.0収束）をそのまま引き継ぎ、回復/失速が平滑化される（実データで真の期間SPI 1.38〜1.50 や 0.43 が平均版では 0.98 前後に潰れる）。この値は完了予測の `spiOverride` に接続されるため予測日も歪む。テスト `src/domain/__tests__/ProjectService.recent-spi.test.ts` の TC-02/03/08 がバグ値（例 `(0.8+1.0)/2=0.9`）を期待値としてアサートしており、バグを固定化している。さらに `docs/EVM-MANAGEMENT-GUIDE.md:138` は存在しない `Project.calculateRecentSpi(lookbackDays)` を参照している（Project は単一スナップショットで EV 履歴を持たないため、この API は原理的に実装不可）。
2. **空 diff の undefined**: `ProjectService.calculateProjectDiffs` に空配列（またはフィルタ後空）を渡すと PV/EV フィールドが undefined の結果が返る。task スキルの `compare.ts` が `createEmptyProjectDiff` でデフォルト値をマージするワークアラウンドを実装中。
3. **日付境界バグ群**:
   - `src/domain/TaskRow.ts:236-254` `calculatePVs`: plotMap を `serial <= baseSerial` で全走査するため、親（非 leaf）タスクの累積 PV に土日が混入する（コード内コメントで自認済み）。Phase 3 の Earned Schedule は PV 曲線精度に依存するため、この修正が前提になる。
   - `src/common/utils.ts:116-129` `formatRelativeDaysNumber`: `Math.floor(diffMs/86400000)` のため、base/target に時刻・TZ 差があると遅延日数が off-by-one。遅延統計（`Project.ts:396,840`）・`daysOverdueAt` が全依存。
   - `src/domain/TaskRow.ts:242,299-301,427-429`: `date2Sn(baseDate)`（外部ライブラリ excel-csv-read-write 由来）のシリアル比較が baseDate の時刻成分で±1日ずれる恐れ。`generateBaseDates` が JST 0時生成であることに暗黙依存。
   - `src/domain/TaskRow.ts:148-150` `finished`: `progressRate === 1.0` の厳密等価。0.9999 や >1 のとき未完了扱いになり `isOverdueAt`・遅延抽出に波及。
   - `src/domain/Project.ts:628-650` `calculateRecentDailyPv`: 直近 lookbackDays が全て PV=0（タスク谷間）だと平均 0 → `calculateCompletionForecast` が undefined 化。休日連続時は `daysChecked < lookbackDays*3` 上限で有効日が集まらない端ケース。
   - `src/common/calcUtils.ts:52-53` `round`: `Math.round(num*10**scale)` は負の .5 で +∞ 方向、浮動小数誤差で最下位ズレ（低優先）。
   - `src/domain/ProjectService.ts:226,253`: deltaSPI の「これはおかしい」デッドコメント放置。
4. **Issue 整理（コード変更なし）**: #161（pbevm-tree、`src/presentation/cli-pbevm-tree.ts` 等で実装済み）と #124（CI、`.github/workflows/ci.yml` 導入済み）はクローズ漏れ。#41/#27 は WebUI 機能のため本リポジトリ対象外。

## Current State

develop（v0.0.28 相当）は CI（lint/format/typecheck/test/build、Node 20/22）導入済み・クリーン。上記バグはすべて現存。

## Desired Outcome

- `calculateRecentSpi` が #139 仕様（期間SPI=ΔEV/ΔPV、ΔPV<=0 は undefined）を返し、テスト・feature spec・ドキュメントが一致する
- `calculateProjectDiffs([])` が全フィールド 0 / hasDiff:false のデフォルト ProjectDiff を返し、task スキルのワークアラウンドを撤去できる
- 日付境界の共通ヘルパー（`truncateToLocalDate`, `diffCalendarDays`）が `src/common/utils.ts` に整備され、off-by-one・シリアルずれ・finished 厳密等価・親タスク土日混入が解消される
- CI で TZ=Asia/Tokyo / TZ=UTC の二重テスト実行が回り、TZ 回帰を防止する
- #161/#124 クローズ、#41/#27 転記クローズ
- release/0.0.29 でリリース（CHANGELOG に Behavior Change 明記）

## Approach

- **#170**: 同名メソッドの実装置き換え（シグネチャ `calculateRecentSpi(projects: Project[], options?): number | undefined` 不変、値のみ仕様準拠化）。新メソッド追加や algorithm オプションによる旧動作温存はしない（旧値はバグ値のため）。baseDate ソート後の窓端2点で ΔEV=EV(newest)−EV(oldest)、ΔPV は `getStatistics(options).totalPvCalculated`、EV は `.totalEv` を使用。ΔPV<=0 は undefined。1点のみの場合の挙動は #139 を確認して要件で確定する。テスト TC-02/03/08 の期待値書き換え + ΔPV=0/負・フィルタ併用ケース追加。既存 feature spec `docs/specs/domain/features/ProjectService.recent-spi.spec.md` を改訂し master 同期。`docs/EVM-MANAGEMENT-GUIDE.md:138` を ProjectService 版の使用例に差し替え。
- **日付境界**: `src/common/utils.ts` に `truncateToLocalDate(date: Date): Date` と `diffCalendarDays(base, target)` を新設し、`formatRelativeDaysNumber` を置換。domain 内に `toDaySerial(date)` ラッパ（内部で truncate → date2Sn）を作り TaskRow の 3 箇所を置換。finished は EPSILON 定数付き `>= 1.0` に（`isOverdueAt` の `< 1.0` も対称修正）。calculatePVs は plotMap ループで土日 serial をスキップし、祝日は `isHolidayFn?: (d: Date) => boolean` オプション引数で Project から注入（デフォルト土日のみ除外）。親PV=子合計方式との比較検討は design に記録。
- **テスト戦略**: `src/common/__tests__/` に日付ヘルパーのテーブル駆動テスト（`new Date('2025-07-19')` UTC解釈 vs `new Date('2025-07-19T00:00:00+09:00')`、深夜/正午/23:59、月・年跨ぎ）。CI に TZ 二重実行を追加。`TaskRow.test.ts` に finished 境界（0.9999999/1.0000001/1.2/undefined）と親タスク土日跨ぎケース追加。

## Scope

- **In**: 上記バグ修正一式、テスト、feature/master spec 改訂、EVM-MANAGEMENT-GUIDE 修正、CI の TZ 二重実行、Issue 整理（gh 操作）、release/0.0.29 準備
- **Out**: 新機能追加（Phase 1 以降）、calcUtils round の改善が工数超過する場合は Phase 1 へ繰り越し可

## Boundary Candidates

- 期間SPI 修正（ProjectService + テスト + spec + docs）
- 空 diff デフォルト値（ProjectService）
- 日付ヘルパー新設と適用（common/utils, TaskRow, Project）
- CI の TZ 二重実行（.github/workflows/ci.yml）
- Issue 整理（GitHub 操作のみ）

## Out of Boundary

- Earned Schedule 等の新指標（phase3）
- task スキル側のワークアラウンド撤去作業そのもの（結合確認で撤去可能なことを検証するまでが本 spec）

## Upstream / Downstream

- **Upstream**: なし（最初のリリース）
- **Downstream**: phase1（日付ヘルパー利用）、phase2（期間SPI を AlertService が利用）、phase3（calculatePVs 土日修正が PV 曲線精度の前提）、phase4（期間SPI を EAC 悲観シナリオに接続）

## Existing Spec Touchpoints

- **Extends**: `docs/specs/domain/features/ProjectService.recent-spi.spec.md`（既存。改訂対象）
- **Adjacent**: `docs/specs/domain/master/ProjectService.spec.md` / `Project.spec.md`（master 同期必須）

## Constraints

- semver はパッチ（バグ修正）だが CHANGELOG に **Behavior Change** を明記。task スキル（SPI 閾値判定に利用）への影響は「より正確な値になる」方向で、結合確認時に閾値再調整の要否を判定する
- 検証: `npm run lint && npm run format && npm test && npm run build` + TZ 二重実行 + `npm pack` → task リポジトリで file: インストール結合確認
- feature ブランチ例: `feature/170-recent-spi-delta`（develop から worktree 分岐、`--no-track`）
