# CSV インポート

CSVファイルからプロジェクトを読み込む方法を説明します。

## CSVファイルからプロジェクトを読み込む

### コード例

```typescript
import { CsvProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    // CSVファイル名のフォーマット: {プロジェクト名}_{yyyyMMdd}.csv
    const creator = new CsvProjectCreator('./sample_20250725.csv')
    const project = await creator.createProject()

    console.log('| 項目 | 値 |')
    console.log('|------|-----|')
    console.log(`| プロジェクト名 | ${project.name} |`)
    console.log(`| 基準日 | ${project.baseDate.toLocaleDateString('ja-JP')} |`)
    console.log(`| 開始日 | ${project.startDate?.toLocaleDateString('ja-JP')} |`)
    console.log(`| 終了日 | ${project.endDate?.toLocaleDateString('ja-JP')} |`)
}

main()
```

### 出力例

```
| 項目 | 値 |
|------|-----|
| プロジェクト名 | sample |
| 基準日 | 2025/7/25 |
| 開始日 | 2025/1/6 |
| 終了日 | 2025/1/29 |
```

---

## タスク一覧を取得する

Excelと同様に `toTaskRows()` でタスク一覧を取得できます。

### コード例

```typescript
import { CsvProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new CsvProjectCreator('./sample_20250725.csv')
    const project = await creator.createProject()

    const tasks = project.toTaskRows()

    console.log(`タスク数: ${tasks.length}件`)
    console.log('| id | name | assignee | workload | progressRate |')
    console.log('|----|------|----------|----------|--------------|')

    for (const task of tasks) {
        const progress = task.progressRate !== undefined
            ? `${(task.progressRate * 100).toFixed(0)}%`
            : '-'
        console.log(`| ${task.id} | ${task.name} | ${task.assignee ?? '-'} | ${task.workload ?? '-'} | ${progress} |`)
    }
}

main()
```

### 出力例

```
タスク数: 3件

| id | name | assignee | workload | progressRate |
|----|------|----------|----------|--------------|
| 1 | 設計 | 田中 | 5 | 100% |
| 2 | 実装 | 鈴木 | 10 | 50% |
| 3 | テスト | 佐藤 | 3 | 0% |
```

> CSVから読み込んだタスクは全て `isLeaf=true`（リーフタスク）です。

---

## プロジェクト統計を取得する

### コード例

```typescript
import { CsvProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new CsvProjectCreator('./sample_20250725.csv')
    const project = await creator.createProject()

    const stats = project.getStatistics()

    console.log('| 指標 | 値 |')
    console.log('|------|-----|')
    console.log(`| BAC | ${stats.totalWorkloadExcel}人日 |`)
    console.log(`| PV | ${stats.totalPvCalculated}人日 |`)
    console.log(`| EV | ${stats.totalEv}人日 |`)
    console.log(`| SPI | ${stats.spi?.toFixed(3)} |`)
}

main()
```

### 出力例

```
| 指標 | 値 |
|------|-----|
| BAC | 18人日 |
| PV | 18人日 |
| EV | 10人日 |
| SPI | 0.556 |
```

---

## 文字エンコーディングを指定する

日本語を含むCSVファイルでは、文字エンコーディングを指定できます。

### コード例

```typescript
import { CsvProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    // UTF-8明示指定
    const creatorUtf8 = new CsvProjectCreator('./sample_20250725.csv', {
        encoding: 'utf-8'
    })
    const projectUtf8 = await creatorUtf8.createProject()

    // Shift-JIS明示指定
    const creatorSjis = new CsvProjectCreator('./sample_sjis.csv', {
        encoding: 'shift-jis'
    })
    const projectSjis = await creatorSjis.createProject()

    // 自動判定（デフォルト）
    const creatorAuto = new CsvProjectCreator('./sample.csv', {
        encoding: 'auto'
    })
    const projectAuto = await creatorAuto.createProject()
}

main()
```

### エンコーディングオプション

| 値 | 説明 |
|----|------|
| `'utf-8'` | UTF-8 |
| `'shift-jis'` | Shift-JIS (CP932) |
| `'auto'` | 自動判定（デフォルト） |

---

## ファイル名の命名規則

CSVファイル名は以下のフォーマットに従う必要があります。

```
{プロジェクト名}_{yyyyMMdd}.csv
```

### 例

| ファイル名 | プロジェクト名 | 基準日 |
|-----------|--------------|--------|
| `MyProject_20250725.csv` | MyProject | 2025/7/25 |
| `開発プロジェクト_20251001.csv` | 開発プロジェクト | 2025/10/1 |
| `sample_20250725.csv` | sample | 2025/7/25 |

> **Note**: ファイル名がこの形式に従っていない場合、エラーが発生します。

---

## CSVのカラム形式

CSVファイルは以下のカラムで構成します。

| カラム名 | 必須 | 説明 |
|----------|:----:|------|
| タスクID | ✅ | タスクの一意識別子（数値） |
| 名称 | ✅ | タスク名 |
| 担当 | - | 担当者名 |
| 予定工数 | - | 予定工数（人日） |
| 予定開始日 | - | yyyy/MM/dd形式 |
| 予定終了日 | - | yyyy/MM/dd形式 |
| 実績開始日 | - | yyyy/MM/dd形式 |
| 実績終了日 | - | yyyy/MM/dd形式 |
| 進捗率 | - | 0〜1 または 0%〜100% |
| 稼働予定日数 | - | 期間内の稼働日数 |
| PV | - | Planned Value |
| EV | - | Earned Value |

### サンプルCSV

```csv
タスクID,名称,担当,予定工数,予定開始日,予定終了日,実績開始日,実績終了日,進捗率,稼働予定日数,PV,EV
1,設計,田中,5,2025/01/06,2025/01/10,2025/01/06,2025/01/10,1,5,5,5
2,実装,鈴木,10,2025/01/13,2025/01/24,2025/01/13,,0.5,10,10,5
3,テスト,佐藤,3,2025/01/27,2025/01/29,,,0,3,3,0
```

---

## CSVとExcelの違い

| 項目 | Excel | CSV |
|------|-------|-----|
| 階層構造 | ✅ サポート | ❌ フラット（全てリーフ） |
| 祝日データ | ✅ 読み込み | ❌ なし |
| PV自動計算 | ✅ plotMapから計算 | 直接指定が必要 |
| ファイルサイズ | 大きい | 小さい |
| 編集しやすさ | Excel必要 | テキストエディタで可 |

> CSVは簡易的なインポート用途に適しています。複雑なプロジェクト管理にはExcel形式を推奨します。

---

## 次のステップ

- [CLI コマンド](./07-cli-commands.md) - コマンドラインツールの使い方
- [基本的な使い方](./01-basic-usage.md) - Excelからの読み込み
- [プロジェクト統計](./02-project-statistics.md) - 統計の取得
