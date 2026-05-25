# EVM ドメイン知識

本プロジェクトは EVM（アーンドバリューマネジメント）という専門領域に基づく。このドメインを理解せずに正しい実装判断はできない。

## コア用語

| 用語 | 意味 |
|------|------|
| **Project** | タスクツリー・基準日・休日カレンダー・メタデータを持つ集約ルート |
| **TaskRow** | フラットなタスクレコード。日程・実績・EVM メトリクス算出メソッドを持つ |
| **TaskNode** | TaskRow を継承した階層ツリーノード（親子関係の走査用） |
| **BaseDate（基準日）** | EVM 評価の基準となる日付。「この日の業務終了時点」で評価する |
| **PV（計画価値）** | 基準日までに完了予定だった作業量 |
| **EV（出来高）** | 実際に完了した作業の価値。`進捗率 × 工数` で算出 |
| **SPI（スケジュール効率指標）** | EV ÷ PV。1.0 超で前倒し、1.0 未満で遅延 |
| **SV（スケジュール差異）** | EV − PV。正なら前倒し、負なら遅延 |
| **PlotMap** | 稼働予定日を示す Map。キーは Excel シリアル値（`date2Sn(date)` で変換） |
| **ExcludedTasks** | 日付不備・PlotMap 欠損等で計算対象外となったタスク群 |
| **ValidStatus / InvalidReason** | タスクの計算可否判定と除外理由の分類 |
| **SPI Override** | 完了予測時に SPI を手動補正する仕組み |
| **工期（Duration）** | カレンダー日数。遅延判定に使用 |
| **工数（Effort）** | 人日単位の作業量。EVM 計算に使用 |

## ビジネスルール

### リーフタスクのみ集計

EVM メトリクスの集計対象は `isLeaf === true` のタスクのみ。親タスク（サマリータスク）は集計に含めない。差分計算（`ProjectService.calculateTaskDiffs`）も同様にリーフタスクのみが対象。

### PV の二重性

PV には 2 つの取得経路がある:

| 種別 | 取得方法 | 用途 |
|------|---------|------|
| Excel 取得 PV | `TaskRow.pv` | データ整合性確認 |
| 計算 PV | `TaskRow.calculatePV(baseDate)` | 日別分析、SPI/SV 計算 |

計算 PV は `workload ÷ scheduledWorkDays` で 1 日あたりの PV を算出し、基準日が稼働日なら加算する。

### 稼働日の判定（plotMap と HolidayData は独立）

| 項目 | `TaskRow.plotMap` | `HolidayData` |
|------|-------------------|---------------|
| 管理単位 | タスク単位 | プロジェクト単位 |
| PV 計算への影響 | **直接使用される** | 使用されない |
| 用途 | PV 計算の稼働日判定 | 祝日判定・要員計画 |

PV 計算は plotMap のみを参照する。HolidayData は参照しない。Excel でガントチャートを作成する際に祝日にプロットを入れないことで、間接的に稼働日から除外される。

### タスク除外の判定

`ValidStatus` が無効なタスクは EVM 計算から除外される:

| 除外理由 | 条件 |
|---------|------|
| DATE_MISSING | 開始日または終了日が未設定 |
| PLOTMAP_MISSING | plotMap が存在しない |
| WORKDAYS_INVALID | scheduledWorkDays が 0 以下 |

### 差分計算のルール

2 時点の Project を比較する `ProjectService` の判定ロジック:

| 差分種別 | 判定条件 |
|---------|---------|
| added | prev に存在しないタスク |
| modified | 進捗率・PV・EV のいずれかに変化あり |
| removed | now に存在しないタスク |
| none | 変化なし |

差分は `ProjectDiff`（全体集約）と `AssigneeDiff`（担当者別集約）に二段階で集約される。

## 詳細リファレンス

上記はパターンと原則の要約。プロパティ一覧・計算式の詳細・型定義は [docs/GLOSSARY.md](../../docs/GLOSSARY.md) を参照。

---
_ドメインルールを理解してから実装に入る。GLOSSARY.md が権威ある詳細リファレンス。_
