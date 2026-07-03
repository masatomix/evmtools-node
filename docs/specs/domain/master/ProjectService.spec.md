# ProjectService 仕様書

**バージョン**: 2.0.0
**作成日**: 2025-12-16
**更新日**: 2026-07-03
**ソースファイル**: `src/domain/ProjectService.ts`

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **クラス名** | `ProjectService` |
| **分類** | **ドメインサービス（Domain Service）** |
| **実装インターフェース** | - |
| **パッケージ** | `src/domain/ProjectService.ts` |
| **責務** | プロジェクト間の差分計算、統計データのマージ・補間処理を担当 |

### 1.2 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| タスク差分 | `TaskDiff` | 2つのProject間のタスク単位の変化 |
| プロジェクト差分 | `ProjectDiff` | タスク差分をプロジェクト全体で集約した結果 |
| 担当者差分 | `AssigneeDiff` | タスク差分を担当者別に集約した結果 |
| 差分タイプ | `DiffType` | 'modified' / 'added' / 'removed' / 'none' |
| プロジェクト統計 | `ProjectStatistics` | 基準日ごとのプロジェクト統計情報 |
| 期間SPI | `RecentSpi` | 複数Projectスナップショットの窓端2点による ΔEV/ΔPV（直近の実勢SPI） |
| 期間SPIオプション | `RecentSpiOptions` | 期間SPI計算のオプション（フィルタ、警告閾値） |

### 1.3 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────────────────────────┐
│                      domain 層                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ProjectService                      │   │
│  │                                                      │   │
│  │  calculateTaskDiffs(): (now, prev) → TaskDiff[]      │   │
│  │  calculateProjectDiffs(): TaskDiff[] → ProjectDiff[] │   │
│  │  calculateAssigneeDiffs(): TaskDiff[] → AssigneeDiff[]│   │
│  │  calculateRecentSpi(): Project[] → 期間SPI           │   │
│  │  mergeProjectStatistics(): マージ処理                 │   │
│  │  fillMissingDates(): 欠落日補間                       │   │
│  └─────────────────────────────────────────────────────┘   │
│              │                                              │
│              ▼                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │       Project        │    │ ProjectStatistics    │      │
│  │ (比較対象)           │    │ (統計データ)         │      │
│  └──────────────────────┘    └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-PS-01 | ProjectServiceはステートレスである | 常時 |
| INV-PS-02 | calculateTaskDiffsはリーフノードのみを対象とする | 実行時 |
| INV-PS-03 | mergeProjectStatisticsの結果は基準日降順でソートされる | 実行後 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数

該当なし（ステートレス）

### 3.2 公開プロパティ（getter）

該当なし

### 3.3 内部キャッシュ

該当なし

### 3.4 型定義

#### DiffType

```typescript
type DiffType = 'modified' | 'added' | 'removed' | 'none'
```

#### TaskDiff

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `id` | `number` | タスクID |
| `name` | `string` | タスク名 |
| `fullName` | `string` | 階層を含むフルパス名 |
| `assignee` | `string?` | 担当者 |
| `parentId` | `number?` | 親タスクID |
| `deltaProgressRate` | `number?` | 進捗率の変化量 |
| `deltaPV` | `number?` | PVの変化量 |
| `deltaEV` | `number?` | EVの変化量 |
| `prevPV` / `currentPV` | `number?` | 前回/今回のPV |
| `prevEV` / `currentEV` | `number?` | 前回/今回のEV |
| `prevProgressRate` / `currentProgressRate` | `number?` | 前回/今回の進捗率 |
| `hasDiff` | `boolean` | 差分があるか |
| `hasProgressRateDiff` / `hasPvDiff` / `hasEvDiff` | `boolean` | 個別の差分フラグ |
| `diffType` | `DiffType` | 差分タイプ |
| `finished` | `boolean` | 完了フラグ |
| `isOverdueAt` | `boolean` | 期限切れフラグ |
| `workload` | `number?` | 予定工数 |
| `prevTask` / `currentTask` | `TaskRow?` | 前回/今回のTaskRow |
| `prevBaseDate` / `currentBaseDate` / `baseDate` | `Date?` | 基準日 |
| `daysOverdueAt` | `number?` | 期限切れ日数 |
| `daysStrOverdueAt` | `string?` | 期限切れ日数（文字列） |

