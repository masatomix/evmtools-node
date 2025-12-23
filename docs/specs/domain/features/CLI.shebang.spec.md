# CLI shebang追加 詳細仕様

**バージョン**: 1.1.0
**作成日**: 2025-12-23
**要件ID**: REQ-CLI-001
**ソースファイル**: `src/presentation/cli-pbevm-*.ts`

---

## 1. 概要

CLIコマンドファイルにshebangを追加し、Unix系環境で直接実行可能にする。

---

## 2. 変更仕様

### 2.1 対象ファイル

| ファイル | binコマンド名 |
|---------|-------------|
| `src/presentation/cli-pbevm-show-project.ts` | `pbevm-show-project` |
| `src/presentation/cli-pbevm-diff.ts` | `pbevm-diff` |
| `src/presentation/cli-pbevm-show-pv.ts` | `pbevm-show-pv` |

### 2.2 変更内容

各ファイルの先頭に以下を追加：

```typescript
#!/usr/bin/env node
```

### 2.3 変更前後の比較

**変更前**:
```typescript
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
...
```

**変更後**:
```typescript
#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
...
```

---

## 3. README.md更新仕様

### 3.1 追加セクション: インストール

「## コマンド」セクションの前に以下を追加：

```markdown
## インストール

```bash
npm install evmtools-node
```

インストール後、以下のコマンドが使用可能になります。
```

### 3.2 コマンド説明の更新

各コマンドの説明に注記を追加：

```markdown
> **注記**: `npm install evmtools-node` せずに直接実行する場合は、`npx -p evmtools-node <command>` の形式で実行できます。
```

---

## 4. 技術仕様

### 4.1 shebangの動作

| 環境 | 動作 |
|------|------|
| **Unix系（Linux, macOS）** | shebangにより `node` インタプリタで実行 |
| **Windows** | npmが `.cmd` ラッパーを生成するため、shebangは無視される |

### 4.2 TypeScriptコンパイル時の挙動

- TypeScriptコンパイラ（tsc）はshebangをそのまま出力ファイルに保持する
- 追加の設定は不要

---

## 5. テスト仕様

### 5.1 テストファイル

`src/presentation/__tests__/cli-shebang.test.ts`

### 5.2 テストケース

| テストID | テスト内容 | 期待結果 |
|---------|----------|---------|
| TC-01 | distファイルのshebang確認 | 3ファイルすべてが `#!/usr/bin/env node` で始まる |
| TC-02 | pbevm-show-project --help | 終了コード0、Usage文字列を含む |
| TC-03 | pbevm-diff --help | 終了コード0、Usage文字列を含む |
| TC-04 | pbevm-show-pv --help | 終了コード0、Usage文字列を含む |

### 5.3 テスト環境

- **分離環境**: 一時ディレクトリで実行
- **インストール方法**: `npm pack` でtarball作成 → 一時ディレクトリでインストール
- **実行タイミング**: リリース検証時（リグレッションテストには含めない）

### 5.4 テスト実行方法

```bash
# 自動テスト実行
npm test -- src/presentation/__tests__/cli-shebang.test.ts

# 手動確認（ビルド後）
head -1 dist/presentation/cli-pbevm-show-project.js
# 期待結果: #!/usr/bin/env node
```

### 5.5 テスト除外設定

`jest.config.js` または `package.json` のJest設定で、通常のテスト実行から除外：

```json
{
  "testPathIgnorePatterns": [
    "cli-shebang.test.ts"
  ]
}
```

手動実行時のみ明示的にファイル指定で実行する。

---

## 6. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-23 | 初版作成 | REQ-CLI-001 |
| 1.1.0 | 2025-12-23 | 自動テスト仕様を追加 | REQ-CLI-001 |
