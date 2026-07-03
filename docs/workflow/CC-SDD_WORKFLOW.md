# cc-sdd（Kiro 式）開発ワークフロー

**作成日**: 2026-05-25
**バージョン**: 1.0.0

---

## 1. 概要

本プロジェクトでは、**Git Flow** ブランチ戦略と **cc-sdd（Kiro スタイルの仕様駆動開発）** を組み合わせた開発ワークフローを採用しています。

cc-sdd は Claude Code のスキル群（`/kiro-*` コマンド）として実装されており、要件定義 → 設計 → タスク分解 → 実装の各フェーズを対話的に進めます。

> **旧 SDD との違い**: 旧 SDD（`/sdd` コマンド）はモノリシックなスキルでしたが、cc-sdd は 17 個のスキルに分解され、各フェーズでより深いレビューゲートと検証を提供します。

---

## 2. 全体フロー図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      cc-sdd 開発ワークフロー全体図                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  【Phase 0: 準備（任意）】                                                   │
│                                                                             │
│  ┌──────────────┐    ┌──────────────────┐                                  │
│  │/kiro-steering│───▶│ .kiro/steering/  │  プロジェクト共通知識の初期化      │
│  └──────────────┘    │ product/tech/    │                                  │
│                      │ structure.md     │                                  │
│                      └──────────────────┘                                  │
│                                                                             │
│  【Phase 1: 仕様化】                                                        │
│                                                                             │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐      │
│  │  spec-init │───▶│requirements│───▶│   design   │───▶│   tasks    │      │
│  │ brief.md   │    │ EARS形式   │    │ 技術設計書  │    │ タスク分解  │      │
│  │ spec.json  │    │ 受入基準   │    │ IF仕様     │    │ 1-3h粒度   │      │
│  └────────────┘    └──────┬─────┘    └──────┬─────┘    └──────┬─────┘      │
│       │                   │                  │                 │            │
│       │            ┌──────▼─────┐     ┌──────▼─────┐    ┌─────▼──────┐    │
│       │            │  承認ゲート │     │  承認ゲート │    │ 承認ゲート  │    │
│       │            │ (人間レビュー)│     │(人間レビュー)│    │(人間レビュー)│    │
│       │            └────────────┘     └────────────┘    └────────────┘    │
│       │                                                                    │
│  ═════╪════════════════════════════════════════════════════════════════    │
│       │                                                                    │
│  【Phase 2: 実装】                                                         │
│       │                                                                    │
│       ▼                                                                    │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐     │
│  │ /kiro-impl │───▶│ /kiro-     │───▶│ /kiro-     │───▶│ マスター   │     │
│  │ TDD実装    │    │  review    │    │validate-impl│   │ 設計書反映  │     │
│  │ RED→GREEN  │    │ タスクレビュー│   │ 統合検証   │    │（手動）    │     │
│  └────────────┘    └────────────┘    └────────────┘    └──────┬─────┘     │
│                                                               │            │
│  ═════════════════════════════════════════════════════════════╪════        │
│                                                               │            │
│  【Git Flow】                                                 ▼            │
│                                                          ┌──────────┐     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │   PR     │     │
│  │ feature  │───▶│   PR     │───▶│ develop  │◀──────────│Closes #nn│     │
│  │ ブランチ  │    │(develop)  │    │ マージ   │           └──────────┘     │
│  └──────────┘    └──────────┘    └──────────┘                             │
│                                       │                                    │
│                                       ▼                                    │
│                                 ┌──────────┐    ┌──────────┐              │
│                                 │ release  │───▶│   main   │              │
│                                 │ ブランチ  │    │  + タグ  │              │
│                                 └──────────┘    └──────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. フェーズ別の詳細

### 3.1 Phase 0: 準備（任意）

プロジェクトの共通知識（steering）を初期化・更新する。初回のみ必要。

| コマンド | 用途 |
|---------|------|
| `/kiro-steering` | `product.md`, `tech.md`, `structure.md` を自動生成 |
| `/kiro-steering-custom` | 追加の steering（テスト方針、API 規約など）を作成 |

**成果物**: `.kiro/steering/*.md`

### 3.2 Discovery（任意）

何から始めるか迷った時の起点。アイデアを入力すると、最適なアクションパスを判定する。

```
/kiro-discovery "CSVの読込速度を改善したい"
```

**判定結果の例**:
- A: 既存 spec の更新
- B: spec 不要（簡単な修正）
- C: 単一の新規 spec 作成
- D: 複数 spec に分解
- E: 混合アプローチ

### 3.3 Phase 1: 仕様化

#### 3.3.1 一括実行（推奨: 小〜中規模の機能）

