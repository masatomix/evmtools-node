<h1 align="center">Welcome to evmtools-node</h1>
<p>
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
  <a href="https://twitter.com/masatomix" target="_blank">
    <img alt="Twitter: masatomix" src="https://img.shields.io/twitter/follow/masatomix.svg?style=social" />
  </a>
</p>

## evmtools-node

このライブラリは、プライムブレインズ社で利用している「進捗管理ツール(Excel)」ファイルを読み込み、 プロジェクトの進捗状況や要員別の作業量を可視化するためのライブラリです。

### [サンプルサイト](https://masatomix.github.io/copy-utils-generator-webui/#/gamen3)


WEBアプリ等で先のExcelファイルを読み書きできるように開発していますが、下記の通りコマンドラインから呼び出せるようにもしてあります。


## インストール

```bash
npm install evmtools-node
```

インストール後、以下のコマンドが使用可能になります。

> **注記**: `npm install evmtools-node` せずに直接実行する場合は、`npx -p evmtools-node <command>` の形式で実行できます。
> 例: `npx -p evmtools-node pbevm-show-project --path ./now.xlsm`

## サンプル集

ライブラリの使い方は [サンプル集](docs/examples/README.md) を参照してください。

- [基本的な使い方](docs/examples/01-basic-usage.md) - Excel読込、タスク一覧、EVM指標
- [プロジェクト統計](docs/examples/02-project-statistics.md) - BAC/PV/EV/SPI、担当者別統計
- [完了予測](docs/examples/04-completion-forecast.md) - spiOverride、シナリオ分析

## コマンド


### プロジェクトの情報を表示・Excel出力する

```console
$ npx pbevm-show-project  --help
Usage: npx pbevm-show-project [options]

Options:
  --version  Show version number                                       [boolean]
  --path     Excel file Path                    [string] [default: "./now.xlsm"]
  --help     Show help                                                 [boolean]

Examples:
  npx pbevm-show-project --path ./now.xlsm
```

例:

