# 要件定義書: EVM指標の拡張（ETC'・完了予測日）

**要件ID**: REQ-EVM-001
**GitHub Issue**: #94
**作成日**: 2026-01-23
**ステータス**: Draft
**優先度**: High

---

## 1. 概要

EVMに出てくる数値をプロパティとして追加し、プロジェクトの完了予測を可能にする。具体的には、ETC'（残作業完了に必要な計画工数換算）と完了予測日を算出する機能を提供する。

---

## 2. 背景・目的

### 2.1 背景

- 現在のEVM実装では、PV（計画価値）、EV（出来高）、SPI（スケジュール効率）を計算できる
- しかし、「いつプロジェクトが終わるのか」という完了予測の機能がない
- EVMの本来の目的である「プロジェクト予測」を実現するためには、追加指標が必要
- 参考: [ITmedia: EVMの基礎](https://www.itmedia.co.jp/im/articles/0903/31/news118.html)

### 2.2 目的

1. 残作業完了に必要な計画工数換算（ETC'）を提供する
2. 現在のSPIが続いた場合の完了予測日を算出する
3. プロジェクトマネージャーが進捗リスクを早期に把握できるようにする

### 2.3 制約

- **AC（実コスト）は除外**: 人間の稼働工数の記録が困難なため、SPI版のETC'を使用する

---

## 3. 機能要件

### 3.1 主要機能

#### FR-01: ETC'（ETCダッシュ）の計算

| 項目 | 内容 |
|------|------|
| 計算式 | `ETC' = (BAC - EV) / SPI` |
| 意味 | 現在のSPIが続く場合、残作業完了に必要な計画工数換算の時間 |
| 単位 | 人日 |

> **注**: 元のETC = (BAC - EV) / CPI をSPI版に置き換え

#### FR-02: 完了予測日の計算

```
残作業量 = BAC - EV

将来の各日について:
  実際消化 = 日あたりPV × SPI
  残作業量から引いていく
  残作業量 ≤ 0 の日 = 完了予測日
```

#### FR-03: 日あたりPV（消化能力）の決定

| 優先度 | 方法 | 備考 |
|--------|------|------|
| 1 | 手入力（日あたりPV） | タスク待ち時などの補正用 |
| 2 | 自動計算（直近N日平均） | デフォルト N=7日（設定可能） |

**手入力が必要な理由**: 「5人いるのにPV 1.1人日が数日続く」（タスク待ち状態）のようなケースで、自動計算だと悲観的すぎる予測になるため。

#### FR-04: 計画終了日以降のPV

- **baseDate時点の直近N日平均を固定で使用**
- 理由: 「今のペースが続いたら」という予測としてシンプルで一貫性がある
- 異常時（タスク待ち等）は `dailyPvOverride` で手動補正可能

### 3.2 スコープ外

| 項目 | 理由 |
|------|------|
| AC（実コスト）の計算 | 人間の稼働工数の記録が困難 |
| CPI（コスト効率）の計算 | ACが取得できないため |
| 生産性カーブの調整 | 将来的にパラメータ調整可能な設計とするが、初期実装ではSPIを使用 |

---

## 4. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存のPV/EV/SPI計算に影響を与えないこと |
| NF-02 | 完了予測日の計算は、計画終了日から妥当な期間内（例: 2年以内）で収束すること |
| NF-03 | 既存のProjectクラス・TaskRowクラスのインターフェースを拡張する形式とすること |

---

## 5. 受け入れ基準

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | ETC'（残作業工数）が `(BAC - EV) / SPI` で正しく計算される |
| AC-02 | 完了予測日が、残作業量を将来PV × SPIで消化するロジックで算出される |
| AC-03 | 日あたりPVは手入力が指定されていればそれを使用し、なければ直近N日平均を使用する |
| AC-04 | 計画終了日を過ぎた日のPVは、baseDate時点の直近N日平均を固定で使用する |
| AC-05 | SPI = 0 または未定義の場合、ETC'と完了予測日は undefined を返す |
| AC-06 | 既存のPV/EV/SPI計算に影響がない（既存テストが全てPASS） |
| AC-07 | BAC = EVの場合（完了済み）、ETC' = 0、完了予測日 = baseDate を返す |

---

## 6. インターフェース設計（案）

### 6.1 型定義

```typescript
/**
 * 完了予測オプション
 */
interface CompletionForecastOptions {
  /** 手入力の日あたりPV（優先使用） */
  dailyPvOverride?: number
  /** 直近PV平均の計算日数（デフォルト: 7） */
  lookbackDays?: number
  /** 計算を打ち切る最大日数（デフォルト: 730 = 2年） */
  maxForecastDays?: number
}

/**
 * 完了予測結果
 */
interface CompletionForecast {
  /** ETC': 残作業完了に必要な計画工数換算 */
  etcPrime: number
  /** 完了予測日 */
  forecastDate: Date
  /** 使用した日あたりPV */
  usedDailyPv: number
  /** 使用したSPI */
  usedSpi: number
  /** 予測の信頼性（'high' | 'medium' | 'low'） */
  confidence: 'high' | 'medium' | 'low'
}
```

### 6.2 Projectクラスへの追加

```typescript
class Project {
  // 既存プロパティ...

  /**
   * プロジェクト全体のBAC（Budget at Completion）
   * 全リーフタスクの予定工数の合計
   */
  get bac(): number

  /**
   * プロジェクト全体のETC'（SPI版）
   * (BAC - 累積EV) / SPI
   */
  get etcPrime(): number | undefined

  /**
   * 完了予測を計算
   */
  calculateCompletionForecast(options?: CompletionForecastOptions): CompletionForecast | undefined
}
```

---

## 7. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| ブレストファイル | [`docs/brainstorm-evm-indicators.md`](../../brainstorm-evm-indicators.md) |
| 用語集 | [`docs/GLOSSARY.md`](../../GLOSSARY.md) |
| 設計書 | [`Project.completionForecast.spec.md`](../domain/features/Project.completionForecast.spec.md) |
| テスト | [`Project.completionForecast.test.ts`](../../../src/domain/__tests__/Project.completionForecast.test.ts) |

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2026-01-23 | 初版作成 | Claude Code |
