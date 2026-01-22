# TaskRow 仕様書

**バージョン**: 1.1.0
**作成日**: 2025-12-16
**更新日**: 2026-01-22
**ソースファイル**: `src/domain/TaskRow.ts`

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **クラス名** | `TaskRow` |
| **分類** | **エンティティ（Entity）** |
| **実装インターフェース** | - |
| **パッケージ** | `src/domain/TaskRow.ts` |
| **責務** | タスクの基本情報とEVM計算ロジックを保持する。リーフタスクまたは中間ノードを表現 |

### 1.2 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| 計画価値 | `pv` (Planned Value) | 基準日までに完了予定だった作業量 |
| 出来高 | `ev` (Earned Value) | 実際に完了した作業の価値 |
| スケジュール効率指標 | `spi` (Schedule Performance Index) | EV/PV。1.0以上なら予定通り |
| スケジュール差異 | `sv` (Schedule Variance) | EV-PV |
| 基準日 | `baseDate` | EVM計算の基準となる日付 |
| 進捗率 | `progressRate` | タスクの完了度合い（0.0〜1.0） |
| 稼働予定日数 | `scheduledWorkDays` | タスクに割り当てられた作業日数 |
| 予定工数 | `workload` | タスクに割り当てられた作業量（人日） |
| プロットマップ | `plotMap` | Excelシリアル値をキーとした稼働日マップ |
| リーフノード | `isLeaf` | 子を持たない末端タスク |
| 残日数 | `remainingDays` | 基準日から終了日までの稼働日数 |
| 計画PV | `pvToday` | 1日あたりの計画価値（workloadPerDay） |
| 実行PV | `pvTodayActual` | 残工数/残日数で計算する実態値 |

### 1.3 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────────────────────────┐
│                      domain 層                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     TaskRow                          │   │
│  │  - EVM計算ロジック (calculatePV, calculatePVs等)     │   │
│  │  - 状態判定 (isOverdueAt, finished, validStatus)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ▲                                  │
│                          │ extends                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     TaskNode                         │   │
│  │  - ツリー構造 (children)                             │   │
│  │  - Iterable実装                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-TR-01 | `id`は一意の識別子として存在する | 生成時 |
| INV-TR-02 | `level`は1以上の整数 | 生成時 |
| INV-TR-03 | `progressRate`は0.0〜1.0の範囲、またはundefined | 生成時 |
| INV-TR-04 | `startDate` <= `endDate`（両方存在する場合） | 検証時 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数

| プロパティ | 型 | 必須 | 制約 | デフォルト | 説明 |
|-----------|-----|:----:|------|-----------|------|
| `sharp` | `number` | ○ | - | - | 表示順の行番号（#列） |
| `id` | `number` | ○ | - | - | タスクの一意なID |
| `level` | `number` | ○ | ≥1 | - | 階層レベル（1=ルート、2=子など） |
| `name` | `string` | ○ | - | - | タスク名 |
| `assignee` | `string` | - | - | `undefined` | 担当者名 |
| `workload` | `number` | - | - | `undefined` | 予定工数（日単位） |
| `startDate` | `Date` | - | - | `undefined` | 予定開始日 |
| `endDate` | `Date` | - | - | `undefined` | 予定終了日 |
| `actualStartDate` | `Date` | - | - | `undefined` | 実績開始日 |
| `actualEndDate` | `Date` | - | - | `undefined` | 実績終了日 |
| `progressRate` | `number` | - | 0.0〜1.0 | `undefined` | 進捗率 |
| `scheduledWorkDays` | `number` | - | - | `undefined` | 稼働予定日数 |
| `pv` | `number` | - | - | `undefined` | 計画価値（Excel読込時の値） |
| `ev` | `number` | - | - | `undefined` | 出来高（Excel読込時の値） |
| `spi` | `number` | - | - | `undefined` | スケジュール効率指標 |
| `expectedProgressDate` | `Date` | - | - | `undefined` | 現進捗率に相当する予定日 |
| `delayDays` | `number` | - | - | `undefined` | 遅延日数（マイナス=前倒し） |
| `remarks` | `string` | - | - | `undefined` | 備考 |
| `parentId` | `number` | - | - | `undefined` | 親タスクのID |
| `isLeaf` | `boolean` | - | - | `undefined` | リーフノードかどうか |
| `plotMap` | `Map<number, boolean>` | - | - | `undefined` | Excelシリアル値→稼働日マップ |

