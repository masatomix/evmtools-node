# 調査・設計判断

## 概要
- **機能**: `phase0-bugfix-0.0.29`
- **ディスカバリー範囲**: 拡張（既存ドメインロジックのバグ修正）
- **主要な知見**:
  - `calculateRecentSpi` は現状「累積SPIの単純平均」（`ProjectService.ts:30-47`）。#139 の合意仕様は窓端2点の ΔEV/ΔPV。シグネチャは維持したまま値のみ置換できる。
  - `getStatistics(options)` は `totalPvCalculated`・`totalEv`・`spi` を返す（`Project.ts:281-301`）。窓端2点の ΔEV/ΔPV はこの2フィールドから直接算出できる。
  - 日付バグは `formatRelativeDaysNumber`（`utils.ts:116-129`）の `Math.floor(diffMs/86400000)` と、TaskRow の `date2Sn(baseDate)` 直接呼び出し（`TaskRow.ts:242,299-301`）に集約される。共通ヘルパーで一元化すれば全依存箇所が直る。

## 調査ログ

### calculateRecentSpi の現仕様と #139 合意仕様の差異
- **背景**: #170 が「実装が #139 と不一致」と報告。
- **参照ソース**: `src/domain/ProjectService.ts:21-72`、`docs/specs/domain/features/ProjectService.recent-spi.spec.md`、GitHub Issue #139/#170、既存テスト `src/domain/__tests__/ProjectService.recent-spi.test.ts`。
- **知見**:
  - 現実装は `projects.map(p => p.getStatistics(options).spi)` の平均。累積SPIは母数効果で終盤 1.0 に収束し、直近の回復/失速が平滑化される。
  - #139 の定義: `期間SPI = (EV(期間終了) − EV(期間開始)) / (PV(期間終了) − PV(期間開始)) = ΔEV/ΔPV`。
  - #139 コメントは「v0.0.26 でリリース済み」とのみあり、1 点渡し時の挙動は未定義。
  - 既存テスト TC-02（`0.9` 期待）・TC-03（`0.9` 期待）・TC-08（`0.5` 期待）は平均版のバグ値を固定化している。
- **示唆**: 同名メソッドの実装置換。窓端は baseDate 昇順ソートの最古・最新。ΔPV は `totalPvCalculated`、ΔEV は `totalEv`。テスト期待値を書き換え、ΔPV=0/負・フィルタ併用ケースを追加する。

### 1 点渡し時の挙動決定
- **背景**: brief が「#139 を確認して要件で確定」と指示。#139 に明示なし。
- **知見**: 窓端2点方式では 1 点だと最古=最新となり ΔEV=0/ΔPV=0。`ΔPV<=0 → undefined` ルールに自然に従う。
- **示唆**: 1 点渡しは `undefined` を返す（要件 1 AC-4）。利用側の完了予測は `spiOverride` 未指定時に累積SPI（`basicStats.spi`）へフォールバックするため安全。TC-01 の期待値は `0.8` → `undefined` に変更する（Behavior Change の一部）。

### getStatistics の戻り値フィールド
- **背景**: ΔEV/ΔPV の入力元を確定する必要がある。
- **参照ソース**: `src/domain/Project.ts:228-301`。
- **知見**: `getStatistics()` / `getStatistics(options)` / `getStatistics(tasks)` のオーバーロードがあり、`ProjectStatistics` に `totalPvCalculated`（`sumCalculatePVs`）・`totalEv`（`sumEVs`）・`spi` を含む。
- **示唆**: `calculateRecentSpi` は各窓端で `getStatistics(options ?? {})` を呼び、`totalPvCalculated`・`totalEv` を取り出す。両者が number であることを検証し、undefined なら計算不能とする。

### 日付境界バグの集約点
- **背景**: off-by-one・シリアルずれが複数箇所に散在。
- **参照ソース**: `src/common/utils.ts:116-129`、`src/domain/TaskRow.ts:148-150,161-163,236-254,242,299-301`。
- **知見**:
  - `formatRelativeDaysNumber` は `new Date(x).getTime()` の差を `Math.floor` で日数化。TZ/時刻差で off-by-one。
  - `calculatePVs`・`remainingDays` は `date2Sn(baseDate)` を時刻付き baseDate に直接適用。0 時以外だとシリアルが±1ずれうる。
  - `calculatePVs` は plotMap を `serial <= baseSerial` で全走査し、親タスクでは土日 serial も加算（コード内コメントで自認）。
  - `finished` は `progressRate === 1.0` の厳密等価、`isOverdueAt` は `progressRate < 1.0`。浮動小数誤差・>1 で誤判定。
- **示唆**: `common/utils.ts` に `truncateToLocalDate`・`diffCalendarDays` を新設。`formatRelativeDaysNumber` を置換。domain 内に `toDaySerial(date)`（truncate → `date2Sn`）ラッパを作り TaskRow の該当箇所を置換。`finished` は EPSILON 付き `>= 1.0`、`isOverdueAt` は対称修正。`calculatePVs` は plotMap ループで土日 serial をスキップ、祝日は `isHolidayFn?` オプションで注入。

## アーキテクチャパターン評価

