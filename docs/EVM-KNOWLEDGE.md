# EVM 知識ベース — 指標の落とし穴と読み方

実運用 WBS（2プロジェクト・計62スナップショット）の時系列分析から得た、**EVM 指標そのものの数理的・実務的な法則**をまとめる。プロジェクト固有の話は剥がし、他案件でも成り立つ「ドメイン法則」として一般化している（元資料: [docs/brainstorm-evm-indicators.md](brainstorm-evm-indicators.md)、[Issue #171](https://github.com/masatomix/evmtools-node/issues/171)）。

各知見は「現象 / 理論的背景 / 本ツールでの確認方法 / 対処・解決状況」の4観点で記す。
確度は **数理由来（ⓐⓑⓓ）＞経験則（ⓕⓖ、n=2観測）** の温度差がある点に留意。

> **PM 向けの要約**: SPI を単独で信じない。序盤は母数が小さくノイズ（ⓐ）、終盤は母数が大きく鈍感で必ず 1.0 に近づく（ⓑ）。横並び比較は必ず SPI、生 SV は同一案件内の「人日規模」だけに使う（ⓓ）。集計指標は塩漬けタスクを隠す（ⓒ）。SPI の急落を見たら、まず同期間の BAC/PV 段差（スコープ投入）を疑う（ⓔ）。

---

## ⓐ SPI の母数効果 — 序盤はノイズ、終盤は鈍感

- **現象**: 同じ 1 人日の出来高が SPI を動かす量が、序盤（累積PV≈6）で約 +0.17、終盤（累積PV≈162）で約 +0.006 と**約28倍**も違う。序盤の低 SPI や異常値は実力ではなく母数の小ささ。
- **理論的背景**: SPI = EV / 累積PV は累積比。1日の成果に対する感度は `dSPI/dEV = 1/PV`。累積PVが大きいほど SPI は動かなくなる。
- **本ツールでの確認方法**: `Project.getStatistics()` の `totalPvCalculated`（累積PV）・`totalWorkloadExcel`（BAC=Σworkload）で**完了率・経過PV割合**を併記し、SPI の信頼度に文脈を与える。直近の実勢は `ProjectService.calculateRecentSpi(projects)`（期間SPI = ΔEV/ΔPV、0.0.29〜）で母数効果を排して測る。
- **対処・解決状況**: ✅ **0.0.29 で対応**。期間SPI（`calculateRecentSpi`）が母数に平滑化されない直近効率を返す（#170 の直接の動機がこの知見）。

## ⓑ 完了率90%超で SPI は機械的に 1.0 へ収束

- **現象**: 98%・96%完了の2案件とも終盤 SPI 0.99〜1.00。片方は末期に SV が −1→−5 へ再拡大したのに SPI は 0.99 のまま＝**SPI が異常を隠した**。
- **理論的背景**: 完了に近づくと EV→BAC, PV→BAC のため SV→0, SPI→1 に数学的に収束する。troubled な案件でも終盤 SPI は 1 付近に見える。
- **本ツールでの確認方法**: `Project.calculateEarnedSchedule()` の **SPI(t)（= ES/AT）/ SV(t)** で時間ベースに測る。SPI(t) は終盤でも 1.0 に収束せず失速を検出する。完了率 >90% では SPI を主指標から外し、ETC（残 = BAC − EV）と滞留タスクの齢で判断。
- **対処・解決状況**: ✅ **0.0.31 で解決**（Earned Schedule）。実証: BAC=10・計画終了1週間後・EV=9.9 のとき、古典 SPI = 0.99（順調に見える）に対し **SPI(t) = 0.66・SV(t) = −5.1 稼働日**（失速を検出）。詳細は [GLOSSARY.md「Earned Schedule 系指標」](GLOSSARY.md)。

## ⓒ 集計指標は「少数の長期停滞タスク」を構造的に隠す

- **現象**: 49日遅延・進捗0%の小タスク（0.3人日）は全体 SPI（BAC170）をほぼ動かさないが、半年未解決の最大リスクだった。
- **理論的背景**: SPI/SV は加重平均。大母数の中の小さな塩漬けタスクは指標にほぼ表れないが、実リスクはそこにある。
- **本ツールでの確認方法**: `Project.getDelayedTasks(minDays)` で遅延タスクを遅延日数降順に抽出し、EVM 集計と**併用**する（集計だけを見ない）。
- **対処・解決状況**: ⚠️ 部分対応。単一時点の遅延抽出は可能。「**同一タスクの遅延日数を経時追跡**する」機能は Backlog（[機能化候補](#機能化候補backlog)参照）。

## ⓓ 生 SV は規模間で比較不可 — SPI で比較し、SV で規模を読む

- **現象**: 案件A 最悪 SV −9.00 は PV比 −1.9%（SPI 0.981）、案件B 最悪 SV −7.25 は PV比 −9.0%（SPI 0.910）。**絶対値では A が遅れて見えるが実際は B が深刻**。
- **理論的背景**: 恒等式 `SV/PV = EV/PV − 1 = SPI − 1`。SV を %正規化すると SPI そのもの。生 SV（人日）は「何人日遅れているか」という規模情報、SPI は比較可能な効率。
- **本ツールでの確認方法**: 横並び比較は必ず `spi`（`getStatistics().spi` / `getStatisticsByName()`）。生 SV（`TaskRow.calculateSV` / 統計の EV−PV）は単一案件内で「遅れの人日規模」を語るときだけ。
- **対処・解決状況**: ✅ 指標は提供済み。運用上「横比較は SPI」を本ドキュメントで明文化。

## ⓔ 中盤の SPI ディップは「再ベースライン由来」が多い

- **現象**: 同一案件で +45件のタスク投入時は SPI が 0.96→0.91 へ急落、+107件投入時は SPI ほぼ不動。**追加タスクの PV が「いつ立つか」で影響が真逆**（近接PV＝効く／先日付・細粒度＝効かない）。
- **理論的背景**: 近接日に PV が立つタスクを束で追加すると、PV が即跳ね EV が追従できず SPI が下がる。これは性能劣化ではなくスコープ投入のアーティファクト。
- **本ツールでの確認方法**: SPI 低下を見たら、`ProjectService.calculateTaskDiffs(now, prev)` / `calculateProjectDiffs` で**同期間の BAC/PV 段差（deltaPV・追加タスク数）を先に確認**してから「遅延悪化」と判定する。
- **対処・解決状況**: ✅ 差分 API で診断可能。診断手順（PV段差の確認を先に）を本ドキュメントで明文化。

## ⓕ BAC は単調増加する — 移動ベースライン下の SPI は楽観バイアス

- **現象**: 案件A BAC +24%、案件B BAC 約20倍に膨張する中、SPI は終始 0.91〜1.0。
- **理論的背景**: 実プロジェクトの BAC はほぼ減らない。更新ベースラインに対する SPI は、ベースライン自体が遅延を吸収するため実態より良く出る。
- **本ツールでの確認方法**: `getStatistics().totalWorkloadExcel`（BAC=Σworkload）を時系列で追い、**BAC 増加トレンド**をスコープ膨張の可視化として見る。進捗率の主観バイアスへの対処としては、客観的 %complete 方式（0/100・50/50 の EV 算定）が候補。
- **対処・解決状況**: ⚠️ BAC 値は取得可能だが、「当初BAC（凍結ベースライン）に対する SPI 併記」「BAC トレンド常設」は Backlog、「客観的 EV 算定方式（evMethod）」は**実装予定（2026-07-06 格上げ）**（[機能化候補](#機能化候補backlog)参照）。

## ⓖ SV は構造的にマイナス基調 — 「先行」は稀（経験則）

- **現象**: 独立2案件とも全基準日で SV < 0。
- **理論的背景**: 計画楽観・90%症候群・work back-loading により、実プロジェクトの SV はゼロ近傍の負で推移するのが常態。**SV<0 それ自体はアラートではない**。
- **本ツールでの確認方法**: SV の絶対値ではなく、**トレンド（拡大/縮小）と PV比**で読む。トレンドは `calculateRecentSpi` の期間SPI（回復/失速）で、PV比は `SPI − 1` で捉える（ⓓ参照）。
- **対処・解決状況**: ✅ 指標は提供済み。閾値運用（例: |SV|/PV > 5% で注意）の素地あり。※ n=2 観測ベースの経験則（数理由来のⓐⓑⓓより確度は弱め）。

## ⓗ′ タスク同一性は ID 突合（正）＋「名称変化」を異常検知

- **現象**: WBS 再生成時の**採番ミスで ID が付け替わる**ことがあり、これはデータ品質の問題。
- **理論的背景**: ID は本来 stable な主キーで、突合を ID で行う現設計は正しい（同名タスクが多数あるため fullName 優先は誤マッチを量産する）。
- **本ツールでの確認方法**: `ProjectService.calculateTaskDiffs` は既に ID 突合済み（`diffType: added/removed/modified`）。
- **対処・解決状況**: ⚠️ 突合戦略は正しい（変更しない）。「**同一ID・名称変化**」「**同名・別ID**（削除＋追加の誤検知候補）」の警告出力は Backlog（[機能化候補](#機能化候補backlog)参照）。`calculateTaskDiffs` は既に両タスクを持つため、`prevTask.name !== nowTask.name` フラグを1本足すだけで実現できる。

---

## 機能化候補（Backlog）

本知識ベースから導かれる、未実装の機能化候補。実運用でのニーズが確認され次第、「公開 API 追加の基準」（[.kiro/steering/master-spec-sync.md](../.kiro/steering/master-spec-sync.md)）に照らして spec 化する。

| 候補 | 知見 | 概要 |
|------|------|------|
| 停滞タスクの経時追跡（[#184](https://github.com/masatomix/evmtools-node/issues/184)） | ⓒ | 同一タスクの遅延日数を複数スナップショットで追跡（`getDelayedTasks` の時系列化） |
| BAC トレンド常設（[#185](https://github.com/masatomix/evmtools-node/issues/185)） | ⓕ | BAC 増加の可視化。当初BAC（凍結ベースライン）に対する SPI 併記 |
| EV 算定方式オプション（evMethod） | ⓕ | 0/100・50/50 の客観的 %complete 方式（進捗率の主観バイアス対処）。**実装予定**（2026-07-06 に格上げ決定。phase5 spec の設計を再開） |
| 完了予測の幅（3点予測） | ⓑ | **レシピ化済み**（[EVM-MANAGEMENT-GUIDE.md](EVM-MANAGEMENT-GUIDE.md) の公式レシピ参照。専用 API は合成可能なため見送り） |
| タスク名変化の警告（[#186](https://github.com/masatomix/evmtools-node/issues/186)） | ⓗ′ | ID突合済みの diff に name 変化フラグを追加 |

---

## 関連ドキュメント

- [EVM-PRIMER.md](EVM-PRIMER.md) — AI・スキル向けドメイン知識の入口（理論×API対応・判断レシピ・落とし穴）
- [GLOSSARY.md](GLOSSARY.md) — EVM 用語・Earned Schedule 系指標の定義
- [EVM-MANAGEMENT-GUIDE.md](EVM-MANAGEMENT-GUIDE.md) — 日常の進捗管理手順
- [brainstorm-evm-indicators.md](brainstorm-evm-indicators.md) — 本知識ベースの元資料（ブレスト原文）
- [docs/specs/domain/master/INDEX.md](specs/domain/master/INDEX.md) — 全クラス・公開APIカタログ