```console
$ npx pbevm-show-project --path ./now.xlsm 
プロジェクト名: now
開始日: 2025/07/01
終了日: 2025/08/26
基準日: 2025/07/25
タスク数:19件
先頭19行データ:
┌─────────┬───────┬────┬───────┬──────────────┬───────────┬──────────┬──────────────┬───────────────────┬─────┬─────┬─────┬───────────┬───────────┬───────────┬────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ (index) │ sharp │ id │ level │     name     │ assignee  │ workload │ progressRate │ scheduledWorkDays │ pv  │ ev  │ spi │ delayDays │  remarks  │ parentId  │ isLeaf │  予定開始日  │  予定終了日  │  実績開始日  │  実績終了日  │  進捗応当日  │
├─────────┼───────┼────┼───────┼──────────────┼───────────┼──────────┼──────────────┼───────────────────┼─────┼─────┼─────┼───────────┼───────────┼───────────┼────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│    0    │   1   │ 1  │   1   │  '要件定義'  │ undefined │    4     │      1       │         4         │  4  │  4  │  1  │ undefined │ undefined │ undefined │ false  │ '2025/07/01' │ '2025/07/04' │ '2025/07/01' │ '2025/07/04' │      ''      │
│    1    │   2   │ 2  │   2   │  '機能全体'  │  '要員A'  │    4     │      1       │         4         │  4  │  4  │  1  │ undefined │ undefined │     1     │  true  │ '2025/07/01' │ '2025/07/04' │ '2025/07/01' │ '2025/07/04' │      ''      │
│    2    │   3   │ 3  │   1   │    '設計'    │ undefined │    15    │      1       │        12         │ 15  │ 15  │  1  │ undefined │ undefined │ undefined │ false  │ '2025/07/07' │ '2025/07/18' │ '2025/07/04' │ '2025/07/16' │      ''      │
│    3    │   4   │ 4  │   2   │   '機能1'    │  '要員A'  │    3     │      1       │         5         │  3  │  3  │  1  │ undefined │ undefined │     3     │  true  │ '2025/07/07' │ '2025/07/11' │ '2025/07/07' │ '2025/07/11' │      ''      │
│    4    │   5   │ 5  │   2   │   '機能2'    │  '要員A'  │    2     │      1       │         5         │  2  │  2  │  1  │ undefined │ undefined │     3     │  true  │ '2025/07/07' │ '2025/07/11' │ '2025/07/04' │ '2025/07/10' │      ''      │
│    5    │   6   │ 6  │   2   │   '機能3'    │  '要員B'  │    5     │      1       │         5         │  5  │  5  │  1  │ undefined │ undefined │     3     │  true  │ '2025/07/14' │ '2025/07/18' │ '2025/07/04' │ '2025/07/10' │      ''      │
│    6    │   7   │ 7  │   2   │   '機能4'    │  '要員A'  │    5     │      1       │         5         │  5  │  5  │  1  │ undefined │ undefined │     3     │  true  │ '2025/07/14' │ '2025/07/18' │ '2025/07/14' │ '2025/07/16' │      ''      │
│    7    │   8   │ 8  │   1   │    '開発'    │ undefined │    30    │     0.25     │        12         │ 15  │ 7.5 │ 0.5 │    -2     │ undefined │ undefined │ false  │ '2025/07/21' │ '2025/08/01' │ '2025/07/21' │      ''      │ '2025/07/27' │
│    8    │   9   │ 9  │   2   │   '機能1'    │  '要員A'  │    10    │     0.1      │        10         │  5  │  1  │ 0.2 │     3     │ undefined │     8     │  true  │ '2025/07/21' │ '2025/08/01' │ '2025/07/21' │      ''      │ '2025/07/22' │
│    9    │  10   │ 10 │   2   │   '機能2'    │  '要員B'  │    5     │     0.2      │        10         │ 2.5 │  1  │ 0.4 │     2     │ undefined │     8     │  true  │ '2025/07/21' │ '2025/08/01' │ '2025/07/21' │      ''      │ '2025/07/23' │
│   10    │  11   │ 11 │   2   │   '機能3'    │  '要員B'  │    5     │     0.3      │        10         │ 2.5 │ 1.5 │ 0.6 │     1     │ undefined │     8     │  true  │ '2025/07/21' │ '2025/08/01' │ '2025/07/21' │      ''      │ '2025/07/24' │
│   11    │  12   │ 12 │   2   │   '機能4'    │  '要員C'  │    10    │     0.4      │        10         │  5  │  4  │ 0.8 │     0     │ undefined │     8     │  true  │ '2025/07/21' │ '2025/08/01' │ '2025/07/21' │      ''      │ '2025/07/25' │
│   12    │  13   │ 13 │   1   │   'テスト'   │ undefined │    15    │      0       │        19         │  0  │  0  │  0  │ undefined │ undefined │ undefined │ false  │ '2025/08/04' │ '2025/08/22' │      ''      │      ''      │      ''      │
│   13    │  14   │ 14 │   2   │ '単体テスト' │  '要員A'  │    5     │  undefined   │         5         │  0  │  0  │  0  │ undefined │ undefined │    13     │  true  │ '2025/08/04' │ '2025/08/08' │      ''      │      ''      │      ''      │
│   14    │  15   │ 15 │   2   │ '連結テスト' │  '要員A'  │    5     │  undefined   │         5         │  0  │  0  │  0  │ undefined │ undefined │    13     │  true  │ '2025/08/11' │ '2025/08/15' │      ''      │      ''      │      ''      │
│   15    │  16   │ 16 │   2   │ '総合テスト' │  '要員A'  │    5     │  undefined   │         5         │  0  │  0  │  0  │ undefined │ undefined │    13     │  true  │ '2025/08/18' │ '2025/08/22' │      ''      │      ''      │      ''      │
│   16    │  17   │ 17 │   1   │  'リリース'  │ undefined │    2     │      0       │         2         │  0  │  0  │  0  │ undefined │ undefined │ undefined │ false  │ '2025/08/25' │ '2025/08/26' │      ''      │      ''      │      ''      │
│   17    │  18   │ 18 │   2   │    '準備'    │  '要員C'  │    1     │  undefined   │         1         │  0  │  0  │  0  │ undefined │ undefined │    17     │  true  │ '2025/08/25' │ '2025/08/25' │      ''      │      ''      │      ''      │
│   18    │  19   │ 19 │   2   │    '作業'    │  '要員C'  │    1     │  undefined   │         1         │  0  │  0  │  0  │ undefined │ undefined │    17     │  true  │ '2025/08/26' │ '2025/08/26' │      ''      │      ''      │      ''      │
└─────────┴───────┴────┴───────┴──────────────┴───────────┴──────────┴──────────────┴───────────────────┴─────┴─────┴─────┴───────────┴───────────┴───────────┴────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
プロジェクト情報
┌─────────┬─────────────┬──────────────┬──────────────┬─────────────────┬────────────────────┬─────────────────────────┬─────────────────┬──────────────┬──────────────┬───────────────────┬─────────┬────────────────────┐
│ (index) │ projectName │  startDate   │   endDate    │ totalTasksCount │ totalWorkloadExcel │ totalWorkloadCalculated │ averageWorkload │   baseDate   │ totalPvExcel │ totalPvCalculated │ totalEv │        spi         │
├─────────┼─────────────┼──────────────┼──────────────┼─────────────────┼────────────────────┼─────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────────────┼─────────┼────────────────────┤
│    0    │    'now'    │ '2025/07/01' │ '2025/08/26' │       14        │         66         │           66            │      4.714      │ '2025/07/25' │      34      │        34         │  26.5   │ 0.7794117647058824 │
└─────────┴─────────────┴──────────────┴──────────────┴─────────────────┴────────────────────┴─────────────────────────┴─────────────────┴──────────────┴──────────────┴───────────────────┴─────────┴────────────────────┘
要員ごと統計
┌─────────┬──────────┬─────────────────┬────────────────────┬─────────────────────────┬─────────────────┬──────────────┬──────────────┬───────────────────┬─────────┬────────────────────┐
│ (index) │ assignee │ totalTasksCount │ totalWorkloadExcel │ totalWorkloadCalculated │ averageWorkload │   baseDate   │ totalPvExcel │ totalPvCalculated │ totalEv │        spi         │
├─────────┼──────────┼─────────────────┼────────────────────┼─────────────────────────┼─────────────────┼──────────────┼──────────────┼───────────────────┼─────────┼────────────────────┤
│    0    │ '要員A'  │        8        │         39         │           39            │      4.875      │ '2025/07/25' │      19      │        19         │   15    │ 0.7894736842105263 │
│    1    │ '要員B'  │        3        │         15         │           15            │        5        │ '2025/07/25' │      10      │        10         │   7.5   │        0.75        │
│    2    │ '要員C'  │        3        │         12         │           12            │        4        │ '2025/07/25' │      5       │         5         │    4    │        0.8         │
└─────────┴──────────┴─────────────────┴────────────────────┴─────────────────────────┴─────────────────┴──────────────┴──────────────┴───────────────────┴─────────┴────────────────────┘


$ ls -lrt
-rw-r--r-- 1 sysmgr sysmgr 468256 Jul  9 15:24 now.xlsm
-rw-r--r-- 1 sysmgr sysmgr  50950 Jul 11 16:00 now-summary.xlsx <-上記情報
$ 
```