| 案 | 説明 | 強み | リスク／制約 | 備考 |
|----|------|------|--------------|------|
| A. calculateRecentSpi を実装置換（採用） | 同名メソッドの中身のみ ΔEV/ΔPV に差し替え | シグネチャ不変で後方互換、利用側の import 不変 | バグ値に依存する既存テストの期待値書換が必要 | brief・roadmap の方針と一致 |
| B. algorithm オプションで旧動作温存 | `options.algorithm='average'` で旧値も返せる | 段階移行可 | 旧値はバグ値であり温存する価値がない。API 肥大化 | 不採用 |
| C. 新メソッド追加（別名） | `calculatePeriodSpi` を新設 | 旧を壊さない | 呼び出し側が2系統になり混乱。#170 の主旨は「同名が正しくない」 | 不採用 |
| D. 日付ヘルパーを domain に置く | truncate/diff を TaskRow 近傍に置く | 局所的 | common が既存の集約点で phase1/2 も利用予定。層責務的に common が適切 | 不採用 |

## 設計判断

### 判断: 期間SPI は同名メソッドの実装置換（案A）
- **背景**: #170 は「同名メソッドが #139 と不一致」。roadmap 制約「シグネチャ不変・値のみ仕様準拠化」。
- **検討した代替案**: B（algorithm オプション温存）、C（新メソッド）。
- **採用案**: `calculateRecentSpi` の本体のみ ΔEV/ΔPV に置換。`_warnIfPeriodTooLong` は流用（内部の日数計算も `diffCalendarDays` に寄せる）。
- **理由**: 旧値はバグ値のため温存不要。後方互換（シグネチャ・型）を維持しつつ値だけ正す。
- **トレードオフ**: 既存テスト TC-01/02/03/08 の期待値変更が発生（バグ値の固定化を解除）。CHANGELOG で Behavior Change を明示して吸収。
- **フォローアップ**: 結合確認で task スキルの SPI 閾値判定の再調整要否を判定。

### 判断: 日付ヘルパーは common/utils.ts に新設し全依存箇所へ適用
- **背景**: off-by-one・シリアルずれが `utils.ts` と `TaskRow.ts` に散在。phase1/phase2 も同ヘルパーを利用予定（roadmap の shared seams）。
- **検討した代替案**: domain 近傍に置く（案D）。
- **採用案**: `truncateToLocalDate`・`diffCalendarDays` を `common/utils.ts` に置き、`formatRelativeDaysNumber` を再実装。domain には `toDaySerial(date)` ラッパを追加し TaskRow の `date2Sn(baseDate)` 呼び出しを置換。
- **理由**: common は全層から参照可能な既存の共有点。domain 層は外部依存（excel-csv-read-write の date2Sn）を薄いラッパで包み、切り詰めを一元化できる。
- **トレードオフ**: TaskRow に薄いラッパ追加。ヘルパー適用箇所が広く、回帰テストで守る必要がある。
- **フォローアップ**: TZ 二重実行 CI で回帰を継続検出。

### 判断: 親タスク土日除外は plotMap ループ内スキップ + 祝日注入オプション
- **背景**: 親タスク plotMap に土日が混入し累積PV が過大。祝日は Project 単位管理（HolidayData）で TaskRow は知らない。
- **検討した代替案**: 「親PV = 子リーフ合計」方式への転換。
- **採用案**: `calculatePVs` の plotMap ループで土日 serial をスキップ。祝日は `isHolidayFn?: (d: Date) => boolean` を任意引数で注入し、Project 側から `isHoliday` を渡せるようにする。既定は土日のみ除外。
- **理由**: 最小変更でバグを解消でき、leaf（稼働日のみ plotMap）には影響しない。親PV=子合計方式は集計経路の大改修になり本 spec のスコープを超える。
- **トレードオフ**: 祝日注入は呼び出し側の対応が前提（未注入時は土日のみ）。親PV=子合計との厳密一致は将来課題。
- **フォローアップ**: 親PV=子合計方式との比較検討結果を design に記録し、phase3 の PV 曲線精度検証で再確認。

## リスクと緩和策
- 期間SPI の Behavior Change が task スキルの SPI 閾値判定に影響 — 結合確認で閾値再調整の要否を判定し、CHANGELOG に明記。
- 日付ヘルパー適用漏れによる部分的 off-by-one 残存 — TZ 二重実行 CI とテーブル駆動テスト（深夜/正午/23:59・月年跨ぎ）で網羅。
- 祝日注入の未適用で親PVから祝日が除外されない — 既定は土日のみ除外と明記し、祝日除外は Project からの注入時のみ有効とする（要件で明示）。
- 空 diff デフォルト化が既存の非空集計を回帰させる — 非空ケースの既存テストを維持し、空/フィルタ後空のみ新規ケースで検証。

## 参考文献
- GitHub Issue [#139](https://github.com/masatomix/evmtools-node/issues/139) — 期間SPI = ΔEV/ΔPV の合意
- GitHub Issue [#170](https://github.com/masatomix/evmtools-node/issues/170) — 実装が #139 と不一致
- `.kiro/specs/phase0-bugfix-0.0.29/brief.md` — バグの file:line と修正方針（検証済み）
- `.kiro/steering/roadmap.md` — shared seams と後方互換制約
- `.kiro/steering/master-spec-sync.md` — master 設計書同期ルール
