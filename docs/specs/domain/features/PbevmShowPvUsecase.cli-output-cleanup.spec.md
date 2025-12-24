# PbevmShowPvUsecase CLI出力整形 詳細仕様

**バージョン**: 1.0.0
**作成日**: 2025-12-24
**要件ID**: REQ-CLI-002
**GitHub Issue**: #72
**ソースファイル**: `src/usecase/pbevm-show-pv-usecase.ts`

---

## 1. 概要

### 1.1 目的

`PbevmShowPvUsecase` の `console.table()` 出力から、内部実装用のプロパティを除去し、ユーザーにとって意味のあるデータのみを表示する。

### 1.2 現状の問題

TaskRow オブジェクトを `console.table()` で表示する際、以下の内部プロパティが出力されている：

| プロパティ | 表示内容 | 問題 |
|-----------|---------|------|
| `logger` | `[EventEmitter [Pino]]` | 内部ロガー |
| `calculateSPI` | `[Function (anonymous)]` | メソッド参照 |
| `calculateSV` | `[Function (anonymous)]` | メソッド参照 |

### 1.3 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/usecase/pbevm-show-pv-usecase.ts` | 除外プロパティに追加 |

---

## 2. 設計詳細

### 2.1 現状の実装

```typescript
const results = taskRows.map((taskRow) => {
    const {
        calculatePV,
        calculatePVs,
        plotMap,
        checkStartEndDateAndPlotMap,
        startDate,
        endDate,
        actualStartDate,
        actualEndDate,
        expectedProgressDate,
        ...rest // ← ここに logger, calculateSPI, calculateSV が含まれる
    } = taskRow
    return { ...rest, /* 日付変換 */ }
})
```

### 2.2 修正後の実装

**注**: `logger` は private プロパティのため、デストラクチャリングでは除外できない。
そのため、必要なプロパティを明示的に選択するアプローチを採用。

```typescript
// 表示用データに変換（内部プロパティを除外）
// Issue #72: logger, calculateSPI, calculateSV などを除去
const results = taskRows.map((taskRow) => ({
    sharp: taskRow.sharp,
    id: taskRow.id,
    level: taskRow.level,
    name: taskRow.name,
    assignee: taskRow.assignee,
    workload: taskRow.workload,
    予定開始日: dateStr(taskRow.startDate),
    予定終了日: dateStr(taskRow.endDate),
    実績開始日: dateStr(taskRow.actualStartDate),
    実績終了日: dateStr(taskRow.actualEndDate),
    progressRate: taskRow.progressRate,
    scheduledWorkDays: taskRow.scheduledWorkDays,
    pv: taskRow.pv,
    ev: taskRow.ev,
    spi: taskRow.spi,
    進捗応当日: dateStr(taskRow.expectedProgressDate),
    delayDays: taskRow.delayDays,
    remarks: taskRow.remarks,
    parentId: taskRow.parentId,
    isLeaf: taskRow.isLeaf,
}))
```

### 2.3 除外対象プロパティ一覧

| プロパティ | 除外理由 | 既存/追加 |
|-----------|---------|----------|
| `calculatePV` | メソッド | 既存 |
| `calculatePVs` | メソッド | 既存 |
| `calculateSPI` | メソッド | **追加** |
| `calculateSV` | メソッド | **追加** |
| `plotMap` | 内部データ | 既存 |
| `checkStartEndDateAndPlotMap` | メソッド | 既存 |
| `logger` | 内部ロガー | **追加** |

---

## 3. テストシナリオ

### 3.1 単体テスト

| ID | テストケース | 期待結果 |
|----|-------------|---------|
| T-01 | 出力オブジェクトに `logger` が含まれない | `logger` プロパティが存在しない |
| T-02 | 出力オブジェクトに `calculateSPI` が含まれない | `calculateSPI` プロパティが存在しない |
| T-03 | 出力オブジェクトに `calculateSV` が含まれない | `calculateSV` プロパティが存在しない |
| T-04 | 必要なプロパティ（id, name, assignee等）は保持 | 主要プロパティが存在する |

---

## 4. 要件トレーサビリティ

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-CLI-002 AC-01 | `pbevm-show-pv` の出力に `logger` が含まれない | T-01 | ✅ PASS |
| REQ-CLI-002 AC-02 | `pbevm-show-pv` の出力に `calculateSPI` が含まれない | T-02 | ✅ PASS |
| REQ-CLI-002 AC-03 | `pbevm-show-pv` の出力に `calculateSV` が含まれない | T-03 | ✅ PASS |
| REQ-CLI-002 AC-05 | 必要なEVMデータ（PV, EV, SPI等）は引き続き表示される | T-04 | ✅ PASS |

**テストファイル**: `src/usecase/__tests__/pbevm-show-pv-usecase.test.ts`

---

## 5. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-24 | 初版作成 | REQ-CLI-002 |