### 3.2 公開プロパティ（getter）

| プロパティ | 戻り型 | 説明 |
|-----------|--------|------|
| `workloadPerDay` | `number \| undefined` | 予定工数 / 稼働予定日数 |
| `finished` | `boolean` | 進捗率が1.0ならtrue |
| `validStatus` | `ValidStatus` | データの有効性チェック結果 |

### 3.3 内部キャッシュ

該当なし

---

## 4. コンストラクタ仕様

### 4.1 シグネチャ

```typescript
constructor(
    sharp: number,
    id: number,
    level: number,
    name: string,
    assignee?: string,
    workload?: number,
    startDate?: Date,
    endDate?: Date,
    actualStartDate?: Date,
    actualEndDate?: Date,
    progressRate?: number,
    scheduledWorkDays?: number,
    pv?: number,
    ev?: number,
    spi?: number,
    expectedProgressDate?: Date,
    delayDays?: number,
    remarks?: string,
    parentId?: number,
    isLeaf?: boolean,
    plotMap?: Map<number, boolean>
)
```

### 4.2 事前条件（Preconditions）

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-C01 | `id`が数値である | TypeError |
| PRE-C02 | `level`が1以上の整数 | 不正な階層構造 |

### 4.3 事後条件（Postconditions）

| ID | 条件 |
|----|------|
| POST-C01 | 全プロパティが設定される |

---

## 5. メソッド仕様

### 5.1 `workloadPerDay` (getter)

#### 目的
1日あたりの工数を計算する

#### シグネチャ
```typescript
get workloadPerDay(): number | undefined
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-WPD-01 | workloadとscheduledWorkDaysが有効な数値かつscheduledWorkDays≠0なら、workload/scheduledWorkDaysを返す |
| POST-WPD-02 | 上記以外の場合はundefinedを返す |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-WPD-001 | 正常系 | workload=10, scheduledWorkDays=5 | 2 |
| EQ-WPD-002 | 境界値 | scheduledWorkDays=0 | undefined |
| EQ-WPD-003 | 異常系 | workload=undefined | undefined |
| EQ-WPD-004 | 異常系 | scheduledWorkDays=undefined | undefined |

---

### 5.2 `finished` (getter)

#### 目的
タスクが完了しているか判定する

#### シグネチャ
```typescript
get finished(): boolean
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-FIN-01 | progressRate === 1.0 の場合はtrue |
| POST-FIN-02 | それ以外（undefined含む）はfalse |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-FIN-001 | 正常系 | progressRate=1.0 | true |
| EQ-FIN-002 | 正常系 | progressRate=0.5 | false |
| EQ-FIN-003 | 境界値 | progressRate=0 | false |
| EQ-FIN-004 | 境界値 | progressRate=undefined | false |
| EQ-FIN-005 | 境界値 | progressRate=0.999 | false |

---

### 5.3 `isOverdueAt(baseDate: Date): boolean`

#### 目的
指定した基準日でタスクが期限切れかどうかを判定する

