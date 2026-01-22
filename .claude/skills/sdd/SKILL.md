---
name: sdd
description: |
  本プロジェクトの仕様駆動開発（Spec-Driven Development）ワークフローを実行する。
  GitHub Issue を起点に、要件定義 → 詳細仕様 → タスク分解 → テスト → 実装の順序で開発を進める。
  以下の場合に使用:
  (1) 新機能開発の開始時（/sdd init, /sdd requirements）
  (2) 仕様書・設計書の作成時（/sdd design, /sdd tasks）
  (3) 仕様に基づく実装時（/sdd impl）
  (4) 実装と仕様の整合性確認時（/sdd verify）
  (5) 進捗状況の確認時（/sdd status）
  (6) 既存コードの文書化時（/sdd backward）
---

# SDD - 仕様駆動開発スキル

本プロジェクトの仕様駆動開発ワークフローを実行するスキル。

## ワークフロー決定ツリー

```
ユーザーの要求
    │
    ├── 新規機能開発 ──────────────▶ Forward フロー
    │   └── /sdd init → /sdd requirements → /sdd design → /sdd tasks → /sdd impl
    │
    ├── 既存コード文書化 ──────────▶ Backward フロー
    │   └── /sdd backward
    │
    ├── 進捗確認 ──────────────────▶ /sdd status
    │
    └── 実装・仕様の整合性確認 ────▶ /sdd verify
```

## コマンド一覧

| コマンド | 機能 | 引数 |
|---------|------|------|
| `/sdd init` | SDDワークフロー開始、Issue確認 | `{issue番号}` |
| `/sdd requirements` | 要件定義書の作成 | `{REQ-ID}` |
| `/sdd design` | 案件設計書の作成 | `{機能名}` |
| `/sdd tasks` | タスク管理ファイルの作成 | `{機能名}` |
| `/sdd impl` | 仕様に基づく実装 | `{機能名}` |
| `/sdd verify` | 実装と仕様の整合性確認 | `{機能名}` |
| `/sdd status` | 進捗状況確認 | `{機能名}` (省略可) |
| `/sdd backward` | 既存コードの文書化 | `{ファイルパス}` |

## Forward フロー（新規開発）

### ステップ 1: 初期化 (`/sdd init {issue番号}`)

1. GitHub Issue #{issue番号} の内容を取得
2. 要件の概要を把握
3. 要件ID（REQ-xxx-001）を決定
4. featureブランチ名を提案（`feature/{issue番号}-{機能名}`）

### ステップ 2: 要件定義 (`/sdd requirements {REQ-ID}`)

成果物: `docs/specs/requirements/{REQ-ID}.md`

必須セクション:
- 概要（GitHub Issue #nn への参照）
- 背景・目的
- 機能要件
- 非機能要件
- 受け入れ基準（AC-ID形式）
- 関連ドキュメント

### ステップ 3: 詳細設計 (`/sdd design {機能名}`)

成果物: `docs/specs/domain/features/{クラス名}.{機能名}.spec.md`

必須セクション:
- 概要（要件IDへの参照）
- インターフェース仕様
- 処理仕様
- テストケース（TC-ID形式）
- **要件トレーサビリティ**（AC-ID → TC-ID対応表）
- 変更履歴

### ステップ 4: タスク分解 (`/sdd tasks {機能名}`)

成果物: `docs/specs/domain/features/{クラス名}.{機能名}.tasks.md`

標準タスク:
1. ⬜ 要件定義書作成
2. ⬜ 詳細仕様書作成
3. ⬜ テストコード作成
4. ⬜ 実装
5. ⬜ 統合テスト
6. ⬜ トレーサビリティ更新
7. ⬜ マスター設計書反映

### ステップ 5: 実装 (`/sdd impl {機能名}`)

1. tasks.md の未完了タスクを確認
2. テストコード作成（テストファースト）
3. 実装コード作成
4. テスト実行・PASS確認
5. tasks.md の進捗を更新

### ステップ 6: 検証 (`/sdd verify {機能名}`)

1. 仕様書のテストケース一覧を取得
2. 実装されたテストコードと照合
3. 要件トレーサビリティを確認（AC → TC → 実装）
4. 不整合があれば報告

## Backward フロー（既存コード文書化）

`/sdd backward {ファイルパス}` で既存コードから仕様書を生成:

1. 対象ファイルを読み込み
2. クラス・メソッドの構造を分析
3. 仕様書テンプレートに沿って文書化
4. テストケースを導出
5. `docs/specs/domain/master/{クラス名}.spec.md` に出力

## 進捗確認 (`/sdd status`)

引数なし: 現在のブランチに関連する全仕様の進捗を表示
引数あり: 指定機能の詳細進捗を表示

表示項目:
- 要件定義: ✅/⬜
- 仕様書: ✅/⬜
- タスク: n/m 完了
- テスト: PASS/FAIL/未作成
- 実装: ✅/⬜
- トレーサビリティ: ✅/⬜

## 成果物の配置場所

```
docs/specs/
├── requirements/           # 要件定義書
│   └── REQ-xxx-001.md
├── domain/
│   ├── master/             # マスター設計書（クラス単位）
│   │   └── {クラス名}.spec.md
│   └── features/           # 案件設計書（機能単位）
│       ├── {クラス名}.{機能名}.spec.md
│       └── {クラス名}.{機能名}.tasks.md
└── templates/              # テンプレート
```

## エージェント連携

`spec-driven-dev-expert` エージェントと連携して動作。
複雑な仕様策定やレビューが必要な場合は、エージェントに委譲する。

## 詳細リファレンス

- **ワークフロー詳細**: [references/workflows.md](references/workflows.md)
- **テンプレート一覧**: [references/templates.md](references/templates.md)
