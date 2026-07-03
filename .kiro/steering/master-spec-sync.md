# 仕様駆動開発の統一規約（cc-sdd 一本化 + マスター設計書維持）v2

本プロジェクトの仕様駆動開発は **cc-sdd（Kiro式）に一本化**する。ただし、旧方式が持っていた
「アプリ全体を横串で捧持するマスター設計書」の思想は本 steering として存続・強化する。

## 基本原則

1. **開発プロセスは cc-sdd のみ**: 要件→設計→タスク→実装は `.kiro/specs/{feature}/`
   （requirements.md / design.md / tasks.md）で行う。
   旧方式の案件設計書（`docs/specs/domain/features/*.spec.md`）は**新規作成禁止**（廃止）。
2. **feature spec は一時文書、マスター設計書は永続文書**:
   feature spec は「その要件を実現するための開発文書」であり、実装完了・マスター同期後は
   履歴（アーカイブ）となる。恒久的な真実は **マスター設計書 + コード** に置く。
3. **細切れ化の禁止**: 「API を追加するたびにその API の spec だけが増え、全体像がどこにもない」
   状態を避ける。新規 API・クラスは必ずマスター体系（下記）に反映する。

## マスター設計書体系（アプリ全体の設計書）

```
docs/specs/domain/master/
├── INDEX.md               # 全クラス一覧・責務マップ・公開APIカタログ（横串）
├── {Class}.spec.md        # クラス単位の永続リファレンス（メソッド仕様・テストシナリオ・変更履歴）
└── （*.spec.yaml は廃止済み）
```

- **INDEX.md（APIカタログ）**: レイヤー別のクラス一覧、各クラスの責務1行、公開メソッド一覧
  （シグネチャ・概要・導入バージョン・出典 feature spec へのリンク）。
  「全体の API 一覧が存在しない」状態を防ぐ横串文書。
- **{Class}.spec.md**: 複数 feature spec に分散した変更をクラス単位に集約する。価値:
  クラスの全体像 / 新メンバーのオンボーディング / 影響範囲の特定。
  必須セクション: 概要 / インターフェース仕様 / 処理仕様 / テストシナリオ /
  要件トレーサビリティ（AC-ID が grep 可能な形式）/ 変更履歴。
  正例: `CsvProjectCreator.spec.md`（トレーサビリティ付き）、`Project.spec.md`（複数要件の集約）。
- 用語・ドメイン概念は `docs/GLOSSARY.md`、運用知見は `docs/EVM-KNOWLEDGE.md`（phase5〜）が担う。

## 同期ルール（必須ゲート）

**実装完了後・PR マージ前**に以下を行う。`/kiro-impl` 完了後の必須作業であり、
tasks.md 生成時（`/kiro-spec-tasks`）は**マスター同期タスクを必ず含めること**。

| feature spec / 実装の変更 | マスター体系への反映 |
|--------------------------|---------------------|
| 新規クラス | `{Class}.spec.md` 新設 + INDEX.md に行追加 |
| 新規メソッド/プロパティ/型 | 該当 `{Class}.spec.md` のメソッド仕様 + INDEX.md の API 行追加 |
| インターフェース変更 | 型定義・シグネチャを更新（Behavior Change は明記） |
| テストケース | テストシナリオセクションに追加（または実テストへの参照） |
| すべての変更 | 変更履歴にバージョン・日付・概要・出典 feature 名を追記 |

同期漏れは `/kiro-validate-impl` / レビューで指摘対象とする。

## feature spec のライフサイクル

1. `/kiro-discovery` → `/kiro-spec-init` → requirements → design → tasks → `/kiro-impl`
2. 実装完了 → **マスター同期（上記）** → PR マージ
3. マージ後の feature spec は履歴として `.kiro/specs/` に残す（更新しない）。
   同じ領域の追加開発は新しい feature spec を切る。

## 旧方式の資産の扱い

| 資産 | 扱い |
|------|------|
| `docs/specs/domain/features/*.spec.md` | 凍結（冒頭にアーカイブ注記）。新規作成禁止。内容の最新版はマスター側 |
| `docs/specs/domain/master/*.spec.yaml` | 削除（#65） |
| `docs/workflow/DEVELOPMENT_WORKFLOW.md` / `SAMPLE_DEVELOPMENT_FLOW.md` | アーカイブ注記（現行フローは `CC-SDD_WORKFLOW.md`） |
| `docs/specs/requirements/REQ-*.md` | 既存分は履歴として保持。新規要件は `.kiro/specs/{feature}/requirements.md` に書く |

---
_kiro spec は機能を記述し、マスター設計書はアプリ全体（クラスと公開API）の恒久的な全体像を記述する。両者は補完関係にある。_
