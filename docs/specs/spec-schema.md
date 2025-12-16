# 設計書YAMLスキーマ定義

**バージョン**: 1.0.0
**作成日**: 2025-12-16

---

## 概要

このドキュメントは、設計書YAML形式の統一スキーマを定義する。
フォワード（要件→設計書）でもリバース（ソース→設計書）でも同一形式を使用する。

---

## スキーマ構造

```yaml
# ============================================
# メタデータ
# ============================================
metadata:
  id: string                    # 仕様書ID (例: SPEC-PROJECT-001)
  name: string                  # クラス名
  version: string               # 仕様書バージョン
  source: forward | reverse     # 生成元
  source_file: string           # ソースファイルパス（リバース時）
  created_at: date              # 作成日
  updated_at: date              # 更新日
  requirement_ids: string[]     # 紐付く要件ID（フォワード時は必須）

# ============================================
# 基本情報
# ============================================
classification:
  type: entity | value_object | aggregate_root | domain_service
  package: string               # パッケージパス
  responsibility: string        # 責務（SRP）

# ============================================
# ユビキタス言語（ドメイン用語）
# ============================================
ubiquitous_language:
  - term: string                # ドメイン用語
    implementation: string      # 実装名
    definition: string          # 定義

# ============================================
# 不変条件
# ============================================
invariants:
  - id: string                  # 不変条件ID (例: INV-01)
    description: string         # 説明
    expression: string          # 検証式（TypeScript/疑似コード）
    verification_timing: string # 検証タイミング

# ============================================
# プロパティ
# ============================================
properties:
  - name: string                # プロパティ名
    type: string                # 型
    required: boolean           # 必須か
    visibility: private | public | protected
    readonly: boolean           # 読み取り専用か
    constraints: string[]       # 制約条件
    default: any                # デフォルト値
    description: string         # 説明

# ============================================
# コンストラクタ
# ============================================
constructor:
  signature: string             # シグネチャ
  preconditions:
    - id: string
      condition: string
      on_violation: string      # 違反時の動作
  postconditions:
    - id: string
      condition: string

# ============================================
# メソッド
# ============================================
methods:
  - id: string                  # メソッドID (例: METHOD-001)
    name: string                # メソッド名
    signature: string           # シグネチャ
    purpose: string             # 目的

    preconditions:
      - id: string
        condition: string

    postconditions:
      - id: string
        condition: string

    algorithm: string           # 計算ロジック/アルゴリズム（複数行可）

    # ============================================
    # ビジネスルール（任意：ドメインの制約がある場合）
    # ============================================
    business_rules:
      - id: string              # ビジネスルールID (例: BR-01)
        rule: string            # ルールの内容
        on_violation: string    # 違反時の動作（エラー種別など）

    # ============================================
    # 外部依存（任意：外部連携がある場合）
    # ============================================
    external_dependencies:
      - name: string            # 外部システム名
        type: string            # 種別（REST API / Database / Message Queue など）
        description: string     # 説明

    exceptions:
      - condition: string       # 例外発生条件
        error: string           # エラー内容

    equivalence_classes:        # 同値クラス
      - id: string
        category: normal | boundary | error
        description: string
        input: object           # 入力条件
        expected: object        # 期待結果

    test_scenarios:             # テストシナリオ（Given-When-Then）
      - id: string              # テストID (例: TC-001)
        description: string     # テスト説明
        given: object | string  # 前提条件
        when: string            # 操作
        then: object | string   # 期待結果

# ============================================
# 関連オブジェクト
# ============================================
relationships:
  - target: string              # 関連先クラス名
    type: composition | aggregation | association | dependency
    description: string
```

---

## 使用例

```yaml
metadata:
  id: SPEC-PROJECT-001
  name: Project
  version: 1.0.0
  source: reverse
  source_file: src/domain/Project.ts
  requirement_ids: []

classification:
  type: aggregate_root
  package: domain
  responsibility: プロジェクト全体のタスク情報を保持し、EVM分析に必要な統計データを提供

invariants:
  - id: INV-01
    description: baseDateは必ず存在する
    expression: this.baseDate !== undefined
    verification_timing: 生成時・全操作

methods:
  - id: METHOD-001
    name: toTaskRows
    signature: "toTaskRows(): TaskRow[]"
    purpose: TaskNodeツリーをフラット化したTaskRow配列を返す

    postconditions:
      - id: POST-TR01
        condition: 戻り値はTaskRow[]型
      - id: POST-TR02
        condition: 同一インスタンスで再呼び出し時、同一配列参照を返す

    equivalence_classes:
      - id: EQ-TR-001
        category: normal
        description: 階層構造のフラット化
        input:
          taskNodes:
            - { id: 1, name: "親", children: [{ id: 2, name: "子" }] }
        expected:
          length: 2
          "[0].level": 1
          "[1].level": 2

      - id: EQ-TR-002
        category: boundary
        description: 空配列
        input:
          taskNodes: []
        expected:
          length: 0

    test_scenarios:
      - id: TC-TR-001
        description: 階層構造のTaskNodeがフラット化される
        given:
          taskNodes:
            - { id: 1, name: "親", children: [{ id: 2 }, { id: 3 }] }
        when: toTaskRows()を呼び出す
        then:
          - 3件のTaskRowが返される
          - id=1のlevelは1
          - id=2のlevelは2
```

---

## テスト生成との対応

| YAMLセクション | 生成されるテスト |
|---------------|-----------------|
| `invariants` | 不変条件テスト（全メソッドで検証） |
| `constructor.preconditions` | コンストラクタ異常系テスト |
| `constructor.postconditions` | コンストラクタ正常系テスト |
| `methods[].preconditions` | メソッド事前条件テスト |
| `methods[].postconditions` | メソッド事後条件テスト |
| `methods[].business_rules` | ビジネスルールテスト（違反時の動作検証） |
| `methods[].external_dependencies` | モック対象の特定（テストコード生成時の参考情報） |
| `methods[].equivalence_classes` | 同値クラステスト |
| `methods[].test_scenarios` | シナリオテスト |