#### シグネチャ
```typescript
isOverdueAt(baseDate: Date): boolean
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-OD-01 | endDate <= baseDate かつ 未完了（progressRate < 1.0 または undefined）の場合はtrue |
| POST-OD-02 | endDateがundefinedの場合はfalse |
| POST-OD-03 | 完了済み（progressRate === 1.0）の場合はfalse |

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-OD-01 | 期限切れ判定は「基準日の業務終了時点」の状況を算出 | endDate === baseDateは期限切れとみなす |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-OD-001 | 正常系 | endDate < baseDate, progressRate=0.5 | true |
| EQ-OD-002 | 境界値 | endDate === baseDate, progressRate=0.5 | true |
| EQ-OD-003 | 正常系 | endDate > baseDate, progressRate=0.5 | false |
| EQ-OD-004 | 正常系 | endDate < baseDate, progressRate=1.0 | false |
| EQ-OD-005 | 境界値 | endDate=undefined | false |
| EQ-OD-006 | 境界値 | progressRate=undefined（未完了扱い） | true（endDate<=baseDateの場合） |

---

### 5.4 `validStatus` (getter)

#### 目的
タスクデータの有効性をチェックする

#### シグネチャ
```typescript
get validStatus(): ValidStatus
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-VS-01 | startDate, endDate, plotMap, workload, scheduledWorkDaysが全て有効なら`{ isValid: true }` |
| POST-VS-02 | startDateまたはendDateがundefinedなら`{ isValid: false, invalidReason: '日付エラー...' }` |
| POST-VS-03 | plotMapがundefinedなら`{ isValid: false, invalidReason: 'plotMapエラー...' }` |
| POST-VS-04 | scheduledWorkDaysが0またはundefinedなら`{ isValid: false, invalidReason: '日数エラー...' }` |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-VS-001 | 正常系 | 全データ有効 | isValid=true |
| EQ-VS-002 | 異常系 | startDate=undefined | isValid=false, '日付エラー' |
| EQ-VS-003 | 異常系 | endDate=undefined | isValid=false, '日付エラー' |
| EQ-VS-004 | 異常系 | plotMap=undefined | isValid=false, 'plotMapエラー' |
| EQ-VS-005 | 異常系 | scheduledWorkDays=0 | isValid=false, '日数エラー' |
| EQ-VS-006 | 異常系 | workload=undefined | isValid=false, '日数エラー' |

---

### 5.5 `calculatePV(baseDate: Date): number | undefined`

#### 目的
基準日（その日のみ）のPVを計算する

#### シグネチャ
```typescript
calculatePV(baseDate: Date): number | undefined
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-PV-01 | checkStartEndDateAndPlotMap()がtrue | undefined返却 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-PV-01 | 基準日がplotMapに存在し、startDate〜endDate範囲内なら`workloadPerDay`を返す |
| POST-PV-02 | 基準日が範囲外またはplotMapにない場合は0を返す |
| POST-PV-03 | workloadPerDayがundefinedの場合はundefinedを返す |

#### アルゴリズム

```
1. checkStartEndDateAndPlotMapで事前チェック（false→undefined）
2. workloadPerDayを取得（undefined→undefined）
3. isInRange(baseDate, startDate, endDate, plotMap)でレンジ判定
   - plotMap.get(baseDateシリアル値) === true
   - かつ startDate <= baseDate <= endDate
4. レンジ内→workloadPerDay、範囲外→0
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-PV-001 | 正常系 | 稼働日（平日）、範囲内 | workloadPerDay |
| EQ-PV-002 | 正常系 | タスク開始前 | 0 |
| EQ-PV-003 | 正常系 | タスク終了後 | 0 |
| EQ-PV-004 | 境界値 | 土日（plotMapにない） | 0 |
| EQ-PV-005 | 異常系 | 必須データ不足 | undefined |

---

### 5.6 `calculatePVs(baseDate: Date): number`

#### 目的
基準日終了時点の累積PVを計算する

#### シグネチャ
```typescript
calculatePVs(baseDate: Date): number
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-PVS-01 | checkStartEndDateAndPlotMap()がtrue | 0返却 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-PVS-01 | plotMapの全エントリのうち、シリアル値 <= baseDateシリアル値のPVを合計 |
| POST-PVS-02 | タスク開始前は0 |
| POST-PVS-03 | タスク終了後は全工数（workload） |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-PVS-001 | 正常系 | 5日間のタスク、3日目まで | 3日分のPV |
| EQ-PVS-002 | 境界値 | タスク開始前 | 0 |
| EQ-PVS-003 | 境界値 | タスク終了後 | 全工数 |
| EQ-PVS-004 | 異常系 | 必須データ不足 | 0 |

---

### 5.7 `calculateSPI(baseDate: Date): number | undefined`

#### 目的
基準日のSPI（Schedule Performance Index）を計算する

#### シグネチャ
```typescript
calculateSPI(baseDate: Date): number | undefined
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-SPI-01 | SPI = EV / 累積PV |
| POST-SPI-02 | 累積PVが0の場合はundefined |
| POST-SPI-03 | EVがundefinedの場合はundefined |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-SPI-001 | 正常系 | EV=4, 累積PV=6 | 0.6667 |
| EQ-SPI-002 | 正常系 | EV=6, 累積PV=6 | 1.0 |
| EQ-SPI-003 | 境界値 | 累積PV=0 | undefined |
| EQ-SPI-004 | 異常系 | EV=undefined | undefined |

