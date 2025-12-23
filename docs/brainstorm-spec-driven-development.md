# ブレインストーミング: 設計書駆動開発フロー

**日付**: 2025-12-16
**参加者**: masatomix, Claude
**ステータス**: ブレスト完了、次のアクション検討中

---

## 1. 背景・課題

既存プロジェクト（evmtools-node）において、以下の課題がある：

- DDD/クリーンアーキテクチャに準拠していない箇所が存在
- 正式なテストフレームワークが未導入
- 要件 → 設計 → テスト → 実装 のトレーサビリティがない

---

## 2. 理想とする開発フロー

### 2.1 目的

**要件からテストケース・実装までの一貫したトレーサビリティを確保する**

- 設計書を中心に据え、要件の反映確認とコード生成を両立させる
- 人間が読んで確認でき、かつ機械がコードを生成できる形式を採用する

### 2.2 フロー全体像

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  【フォワード】(メイン)         【リバース】(サブ)           │
│   要件 → 設計書                 ソース → 設計書             │
│        │                              │                    │
│        │                              ▼                    │
│        │                     ┌─────────────────┐           │
│        │                     │ 人間が補足      │           │
│        │                     │ ・なぜそうなっているか      │
│        │                     │ ・要件との紐付け│           │
│        │                     └────────┬────────┘           │
│        │                              │                    │
│        └──────────────┬───────────────┘                    │
│                       ▼                                    │
│                 設計書（統一形式）                          │
│                       │                                    │
│        ┌──────────────┼──────────────┐                     │
│        ▼              ▼              ▼                     │
│   人間が目視     テストケース    ソースコード               │
│   確認           生成（自動）    生成（自動）               │
│                       │              │                     │
│                       └──────┬───────┘                     │
│                              ▼                             │
│                        実装 / 検証                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 設計書の要件

### 3.1 三つの役割

| 役割 | 要件 |
|------|------|
| **人間向け** | 要件が正しく反映されているか目視確認できる |
| **機械向け（テスト）** | テストケースを自動生成できる |
| **機械向け（実装）** | ソースコードを自動生成できる |

### 3.2 設計書に含める項目

| セクション | 内容 | 人間確認 | テスト生成 | 実装生成 |
|------------|------|:--------:|:----------:|:--------:|
| **基本情報** | クラス名、分類、責務 | ✅ | - | ✅ |
| **ユビキタス言語** | ドメイン用語と実装名の対応 | ✅ | - | - |
| **不変条件** | 常に成り立つべき条件 | ✅ | ✅ | ✅ |
| **プロパティ仕様** | 型、必須/任意、制約、デフォルト値 | ✅ | ✅ | ✅ |
| **コンストラクタ仕様** | 事前条件、事後条件 | ✅ | ✅ | ✅ |
| **メソッド仕様** | 事前条件、事後条件、計算ロジック | ✅ | ✅ | ✅ |
| **同値クラス・境界値** | テストパターンの分類 | ✅ | ✅ | - |
| **テストシナリオ** | Given-When-Then形式 | ✅ | ✅ | - |
| **要件トレース** | 要件IDとの紐付け | ✅ | - | - |

---

## 4. フォワード vs リバース

### 4.1 フォワード（メイン）

```
要件定義 → 設計書作成 → テスト生成 → 実装生成/実装
```

- 全項目を人間が記述
- 要件IDを最初から紐付け
- 理想的な開発フロー

### 4.2 リバース（サブ）

```
既存ソース → 設計書スケルトン生成 → 人間が補足 → テスト生成
```

- 自動抽出できる項目と、人間が補足する項目を明確に分離
- 既存プロジェクトへの適用時に使用

| 項目 | 自動抽出 | 人間が補足 |
|------|:--------:|:----------:|
| クラス名・型・シグネチャ | ✅ | - |
| 計算ロジック | ✅ | - |
| 同値クラス・境界値 | △（提案） | ✅（確認・追加） |
| 責務・不変条件 | △（推論） | ✅（確認） |
| **なぜそうなっているか** | ❌ | ✅（必須） |
| **要件IDとの紐付け** | ❌ | ✅（必須） |

