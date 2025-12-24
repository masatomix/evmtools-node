# 開発フロー記録サンプル: REQ-TASK-001

**案件名**: 計算除外レコードの可視化
**要件ID**: REQ-TASK-001
**GitHub Issue**: #42
**目的**: 仕様駆動開発フローの実際の開発記録

---

## 1. 概要

このドキュメントは、仕様駆動開発（Spec-Driven Development）の実際の開発フローを記録したサンプルです。
`Project.excludedTasks`（計算除外レコードの可視化）機能を題材に、要件定義から設計書更新までの一連の流れを示します。

**ポイント**: 開発者は**GitHub Issueを書くだけ**で、Claude Codeが仕様駆動開発のフローに沿って実装を進めます。

---

## 2. 開発の始め方

### 開発者がやること

```
GitHub Issue #42 を作成するだけ！

タイトル: 計算除外レコードの可視化
本文:
  - 何を実現したいか
  - なぜ必要か
  - 受け入れ基準（あれば）
※ 実際は任意のフォーマットでもClaude Codeが補完してくれる。
```

### Claude Codeがやること

1. 要件定義書を作成
2. **案件用の詳細仕様書を作成**（`features/` 配下に新規作成）
3. テストコードを作成
4. 実装
5. マスター設計書を更新（`master/` 配下の既存ファイルに追記）

> **仕様書の2種類**
> - **案件設計書** (`features/`): 案件ごとに新規作成。この案件で追加する機能の仕様
> - **マスター設計書** (`master/`): クラス全体の恒久的な仕様。案件完了後に反映

---

## 3. 開発フロー図

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
│      features/Project.excludedTasks.spec.md  (新規) │  │              │
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

## 4. コミット履歴

| # | コミット | フェーズ | 説明 | ファイル |
|---|---------|---------|------|---------|
| 0 | - | **Issue作成** | **開発者がIssueを書く** | GitHub Issue #42 |
| 1 | `67d28f2` | 要件定義 | 何を作るか、なぜ必要か | [`REQ-TASK-001.md`](../specs/requirements/REQ-TASK-001.md) |
| 2 | `ac573ce` | 仕様策定 | 詳細仕様作成。<br />どう作るか(インターフェース、処理仕様) | [`Project.excludedTasks.spec.md`](../specs/domain/features/Project.excludedTasks.spec.md) |
| 3 | `86bd9cd` | テスト作成 | 仕様通りに動くかの検証コード | [`Project.excludedTasks.test.ts`](../../src/domain/__tests__/Project.excludedTasks.test.ts) |
| 4 | `805c45d` | 実装 | 実際のコード | [`Project.ts`](../../src/domain/Project.ts) |
| 5 | `52be4c5` | 設計書更新 | マスター設計書への反映 | [`Project.spec.md`](../specs/domain/master/Project.spec.md) |

---

## 5. 成果物一覧

### 要件定義書
- パス: [`docs/specs/requirements/REQ-TASK-001.md`](../specs/requirements/REQ-TASK-001.md)
- 内容: 計算除外レコードの可視化要件

### 案件設計書（この案件で新規作成）
- パス: [`docs/specs/domain/features/Project.excludedTasks.spec.md`](../specs/domain/features/Project.excludedTasks.spec.md)
- 配置: **`features/`** 配下（案件ごとに新規作成）
- 内容: excludedTasksプロパティの詳細仕様

### テスト
- パス: [`src/domain/__tests__/Project.excludedTasks.test.ts`](../../src/domain/__tests__/Project.excludedTasks.test.ts)
- テストケース: 10件 (TC-01〜TC-10)
- 結果: 全てPASS

### 実装
| ファイル | 操作 | 説明 |
|---------|------|------|
| [`src/domain/Project.ts`](../../src/domain/Project.ts) | 修正 | excludedTasksゲッター追加 (377行目) |

### マスター設計書（既存ファイルに追記）
- パス: [`docs/specs/domain/master/Project.spec.md`](../specs/domain/master/Project.spec.md)
- 配置: **`master/`** 配下（クラスごとに1ファイル、恒久的に更新）
- バージョン: 1.0.0 → **1.1.0**
- 追加セクション: 3.3 excludedTasks, 5.9 excludedTasks

---

## 6. トレーサビリティマトリクス

