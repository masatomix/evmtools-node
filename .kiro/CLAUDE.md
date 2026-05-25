# エージェント型 SDLC と仕様駆動開発

エージェント型 SDLC 上で Kiro スタイルの仕様駆動開発 (Spec-Driven Development) を実践する。

## プロジェクトコンテキスト

### パス
- Steering（プロジェクト共通知識）: `.kiro/steering/`
- Specs（個別機能の仕様）: `.kiro/specs/`

### Steering と Specification の違い

**Steering** (`.kiro/steering/`) — プロジェクト全体に適用するルール・コンテキストで AI を導く
**Specs** (`.kiro/specs/`) — 個別機能ごとに開発プロセスを形式化する

### アクティブな仕様の確認
- 現在進行中の仕様は `.kiro/specs/` を参照
- 進捗確認には `/kiro-spec-status [feature-name]` を使用

## 開発ガイドライン
- 思考は英語、応答は日本語で行う。プロジェクトファイルに書き出す Markdown（`requirements.md`, `design.md`, `tasks.md`, `research.md`, 検証レポート等）は、その仕様で設定された言語（`spec.json.language` 参照）で記述する。

## 最小ワークフロー
- フェーズ 0（任意）: `/kiro-steering`, `/kiro-steering-custom`
- ディスカバリ: `/kiro-discovery "アイデア"` — アクションパスを判定し、`brief.md`（複数 spec の場合は加えて `roadmap.md`）を生成
- フェーズ 1（仕様化）:
  - 単一 spec: `/kiro-spec-quick {feature} [--auto]`、もしくは段階実行:
    - `/kiro-spec-init "description"`
    - `/kiro-spec-requirements {feature}`
    - `/kiro-validate-gap {feature}` （任意: 既存コードベース向け）
    - `/kiro-spec-design {feature} [-y]`
    - `/kiro-validate-design {feature}` （任意: 設計レビュー）
    - `/kiro-spec-tasks {feature} [-y]`
  - 複数 spec: `/kiro-spec-batch` — `roadmap.md` の依存順に基づき複数 spec を並列生成
- フェーズ 2（実装）: `/kiro-impl {feature} [tasks]`
  - タスク番号なし: 自律モード（タスク毎にサブエージェント起動 + 独立レビュー + 最終バリデーション）
  - タスク番号あり: マニュアルモード（選択タスクをメインコンテキスト内で実装。完了前にレビュアーゲートあり）
  - `/kiro-validate-impl {feature}` （単独で再バリデーション）
- 進捗確認: `/kiro-spec-status {feature}` （いつでも使用可）

## スキル構成
スキルは `.claude/skills/kiro-*/SKILL.md` に配置。

- 各スキルは `SKILL.md` を持つディレクトリ
- スキルは会話コンテキストを共有しながらインライン実行される
- 必要に応じてサブエージェントへ並列リサーチを委譲する
- テンプレートやサンプル等の追加ファイルをスキルディレクトリに置ける
- `kiro-review` — レビュアー用の、タスクローカルなアドバーサリアル・レビュープロトコル
- `kiro-debug` — デバッガ用の、根本原因優先デバッグプロトコル
- `kiro-verify-completion` — 完了・成功主張の前段で「鮮度のある証拠」を要求するゲート
- **そのタスクにスキルが適用される可能性が 1% でもあれば起動する。** 簡単に見える、を理由にスキルをスキップしない。

## 開発ルール
- 3 フェーズの承認ワークフロー: 要件 → 設計 → タスク → 実装
- 各フェーズで人間レビュー必須。`-y` は意図的にファストトラックする時のみ使う
- Steering を常に最新に保ち、`/kiro-spec-status` で整合性を確認する
- ユーザーの指示には厳密に従いつつ、そのスコープ内では自律的に動く: 必要なコンテキストを収集し、依頼を本セッション内で End-to-End に完遂する。本質的な情報が欠けている時、または致命的に曖昧な時のみ質問する。

## Steering 設定
- `.kiro/steering/` 配下を全てプロジェクトメモリとしてロード
- 既定ファイル: `product.md`, `tech.md`, `structure.md`
- カスタムファイルは `/kiro-steering-custom` で管理可能