### 指定した期間における、指定した担当者のタスクを表示する


```console
$ npx pbevm-show-pv --help
Usage: npx pbevm-show-pv [options]

Options:
  --version   Show version number                                      [boolean]
  --path      Excel file Path                   [string] [default: "./now.xlsm"]
  --fromDate  From Date                         [string] [default: "2025-07-01"]
  --toDate    To Date                                                   [string]
  --assignee  Assignee                                                  [string]
  --help      Show help                                                [boolean]

Examples:
  npx pbevm-show-pv --path now.xlsm --fromDate 2025-07-07 --toDate 2025-07-11
  --assignee '要員A'
```


例:

```
$ npx pbevm-show-pv --path now.xlsm \
 --fromDate 2025-07-07 \
 --toDate 2025-07-11 \
 --assignee '要員A'
(toDate未指定時はfromDateの日のみ、assignee未指定時は全員)
┌─────────┬───────┬────┬───────┬─────────┬──────────┬──────────┬──────────────┬───────────────────┬────┬────┬─────┬───────────┬───────────┬──────────┬────────┬──────────────┬──────────────┬──────────────┬──────────────┬────────────┐
│ (index) │ sharp │ id │ level │  name   │ assignee │ workload │ progressRate │ scheduledWorkDays │ pv │ ev │ spi │ delayDays │  remarks  │ parentId │ isLeaf │  予定開始日  │  予定終了日  │  実績開始日  │  実績終了日  │ 進捗応当日 │
├─────────┼───────┼────┼───────┼─────────┼──────────┼──────────┼──────────────┼───────────────────┼────┼────┼─────┼───────────┼───────────┼──────────┼────────┼──────────────┼──────────────┼──────────────┼──────────────┼────────────┤
│    0    │   4   │ 4  │   2   │ '機能1' │ '要員A'  │    3     │      1       │         5         │ 3  │ 3  │  1  │ undefined │ undefined │    3     │  true  │ '2025/07/07' │ '2025/07/11' │ '2025/07/07' │ '2025/07/11' │     ''     │
│    1    │   5   │ 5  │   2   │ '機能2' │ '要員A'  │    2     │      1       │         5         │ 2  │ 2  │  1  │ undefined │ undefined │    3     │  true  │ '2025/07/07' │ '2025/07/11' │ '2025/07/04' │ '2025/07/10' │     ''     │
└─────────┴───────┴────┴───────┴─────────┴──────────┴──────────┴──────────────┴───────────────────┴────┴────┴─────┴───────────┴───────────┴──────────┴────────┴──────────────┴──────────────┴──────────────┴──────────────┴────────────┘

$ ls -lrt
-rw-r--r-- 1 sysmgr sysmgr 468256 Jul  9 15:24 now.xlsm
-rw-r--r-- 1 sysmgr sysmgr   7183 Jul 11 16:07 now-pv.xlsx
$ 
```

