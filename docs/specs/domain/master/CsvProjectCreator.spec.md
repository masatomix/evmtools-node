# CsvProjectCreator 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16
**ソースファイル**: `src/infrastructure/CsvProjectCreator.ts`

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **クラス名** | `CsvProjectCreator` |
| **分類** | **アダプター（Adapter）** |
| **実装インターフェース** | `ProjectCreator` |
| **パッケージ** | `src/infrastructure/CsvProjectCreator.ts` |
| **責務** | CSVファイルパスを受け取り、ファイルを読み込んでProjectを生成する |

### 1.2 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| CSVプロジェクト生成 | `CsvProjectCreator` | CSVファイルからProjectを構築するクラス |
| 基準日 | `baseDate` | ファイル名から抽出するEVM計算の基準日 |
| エンコーディング | `encoding` | CSVファイルの文字コード（UTF-8/Shift-JIS） |

### 1.3 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────────────────────────┐
│                    インフラストラクチャ層                    │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ ExcelProject    │  │ CsvProjectCreator               │  │
│  │ Creator         │  │                                 │  │
│  └────────┬────────┘  └───────────────┬─────────────────┘  │
│           │                           │                    │
│           └───────────┬───────────────┘                    │
│                       ▼                                    │
├───────────────────────┼────────────────────────────────────┤
│                       ▼                                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              ProjectCreator（インターフェース）        │ │
│  │                      ドメイン層                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                       ▼                                    │
│                    Project                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-CSV-01 | `createProject()`は常にProjectインスタンスを返す（エラー時は例外） | 全操作 |
| INV-CSV-02 | 戻り値のProjectは有効な状態（baseDate, taskNodes, holidayDatasが設定済み） | 生成後 |
| INV-CSV-03 | 生成されるtaskNodesは全てisLeaf=true | 生成後 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数

| プロパティ | 型 | 必須 | 制約 | デフォルト | 説明 |
|-----------|-----|:----:|------|-----------|------|
| `csvPath` | `string` | ○ | 有効なファイルパス | - | CSVファイルの絶対パスまたは相対パス |
| `options` | `CsvProjectCreatorOptions` | - | - | `undefined` | オプション設定 |

### 3.2 公開プロパティ（getter）

該当なし

### 3.3 内部キャッシュ

該当なし

---

## 4. コンストラクタ仕様

### 4.1 シグネチャ

```typescript
constructor(
    csvPath: string,
    options?: CsvProjectCreatorOptions
)

type CsvProjectCreatorOptions = {
    encoding?: 'utf-8' | 'shift-jis' | 'auto'  // デフォルト: 'auto'
}
```

### 4.2 事前条件（Preconditions）

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-C01 | `csvPath`が有効なファイルパス | ファイルI/Oエラー |
| PRE-C02 | 指定パスにCSVファイルが存在する | ファイルI/Oエラー |
| PRE-C03 | ファイル名が規則に従う（`{name}_{yyyyMMdd}.csv`） | パースエラー |

### 4.3 事後条件（Postconditions）

| ID | 条件 |
|----|------|
| POST-C01 | インスタンスが生成される |
| POST-C02 | csvPathが内部に保持される |

---

## 5. メソッド仕様

### 5.1 `createProject(): Promise<Project>`

#### 目的
CSVファイルを読み込んでProjectオブジェクトを生成する

#### シグネチャ
```typescript
createProject(): Promise<Project>
```

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-CP-01 | CSVファイルが存在する | ファイルI/Oエラー |
| PRE-CP-02 | ファイルがCSV形式として解析可能 | パースエラー |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-CP-01 | 戻り値のProjectにbaseDateが設定されている（ファイル名から抽出） |
| POST-CP-02 | 戻り値のProjectにtaskNodesが設定されている（空配列可） |
| POST-CP-03 | 戻り値のProjectのholidayDatasは空配列 |
| POST-CP-04 | 全てのTaskNodeはisLeaf=true |
| POST-CP-05 | 全てのTaskNodeはparentId=undefined |
| POST-CP-06 | startDateはタスクの最小開始日、endDateは最大終了日 |

#### アルゴリズム

