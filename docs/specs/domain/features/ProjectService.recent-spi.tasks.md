# タスク管理: ProjectService.calculateRecentSpi

**要件ID**: REQ-SPI-001
**GitHub Issue**: #139
**ブランチ**: `feature/139-recent-spi`
**作成日**: 2026-01-27

---

## 進捗サマリー

| フェーズ | 状態 | 完了日 |
|---------|:----:|--------|
| 要件定義 | ✅ | 2026-01-27 |
| 詳細設計 | ✅ | 2026-01-27 |
| テストコード | ⬜ | - |
| 実装 | ⬜ | - |
| 統合テスト | ⬜ | - |
| トレーサビリティ更新 | ⬜ | - |
| マスター設計書反映 | ⬜ | - |

---

## タスク一覧

### Phase 1: 仕様策定 ✅

- [x] **T-01**: 要件定義書作成 (`REQ-SPI-001.md`)
- [x] **T-02**: 詳細設計書作成 (`ProjectService.recent-spi.spec.md`)
- [x] **T-03**: タスク管理ファイル作成（本ファイル）

### Phase 2: テスト作成

- [ ] **T-04**: テストファイル作成 (`ProjectService.recent-spi.test.ts`)
  - TC-01〜TC-04: 正常系テスト
  - TC-05〜TC-08: 境界値テスト
  - TC-09〜TC-12: 警告テスト
  - TC-13: 既存テスト影響確認

### Phase 3: 実装

- [ ] **T-05**: `RecentSpiOptions` 型定義を追加
- [ ] **T-06**: `calculateRecentSpi()` メソッド実装
- [ ] **T-07**: `_warnIfPeriodTooLong()` 内部メソッド実装
- [ ] **T-08**: エクスポート追加（`src/domain/index.ts`）

### Phase 4: 検証

- [ ] **T-09**: 全テスト実行・PASS確認
- [ ] **T-10**: 既存テスト（223件）がPASSすることを確認
- [ ] **T-11**: lint / format チェック

### Phase 5: ドキュメント更新

- [ ] **T-12**: 要件トレーサビリティ更新（設計書）
- [ ] **T-13**: マスター設計書への反映（`ProjectService.spec.md` 作成 or 更新）

---

## タスク詳細

### T-04: テストファイル作成

**ファイル**: `src/domain/__tests__/ProjectService.recent-spi.test.ts`

```typescript
describe('ProjectService.calculateRecentSpi', () => {
  describe('正常系', () => {
    // TC-01: 1点渡し
    // TC-02: 2点渡し
    // TC-03: N点渡し
    // TC-04: フィルタ付き
  })
  describe('境界値', () => {
    // TC-05: 空配列
    // TC-06: 全SPIがundefined
    // TC-07: 一部SPIがundefined
    // TC-08: SPI=0のProject
  })
  describe('警告テスト', () => {
    // TC-09: 期間30日以内（警告なし）
    // TC-10: 期間30日超（警告あり）
    // TC-11: 閾値カスタム
    // TC-12: 1点のみ（チェック対象外）
  })
  describe('既存機能への影響', () => {
    // TC-13: 既存テストがPASS
  })
})
```

### T-05: 型定義追加

**ファイル**: `src/domain/ProjectService.ts`

```typescript
import { TaskFilterOptions } from './Project'

export interface RecentSpiOptions extends TaskFilterOptions {
  warnThresholdDays?: number
}
```

### T-06: メソッド実装

**ファイル**: `src/domain/ProjectService.ts`

```typescript
calculateRecentSpi(
  projects: Project[],
  options?: RecentSpiOptions
): number | undefined {
  if (projects.length === 0) return undefined

  this._warnIfPeriodTooLong(projects, options?.warnThresholdDays ?? 30)

  const spis = projects
    .map(p => p.getStatistics(options ?? {}).spi)
    .filter((spi): spi is number => spi !== undefined)

  if (spis.length === 0) return undefined

  return spis.reduce((a, b) => a + b, 0) / spis.length
}
```

### T-07: 警告メソッド実装

```typescript
private _warnIfPeriodTooLong(
  projects: Project[],
  thresholdDays: number
): void {
  if (projects.length < 2) return

  const sorted = [...projects].sort(
    (a, b) => a.baseDate.getTime() - b.baseDate.getTime()
  )
  const oldest = sorted[0].baseDate
  const newest = sorted[sorted.length - 1].baseDate

  const diffMs = newest.getTime() - oldest.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > thresholdDays) {
    logger.warn(
      `calculateRecentSpi: 期間が ${diffDays} 日と長いです。` +
      `直近SPIとしては不適切な可能性があります（閾値: ${thresholdDays} 日）`
    )
  }
}
```

---

## 依存関係

```
T-01 ─┬─► T-02 ─► T-03
      │
      └─► T-04 ─► T-05 ─► T-06 ─► T-07 ─► T-08
                                           │
                                           ▼
                                    T-09 ─► T-10 ─► T-11
                                           │
                                           ▼
                                    T-12 ─► T-13
```

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-27 | 初版作成 |