---

## 5. 設計書フォーマット案

### 5.1 推奨構成

```
docs/specs/
├── domain/
│   ├── Project.spec.md      # 人間向け（Markdown）
│   └── Project.spec.yaml    # 機械向け（YAML）
└── requirements/
    └── REQ-EVM.md           # 要件定義
```

### 5.2 Markdown（人間向け）

- 基本情報、ユビキタス言語
- 不変条件表
- プロパティ仕様表
- メソッド仕様（事前/事後条件、同値クラス・境界値）
- Given-When-Thenシナリオ

### 5.3 YAML（機械向け）

```yaml
metadata:
  id: SPEC-PROJECT-001
  requirement_ids: [REQ-EVM-001]

invariants:
  - id: INV-01
    expression: this.baseDate !== undefined

methods:
  - name: toTaskRows
    test_cases:
      - id: TC-001
        given: { taskNodes: [] }
        when: toTaskRows()
        then: { length: 0 }
```

---

## 6. 設計書からの生成物

| 生成物 | 生成元となる設計書の項目 |
|--------|------------------------|
| **テストコード** | 不変条件、事前/事後条件、同値クラス・境界値、テストシナリオ |
| **ソースコード** | プロパティ仕様、メソッドシグネチャ、計算ロジック/アルゴリズム |

---

## 7. 実験として作成した成果物

### 7.1 Projectクラス詳細仕様書

Projectクラスを題材に、テストケース導出可能な詳細仕様書を作成した。

含まれる内容：
- 基本情報（集約ルート、責務、ユビキタス言語）
- 不変条件（7項目）
- プロパティ仕様（コンストラクタ引数、公開プロパティ）
- コンストラクタ仕様（事前条件、事後条件）
- メソッド仕様（8メソッド、各メソッドに同値クラス・境界値）
- テストシナリオ（Given-When-Then形式、約40ケース）

---

## 8. 次のアクション候補

1. **設計書YAMLスキーマの詳細定義**
   - 統一形式を確定する

2. **テストジェネレーターのプロトタイプ作成**
   - Project仕様書 → Jestテストコード

3. **ソースコードジェネレーターの検討**
   - 設計書 → TypeScriptクラススケルトン

4. **リバースジェネレーターの検討**
   - 既存ソース → 設計書スケルトン

---

## 9. 関連する議論

### 9.1 DDD/クリーンアーキテクチャ準拠性分析

本プロジェクトの問題点として以下が特定された：

**Critical**:
- ドメイン層がExcelライブラリに依存（TaskRow.ts）
- ドメイン層がプレゼンテーション層に依存（ProjectProgressCreator.ts）

**Major**:
- インターフェース実装がドメイン層に混在
- ユースケース層がExcel出力ロジックを直接実装

これらの改善と、設計書駆動開発の導入を並行して進めることが望ましい。

---

## 10. 議論・Q&A

### 10.1 用語解説

#### Q: 「ユビキタス言語」とは？

**A:** DDD（ドメイン駆動設計）の専門用語。**ドメイン（業務）の用語と、コード上の命名を一致させた共通語彙**のこと。

例：
| 業務で使う言葉 | コード上の名前 |
|--------------|---------------|
| 基準日 | `baseDate` |
| 計画価値 | `pv` |

→ 分かりやすさのため「**ユビキタス言語（ドメイン用語）**」と併記することにした。

---

#### Q: 「境界づけられたコンテキスト」とは？

**A:** DDDの用語。**あるドメインモデル（用語や概念）が有効な「範囲・境界」を明示するもの**。

大規模システムでは、同じ言葉でも部門によって意味が異なることがある：

| 用語 | 販売コンテキスト | 配送コンテキスト |
|------|-----------------|-----------------|
| 「注文」 | 顧客の購入意思 | 届ける荷物 |

