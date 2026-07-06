# EVM ドメインプライマー — AI・スキル向けの前提知識

**想定読者**: 本ライブラリ（evmtools-node）を利用・拡張する AI エージェント、Claude Code スキル、および開発者。
**目的**: EVM 理論と本ツール固有の解釈を1文書で把握し、指標の誤用・API の誤解・数値の再実装（乖離の温床）を防ぐ。

## 0. ドキュメントマップ — どれをいつ読むか

| 知りたいこと | 読む文書 |
|-------------|---------|
| **EVM 理論と本ツールの全体像（最初に読む）** | 本書 |
| 用語の正確な定義・クラス仕様 | [GLOSSARY.md](GLOSSARY.md) |
| 指標の落とし穴・実運用知見（ⓐ〜ⓗ′） | [EVM-KNOWLEDGE.md](EVM-KNOWLEDGE.md) |
| 日常の進捗管理手順・標準式対応表・3点見積レシピ | [EVM-MANAGEMENT-GUIDE.md](EVM-MANAGEMENT-GUIDE.md) |
| 公開 API の全カタログ | [specs/domain/master/INDEX.md](specs/domain/master/INDEX.md) |
| クラス単位の詳細仕様・変更履歴 | `specs/domain/master/{Class}.spec.md` |
| コスト系 EVM（未実装）の将来設計 | [specs/requirements/REQ-COST-EVM-DRAFT.md](specs/requirements/REQ-COST-EVM-DRAFT.md) |
| 使い方のコード例 | [examples/](examples/) |

---

## 1. 本ツールの EVM モデル（標準 EVM との差分を先に）

EVM（Earned Value Management）は「**計画価値（PV）・出来高（EV）・実コスト（AC）**の3本柱で進捗とコストを定量測定する」手法。ただし**本ツールは次の解釈を採る**。AI はこの差分を前提にすること:

