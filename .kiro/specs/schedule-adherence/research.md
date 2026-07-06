# 調査・設計判断テンプレート

## 概要
- **機能**: `schedule-adherence`
- **ディスカバリー範囲**: 拡張（phase3-earned-schedule の ES 実装を基礎とする統合重視ディスカバリー）
- **主要な知見**:
  - P-Factor の分母 Σj PVj(ES) は ES の定義により全体 EV と（線形補間の線形性から）一致する。ただしクランプ時（EV≥BAC で ES=PD）は一致しないため、**分母は per-task の Σ を独立に計算**するのが頑健
  - タスク単位の PVj(ES) は「タスク別の累積PV曲線全体」を作らなくても、**floor(ES) と floor(ES)+1 の2点の `calculatePVs` 呼び出し + 線形補間**で厳密に求まる（O(2×tasks)）
  - min によって分子 ≤ 分母が構造的に保証されるため **P ≤ 1 は数学的に常に成立**（要件1.2 のガードは理論的裏付けあり）

## 調査ログ

### P-Factor の理論定義（Lipke, Schedule Adherence）
- **背景**: 実装の式・値域・解釈を PMI/Lipke の原典定義に一致させる必要がある
- **参照ソース**: Lipke "Schedule Adherence: a useful measure for project management" (CrossTalk 2008)、PMI Practice Standard for EVM の ES 补遗
- **知見**:
  - P = Σj min(PVj(ES), EVj) / Σj PVj(ES)。時点 ES で「計画が求めた作業配分」に対し実際の EV 配分がどれだけ整合するか
  - P = 1: 完全順守。P < 1: 一部の EV が計画順序外（先食い）で獲得され、その分だけ計画上やるべきタスクが遅れている
  - Lipke は P·EV を「effective EV」とし手戻り量予測に発展させるが、これは P の運用実績を見てから（本 spec の非ゴール）
- **示唆**: 結果型に P だけでなく分子（earnedInPlan）・分母（plannedTotal）を含めると、将来の effective EV 拡張が非破壊にできる

### タスク単位の PV@ES の算出方法
- **背景**: 要件1.1 の PVj(ES) をどう計算するか。ES は小数の稼働日インデックス
- **参照ソース**: `src/domain/Project.ts` の `calculateEarnedSchedule`（1007-1047行）、`_buildPvCurve`、`src/domain/EarnedSchedule.ts` の索引規約（仮想始点 C(0)=0、1始まり）
- **知見**:
  - 全体曲線は `workDays[i-1]`（i 番目の稼働日）ごとの `sumCalculatePVs`。同じ規約でタスク単位に `task.calculatePVs(workDays[i-1])` を使えば整合する
  - k = floor(ES)、f = ES − k として PVj(ES) = PVj(k) + f × (PVj(k+1) − PVj(k))。PVj(0) = 0（仮想始点）、k ≥ PD のとき PVj(ES) = PVj(PD)（クランプ、ES 側と同じ）
  - 全タスクの曲線を PD 日分作ると O(days×tasks) が再発するが、**必要なのは k と k+1 の2日分のみ**
- **示唆**: per-task 曲線のメモ化は不要。`_pvCurveCache` は全体曲線用のまま変更しない

### ES 値の一致保証（要件1.7 / 3.4）
- **背景**: P-Factor の ES と `calculateEarnedSchedule` の ES が別経路で計算されると乖離リスク
- **参照ソース**: `Project.calculateEarnedSchedule` の実装
- **知見**: タスク解決（`_resolveTasks`）→ 稼働日（`generateBaseDates`+`isHoliday`）→ 曲線（`_buildPvCurve` メモ化）→ `calculateEarnedScheduleCore` の同一パイプラインを内部共有すれば、定義上一致する
- **示唆**: `calculateScheduleAdherence` は ES 算出部を `calculateEarnedSchedule` と同一の内部手順で実行する（コピーでなく共通化。設計では private 共通ヘルパー `_computeEsContext` に抽出）

### EV 算定方式（evMethod）との合成
- **背景**: 要件3.2。EVj を方式別に導出する必要
- **参照ソース**: `src/domain/EvMethod.ts`（`resolveTaskEv` は module export、バレルは type のみ公開）
- **知見**: `resolveTaskEv(task, method)` がタスク単位の方式別 EV をそのまま返す。ES 側も `sumEVsByMethod` で同方式の EV を使うため、分母（ES 経由）と分子（タスク別）の方式が自動的に一致する
- **示唆**: 新規の EV 導出コードは一切書かない（resolveTaskEv を内部 import）

## アーキテクチャパターン評価
| 選択肢 | 内容 | 判断 |
|--------|------|------|
| A: 純関数コア + Project 統合 | ES/EvMethod と同じ2層構成（`ScheduleAdherence.ts` 純関数 + `Project.calculateScheduleAdherence`） | **採用**。phase3/phase5 で確立したパターン。テスト容易・依存方向明確 |
| B: EarnedScheduleResult への相乗り | `calculateEarnedSchedule` の戻り値に pFactor を追加 | 不採用。既存型の変更（要件4.1 違反リスク）+ タスク別内訳で結果が肥大 |
| C: ProjectService 配置 | 差分系と同居 | 不採用。P-Factor は単一スナップショット指標で Project の責務 |

## 設計判断
- **公開面**: 型（`ScheduleAdherenceResult` / `TaskAdherenceDetail`）とメソッドのみ公開。純関数コアは非公開（evMethod と同じ基準適用。バレルは type export のみ）
- **分類の許容誤差**: 「順守」判定は |EVj − PVj(ES)| < 1e-9（`PROGRESS_RATE_EPSILON` と同値の定数）。浮動小数点による誤分類を防ぐ
- **undefined ポリシー**: ES 系と同一（例外を投げない）。分母 0 は追加の undefined 条件
- **P の丸め**: 丸めない（生値）。表示丸めは利用側の責務（既存指標と同方針）

## リスク
- ES の索引規約（1始まり・仮想始点）とタスク別補間の索引ズレ → 設計に索引対応表を明記し、テストで全体Σ = EV の整合を検証（クランプなしケース）
- フィルタ部分集合の早期完了クランプ（ES=PD）時、PVj(PD) = BACj となり P=1 側へ寄る → 既知の挙動として documentation に明記（phase3 の advisory と同系）