#### ProjectDiff / AssigneeDiff

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `modifiedCount` | `number` | 変更件数 |
| `addedCount` | `number` | 追加件数 |
| `removedCount` | `number` | 削除件数 |
| `deltaPV` / `deltaEV` | `number?` | 変化量合計 |
| `prevPV` / `currentPV` | `number?` | 前回/今回のPV合計 |
| `prevEV` / `currentEV` | `number?` | 前回/今回のEV合計 |
| `hasDiff` | `boolean` | 差分があるか |
| `finished` | `boolean` | 全て完了か |
| `assignee` | `string?` | 担当者（AssigneeDiffのみ） |

#### RecentSpiOptions

```typescript
interface RecentSpiOptions extends TaskFilterOptions {
  /**
   * 期間警告の閾値（日数）
   * この日数を超えると警告ログを出力
   * @default 30
   */
  warnThresholdDays?: number
}
```

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `filter` | `string?` | タスク名フィルタ（TaskFilterOptionsから継承） |
| `warnThresholdDays` | `number?` | 期間警告の閾値（デフォルト: 30日） |

---

## 4. コンストラクタ仕様

該当なし（デフォルトコンストラクタ）

---

## 5. メソッド仕様

### 5.1 `calculateTaskDiffs(now: Project, prev: Project): TaskDiff[]`

#### 目的
2つのProjectを比較し、タスク単位の差分を計算する

#### シグネチャ
```typescript
calculateTaskDiffs(now: Project, prev: Project): TaskDiff[]
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-TD-01 | now, prevが有効なProjectである | 例外 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-TD-01 | isLeaf=trueのタスクのみが対象 |
| POST-TD-02 | nowに存在しprevにないタスクは`diffType='added'` |
| POST-TD-03 | prevに存在しnowにないタスクは`diffType='removed'` |
| POST-TD-04 | 両方に存在し変化ありは`diffType='modified'` |
| POST-TD-05 | 両方に存在し変化なしは`diffType='none'` |
| POST-TD-06 | delta値はnow - prevで計算される |

#### アルゴリズム

```
1. prevTasks = prev.toTaskRows()
2. prevTasksMap = Map(id → TaskRow)
3. nowTasks = now.toTaskRows()
4. nowTasksMap = Map(id → TaskRow)
5. diffs = []

6. nowTasksの各タスクに対して（isLeafのみ）:
   a. prevTask = prevTasksMap.get(id)
   b. isNew = prevTaskがない
   c. delta値を計算（progressRate, PV, EV）
   d. hasAnyChange = isNew || いずれかのdeltaが0以外
   e. diffTypeを判定（added/modified/none）
   f. TaskDiffオブジェクトを作成してdiffsに追加

7. prevTasksの各タスクに対して（isLeaf かつ nowにない）:
   a. diffType = 'removed'
   b. TaskDiffオブジェクトを作成してdiffsに追加

