# 要件定義書: CLI出力から不要なプロパティを除去

**要件ID**: REQ-CLI-002
**GitHub Issue**: #72
**作成日**: 2025-12-24
**更新日**: 2025-12-24
**ステータス**: Approved
**優先度**: Medium

---

## 1. 概要

### 1.1 目的

CLIコマンド（`pbevm-show-pv`, `pbevm-show-project`）の出力から、内部実装用の不要なプロパティを除去し、ユーザーにとって意味のあるデータのみを表示する。

### 1.2 背景

現在のCLI出力では、`console.table()` で TaskRow オブジェクトを直接表示しているため、以下の内部プロパティが出力されている：

- `logger` - `[EventEmitter [Pino]]`（ロガーインスタンス）
- `calculateSPI` - `[Function (anonymous)]`（メソッド）
- `calculateSV` - `[Function (anonymous)]`（メソッド）

これらはユーザーにとって不要であり、出力の可読性を低下させている。

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| `pbevm-show-pv` の出力整形 | ✅ |
| `pbevm-show-project` の出力整形 | - （将来対応） |
| `pbevm-diff` の対応 | 別Issue (#73) |

---

## 2. 機能要件

### 2.1 除去対象プロパティ

以下のプロパティをCLI出力から除去する：

| プロパティ | 型 | 除去理由 |
|-----------|-----|---------|
| `logger` | Pino Logger | 内部ロギング用 |
| `calculateSPI` | Function | メソッド参照 |
| `calculateSV` | Function | メソッド参照 |

### 2.2 実装方針

TaskRowオブジェクトから表示用のプレーンオブジェクトを生成し、必要なプロパティのみを含める。

```typescript
// 例: 表示用オブジェクトの生成
const displayData = taskRows.map(row => ({
  sharp: row.sharp,
  id: row.id,
  name: row.name,
  assignee: row.assignee,
  // ... 必要なプロパティのみ
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

| ID | 基準 | 検証状況 |
|----|------|:--------:|
| AC-01 | `pbevm-show-pv` の出力に `logger` が含まれない | ✅ |
| AC-02 | `pbevm-show-pv` の出力に `calculateSPI` が含まれない | ✅ |
| AC-03 | `pbevm-show-pv` の出力に `calculateSV` が含まれない | ✅ |
| AC-04 | `pbevm-show-project` の出力にも上記が含まれない | - （スコープ外） |
| AC-05 | 必要なEVMデータ（PV, EV, SPI等）は引き続き表示される | ✅ |

**注**: AC-04（pbevm-show-project）は本Issue のスコープ外とし、将来のIssueで対応予定。

---

## 5. トレーサビリティ

| 成果物 | パス |
|--------|------|
| 案件設計書 | [`PbevmShowPvUsecase.cli-output-cleanup.spec.md`](../domain/features/PbevmShowPvUsecase.cli-output-cleanup.spec.md) |
| テストコード | [`pbevm-show-pv-usecase.test.ts`](../../../src/usecase/__tests__/pbevm-show-pv-usecase.test.ts) |
| 実装 | [`pbevm-show-pv-usecase.ts`](../../../src/usecase/pbevm-show-pv-usecase.ts) |

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| GitHub Issue | #72 | CLI出力から不要なプロパティを除去 |
| 関連Issue | #73 | pbevm-diff出力から不要なプロパティを除去 |
| CLI実装 | [`cli-pbevm-show-pv.ts`](../../../src/presentation/cli-pbevm-show-pv.ts) | pbevm-show-pv実装 |
| CLI実装 | [`cli-pbevm-show-project.ts`](../../../src/presentation/cli-pbevm-show-project.ts) | pbevm-show-project実装 |