```
要件定義                仕様書                        テスト              実装
─────────────────────────────────────────────────────────────────────────────────
REQ-TASK-001       ──▶  Project.excludedTasks   ──▶  TC-01〜TC-10  ──▶  Project.ts:377
  AC-01                   .spec.md                                       get excludedTasks()
  AC-02
  AC-03
```

### 受け入れ基準 → テストケース対応

> **紐付け元**: 案件設計書の「要件トレーサビリティ」セクション
> （[`Project.excludedTasks.spec.md`](../specs/domain/features/Project.excludedTasks.spec.md) セクション7）

| AC-ID | 受け入れ基準 | テストケース |
|-------|-------------|-------------|
| AC-01 | excludedTasksで一覧取得 | TC-02〜TC-06 |
| AC-02 | reasonが正しく設定 | TC-09, TC-10 |
| AC-03 | 有効タスクのみ→空配列 | TC-01, TC-07 |

---

## 7. ポイント

### なぜ「順番」が重要か

```
❌ いきなり実装すると...
   - 何を作るべきか曖昧なまま進む
   - 後から「なぜこうなっている？」が分からない
   - テストが後付けになり、カバレッジが不十分

✅ 順番通りに進めると...
   - 要件で「何を作るか」が明確
   - 仕様で「どう作るか」が明確
   - テストで「正しく作れたか」を検証可能
   - 全てがリンクして追跡可能
```

### 1. 開発者の負担軽減
- **Issueを書くだけ**で開発が始まる
- 仕様書・テスト・実装はClaude Codeが担当

### 2. テストファースト
- 実装前にテストを作成
- 実装時はテストを通すことに集中

### 3. 設計書更新の重要性
- マスター設計書（Project.spec.md）への反映
- 新機能がドキュメントに記録され、保守性向上

### 4. トレーサビリティの確立
- 要件 → 仕様 → テスト → 実装の追跡が可能
- grepコマンドで具体的に辿れる

---

## 8. トレーサビリティの具体例

### 具体例1: Forward（要件から実装・テストを追跡）

**「AC-01の実装とテストはどこ？」** を具体的なコマンドで追跡してみましょう。

#### Step 1: 受け入れ基準を確認

```markdown
# docs/specs/requirements/REQ-TASK-001.md より

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | Project.excludedTasks で一覧を取得できる |
| AC-02 | 各レコードに除外理由（reason）が含まれる |
| AC-03 | 有効タスクのみの場合は空配列を返す |
```

#### Step 2: 仕様書の要件トレーサビリティから対応TCを特定

```bash
grep -n "AC-01" docs/specs/domain/features/Project.excludedTasks.spec.md
# → 157:| REQ-TASK-001 AC-01 | excludedTasksで一覧取得 | TC-02〜TC-06 | ✅ PASS |
```

#### Step 3: テストファイルで該当箇所を検索

```bash
grep -n "TC-02\|TC-03\|TC-04\|TC-05\|TC-06" src/domain/__tests__/Project.excludedTasks.test.ts
# → 112: describe('TC-02: 開始日が未設定のタスクがある場合', () => {
# → 132: describe('TC-03: 終了日が未設定のタスクがある場合', () => {
# → 152: describe('TC-04: plotMapが未設定のタスクがある場合', () => {
# → 173: describe('TC-05: 稼働予定日数が0のタスクがある場合', () => {
# → 194: describe('TC-06: 複数の無効タスクがある場合', () => {
```

#### Step 4: 実装箇所を特定

```bash
grep -n "excludedTasks" src/domain/Project.ts
# → 377:  get excludedTasks(): ExcludedTask[] {
```

#### 追跡結果の図示

```
REQ-TASK-001 AC-01 「excludedTasksで一覧取得」
      │
      ├──▶ 仕様書: Project.excludedTasks.spec.md セクション7（要件トレーサビリティ）
      │         → TC-02〜TC-06 が対応
      │
      ├──▶ テスト: Project.excludedTasks.test.ts
      │         TC-02 (112行目): 開始日未設定 → 除外される
      │         TC-03 (132行目): 終了日未設定 → 除外される
      │         TC-04 (152行目): plotMap未設定 → 除外される
      │         TC-05 (173行目): 稼働日数0 → 除外される
      │         TC-06 (194行目): 複数無効タスク → すべて除外される
      │
      └──▶ 実装: Project.ts:377
               get excludedTasks(): ExcludedTask[]
```

