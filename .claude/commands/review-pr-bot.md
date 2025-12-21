PR #$ARGUMENTS の変更内容を **サブエージェント（code-reviewer）** にレビューさせ、GitHub App（bot）として Approve または Request Changes を行います。

## 処理手順

### 0. 引数のバリデーション

$ARGUMENTS が空または未設定の場合は、以下のメッセージを表示して処理を終了してください：

```
エラー: PR 番号が指定されていません。
使用方法: /review-pr-bot {PR番号}
例: /review-pr-bot 29
```

### 1. 設定ファイルの確認

`.claude/config/github-app.json` が存在するか確認してください。存在しない場合は以下を表示して終了：

```
エラー: GitHub App 設定ファイルが見つかりません。
先に /setup-github-app を実行してください。
```

### 2. PR 情報の取得

以下のコマンドを並列で実行して情報を収集してください：

- `gh pr view $ARGUMENTS` - PR の概要を取得
- `gh pr diff $ARGUMENTS` - 差分を取得

**エラーハンドリング**: PR が存在しない場合や取得に失敗した場合は、エラーメッセージを表示して処理を終了してください。

### 3. サブエージェントによるレビューの実施

**Task ツール** を使用して `code-reviewer` サブエージェントを起動し、レビューを実行させてください。

```
Task tool パラメータ:
- subagent_type: "code-reviewer"
- prompt: |
    PR #$ARGUMENTS のコードレビューを実施してください。

    レビュー観点は prompts/review-instructions.md を参照してください。

    ## 出力形式
    以下の形式で結果を返してください：

    ### 判定
    - approve または request-changes

    ### レビューサマリー
    [重要度別の指摘件数と一覧]

    ### 総評
    [全体的な評価]
```

サブエージェントからの結果を待ち、**判定（approve/request-changes）** と **レビュー内容** を取得してください。

### 4. レビュー用スクリプトの一時作成

以下のスクリプトを `/tmp/gh-app-review.sh` に作成し、実行権限を付与してください：

```bash
cat << 'SCRIPT' > /tmp/gh-app-review.sh
#!/bin/bash
set -e

CONFIG_FILE=".claude/config/github-app.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: 設定ファイルが見つかりません: $CONFIG_FILE"
  echo "先に /setup-github-app を実行してください"
  exit 1
fi

GITHUB_APP_ID=$(jq -r '.appId' "$CONFIG_FILE")
INSTALLATION_ID=$(jq -r '.installationId' "$CONFIG_FILE")
PRIVATE_KEY=$(jq -r '.privateKey' "$CONFIG_FILE")

PR_NUMBER=$1
ACTION=$2
BODY=$3

generate_jwt() {
  local header=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 -w 0 | tr -d '=' | tr '/+' '_-')
  local now=$(date "+%s")
  local iat=$((now - 60))
  local exp=$((now + 600))
  local payload=$(echo -n "{\"iat\":${iat},\"exp\":${exp},\"iss\":${GITHUB_APP_ID}}" | base64 -w 0 | tr -d '=' | tr '/+' '_-')
  local unsigned_token="${header}.${payload}"
  local key_file=$(mktemp)
  echo -e "$PRIVATE_KEY" > "$key_file"
  local signature=$(echo -n "${unsigned_token}" | openssl dgst -binary -sha256 -sign "$key_file" | base64 -w 0 | tr -d '=' | tr '/+' '_-')
  rm -f "$key_file"
  echo "${unsigned_token}.${signature}"
}

get_token() {
  local jwt=$(generate_jwt)
  curl -s -X POST \
    -H "Authorization: Bearer ${jwt}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens" \
    | jq -r ".token"
}

echo "GitHub App トークンを取得中..."
TOKEN=$(get_token)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Error: トークンの取得に失敗しました"
  exit 1
fi

echo "PR #${PR_NUMBER} に ${ACTION} を実行中..."
GH_TOKEN=$TOKEN gh pr review "$PR_NUMBER" --"$ACTION" --body "$BODY"

echo "完了しました"
SCRIPT
chmod +x /tmp/gh-app-review.sh
```

### 5. レビュー結果の投稿

サブエージェントから受け取った **判定** と **レビュー内容** を使って、GitHub App認証でレビューを投稿します。

#### approve の場合

```bash
/tmp/gh-app-review.sh $ARGUMENTS approve "## 🤖 AI Code Review (by code-reviewer)

{サブエージェントから受け取ったレビューサマリー}

{サブエージェントから受け取った総評}

---
🤖 Reviewed by [Claude Code](https://claude.com/claude-code) code-reviewer subagent via GitHub App"
```

#### request-changes の場合

```bash
/tmp/gh-app-review.sh $ARGUMENTS request-changes "## 🤖 AI Code Review (by code-reviewer)

{サブエージェントから受け取ったレビューサマリー}

{サブエージェントから受け取った総評}

---
🤖 Reviewed by [Claude Code](https://claude.com/claude-code) code-reviewer subagent via GitHub App"
```

### 6. 一時スクリプトの削除

レビュー完了後、一時スクリプトを削除してください：

```bash
rm -f /tmp/gh-app-review.sh
```

### 7. 結果の報告

レビューが投稿されたら、以下をユーザーに報告してください：
- 判定結果（Approve / Request Changes）
- サブエージェントによるレビューの要点
- PRへのリンク
