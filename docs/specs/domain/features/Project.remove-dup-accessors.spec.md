# Project.remove-dup-accessors 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2026-01-26
**要件ID**: REQ-REFACTOR-001
**GitHub Issue**: #142
**ソースファイル**: `src/domain/Project.ts`

---

## 1. 概要

### 1.1 目的

`Project` クラスから重複アクセサ（`bac`, `totalEv`, `etcPrime`）を削除し、統計情報は `statisticsByProject` / `getStatistics()` に集約する。これにより設計の一貫性を回復し、重複計算を解消する。

### 1.2 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/domain/Project.ts` | `bac`, `totalEv`, `etcPrime` getterを削除、内部参照を修正 |
| `src/domain/__tests__/Project.completionForecast.test.ts` | 削除プロパティを参照しているテストを修正 |
| `docs/specs/domain/master/Project.spec.md` | 削除プロパティをドキュメントから削除 |

---

## 2. 削除対象仕様

### 2.1 削除するプロパティ

以下の3つの getter を `Project` クラスから削除する：

```typescript
// 削除対象 1: bac
get bac(): number {
    const stats = this.statisticsByProject[0]
    return stats?.totalWorkloadExcel ?? 0
}

// 削除対象 2: totalEv
get totalEv(): number {
    const stats = this.statisticsByProject[0]
    return stats?.totalEv ?? 0
}

// 削除対象 3: etcPrime
get etcPrime(): number | undefined {
    const stats = this.statisticsByProject[0]
    const spi = stats?.spi
    if (spi === undefined || spi === null || spi === 0) return undefined
    const ev = this.totalEv
    return (this.bac - ev) / spi
}
```

### 2.2 削除理由

| プロパティ | 導出元 | 削除理由 |
|-----------|--------|---------|
| `bac` | `statisticsByProject[0].totalWorkloadExcel` | 重複 |
| `totalEv` | `statisticsByProject[0].totalEv` | 重複 |
| `etcPrime` | `statisticsByProject[0].etcPrime` | 重複、内部で `bac`, `totalEv` を使用 |

---

## 3. 内部修正仕様

### 3.1 `calculateCompletionForecast()` の修正

現在の実装では `this.bac` と `this.totalEv` を参照しているため、`statisticsByProject` から取得するよう修正する。

**Before:**
```typescript
calculateCompletionForecast(options?: CompletionForecastOptions): CompletionForecast | undefined {
    // ...
    const ev = this.totalEv
    const bac = this.bac
    // ...
}
```

**After:**
```typescript
calculateCompletionForecast(options?: CompletionForecastOptions): CompletionForecast | undefined {
    // ...
    const stats = this.statisticsByProject[0]
    const ev = stats?.totalEv ?? 0
    const bac = stats?.totalWorkloadExcel ?? 0
    // ...
}
```

---

## 4. テスト修正仕様

### 4.1 削除するテスト

`Project.completionForecast.test.ts` から以下のテストを削除または修正：

| テスト内容 | 現在の実装 | 対応 |
|-----------|-----------|------|
| `project.bac` の検証 | `expect(project.bac).toBe(60)` 等 | `project.statisticsByProject[0]?.totalWorkloadExcel` に変更 |
| `project.totalEv` の検証 | `expect(typeof project.totalEv).toBe('number')` | `project.statisticsByProject[0]?.totalEv` に変更 |
| `project.etcPrime` の検証 | `expect(project.etcPrime).toBeUndefined()` 等 | `project.statisticsByProject[0]?.etcPrime` に変更 |

### 4.2 テスト修正例

**Before:**
```typescript
it('BACは全リーフタスクのworkload合計', () => {
    expect(project.bac).toBe(60)
})
```

**After:**
```typescript
it('BACは全リーフタスクのworkload合計', () => {
    const stats = project.statisticsByProject[0]
    expect(stats?.totalWorkloadExcel).toBe(60)
})
```

---

## 5. テストケース

### 5.1 削除確認テスト

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | `project.bac` にアクセスするとTypeScriptエラー | コンパイルエラー（プロパティ不存在） |
| TC-02 | `project.totalEv` にアクセスするとTypeScriptエラー | コンパイルエラー（プロパティ不存在） |
| TC-03 | `project.etcPrime` にアクセスするとTypeScriptエラー | コンパイルエラー（プロパティ不存在） |

### 5.2 既存機能の動作確認

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-04 | `statisticsByProject[0].totalWorkloadExcel` で BAC 取得 | 正しい値が返る |
| TC-05 | `statisticsByProject[0].totalEv` で EV 取得 | 正しい値が返る |
| TC-06 | `statisticsByProject[0].etcPrime` で ETC' 取得 | 正しい値が返る（SPI=0時はundefined） |
| TC-07 | `calculateCompletionForecast()` が正常動作 | 削除後も同じ結果を返す |

### 5.3 既存テストのPASS確認

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-08 | 既存テスト全件実行 | 全てPASS（修正後） |

---

## 6. 移行ガイド

### 6.1 呼び出し側の修正

**Before:**
```typescript
const bac = project.bac
const totalEv = project.totalEv
const etcPrime = project.etcPrime
```

**After:**
```typescript
const stats = project.statisticsByProject[0]
const bac = stats?.totalWorkloadExcel ?? 0
const totalEv = stats?.totalEv ?? 0
const etcPrime = stats?.etcPrime
```

### 6.2 メリット

1. **効率性向上**: 連続呼び出し時の重複計算が解消
2. **設計の一貫性**: 統計情報は `statisticsByProject` に集約
3. **保守性向上**: 単一の情報源（Single Source of Truth）

---

## 7. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-REFACTOR-001 AC-01 | `bac` プロパティが削除されていること | TC-01 | ⬜ 未実施 |
| REQ-REFACTOR-001 AC-02 | `totalEv` プロパティが削除されていること | TC-02 | ⬜ 未実施 |
| REQ-REFACTOR-001 AC-03 | `etcPrime` プロパティが削除されていること | TC-03 | ⬜ 未実施 |
| REQ-REFACTOR-001 AC-04 | `statisticsByProject` が正常に動作すること | TC-04〜TC-06 | ⬜ 未実施 |
| REQ-REFACTOR-001 AC-05 | 既存テストが全てPASSすること | TC-08 | ⬜ 未実施 |
| REQ-REFACTOR-001 AC-06 | 仕様書が更新されていること | ドキュメント確認 | ⬜ 未実施 |

**テストファイル**: `src/domain/__tests__/Project.completionForecast.test.ts`

---

## 8. マスター設計書への反映

### 8.1 削除するセクション

`docs/specs/domain/master/Project.spec.md` から以下を削除：

1. **セクション3.2「公開プロパティ」** から `bac`, `totalEv`, `etcPrime` を削除
2. **セクション6.7「bac/totalEv/etcPrime テスト」** を削除
3. **セクション9「テストケース数サマリ」** の件数を更新

### 8.2 変更履歴への追記

```markdown
| 1.5.0 | 2026-01-26 | 重複アクセサ（bac, totalEv, etcPrime）を削除 | REQ-REFACTOR-001 |
```

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2026-01-26 | 初版作成 | REQ-REFACTOR-001 |