---

### 5.8 `calculateSV(baseDate: Date): number | undefined`

#### 目的
基準日のSV（Schedule Variance）を計算する

#### シグネチャ
```typescript
calculateSV(baseDate: Date): number | undefined
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-SV-01 | SV = EV - 累積PV |
| POST-SV-02 | EVがundefinedの場合はundefined |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-SV-001 | 正常系 | EV=4, 累積PV=6 | -2（遅延） |
| EQ-SV-002 | 正常系 | EV=8, 累積PV=6 | 2（前倒し） |
| EQ-SV-003 | 境界値 | EV=6, 累積PV=6 | 0（予定通り） |
| EQ-SV-004 | 異常系 | EV=undefined | undefined |

---

### 5.9 `checkStartEndDateAndPlotMap(): boolean`

#### 目的
startDate, endDate, plotMapの存在チェック

#### シグネチャ
```typescript
checkStartEndDateAndPlotMap(): boolean
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-CHECK-01 | startDate, endDate, plotMapが全てundefinedでなければtrue |
| POST-CHECK-02 | いずれかがundefinedならfalse（警告ログ出力） |

---

### 5.10 `static fromNode(node: TaskNode, level: number, parentId?: number): TaskRow`

#### 目的
TaskNodeからTaskRowを生成する

#### シグネチャ
```typescript
static fromNode(node: TaskNode, level: number, parentId?: number): TaskRow
```

#### 事前条件

該当なし

#### 事後条件

| ID | 条件 |
|----|------|
| POST-FN-01 | nodeの全プロパティを引き継いだTaskRowを返す |
| POST-FN-02 | levelとparentIdは引数の値で上書き |

---

### 5.11 `calculateRemainingDays(baseDate: Date): number | undefined`

#### 目的
基準日から終了日までの残日数を計算する（REQ-PVTODAY-001）

#### シグネチャ
```typescript
calculateRemainingDays(baseDate: Date): number | undefined
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-RD-01 | checkStartEndDateAndPlotMap()がtrue | undefined返却 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-RD-01 | 基準日〜終了日の間でplotMapにプロットされている日数を返す |
| POST-RD-02 | 基準日が終了日より後の場合は0を返す |
| POST-RD-03 | 基準日を含めてカウントする |

#### アルゴリズム

```
1. checkStartEndDateAndPlotMapで事前チェック（false→undefined）
2. baseSerial = date2Sn(baseDate), endSerial = date2Sn(endDate)
3. baseSerial > endSerialなら0を返す
4. plotMapを走査し、baseSerial <= serial <= endSerialの範囲でtrueの日数をカウント
5. カウント結果を返す
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-RD-001 | 正常系 | 基準日=開始日、3日間タスク | 3 |
| EQ-RD-002 | 正常系 | 基準日=中間日、3日間タスク | 2 |
| EQ-RD-003 | 境界値 | 基準日=終了日 | 1 |
| EQ-RD-004 | 境界値 | 基準日が終了日より後 | 0 |
| EQ-RD-005 | 境界値 | 基準日が開始日より前 | 全日数 |
| EQ-RD-006 | 境界値 | 1日のみのタスク | 1 |
| EQ-RD-007 | 異常系 | startDate=undefined | undefined |
| EQ-RD-008 | 異常系 | endDate=undefined | undefined |
| EQ-RD-009 | 異常系 | plotMap=undefined | undefined |

---

### 5.12 `calculatePvTodayActual(baseDate: Date): number | undefined`

#### 目的
実行PV（残工数/残日数）を計算する（REQ-PVTODAY-001）

