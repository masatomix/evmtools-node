# Brief: sdd-consolidation

## Problem

本リポジトリには仕様駆動開発の方式が2つ併存している。(1) 旧・独自SDD（`docs/specs/domain/features|master` + `DEVELOPMENT_WORKFLOW.md` + 削除済み `/sdd` スキル）と、(2) 新・cc-sdd（`.kiro/` + kiro-* スキル群、PR #167 で導入）。旧方式は廃止したいが、旧方式が持っていた「マスター設計書＝アプリ全体を横串で捧持する永続設計書」の思想は失いたくない。cc-sdd は feature 単位の spec を量産する方式のため、放置すると「API を追加するたびにその API の spec だけが増え、全体の API 一覧・横串の全体設計書が存在しない」状態に陥る。

## Current State

- 開発プロセスは事実上 cc-sdd（roadmap + 6 spec が `.kiro/specs/` に作成済み）
- `.kiro/steering/master-spec-sync.md` を v2 に改訂済み（本 spec の成果物その1。cc-sdd 一本化宣言 + マスター設計書体系 + 同期ゲート + 旧資産の扱いを規定）
- 未整理の旧資産: `docs/specs/domain/master/*.spec.yaml` 9本（#65 open）、`features/*.spec.md` 群（凍結未宣言。phase0 で recent-spi spec を改訂してしまった=旧方式の運用が続いている）、`DEVELOPMENT_WORKFLOW.md`/`SAMPLE_DEVELOPMENT_FLOW.md`（現行フローと誤認しうる）、CLAUDE.md（main は旧SDD記述のまま。develop も旧 features 必須セクション規定が残る）、`docs/specs/domain/master/INDEX.md`（APIカタログ）は未存在
- 横串文書の欠落: 全クラス・全公開 API の一覧がどこにもない（master spec は9クラス分あるが一覧・網羅性チェックの仕組みがない）

## Desired Outcome

- 仕様駆動開発が cc-sdd に一本化され、CLAUDE.md・docs がそれを一貫して案内する
- `docs/specs/domain/master/` が「アプリ全体の設計書」として機能する: INDEX.md（クラス一覧+公開APIカタログ）+ クラス単位 spec.md、全公開 API がいずれかに載っている
- 実装フローに「マスター同期ゲート」が組み込まれ、以後の feature 開発で全体設計書が自動的に育つ
- 旧方式の資産が「凍結/削除/アーカイブ」いずれかに整理され、新規参加者が迷わない

## Approach

steering v2（改訂済み）を規範とし、4段階で移行する。

### M1: 方式の確定とスキルへの組み込み
- `.kiro/steering/master-spec-sync.md` v2 のレビュー・確定（済→本 PR でレビュー）
- `.claude/skills/kiro-spec-tasks/rules/tasks-generation.md` に「マスター同期タスク（{Class}.spec.md + INDEX.md 更新）を必ず含める」規則を追記
- `.claude/skills/kiro-validate-impl/SKILL.md`（または rules/）にマスター同期の検証項目を追記

### M2: 横串ドキュメント（APIカタログ）の初版作成
- `docs/specs/domain/master/INDEX.md` を新設: レイヤー別クラス一覧（責務1行）+ 公開 API カタログ（サブパス export（domain/infrastructure/usecase/common/resource）の全 export を棚卸し）
- 既存 master spec が無いクラスの洗い出し（例: TreeFormatter, TaskService の網羅性確認）と、不足分の master spec 新設（コードからの逆起こし）
- GLOSSARY.md から INDEX.md への相互リンク

### M3: 旧方式の廃止処理（Attic 方式: 現役ディレクトリに新旧を並べない）
- `docs/attic/` を新設（README.md に「歴史資料。現行文書は docs/workflow/CC-SDD_WORKFLOW.md と docs/specs/domain/master/ を参照」を明記）
- **細切れ設計書の2段階処分**: `docs/specs/domain/features/*.spec.md` 全件について、
  (1) **吸収監査** — 各 spec のインターフェース仕様・テストケース・要件トレーサビリティが対応する `master/{Class}.spec.md` に反映済みか突き合わせ、未反映分を master に吸収（監査結果は表で記録）
  (2) 吸収確認後に `git mv` で `docs/attic/features/` へ退避。`docs/specs/domain/` には master 体系のみが残る
- `docs/workflow/DEVELOPMENT_WORKFLOW.md` / `SAMPLE_DEVELOPMENT_FLOW.md` を `git mv` で `docs/attic/` へ退避（冒頭に現行文書への誘導注記）。`docs/workflow/` は CC-SDD_WORKFLOW.md のみに
- `docs/specs/domain/master/*.spec.yaml` 9本を削除（#65 をクローズ。Git 履歴に残るため attic 不要）
- `docs/specs/requirements/REQ-*.md` は当面現位置（master のトレーサビリティが参照する要件原本）。吸収監査の結果を見て attic 退避を判断
- CLAUDE.md の「仕様駆動開発」セクションを cc-sdd + master 維持規約の案内に全面書き換え（features 必須セクション規定を削除し、master-spec-sync v2 への参照に置換）。README・GLOSSARY 等から旧文書へのリンクを全 grep して現行文書に張り替え
- #66（SDDワークフローのテンプレート化）は cc-sdd 一本化により再定義 or クローズ判断

### M4: 運用開始と検証
- 進行中の 6 spec（phase0〜5）の tasks.md のマスター同期タスクが v2 規約（INDEX.md 更新を含む）を満たすか確認し、必要なら文言追記
- phase0（PR #173）のマスター同期を新方式の初運用として実施（ProjectService/TaskRow の spec.md 更新 + INDEX.md 反映）
- `/kiro-spec-status` 相当で全 spec の整合を確認

## Scope

- **In**: steering v2 確定、kiro スキル 2 本への規則追記、INDEX.md 新設と API 棚卸し、不足 master spec の逆起こし、旧資産の凍結/削除/アーカイブ、CLAUDE.md/README 改訂、#65/#66 の整理
- **Out**: 6 spec（phase0〜5）の内容変更（マスター同期タスクの文言追記を除く）、コード変更、GLOSSARY 本体の再構成

## Boundary Candidates

- 方式・スキル規則（M1）/ APIカタログ（M2）/ 旧資産整理（M3）/ 運用検証（M4）

## Out of Boundary

- evmtools スキル・webui 側のドキュメント
- `.kiro/settings/templates/` の変更（cc-sdd 本体テンプレートは上流由来のため触らない。規則は rules/ 追記で対応）

## Upstream / Downstream

- **Upstream**: なし（docs/プロセスのみ。phase0〜5 と独立に着手可能）
- **Downstream**: すべての将来 feature 開発（同期ゲートの適用を受ける）。phase0 の残タスク「master 設計書同期」は本 spec の M4 と統合して実施すると二度手間がない

## Existing Spec Touchpoints

- **Extends**: `.kiro/steering/master-spec-sync.md`（v2 改訂済み）
- **Adjacent**: phase0〜5 の 6 spec（tasks.md のマスター同期タスク文言）、CLAUDE.md、docs/workflow/CC-SDD_WORKFLOW.md

## Constraints

- docs/プロセスのみの変更（src/ 変更なし）のためリリース番号は消費しない（次リリースに同乗）
- CLAUDE.md は main へのリリースで反映されるまで新旧が併存する点を PR 説明に明記
- INDEX.md の API 棚卸しは package.json の exports 実体（src/*/index.ts のバレル）を正とする
