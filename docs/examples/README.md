# evmtools-node サンプル集

evmtools-node ライブラリの使い方をサンプルコードと出力例で解説します。

## クイックスタート

```typescript
import { ExcelProjectCreator } from 'evmtools-node/infrastructure'

async function main() {
    const creator = new ExcelProjectCreator('./now.xlsm')
    const project = await creator.createProject()

    console.log('プロジェクト:', project.name)
    console.log('SPI:', project.getStatistics().spi?.toFixed(3))
}

main()
```

## 目次

| # | タイトル | 内容 |
|---|---------|------|
| 01 | [基本的な使い方](./01-basic-usage.md) | Excel読込、タスク一覧、ツリー走査、EVM指標 |
| 02 | [プロジェクト統計](./02-project-statistics.md) | BAC/PV/EV/SPI、完了予測、フィルタ、担当者別統計 |
| 03 | [タスク操作](./03-task-operations.md) | 遅延タスク、担当者フィルタ、進捗率フィルタ、期限切れ判定 |
| 04 | [完了予測](./04-completion-forecast.md) | spiOverride、直近SPI、シナリオ分析、信頼度 |
| 05 | [スナップショット比較](./05-diff-snapshots.md) | calculateTaskDiffs、担当者別差分、進捗分析 |
| 06 | [CSV読み込み](./06-csv-import.md) | CsvProjectCreator、エンコーディング、カラム形式 |
| 07 | [CLIコマンド](./07-cli-commands.md) | pbevm-show-project、pbevm-diff、pbevm-show-pv |

## モジュール構成

```
evmtools-node
├── /domain          # ドメインモデル（Project, TaskRow, etc.）
├── /infrastructure  # Excel/CSV入出力
├── /usecase         # ユースケース
└── /common          # ユーティリティ
```

### インポート例

```typescript
// ドメインモデル
import { Project, TaskRow, TaskNode, ProjectService } from 'evmtools-node/domain'

// インフラ（Excel/CSV読み込み）
import { ExcelProjectCreator, CsvProjectCreator } from 'evmtools-node/infrastructure'

// ユーティリティ
import { generateBaseDates, formatRelativeDays } from 'evmtools-node/common'
```

## FAQ

### Q: Excel ファイルの形式は？

プライムブレインズ社の進捗管理ツール形式（.xlsm）に対応しています。

### Q: CSV も読めますか？

はい。`CsvProjectCreator` を使用します。UTF-8 と Shift-JIS に対応しています。

```typescript
import { CsvProjectCreator } from 'evmtools-node/infrastructure'

const creator = new CsvProjectCreator('./tasks_20250725.csv')
const project = await creator.createProject()
```

### Q: SPI が 1.0 より大きいとどういう意味？

予定より早く進んでいることを示します。

| SPI | 状態 |
|-----|------|
| > 1.0 | 予定より早い |
| = 1.0 | 予定通り |
| < 1.0 | 予定より遅い |

### Q: 完了予測の信頼度（confidence）とは？

予測の確からしさを示す指標です。

| confidence | 条件 |
|------------|------|
| high | spiOverride 指定時、または SPI ≥ 0.9 |
| medium | SPI が 0.5〜0.9 の範囲（やや遅れ気味） |
| low | SPI < 0.5（大幅に遅延） |

## 関連ドキュメント

- [用語集（GLOSSARY.md）](../GLOSSARY.md) - EVM 用語の定義
- [サンプル出力](../SAMPLE-PROJECT-OUTPUT.md) - EVM 指標の具体例
- [マスター設計書](../specs/domain/master/) - API 詳細仕様