本プロジェクトは単一コンテキストだが、DDD用語を残すため「**境界づけられたコンテキスト（所属ドメイン）**」と併記することにした。

---

#### Q: 「不変条件（Invariants）」とは？

**A:** DDDというより**契約による設計（Design by Contract）**の概念。**オブジェクトのライフサイクル全体で常に成り立つべき条件**。

| 種類 | タイミング | 例 |
|------|-----------|-----|
| **事前条件** | メソッド呼び出し**前** | 「引数idは正の数」 |
| **事後条件** | メソッド呼び出し**後** | 「戻り値は配列」 |
| **不変条件** | **常に** | 「baseDateは常に存在」 |

不変条件は**全てのテストで検証すべき**条件となる。

---

#### Q: 「同値クラス・境界値」とは？

**A:** **テスト設計技法**の用語。

**同値クラス（同値分割法）**: 入力値を「同じ振る舞いをするグループ」に分け、各クラスから1つテストすれば十分とする考え方。

**境界値（境界値分析）**: 同値クラスの「境目」を重点的にテストする技法。バグは境界付近に集中するため有効。

例：進捗率（0.0〜1.0）の場合
```
   無効     │    有効     │    無効
 ← -0.1 ─── 0.0 ─────── 1.0 ─── 1.1 →
           ↑           ↑
         境界値       境界値
```

---

### 10.2 IDの用途

#### Q: 仕様書内のIDはどのように使う？

**A:** **トレーサビリティ（追跡可能性）**のために使用。

| ID接頭辞 | 例 | 意味 |
|---------|-----|------|
| `INV-` | INV-01 | 不変条件 |
| `PRE-` | PRE-C01 | 事前条件 |
| `POST-` | POST-TR01 | 事後条件 |
| `METHOD-` | METHOD-001 | メソッド |
| `EQ-` | EQ-TR-001 | 同値クラス |
| `TC-` | TC-TR-001 | テストケース |
| `BR-` | BR-SP-01 | ビジネスルール |

**用途：**
1. テストコードとの紐付け（`test('TC-TR-001: ...')`）
2. 要件へのトレース（REQ → METHOD → TC）
3. レビュー・障害対応時の特定

---

### 10.3 スキーマ拡張の議論

#### Q: ビジネスロジックはどこに記述する？

**背景:** 「カレンダー登録機能」のように、外部システム連携を含む処理をどう記述するか。

**検討結果:** 以下の2項目をスキーマに追加。

##### `business_rules`（ビジネスルール）

| 既存項目 | 性質 | 例 |
|---------|------|-----|
| `algorithm` | 処理**手順** | 1. 認証する 2. 登録する |
| `preconditions` | 呼び出し**前提** | 引数が有効であること |
| **`business_rules`** | **ドメインの制約** | 過去日時には登録不可 |

ビジネスルールは：
- 要件から直接導出される
- テストケースに直結する（ルール違反時の動作）
- `algorithm`に埋もれると見落としやすい

```yaml
business_rules:
  - id: BR-01
    rule: 過去の日時には登録できない
    on_violation: ValidationError
```

##### `external_dependencies`（外部依存）

| 観点 | 効果 |
|------|------|
| テスト設計 | モックすべき対象が明確になる |
| 影響分析 | 外部APIの変更時、影響範囲が分かる |
| 障害対応 | 「どこと連携しているか」が即座に分かる |

```yaml
external_dependencies:
  - name: Google Calendar API
    type: REST API
    description: カレンダー登録先
```

---

## 11. ドメイン層全体への仕様書展開（2025-12-16 追加）

### 11.1 概要

Project, ProjectCreatorに続き、domain層の全ファイルに対して仕様書を作成した。

### 11.2 作成した仕様書一覧

