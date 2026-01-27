# Project.spiOverride タスク管理

**要件ID**: REQ-SPI-002
**GitHub Issue**: #147
**作成日**: 2026-01-28

---

## タスク一覧

| Task ID | タスク | ステータス | 備考 |
|---------|-------|----------|------|
| TASK-01 | 要件定義書作成 | ✅ | REQ-SPI-002.md |
| TASK-02 | 詳細設計書作成 | ✅ | Project.spiOverride.spec.md |
| TASK-03 | テストコード作成 | ⬜ | 13件 |
| TASK-04 | 実装 | ⬜ | Project.ts 変更 |
| TASK-05 | 統合テスト | ⬜ | 全テスト実行 |
| TASK-06 | トレーサビリティ更新 | ⬜ | AC → TC 結果更新 |
| TASK-07 | マスター設計書反映 | ⬜ | Project.spec.md |

---

## タスク詳細

### TASK-03: テストコード作成

**ファイル**: `src/domain/__tests__/Project.spiOverride.test.ts`（新規）

テストケース（13件）:
- TC-01: spiOverride 指定で usedSpi が設定される
- TC-02: spiOverride 指定で confidence が high
- TC-03: spiOverride + dailyPvOverride 併用
- TC-04: spiOverride + filter 併用
- TC-05: ETC' = remainingWork / spiOverride
- TC-06: dailyBurnRate = dailyPv * spiOverride
- TC-07: spiOverride で高信頼（SPI範囲外でも）
- TC-08: confidenceReason が正しい
- TC-09: spiOverride: 0 で undefined
- TC-10: spiOverride: 負の値で undefined
- TC-11: spiOverride: 非常に小さい値
- TC-12: spiOverride 未指定時は累積SPI使用
- TC-13: 既存テストが全てPASS

---

### TASK-04: 実装

**ファイル**: `src/domain/Project.ts`

変更箇所:

1. **CompletionForecastOptions に spiOverride 追加**（行928-935）
   ```typescript
   spiOverride?: number
   ```

2. **SPI決定ロジック変更**（行667-670）
   ```typescript
   const usedSpi = options?.spiOverride ?? basicStats.spi
   if (usedSpi === undefined || usedSpi === null || usedSpi <= 0) {
       return undefined
   }
   ```

3. **完了済みケース修正**（行684）
   ```typescript
   usedSpi: usedSpi,
   ```

4. **ETC'計算**（行700）
   ```typescript
   const etcPrime = remainingWork / usedSpi
   ```

5. **dailyBurnRate計算**（行703）
   ```typescript
   const dailyBurnRate = usedDailyPv * usedSpi
   ```

6. **determineConfidence呼び出し変更**（行725-729）
   ```typescript
   const { confidence, confidenceReason } = this.determineConfidence(
       usedSpi,
       options?.dailyPvOverride !== undefined,
       options?.spiOverride !== undefined,
       currentDate
   )
   ```

7. **戻り値修正**（行736）
   ```typescript
   usedSpi: usedSpi,
   ```

8. **determineConfidenceシグネチャ変更**（行746-777）
   ```typescript
   private determineConfidence(
       spi: number,
       hasDailyPvOverride: boolean,
       hasSpiOverride: boolean,
       forecastDate: Date
   ): { confidence: 'high' | 'medium' | 'low'; confidenceReason: string } {
       if (hasSpiOverride) {
           return { confidence: 'high', confidenceReason: 'ユーザーがSPIを指定' }
       }
       // ...既存ロジック...
   }
   ```

---

### TASK-05: 統合テスト

```bash
npm test
```

全テストがPASSすることを確認。

---

### TASK-06: トレーサビリティ更新

`Project.spiOverride.spec.md` のセクション5「要件トレーサビリティ」を更新:
- 各AC-IDのステータスを ✅ PASS に変更

---

### TASK-07: マスター設計書反映

**ファイル**: `docs/specs/domain/master/Project.spec.md`

更新箇所:
1. `CompletionForecastOptions` 型定義（セクション5.15）に `spiOverride` 追加
2. テスト同値クラス表に追加
3. 変更履歴に REQ-SPI-002 を追加

---

## 進捗サマリ

| フェーズ | 完了 | 合計 | 進捗 |
|---------|-----|-----|------|
| 設計 | 2 | 2 | 100% |
| テスト | 0 | 1 | 0% |
| 実装 | 0 | 1 | 0% |
| 検証 | 0 | 1 | 0% |
| ドキュメント | 0 | 2 | 0% |
| **合計** | **2** | **7** | **29%** |

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-28 | 初版作成 |
