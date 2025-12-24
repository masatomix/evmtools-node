# 要件定義書: CSVファイルからのプロジェクト読み込み

**要件ID**: REQ-CSV-001
**作成日**: 2025-12-16
**ステータス**: Draft
**優先度**: High

---

## 1. 概要

### 1.1 目的

現在Excelファイル（.xlsm）からのみプロジェクト情報を読み込めるが、CSVファイルからも読み込めるようにする。これにより、Excelを持たない環境や、他システムからのエクスポートデータを直接取り込めるようになる。

### 1.2 スコープ

| 項目 | Phase 1（今回） | Phase 2（将来） |
|------|:---------------:|:---------------:|
| ファイルパス指定読み込み | ✅ | - |
| Buffer/文字列からの読み込み | - | ✅ |
| Shift-JIS対応 | ✅ | - |
| UTF-8対応 | ✅ | - |
| 休日データ読み込み | - | ✅ |
| 親子階層（ネスト）対応 | - | ✅ |

---

## 2. 機能要件

### 2.1 入力仕様

#### 2.1.1 CSVファイル形式

| 列番号 | 列名 | 型 | 必須 | 説明 |
|:------:|------|-----|:----:|------|
| 1 | タスクID | number | ○ | タスクの一意識別子 |
| 2 | 名称 | string | ○ | タスク名 |
| 3 | 担当 | string | - | 担当者名 |
| 4 | 予定工数 | number | - | 予定工数（人日） |
| 5 | 予定開始日 | date | - | yyyy/MM/dd または yyyy-MM-dd |
| 6 | 予定終了日 | date | - | yyyy/MM/dd または yyyy-MM-dd |
| 7 | 実績開始日 | date | - | yyyy/MM/dd または yyyy-MM-dd |
| 8 | 実績終了日 | date | - | yyyy/MM/dd または yyyy-MM-dd |
| 9 | 進捗率 | number | - | 0〜1 または 0〜100（%） |
| 10 | 稼働予定日数 | number | - | 稼働予定日数 |
| 11 | PV | number | - | 計画価値 |
| 12 | EV | number | - | 出来高 |

#### 2.1.2 ファイル名規則

基準日はファイル名から取得する。

```
パターン: {プロジェクト名}_{基準日}.csv
例: MyProject_20251216.csv
    → プロジェクト名: MyProject
    → 基準日: 2025-12-16
```

#### 2.1.3 エンコーディング

- Shift-JIS（CP932）
- UTF-8（BOM有無両対応）

自動判定、または明示的に指定可能とする。

#### 2.1.4 CSVサンプル

```csv
タスクID,名称,担当,予定工数,予定開始日,予定終了日,実績開始日,実績終了日,進捗率,稼働予定日数,PV,EV
1,設計,田中,5,2025/01/06,2025/01/10,2025/01/06,2025/01/10,1,5,5,5
2,実装,鈴木,10,2025/01/13,2025/01/24,2025/01/13,,0.5,10,10,5
3,テスト,佐藤,3,2025/01/27,2025/01/29,,,0,3,3,0
```

### 2.2 出力仕様

既存の`Project`オブジェクトを生成する。

| 項目 | 値 |
|------|-----|
| `taskNodes` | CSVから読み込んだタスク（全てリーフ、階層なし） |
| `baseDate` | ファイル名から抽出 |
| `holidayDatas` | 空配列 `[]` |
| `startDate` | タスクの最小開始日 |
| `endDate` | タスクの最大終了日 |
| `name` | ファイル名から抽出 |

### 2.3 制約・前提条件

| ID | 制約 |
|----|------|
| C-01 | 1行目はヘッダー行として扱う |
| C-02 | 空行はスキップする |
| C-03 | タスクIDが空または数値でない行はスキップ（警告ログ出力） |
| C-04 | Phase 1では全タスクをリーフ（`isLeaf=true`）として扱う |
| C-05 | Phase 1では`parentId`は全て`undefined` |
| C-06 | Phase 1では`plotMap`は空Map |

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 1000行程度のCSVを1秒以内に読み込めること |
| NF-02 | 不正なデータ行があっても処理を継続し、警告ログを出力すること |
| NF-03 | 既存の`ProjectCreator`インターフェースを実装すること |

---

## 4. インターフェース設計（案）

### 4.1 クラス構成

```
ProjectCreator (interface)
├── ExcelProjectCreator      # 既存
├── ExcelBufferProjectCreator # 既存
├── MappingProjectCreator    # 既存（内部）
└── CsvProjectCreator        # 新規 ← Phase 1
    └── CsvBufferProjectCreator # 新規 ← Phase 2
```

### 4.2 コンストラクタ（案）

```typescript
// Phase 1
class CsvProjectCreator implements ProjectCreator {
    constructor(
        csvPath: string,
        options?: {
            encoding?: 'utf-8' | 'shift-jis'  // デフォルト: 自動判定
        }
    )

    createProject(): Promise<Project>
}
```

---

## 5. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | UTF-8のCSVファイルからProjectを生成できる | ✅ PASS | TC-CSV-001 |
| AC-02 | Shift-JISのCSVファイルからProjectを生成できる | ✅ PASS | TC-CSV-002 |
| AC-03 | ファイル名から基準日とプロジェクト名を抽出できる | ✅ PASS | TC-CSV-001 |
| AC-04 | 生成されたProjectで既存のEVM計算が正しく動作する | ✅ PASS | 統合テスト10件 |
| AC-05 | 不正な行があっても処理が継続する | ✅ PASS | TC-CSV-006 |

**確認日**: 2025-12-16
**テスト実行結果**: 32件全てPASS

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| 設計書 | [`CsvProjectCreator.spec.md`](../domain/master/CsvProjectCreator.spec.md) | 詳細仕様 |
| 設計書(YAML) | [`CsvProjectCreator.spec.yaml`](../domain/master/CsvProjectCreator.spec.yaml) | 機械可読形式 |
| 単体テスト | [`CsvProjectCreator.test.ts`](../../../src/infrastructure/__tests__/CsvProjectCreator.test.ts) | 22件 |
| 統合テスト | [`CsvProjectCreator.integration.test.ts`](../../../src/infrastructure/__tests__/CsvProjectCreator.integration.test.ts) | 10件 |
| 実装 | [`CsvProjectCreator.ts`](../../../src/infrastructure/CsvProjectCreator.ts) | 本体実装 |

---

## 7. 備考

### 7.1 Phase 1で実装済み（当初Phase 2予定だった機能）

- ~~plotMap生成（開始日〜終了日の稼働日を自動計算）~~ → AC-04対応のため実装済み

### 7.2 Phase 2での拡張予定

- `CsvBufferProjectCreator`: 文字列/Bufferからの読み込み
- 休日CSVの読み込み対応
- 親子階層（parentId）対応