```
1. ファイル名からプロジェクト名と基準日を抽出
   - パターン: {projectName}_{yyyyMMdd}.csv
   - 例: MyProject_20251216.csv → name="MyProject", baseDate=2025-12-16

2. エンコーディング判定（auto時）
   - BOM検出またはShift-JIS特有バイトパターンで判定
   - 判定不能時はUTF-8として処理

3. CSVファイルを読み込み、行ごとにパース
   - 1行目はヘッダー行としてスキップ
   - 空行はスキップ
   - 各行をTaskRowに変換

4. 変換ルール:
   | CSV列 | TaskRowプロパティ |
   |-------|-------------------|
   | タスクID | id, sharp |
   | 名称 | name |
   | 担当 | assignee |
   | 予定工数 | workload |
   | 予定開始日 | startDate |
   | 予定終了日 | endDate |
   | 実績開始日 | actualStartDate |
   | 実績終了日 | actualEndDate |
   | 進捗率 | progressRate（0-1に正規化） |
   | 稼働予定日数 | scheduledWorkDays |
   | PV | pv |
   | EV | ev |

5. 追加で設定するプロパティ:
   - level = 1（全て同一階層）
   - isLeaf = true
   - parentId = undefined
   - plotMap = new Map()

6. TaskRow[] → TaskNode[] に変換（TaskService.buildTaskTree使用）

7. Project生成:
   - taskNodes: 変換したTaskNode[]
   - baseDate: ファイル名から抽出
   - holidayDatas: []
   - startDate: タスクの最小startDate
   - endDate: タスクの最大endDate
   - name: ファイル名から抽出
```

#### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-CP-01 | 進捗率が1より大きい場合（例: 50）、100で割って0-1に正規化 | 自動変換 |
| BR-CP-02 | タスクIDが空または数値でない行はスキップ | 警告ログ出力、処理継続 |
| BR-CP-03 | 日付形式は`yyyy/MM/dd`または`yyyy-MM-dd`を許容 | 自動パース |

#### 例外処理

| 条件 | エラー内容 |
|------|-----------|
| ファイルが存在しない | `Error: File not found: {path}` |
| ファイル名パターン不一致 | `Error: Invalid filename format. Expected: {name}_{yyyyMMdd}.csv` |
| CSV解析エラー | `Error: Failed to parse CSV: {details}` |

#### 同値クラス・境界値

| ID | 分類 | 入力条件 | 期待結果 |
|----|------|----------|----------|
| EQ-CP-001 | 正常系 | 有効なUTF-8 CSVファイル | Projectが返される |
| EQ-CP-002 | 正常系 | 有効なShift-JIS CSVファイル | Projectが返される |
| EQ-CP-003 | 正常系 | タスク0件のCSV（ヘッダーのみ） | taskNodes空のProject |
| EQ-CP-004 | 異常系 | 存在しないファイルパス | エラー |
| EQ-CP-005 | 異常系 | ファイル名パターン不一致 | エラー |
| EQ-CP-010 | 正常系 | 進捗率=0.5 | progressRate=0.5 |
| EQ-CP-011 | 正常系 | 進捗率=50（%表記） | progressRate=0.5（正規化） |
| EQ-CP-012 | 境界値 | 進捗率=0 | progressRate=0 |
| EQ-CP-013 | 境界値 | 進捗率=1 | progressRate=1 |
| EQ-CP-014 | 境界値 | 進捗率=100 | progressRate=1（正規化） |
| EQ-CP-015 | 異常系 | タスクID空の行 | スキップ、警告ログ |
| EQ-CP-020 | 正常系 | 日付`2025/01/15` | Date(2025-01-15) |
| EQ-CP-021 | 正常系 | 日付`2025-01-15` | Date(2025-01-15) |
| EQ-CP-022 | 境界値 | 日付が空文字 | undefined |
| EQ-CP-023 | 異常系 | 日付が`invalid` | undefined、警告ログ |

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 正常系

```gherkin
Scenario: UTF-8のCSVファイルからProjectを生成できる
  Given UTF-8エンコードのCSVファイル "TestProject_20251216.csv"
  And   3件のタスクが含まれている
  When  CsvProjectCreator("TestProject_20251216.csv").createProject()を呼び出す
  Then  Projectが返される
  And   project.nameが "TestProject" である
  And   project.baseDateが 2025-12-16 である
  And   project.taskNodesに3件のタスクが含まれる
  And   project.holidayDatasが空配列である
```

