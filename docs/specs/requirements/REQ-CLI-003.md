# 要件定義書: pbevm-diff出力から不要なプロパティを除去

**要件ID**: REQ-CLI-003
**GitHub Issue**: #73
**作成日**: 2025-12-24
**更新日**: 2025-12-24
**ステータス**: Implemented
**優先度**: Medium

---

## 1. 概要

### 1.1 目的

`pbevm-diff` コマンドのタスクDiff出力から、内部実装用の不要なプロパティを除去し、差分情報のみを表示する。

### 1.2 背景

現在の `pbevm-diff` 出力では、TaskDiff オブジェクトを直接表示しているため、以下の内部プロパティが出力されている：

- `currentTask` - `[TaskRow]`（現在のTaskRowオブジェクト参照）
- `prevTask` - `[TaskRow]`（前回のTaskRowオブジェクト参照）

これらはオブジェクト参照であり、CLI出力では `[TaskRow]` としか表示されないため、ユーザーにとって意味がない。

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| `pbevm-diff` のタスクDiff出力整形 | ✅ |
| `pbevm-show-pv`, `pbevm-show-project` の対応 | 別Issue (#72) |

---

## 2. 機能要件

### 2.1 除去対象プロパティ

以下のプロパティをCLI出力から除去する：

| プロパティ | 型 | 除去理由 |
|-----------|-----|---------|
| `currentTask` | TaskRow | オブジェクト参照（表示不可） |
| `prevTask` | TaskRow | オブジェクト参照（表示不可） |

### 2.2 表示すべきプロパティ

差分情報として意味のあるプロパティのみを表示：

| プロパティ | 説明 |
|-----------|------|
| `id` | タスクID |
| `name` | タスク名 |
| `diffType` | 差分種別（added/modified/removed/none） |
| `progressRateDelta` | 進捗率の変化 |
| `pvDelta` | PVの変化 |
| `evDelta` | EVの変化 |

### 2.3 実装方針

TaskDiffオブジェクトから表示用のプレーンオブジェクトを生成し、必要なプロパティのみを含める。

```typescript
// 例: 表示用オブジェクトの生成
const displayData = taskDiffs.map(diff => ({
  id: diff.id,
  name: diff.name,
  diffType: diff.diffType,
  progressRateDelta: diff.progressRateDelta,
  pvDelta: diff.pvDelta,
  evDelta: diff.evDelta,
}));
console.table(displayData);
```

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の機能に影響を与えないこと |
| NF-02 | 出力の可読性が向上すること |

---

## 4. 受け入れ基準

| ID | 基準 |
|----|------|
| AC-01 | `pbevm-diff` の出力に `currentTask` が含まれない |
| AC-02 | `pbevm-diff` の出力に `prevTask` が含まれない |
| AC-03 | 差分情報（diffType, progressRateDelta等）は引き続き表示される |
| AC-04 | タスクの識別情報（id, name）は表示される |

---

## 5. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| GitHub Issue | #73 | pbevm-diff出力から不要なプロパティを除去 |
| 関連Issue | #72 | CLI出力から不要なプロパティを除去 |
| 詳細仕様書 | `docs/specs/domain/features/CLI.pbevm-diff-output.spec.md` | 変更仕様 |
| テストコード | `src/usecase/__tests__/pbevm-diff-usecase.test.ts` | 単体テスト（7件） |
| 実装 | `src/usecase/pbevm-diff-usecase.ts` | formatTaskDiffsForDisplay関数 |
| CLI実装 | `src/presentation/cli-pbevm-diff.ts` | pbevm-diffエントリーポイント |
| ドメイン | `src/domain/ProjectService.ts` | TaskDiff型定義 |

---

## 6. 受け入れ確認

| AC-ID | 確認方法 | 結果 |
|-------|---------|------|
| AC-01 | テスト TC-01 | ✅ PASS |
| AC-02 | テスト TC-02 | ✅ PASS |
| AC-03 | テスト TC-03 | ✅ PASS |
| AC-04 | テスト TC-03 | ✅ PASS |

**テスト実行結果**: 7件 PASS（2025-12-24）
