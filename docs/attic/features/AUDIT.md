# 旧・案件設計書の吸収監査記録（2026-07-03, sdd-consolidation）

`docs/specs/domain/features/` 配下 22 ファイルについて、マスター設計書への反映状況を突き合わせた記録。
全ファイルで未反映の仕様は検出されず、退避可能と判断した。

| ファイル | 対象 | 反映先・根拠 | 判定 |
|---------|------|-------------|------|
| Project.delayedTasks.spec.md (+tasks) | Project.getDelayedTasks | Project.spec.md v1.2.0（REQ-DELAY-001） | 反映済み |
| Project.completionForecast.spec.md (+tasks) | 完了予測一式 | Project.spec.md v1.3.0（REQ-EVM-001） | 反映済み |
| Project.filterStatistics.spec.md (+tasks) | filterTasks/getStatistics 系 | Project.spec.md v1.4.0（REQ-FILTER-STATS-001） | 反映済み |
| Project.remove-dup-accessors.spec.md (+tasks) | 重複アクセサ削除 | Project.spec.md v1.5.0（REQ-REFACTOR-001、トレーサビリティ表あり） | 反映済み |
| Project.completion-forecast-refactor.spec.md (+tasks) | 予測オーバーロード統一 | Project.spec.md v1.6.0（REQ-REFACTOR-002） | 反映済み |
| Project.spiOverride.spec.md (+tasks) | spiOverride | Project.spec.md v1.7.0（REQ-SPI-002） | 反映済み |
| Project.excludedTasks.spec.md | excludedTasks | Project.spec.md（excludedTasks 節） | 反映済み |
| TaskRow.pv-today.spec.md (+tasks) | remainingDays/pvTodayActual | TaskRow.spec.md v1.1.0-1.1.1（REQ-PV-TODAY-001） | 反映済み |
| ProjectService.recent-spi.spec.md (+tasks) | 期間SPI | ProjectService.spec.md v2.0.0（#170。本 PR で同期） | 反映済み |
| CLI.tree.spec.md (+tasks) | pbevm-tree CLI | master 対象外（presentation層）。docs/examples/06-cli-commands.md + INDEX.md が現行仕様 | 対象外 |
| CLI.shebang.spec.md | CLI shebang | 同上（テスト cli-shebang.test.ts が実質仕様） | 対象外 |
| CLI.pbevm-diff-output.spec.md | diff 出力形式 | 同上（docs/examples/05 + EVM-MANAGEMENT-GUIDE 2章） | 対象外 |
| PbevmShowPvUsecase.cli-output-cleanup.spec.md | show-pv 出力整理 | 同上（docs/examples/06） | 対象外 |

- 「+tasks」は同名の `.tasks.md`（開発タスク履歴）。監査対象外としてそのまま退避
- 以後、案件単位の設計書は作成しない。要件は `.kiro/specs/{feature}/`、恒久仕様は `docs/specs/domain/master/` に置く（`.kiro/steering/master-spec-sync.md` v2）
