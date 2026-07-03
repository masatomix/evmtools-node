# 要件定義書

## はじめに

仕様駆動開発を cc-sdd（Kiro式）に一本化しつつ、旧方式が持っていた「アプリ全体を横串で捧持するマスター設計書」の思想を steering として存続・強化する。方式そのものは `.kiro/steering/master-spec-sync.md` v2（承認済み）で規定済みであり、本 spec はその方式への**移行作業**を要件化する。詳細背景は brief.md を参照。

## 要件

### 要件 1: 開発スキルへの同期ルールの組み込み

**目的:** 保守者として、マスター同期が人の記憶ではなくスキルの規則として強制されるようにしたい。それにより、以後の feature 開発で全体設計書が自動的に育つ。

#### 受入基準（Acceptance Criteria）

1. The kiro-spec-tasks のタスク生成規則 shall 「マスター同期タスク（`{Class}.spec.md` 更新 + `INDEX.md` 更新）を必ず含める」ことを規定する。
2. The kiro-validate-impl の検証項目 shall マスター設計書・INDEX.md の同期漏れを検出対象に含む。

### 要件 2: 横串APIカタログ（INDEX.md）の整備

**目的:** 利用者・保守者として、全クラスと公開 API の一覧を一箇所で参照したい。それにより「API を追加するたびに個別 spec だけが増え、全体像がない」状態を防ぐ。

#### 受入基準（Acceptance Criteria）

1. The `docs/specs/domain/master/INDEX.md` shall レイヤー別の全クラス一覧（責務1行）と公開 API カタログ（クラス・メソッド/型・概要・マスター設計書へのリンク）を含む。
2. The APIカタログ shall package.json の exports 実体（`src/*/index.ts` のバレル）に載る全公開シンボルを網羅する。
3. Where マスター設計書が存在しないクラスがある場合, the 移行作業 shall 一覧化し、主要クラスの master spec を新設または INDEX 上で「未文書化（Backlog）」と明示する。

### 要件 3: 旧方式資産の Attic 退避

**目的:** 新規参加者として、現役ディレクトリを見れば現行方式だけが分かる状態にしたい。

#### 受入基準（Acceptance Criteria）

1. The 移行作業 shall `docs/attic/` を新設し、README で現行文書への誘導を明記する。
2. The 移行作業 shall `docs/workflow/DEVELOPMENT_WORKFLOW.md` / `SAMPLE_DEVELOPMENT_FLOW.md` を `git mv` で attic へ退避し、`docs/workflow/` に現行文書のみを残す。
3. The 移行作業 shall `docs/specs/domain/features/` 全ファイルについて吸収監査（master への反映状況の突き合わせ）を行い、監査記録を残した上で `docs/attic/features/` へ退避する。未反映内容が見つかった場合は master に吸収してから退避する。
4. The 移行作業 shall `docs/specs/domain/master/*.spec.yaml` を削除し、#65 をクローズする。
5. When 退避・削除が完了した場合, the リポジトリ内のリンク shall 旧位置を参照しない（README/GLOSSARY/CLAUDE.md 等を grep で確認）。

### 要件 4: CLAUDE.md・案内文書の一本化

**目的:** AI エージェントと人間の双方が、CLAUDE.md を読めば cc-sdd + マスター維持の現行方式だけに誘導されるようにしたい。

#### 受入基準（Acceptance Criteria）

1. The CLAUDE.md の仕様駆動開発セクション shall cc-sdd（kiro-*）と master-spec-sync v2 への参照に全面書き換えされ、旧 features/ 必須セクション規定を含まない。
2. The CLAUDE.md shall 参考文書として CC-SDD_WORKFLOW.md と INDEX.md を案内する。
3. The #66（SDDテンプレート化） shall cc-sdd 一本化を踏まえて再定義またはクローズされる。

### 要件 5: phase0 のマスター同期（新方式の初運用）

**目的:** 保守者として、PR #173 の残タスク（master 同期）を新方式のフローで消化し、同期ゲートの実効性を確認したい。

#### 受入基準（Acceptance Criteria）

1. The `docs/specs/domain/master/ProjectService.spec.md` shall 期間SPI（ΔEV/ΔPV）と空diff デフォルト値の仕様・テストシナリオ・変更履歴を反映する。
2. The `docs/specs/domain/master/TaskRow.spec.md` shall finished 許容誤差・toDaySerial 正規化・calculatePVs 親タスク土日除外の仕様・変更履歴を反映する。
3. The `INDEX.md` shall phase0 で追加された公開シンボル（truncateToLocalDate / diffCalendarDays / PROGRESS_RATE_EPSILON）を含む。