1. **通貨ではなく工数（人日）ベース**。BAC = 総予定工数（人日）。金額換算はしない
2. **AC（実コスト）は存在しない**。よってコスト系指標（CPI/CV/EAC/TCPI/VAC/CR）は算出不可。本ツールが測るのは**スケジュール系のみ**（→ [REQ-COST-EVM-DRAFT.md](specs/requirements/REQ-COST-EVM-DRAFT.md)、[#191](https://github.com/masatomix/evmtools-node/issues/191)）
3. **EV = 進捗率 × 予定工数**（progressRate は Excel/CSV に PM が手動入力する主観値）。客観的 EV 測定技法は `StatisticsOptions.evMethod`（'0/100'・'50/50'、0.0.33〜）で選択可。50/50 の着手判定は actualStartDate の有無（進捗率不使用）
4. **基準日（baseDate）は「その日の業務終了時点」を表す**。期限判定 `isOverdueAt` は `endDate <= baseDate` で当日を含む
5. **1プロジェクトファイル = 1スナップショット**。時系列分析（差分・期間SPI・トレンド）は複数スナップショットを読み込んで行う
6. **稼働日ベース**。土日 + プロジェクト固有祝日（holidayDatas）を除いた日で PV を配分。タスクごとの稼働日は plotMap（Excel シリアル値 → boolean）が正

## 2. 指標カタログ（式 × API × undefined 条件）

### 2.1 基本指標（単一スナップショット）

| 指標 | 式 | API | undefined になる条件 |
|------|-----|-----|---------------------|
| PV（累積） | plotMap 上の稼働日ごとに workload/scheduledWorkDays を基準日まで積上げ | `TaskRow.calculatePVs(baseDate)` / `getStatistics().totalPvCalculated` | 開始/終了日・plotMap 欠損時は 0 |
| EV | progressRate × workload（Excel 読込値） | `TaskRow.ev` / `getStatistics().totalEv` | 入力欠損 |
| SPI（累積） | ΣEV / Σ累積PV | `getStatistics().spi` | PV=0 |
| SV | EV − PV | `TaskRow.calculateSV(baseDate)` | EV 欠損 |
| BAC | Σworkload | `getStatistics().totalWorkloadExcel`（完了予測内部の bac と同値） | — |
| ETC'（残作業） | (BAC − EV) / SPI | `getStatistics().etcPrime` | SPI 算出不能 / 直近日次PV=0 / 予測上限超過 |
| 実行PV（独自） | 残工数 / 残稼働日数 | `TaskRow.pvTodayActual(baseDate)` | workload/開始日/終了日/plotMap 欠損。残日数0は 0 |
| 遅延タスク | endDate < today かつ未完了の leaf | `getDelayedTasks(minDays)` | —（空配列） |

### 2.2 時系列指標（複数スナップショット）

| 指標 | 式 | API | undefined になる条件 |
|------|-----|-----|---------------------|
| **期間SPI** | ΔEV / ΔPV（**窓端2点**。中間スナップショットは不使用） | `ProjectService.calculateRecentSpi(projects, opts?)` | 2点未満 / ΔPV≤0（再計画で PV 減少含む）/ 窓端統計欠損 |
| タスク差分 | ID 突合の added/removed/modified | `ProjectService.calculateTaskDiffs(now, prev)` | — |
| 統計時系列 | スナップショット統計のマージ・欠損日補完 | `mergeProjectStatistics` + `fillMissingDates` | — |

### 2.3 Earned Schedule 系（0.0.31〜、時間ベース）

| 指標 | 式 | API（`calculateEarnedSchedule()` の戻り値） | 意味 |
|------|-----|------|------|
| ES | 累積PV曲線上で「現在の EV に計画が到達した時点」（稼働日・線形補間） | `.es` | 出来高の時間換算 |
| AT | 開始日→基準日の稼働日数 | `.at` | Actual Time |
| **SPI(t)** | ES / AT | `.spiT`（AT=0 で undefined） | **終盤でも 1.0 に収束しない**時間効率 |
| SV(t) | ES − AT | `.svT` | 「何稼働日遅れ」を直接表現 |
| PD | 全期間の稼働日数 | `.pd` | Planned Duration |
| IEAC(t) | PD / SPI(t) | `.iEacT` / 暦日は `.esForecastDate` | 時間ベースの完了予測 |

### 2.4 予測

| 予測 | 方式 | API |
|------|------|-----|
| 完了予測日 | 日次消化 = 直近日次PV × SPI で残工数を消化 | `calculateCompletionForecast(opts?)`（`spiOverride`/`dailyPvOverride`/`lookbackDays`） |
| 3点見積 | spiOverride に 1.0 / 累積SPI / min(期間SPI, SPI(t)) | 専用 API なし。**公式レシピ**が [EVM-MANAGEMENT-GUIDE.md](EVM-MANAGEMENT-GUIDE.md) にある |

## 3. 用語正規化表（検索キーの同義語）

AI が文書・コードを検索する際のキー対応。**左の語を見たら右で grep せよ**:

| 日本語/概念 | 英語/略語 | 実装名 |
|------------|----------|--------|
| 計画価値 | PV, BCWS | `pv`, `calculatePV(s)`, `totalPvCalculated` |
| 出来高 | EV, BCWP | `ev`, `totalEv` |
| 実コスト（未対応） | AC, ACWP | `actualWorkload`（設計案のみ） |
| 完成時総予算 / 総工数 | BAC | `totalWorkloadExcel`（=Σworkload）。`totalWorkloadCalculated` は endDate 時点の累積PVによる計算値（endDate 欠損で undefined）で別物 |
| スケジュール効率（累積） | SPI | `spi`, `calculateSPI` |
| 期間SPI / 直近SPI | period SPI | `calculateRecentSpi`（ΔEV/ΔPV） |
| 時間ベース効率 | SPI(t), earned schedule | `spiT`, `calculateEarnedSchedule` |
| 残作業見積 | ETC | `etcPrime` |
| 完了予測 | EAC, forecast | `calculateCompletionForecast`, `esForecastDate` |
| 基準日 | base date | `baseDate`（「その日終了時点」） |
| 稼働日 | working day | `plotMap`, `isHoliday`, `generateBaseDates` |
| 遅延 | delay, overdue | `getDelayedTasks`, `isOverdueAt`, `delayDays` |
| 完了 | finished | `finished`（**許容誤差 1e-9 付き** ≥1.0） |
| 要員/担当者 | assignee | `assignee`, `getStatisticsByName`, `getDailyPvByAssignee` |

## 4. 判断レシピ — どの局面でどの指標を見るか

**フェーズで主指標を切り替える**（根拠は EVM-KNOWLEDGE ⓐⓑ）:

| フェーズ | 主指標 | 理由・注意 |
|---------|--------|-----------|
| 序盤（累積PV小） | 期間SPI・遅延タスク | 累積SPIは母数が小さくノイズ（ⓐ）。単発の異常値に反応しない |
| 中盤 | 累積SPI + 期間SPI + 差分 | SPI 急落を見たら**先に `calculateTaskDiffs` で PV 段差（スコープ投入）を確認**（ⓔ）。遅延と誤診しない |
| 終盤（完了率>90%） | **SPI(t)・SV(t)・ETC'・遅延タスクの齢** | 累積SPIは 1.0 に機械的収束し異常を隠す（ⓑ）。SPI を主指標から外す |
| 横並び比較 | **必ず SPI（比率）** | 生 SV（人日）は規模間比較不可（ⓓ）。SV は単一案件内の規模表現のみ |
| 失速/回復の検出 | 期間SPI のトレンド | SV<0 自体は常態でありアラートではない（ⓖ） |
| リスクの穴 | `getDelayedTasks` を集計と**併用** | 集計指標は少数の塩漬けタスクを構造的に隠す（ⓒ） |

## 5. 実装上の落とし穴（AI がコードを書く時の必読事項）

1. **数値を再実装しない**。PV/EV/SPI/差分/日次PV/ES の計算はすべて本ライブラリが単一ソース。利用側（スキル・webui）で同等ロジックを書くと丸め・端数処理の乖離で数値不一致を起こす（過去に実害あり）。必要な計算が API に無ければ、公開 API 追加の基準（`.kiro/steering/master-spec-sync.md`）に照らしてライブラリ側への追加を検討する
2. **日付は「日単位シリアル値」で比較される**。`date2Sn` はローカル時刻ベースで時刻成分がシリアル値の小数部になる（JST 9:00 → .375）。TaskRow 内は `toDaySerial`（floor 正規化）で統一済み。**時刻付き Date を渡しても正しく動くが、独自比較を書くときは同じ正規化をすること**
3. **`finished` は許容誤差付き**（progressRate ≥ 1.0−1e-9、1.0 超も完了扱い）。`=== 1.0` で判定してはならない
4. **`getDelayedTasks()` の today は `this.baseDate` 固定**。引数の基準日で遅延を見たい場合は today 基準のインライン判定が必要（`getIncompleteTasksUpToToday` の設計経緯参照 — 同 API は基準適用で見送り、レシピは #165 参照）
5. **親タスクの plotMap には土日が混入し得る**（Excel 由来）。`calculatePVs` は親（isLeaf=false）に限り**土日**を除外する。祝日除外は `isHolidayFn` 注入時のみで**現状は未接続の将来拡張点**（Project 側は渡していない）。リーフのプロットは尊重される（週末稼働の表現）
6. **期間SPI は undefined を返し得る**（2点未満・ΔPV≤0）。数値前提のコードは `?? getStatistics().spi` 等のフォールバックを書くこと
7. **TZ 前提は JST**。`generateBaseDates` はローカルTZ依存、`dateStr` は **Asia/Tokyo 固定**（toLocaleString ja-JP）。CI は JST/UTC 両方でテスト。日付文字列ラベルは `dateStr` = 'YYYY/MM/DD'
8. **タスク同一性は ID 突合が正**（同名多数のため fullName 突合は誤マッチ）。ID 付け替えは検出対象（#186）

## 6. 制約・非対応の一覧（正直な限界）

| 項目 | 状態 |
|------|------|
| コスト系 EVM（AC/CPI/EAC/TCPI/VAC/CR） | ❌ 入力経路なし（設計メモ: REQ-COST-EVM-DRAFT.md / #191） |
| EV 測定技法（0/100・50/50） | ✅ 0.0.33（`StatisticsOptions.evMethod`。PV/BAC は不変、EV/SPI/予測/ES に反映） |
| Sカーブ CLI / グラフ出力 | ❌ 見送り（計算データは公開済み。整形は利用側 / #192） |
| 3点見積の専用 API | ❌ レシピで代替（EVM-MANAGEMENT-GUIDE） |
| 停滞タスク経時追跡 / BACトレンド / name変化警告 | 🔜 Backlog（#184 / #185 / #186） |
| 要員計画モジュール（resource） | ⚠️ ベータ（API 未安定・カタログ対象外） |
| 複数プロジェクトの Join | ❌ Backlog（#3） |

## 7. 本ライブラリを拡張する AI への規約（要点）

- **公開 API 追加の基準**: 既存 API の合成で実現できる便宜は追加しない / デモを公開 API に載せない / 非オプショナルフィールド追加は構築側破壊的変更 / 追加時は「合成できない理由」を design に明記（正: `.kiro/steering/master-spec-sync.md`）
- **要件追跡はポインタモデル**: feature 名（`.kiro/specs/` のディレクトリ名）を spec・テストコメント・master 変更履歴で一貫使用 → `git grep {feature名}` で横断
- **変更履歴の正本は CHANGELOG.md**（README に重複させない）
- **マスター同期**: 公開シンボルの追加・変更は `{Class}.spec.md` と `INDEX.md` への反映が必須ゲート

---

*本書は evmtools-node のドメイン知識の入口である。矛盾を見つけたら本書ではなく実装とテストを正とし、本書を修正すること。*