```
docs/specs/domain/
├── Project.spec.md           # 集約ルート
├── Project.spec.yaml
├── ProjectCreator.spec.md    # ポート + 実装3クラス
├── ProjectCreator.spec.yaml
├── TaskRow.spec.md           # エンティティ（EVM計算の中核）
├── TaskRow.spec.yaml
├── TaskNode.spec.md          # エンティティ（ツリー構造）
├── TaskNode.spec.yaml
├── TaskService.spec.md       # ドメインサービス
├── TaskService.spec.yaml
├── ProjectService.spec.md    # ドメインサービス（差分計算）
├── ProjectService.spec.yaml
├── HolidayData.spec.md       # 値オブジェクト
├── HolidayData.spec.yaml
├── Interfaces.spec.md        # ポート/リポジトリ（4件）
└── Interfaces.spec.yaml
```

### 11.3 各仕様書の概要

| クラス/インターフェース | 分類 | テストケース数 | 特記事項 |
|------------------------|------|--------------|----------|
| **TaskRow** | エンティティ | 約40件 | EVM計算の中核。calculatePV, calculatePVs, calculateSPI, calculateSV等 |
| **TaskNode** | エンティティ | 約7件 | TaskRowを継承、Iterable実装でツリー走査 |
| **TaskService** | ドメインサービス | 約9件 | buildTaskTree, convertToTaskRows |
| **ProjectService** | ドメインサービス | 約15件 | 差分計算、統計マージ、日付補間 |
| **HolidayData** | 値オブジェクト | 約4件 | イミュータブルな祝日データ |
| **TaskRowCreator** | ポート | 約3件 | TaskRow[]生成の抽象化 |
| **ProjectRepository** | リポジトリ | 約2件 | Project永続化の抽象化 |
| **ProjectProgressCreator** | ポート | 約2件 | **課題: プレゼンテーション層依存** |
| **ProjectStatisticsCreator** | ポート | 約4件 | **課題: 実装が同一ファイル** |

### 11.4 発見された設計上の課題

仕様書作成を通じて、以下の課題を改めて文書化した：

| 課題 | 対象ファイル | 詳細 |
|------|-------------|------|
| ドメイン層がプレゼンテーション層に依存 | `ProjectProgressCreator.ts` | `ProjectProgress`型が`presentation/project-test2.ts`で定義 |
| インターフェースと実装が同一ファイル | `ProjectStatisticsCreator.ts` | ExcelProjectStatisticsCreator等が同居 |
| ドメイン層がExcelライブラリに依存 | `TaskRow.ts`, `ProjectStatisticsCreator.ts` | `excel-csv-read-write`をimport |
| マジックナンバー | `MappingProjectCreator.ts` | 基準日の列番号`26`がハードコード |

### 11.5 リバース仕様書作成のプロセス

今回の仕様書作成は「リバース」フローで行った：

```
1. ソースコード読み込み
2. 既存テストファイル確認（TaskRow.test.ts, ProjectService.test.ts）
3. 仕様書スケルトン生成（Markdown）
4. YAML形式への変換
```

**自動抽出できた項目：**
- クラス名、型、シグネチャ
- 計算ロジック（algorithm）
- 同値クラス・境界値（テストから逆算）

**人間による補足が必要な項目：**
- 責務の明確化
- 不変条件の言語化
- ビジネスルールの抽出
- 要件IDとの紐付け（今回は未実施）

---

## 12. 参考

- 本ブレストで作成したProjectクラス詳細仕様書: `docs/specs/domain/master/Project.spec.md`
- YAMLスキーマ定義: `docs/specs/spec-schema.md`
- YAML形式仕様書: `docs/specs/domain/master/Project.spec.yaml`
- domain層全体の仕様書:
  - マスター設計書: `docs/specs/domain/master/` 配下
  - 案件設計書: `docs/specs/domain/features/` 配下

---

## 13. 追加議論: 仕様駆動開発 vs PRベース開発

**日付**: 2025-12-16
**参加者**: masatomix, Claude

### 13.1 批判的視点からの問い

> 「PRの中で修正されたソース（=コミットされたソース）を確認することは、すなわちトレーサビリティではないのか？」

