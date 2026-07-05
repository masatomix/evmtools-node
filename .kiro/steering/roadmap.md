# Roadmap

## Overview

evmtools-node（工数ベース EVM 分析ライブラリ、v0.0.28）の総合改修プロジェクト。オープン Issue 14件の棚卸し、利用側（masatomix/task の evmtools スキル、evmtools-webui）からの要請、EVM 理論（PMBOK / Earned Schedule）とのギャップ分析、既存バグの洗い出しの結果を、リリース単位の 6 spec に分解した。

方針は「バグ修正 → コア強化」の順の段階リリース（v0.0.29〜v0.0.34）。計算ロジックは evmtools-node に集約し、WebUI・CLI・スキルで数値を一致させる（task スキル側の独自実装 3 本をライブラリに取り込む）。コアスキル強化の本丸は Earned Schedule（既存データのみで古典 SPI の終盤 1.0 収束欠点を解消）。

## Approach Decision

- **Chosen**: リリース単位（フェーズ単位）の 6 spec 構成。各 spec は requirements → design → tasks を先行生成し、実装は別エージェントが `/kiro-impl` で担う。
- **Why**: リリース区切りと spec 境界が一致し、実装エージェントへの引き渡しがフェーズごとに完結する。バグ修正（Phase 0）が後続すべての依存元のため先頭に置く。
- **Rejected alternatives**: 機能単位の 10+ spec 分割（並列実装しやすいが本数過多で管理コスト増）、Phase 0〜2 のみ先行 spec 化（Phase 3 以降の設計整合を先に固めるべきと判断し不採用）。

## Scope

- **In**: バグ修正（#170 期間SPI、日付境界群、空diff）、軽微 Issue（#166/#138/#153/#165/#160）、task スキルロジック取り込み（日次PV・アラート・アクティブ検出）、Earned Schedule、Sカーブ/EAC 理論整理、% complete 方式、#171 知識ベース化
- **Out**: コスト系 EVM の実装（AC 入力が必要。設計メモのみ Phase 4 で作成）、WebUI 系 Issue #41/#27（WebUI リポジトリへ移管）、#3 複数プロジェクト Join・#66 SDD テンプレ化・#65 YAML 仕様書削除・WBS Excel 書き出し（task#687）・日次PVマトリクス Excel 装飾（Backlog）

## Constraints

- Git Flow: feature ブランチは develop から worktree で分岐（CLAUDE.md 準拠）。リリースは release/0.0.x ブランチ。
- 後方互換: サブパス export（domain/infrastructure/usecase/common/resource）と既存公開 API（`getStatistics({filter})` 0.0.25+、`getDelayedTasks()` 0.0.27+ 等）を維持。型追加はオプショナルで非破壊にする。
- #170 修正は同名メソッドの実装置き換え（シグネチャ不変・値のみ仕様準拠化）。CHANGELOG に Behavior Change を明記。
- `docs/specs/` の案件設計書（features/）とマスター設計書（master/）の同期必須（steering: master-spec-sync.md）。
- 検証ゲート: `npm run lint && npm run format && npm test && npm run build`（CI と同一、Node 20/22）。Phase 0 以降は TZ=Asia/Tokyo / TZ=UTC の二重テスト実行。
- 結合確認: `npm pack` した tgz を task リポジトリへ file: インストールして evmtools スキルの動作確認。webui はサブパス import の解決とビルド確認。

## Boundary Strategy

- **Why this split**: リリース単位で spec を切ることで、各 spec の完了 = 1 リリースとなり、実装エージェントの作業範囲・検証範囲・CHANGELOG が一対一で対応する。
- **Shared seams to watch**:
  - `src/common/utils.ts` の日付ヘルパー（phase0 が新設、phase1/phase2 が利用）
  - `ProjectService.calculateRecentSpi`（phase0 が修正、phase2 の AlertService と phase4 の EAC 悲観シナリオが利用）
  - `TaskRow.calculatePVs` の土日修正（phase0）→ phase3 の PV 曲線精度の前提
  - `Statistics` 型 / `StatisticsOptions`（phase3 と phase5 がそれぞれオプショナル拡張。フィールド名衝突に注意）
  - `Project.calculateEarnedSchedule` の SPI(t)（phase3 が定義、phase4 の予測バリエーションが利用）

## Direct Implementation Candidates

- [x] issue-cleanup -- #161（pbevm-tree 実装済み）と #124（CI 導入済み）のクローズ、#41/#27 の WebUI リポジトリへの転記・クローズ。コード変更なしの GitHub 操作のみなので spec 不要（phase0 の tasks に含めて実施する）

## Specs (dependency order)

- [x] phase0-bugfix-0.0.29 -- #170 期間SPI(ΔEV/ΔPV)修正・空diffデフォルト値・日付境界バグ群の一括修正 + Issue 整理。Dependencies: none
- [x] phase1-minor-issues-0.0.30 -- 軽微 Issue 一括実装（#166 greeting / #138 isReschedule / #153 fullName キャッシュ / #165 未完了タスク API / #160 サンプル）。Dependencies: phase0-bugfix-0.0.29
- [x] phase2-skill-integration-0.0.31 -- task スキル独自ロジックの取り込み（**スコープ改訂: getDailyPvByAssignee のみ**。AlertService / detectActiveSubprojects は「公開 API 追加の基準」により取り下げ・利用側に残置。リリースは 0.0.30 に phase1 残置分と合流）。Dependencies: phase0-bugfix-0.0.29
- [x] phase3-earned-schedule-0.0.32 -- Earned Schedule（ES / SPI(t) / SV(t) / IEAC(t)）の実装（**スコープ改訂: calculateEarnedSchedule + 型のみ。Statistics 統合は取り下げ**。リリースは 0.0.31 に繰り上げ）。Dependencies: phase0-bugfix-0.0.29
- [x] phase4-scurve-eac-0.0.33 -- **実装せず終結（2026-07-06 正式記録）**: ①scurve CLI 見送り（#192、プレゼン層）②forecastVariants 見送り（合成可能・ガイドにレシピ）③コスト系設計メモは REQ-COST-EVM-DRAFT.md として実施（#191）。EAC 理論対応表は EVM-MANAGEMENT-GUIDE に反映。Dependencies: phase2-skill-integration-0.0.31, phase3-earned-schedule-0.0.32
- [x] phase5-evmethod-knowledge-0.0.34 -- #171 EVM 知識ベース化（docs/EVM-KNOWLEDGE.md）を実施。**evMethod（0/100,50/50）は Backlog 先送り**（実運用ニーズ未確認）。機能化候補は #184/#185/#186 に起票。Dependencies: phase3-earned-schedule-0.0.32
- [x] sdd-consolidation -- 仕様駆動開発の cc-sdd 一本化（旧方式の廃止処理 + マスター設計書体系/APIカタログの整備、docs/プロセスのみ）。Dependencies: none（phase0〜5 と独立、M4 は phase0 実装マージ後）
