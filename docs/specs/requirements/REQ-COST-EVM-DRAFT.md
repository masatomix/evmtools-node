# REQ-COST-EVM-DRAFT: コスト系 EVM（AC）導入の設計メモ

> **⚠️ 本メモは設計案であり、実装しない**（2026-07 計画時のユーザー決定「将来課題として設計だけ」の履行）。
> 導入判断の材料を将来に残すことが目的。対応 Backlog: [#191](https://github.com/masatomix/evmtools-node/issues/191)

---

## 1. 背景 — なぜ AC が「EVM の残り半分」なのか

本ライブラリは**工数（人日）ベースのスケジュール系 EVM** に特化している。PV/EV/SPI/SV、期間SPI（ΔEV/ΔPV）、Earned Schedule（SPI(t)）まで揃った現在、理論上の残ギャップは **AC（Actual Cost = 実投入工数）が入力できないこと**に集約される。

AC が無いと算出できない指標:

| 指標 | 式 | 意味 |
|------|-----|------|
| **CPI** | EV / AC | コスト効率。1未満 = 投入した工数に対して出来高が足りない（**予算超過の早期警報**） |
| **CV** | EV − AC | コスト差異（人日） |
| **EAC** | AC + (BAC−EV)/CPI ほか複数式 | 完成時総コスト予測 |
| **ETC** | EAC − AC | 残作業のコスト見積 |
| **TCPI** | (BAC−EV) / (BAC−AC) | 残予算で完成させるのに必要な効率（挽回可能性の判定） |
| **VAC** | BAC − EAC | 完成時予算差異 |
| **CR** | CPI × SPI | Critical Ratio（総合健全度の1指標化） |

**SPI だけでは「予定どおり進んでいるが、2倍の工数を投入して残業で回している」プロジェクトを健全と誤判定する。** これを検出できるのは CPI 系のみ。

## 2. 導入の前提（ゲート条件）

**現時点（2026-07）では実投入工数の記録運用は存在しない**。よって実装しない。ただし以下のシナリオで前提が変わり得る:

1. **記録済みの現場の存在**: 実工数を工数管理・勤怠システム等に入力しているプロジェクトが現れた場合（既存データの取り込みで開始できる）
2. **作業単位の正規化（AI駆動開発シナリオ）**: 仕様駆動開発・AI エージェント開発の普及により「タスク XX の実施を 1 時間とみなす」のような**規約ベースの AC 付与**が可能になる場合。人間の申告に頼らず、作業イベント（PR マージ・タスク完了等）から機械的に AC を積算できるため、従来の「実績入力の運用コスト」問題を回避できる可能性がある

導入判断時に確認すべきこと: (a) 記録の粒度（タスク単位か日単位か）(b) 更新頻度（日次スナップショットに載るか）(c) 単位の一貫性（PV/EV と同じ人日換算か）。

## 3. 入力ソース案

### 案A: 既存フォーマットへの列追加（推奨）

- **CSV**: 現行カラム（0:タスクID 〜 11:EV）の**12列目に「実績工数」**を追加。`CsvProjectCreator` のカラムマップ拡張（`src/infrastructure/CsvProjectCreator.ts` のカラム定義。既存11列は不変なので後方互換）
- **Excel**: WBS シートに「実績工数」列を追加し `ExcelTaskRowCreator` で読み取り。**列が無いファイルは AC=undefined として従来どおり動く**（非破壊）

### 案B: 別ファイル・ジョイン方式

工数実績を別 CSV（taskId, 日付, 実工数）で受け取り、taskId で突合。日次粒度の AC 時系列が得られる（CPI の時系列分析が可能になる）が、入力・突合の複雑さが増す。案Aで開始し、必要になったら拡張が現実的。

## 4. 型拡張案（すべてオプショナル＝非破壊）

```typescript
// TaskRow: コンストラクタ末尾にオプショナル引数を追加
public readonly actualWorkload?: number  // 実投入工数（人日）。"ac" は略語すぎるため命名は工数ベースに合わせる

// TaskRow メソッド
calculateCPI(): number | undefined   // ev / actualWorkload（actualWorkload が 0/undefined なら undefined）
calculateCV(): number | undefined    // ev - actualWorkload

// Statistics 型（オプショナル追加）
totalAc?: number     // Σ actualWorkload
cpi?: number         // ΣEV / ΣAC
cv?: number          // ΣEV − ΣAC
eac?: number         // AC + (BAC−EV)/CPI（標準式。楽観/悲観バリエーションは第2段階）
tcpi?: number        // (BAC−EV)/(BAC−AC)
vac?: number         // BAC − EAC
```

## 5. 段階導入プラン

| Phase | 内容 | 備考 |
|-------|------|------|
| A | AC 入力（CSV/Excel 列）+ CPI/CV | 最小。ここまでで「コストの警報」が鳴る |
| B | EAC/ETC/VAC（複数式）+ 完了予測へのコスト軸追加 | `calculateCompletionForecast` との整理が必要 |
| C | TCPI / CR / CPI 時系列（案B前提） | 高度分析 |

各 Phase とも「公開 API 追加の基準」（`.kiro/steering/master-spec-sync.md`）に照らして spec 化すること。AC はドメイン計算そのものなので基準は通る見込みだが、**ゲート条件（§2）の成立が先**。

## 6. 関連

- 理論ギャップ分析の原典: 計画時の EVM ギャップ調査（2026-07-02。コスト系が「入力から欠落」との結論）
- [docs/EVM-KNOWLEDGE.md](../../EVM-KNOWLEDGE.md) — 指標の読み方（スケジュール系）
- [docs/GLOSSARY.md](../../GLOSSARY.md) — 用語定義
