# 要件定義書

> **実装ゲート（重要）**: 本 spec は**設計まで先行し、実装はトリガー成立後**とする（2026-07-07 ユーザー判断）。
> トリガー: 利用側スキル（PrimeBrains/generative-ai の evmtools スキル）で計画順序の測定（plan-adherence 系レポート）が
> 運用に定着し、独自実装の数値乖離リスクが顕在化したとき。
> 公開 API 追加の基準4（合成できない理由）: タスク単位の PV@ES はPV 曲線構築の細部（稼働日・plotMap・線形補間）に
> 依存し、利用側での再実装は Earned Schedule と同種の数値乖離リスクを生む（計算の単一ソース化）。

## はじめに

Lipke の **P-Factor（Schedule Adherence、スケジュール順守度）** を evmtools-node に追加する。

P-Factor は Earned Schedule 理論の拡張指標で、「**出来高（EV）を計画どおりの順序で積んでいるか**」を測る:

```
P = Σj min(PVj(ES), EVj) / Σj PVj(ES)
```

- `PVj(ES)`: タスク j が時点 ES（Earned Schedule）までに計画上積んでいるはずだった価値
- 分子: 計画に整合して獲得された EV（各タスクとも計画が求めた量までしか算入しない）
- P ∈ [0, 1]。**P = 1 が完全順守**。P < 1 は「計画より先のタスクを先食いし、計画上今やるべきタスクが遅れている」状態

**なぜ必要か**: SPI(t) が良好でも、着手容易なタスクの先食いで数字を作っている場合がある。先食いは前提未成立のまま進めた作業であり**手戻りリスク**を含む。P-Factor はこれを単一スナップショットから検出する（既存指標では検出不能）。

## 範囲（境界コンテキスト）

- **対象範囲**: P-Factor の算出 API（タスク別内訳含む）、既存オプション体系（フィルタ・EV 算定方式）との一貫性、ドキュメント整備
- **対象外**:
  - Lipke の発展系（effective EV、手戻り量予測 rework forecast）— P-Factor の運用実績を見てから将来判断
  - 利用側スキルの plan-adherence（2スナップショット間の4象限分類）の置き換え — 別指標であり共存する（P-Factor は単一スナップショットの理論指標）
  - CLI コマンドの追加 — ライブラリ API のみ
- **隣接システム/仕様への期待**: `calculateEarnedSchedule`（phase3-earned-schedule-0.0.32）の ES 定義・累積PV曲線・稼働日規約をそのまま基礎とする。ES の仕様変更時は本機能の再検証が必要

## 要件

### 要件 1: P-Factor の算出

**目的:** PM として、出来高が計画どおりの順序で積まれているか（スケジュール順守度）を知りたい。それにより SPI(t) が良好でも隠れている先食い（手戻りリスク）を検出する。

#### 受入基準（Acceptance Criteria）

1. When 利用者が P-Factor の算出を要求する, the evmtools-node shall P = Σj min(PVj(ES), EVj) / Σj PVj(ES) を返す（j は対象のリーフタスク、ES は同一条件で算出した Earned Schedule 値）
2. The evmtools-node shall P-Factor を 0 以上 1 以下の数値として返す
3. While 全タスクの出来高が計画順序と完全に整合している（すべての j で EVj ≥ PVj(ES)）, the evmtools-node shall P = 1 を返す
4. If ES が算出不能（対象タスクが空、開始日/終了日の欠損、BAC ≤ 0）, then the evmtools-node shall undefined を返す
5. If 分母 Σj PVj(ES) が 0（EV = 0 で ES = 0 の場合を含む）, then the evmtools-node shall undefined を返す
6. When プロジェクトが完了状態（EV ≥ BAC、ES = PD）で全タスクが完了している, the evmtools-node shall P = 1 を返す
7. The evmtools-node shall P-Factor の算出に使用した ES・AT の値を結果に含める（`calculateEarnedSchedule` を同一オプションで呼んだ結果と一致すること）

### 要件 2: タスク別内訳（診断情報）

**目的:** PM として、P < 1 のとき「どのタスクを先食いし、どのタスクが計画に対して遅れているか」を知りたい。それにより順守度の低下を具体的なタスクの是正アクションにつなげる。

#### 受入基準（Acceptance Criteria）

1. When P-Factor を算出する, the evmtools-node shall タスク別内訳（タスク ID・タスク名・PVj(ES)・EVj・両者の差）を結果に含める
2. The evmtools-node shall 各タスクを「先食い（EVj > PVj(ES)）」「遅れ（EVj < PVj(ES)）」「順守（EVj = PVj(ES)、許容誤差内）」のいずれかに分類する
3. The evmtools-node shall タスク別内訳を計画との乖離量（|EVj − PVj(ES)|）の降順で並べる
4. When タスクの乖離量がゼロ（許容誤差内）である, the evmtools-node shall そのタスクを内訳から除外できる情報（分類）を提供する（呼び出し側が「順守」分類で絞り込める形とする）

### 要件 3: 既存オプション体系との一貫性

**目的:** ライブラリ利用者として、P-Factor を既存 API と同じオプション（タスク名フィルタ・EV 算定方式）で使いたい。それにより工程別の順守度や客観的 EV 方式での順守度を追加学習なしに算出する。

#### 受入基準（Acceptance Criteria）

1. Where タスク名フィルタ（部分一致）が指定されている, the evmtools-node shall フィルタに一致するリーフタスクの部分集合に対して P-Factor とタスク別内訳を算出する
2. Where EV 算定方式（progressRate / 0/100 / 50/50）が指定されている, the evmtools-node shall 指定方式で導出した EVj を用いて P-Factor を算出する（PVj(ES) は方式の影響を受けない）
3. When フィルタと EV 算定方式を同時に指定する, the evmtools-node shall 両方を適用した結果を返す
4. The evmtools-node shall フィルタ指定時の ES を同一フィルタの `calculateEarnedSchedule` と同じ値として使用する

### 要件 4: 既存挙動の不変性（純追加）

**目的:** ライブラリ利用者として、本機能の追加によって既存 API の戻り値や性能が変わらないことを保証してほしい。それにより安心してバージョンアップできる。

#### 受入基準（Acceptance Criteria）

1. The evmtools-node shall 本機能を新規メソッド・新規型の追加のみで提供する（既存メソッドのシグネチャ・戻り値・既存型のフィールドを変更しない）
2. The evmtools-node shall 既存のテストを1件も変更せずに全件成功させる
3. The evmtools-node shall PV・BAC・AT・PD・ES の値に影響を与えない（P-Factor は読み取り専用の派生指標である）

### 要件 5: ドキュメント整備

**目的:** PM および AI エージェントとして、P-Factor の意味・読み方・limitations を参照したい。それにより指標の誤読（P < 1 を単純に「悪い」と断定する等）を防ぐ。

#### 受入基準（Acceptance Criteria）

1. The プロジェクトドキュメント shall GLOSSARY に P-Factor の定義（式・値域・「P=1 が完全順守」）を追加する
2. The プロジェクトドキュメント shall EVM-PRIMER の指標カタログと判断レシピに P-Factor を追加する（「SPI(t) 良好 × P 低 = 先食いによる見かけの進捗（手戻りリスク）」の読み方を含む）
3. The プロジェクトドキュメント shall 読み方の注意を明記する: P < 1 は必ずしも悪ではなく（合理的な順序変更もある）、**低い P が継続する場合**に先食い・手戻りリスクの兆候として扱う
4. The プロジェクトドキュメント shall master 設計書（Project.spec.md・INDEX.md）に本 API を同期する（実装時）