```gherkin
Scenario: Shift-JISのCSVファイルからProjectを生成できる
  Given Shift-JISエンコードのCSVファイル（日本語を含む）
  When  CsvProjectCreator(path, { encoding: 'shift-jis' }).createProject()を呼び出す
  Then  Projectが返される
  And   日本語のタスク名が正しく読み込まれている
```

```gherkin
Scenario: 進捗率のパーセント表記を正規化する
  Given 進捗率が "50" と記載されたCSV
  When  createProject()を呼び出す
  Then  TaskRowのprogressRateが 0.5 になる
```

### 6.2 異常系

```gherkin
Scenario: 存在しないファイルパスでエラーが発生する
  Given 存在しないファイルパス "not_exist.csv"
  When  CsvProjectCreator("not_exist.csv").createProject()を呼び出す
  Then  ファイルI/Oエラーが発生する
```

```gherkin
Scenario: ファイル名パターン不一致でエラーが発生する
  Given ファイル名が "invalid.csv"（日付部分なし）
  When  CsvProjectCreator("invalid.csv").createProject()を呼び出す
  Then  パースエラーが発生する
```

```gherkin
Scenario: 不正な行があっても処理を継続する
  Given タスクIDが空の行を含むCSV
  When  createProject()を呼び出す
  Then  Projectが返される
  And   不正な行はスキップされる
  And   警告ログが出力される
```

---

## 7. 外部依存

| 名前 | 種別 | 説明 |
|------|------|------|
| `fs` (Node.js) | 標準ライブラリ | ファイル読み込み |
| `iconv-lite` | npm | Shift-JIS対応 |

---

## 8. 関連オブジェクト

### 8.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                    CsvProjectCreator                        │
│  (アダプター)                                               │
├─────────────────────────────────────────────────────────────┤
│                         │                                   │
│    ┌────────────────────┼────────────────────┐              │
│    ▼                    ▼                    ▼              │
│ TaskRow            TaskNode              Project            │
│ (エンティティ)     (エンティティ)        (集約ルート)        │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 関係一覧

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `ProjectCreator` | implements | インターフェース実装 |
| `TaskRow` | creates | CSVからTaskRowを生成 |
| `TaskNode` | creates | TaskRowからTaskNodeを生成 |
| `TaskService` | uses | buildTaskTreeでツリー構築 |
| `Project` | creates | 最終的にProjectを生成 |

---

## 9. テストケース数サマリ

| カテゴリ | 計画 | 実装 |
|----------|------|------|
| ファイル読み込み | 5件 | 5件 |
| データ変換 | 6件 | 6件 |
| 日付パース | 4件 | 4件 |
| シナリオテスト | 6件 | 7件 |
| 統合テスト | - | 10件 |
| **合計** | **21件** | **32件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-CSV-001 AC-01 | UTF-8 CSVから読み込み | EQ-CP-001 | ✅ PASS |
| REQ-CSV-001 AC-02 | Shift-JIS CSVから読み込み | EQ-CP-002 | ✅ PASS |
| REQ-CSV-001 AC-03 | ファイル名から抽出 | EQ-CP-001 | ✅ PASS |
| REQ-CSV-001 AC-04 | EVM計算動作 | 統合テスト (10件) | ✅ PASS |
| REQ-CSV-001 AC-05 | 不正行で継続 | EQ-CP-015 | ✅ PASS |

> **ステータス凡例**:
> - ⏳: 未実装
> - ✅ PASS: テスト合格
> - ❌ FAIL: テスト失敗

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/infrastructure/__tests__/CsvProjectCreator.test.ts` | 単体テスト | 22件 |
| `src/infrastructure/__tests__/CsvProjectCreator.integration.test.ts` | 統合テスト | 10件 |

### 11.2 テストフィクスチャ

| ファイル | 用途 |
|---------|------|
| `TestProject_20251216.csv` | UTF-8正常系テスト |
| `EmptyProject_20251216.csv` | 空ファイルテスト |
| `PercentProgress_20251216.csv` | 進捗率正規化テスト |
| `InvalidRows_20251216.csv` | 不正行スキップテスト |
| `invalid_filename.csv` | ファイル名エラーテスト |
| `DateFormat_20251216.csv` | 日付形式テスト |

### 11.3 テスト実行結果

```
実行日: 2025-12-16
Test Suites: 4 passed, 4 total
Tests:       80 passed (全体), 32 passed (CsvProjectCreator関連)
```

---

## 12. 設計上の課題・改善提案

該当なし

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | REQ-CSV-001 |
