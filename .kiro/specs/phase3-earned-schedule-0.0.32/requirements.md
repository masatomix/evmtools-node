# 要件定義書

## はじめに

evmtools-node のスケジュール指標は現在、古典 SPI（EV ÷ 累積PV）のみを提供している。この指標には EVM 理論上の既知の欠陥がある。**プロジェクト終盤では EV も PV も BAC に収束するため SPI が必ず 1.0 に近づき、実際には遅延しているプロジェクトでも「順調」に見えてしまう**（PMI Practice Standard for EVM 2nd Ed. Appendix D。本リポジトリでも Issue #171 の知見ⓑ、`docs/brainstorm-evm-indicators.md` として実運用データで確認済み）。

本 spec（phase3-earned-schedule-0.0.32）は、Earned Schedule（ES）理論を導入してこの欠陥を根本解決する。ES は「計画上、現在の EV に到達しているはずだった時点」を時間軸で表現し、そこから SPI(t)（時間ベースのスケジュール効率）・SV(t)（遅延日数）・IEAC(t)（独立完了予測）・完了予測日を導出する。ES は古典 SPI と異なり終盤でも 1.0 に収束せず、「何日遅れているか」を稼働日単位で直接示す。

重要な特性として、**ES は追加入力データを一切必要としない**。既存の累積PV曲線・現在 EV・基準日だけで算出できる。これは本ライブラリのコア指標を強化する最優先機能（EVM 理論ギャップ調査の結論、`.kiro/steering/roadmap.md`）である。

前提として、phase0-bugfix-0.0.29 で `TaskRow.calculatePVs` の親タスク土日/祝日混入が修正済みであり、これが PV 曲線精度の前提となる。本リリースは v0.0.32 相当で、既存 API を破壊しない非破壊拡張とする。

## 範囲（境界コンテキスト）

- **対象範囲**:
  - Earned Schedule 型（ES / AT / SPI(t) / SV(t) / IEAC(t) / 完了予測日 / PD）と算出ロジックの新設
  - プロジェクト全体および任意のタスク部分集合（フィルタ）に対する ES 算出メソッド
  - `Statistics` 型へのオプショナルな ES 指標追加と、オプトイン（デフォルト off）での取得
  - 終盤における古典 SPI 1.0 収束と SPI(t) の乖離を検証で実証すること
  - EVM 用語集（GLOSSARY）への ES/SPI(t)/SV(t)/IEAC(t) の定義追加、`docs/brainstorm-evm-indicators.md` ⓑ への「ES で解決」注記、master 設計書（Project.spec.md）の同期
- **対象外**:
  - ES 指標の CLI 出力・Sカーブ時系列出力（phase4-scurve-eac-0.0.33 に含める）
  - EAC の悲観/楽観バリエーション（phase4）
  - コスト系指標（AC / CPI 等。AC 入力が必要なため本 spec では扱わない）
  - #171 知識ベース本体の構築（phase5）
- **隣接システム/仕様への期待**:
  - phase0-bugfix-0.0.29 が提供する「稼働日のみで構成された累積PV曲線」（土日/祝日を除外した `calculatePVs`）を前提として利用する。phase0 が未リリースの場合、本 spec は着手不可である。
  - 利用側（masatomix/task の evmtools スキル、evmtools-webui）は、既存の公開 API（サブパス export、`getStatistics({filter})` 等）が後方互換であることを前提にできる。ES 指標はオプトインで追加され、既定の戻り値は変化しない。
  - 下流 phase4 は本 spec が定義する SPI(t) と ES 系列を予測バリエーション・Sカーブ出力の入力として利用する。

## 要件

### 要件 1: Earned Schedule（ES）の算出

**目的:** ライブラリ利用者として、現在の EV が計画上いつ達成されるはずだったかを稼働日単位の Earned Schedule として得たい。それにより、進捗の遅れ/進みを金額比ではなく時間軸で把握できる。

#### 受入基準（Acceptance Criteria）