```
/kiro-spec-quick "CSV読込時のエンコード自動判定" --auto
```

init → requirements → design → tasks を一気に実行する。`--auto` なしの場合は各フェーズで確認が入る。

#### 3.3.2 段階実行（大規模・複雑な機能）

```bash
# 1. 初期化: brief.md と spec.json を生成
/kiro-spec-init "CSV読込時のエンコード自動判定"

# 2. 要件定義: EARS 形式で受入基準を定義
/kiro-spec-requirements csv-encoding-detection

# 3. （任意）既存コードとのギャップ分析
/kiro-validate-gap csv-encoding-detection

# 4. 技術設計: アーキテクチャ、IF仕様、トレーサビリティ
/kiro-spec-design csv-encoding-detection

# 5. （任意）設計レビュー: GO/NO-GO 判定
/kiro-validate-design csv-encoding-detection

# 6. タスク分解: 1〜3 時間粒度のタスクリスト
/kiro-spec-tasks csv-encoding-detection
```

**各フェーズの承認ゲート**: 各フェーズ完了時に人間の確認を求めます。`-y` フラグで省略可能ですが、重要な機能では推奨しません。

#### 3.3.3 成果物の配置

```
.kiro/specs/csv-encoding-detection/
├── brief.md           # 機能概要
├── spec.json          # フェーズ管理（承認状態）
├── requirements.md    # EARS 形式の要件定義
├── design.md          # 技術設計書（IF仕様、トレーサビリティ）
├── tasks.md           # タスク分解
└── research.md        # 調査メモ（任意）
```

### 3.4 Phase 2: 実装

#### 3.4.1 自律モード（推奨）

```
/kiro-impl csv-encoding-detection
```

タスク番号を指定しない場合、自律モードで動作:
1. 未完了タスクを順に処理
2. タスクごとにサブエージェントを起動
3. TDD サイクル（RED → GREEN → REFACTOR）
4. タスク完了後に自動レビュー（`/kiro-review`）
5. 全タスク完了後に統合検証（`/kiro-validate-impl`）

#### 3.4.2 マニュアルモード

```
/kiro-impl csv-encoding-detection 1 3
```

特定のタスク番号を指定して、メインコンテキスト内で実装する。

#### 3.4.3 失敗時の対応

```
/kiro-debug              # ルートコーズ分析
/kiro-verify-completion   # 完了主張の検証
```

### 3.5 マスター設計書への反映

> **重要**: この手順は cc-sdd の自動化範囲外です。実装完了後に手動で実施してください。

1. `.kiro/specs/{feature}/design.md` の内容を確認
2. 対応するマスター設計書（`docs/specs/domain/master/{Class}.spec.md`）に反映:
   - 新規メソッド/プロパティ → メソッド仕様セクション
   - テストケース → テストシナリオセクション
   - インターフェース変更 → 型定義更新
   - 変更履歴 → バージョン・日付・概要を追記
3. PR マージ前に反映が完了していること

詳細は [`.kiro/steering/master-spec-sync.md`](../../.kiro/steering/master-spec-sync.md) を参照。

---

## 4. 進捗確認

いつでも以下で進捗を確認できます:

```
/kiro-spec-status csv-encoding-detection
```

表示される情報:
- 各フェーズの承認状態
- 未完了タスク
- ブロッカーの有無
- 次のアクション

---

## 5. コマンド早見表

| フェーズ | コマンド | 説明 |
|---------|---------|------|
| **準備** | `/kiro-steering` | プロジェクト共通知識を初期化 |
| | `/kiro-steering-custom` | カスタム steering を作成 |
| **探索** | `/kiro-discovery "説明"` | アクションパスを判定 |
| **仕様（一括）** | `/kiro-spec-quick {feature} [--auto]` | 一括 spec 生成 |
| **仕様（段階）** | `/kiro-spec-init "説明"` | spec 初期化 |
| | `/kiro-spec-requirements {feature}` | EARS 形式要件定義 |
| | `/kiro-validate-gap {feature}` | 既存コードとのギャップ分析 |
| | `/kiro-spec-design {feature}` | 技術設計書生成 |
| | `/kiro-validate-design {feature}` | 設計レビュー（GO/NO-GO） |
| | `/kiro-spec-tasks {feature}` | タスク分解 |
| | `/kiro-spec-batch` | 複数 spec の並列生成 |
| **実装** | `/kiro-impl {feature} [tasks]` | TDD 実装 |
| | `/kiro-review` | タスク実装レビュー |
| | `/kiro-validate-impl {feature}` | 統合検証 |
| | `/kiro-verify-completion` | 完了検証 |
| | `/kiro-debug` | 失敗時のルートコーズ分析 |
| **共通** | `/kiro-spec-status {feature}` | 進捗確認 |