#### シグネチャ
```typescript
calculatePvTodayActual(baseDate: Date): number | undefined
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-PTA-01 | progressRateがundefinedでない | undefined返却 |
| PRE-PTA-02 | workloadがundefinedでない | undefined返却 |
| PRE-PTA-03 | calculateRemainingDays(baseDate)が0より大きい | undefined返却 |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-PTA-01 | progressRate === 1.0の場合は0を返す（完了タスク） |
| POST-PTA-02 | 残工数 = workload × (1 - progressRate) |
| POST-PTA-03 | 実行PV = 残工数 / 残日数 |

#### アルゴリズム

```
1. progressRate === 1.0なら0を返す（完了タスク）
2. progressRate === undefinedならundefinedを返す
3. workload === undefinedならundefinedを返す
4. remainingDays = calculateRemainingDays(baseDate)
5. remainingDays === undefined または 0ならundefinedを返す
6. remainingWorkload = workload × (1 - progressRate)
7. remainingWorkload / remainingDaysを返す
```

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-PTA-001 | 正常系 | 遅れタスク（基準日=終了日） | 1.0 |
| EQ-PTA-002 | 正常系 | 前倒しタスク（基準日=終了日-1） | 0.5 |
| EQ-PTA-003 | 正常系 | 予定通りタスク | workloadPerDayに近い値 |
| EQ-PTA-004 | 境界値 | 完了タスク（progressRate=1.0） | 0 |
| EQ-PTA-005 | 境界値 | 進捗0%のタスク | workload/残日数 |
| EQ-PTA-006 | 境界値 | 残日数=0（終了日過ぎ） | undefined |
| EQ-PTA-007 | 異常系 | progressRate=undefined | undefined |
| EQ-PTA-008 | 異常系 | workload=undefined | undefined |
| EQ-PTA-009 | 異常系 | 日付データ不正 | undefined |

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 workloadPerDay

```gherkin
Scenario: 予定工数と稼働予定日数から1日あたりの工数を計算する
  Given workload=10, scheduledWorkDays=5のTaskRow
  When  workloadPerDayを取得
  Then  2が返される

Scenario: 稼働予定日数が0の場合はundefined
  Given workload=10, scheduledWorkDays=0のTaskRow
  When  workloadPerDayを取得
  Then  undefinedが返される
```

### 6.2 finished

```gherkin
Scenario: 進捗率100%でtrue
  Given progressRate=1.0のTaskRow
  When  finishedを取得
  Then  trueが返される

Scenario: 進捗率100%未満でfalse
  Given progressRate=0.5のTaskRow
  When  finishedを取得
  Then  falseが返される
```

### 6.3 isOverdueAt

```gherkin
Scenario: 期限切れタスクの判定
  Given endDate=2025-06-10, progressRate=0.5のTaskRow
  When  isOverdueAt(2025-06-10)を呼び出す
  Then  trueが返される（期限当日も期限切れ）

Scenario: 完了済みタスクは期限切れにならない
  Given endDate=2025-06-10, progressRate=1.0のTaskRow
  When  isOverdueAt(2025-06-15)を呼び出す
  Then  falseが返される
```

### 6.4 calculatePV / calculatePVs

```gherkin
Scenario: 稼働日のPV計算
  Given 2025-06-09〜2025-06-13の5日間タスク
  And   workload=10, scheduledWorkDays=5
  When  calculatePV(2025-06-10)を呼び出す
  Then  2が返される（10/5=2）

Scenario: 累積PV計算
  Given 2025-06-09〜2025-06-13の5日間タスク
  And   workload=10, scheduledWorkDays=5
  When  calculatePVs(2025-06-11)を呼び出す
  Then  6が返される（3日分 × 2）
```

### 6.5 calculateRemainingDays

```gherkin
Scenario: 残日数の計算（開始日から）
  Given 2026-01-20〜2026-01-22の3日間タスク
  When  calculateRemainingDays(2026-01-20)を呼び出す
  Then  3が返される

Scenario: 残日数の計算（中間日から）
  Given 2026-01-20〜2026-01-22の3日間タスク
  When  calculateRemainingDays(2026-01-21)を呼び出す
  Then  2が返される

