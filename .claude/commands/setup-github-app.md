GitHub App の認証設定を行います。

## 処理手順

### 1. 必要な情報の確認

ユーザーに以下の情報を順番に質問してください（AskUserQuestion ツールを使用）：

#### 質問1: GitHub App ID

GitHub App の App ID を入力してください。

- 確認方法: GitHub → Settings → Developer settings → GitHub Apps → 該当App → 「App ID」に表示
- 例: `123456`

#### 質問2: Installation ID

GitHub App の Installation ID を入力してください。

- 確認方法: GitHub → Settings → Applications → Installed GitHub Apps → 該当Appの「Configure」→ URLの末尾の数字
- 例: `https://github.com/settings/installations/12345678` の `12345678`

#### 質問3: Private Key

GitHub App の Private Key を入力してください。

- 確認方法: GitHub App の設定画面で「Generate a private key」で生成した `.pem` ファイルの内容
- `-----BEGIN RSA PRIVATE KEY-----` から `-----END RSA PRIVATE KEY-----` までの全文

### 2. 設定ファイルの作成

入力された情報を以下の形式で `.claude/config/github-app.json` に保存してください：

```json
{
  "appId": "{入力されたApp ID}",
  "installationId": "{入力されたInstallation ID}",
  "privateKey": "{入力されたPrivate Key}"
}
```

**注意**: Private Key は改行を `\n` に変換して1行の文字列として保存してください。

### 3. 保存の実行

Write ツールを使用して `.claude/config/github-app.json` を作成してください。

### 4. 完了報告

設定が完了したら、以下を報告してください：

- 設定ファイルのパス
- 設定された App ID と Installation ID（Private Key は表示しない）
- 「この設定ファイルは .gitignore に登録されているため、Git にコミットされません」という注意事項