### プロジェクトのツリー構造を表示する

```console
$ npx pbevm-tree --help
Usage: npx pbevm-tree [options]

Options:
  --version  Show version number                                       [boolean]
  --path     Excel file Path                    [string] [default: "./now.xlsm"]
  --depth    出力する階層の深さ（1=直下のみ）                            [number]
  --json     JSON形式で出力                           [boolean] [default: false]
  --help     Show help                                                 [boolean]

Examples:
  npx pbevm-tree --path ./now.xlsm  ツリー構造を表示
  npx pbevm-tree --depth 1          1階層のみ表示
  npx pbevm-tree --json             JSON形式で出力
```

例:

```console
$ npx pbevm-tree --path ./now.xlsm
要件定義
└── 機能全体

設計
├── 機能1
├── 機能2
├── 機能3
└── 機能4

開発
├── 機能1
├── 機能2
├── 機能3
└── 機能4

テスト
├── 単体テスト
├── 連結テスト
└── 総合テスト

リリース
├── 準備
└── 作業
```

```console
$ npx pbevm-tree --path ./now.xlsm --depth 0
要件定義

設計

開発

テスト

リリース
```

### 指定したファイル間のDIFFをとる


```
$ npx pbevm-diff  --help
Usage: npx pbevm-diff [options]

Options:
  --version   Show version number                                      [boolean]
  --path      Excel file Path                   [string] [default: "./now.xlsm"]
  --prevPath  Excel file Path                  [string] [default: "./prev.xlsm"]
  --help      Show help                                                [boolean]

Examples:
  npx pbevm-diff --path now.xlsm --prevPath prev.xlsm
```


例:

```
$ npx pbevm-diff \
  --path now.xlsm \
  --prevPath prev.xlsm 
プロジェクトDiff
┌─────────┬─────────┬─────────┬────────┬────────┬───────────┬───────────┬───────────────┬────────────┬──────────────┬─────────┬──────────┐
│ (index) │ deltaPV │ deltaEV │ prevPV │ prevEV │ currentPV │ currentEV │ modifiedCount │ addedCount │ removedCount │ hasDiff │ finished │
├─────────┼─────────┼─────────┼────────┼────────┼───────────┼───────────┼───────────────┼────────────┼──────────────┼─────────┼──────────┤
│    0    │   30    │  19.6   │   0    │  2.9   │    30     │   22.5    │       8       │     0      │      0       │  true   │  false   │
└─────────┴─────────┴─────────┴────────┴────────┴───────────┴───────────┴───────────────┴────────────┴──────────────┴─────────┴──────────┘
担当Diff
┌─────────┬──────────┬─────────┬─────────┬────────┬────────┬───────────┬───────────┬───────────────┬────────────┬──────────────┬─────────┬──────────┐
│ (index) │ assignee │ deltaPV │ deltaEV │ prevPV │ prevEV │ currentPV │ currentEV │ modifiedCount │ addedCount │ removedCount │ hasDiff │ finished │
├─────────┼──────────┼─────────┼─────────┼────────┼────────┼───────────┼───────────┼───────────────┼────────────┼──────────────┼─────────┼──────────┤
│    0    │ '要員A'  │   15    │  10.6   │   0    │  0.4   │    15     │    11     │       4       │     0      │      0       │  true   │  false   │
│    1    │ '要員B'  │   10    │    5    │   0    │  2.5   │    10     │    7.5    │       3       │     0      │      0       │  true   │  false   │
│    2    │ '要員C'  │    5    │    4    │   0    │   0    │     5     │     4     │       1       │     0      │      0       │  true   │  false   │
└─────────┴──────────┴─────────┴─────────┴────────┴────────┴───────────┴───────────┴───────────────┴────────────┴──────────────┴─────────┴──────────┘
タスクDiff
┌─────────┬────┬─────────┬──────────────┬──────────┬──────────┬───────────────────┬─────────┬─────────┬────────┬────────┬───────────┬───────────┬──────────────────┬─────────────────────┬─────────┬─────────────────────┬───────────┬───────────┬────────────┬──────────┬─────────────┬──────────┬──────────────────────────┬──────────────────────────┬──────────────────────────┬───────────────┬──────────────────┐
│ (index) │ id │  name   │   fullName   │ assignee │ parentId │ deltaProgressRate │ deltaPV │ deltaEV │ prevPV │ prevEV │ currentPV │ currentEV │ prevProgressRate │ currentProgressRate │ hasDiff │ hasProgressRateDiff │ hasPvDiff │ hasEvDiff │  diffType  │ finished │ isOverdueAt │ workload │       prevBaseDate       │     currentBaseDate      │         baseDate         │ daysOverdueAt │ daysStrOverdueAt │
├─────────┼────┼─────────┼──────────────┼──────────┼──────────┼───────────────────┼─────────┼─────────┼────────┼────────┼───────────┼───────────┼──────────────────┼─────────────────────┼─────────┼─────────────────────┼───────────┼───────────┼────────────┼──────────┼─────────────┼──────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┼───────────────┼──────────────────┤
│    0    │ 4  │ '機能1' │ '設計/機能1' │ '要員A'  │    3     │         1         │    3    │    3    │   0    │   0    │     3     │     3     │    undefined     │          1          │  true   │        true         │   true    │   true    │ 'modified' │   true   │    false    │    3     │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │      -14      │    '14 日前'     │
│    1    │ 5  │ '機能2' │ '設計/機能2' │ '要員A'  │    3     │        0.8        │    2    │   1.6   │   0    │  0.4   │     2     │     2     │       0.2        │          1          │  true   │        true         │   true    │   true    │ 'modified' │   true   │    false    │    2     │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │      -14      │    '14 日前'     │
│    2    │ 6  │ '機能3' │ '設計/機能3' │ '要員B'  │    3     │        0.5        │    5    │   2.5   │   0    │  2.5   │     5     │     5     │       0.5        │          1          │  true   │        true         │   true    │   true    │ 'modified' │   true   │    false    │    5     │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │      -7       │     '7 日前'     │
│    3    │ 7  │ '機能4' │ '設計/機能4' │ '要員A'  │    3     │         1         │    5    │    5    │   0    │   0    │     5     │     5     │    undefined     │          1          │  true   │        true         │   true    │   true    │ 'modified' │   true   │    false    │    5     │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │      -7       │     '7 日前'     │
│    4    │ 9  │ '機能1' │ '開発/機能1' │ '要員A'  │    8     │        0.1        │    5    │    1    │   0    │   0    │     5     │     1     │    undefined     │         0.1         │  true   │        true         │   true    │   true    │ 'modified' │  false   │    false    │    10    │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │       7       │     '7 日後'     │
│    5    │ 10 │ '機能2' │ '開発/機能2' │ '要員B'  │    8     │        0.2        │   2.5   │    1    │   0    │   0    │    2.5    │     1     │    undefined     │         0.2         │  true   │        true         │   true    │   true    │ 'modified' │  false   │    false    │    5     │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │       7       │     '7 日後'     │
│    6    │ 11 │ '機能3' │ '開発/機能3' │ '要員B'  │    8     │        0.3        │   2.5   │   1.5   │   0    │   0    │    2.5    │    1.5    │    undefined     │         0.3         │  true   │        true         │   true    │   true    │ 'modified' │  false   │    false    │    5     │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │       7       │     '7 日後'     │
│    7    │ 12 │ '機能4' │ '開発/機能4' │ '要員C'  │    8     │        0.4        │    5    │    4    │   0    │   0    │     5     │     4     │    undefined     │         0.4         │  true   │        true         │   true    │   true    │ 'modified' │  false   │    false    │    10    │ 2025-07-03T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │ 2025-07-24T15:00:00.000Z │       7       │     '7 日後'     │
└─────────┴────┴─────────┴──────────────┴──────────┴──────────┴───────────────────┴─────────┴─────────┴────────┴────────┴───────────┴───────────┴──────────────────┴─────────────────────┴─────────┴─────────────────────┴───────────┴───────────┴────────────┴──────────┴─────────────┴──────────┴──────────────────────────┴──────────────────────────┴──────────────────────────┴───────────────┴──────────────────┘

$ ls -lrt 
-rw-r--r-- 1 sysmgr sysmgr 463539 Jul  9 15:24 prev.xlsm
-rw-r--r-- 1 sysmgr sysmgr 468256 Jul  9 15:24 now.xlsm
-rw-r--r-- 1 sysmgr sysmgr  15937 Jul 11 16:14 now-diff.xlsx
```