### 13.2 PRコミット履歴でわかること

| 項目 | PRで確認可能か |
|------|:-------------:|
| 何を変えたか（diff） | ✓ |
| いつ変えたか（履歴） | ✓ |
| 誰が変えたか（author） | ✓ |
| なぜ変えたか | △（PR説明文次第） |

### 13.3 PRだけでは曖昧になりがちなこと

- この機能の「目的」は何だったか
- どういう入出力を想定していたか
- 受け入れ基準は何だったか
- 1年後に「このコードなぜこうなってる？」の答え

### 13.4 使い分けの結論

| 状況 | 仕様駆動開発 | PRベース |
|------|:-----------:|:--------:|
| 小規模チーム・個人開発 | 過剰かも | ✓ 十分 |
| バグ修正・小さな改善 | 過剰 | ✓ 十分 |
| 重要な機能追加 | ✓ 価値あり | △ |
| 外部との合意形成が必要 | ✓ 必須 | ✗ |
| 規制対応・監査 | ✓ 必須 | ✗ |
| 長期メンテナンス | ✓ 価値あり | △ |

### 13.5 結論

「PRで十分」なケースは多い。仕様駆動開発は**全部に適用するものではなく、必要な場面で使う**のが現実的。

本プロジェクトでは、以下の方針とする：
- **重要な新機能**: 仕様駆動開発フローを適用
- **バグ修正・軽微な改善**: PRベースで十分
- **判断に迷う場合**: Claude Codeに相談して決定

---

## 14. Issue First とマスター設計書への反映タイミング（2025-12-22 追加）

### 14.1 背景

開発ワークフローを見直す中で、以下の課題が特定された：

1. **Issue起点が不明確**: ドキュメント上でIssue Firstが明示されていなかった
2. **マスター設計書の反映タイミング**: PRマージ後に反映では漏れる可能性

### 14.2 Issue First の明確化

ワークフローの全体フロー図と Forward フローに「Issue作成」を起点として追加：

```
GitHub Issue #nn（起点）
      │
      ▼
要件定義 → 仕様書 → テスト → 実装 → マスター設計書更新
```

**人間が最初にやること**: GitHub Issue を作成する（または既存Issueを確認する）

### 14.3 マスター設計書への反映タイミング

**変更前**: PRがdevelop/mainにマージされた後

**変更後**: PRマージ前（featureブランチ内で実施）

| タイミング | 問題点 | 解決策 |
|-----------|--------|--------|
| マージ後 | 反映漏れの可能性 | マージ前に必須化 |
| マージ前 | レビューで確認可能 | developへのマージ条件に追加 |

**developへのマージ条件**:
- ✅ テストPASS
- ✅ マスター設計書が更新されていること

### 14.4 PRとIssueの連携

PRに `Closes #nn` を記載することで：
1. PR作成直後からIssue側にPRへのリンクが表示される
2. マージ時に自動的に「closed this in #xx」が記録される
3. 別途コメント追記は不要

---

## 15. レビュワー向けチェックリストの導入（2025-12-22 追加）

### 15.1 背景

GitHub App（bot）によるPRレビューで、以下を確実にチェックしたい：
- コーディング標準への準拠
- マスター設計書の更新漏れ
- トレーサビリティの更新

### 15.2 導入したドキュメント

| ファイル | 役割 |
|----------|------|
| `docs/standards/CODING_STANDARDS.md` | コーディング標準（命名規則、アーキテクチャ準拠など） |
| `docs/standards/REVIEW_CHECKLIST.md` | レビュー時のチェックリスト |

### 15.3 code-reviewer エージェントへの統合

`.claude/agents/code-reviewer.md` を更新し、レビュー開始前に以下を必ず読むよう指示：

```markdown
1. **標準ドキュメントの確認**: レビュー開始前に以下を必ず読む
   - `docs/standards/CODING_STANDARDS.md` - コーディング標準
   - `docs/standards/REVIEW_CHECKLIST.md` - レビューチェックリスト
```

