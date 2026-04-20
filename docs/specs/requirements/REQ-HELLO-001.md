# 要件定義書: Project.getNameWithGreeting() メソッドの追加

**要件ID**: REQ-HELLO-001
**GitHub Issue**: [#166](https://github.com/masatomix/evmtools-node/issues/166)
**作成日**: 2026-04-20
**ステータス**: Draft
**優先度**: Low（SDDワークフロー体験用の極小機能）

---

## 1. 概要

### 1.1 目的

`Project` クラスに、プロジェクト名の末尾に固定文字列「 Hello World.」を付与した文字列を返すメソッド `getNameWithGreeting()` を追加する。

### 1.2 背景

- 仕様駆動開発（SDD Forward フロー）を一周体験するための極小機能を題材として選定
- 要件定義 → 詳細設計 → タスク分解 → 実装 → トレーサビリティ確認 の全ステップを短時間で体験できるサンプルが必要

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| `Project.getNameWithGreeting()` メソッドの追加 | ✅ |
| 単体テストの追加 | ✅ |
| マスター設計書 `Project.spec.md` への反映 | ✅ |
| CLIコマンドからの呼び出し | ❌（範囲外） |
| 多言語対応（greeting のパラメータ化等） | ❌（範囲外） |

---

## 2. 機能要件

### 2.1 追加メソッド

`Project` クラス（`src/domain/Project.ts`）に、以下のインスタンスメソッドを追加する。

| 項目 | 内容 |
|------|------|
| メソッド名 | `getNameWithGreeting` |
| 引数 | なし |
| 戻り値型 | `string` |
| 戻り値の内容 | `` `${this.name} Hello World.` `` |

### 2.2 振る舞い仕様

- `this.name` の値にかかわらず、半角スペース + `Hello World.` を末尾に連結する
- `this.name` が空文字の場合、戻り値は `" Hello World."`（先頭にスペース1つ）
- `this.name` の値そのものは変更しない（副作用なし）

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の `Project` メソッド・プロパティに影響を与えないこと |
| NF-02 | ピュアな関数として実装すること（副作用・外部依存なし） |
| NF-03 | TypeScript strict モードでエラーにならないこと |

---

## 4. 受け入れ基準

| ID | 基準 | 結果 |
|----|------|------|
| AC-01 | 通常のプロジェクト名（例: `"サンプルPJ"`）に対して `"サンプルPJ Hello World."` を返す | ✅ |
| AC-02 | 空文字 `""` のプロジェクト名に対して `" Hello World."` を返す | ✅ |
| AC-03 | 日本語を含むプロジェクト名でも正しく連結される | ✅ |

---

## 5. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| GitHub Issue | [#166](https://github.com/masatomix/evmtools-node/issues/166) | 機能要望 |
| 詳細仕様書 | `docs/specs/domain/features/Project.nameWithGreeting.spec.md` | 詳細設計（作成予定） |
| マスター設計書 | `docs/specs/domain/master/Project.spec.md` | 反映先 |
| 対象クラス | `src/domain/Project.ts` | 実装対象 |

---

## 6. 備考

- 本要件はSDDワークフローの体験・デモ用途であり、プロダクトとしての実利用は想定しない
- トレーサビリティの最小例（AC-01〜AC-03 → TC-01〜TC-03）として機能させる