Scenario: 終了日を過ぎた場合
  Given 2026-01-20〜2026-01-22の3日間タスク
  When  calculateRemainingDays(2026-01-23)を呼び出す
  Then  0が返される
```

### 6.6 calculatePvTodayActual

```gherkin
Scenario: 遅れタスクの実行PV計算
  Given workload=2.5, progressRate=0.6, 残日数=1のタスク
  When  calculatePvTodayActual(終了日)を呼び出す
  Then  1.0が返される（残工数1.0 / 残日数1）

Scenario: 前倒しタスクの実行PV計算
  Given workload=2.5, progressRate=0.6, 残日数=2のタスク
  When  calculatePvTodayActual(終了日-1)を呼び出す
  Then  0.5が返される（残工数1.0 / 残日数2）

Scenario: 完了タスクの実行PV
  Given progressRate=1.0のTaskRow
  When  calculatePvTodayActualを呼び出す
  Then  0が返される
```

---

## 7. 外部依存

| 名前 | 種別 | 説明 |
|------|------|------|
| `excel-csv-read-write` | ライブラリ | `date2Sn()`, `dateFromSn()` - Excelシリアル値変換 |
| `pino` | ライブラリ | ロギング |

---

## 8. 関連オブジェクト

### 8.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                       TaskRow                               │
│  (エンティティ)                                             │
├─────────────────────────────────────────────────────────────┤
│                          ▲                                  │
│                          │ extends                          │
│                       TaskNode                              │
│                          │                                  │
│                          │ aggregates                       │
│                          ▼                                  │
│                       Project                               │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 関係一覧

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `TaskNode` | extended by | TaskNodeがTaskRowを継承 |
| `TaskService` | uses | ツリー構築時に使用 |
| `Project` | aggregates | Projectが複数のTaskRowを保持 |

---

## 9. テストケース数サマリ

| カテゴリ | 計画 | 実装 |
|----------|------|------|
| workloadPerDay | 4件 | 4件 |
| finished | 5件 | 5件 |
| isOverdueAt | 6件 | 6件 |
| validStatus | 6件 | 6件 |
| calculatePV | 5件 | 5件 |
| calculatePVs | 4件 | 4件 |
| calculateSPI | 4件 | 4件 |
| calculateSV | 4件 | 4件 |
| checkStartEndDateAndPlotMap | 2件 | 2件 |
| calculateRemainingDays | 9件 | 9件 |
| calculatePvTodayActual | 9件 | 9件 |
| pvToday比較テスト | 2件 | 2件 |
| **合計** | **60件** | **60件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応メソッド | 対応テストケース | 結果 |
|--------|-------------|-------------|-----------------|------|
| REQ-PVTODAY-001 AC-01 | calculateRemainingDays メソッドが追加され、残日数を返す | calculateRemainingDays | TC-01〜TC-09 | ✅ PASS |
| REQ-PVTODAY-001 AC-02 | calculatePvTodayActual メソッドが追加され、実行PVを返す | calculatePvTodayActual | TC-10〜TC-18 | ✅ PASS |
| REQ-PVTODAY-001 AC-05 | 残日数0の場合、undefined を返す | calculatePvTodayActual | TC-15 | ✅ PASS |
| REQ-PVTODAY-001 AC-06 | progressRate未設定の場合、undefined を返す | calculatePvTodayActual | TC-16 | ✅ PASS |
| REQ-PVTODAY-001 AC-07 | 完了タスクの場合、0 を返す | calculatePvTodayActual | TC-13 | ✅ PASS |

**関連仕様書**: [`TaskRow.pvToday.spec.md`](../features/TaskRow.pvToday.spec.md)

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/domain/__tests__/TaskRow.test.ts` | 単体テスト | 40件 |
| `src/domain/__tests__/TaskRow.pvToday.test.ts` | pvToday関連テスト | 20件 |

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2026-01-22
Test Suites: 2 passed, 2 total
Tests:       60 passed, 60 total
```

---

## 12. 設計上の課題・改善提案

該当なし

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
| 1.1.0 | 2026-01-22 | calculateRemainingDays, calculatePvTodayActual メソッド追加 | REQ-PVTODAY-001 |
