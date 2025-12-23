# 開発フロー記録サンプル: REQ-TASK-001

**案件名**: 計算除外レコードの可視化
**要件ID**: REQ-TASK-001
**GitHub Issue**: #42
**目的**: 仕様駆動開発フローの実際の開発記録

---

## 概要

このドキュメントは、仕様駆動開発（Spec-Driven Development）の実際の開発フローを記録したサンプルです。
`Project.excludedTasks`（計算除外レコードの可視化）機能を題材に、要件定義から設計書更新までの一連の流れを示します。

**ポイント**: 開発者は**GitHub Issueを書くだけ**で、Claude Codeが仕様駆動開発のフローに沿って実装を進めます。

---

## 開発の始め方

### 開発者がやること

```
GitHub Issue #42 を作成するだけ！

タイトル: 計算除外レコードの可視化
本文:
  - 何を実現したいか
  - なぜ必要か
  - 受け入れ基準（あれば）
```

### Claude Codeがやること

1. 要件定義書を作成
2. 詳細仕様書を作成
3. テストコードを作成
4. 実装
5. マスター設計書を更新

---

## コミット履歴

| # | コミット | フェーズ | 説明 | ファイル |
|---|---------|---------|------|---------|
| 0 | - | **Issue作成** | **開発者がIssueを書く** | GitHub Issue #42 |
| 1 | `67d28f2` | 要件定義 | 要件定義書作成 | [`REQ-TASK-001.md`](../specs/requirements/REQ-TASK-001.md) (新規) |
| 2 | `ac573ce` | 仕様策定 | 詳細仕様作成 | [`Project.excludedTasks.spec.md`](../specs/domain/features/Project.excludedTasks.spec.md) (新規) |
| 3 | `86bd9cd` | テスト作成 | テストコード作成（実装前） | [`Project.excludedTasks.test.ts`](../../src/domain/__tests__/Project.excludedTasks.test.ts) (新規) |
| 4 | `805c45d` | 実装 | 本体実装 | [`Project.ts`](../../src/domain/Project.ts) (修正) |
| 5 | `52be4c5` | 設計書更新 | マスター設計書への反映 | [`Project.spec.md`](../specs/domain/master/Project.spec.md) v1.1.0 (修正) |

---

## 開発フロー図

```
┌────────────────────────────────────────────────────────────────────────┐
│  【開発者】                                                             │
│                                                                        │
│    GitHub Issue #42 を書く  ◀──── これだけ！                           │
│    「計算除外レコードを可視化したい」                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  【Claude Code】以下を自動で実行                                        │
│                                                                        │
│  [1] 要件定義     ──────────────────────────────────────┐              │
│      REQ-TASK-001.md                                    │              │
│      - 何を作るか定義                                   │              │
│      - 受け入れ基準（AC）を明確化                       │              │
│           │                                            │              │
│           ▼                                            │              │
│  [2] 仕様策定     ──────────────────────────────────┐  │              │
│      Project.excludedTasks.spec.md                  │  │              │
│      - どう作るか定義                                │  │              │
│      - テストケースを列挙                            │  │              │
│           │                                         │  │              │
│           ▼                                         │  │              │
│  [3] テスト作成   ──────────────────────────────┐   │  │              │
│      Project.excludedTasks.test.ts (10件)       │   │  │              │
│      - 仕様書のテストケースを実装                │   │  │              │
│      - この時点ではテストは失敗する              │   │  │              │
│           │                                     │   │  │              │
│           ▼                                     │   │  │              │
│  [4] 実装         ──────────────────────────┐   │   │  │              │
│      Project.ts                             │   │   │  │              │
│      - テストを通す実装を作成                │   │   │  │              │
│           │                                 │   │   │  │              │
│           ▼                                 │   │   │  │              │
│      テスト実行 → 10件PASS                  │   │   │  │              │
│           │                                 │   │   │  │              │
│           ▼                                 ▼   ▼   ▼  ▼              │
│  [5] 設計書更新   ◀─────────────────────────────────────┘              │
│      Project.spec.md v1.1.0                                            │
│      - マスター設計書にexcludedTasksを追加                              │
│      - トレーサビリティの確立                                           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 成果物一覧

### 要件定義書
- パス: [`docs/specs/requirements/REQ-TASK-001.md`](../specs/requirements/REQ-TASK-001.md)
- 内容: 計算除外レコードの可視化要件

### 仕様書
- パス: [`docs/specs/domain/features/Project.excludedTasks.spec.md`](../specs/domain/features/Project.excludedTasks.spec.md)
- 内容: excludedTasksプロパティの詳細仕様

### テスト
- パス: [`src/domain/__tests__/Project.excludedTasks.test.ts`](../../src/domain/__tests__/Project.excludedTasks.test.ts)
- テストケース: 10件 (TC-01〜TC-10)
- 結果: 全てPASS

### 実装
| ファイル | 操作 | 説明 |
|---------|------|------|
| [`src/domain/Project.ts`](../../src/domain/Project.ts) | 修正 | excludedTasksゲッター追加 (377行目) |

### マスター設計書
- パス: [`docs/specs/domain/master/Project.spec.md`](../specs/domain/master/Project.spec.md)
- バージョン: 1.1.0
- 追加セクション: 3.3 excludedTasks, 5.9 excludedTasks

---

## トレーサビリティマトリクス

```
要件定義                仕様書                        テスト              実装
─────────────────────────────────────────────────────────────────────────────────
REQ-TASK-001       ──▶  Project.excludedTasks   ──▶  TC-01〜TC-10  ──▶  Project.ts:377
  AC-01                   .spec.md                                       get excludedTasks()
  AC-02
  AC-03
  AC-04
```

### 受け入れ基準 → テストケース対応

| AC-ID | 受け入れ基準 | テストケース |
|-------|-------------|-------------|
| AC-01 | excludedTasksで一覧取得 | TC-02〜TC-06 |
| AC-02 | reasonが正しく設定 | TC-09, TC-10 |
| AC-03 | 有効タスクのみ→空配列 | TC-01, TC-07 |
| AC-04 | 既存計算に影響なし | 既存95件PASS |

---

## 学んだこと・ポイント

### 1. 開発者の負担軽減
- **Issueを書くだけ**で開発が始まる
- 仕様書・テスト・実装はClaude Codeが担当

### 2. コミット粒度
- フェーズごとに1コミット
- 後からフローを追跡可能

### 3. テストファースト
- 実装前にテストを作成（コミット3）
- 実装時はテストを通すことに集中（コミット4）

### 4. 設計書更新の重要性
- マスター設計書（Project.spec.md）への反映
- 新機能がドキュメントに記録され、保守性向上

### 5. トレーサビリティの確立
- 要件 → 仕様 → テスト → 実装の追跡が可能
- 変更時の影響範囲を特定可能

---

## 参考

- [TRACEABILITY_EXAMPLE.md](../examples/TRACEABILITY_EXAMPLE.md) - トレーサビリティの詳細説明
- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) - 開発ワークフロー全体