8. return diffs
```

#### ビジネスルール

| ID | ルール | 説明 |
|----|--------|------|
| BR-TD-01 | リーフノードのみ差分計算対象 | 親タスクは除外 |
| BR-TD-02 | delta計算: a - b（aのみ存在→a、bのみ存在→-b、両方undefined→undefined） | delta関数 |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-TD-001 | 正常系 | タスクの進捗率が変化 | diffType='modified' |
| EQ-TD-002 | 正常系 | 新規タスク追加 | diffType='added' |
| EQ-TD-003 | 正常系 | タスク削除 | diffType='removed' |
| EQ-TD-004 | 正常系 | 変化なし | diffType='none' |
| EQ-TD-005 | 境界値 | isLeaf=false | 対象外（diffsに含まれない） |

---

### 5.2 `calculateProjectDiffs(taskDiffs: TaskDiff[]): ProjectDiff[]`

#### 目的
タスク差分をプロジェクト全体で集約する

#### シグネチャ
```typescript
calculateProjectDiffs(taskDiffs: TaskDiff[]): ProjectDiff[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-PD-01 | hasDiff=trueのタスクのみ集計対象 |
| POST-PD-02 | modifiedCount, addedCount, removedCountが正しくカウントされる |
| POST-PD-03 | deltaPV, deltaEVは合計値 |
| POST-PD-04 | 空入力（または差分なし）の場合、全数値フィールド0 / hasDiff=false / finished=true のデフォルト ProjectDiff を1件返す（undefined フィールドを含まない。0.0.29〜） |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-PD-001 | 正常系 | modified=1, added=1, removed=1 | 各カウント=1 |
| EQ-PD-002 | 境界値 | 全てnone | デフォルト ProjectDiff 1件（全数値0, hasDiff=false） |
| EQ-PD-003 | 境界値 | 空配列 | デフォルト ProjectDiff 1件（全数値0, hasDiff=false, finished=true） |

テスト実体: `src/domain/__tests__/ProjectService.empty-diffs.test.ts`

---

### 5.3 `calculateAssigneeDiffs(taskDiffs: TaskDiff[]): AssigneeDiff[]`

#### 目的
タスク差分を担当者別に集約する

#### シグネチャ
```typescript
calculateAssigneeDiffs(taskDiffs: TaskDiff[]): AssigneeDiff[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-AD-01 | assigneeごとにグループ化される |
| POST-AD-02 | 各グループでdeltaPV, deltaEVが合計される |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-AD-001 | 正常系 | 担当者A: 2件, 担当者B: 1件 | 2件のAssigneeDiff |
| EQ-AD-002 | 境界値 | 担当者未設定タスク | assignee=undefinedでグループ化 |

---

### 5.4 `mergeProjectStatistics(existing: ProjectStatistics[], incoming: ProjectStatistics[]): ProjectStatistics[]`

#### 目的
統計データをマージする（同一基準日は上書き）

#### シグネチャ
```typescript
mergeProjectStatistics(existing: ProjectStatistics[], incoming: ProjectStatistics[]): ProjectStatistics[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-MS-01 | 同じbaseDateはincomingで上書き |
| POST-MS-02 | 結果は基準日降順（新しい順）でソート |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-MS-001 | 正常系 | 重複する基準日あり | 上書きされる |
| EQ-MS-002 | 正常系 | 重複なし | 全件マージ |
| EQ-MS-003 | 境界値 | existing空 | incomingのみ返却 |

---

### 5.5 `fillMissingDates(projectStatisticsArray: ProjectStatistics[]): ProjectStatistics[]`

#### 目的
欠落している日付を前日データで補間する

#### シグネチャ
```typescript
fillMissingDates(projectStatisticsArray: ProjectStatistics[]): ProjectStatistics[]
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-FD-01 | 欠落日は直前の日のデータで補間される |
| POST-FD-02 | 結果は基準日降順でソート |
| POST-FD-03 | 空配列の場合は空配列を返す |

#### アルゴリズム

```
1. 空配列→空配列を返す
2. baseDate昇順でソート
3. prev = sorted[0]
4. 各日付間のギャップを前日データで埋める
5. 基準日降順でソートして返す
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-FD-001 | 正常系 | 06/09, 06/12のデータ | 06/09,10,11,12の4件 |
| EQ-FD-002 | 境界値 | 空配列 | 空配列 |
| EQ-FD-003 | 境界値 | 1件のみ | 1件のまま |

---

### 5.6 `calculateRecentSpi(projects: Project[], options?: RecentSpiOptions): number | undefined`

#### 目的
複数のProjectスナップショットから期間SPI（窓端2点の ΔEV/ΔPV、直近の実勢SPI）を計算する

> **v2.0（0.0.29、#170）で仕様準拠修正**: 旧実装は「累積SPIの平均」を返していたが、#139 の仕様（ΔEV/ΔPV）に修正。シグネチャ不変・戻り値のみ変更（Behavior Change）。

#### シグネチャ
```typescript
calculateRecentSpi(projects: Project[], options?: RecentSpiOptions): number | undefined
```

#### 事前条件

該当なし（空配列も許容）

#### 事後条件

| ID | 条件 |
|----|------|
| POST-RS-01 | スナップショットが2点未満（空配列・1点）の場合はundefinedを返す |
| POST-RS-02 | 窓端いずれかの統計（totalEv / totalPvCalculated）が取得できない場合はundefinedを返す |
| POST-RS-03 | ΔPV <= 0（期間中に計画が進んでいない・再計画でPV減少）の場合はundefinedを返す |
| POST-RS-04 | それ以外は 期間SPI = ΔEV / ΔPV を返す（ΔEV=0 なら 0、負値もあり得る） |
| POST-RS-05 | 期間が閾値を超えた場合は警告ログを出力（計算は続行） |

#### アルゴリズム

```
1. projects.length < 2 → return undefined
2. _warnIfPeriodTooLong(projects, threshold)
3. baseDate 昇順ソートし、窓端2点（最古 oldest / 最新 newest）の getStatistics(options) を取得
4. totalEv / totalPvCalculated のいずれかが undefined → return undefined
5. ΔEV = newest.totalEv - oldest.totalEv
   ΔPV = newest.totalPvCalculated - oldest.totalPvCalculated
6. ΔPV <= 0 → return undefined
7. return ΔEV / ΔPV
```

#### 内部メソッド: `_warnIfPeriodTooLong(projects, thresholdDays)`

```
1. projects.length < 2 → return（チェック不要）
2. baseDateでソートして最古・最新を取得
3. 日数差 = diffCalendarDays(oldest, newest)（暦日ベース。時刻成分による off-by-one なし）
4. 日数差 > threshold → logger.warn()
```

#### ビジネスルール

| ID | ルール | 説明 |
|----|--------|------|
| BR-RS-01 | 窓端2点のみ使用 | 中間スナップショットは参照しない。渡し順は不問（内部ソート） |
| BR-RS-02 | 累積SPIの平均ではない | 母数効果・終盤1.0収束（#171ⓐⓑ）を引き継がず、直近の回復/失速を検出できる |
| BR-RS-03 | ΔPV<=0 は undefined | 効率が定義できない（再計画によるPV減少を含む）。頑健な直近指標が必要な場合は窓を広げる（#171 コメント参照） |
| BR-RS-04 | 警告は計算を中断しない | 長期間でも計算は成功する |
| BR-RS-05 | Project 単体版は提供しない | Project は EV 履歴を持たないため `Project.calculateRecentSpi(lookbackDays)` は原理的に実装不能 |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-RS-001 | 境界値 | 1点渡し | undefined（期間が定義できない） |
| EQ-RS-002 | 正常系 | 2点渡し (PV 7→10, EV 7→8.5) | 0.5（ΔEV=1.5 / ΔPV=3） |
| EQ-RS-003 | 正常系 | N点渡し（中間に異常値） | 窓端2点のみで算出（中間無視） |
| EQ-RS-004 | 正常系 | フィルタ付き | フィルタ後集合の ΔEV/ΔPV |
| EQ-RS-005 | 境界値 | 空配列 | undefined |
| EQ-RS-006 | 境界値 | ΔPV=0（同一基準日2点） | undefined |
| EQ-RS-007 | 境界値 | ΔPV<0（再計画でPV減少） | undefined |
| EQ-RS-008 | 境界値 | ΔEV=0 | 0（有効な期間SPI） |
| EQ-RS-009 | 警告 | 期間30日以内 | 警告なし |
| EQ-RS-010 | 警告 | 期間30日超 | 警告あり、計算成功 |
| EQ-RS-011 | 警告 | 閾値カスタム | 指定閾値で警告判定 |
| EQ-RS-012 | 警告 | 1点のみ | 警告なし・undefined |

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 calculateTaskDiffs

```gherkin
Scenario: 変更されたタスクをmodifiedとして検出する
  Given prevProject: タスク(id=1, progressRate=0.3)
  And   nowProject: タスク(id=1, progressRate=0.5)
  When  calculateTaskDiffs(now, prev)を呼び出す
  Then  diffType='modified', deltaProgressRate=0.2

Scenario: 追加されたタスクをaddedとして検出する
  Given prevProject: タスク(id=1)
  And   nowProject: タスク(id=1, id=2)
  When  calculateTaskDiffs(now, prev)を呼び出す
  Then  id=2のdiffType='added'

Scenario: 削除されたタスクをremovedとして検出する
  Given prevProject: タスク(id=1, id=2)
  And   nowProject: タスク(id=1)
  When  calculateTaskDiffs(now, prev)を呼び出す
  Then  id=2のdiffType='removed'

Scenario: isLeaf=falseのタスクは対象外
  Given prevProject: 親タスク(id=1, isLeaf=false)
  And   nowProject: 同じ親タスク
  When  calculateTaskDiffs(now, prev)を呼び出す
  Then  diffsは空配列
```

### 6.2 mergeProjectStatistics

```gherkin
Scenario: 同じ基準日のデータは上書きされる
  Given existing: [{ baseDate: '2025/06/10', totalPvExcel: 10 }]
  And   incoming: [{ baseDate: '2025/06/10', totalPvExcel: 12 }]
  When  mergeProjectStatistics(existing, incoming)を呼び出す
  Then  baseDate='2025/06/10'のtotalPvExcel=12

Scenario: 結果は基準日降順でソート
  Given 3つの異なる基準日のデータ
  When  mergeProjectStatistics()を呼び出す
  Then  新しい日付が先頭にくる
```

### 6.3 fillMissingDates

```gherkin
Scenario: 欠落している日付を前日データで補間する
  Given [{ baseDate: '2025/06/09', pv: 10 }, { baseDate: '2025/06/12', pv: 20 }]
  When  fillMissingDates()を呼び出す
  Then  06/09, 06/10, 06/11, 06/12の4件が返される
  And   06/10, 06/11のpvは10（06/09のデータで補間）
```

### 6.4 calculateRecentSpi

```gherkin
Scenario: 1点渡しはundefined（期間が定義できない）
  Given project (PV=7, EV=7)
  When  calculateRecentSpi([project])を呼び出す
  Then  undefinedが返される

Scenario: 2点渡しで窓端2点のΔEV/ΔPVを返す
  Given p1 (baseDate=06/10, 累積PV=7, EV=7), p2 (baseDate=06/13, 累積PV=10, EV=8.5)
  When  calculateRecentSpi([p1, p2])を呼び出す
  Then  0.5が返される（ΔEV=1.5 / ΔPV=3。累積SPI平均の0.925ではない）

Scenario: N点渡しでも窓端2点のみ使用する
  Given p1, mid（異常値）, p3（p1/p3 は上記と同条件）
  When  calculateRecentSpi([p1, mid, p3])を呼び出す
  Then  0.5が返される（中間は無視）

Scenario: フィルタ付きでフィルタ後集合のΔEV/ΔPVを返す
  Given p1, p2（"認証"タスクと"ダッシュボード"タスクを含む）
  When  calculateRecentSpi([p1, p2], { filter: '認証' })を呼び出す
  Then  "認証"タスクのみの ΔEV/ΔPV が返される

Scenario: 空配列でundefinedを返す
  Given 空配列
  When  calculateRecentSpi([])を呼び出す
  Then  undefinedが返される

Scenario: ΔPV<=0（同一基準日・再計画によるPV減少）でundefinedを返す
  Given p1 (累積PV=10), p2 (後ろ倒し再計画で累積PV=2)
  When  calculateRecentSpi([p1, p2])を呼び出す
  Then  undefinedが返される

Scenario: 期間30日超で警告が出るが計算は成功する
  Given p1 (baseDate=06/03), p2 (baseDate=07/18) // 45日差
  When  calculateRecentSpi([p1, p2])を呼び出す
  Then  logger.warn()が呼ばれる
  And   期間SPI（ΔEV/ΔPV）が返される
```

テスト実体: `src/domain/__tests__/ProjectService.recent-spi.test.ts`（TC-01〜TC-12）

---

## 7. 外部依存

| 名前 | 種別 | 説明 |
|------|------|------|
| `@tidyjs/tidy` | ライブラリ | groupBy, summarize等のデータ集計 |

---

## 8. 関連オブジェクト

### 8.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                     ProjectService                          │
│  (ドメインサービス)                                         │
├─────────────────────────────────────────────────────────────┤
│                          │                                  │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│      Project         TaskRow      ProjectStatistics         │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 関係一覧

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `Project` | uses | 差分計算の入力 |
| `TaskRow` | uses | TaskDiffの構成要素 |
| `ProjectStatistics` | uses | マージ・補間の対象 |

---

## 9. テストケース数サマリ

| カテゴリ | 計画 | 実装 |
|----------|------|------|
| calculateTaskDiffs | 5件 | 5件 |
| calculateProjectDiffs | 2件 | 2件 |
| calculateAssigneeDiffs | 2件 | 2件 |
| calculateRecentSpi | 12件 | 12件 |
| mergeProjectStatistics | 3件 | 3件 |
| fillMissingDates | 3件 | 3件 |
| **合計** | **27件** | **27件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

### 10.1 calculateRecentSpi (REQ-SPI-001)

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-SPI-001 AC-01 | メソッドが追加されている | TC-01〜TC-04 | ✅ PASS |
| REQ-SPI-001 AC-02 | 期間SPI = ΔEV/ΔPV（窓端2点）を返す（#170 で仕様準拠修正） | TC-02, TC-03, TC-03b | ✅ PASS |
| REQ-SPI-001 AC-03 | 2点未満（1点・空配列）は undefined | TC-01, TC-05, TC-12 | ✅ PASS |
| REQ-SPI-001 AC-04 | フィルタ条件を指定できる | TC-04 | ✅ PASS |
| REQ-SPI-001 AC-05 | ΔPV<=0・窓端統計取得不能は undefined | TC-06, TC-07 | ✅ PASS |
| REQ-SPI-001 AC-06 | 期間超過で警告、計算続行 | TC-09, TC-10, TC-11 | ✅ PASS |
| REQ-SPI-001 AC-07 | 既存テストに影響なし | 全235件PASS | ✅ PASS |
| REQ-SPI-001 AC-08 | 単体テストが全てPASS | TC-01〜TC-12 | ✅ PASS |

### 10.2 その他のメソッド

該当なし（基盤サービスのため特定の要件に紐づかない）

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/domain/__tests__/ProjectService.test.ts` | 差分計算・マージ等の単体テスト | 15件 |
| `src/domain/__tests__/ProjectService.recent-spi.test.ts` | calculateRecentSpi単体テスト（期間SPI） | 13件 |
| `src/domain/__tests__/ProjectService.empty-diffs.test.ts` | calculateProjectDiffs 空入力デフォルト | 3件 |

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2026-01-27
Test Suites: 2 passed, 2 total
Tests:       27 passed, 27 total
```

---

## 12. 設計上の課題・改善提案

該当なし

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
| 1.1.0 | 2026-01-27 | calculateRecentSpi()メソッド追加 | REQ-SPI-001 |
| 2.0.0 | 2026-07-03 | #170 対応（0.0.29 / phase0-bugfix-0.0.29）: calculateRecentSpi を期間SPI（窓端2点の ΔEV/ΔPV）へ仕様準拠修正（Behavior Change）。calculateProjectDiffs の空入力デフォルト ProjectDiff を追加 | REQ-SPI-001, #139, #170 |
