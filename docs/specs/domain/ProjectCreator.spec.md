# ProjectCreator 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16
**ソースファイル**:
- `src/domain/ProjectCreator.ts`（インターフェース）
- `src/infrastructure/ExcelProjectCreator.ts`（実装）
- `src/infrastructure/ExcelBufferProjectCreator.ts`（実装）
- `src/infrastructure/MappingProjectCreator.ts`（実装）

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **インターフェース名** | `ProjectCreator` |
| **分類** | **ポート（Port）** - クリーンアーキテクチャにおけるインターフェース |
| **パッケージ** | `src/domain/ProjectCreator.ts` |
| **責務** | Projectオブジェクトを生成するための抽象化。データソースの詳細を隠蔽する |

### 1.2 実装クラス（アダプター）

| クラス名 | パッケージ | 役割 |
|----------|-----------|------|
| `ExcelProjectCreator` | infrastructure | ファイルパスからExcelを読みProjectを生成 |
| `ExcelBufferProjectCreator` | infrastructure | ArrayBufferからExcelを読みProjectを生成 |
| `MappingProjectCreator` | infrastructure | マッピングデータからProjectを生成（実際の変換ロジック） |

### 1.3 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| プロジェクト生成 | `createProject()` | データソースからProjectオブジェクトを構築する操作 |
| マッピングデータ | `mappings` | Excelから読み取った行データの配列 |
| ガントチャート | シート名 | タスク情報が記載されたExcelシート |
| 休日テーブル | シート名 | 祝日情報が記載されたExcelシート |
| 基準日 | `baseDate` | EVM計算の基準となる日付（Excelの特定セルから取得） |

### 1.4 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────────────────────────┐
│                    インフラストラクチャ層                    │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ ExcelProject    │  │ ExcelBufferProjectCreator       │  │
│  │ Creator         │  │                                 │  │
│  └────────┬────────┘  └───────────────┬─────────────────┘  │
│           │                           │                    │
│           └───────────┬───────────────┘                    │
│                       ▼                                    │
│           ┌───────────────────────┐                        │
│           │ MappingProjectCreator │                        │
│           │ （実際の変換ロジック） │                        │
│           └───────────┬───────────┘                        │
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

## 2. ProjectCreator インターフェース

### 2.1 定義

```typescript
export interface ProjectCreator {
    createProject(): Promise<Project>
}
```

### 2.2 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-PC-01 | `createProject()`は常にProjectインスタンスを返す（エラー時は例外） | 全実装 |
| INV-PC-02 | 戻り値のProjectは有効な状態（baseDate, taskNodes, holidayDatasが設定済み） | 生成後 |

### 2.3 メソッド仕様

#### `createProject(): Promise<Project>`

| 項目 | 内容 |
|------|------|
| **目的** | データソースからProjectオブジェクトを生成する |
| **戻り値** | `Promise<Project>` |
| **非同期** | Yes（ファイルI/O等を含むため） |

##### 事後条件

| ID | 条件 |
|----|------|
| POST-PC-01 | 戻り値のProjectにbaseDateが設定されている |
| POST-PC-02 | 戻り値のProjectにtaskNodesが設定されている（空配列可） |
| POST-PC-03 | 戻り値のProjectにholidayDatasが設定されている（空配列可） |

---

## 3. ExcelProjectCreator

### 3.1 基本情報

| 項目 | 内容 |
|------|------|
| **クラス名** | `ExcelProjectCreator` |
| **分類** | **アダプター（Adapter）** |
| **実装インターフェース** | `ProjectCreator` |
| **パッケージ** | `src/infrastructure/ExcelProjectCreator.ts` |
| **責務** | Excelファイルパスを受け取り、ファイルを読み込んでProjectを生成する |

### 3.2 コンストラクタ

```typescript
constructor(private _excelPath: string)
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|:----:|------|
| `_excelPath` | `string` | ○ | Excelファイルの絶対パスまたは相対パス |

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-EPC-01 | `_excelPath`が有効なファイルパス | ファイルI/Oエラー |
| PRE-EPC-02 | 指定パスにExcelファイルが存在する | ファイルI/Oエラー |
| PRE-EPC-03 | Excelファイルに「ガントチャート」シートが存在する | エラー |
| PRE-EPC-04 | Excelファイルに「休日テーブル」シートが存在する | エラー |

### 3.3 メソッド仕様

#### `createProject(): Promise<Project>`

##### 処理フロー（Algorithm）

```
1. excel2json2()で「ガントチャート」シートを読み込み → mappings
2. excel2json2()で「休日テーブル」シートを読み込み → holidayRawDatas
3. ファイルパスからプロジェクト名を抽出（拡張子除去）
4. MappingProjectCreator(mappings, projectName, holidayRawDatas).createProject()に委譲
5. Projectを返す
```

##### 外部依存（External Dependencies）

| 名前 | 種別 | 説明 |
|------|------|------|
| `excel-csv-read-write` | ライブラリ | Excelファイルの読み込み |
| ファイルシステム | I/O | Excelファイルへのアクセス |

##### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-EPC-01 | プロジェクト名はファイル名（拡張子除去）から自動導出される | N/A |
| BR-EPC-02 | ガントチャートシートのデータ読み込みはヘッダーなしモード | N/A |

##### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | 有効なExcelファイルパス | Projectが返される |
| **正常系** | タスク0件のExcel | taskNodes空のProject |
| **異常系** | 存在しないファイルパス | エラー |
| **異常系** | 「ガントチャート」シートがないExcel | エラー |
| **異常系** | 「休日テーブル」シートがないExcel | エラー |

---

## 4. ExcelBufferProjectCreator

### 4.1 基本情報

| 項目 | 内容 |
|------|------|
| **クラス名** | `ExcelBufferProjectCreator` |
| **分類** | **アダプター（Adapter）** |
| **実装インターフェース** | `ProjectCreator` |
| **パッケージ** | `src/infrastructure/ExcelBufferProjectCreator.ts` |
| **責務** | ArrayBuffer（メモリ上のExcelデータ）からProjectを生成する。ブラウザ環境等でのファイルアップロード対応 |

### 4.2 コンストラクタ

```typescript
constructor(
    private _buffer: ArrayBuffer,
    private _projectName: string
)
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|:----:|------|
| `_buffer` | `ArrayBuffer` | ○ | Excelファイルのバイナリデータ |
| `_projectName` | `string` | ○ | プロジェクト名（ファイル名から取得できないため明示的に指定） |

#### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-EBPC-01 | `_buffer`が有効なExcelファイルのバイナリデータ | パースエラー |
| PRE-EBPC-02 | バッファ内のExcelに「ガントチャート」シートが存在する | エラー |
| PRE-EBPC-03 | バッファ内のExcelに「休日テーブル」シートが存在する | エラー |

### 4.3 メソッド仕様

#### `createProject(): Promise<Project>`

##### 処理フロー（Algorithm）

```
1. excelBuffer2json()で「ガントチャート」シートを読み込み → mappings
2. excelBuffer2json()で「休日テーブル」シートを読み込み → holidayRawDatas
3. コンストラクタで受け取ったprojectNameを使用
4. MappingProjectCreator(mappings, projectName, holidayRawDatas).createProject()に委譲
5. Projectを返す
```

##### 外部依存（External Dependencies）

| 名前 | 種別 | 説明 |
|------|------|------|
| `excel-csv-read-write` | ライブラリ | ArrayBufferからのExcelパース |

##### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-EBPC-01 | プロジェクト名はコンストラクタで明示的に指定する必要がある | N/A |

---

## 5. MappingProjectCreator

### 5.1 基本情報

| 項目 | 内容 |
|------|------|
| **クラス名** | `MappingProjectCreator` |
| **分類** | **アダプター（Adapter）** - 内部実装クラス |
| **実装インターフェース** | `ProjectCreator` |
| **パッケージ** | `src/infrastructure/MappingProjectCreator.ts` |
| **責務** | Excelから読み取ったマッピングデータをProjectオブジェクトに変換する。実際の変換ロジックを担当 |

### 5.2 コンストラクタ

```typescript
constructor(
    private _mappings: unknown[],
    private _projectName: string,
    private _holidayRawDatas: unknown[]
)
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|:----:|------|
| `_mappings` | `unknown[]` | ○ | ガントチャートシートの行データ配列 |
| `_projectName` | `string` | ○ | プロジェクト名 |
| `_holidayRawDatas` | `unknown[]` | ○ | 休日テーブルシートの行データ配列 |

### 5.3 メソッド仕様

#### `createProject(): Promise<Project>`

##### 処理フロー（Algorithm）

```
1. mappingsの先頭行を取り出す（基準日が含まれる行）
2. 先頭行の26列目から基準日（Excelシリアル値）を取得
3. TaskRowCreatorImpl(mappings)でTaskRow[]を生成
4. TaskRow[]からstartDate/endDateの最小/最大値を計算 → プロジェクト期間
5. TaskService.buildTaskTree()でTaskRow[] → TaskNode[]に変換
6. holidayRawDatasからHolidayData[]を生成
7. Project(taskNodes, baseDate, holidayDatas, from, to, projectName)を生成して返す
```

##### 外部依存（External Dependencies）

| 名前 | 種別 | 説明 |
|------|------|------|
| `excel-csv-read-write` | ライブラリ | `dateFromSn()`でExcelシリアル値を日付に変換 |
| `TaskRowCreatorImpl` | 内部クラス | マッピングデータからTaskRow[]を生成 |
| `TaskService` | ドメインサービス | TaskRow[]からTaskNode[]ツリーを構築 |

##### ビジネスルール

| ID | ルール | 違反時の動作 |
|----|--------|-------------|
| BR-MPC-01 | 基準日はmappingsの先頭行、26列目（0-indexed）に存在する | 不正なbaseDate |
| BR-MPC-02 | プロジェクト開始日はリーフタスクのstartDateの最小値 | undefined（タスクがない場合） |
| BR-MPC-03 | プロジェクト終了日はリーフタスクのendDateの最大値 | undefined（タスクがない場合） |
| BR-MPC-04 | 祝日データは「日付」「祝日」「祝日定義ルール」「振替」列から生成される | N/A |

##### 同値クラス・境界値

| 分類 | 入力条件 | 期待結果 |
|------|----------|----------|
| **正常系** | 有効なマッピングデータ | Projectが返される |
| **正常系** | タスク行が複数ある | 階層構造のtaskNodesが生成される |
| **境界値** | タスク行が0件（ヘッダー行のみ） | taskNodes空、startDate/endDate=undefined |
| **境界値** | 休日データが0件 | holidayDatas空配列 |
| **異常系** | 基準日列が数値でない | 不正なbaseDate |

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 ExcelProjectCreator

```gherkin
Scenario: 有効なExcelファイルからProjectを生成できる
  Given 「ガントチャート」「休日テーブル」シートを含むExcelファイル "project.xlsm"
  And   ガントチャートに3件のタスクが存在
  And   休日テーブルに2件の祝日が存在
  When  ExcelProjectCreator("project.xlsm").createProject()を呼び出す
  Then  Projectが返される
  And   project.nameが "project" である
  And   project.taskNodesに3件のタスクが含まれる
  And   project.holidayDatasに2件の祝日が含まれる