### 15.4 チェック項目の分類

| 種類 | チェック方法 | 例 |
|------|-------------|-----|
| **機械的** | CI（自動） | ESLint、Prettier、型チェック、テスト |
| **判断が必要** | レビュワー（人間/AI） | 命名規則、設計パターン準拠、可読性 |

### 15.5 レビュー判定基準

**Approve**:
- 必須チェック項目に問題がない
- セキュリティ上の懸念がない
- ドキュメントが適切に更新されている

**Request Changes**:
- セキュリティ上の問題がある
- テストがPASSしていない
- 必須のドキュメント更新が漏れている
- アーキテクチャ違反がある

### 15.6 今後の拡張

- PRテンプレートにチェックリストを追加（PR作成者が事前確認）
- CODING_STANDARDS.md の項目を随時追記

---

## 16. トレーサビリティの実現方法（2025-12-23 追加）

### 16.1 背景

REQ-TASK-001（計算除外レコード可視化）の実装を通じて、仕様駆動開発のトレーサビリティを実証した。
その際「初見の人がどうやって辿るか？」という議論が発生。

### 16.2 Forward Traceability（順方向）

**定義**: 要件 → 仕様 → テスト → 実装 の順で追跡すること

#### 各ステップでの辿り方

| From | To | 辿り方 |
|------|-----|--------|
| **Issue** | **要件定義書** | Issue に `docs/specs/requirements/REQ-xxx.md` へのリンクを記載 |
| **要件定義書** | **詳細仕様書** | 要件書の「関連ドキュメント」セクションにリンク |
| **詳細仕様書** | **テスト** | 命名規則: `{Class}.{feature}.spec.md` → `{Class}.{feature}.test.ts` |
| **テスト** | **実装** | 命名規則: `src/domain/__tests__/*.test.ts` → `src/domain/*.ts` |

#### Issue → 要件定義書

```markdown
# Issue #42 の本文に記載

## 関連ドキュメント
- 要件定義書: docs/specs/requirements/REQ-TASK-001.md
```

#### 要件定義書 → 詳細仕様書

```markdown
# REQ-TASK-001.md の「関連ドキュメント」セクション

| ドキュメント | パス |
|-------------|------|
| 設計書 | `docs/specs/domain/features/Project.excludedTasks.spec.md` |
```

#### 詳細仕様書 → テスト

**問題**: 仕様書を見つけた後、対応するテストをどう見つけるか？

**解決策1: 命名規則で予測可能にする**
```
docs/specs/domain/features/Project.excludedTasks.spec.md
                   ↓ 命名規則
src/domain/__tests__/Project.excludedTasks.test.ts
```

**解決策2: 仕様書にテストファイルパスを明記する**
```markdown
# Project.excludedTasks.spec.md

## テストファイル
- `src/domain/__tests__/Project.excludedTasks.test.ts`
```

### 16.3 テストケースの特定問題

**問題**: テストファイルを見つけても、「どのテストケースがこの仕様に対応するか」は分からない

**例**: `Project.excludedTasks.test.ts` には10個のテストがある。
どれが `isLeaf` フィルタを検証しているか？

```typescript
TC-01: 全タスクが有効な場合
TC-02: 開始日が未設定
TC-03: 終了日が未設定
TC-04: plotMapが未設定
TC-05: 稼働予定日数が0
TC-06: 複数の無効タスク
TC-07: タスクが0件
TC-08: 親タスク（isLeaf=false）  ← これ！
TC-09: 日付エラーのreason
TC-10: 日数エラーのreason
```

**解決策: 結局 grep**
```bash
grep -n "isLeaf" src/domain/__tests__/Project.excludedTasks.test.ts
# → 249: describe('TC-08: 親タスク（isLeaf=false）...
```

### 16.4 現実的な結論

**ツールなしでトレーサビリティを確保するには**:

1. **命名規則を統一する** → 予測可能にする
2. **各ドキュメントに相互リンクを明記する** → 迷わなくする
3. **探すときは grep する** → 最終手段として受け入れる

**将来的な改善案**:
- トレーサビリティ管理ツール（Doors, Jama など）
- 自動リンク生成スクリプト
- IDE プラグイン

### 16.5 REQ-TASK-001 での実証

| フェーズ | コミット | 成果物 |
|---------|----------|--------|
| 1. 要件定義 | `67d28f2` | `REQ-TASK-001.md` |
| 2. 仕様策定 | `ac573ce` | `Project.excludedTasks.spec.md` |
| 3. テスト作成 | `86bd9cd` | `Project.excludedTasks.test.ts` |
| 4. 実装 | `805c45d` | `Project.ts` |
| 5. 設計書更新 | `52be4c5` | `Project.spec.md` v1.1.0 |

詳細な事例ドキュメント: `docs/examples/TRACEABILITY_EXAMPLE.md`

### 16.6 Backward Traceability（逆方向）

**定義**: 実装 → テスト → 仕様 → 要件 の順で追跡すること

**ユースケース**: 「このコードはなぜ存在する？」を調べたいとき

（詳細は別途検討）

### 16.7 具体例: 受け入れ基準から実装・テストへの追跡

**事例**: REQ-TASK-001（計算除外レコードの可視化）

#### 要件定義書の受け入れ基準

```markdown
# docs/specs/requirements/REQ-TASK-001.md より

| AC-ID | 受け入れ基準 |
|-------|-------------|
| AC-01 | Project.excludedTasks で一覧を取得できる |
| AC-02 | 各レコードに除外理由（reason）が含まれる |
| AC-03 | 有効タスクのみの場合は空配列を返す |
```

#### 追跡結果

| 受け入れ基準 | テストケース | 実装箇所 |
|-------------|-------------|----------|
| **AC-01** excludedTasksで一覧取得 | TC-02〜TC-06 | `src/domain/Project.ts:377` `get excludedTasks()` |
| **AC-02** reasonが正しい | TC-09, TC-10 | `src/domain/Project.ts:381` `reason: task.validStatus.invalidReason` |
| **AC-03** 有効タスクのみ→空配列 | TC-01, TC-07 | `src/domain/Project.ts:378` `.filter((task) => !task.validStatus.isValid)` |

#### 辿り方の具体例（AC-01の場合）

**Step 1: 要件定義書を見つける**
```bash
# Issue #42 に記載されたパスから
cat docs/specs/requirements/REQ-TASK-001.md | grep "AC-01"
# → | AC-01 | Project.excludedTasks で一覧を取得できる |
```

**Step 2: 詳細仕様書を見つける**
```bash
# 要件定義書の「関連ドキュメント」から
cat docs/specs/requirements/REQ-TASK-001.md | grep "spec.md"
# → docs/specs/domain/features/Project.excludedTasks.spec.md
```

**Step 3: テストファイルを見つける**
```bash
# 命名規則から予測
ls src/domain/__tests__/Project.excludedTasks.*
# → Project.excludedTasks.test.ts

# または grep で
grep -r "AC-01\|excludedTasks" src/ --include="*.test.ts"
```

**Step 4: 該当テストケースを特定**
```bash
grep -n "TC-02\|TC-03\|TC-04\|TC-05\|TC-06" src/domain/__tests__/Project.excludedTasks.test.ts
# → 98:  describe('TC-02: 開始日が未設定のタスク', () => {
# → 130: describe('TC-03: 終了日が未設定のタスク', () => {
# → ...
```

**Step 5: 実装箇所を特定**
```bash
grep -n "excludedTasks" src/domain/Project.ts
# → 377:  get excludedTasks(): ExcludedTask[] {
```

#### 結果の図示

