# 仕様駆動開発によるトレーサビリティの実現

**事例**: REQ-TASK-001（計算除外レコードの可視化）

---

## 1. 概要

本ドキュメントは、仕様駆動開発（Spec-Driven Development）を段階的に実践することで、**要件→仕様→テスト→実装**のトレーサビリティが自然に確保されることを示す実例です。

---

## 2. 開発フロー全体像

```
┌─────────────────────────────────────────────────────────────────────┐
│                         開発フロー                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [GitHub Issue #42]                                                 │
│        │                                                            │
│        ▼                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ 1.要件定義    │───▶│ 2.詳細仕様    │───▶│ 3.テスト作成  │          │
│  │ REQ-TASK-001 │    │ *.spec.md    │    │ *.test.ts    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                 │                   │
│                                                 ▼                   │
│                      ┌──────────────┐    ┌──────────────┐          │
│                      │ 5.設計書更新  │◀───│ 4.実装        │          │
│                      │ Project.spec │    │ Project.ts   │          │
│                      └──────────────┘    └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 各フェーズの成果物とコミット

| フェーズ | コミット | 成果物 | 内容 |
|---------|----------|--------|------|
| 1. 要件定義 | `67d28f2` | `REQ-TASK-001.md` | 何を作るか、なぜ必要か |
| 2. 仕様策定 | `ac573ce` | `Project.excludedTasks.spec.md` | どう作るか（インターフェース、処理仕様） |
| 3. テスト作成 | `86bd9cd` | `Project.excludedTasks.test.ts` | 仕様通りに動くかの検証コード |
| 4. 実装 | `805c45d` | `Project.ts` | 実際のコード |
| 5. 設計書更新 | `52be4c5` | `Project.spec.md` v1.1.0 | マスター設計書への反映 |

---

## 4. トレーサビリティマトリクス

### 4.1 要件 → 仕様 → テスト → 実装

```
要件(REQ-TASK-001)          仕様(spec.md)              テスト(test.ts)           実装(Project.ts)
─────────────────────────────────────────────────────────────────────────────────────────────────
AC-01: excludedTasksで      2.2 Projectクラスへの追加   TC-02〜TC-06             get excludedTasks()
       一覧取得できる       get excludedTasks()        「含まれる」テスト群      :377行目

AC-02: reasonが正しい       2.1 ExcludedTask型         TC-09, TC-10             reason: task.validStatus
                           reason: string             「reason検証」            .invalidReason

AC-03: 有効タスクのみの     3.1 除外判定ロジック        TC-01, TC-07             .filter(!isValid)
       場合は空配列         validStatus.isValid        「空配列」テスト          :380行目
                           === false
```

### 4.2 テストケース ↔ 仕様セクション対応表

| テストケース | 仕様セクション | 検証内容 |
|-------------|---------------|---------|
| TC-01 | 4.1 正常系 | 全タスク有効 → 空配列 |
| TC-02 | 4.1 正常系 | 開始日未設定 → 除外 |
| TC-03 | 4.1 正常系 | 終了日未設定 → 除外 |
| TC-04 | 4.1 正常系 | plotMap未設定 → 除外 |
| TC-05 | 4.1 正常系 | 稼働日数0 → 除外 |
| TC-06 | 4.1 正常系 | 複数無効 → 全て除外 |
| TC-07 | 4.2 境界値 | タスク0件 → 空配列 |
| TC-08 | 4.2 境界値 | 親タスク無効 → 対象外 |
| TC-09 | 4.3 reason検証 | 日付エラー形式 |
| TC-10 | 4.3 reason検証 | 日数エラー形式 |

---

## 5. 双方向トレーサビリティ

### 5.1 上流から下流へ（Forward Traceability）

**「この要件はどこで実装されている？」**

```
REQ-TASK-001 (要件)
    │
    ├──▶ Project.excludedTasks.spec.md (仕様)
    │        │
    │        ├──▶ Project.excludedTasks.test.ts (テスト)
    │        │
    │        └──▶ Project.ts:377 get excludedTasks() (実装)
    │
    └──▶ Project.spec.md v1.1.0 セクション3.3, 5.9 (マスター設計書)
```

### 5.2 下流から上流へ（Backward Traceability）

**「このコードはなぜ存在する？」**

```
Project.ts:377 get excludedTasks()
    │
    ├──◀ Project.excludedTasks.spec.md セクション2.2 (仕様根拠)
    │
    ├──◀ REQ-TASK-001 セクション2.1 (要件根拠)
    │
    └──◀ GitHub Issue #42 (ビジネス要求)
```

---

## 6. 段階的アプローチのメリット

### 6.1 各フェーズで得られるもの

| フェーズ | 成果物 | 効果 |
|---------|--------|------|
| 1. 要件定義 | REQ-TASK-001.md | **What/Why** が明確になる |
| 2. 仕様策定 | *.spec.md | **How** が明確になる |
| 3. テスト作成 | *.test.ts | 仕様の**検証可能な形式**への変換 |
| 4. 実装 | *.ts | テストを満たすコード |
| 5. 設計書更新 | マスター仕様書 | **知識の集約**と保守性向上 |

### 6.2 なぜ「順番」が重要か

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

---

## 7. 実際のコミット履歴

```bash
$ git log --oneline --grep="TASK-001\|excludedTasks"

