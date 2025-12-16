# 開発ワークフロー

**作成日**: 2025-12-16
**バージョン**: 1.0.0

---

## 1. 概要

本プロジェクトでは、**Git Flow** ブランチ戦略と**仕様駆動開発（Spec-Driven Development）**を組み合わせた開発ワークフローを採用しています。

---

## 2. Git Flow ブランチ戦略

### 2.1 ブランチ構成

```
                         ┌─────────────────────────────────────────┐
                         │              main                       │
                         │   (本番リリース用・タグ付け)             │
                         └──────────────┬────────────────────────┬─┘
                                        │                        │
         ┌──────────────────────────────┼────────────────────────┼──┐
         │                              ▼                        ▼  │
         │  ┌─────────────────────────────────────────────────────┐ │
         │  │                    develop                          │ │
         │  │              (開発統合ブランチ)                      │ │
         │  └───┬─────────────────┬─────────────────┬─────────────┘ │
         │      │                 │                 │               │
         │      ▼                 ▼                 ▼               │
         │  ┌────────┐       ┌────────┐       ┌────────┐           │
         │  │feature/│       │feature/│       │release/│           │
         │  │  xxx   │       │  yyy   │       │ 0.0.x  │           │
         │  └────────┘       └────────┘       └────────┘           │
         │                                                         │
         └─────────────────────────────────────────────────────────┘
```

### 2.2 ブランチの役割

| ブランチ | 命名規則 | 目的 | ライフサイクル |
|---------|---------|------|---------------|
| `main` | - | 本番リリース用。常に安定版 | 永続 |
| `develop` | - | 開発統合。次リリースの準備 | 永続 |
| `feature/*` | `feature/{機能名}` | 新機能開発 | 一時的（PR後削除） |
| `release/*` | `release/{バージョン}` | リリース準備 | 一時的（マージ後削除） |
| `hotfix/*` | `hotfix/{修正名}` | 緊急バグ修正 | 一時的（マージ後削除） |

### 2.3 実際のブランチ例（本リポジトリより）

```
remotes/origin/main                        # 本番
remotes/origin/develop                     # 開発統合
remotes/origin/feature/resourcePlansCreator  # 要員計画機能
remotes/origin/feature/invalid             # validStatus機能
```

---

## 3. 開発フロー詳細

### 3.1 全体フロー図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           開発ワークフロー全体図                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ 1. 要件  │───▶│ 2. 仕様  │───▶│ 3.テスト │───▶│ 4. 実装  │             │
│  │   定義   │    │   作成   │    │ コード   │    │          │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│       │                                               │                     │
│       │         【仕様駆動開発 (Forward)】            │                     │
│       ▼                                               ▼                     │
│  ┌──────────┐                                   ┌──────────┐              │
│  │ REQ-xxx  │                                   │  全テスト │              │
│  │   .md    │                                   │   PASS   │              │
│  └──────────┘                                   └────┬─────┘              │
│                                                      │                     │
│  ════════════════════════════════════════════════════╪═════════════════   │
│                                                      │                     │
│       【Git Flow】                                   ▼                     │
│                                                ┌──────────┐              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐ │トレーサビ│              │
│  │ feature  │───▶│   PR     │───▶│ develop  │ │リティ更新│              │
│  │ ブランチ │    │ レビュー │    │ マージ   │ └──────────┘              │
│  └──────────┘    └──────────┘    └──────────┘                            │
│                                       │                                   │
│                                       ▼                                   │
│                                 ┌──────────┐    ┌──────────┐             │
│                                 │ release  │───▶│   main   │             │
│                                 │ ブランチ │    │  + タグ  │             │
│                                 └──────────┘    └──────────┘             │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Feature開発フロー

```bash
# 1. developから feature ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/csv-reader

# 2. 開発作業（仕様駆動開発サイクル）
#    - 要件定義書作成
#    - 仕様書作成
#    - テストコード作成
#    - 実装
#    - テスト実行・修正

# 3. コミット
git add .
git commit -m "feat: CSVファイルからProjectを生成する機能を追加"

# 4. リモートにプッシュ
git push -u origin feature/csv-reader

# 5. Pull Request作成（GitHub）
gh pr create --base develop --title "feat: CSV読み込み機能"

# 6. レビュー・マージ後、ローカルブランチ削除
git checkout develop
git pull origin develop
git branch -d feature/csv-reader
```

### 3.3 リリースフロー

```bash
# 1. developからreleaseブランチを作成
git checkout develop
git pull origin develop
git checkout -b release/0.0.18

# 2. バージョン更新
npm version 0.0.18 --no-git-tag-version
# package.json, CHANGELOG.md を更新

# 3. コミット
git add .
git commit -m "0.0.18"

# 4. mainにマージ
git checkout main
git merge --no-ff release/0.0.18

# 5. タグ作成
git tag 0.0.18

# 6. developにもマージ（タグをマージ）
git checkout develop
git merge --no-ff 0.0.18 -m "Merge tag '0.0.18' into develop"

# 7. プッシュ
git push origin main develop --tags

# 8. releaseブランチ削除
git branch -d release/0.0.18
```

---

## 4. 仕様駆動開発（Spec-Driven Development）

