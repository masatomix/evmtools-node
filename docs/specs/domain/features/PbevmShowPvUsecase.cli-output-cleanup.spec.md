# PbevmShowPvUsecase.cli-output-cleanup 詳細仕様

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

| 問題点 | 表示内容 |
|-------|---------|
| `logger` | `[EventEmitter [Pino]]` - 内部ロガー |
| `calculateSPI` | `[Function (anonymous)]` - メソッド参照 |
| `calculateSV` | `[Function (anonymous)]` - メソッド参照 |

### 1.3 対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `src/usecase/pbevm-show-pv-usecase.ts` | 除外プロパティに追加 |

---

## 2. インターフェース仕様

### 2.1 変更前の実装

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

### 2.2 変更後の実装

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

---

## 3. 処理仕様

### 3.1 処理ロジック

```
1. taskRowsの各要素に対して、表示用オブジェクトを生成
2. 表示に必要なプロパティのみを明示的に選択
3. 日付プロパティは dateStr() で文字列変換
4. 内部プロパティ（logger, calculateSPI, calculateSV等）は含めない
```

### 3.2 除外対象プロパティ一覧

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

## 4. テストケース

### 4.1 正常系

| TC-ID | テスト内容 | 期待結果 |
|-------|-----------|---------|
| TC-01 | 出力オブジェクトに `logger` が含まれない | `logger` プロパティが存在しない |
| TC-02 | 出力オブジェクトに `calculateSPI` が含まれない | `calculateSPI` プロパティが存在しない |
| TC-03 | 出力オブジェクトに `calculateSV` が含まれない | `calculateSV` プロパティが存在しない |
| TC-04 | 必要なプロパティ（id, name, assignee等）は保持 | 主要プロパティが存在する |

---

## 5. エクスポート

該当なし（内部実装の変更のみ）

---

## 6. 使用例

該当なし（CLI出力の改善のため、使用方法に変更なし）

---

## 7. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

| 要件ID | 受け入れ基準 | 対応テストケース | 結果 |
|--------|-------------|-----------------|------|
| REQ-CLI-002 AC-01 | `pbevm-show-pv` の出力に `logger` が含まれない | TC-01 | ✅ PASS |
| REQ-CLI-002 AC-02 | `pbevm-show-pv` の出力に `calculateSPI` が含まれない | TC-02 | ✅ PASS |
| REQ-CLI-002 AC-03 | `pbevm-show-pv` の出力に `calculateSV` が含まれない | TC-03 | ✅ PASS |
| REQ-CLI-002 AC-05 | 必要なEVMデータ（PV, EV, SPI等）は引き続き表示される | TC-04 | ✅ PASS |

**テストファイル**: `src/usecase/__tests__/pbevm-show-pv-usecase.test.ts`

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-24 | 初版作成 | REQ-CLI-002 |