52be4c5 docs: マスター設計書にexcludedTasksを追加
805c45d feat: Project.excludedTasksを実装
86bd9cd test: Project.excludedTasksのテストを追加
ac573ce docs: Project.excludedTasksの詳細仕様を追加
67d28f2 docs: 計算除外レコード可視化の要件定義を追加 (REQ-TASK-001)
```

**コミット順序 = 開発フロー** であり、後から見ても「何をどの順番で行ったか」が明確。

---

## 8. 受け入れテスト結果（トレーサビリティの証明）

要件定義書の受け入れ基準がテストで検証され、結果が記録されている：

| AC-ID | 基準 | テスト | 結果 |
|-------|------|--------|------|
| AC-01 | excludedTasksで一覧取得 | TC-02〜TC-06 | ✅ PASS |
| AC-02 | reason正しく設定 | TC-09, TC-10 | ✅ PASS |
| AC-03 | 有効タスクのみ→空配列 | TC-01, TC-07 | ✅ PASS |
| AC-04 | 既存計算に影響なし | 既存95件 | ✅ PASS |

---

## 9. 具体例：受け入れ基準から実装・テストへの追跡（Forward）

### 「AC-01の実装とテストはどこ？」

要件定義書の受け入れ基準を起点に、**実装とテストを特定**してみましょう。

#### Step 1: 受け入れ基準を確認

```markdown
# docs/specs/requirements/REQ-TASK-001.md より

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | Project.excludedTasks で一覧を取得できる |
| AC-02 | 各レコードに除外理由（reason）が含まれる |
| AC-03 | 有効タスクのみの場合は空配列を返す |
```

#### Step 2: 詳細仕様書を見つける

```bash
# 要件定義書の「関連ドキュメント」セクションから
grep "spec.md" docs/specs/requirements/REQ-TASK-001.md
# → docs/specs/domain/Project.excludedTasks.spec.md
```

#### Step 3: テストファイルを見つける

```bash
# 命名規則から予測
ls src/domain/__tests__/Project.excludedTasks.*
# → Project.excludedTasks.test.ts
```

#### Step 4: AC-01に対応するテストケースを特定

AC-01「excludedTasksで一覧取得」は、様々なパターンで「一覧に含まれる」ことを検証する必要がある。

```bash
# 仕様書のテスト一覧から、AC-01に関連するTC-IDを確認
grep -A2 "AC-01" docs/specs/domain/Project.excludedTasks.spec.md
# → TC-02〜TC-06 が「含まれる」テスト群

# テストファイルで該当箇所を検索
grep -n "TC-02\|TC-03\|TC-04\|TC-05\|TC-06" src/domain/__tests__/Project.excludedTasks.test.ts
# → 98:  describe('TC-02: 開始日が未設定のタスク', () => {
# → 130: describe('TC-03: 終了日が未設定のタスク', () => {
# → 162: describe('TC-04: plotMapが未設定のタスク', () => {
# → 194: describe('TC-05: 稼働予定日数が0のタスク', () => {
# → 226: describe('TC-06: 複数の無効タスクがある場合', () => {
```

#### Step 5: 実装箇所を特定

```bash
grep -n "excludedTasks" src/domain/Project.ts
# → 377:  get excludedTasks(): ExcludedTask[] {
```

#### 追跡結果の図示

```
REQ-TASK-001 AC-01 「excludedTasksで一覧取得」
      │
      ├──▶ 詳細仕様: Project.excludedTasks.spec.md セクション2.2
      │
      ├──▶ テスト: Project.excludedTasks.test.ts
      │         TC-02 (98行目): 開始日未設定 → 除外される
      │         TC-03 (130行目): 終了日未設定 → 除外される
      │         TC-04 (162行目): plotMap未設定 → 除外される
      │         TC-05 (194行目): 稼働日数0 → 除外される
      │         TC-06 (226行目): 複数無効タスク → すべて除外される
      │
      └──▶ 実装: Project.ts:377
               get excludedTasks(): ExcludedTask[]
