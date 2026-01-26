# 要件定義書: Project 重複アクセサの削除

**要件ID**: REQ-REFACTOR-001
**GitHub Issue**: #142
**作成日**: 2026-01-26
**ステータス**: Draft
**優先度**: Medium

---

## 1. 概要

### 1.1 目的

`Project` クラスに追加された便利アクセサ（`bac`, `totalEv`, `etcPrime`）が `statisticsByProject` と重複した計算を行っている。設計の一貫性と効率性の観点からこれらを削除し、統計情報は `statisticsByProject` / `getStatistics()` に集約する。

### 1.2 背景

- `bac`, `totalEv`, `etcPrime` は `statisticsByProject[0]` から導出可能な値
- これらを連続で呼び出すと `statisticsByProject` が複数回計算される非効率性
- 仕様書（`Project.spec.md`）で定義されているが、利便性のために追加された経緯がある
- 設計レビューの結果、「キメラ化」の傾向が指摘された

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| `bac` プロパティの削除 | ✅ |
| `totalEv` プロパティの削除 | ✅ |
| `etcPrime` プロパティの削除 | ✅ |
| 仕様書の更新 | ✅ |
| テストの更新 | ✅ |

---

## 2. 機能要件

### 2.1 削除対象

以下のプロパティを `Project` クラスから削除する:

| プロパティ | 現在の実装 | 導出元 |
|-----------|-----------|--------|
| `get bac(): number` | `statisticsByProject[0]?.totalWorkloadExcel ?? 0` | `statisticsByProject` |
| `get totalEv(): number` | `statisticsByProject[0]?.totalEv ?? 0` | `statisticsByProject` |
| `get etcPrime(): number \| undefined` | `(bac - ev) / spi` | `statisticsByProject` |

### 2.2 移行ガイド

削除後は以下のように呼び出し側で対応する:

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

### 2.3 影響範囲

削除対象プロパティの使用箇所（調査結果）:

#### 2.3.1 Project.ts 内部での使用（要修正）

| 箇所 | プロパティ | 対応 |
|------|-----------|------|
| `etcPrime` getter 内 | `this.bac`, `this.totalEv` | プロパティ削除で自動解消 |
| `calculateCompletionForecast()` 内 | `this.bac`, `this.totalEv` | `statisticsByProject` から取得するよう修正 |

#### 2.3.2 テストファイル（要修正）

| ファイル | プロパティ | 行番号 |
|---------|-----------|--------|
| `Project.completionForecast.test.ts` | `project.bac` | 143, 171, 178, 216, 624 |
| `Project.completionForecast.test.ts` | `project.totalEv` | 675 |
| `Project.completionForecast.test.ts` | `project.etcPrime` | 239, 251, 258 |

#### 2.3.3 影響なし（統計オブジェクトのプロパティ）

以下は `ProjectStatistics` 型のプロパティ（`stats.totalEv`, `stats.etcPrime`）であり、削除対象外:

- `CsvProjectCreator.integration.test.ts` - `stat.totalEv`
- `Project.filterStatistics.test.ts` - `stats.totalEv`, `stats.etcPrime`

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の `statisticsByProject` / `getStatistics()` の動作に影響を与えないこと |
| NF-02 | 削除により、連続呼び出し時の重複計算が解消されること |

---

## 4. インターフェース設計

### 4.1 削除後の Project クラス（該当部分）

```typescript
class Project {
  // 以下のプロパティを削除:
  // get bac(): number
  // get totalEv(): number
  // get etcPrime(): number | undefined

  // 以下は維持:
  get statisticsByProject(): ProjectStatistics[]
  getStatistics(): ProjectStatistics
  getStatistics(options: StatisticsOptions): ProjectStatistics
  getStatistics(tasks: TaskRow[]): ProjectStatistics
}
```

### 4.2 推奨される使用方法

```typescript
// プロジェクト統計を一括取得
const stats = project.statisticsByProject[0]

// 必要な値を取り出す
const bac = stats?.totalWorkloadExcel ?? 0
const totalEv = stats?.totalEv ?? 0
const etcPrime = stats?.etcPrime
const spi = stats?.spi
```

---

## 5. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | `bac` プロパティが削除されていること | ⏳ | TC-01 |
| AC-02 | `totalEv` プロパティが削除されていること | ⏳ | TC-02 |
| AC-03 | `etcPrime` プロパティが削除されていること | ⏳ | TC-03 |
| AC-04 | `statisticsByProject` が正常に動作すること | ⏳ | TC-04 |
| AC-05 | 既存テスト（削除プロパティ以外）が全てPASSすること | ⏳ | 既存テスト |
| AC-06 | 仕様書（`Project.spec.md`）が更新されていること | ⏳ | ドキュメント確認 |

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| マスター設計書 | [`Project.spec.md`](../domain/master/Project.spec.md) | 更新対象 |
| 案件設計書 | [`Project.remove-dup-accessors.spec.md`](../domain/features/Project.remove-dup-accessors.spec.md) | 本案件の詳細仕様 |
| 実装 | [`Project.ts`](../../../src/domain/Project.ts) | 削除対象のプロパティ |

---

## 7. 備考

### 7.1 設計の経緯

- `bac`, `totalEv`, `etcPrime` は REQ-EVM-001 で追加された便利アクセサ
- 設計レビューで「キメラ化」の傾向が指摘され、削除を決定
- 統計情報は `statisticsByProject` / `getStatistics()` に集約することで設計の一貫性を確保

### 7.2 互換性

- 本変更は**破壊的変更（Breaking Change）**に該当
- 外部からこれらのプロパティを使用している場合は修正が必要
- 移行ガイド（セクション2.2）を参照して対応
