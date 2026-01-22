# ドキュメント索引

evmtools-node の開発者向けドキュメント一覧です。

## リファレンス

| ドキュメント | 内容 |
|-------------|------|
| [GLOSSARY.md](GLOSSARY.md) | コア用語集（Project, TaskRow, EVM指標など） |

## 開発ワークフロー

| ドキュメント | 内容 |
|-------------|------|
| [DEVELOPMENT_WORKFLOW.md](workflow/DEVELOPMENT_WORKFLOW.md) | 開発フロー（Git Flow + 仕様駆動開発） |
| [SAMPLE_DEVELOPMENT_FLOW.md](workflow/SAMPLE_DEVELOPMENT_FLOW.md) | 実際の開発例 |

## 仕様書

### 要件定義書

| ドキュメント | 内容 |
|-------------|------|
| [REQ-TASK-001.md](specs/requirements/REQ-TASK-001.md) | 計算除外レコードの可視化 |
| [REQ-CSV-001.md](specs/requirements/REQ-CSV-001.md) | CSV入力対応 |
| [REQ-VERSION-001.md](specs/requirements/REQ-VERSION-001.md) | バージョン情報管理 |

### 設計書（ドメイン層）

| ドキュメント | 内容 |
|-------------|------|
| [Project.spec.md](specs/domain/master/Project.spec.md) | Project クラス（マスター設計書） |
| [TaskRow.spec.md](specs/domain/master/TaskRow.spec.md) | TaskRow クラス |
| [TaskNode.spec.md](specs/domain/master/TaskNode.spec.md) | TaskNode クラス |
| [TaskService.spec.md](specs/domain/master/TaskService.spec.md) | TaskService |
| [ProjectService.spec.md](specs/domain/master/ProjectService.spec.md) | ProjectService |
| [CsvProjectCreator.spec.md](specs/domain/master/CsvProjectCreator.spec.md) | CsvProjectCreator |
| [VersionInfo.spec.md](specs/domain/master/VersionInfo.spec.md) | VersionInfo |

## 開発標準

| ドキュメント | 内容 |
|-------------|------|
| [CODING_STANDARDS.md](standards/CODING_STANDARDS.md) | コーディング標準 |
| [REVIEW_CHECKLIST.md](standards/REVIEW_CHECKLIST.md) | レビューチェックリスト |

## 事例・ガイド

| ドキュメント | 内容 |
|-------------|------|
| [SAMPLE_DEVELOPMENT_FLOW.md](workflow/SAMPLE_DEVELOPMENT_FLOW.md) | 開発フロー記録サンプル（REQ-TASK-001）、トレーサビリティ具体例 |
| [brainstorm-spec-driven-development.md](brainstorm-spec-driven-development.md) | 仕様駆動開発のブレスト記録 |

## よくある質問

### Q: 要件から実装を探したい（Forward Traceability）
→ [SAMPLE_DEVELOPMENT_FLOW.md 具体例1](workflow/SAMPLE_DEVELOPMENT_FLOW.md#具体例1-forward要件から実装テストを追跡)

### Q: コードの存在理由を知りたい（Backward Traceability）
→ [SAMPLE_DEVELOPMENT_FLOW.md 具体例2](workflow/SAMPLE_DEVELOPMENT_FLOW.md#具体例2-backward1行のコードから要件を追跡)

### Q: 新機能を追加する手順は？
→ [DEVELOPMENT_WORKFLOW.md](workflow/DEVELOPMENT_WORKFLOW.md)