1. The ES算出コア shall プロジェクト開始日から終了日までの稼働日ごとの累積PV曲線と現在の EV から、`累積PV(k) <= EV < 累積PV(k+1)` を満たす最後の稼働日インデックス k を求め、`ES = k + (EV − 累積PV(k)) / (累積PV(k+1) − 累積PV(k))` の線形補間により ES を稼働日単位で返す。
2. When EV が 0 である場合, the ES算出コア shall ES として `0` を返す。
3. When EV が計画総PV（曲線末尾の累積PV = BAC）以上である場合, the ES算出コア shall ES として計画総稼働日数 PD を返す（曲線を超えて外挿しない）。
4. When EV が基準日時点の累積PV（AT 時点の計画PV）以上である場合, the ES算出コア shall `ES >= AT` となる値を返す（先行を表す）。
5. When EV が基準日時点の累積PV 未満である場合, the ES算出コア shall `ES < AT` となる値を返す（遅延を表す）。
6. If 隣接する 2 点の累積PV差（`累積PV(k+1) − 累積PV(k)`）が 0 以下となり線形補間が定義できない場合, then the ES算出コア shall 補間を行わずに区間下端のインデックス k を ES として用いる。
7. The ES算出コア shall ES を算出できない前提（曲線が空、計画総稼働日数が 0 等）の場合に `undefined` を返す。

### 要件 2: スケジュール指標（SPI(t) / SV(t) / IEAC(t) / 完了予測日）の導出

**目的:** ライブラリ利用者として、Earned Schedule から時間ベースのスケジュール効率・遅延量・完了見通しを得たい。それにより、遅延の度合いと現実的な完了時期を定量的に判断できる。

#### 受入基準（Acceptance Criteria）

1. The ES算出結果 shall 基準日時点の Actual Time（AT = プロジェクト開始日から基準日までの稼働日数）を含む。
2. The ES算出結果 shall 計画総稼働日数（PD = プロジェクトの計画稼働日数）を含む。
3. While AT が 1 以上である場合, the ES算出コア shall `SPI(t) = ES / AT` を算出して返す。
4. If AT が 0 である場合, then the ES算出コア shall SPI(t) を `undefined` とする。
5. The ES算出コア shall `SV(t) = ES − AT` を稼働日単位で常に算出して返す。
6. While SPI(t) が算出可能かつ 0 より大きい場合, the ES算出コア shall `IEAC(t) = PD / SPI(t)` を稼働日単位で算出して返す。
7. If SPI(t) が undefined または 0 以下である場合, then the ES算出コア shall IEAC(t) を `undefined` とする。
8. Where IEAC(t) が算出できた場合, the Project shall プロジェクト開始日から IEAC(t) の稼働日数分を暦日展開（土日/祝日をスキップ）した完了予測日を返し、算出できない場合は完了予測日を `undefined` とする。

### 要件 3: 終盤の遅延可視性（古典 SPI 1.0 収束 vs SPI(t) 乖離）

**目的:** プロジェクト管理者として、プロジェクト終盤で実際に遅延しているにもかかわらず古典 SPI が 1.0 付近を示す状況でも、SPI(t) によって遅延を検知したい。それにより、終盤の見かけ上の「順調」に惑わされず実態を把握できる。

#### 受入基準（Acceptance Criteria）

1. While プロジェクトが終盤（EV が BAC に接近し古典 SPI が 1.0 近傍に収束する状況）にあり、かつ実際のスケジュールが遅延している場合, the ES指標 shall 古典 SPI が 1.0 近傍を示すのに対し SPI(t) が 1.0 未満（遅延）を示す。
2. The 検証スイート shall 上記の終盤遅延シナリオを再現し、同一データにおいて古典 SPI が 1.0 近傍に収束する一方で SPI(t) が 1.0 未満の値を返すことを実証するテストケースを含む。

### 要件 4: Statistics へのオプトイン統合