#### AC全体の追跡マトリクス

| 受け入れ基準 | テストケース | 実装箇所 |
|-------------|-------------|----------|
| **AC-01** excludedTasksで一覧取得 | TC-02〜TC-06 | `Project.ts:377` `get excludedTasks()` |
| **AC-02** reasonが正しい | TC-09, TC-10 | `Project.ts:381` `reason: task.validStatus.invalidReason` |
| **AC-03** 有効タスクのみ→空配列 | TC-01, TC-07 | `Project.ts:378` `.filter(!isValid)` |

---

### 具体例2: Backward（1行のコードから要件を追跡）

**「なぜ `.filter((task) => task.isLeaf)` があるのか？」** を起点に、実装から要件まで遡ってみましょう。

#### Step 1: 実装を見る

```typescript
// src/domain/Project.ts:377-384
get excludedTasks(): ExcludedTask[] {
    return this.toTaskRows()
        .filter((task) => task.isLeaf)        // ← この行はなぜある？
        .filter((task) => !task.validStatus.isValid)
        .map((task) => ({
            task,
            reason: task.validStatus.invalidReason ?? '理由不明',
        }))
}
```

#### Step 2: テストを見つける

```bash
# ファイル命名規則から探す
ls src/domain/__tests__/Project.excludedTasks.*
# → Project.excludedTasks.test.ts

# または、メソッド名で grep
grep -r "excludedTasks" src/ --include="*.test.ts"
# → Project.excludedTasks.test.ts:88: describe('Project.excludedTasks', () => {
```

TC-08 が「親タスクは対象外」をテストしている：

```typescript
// src/domain/__tests__/Project.excludedTasks.test.ts
describe('TC-08: 親タスク（isLeaf=false）のみ無効な場合', () => {
    it('excludedTasksが空配列を返す（親は対象外）', () => {
        // ... 親タスクは無効でも excludedTasks に含まれない
        expect(project.excludedTasks).toEqual([])
    })
})
```

#### Step 3: 仕様書を見つける

```bash
# テストケースID（TC-08）で検索
grep -r "TC-08" docs/
# → docs/specs/domain/features/Project.excludedTasks.spec.md:106: | TC-08 | 親タスク...
```

仕様書に明記されている：

```markdown
## 4.2 境界値

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-08 | 親タスク（isLeaf=false）のみ無効な場合 | excludedTasksが空配列（親は対象外）|
```

#### Step 4: 要件を見つける

```bash
# 仕様書のヘッダーから要件IDを確認
grep "要件ID" docs/specs/domain/features/Project.excludedTasks.spec.md
# → **要件ID**: REQ-TASK-001

# 要件定義書を確認
cat docs/specs/requirements/REQ-TASK-001.md
# → 暗黙の前提: 集計対象はリーフタスクのみ（既存仕様）
```

#### 追跡結果の図示

```
Project.ts:379                          なぜこのコードがある？
.filter((task) => task.isLeaf)
        │
        ▼
TC-08 テストケース                      「親タスクは対象外」をテストで保証
expect(excludedTasks).toEqual([])
        │
        ▼
spec.md セクション4.2                    仕様書に明記されている
「親タスク（isLeaf=false）→ 対象外」
        │
        ▼
REQ-TASK-001 + 既存仕様                 ビジネス要件として正しい
「集計対象はリーフタスクのみ」
```

#### この具体例が示すこと

| 観点 | 説明 |
|------|------|
| **コードの存在理由** | `.filter(isLeaf)` は仕様・要件に基づく意図的な実装 |
| **変更時の影響** | この行を削除すると TC-08 が失敗する |
| **仕様変更時の対応** | 「親タスクも含める」要件が来たら、仕様→テスト→実装の順で修正 |

---

## 9. 参考

- [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) - 開発ワークフロー全体
- [REQ-TASK-001.md](../specs/requirements/REQ-TASK-001.md) - 要件定義書
- [Project.excludedTasks.spec.md](../specs/domain/features/Project.excludedTasks.spec.md) - 案件設計書（`features/`）
- [Project.spec.md](../specs/domain/master/Project.spec.md) - マスター設計書（`master/`）