```

```gherkin
Scenario: 存在しないファイルパスでエラーが発生する
  Given 存在しないファイルパス "not_exist.xlsm"
  When  ExcelProjectCreator("not_exist.xlsm").createProject()を呼び出す
  Then  ファイルI/Oエラーが発生する
```

```gherkin
Scenario: ガントチャートシートがないExcelでエラーが発生する
  Given 「休日テーブル」シートのみのExcelファイル
  When  ExcelProjectCreator(path).createProject()を呼び出す
  Then  シート未検出エラーが発生する
```

### 6.2 ExcelBufferProjectCreator

```gherkin
Scenario: ArrayBufferからProjectを生成できる
  Given 有効なExcelファイルのArrayBuffer
  And   プロジェクト名 "uploaded_project"
  When  ExcelBufferProjectCreator(buffer, "uploaded_project").createProject()を呼び出す
  Then  Projectが返される
  And   project.nameが "uploaded_project" である
```

### 6.3 MappingProjectCreator

```gherkin
Scenario: マッピングデータからProjectを生成できる
  Given 基準日行を含むマッピングデータ
  And   3件のタスク行
  And   2件の休日データ
  When  MappingProjectCreator(mappings, "test", holidays).createProject()を呼び出す
  Then  Projectが返される
  And   project.baseDateが設定されている
  And   project.startDateがリーフタスクの最小開始日
  And   project.endDateがリーフタスクの最大終了日
```

```gherkin
Scenario: タスクが0件でもProjectを生成できる
  Given 基準日行のみのマッピングデータ（タスク行なし）
  When  MappingProjectCreator(mappings, "empty", []).createProject()を呼び出す
  Then  Projectが返される
  And   project.taskNodesが空配列
  And   project.startDateがundefined
  And   project.endDateがundefined
```

---

## 7. 関連オブジェクト

### 7.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                    ExcelProjectCreator                      │
│                              │                              │
│                    ExcelBufferProjectCreator                │
│                              │                              │
│                              ▼                              │
│                    MappingProjectCreator                    │
│                              │                              │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│      TaskRowCreatorImpl  TaskService    HolidayData         │
│              │               │                              │
│              ▼               ▼                              │
│          TaskRow[]      TaskNode[]                          │
│                              │                              │
│                              ▼                              │
│                          Project                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 クラス関係

| 関係元 | 関係先 | 関係タイプ | 説明 |
|--------|--------|-----------|------|
| ExcelProjectCreator | ProjectCreator | implements | インターフェース実装 |
| ExcelProjectCreator | MappingProjectCreator | uses | 処理を委譲 |
| ExcelBufferProjectCreator | ProjectCreator | implements | インターフェース実装 |
| ExcelBufferProjectCreator | MappingProjectCreator | uses | 処理を委譲 |
| MappingProjectCreator | ProjectCreator | implements | インターフェース実装 |
| MappingProjectCreator | TaskRowCreatorImpl | uses | TaskRow[]生成を委譲 |
| MappingProjectCreator | TaskService | uses | ツリー構築を委譲 |
| MappingProjectCreator | Project | creates | Projectを生成 |

---

## 8. 設計上の課題・改善提案

| 課題 | 現状 | 改善案 |
|------|------|--------|
| 外部ライブラリ依存 | MappingProjectCreatorが`dateFromSn`に直接依存 | 日付変換をドメイン層のインターフェースで抽象化 |
| TaskService直接生成 | `new TaskService()` | コンストラクタDI |
| エラーハンドリング | 詳細なエラー型が未定義 | カスタムエラークラスの導入 |
| マジックナンバー | 基準日の列番号`26`がハードコード | 定数化または設定ファイル化 |

---

## 9. テストケース数サマリ

| カテゴリ | テストケース数（概算） |
|----------|----------------------|
| ExcelProjectCreator | 4件 |
| ExcelBufferProjectCreator | 3件 |
| MappingProjectCreator | 5件 |
| 統合テスト | 3件 |
| **合計** | **約15件** |