## Author

👤 **Masatomi KINO**

<!-- * Twitter: [@masatomix](https://twitter.com/masatomix) -->
* Github: [@masatomix](https://github.com/masatomix)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/masatomix/evmtools-node/issues). 

## Show your support

Give a ⭐️ if this project helped you!


## 開発者向け

### ドキュメント

詳細なドキュメントは [docs/README.md](docs/README.md) を参照してください。

- [コア用語集](docs/GLOSSARY.md) - Project, TaskRow, EVM指標などの用語定義
- [EVM 知識ベース](docs/EVM-KNOWLEDGE.md) - EVM指標の落とし穴と読み方（実運用知見ⓐ〜ⓗ）
- 開発ワークフロー
- 仕様書（要件定義・設計書）
- コーディング標準
- トレーサビリティの事例

### テスト実行

```bash
npm test              # 全テストを実行
npm test -- --watch   # ウォッチモードで実行
npm run test:coverage # カバレッジレポート付きで実行
```

### ビルド

```bash
npm run build         # クリーン、TypeScriptコンパイル、.hbsテンプレートのコピー
npm run lint          # ESLintチェック
npm run format        # Prettierチェック
```

詳細な開発フローは [CC-SDD_WORKFLOW.md](docs/workflow/CC-SDD_WORKFLOW.md) を参照してください。

## 改訂履歴

変更履歴は [CHANGELOG.md](CHANGELOG.md) を正本として管理しています（[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) 準拠）。各バージョンの追加・変更・修正の詳細はそちらを参照してください。


## 🔧 Logger 設定のカスタマイズ

このライブラリは `pino` を使ってログを出力しています。
ログ出力レベルやフォーマットを変更したい場合は、``config/default.json`` を作成して設定を記述してください。


```json
{
  "evmtools-node-logger": {
    "level": "warn",
    "moduleLogLevels": {
      "main": "info"
    },
    "transport": { 
      "target": "pino-pretty", 
      "options": {
        "translateTime": "SYS:standard",
        "ignore": "id,hostname",
        "levelFirst": true
      }
    }
  }
}
```


```
"level": "warn",  // 全体のログレベルを指定
"moduleLogLevels": // ソースごとにlevelを変えたい場合、この中に記述
"transport":  // pino のtransport設定などを記述
"target": "pino-pretty", // この場合は npm install --save-dev pino-pretty すること
```



***
_This README was generated by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_