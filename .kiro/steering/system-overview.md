# システム全体像（既存機能マップ）

> **本ファイルの役割**: cc-sdd の feature spec（`.kiro/specs/`）は「変更の記録」であり、既存メイン機能は載らない。
> 既存システムの**現在形の恒久仕様は master 設計書**（[docs/specs/domain/master/INDEX.md](../../docs/specs/domain/master/INDEX.md)）が正。
> 本ファイルはその**入口となる地図**で、詳細は複製しない（ポインタモデル）。
> 更新規約: 公開機能の追加・廃止時に該当行を1行更新するのみ（master 同期ゲートの一部）。

## 機能カタログ（能力 → 入口 → 恒久仕様）

| 能力 | 入口（API / CLI） | 恒久仕様 |
|------|------------------|---------|
| **Excel 読み込み**（now.xlsm、本番主経路） | `ExcelProjectCreator` / `ExcelBufferProjectCreator` → `Project` | ProjectCreator.spec.md |
| **CSV 読み込み**（UTF-8/Shift-JIS） | `CsvProjectCreator` | CsvProjectCreator.spec.md |
| **プロジェクト統計**（BAC/PV/EV/SPI、フィルタ、担当者別） | `Project.getStatistics(options?)` / `getStatisticsByName` | Project.spec.md |
| **EV 算定方式**（0/100・50/50、主観バイアス対処） | `StatisticsOptions.evMethod`（0.0.33〜） | Project.spec.md 5.19 |
| **タスク操作**（ツリー、遅延抽出、期限判定、フィルタ） | `getTree` / `getDelayedTasks` / `filterTasks` / `TaskRow.*` | TaskRow.spec.md / TaskNode.spec.md |
| **スナップショット比較**（差分、追加/削除/変更） | `ProjectService.calculateTaskDiffs` / `calculateProjectDiffs` | ProjectService.spec.md |
| **期間SPI**（ΔEV/ΔPV、直近の実勢） | `ProjectService.calculateRecentSpi`（0.0.29 仕様準拠化） | ProjectService.spec.md |
| **完了予測**（日次消化、spiOverride、3点見積はレシピ） | `Project.calculateCompletionForecast(opts?)` | Project.spec.md |
| **Earned Schedule**（ES/SPI(t)/SV(t)/IEAC(t)、終盤SPI収束の解消） | `Project.calculateEarnedSchedule(options?)`（0.0.31〜） | Project.spec.md 5.18 |
| **日次PV 担当者別**（負荷・レベリングの単一ソース） | `Project.getDailyPvByAssignee(options?)`（0.0.30〜） | Project.spec.md 5.17 |
| **Excel 出力**（handlebars テンプレート） | `ProjectRepositoryImpl` | -（未文書化・テスト0%。品質 Backlog） |
| **CLI** | `pbevm-show-project` / `pbevm-diff` / `pbevm-show-pv` / `pbevm-tree` | docs/examples/06-cli-commands.md |
| 要員計画（**ベータ**） | `resource/` モジュール | -（API 未安定・カタログ対象外） |

## レイヤー構造（クリーンアーキテクチャ）

```
presentation(CLI, yargs) → usecase → domain(計算の単一ソース・外部依存なし) ← infrastructure(Excel/CSV I/O)
                                      └ common(日付・計算ユーティリティ)
```

依存は excel-csv-read-write（^0.2.7、自作。Excel/CSV パース）・xlsx-populate・handlebars・pino。

## 文書体系（どこを見るか）

| 知りたいこと | 場所 |
|-------------|------|
| **既存機能の現在形の仕様**（全クラス・公開APIカタログ） | [docs/specs/domain/master/INDEX.md](../../docs/specs/domain/master/INDEX.md) → `{Class}.spec.md` |
| 進行中・過去の**変更**の spec | `.kiro/specs/{feature}/`（本ダッシュボードの specs ビュー） |
| EVM 理論×API・判断レシピ・落とし穴（AI 向け入口） | [docs/EVM-PRIMER.md](../../docs/EVM-PRIMER.md) |
| 用語定義 | [docs/GLOSSARY.md](../../docs/GLOSSARY.md) |
| 実運用知見ⓐ〜ⓗ′ | [docs/EVM-KNOWLEDGE.md](../../docs/EVM-KNOWLEDGE.md) |
| 使い方の具体例（実測値つき） | docs/examples/ 01〜08 |
| 変更履歴の正本 | CHANGELOG.md |

## 品質防御の現状（粗い粒度で維持）

- domain: 90%+（中核クラス 100%）。CI = Node 20/22 × TZ Asia/Tokyo/UTC の二重実行
- Excel/CSV **読み込み**: 統合テストあり（実型フィクスチャ、end-to-end で統計/ES/evMethod まで）
- 残る穴: Excel **書き出し**（ProjectRepositoryImpl）と resource が 0%
