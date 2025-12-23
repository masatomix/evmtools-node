# 要件定義書: CLIコマンドの実行環境整備

**要件ID**: REQ-CLI-001
**GitHub Issue**: #67
**作成日**: 2025-12-23
**ステータス**: Draft
**優先度**: High

---

## 1. 概要

### 1.1 目的

npm公開済みのCLIコマンド（`pbevm-show-project`, `pbevm-diff`, `pbevm-show-pv`）が、ユーザー環境で正しく動作するようにする。

### 1.2 背景

現在のv0.0.17では以下の問題がある：

1. **shebangがない**: CLIファイルに `#!/usr/bin/env node` がないため、Unix系環境で実行できない
2. **README.mdにインストール手順がない**: `npm install evmtools-node` の説明がない
3. **npxの呼び出し方が不正確**: `-p` オプションの説明がない

### 1.3 スコープ

| 項目 | 対象 |
|------|:----:|
| shebang追加（3ファイル） | ✅ |
| README.md更新（インストール手順、コマンド説明） | ✅ |
| pbevm-show-resourceplan（ベータ版）の対応 | Phase 2 |
| pbevm-summaryのbin登録 | Phase 2 |

---

## 2. 機能要件

### 2.1 shebang追加

以下のファイルの先頭に `#!/usr/bin/env node` を追加する：

| ファイル | 対応するbinコマンド |
|---------|-------------------|
| `src/presentation/cli-pbevm-show-project.ts` | `pbevm-show-project` |
| `src/presentation/cli-pbevm-diff.ts` | `pbevm-diff` |
| `src/presentation/cli-pbevm-show-pv.ts` | `pbevm-show-pv` |

### 2.2 README.md更新

#### 2.2.1 インストールセクションの追加

```markdown
## インストール

```bash
npm install evmtools-node
```
```

#### 2.2.2 コマンド説明の更新

- `npm install` 後に `npx <command>` で実行可能であることを明記
- 注記として `-p evmtools-node` オプションでも実行可能であることを記載

---

## 3. 非機能要件

| ID | 要件 |
|----|------|
| NF-01 | 既存の機能に影響を与えないこと |
| NF-02 | Unix系（Linux, macOS）およびWindowsで動作すること |

---

## 4. インターフェース設計

### 4.1 実行方法（修正後）

#### 方法1: npm install後にnpx実行（推奨）

```bash
npm install evmtools-node
npx pbevm-show-project --path ./now.xlsm
```

#### 方法2: -pオプションで直接実行

```bash
npx -p evmtools-node pbevm-show-project --path ./now.xlsm
```

#### 方法3: グローバルインストール

```bash
npm install -g evmtools-node
pbevm-show-project --path ./now.xlsm
```

---

## 5. 受け入れ基準

| ID | 基準 | 結果 | テスト証跡 |
|----|------|------|-----------|
| AC-01 | `npm i evmtools-node` 後に `npx pbevm-show-project` が動作する | - | 手動テスト |
| AC-02 | `npx -p evmtools-node pbevm-show-project` が動作する | - | 手動テスト |
| AC-03 | README.mdにインストール手順が記載されている | - | 目視確認 |
| AC-04 | README.mdに `-p` オプションの注記がある | - | 目視確認 |

---

## 6. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| GitHub Issue | #67 | CLIコマンドのshebang設定・bin登録の整備 |
| 実装 | `src/presentation/cli-pbevm-*.ts` | CLIファイル |
| README | `README.md` | 使用方法の説明 |

---

## 7. 備考

### 7.1 Phase 2での対応予定

- `pbevm-show-resourceplan`: ベータ版のため、正式版でshebang追加・README記載
- `pbevm-summary`: bin登録の要否を検討
