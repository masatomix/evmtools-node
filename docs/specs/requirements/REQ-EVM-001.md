# 要件定義書: EVM指標の拡張（ETC'・完了予測日）

**要件ID**: REQ-EVM-001
**GitHub Issue**: #94
**作成日**: 2025-01-22
**ステータス**: Draft
**優先度**: High

---

## 1. 概要

EVMに出てくる数値をプロパティとして追加し、プロジェクトの完了予測を可能にする。

## 2. 背景・目的

### 2.1 背景

- 現在のシステムではPV、EV、SPIなどの基本的なEVM指標は計算可能
- しかし「いつ終わるか」という完了予測ができない
- プロジェクト管理において完了予測は重要な意思決定要素
- 参考: [ITmedia: EVMの基礎](https://www.itmedia.co.jp/im/articles/0903/31/news118.html)

### 2.2 目的

- **ETC'（残作業工数予測）**: 現在のペースで残作業を完了するために必要な計画工数換算の時間を提供
- **完了予測日**: プロジェクトがいつ終わるかの具体的な日付を予測

### 2.3 制約

- **AC（実コスト）は除外**: 人間の稼働工数の記録が困難なため、AC関連の指標は対象外

---

## 3. 機能要件

### 3.1 追加する指標

| 指標 | 計算式 | 型 | 説明 |
|------|--------|-----|------|
| **BAC** | Σ(リーフタスクのPV) | `number` | 完成時総予算（Budget at Completion） |
| **ETC'** | `(BAC - EV) / SPI` | `number` | 残作業完了に必要な計画工数換算 |
| **完了予測日** | 下記ロジック | `Date` | プロジェクト完了の予測日 |

### 3.2 ETC'（ETCダッシュ/ETCプライム）

- **元のETC**: `(BAC - EV) / CPI` をSPI版に置き換え
- **意味**: 現在のSPIが続く場合、残作業完了に必要な計画工数換算の時間
- **プロパティ名**: `etcPrime`

```
ETC' = (BAC - EV) / SPI

例:
  BAC = 100人日
  EV = 40人日
  SPI = 0.8
  ETC' = (100 - 40) / 0.8 = 75人日
  → 残り60人日の作業に、現在のペースだと75人日かかる
```

### 3.3 完了予測日の計算ロジック

```
入力:
  - BAC: 完成時総予算
  - EV: 現在の出来高
  - SPI: スケジュール効率指標
  - dailyPV: 日あたりPV（消化能力）
  - baseDate: 基準日

ロジック:
  残作業量 = BAC - EV
  currentDate = baseDate

  while 残作業量 > 0:
    dailyProgress = dailyPV × SPI
    残作業量 -= dailyProgress
    currentDate += 1稼働日

  return currentDate
```

### 3.4 日あたりPV（消化能力）の決定

| 優先度 | 方法 | 備考 |
|--------|------|------|
| 1 | **手入力**（dailyPVOverride） | タスク待ち時などの補正用 |
| 2 | **自動計算**（直近N日平均） | デフォルト N=7日 |
| 3 | **期間平均PV** | BAC / 計画稼働日数（フォールバック） |

#### 手入力が必要な理由

「5人いるのにPV 1.1人日が数日続く」（タスク待ち状態）のようなケースで、自動計算だと悲観的すぎる予測になるため。

### 3.5 計画終了日以降のPV

- 計画期間を超過した場合は **期間平均PV** = `BAC / 計画稼働日数` を使用

### 3.6 スコープ外

- AC（実コスト）関連の指標（CPI、EAC、VAC等）
- 生産性のライフサイクル補正（将来対応）

---

## 4. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存のPV/EV計算に影響を与えないこと |
| NF-02 | 1000タスク規模のプロジェクトでも1秒以内に計算できること |
| NF-03 | 既存のProjectクラスのインターフェースを維持すること |

---

## 5. 受け入れ基準

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | Project.bacでBAC（完成時総予算）を取得できる |
| AC-02 | Project.etcPrimeでETC'を取得できる |
| AC-03 | Project.estimatedCompletionDateで完了予測日を取得できる |
| AC-04 | SPI=1.0の場合、完了予測日が計画終了日と一致する |
| AC-05 | SPI<1.0の場合、完了予測日が計画終了日より後になる |
| AC-06 | SPI>1.0の場合、完了予測日が計画終了日より前になる |
| AC-07 | dailyPVOverrideを指定した場合、その値が日あたりPVとして使用される |
| AC-08 | 既存のテストが全てPASSすること |

---

## 6. インターフェース設計（案）

### 6.1 Projectクラスへの追加プロパティ

```typescript
class Project {
  // 既存プロパティ...

  /** 完成時総予算（Budget at Completion） */
  get bac(): number

  /** 現在の出来高合計 */
  get totalEv(): number

  /** プロジェクト全体のSPI */
  get totalSpi(): number

  /** ETC'（残作業完了に必要な計画工数換算） */
  get etcPrime(): number

  /** 日あたりPV（消化能力） */
  get dailyPv(): number

  /** 完了予測日 */
  get estimatedCompletionDate(): Date

  /** 日あたりPVの手動オーバーライド（オプション） */
  setDailyPvOverride(value: number | undefined): void
}
```

### 6.2 計算に必要な補助メソッド

```typescript
class Project {
  /** 直近N日間の平均日あたりPVを計算 */
  private calculateRecentDailyPv(days: number): number

  /** 期間平均PVを計算 */
  private calculateAverageDailyPv(): number

  /** 完了予測日を計算 */
  private calculateEstimatedCompletionDate(): Date
}
```

---

## 7. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| 設計書 | [`Project.evm-indicators.spec.md`](../domain/features/Project.evm-indicators.spec.md) |
| テスト | [`Project.evm-indicators.test.ts`](../../../src/domain/__tests__/Project.evm-indicators.test.ts) |
| 実装 | [`Project.ts`](../../../src/domain/Project.ts) |
| GLOSSARY | [`GLOSSARY.md`](../../GLOSSARY.md) |
| ブレスト | [`brainstorm-evm-indicators.md`](../../brainstorm-evm-indicators.md) |

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2025-01-22 | 初版作成 | Claude Code |
