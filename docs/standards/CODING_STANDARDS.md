# コーディング標準

**作成日**: 2025-12-22
**ステータス**: Draft（随時追記）

---

## 1. 概要

本ドキュメントは、evmtools-node プロジェクトにおけるコーディング標準を定義します。
コードレビュー時に本ドキュメントを参照し、準拠しているかを確認します。

---

## 2. 自動チェック

以下は CI / ローカルで自動チェックされます：

| チェック項目 | コマンド | ツール |
|-------------|---------|--------|
| Lint | `npm run lint` | ESLint |
| Format | `npm run format` | Prettier |
| 型チェック | `npm run build` | TypeScript |
| テスト | `npm test` | Jest |

---

## 3. 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| クラス | PascalCase | `ProjectService`, `TaskRow` |
| インターフェース | PascalCase | `ProjectCreator`, `TaskRowCreator` |
| 関数/メソッド | camelCase | `calculatePV()`, `getTask()` |
| 変数 | camelCase | `baseDate`, `taskNodes` |
| 定数 | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| ファイル名 | PascalCase（クラス）/ camelCase（ユーティリティ） | `Project.ts`, `dateUtils.ts` |

---

## 4. アーキテクチャ準拠

クリーンアーキテクチャに基づく依存関係ルール：

```
presentation → usecase → domain ← infrastructure
                           ↑
                      依存の向き
```

| ルール | 説明 |
|--------|------|
| domain は他層に依存しない | `domain/` 内で `infrastructure/` や `presentation/` を import しない |
| infrastructure は domain に依存 | DTO → Entity の変換は infrastructure で行う |
| usecase は domain に依存 | ビジネスロジックは domain に委譲 |

---

## 5. ドメインモデル

### 5.1 エンティティ

- 識別子（id）を持つ
- ビジネスロジックを内包する
- 例: `TaskRow`, `Project`

### 5.2 値オブジェクト

- 識別子を持たない
- イミュータブル
- 例: `HolidayData`

### 5.3 ドメインサービス

- エンティティに属さないドメインロジック
- 例: `TaskService`, `ProjectService`

---

## 6. エラーハンドリング

| 状況 | 対応 |
|------|------|
| 入力値の検証エラー | 例外をスロー（早期リターン） |
| 外部システムエラー | 適切な例外でラップ |
| 想定内のエラー | Result型 または null/undefined を返却 |

---

## 7. コメント

| 書くべき | 書かない |
|---------|---------|
| **なぜ**そうなっているか（理由） | **何を**しているか（コードで自明） |
| 複雑なアルゴリズムの説明 | 自明な処理の説明 |
| TODO/FIXME（Issue番号付き） | 古いコメント |

---

## 8. 追記予定

以下の項目は今後追記予定：

- [ ] テストの書き方
- [ ] ログ出力規則
- [ ] 非同期処理のパターン

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2025-12-22 | 初版作成 |