**目的:** ライブラリ利用者として、既存の統計取得 API から ES 指標をオプトインで取得したい。それにより、追加の呼び出し口を増やさずに ES 指標を統計結果へ含められる。

#### 受入基準（Acceptance Criteria）

1. Where 統計取得オプションで ES 算出が有効化された場合, the Project shall 統計結果に SPI(t)・SV(t)・ES 由来の完了予測日を含める。
2. While 統計取得オプションで ES 算出が有効化されていない（既定）場合, the Project shall ES 指標を算出せず、統計結果の ES 関連フィールドを未設定のままとする。
3. The Statistics 型 shall ES 関連フィールドをすべてオプショナルとして追加し、ES を算出しない既存の呼び出しの戻り値の形状を変えない。
4. The Project shall ES 指標の算出を明示的にオプトインした場合にのみ行い、既定の統計取得の計算コストを増やさない。

### 要件 5: タスクフィルタ対応

**目的:** ライブラリ利用者として、フィルタで絞り込んだタスク部分集合に対しても ES 指標を算出したい。それにより、担当者やサブプロジェクト単位でスケジュール遅延を分析できる。

#### 受入基準（Acceptance Criteria）

1. Where フィルタ条件が指定された場合, the Project shall 既存の統計と同一のタスク解決機構でリーフタスク部分集合を解決し、その部分集合の EV と累積PV曲線から ES 指標を算出する。
2. When フィルタ結果のタスク集合が空である場合, the Project shall ES 指標を `undefined`（または各指標を未算出）として返し、例外を発生させない。
3. The Project shall フィルタ非指定時（プロジェクト全体）とフィルタ指定時（部分集合）で同一の ES 算出ロジックを用いる。

### 要件 6: PV 曲線の精度と性能

**目的:** ライブラリ利用者および保守者として、ES の基盤となる累積PV曲線が稼働日のみで構成され、かつ算出が非効率な全日再計算に陥らないようにしたい。それにより、ES 値が実態に一致し、大規模プロジェクトでも実用的な速度で算出できる。

#### 受入基準（Acceptance Criteria）

1. The ES算出 shall 累積PV曲線を土日/祝日を除外した稼働日のみで構成する（phase0-bugfix-0.0.29 が修正した `calculatePVs` の稼働日除外を前提とする）。
2. The Project shall 累積PV曲線を 1 回だけ構築してメモ化し、ES の探索・補間で再利用する（稼働日ごとに曲線全体を再計算しない）。
3. While 累積PV曲線を跨いで基準日が休日を含む期間に位置する場合, the ES算出 shall 稼働日インデックスに基づく一貫した ES を返す（休日跨ぎで指標がずれない）。

### 要件 7: ドキュメントと設計書の同期

**目的:** 保守者および将来の開発者として、ES の理論・用語・式が用語集と master 設計書に反映され、実装と一致した状態を保ちたい。それにより、CLAUDE.md のプロジェクト規約（用語定義・トレーサビリティ必須・master 同期必須）を満たす。

#### 受入基準（Acceptance Criteria）

1. The 用語集（`docs/GLOSSARY.md`）shall Earned Schedule（ES）・SPI(t)・SV(t)・IEAC(t)・AT・PD の定義と算出式を、Earned Schedule 標準（Walt Lipke / PMI）に準拠して追加する。
2. The ブレインストーム資料（`docs/brainstorm-evm-indicators.md`）shall 知見ⓑ（終盤の古典 SPI 1.0 収束問題）に「Earned Schedule（SPI(t)）で解決」の注記を追加する。
3. When ES の型・メソッドが実装された場合, the master 設計書（`docs/specs/domain/master/Project.spec.md`）shall 新メソッド・Statistics 拡張・テストシナリオ・要件トレーサビリティ（AC-ID → TC-ID）・変更履歴（バージョン更新）を反映する。
4. The 案件設計書（本 spec の design.md）shall AC-ID が grep で検索可能な要件トレーサビリティ表を含む。
