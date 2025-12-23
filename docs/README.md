# ドキュメント索引

evmtools-node の開発者向けドキュメント一覧です。

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
| [Project.spec.md](specs/domain/Project.spec.md) | Project クラス（マスター設計書） |
| [TaskRow.spec.md](specs/domain/TaskRow.spec.md) | TaskRow クラス |
| [TaskNode.spec.md](specs/domain/TaskNode.spec.md) | TaskNode クラス |
| [TaskService.spec.md](specs/domain/TaskService.spec.md) | TaskService |
| [ProjectService.spec.md](specs/domain/ProjectService.spec.md) | ProjectService |
| [CsvProjectCreator.spec.md](specs/domain/CsvProjectCreator.spec.md) | CsvProjectCreator |
| [VersionInfo.spec.md](specs/domain/VersionInfo.spec.md) | VersionInfo |

## 開発標準

| ドキュメント | 内容 |
|-------------|------|
| [CODING_STANDARDS.md](standards/CODING_STANDARDS.md) | コーディング標準 |
| [REVIEW_CHECKLIST.md](standards/REVIEW_CHECKLIST.md) | レビューチェックリスト |

## 事例・ガイド

| ドキュメント | 内容 |
|-------------|------|
| [TRACEABILITY_EXAMPLE.md](examples/TRACEABILITY_EXAMPLE.md) | トレーサビリティの実現例（REQ-TASK-001） |
| [brainstorm-spec-driven-development.md](brainstorm-spec-driven-development.md) | 仕様駆動開発のブレスト記録 |

## よくある質問

### Q: 要件から実装を探したい（Forward Traceability）
→ [TRACEABILITY_EXAMPLE.md セクション9](examples/TRACEABILITY_EXAMPLE.md#9-具体例受け入れ基準から実装テストへの追跡forward)

### Q: コードの存在理由を知りたい（Backward Traceability）
→ [TRACEABILITY_EXAMPLE.md セクション10](examples/TRACEABILITY_EXAMPLE.md#10-具体例1行のコードから要件を追跡するbackward)

### Q: 新機能を追加する手順は？
→ [DEVELOPMENT_WORKFLOW.md](workflow/DEVELOPMENT_WORKFLOW.md)
