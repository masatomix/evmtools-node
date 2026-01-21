# ProjectService 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16
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

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-PD-001 | 正常系 | modified=1, added=1, removed=1 | 各カウント=1 |
| EQ-PD-002 | 境界値 | 全てnone | modifiedCount=0, hasDiff=false |

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
| mergeProjectStatistics | 3件 | 3件 |
| fillMissingDates | 3件 | 3件 |
| **合計** | **15件** | **15件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

該当なし（基盤サービスのため特定の要件に紐づかない）

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/domain/__tests__/ProjectService.test.ts` | 単体テスト | 15件 |

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2025-12-16
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

---

## 12. 設計上の課題・改善提案

該当なし

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