```
REQ-TASK-001 AC-01 「excludedTasksで一覧取得」
      │
      ├──▶ 詳細仕様: Project.excludedTasks.spec.md セクション2.2
      │
      ├──▶ テスト: Project.excludedTasks.test.ts
      │         TC-02 (98行目): 開始日未設定
      │         TC-03 (130行目): 終了日未設定
      │         TC-04 (162行目): plotMap未設定
      │         TC-05 (194行目): 稼働日数0
      │         TC-06 (226行目): 複数無効タスク
      │
      └──▶ 実装: Project.ts:377
               get excludedTasks(): ExcludedTask[]
```

**ポイント**: 1つの受け入れ基準（AC-01）に対して、5つのテストケースが検証し、1つのgetterが実装している

---

## 17. 仕様書フォルダの再編成（2025-12-23 追加）

### 17.1 背景・課題

`docs/specs/domain/` フォルダ内で、以下の問題が発生していた：

> 「いまdocs/specs/ フォルダの中で、どれがマスター設計書、どれが案件設計書って分かるようになっているかな」

ドメイン仕様書が単一フォルダに混在しており、初見の開発者にとって：
- **マスター設計書**（恒久的な設計文書）
- **案件設計書**（特定Issue/機能向けの設計文書）

の区別が困難だった。

### 17.2 検討した選択肢

| 案 | 方法 | メリット | デメリット |
|----|------|---------|-----------|
| **案1** | フォルダ分離（`master/`, `features/`） | 明確に分離、一覧性が高い | ファイル移動が必要 |
| 案2 | ファイル名プレフィックス（`master-`, `feat-`） | 移動不要 | 名前が長くなる |
| 案3 | INDEX.mdで一覧管理 | 構造変更不要 | 更新漏れの可能性 |

### 17.3 採用した方法

**案1: フォルダ分離** を採用。

```
docs/specs/domain/
├── master/                    # マスター設計書（恒久的）
│   ├── Project.spec.md
│   ├── TaskRow.spec.md
│   └── ... （19ファイル）
└── features/                  # 案件設計書（機能別）
    └── Project.excludedTasks.spec.md
```

### 17.4 分類基準

| 種類 | 配置先 | 説明 | 例 |
|------|--------|------|-----|
| **マスター設計書** | `master/` | ドメインモデルの恒久的な仕様 | `TaskRow.spec.md`, `Project.spec.md` |
| **案件設計書** | `features/` | 特定Issue/機能向けの仕様 | `Project.excludedTasks.spec.md` |

### 17.5 移動したファイル

**master/ へ移動（19ファイル）**:
- Project.spec.md / Project.spec.yaml
- TaskRow.spec.md / TaskRow.spec.yaml
- TaskNode.spec.md / TaskNode.spec.yaml
- TaskService.spec.md / TaskService.spec.yaml
- ProjectService.spec.md / ProjectService.spec.yaml
- ProjectCreator.spec.md / ProjectCreator.spec.yaml
- HolidayData.spec.md / HolidayData.spec.yaml
- Interfaces.spec.md / Interfaces.spec.yaml
- CsvProjectCreator.spec.md
- VersionInfo.spec.md
- spec-schema.md

**features/ へ移動（1ファイル）**:
- Project.excludedTasks.spec.md

### 17.6 参照更新

以下のドキュメントのリンクを更新：
- `CHANGELOG.md`
- `docs/workflow/DEVELOPMENT_WORKFLOW.md`
- `docs/workflow/SAMPLE_DEVELOPMENT_FLOW.md`
- `docs/specs/requirements/REQ-TASK-001.md`
- `docs/specs/requirements/REQ-CSV-001.md`
- `docs/specs/requirements/REQ-VERSION-001.md`
- `docs/brainstorm-spec-driven-development.md`（本ファイル）

### 17.7 今後の運用

- **新しいドメインモデル追加時**: `master/` に設計書を作成
- **既存機能の拡張時**: `features/` に案件設計書を作成し、完了後に `master/` へ統合を検討
- **フォルダの追加**: 必要に応じて `infrastructure/`, `usecase/` 等のフォルダを追加可能
