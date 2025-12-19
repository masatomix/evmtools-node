PRレビュー用のGitHub Appを作成する手順をガイドします。

## 処理手順

### 1. GitHub App 作成ページを開く

以下のURLを開くよう案内してください：

```
https://github.com/settings/apps/new
```

Organization用の場合:
```
https://github.com/organizations/{org名}/settings/apps/new
```

### 2. 基本設定の入力

ユーザーに以下を入力するよう案内してください：

| 項目 | 設定値 | 説明 |
|------|--------|------|
| **GitHub App name** | `pr-review-bot`（任意） | 一意の名前 |
| **Homepage URL** | `https://github.com` | 任意のURL |

### 3. Webhook の無効化

以下を案内してください：

- 「Webhook」セクションの **Active** のチェックを**外す**

### 4. 権限の設定

「Repository permissions」セクションで以下を設定するよう案内してください：

| 権限 | 設定値 | 用途 |
|------|--------|------|
| **Pull requests** | Read and write | PRレビューの投稿 |
| **Contents** | Read-only | リポジトリ内容の読み取り |

### 5. インストール先の設定

「Where can this GitHub App be installed?」で以下を選択するよう案内してください：

- **Only on this account** （推奨）

### 6. App の作成

「Create GitHub App」ボタンをクリックするよう案内してください。

### 7. App ID の確認

作成後の画面で **App ID** が表示されます。この値をメモするよう案内してください。

```
App ID: 1234567  ← この数字をメモ
```

### 8. Private Key の生成

以下の手順を案内してください：

1. 作成した App の設定ページで下にスクロール
2. 「Private keys」セクションの **Generate a private key** をクリック
3. `.pem` ファイルがダウンロードされる
4. ファイルの内容を安全な場所に保存

### 9. App のインストール

以下の手順を案内してください：

1. 左メニューの「Install App」をクリック
2. 対象のアカウント/Organizationの「Install」をクリック
3. 「Only select repositories」で対象リポジトリを選択
4. 「Install」をクリック

### 10. Installation ID の確認

インストール後のURLから Installation ID を確認するよう案内してください：

```
https://github.com/settings/installations/12345678
                                          ^^^^^^^^
                                          この数字が Installation ID
```

### 11. 完了確認

以下の3つの値が揃ったことを確認してください：

| 項目 | 例 |
|------|-----|
| App ID | `1234567` |
| Installation ID | `12345678` |
| Private Key | `-----BEGIN RSA PRIVATE KEY-----...` |

### 12. 次のステップ

設定が完了したら、以下のコマンドで認証設定を行うよう案内してください：

```
/setup-github-app
```

このコマンドで、取得した App ID、Installation ID、Private Key を登録できます。