```

### AC全体の追跡マトリクス

| 受け入れ基準 | テストケース | 実装箇所 |
|-------------|-------------|----------|
| **AC-01** excludedTasksで一覧取得 | TC-02〜TC-06 | `Project.ts:377` `get excludedTasks()` |
| **AC-02** reasonが正しい | TC-09, TC-10 | `Project.ts:381` `reason: task.validStatus.invalidReason` |
| **AC-03** 有効タスクのみ→空配列 | TC-01, TC-07 | `Project.ts:378` `.filter(!isValid)` |

### この具体例が示すこと

| 観点 | 説明 |
|------|------|
| **要件の検証可能性** | AC-01は5つのテストで検証されている |
| **テストの網羅性** | 各無効パターン（日付、plotMap、日数）が個別にテストされている |
| **変更時の影響** | AC-01を変更する場合、5つのテストの修正が必要 |

---

## 10. 具体例：1行のコードから要件を追跡する（Backward）

### 「なぜ `.filter((task) => task.isLeaf)` があるのか？」

セクション9とは逆方向に、実装コードの **1行** を起点に、要件まで遡ってみましょう。

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

#### Step 1→2 への辿り方

**方法1: ファイル命名規則から探す**
```
src/domain/Project.ts                    ← 実装
src/domain/__tests__/Project.*.test.ts   ← テストはここ！
```

```bash
# コマンドで探す
ls src/domain/__tests__/Project.*
# → Project.excludedTasks.test.ts が見つかる
```

**方法2: メソッド名で grep する**
```bash
grep -r "excludedTasks" src/ --include="*.test.ts"
# → Project.excludedTasks.test.ts:88: describe('Project.excludedTasks', () => {
```

**方法3: IDE の機能を使う**
- VSCode: `excludedTasks` を右クリック → 「参照を検索」
- WebStorm: Ctrl+クリック → 「Usages」

#### Step 2: テストを見る

```typescript
// src/domain/__tests__/Project.excludedTasks.test.ts:249-277
describe('TC-08: 親タスク（isLeaf=false）のみ無効な場合', () => {
    it('excludedTasksが空配列を返す（親は対象外）', () => {
        const parentTask = createTaskNode({
            id: 1,
            name: '親タスク',
            startDate: undefined,  // 無効な設定だが...
            isLeaf: false,         // 親タスクなので対象外！
        })
        // ... 子タスク設定 ...

        expect(project.excludedTasks).toEqual([])  // 空配列
    })
})
```

**テストが証明していること**: 親タスクは無効でも `excludedTasks` に含まれない

#### Step 2→3 への辿り方

**方法1: テストファイル名から仕様書を探す**
```
src/domain/__tests__/Project.excludedTasks.test.ts  ← テスト
docs/specs/domain/Project.excludedTasks.spec.md     ← 仕様書はここ！
```

命名規則: `{Class}.{feature}.test.ts` → `{Class}.{feature}.spec.md`

**方法2: テストケースID（TC-08）で検索**
```bash
grep -r "TC-08" docs/
# → docs/specs/domain/Project.excludedTasks.spec.md:106: | TC-08 | 親タスク...
```

#### Step 3: 仕様を見る

```markdown
// docs/specs/domain/Project.excludedTasks.spec.md

## 4.2 境界値

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-08 | 親タスク（isLeaf=false）のみ無効な場合 | excludedTasksが空配列（親は対象外）|
```

**仕様が定めていること**: 親タスクは対象外と明記

#### Step 3→4 への辿り方

**方法1: 仕様書のヘッダーを見る**
```markdown
// docs/specs/domain/Project.excludedTasks.spec.md の冒頭

**要件ID**: REQ-TASK-001   ← ここに書いてある！
```

**方法2: 要件IDで検索**
```bash
grep -r "REQ-TASK-001" docs/specs/requirements/
# → docs/specs/requirements/REQ-TASK-001.md
```

**方法3: GitHub Issue から辿る**
```bash
# 仕様書に GitHub Issue 番号があれば
gh issue view 42
# → Issue の説明に要件定義書へのリンクがある
```

#### Step 4: 要件を見る

```markdown
// docs/specs/requirements/REQ-TASK-001.md

### 2.1.1 対象となる「除外タスク」

`TaskRow.validStatus.isValid === false` のタスク。

// → 暗黙の前提: 集計対象はリーフタスクのみ（既存仕様）
```

**要件の背景**: PV/EV計算はリーフタスクのみで行われる（既存仕様）

---

### トレーサビリティ図（この1行について）

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

### この具体例が示すこと

| 観点 | 説明 |
|------|------|
| **コードの存在理由** | `.filter(isLeaf)` は仕様・要件に基づく意図的な実装 |
| **変更時の影響** | この行を削除すると TC-08 が失敗する |
| **仕様変更時の対応** | 「親タスクも含める」要件が来たら、仕様→テスト→実装の順で修正 |

---

## 11. まとめ

仕様駆動開発を段階的に実践することで：

1. **トレーサビリティが自然に確保される** - 各成果物が前の成果物を参照
2. **変更影響の追跡が容易** - 要件変更時に影響範囲を特定可能
3. **品質の証明が可能** - 受け入れ基準とテスト結果の紐付け
4. **知識の継承** - 後から参加した人も経緯を追跡可能

---

## 関連ドキュメント

- [REQ-TASK-001.md](../specs/requirements/REQ-TASK-001.md) - 要件定義書
- [Project.excludedTasks.spec.md](../specs/domain/Project.excludedTasks.spec.md) - 詳細仕様書
- [Project.spec.md](../specs/domain/Project.spec.md) - マスター設計書
- [DEVELOPMENT_WORKFLOW.md](../workflow/DEVELOPMENT_WORKFLOW.md) - 開発ワークフロー