---

## 6. 旧 SDD との対応

| 旧 SDD コマンド | cc-sdd での対応 |
|----------------|----------------|
| `/sdd init` | `/kiro-spec-init` |
| `/sdd requirements` | `/kiro-spec-requirements` |
| `/sdd design` | `/kiro-spec-design` |
| `/sdd tasks` | `/kiro-spec-tasks` |
| `/sdd impl` | `/kiro-impl` |
| `/sdd verify` | `/kiro-validate-impl` + `/kiro-verify-completion` |
| `/sdd status` | `/kiro-spec-status` |
| `/sdd backward` | （廃止: 既存コード文書化は直接実施） |

### 成果物の配置場所の変更

| 種別 | 旧 SDD | cc-sdd |
|------|--------|--------|
| 要件定義書 | `docs/specs/requirements/REQ-*.md` | `.kiro/specs/{feature}/requirements.md` |
| 設計書 | `docs/specs/domain/features/*.spec.md` | `.kiro/specs/{feature}/design.md` |
| タスク | `docs/specs/domain/features/*.tasks.md` | `.kiro/specs/{feature}/tasks.md` |
| マスター設計書 | `docs/specs/domain/master/*.spec.md` | **変更なし**（同じ場所を使用） |

---

## 7. Git Flow との組み合わせ

cc-sdd の作業は全て **feature ブランチ** 上で行う。

```bash
# 1. develop から feature ブランチを worktree で作成
git fetch origin
git worktree add -b feature/機能名 ../evmtools-node_feature-機能名 origin/develop --no-track

# 2. worktree に移動して cc-sdd で開発
cd ../evmtools-node_feature-機能名

# 3. Phase 1: 仕様化
#    /kiro-spec-quick "機能説明"
#    → コミット: docs: {feature} の仕様書を作成

# 4. Phase 2: 実装
#    /kiro-impl {feature}
#    → コミット: feat: {feature} を実装

# 5. マスター設計書反映
#    → コミット: docs: マスター設計書に {feature} を反映

# 6. PR 作成（ベース: develop）
git push -u origin feature/機能名
gh pr create --base develop

# 7. マージ後、worktree を削除
cd ../evmtools-node_sdd
git worktree remove ../evmtools-node_feature-機能名
git branch -d feature/機能名
```

---

## 8. 要件↔実装↔テストの追跡方法

トレーサビリティは **feature 名（`.kiro/specs/` のディレクトリ名）を横断キー**にして辿る（ポインタモデル。詳細は [`master-spec-sync.md`](../../.kiro/steering/master-spec-sync.md)）。

```bash
# 例: phase0-bugfix-0.0.29 の要件→実装→テスト→マスター設計書を横断検索
git grep -l "phase0-bugfix"
#   .kiro/specs/phase0-bugfix-0.0.29/requirements.md   ← 要件（AC 番号つき）
#   .kiro/specs/phase0-bugfix-0.0.29/tasks.md          ← タスク（_Requirements: 3.1 等で AC に紐づく）
#   src/domain/__tests__/TaskRow.finished.test.ts      ← テスト（冒頭コメントに feature 名 + 要件番号）
#   docs/specs/domain/master/TaskRow.spec.md           ← マスター設計書（変更履歴に feature 名）
```

- 順方向（要件→テスト）: requirements.md の AC 番号 → tasks.md の `_Requirements` → タスクが作ったテストファイル
- 逆方向（コード→要件）: テスト/変更履歴の feature 名 → `.kiro/specs/{feature}/requirements.md`
- 旧方式（REQ-* ID）の追跡は各マスター設計書の凍結済みトレーサビリティ表を参照

## 9. 関連ドキュメント

| ドキュメント | パス | 内容 |
|-------------|------|------|
| cc-sdd ワークフロー定義 | [`.kiro/CLAUDE.md`](../../.kiro/CLAUDE.md) | スキル構成・最小ワークフロー |
| マスター設計書同期ルール | [`.kiro/steering/master-spec-sync.md`](../../.kiro/steering/master-spec-sync.md) | 同期タイミング・反映内容 |
| プロダクト概要 | [`.kiro/steering/product.md`](../../.kiro/steering/product.md) | EVM ドメイン用語・コアケーパビリティ |
| 旧 SDD ワークフロー | [`docs/attic/DEVELOPMENT_WORKFLOW.md`](../attic/DEVELOPMENT_WORKFLOW.md) | 旧方式のアーカイブ（歴史資料） |
| コア用語集 | [`docs/GLOSSARY.md`](../GLOSSARY.md) | EVM 用語・クラス詳細仕様 |