### 4.1 Forward フロー（新規開発）

```
┌────────────────┐
│   要件定義     │  docs/specs/requirements/REQ-xxx.md
│  (何を作るか)   │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   詳細仕様     │  docs/specs/domain/Xxx.spec.md
│  (どう作るか)   │  docs/specs/domain/Xxx.spec.yaml
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  テストコード  │  src/**/__tests__/Xxx.test.ts
│  (検証方法)    │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│    実装        │  src/**/Xxx.ts
│  (コード)      │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ トレーサビリティ│  要件 ← 仕様 ← テスト ← 実装
│    更新        │  全てのリンクを確認
└────────────────┘
```

### 4.2 Backward フロー（既存コード文書化）

```
┌────────────────┐
│  既存コード    │  src/**/Xxx.ts（既存）
│   分析        │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   仕様書       │  docs/specs/domain/Xxx.spec.md
│   作成        │  （コードから逆算）
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  テストコード  │  src/**/__tests__/Xxx.test.ts
│   追加        │  （仕様を検証）
└────────────────┘
```

### 4.3 成果物の関係

```
docs/specs/requirements/
├── REQ-CSV-001.md          ─────┐
                                 │ トレーサビリティ
docs/specs/domain/               │
├── CsvProjectCreator.spec.md ◀──┤
├── CsvProjectCreator.spec.yaml  │
                                 │
src/infrastructure/              │
├── CsvProjectCreator.ts    ◀────┤
├── __tests__/                   │
│   ├── CsvProjectCreator.test.ts ◀──┘
│   └── CsvProjectCreator.integration.test.ts
```

---

## 5. コミットメッセージ規約

### 5.1 フォーマット

```
<type>: <subject>

[body]

[footer]
```

### 5.2 Type一覧

| Type | 説明 | 例 |
|------|------|-----|
| `feat` | 新機能 | `feat: CSV読み込み機能を追加` |
| `fix` | バグ修正 | `fix: 日付パースの不具合を修正` |
| `docs` | ドキュメント | `docs: README更新` |
| `refactor` | リファクタリング | `refactor: TaskRow計算処理を整理` |
| `test` | テスト | `test: CsvProjectCreatorのテスト追加` |
| `chore` | その他 | `chore: 依存関係更新` |

---

## 6. バージョニング

### 6.1 セマンティックバージョニング

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── バグ修正（後方互換あり）
  │     └──────── 機能追加（後方互換あり）
  └────────────── 破壊的変更（後方互換なし）
```

### 6.2 本プロジェクトのバージョン履歴

| バージョン | 主な変更 |
|-----------|---------|
| 0.0.17 | validStatusプロパティ追加 |
| 0.0.15 | 微調整 |
| 0.0.14 | リファクタリング、要員計画β版 |
| 0.0.13 | Diffに工数プロパティ追加 |
| ... | ... |

---

## 7. 本リポジトリのGitグラフ（実例）

```
*   Merge tag '0.0.17' into develop          (develop)
|\
| *   Merge branch 'release/0.0.17'          (main)
| |\
| | * 0.0.17                                  ← タグ: 0.0.17
| |/
|/|
* |   Merge pull request #43 feature/invalid  ← PR: validStatus
|\ \
| * | TaskRow : validStatusプロパティを追加
|/ /
* | Merge tag '0.0.15' into develop
|\|
| *   Merge branch 'release/0.0.15'
| |\
| | * 0.0.15
...
```

**特徴:**
- `feature/*` → `develop` へのPRマージ
- `release/*` → `main` へのマージでタグ作成
- タグを `develop` にもマージして同期

---

## 8. チェックリスト

### 8.1 Feature開発時

- [ ] `develop`から`feature/*`ブランチを作成
- [ ] 要件定義書を作成（Forward時）
- [ ] 仕様書を作成
- [ ] テストコードを作成
- [ ] 実装
- [ ] 全テストPASS確認
- [ ] トレーサビリティ更新
- [ ] PRを作成
- [ ] レビュー・マージ

### 8.2 リリース時

- [ ] `develop`から`release/*`ブランチを作成
- [ ] バージョン番号更新（package.json）
- [ ] CHANGELOG更新
- [ ] `main`にマージ
- [ ] タグ作成
- [ ] `develop`にタグをマージ
- [ ] npm publish（必要に応じて）

---

## 9. 関連ドキュメント

| ドキュメント | パス | 説明 |
|-------------|------|------|
| CLAUDE.md | `/CLAUDE.md` | プロジェクト技術ガイド |
| CHANGELOG.md | `/CHANGELOG.md` | 変更履歴 |
| 要件定義書 | `docs/specs/requirements/` | 機能要件 |
| 仕様書 | `docs/specs/domain/` | 詳細設計 |

---

## 10. 補足：現在の状態

**2025-12-16時点:**

`feature/claude-code-setup`ブランチで以下の作業を実施中:
- Claude Code導入（CLAUDE.md）
- 仕様駆動開発の導入（Jest環境、仕様書）
- CsvProjectCreator機能の開発（仕様駆動開発フローで実装）

Git Flowに従い、`develop`から分岐 → PR → `develop`へマージ の流れで進行。
