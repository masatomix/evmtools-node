# 設計書: sdd-consolidation

## 概要

**目的**: 仕様駆動開発の cc-sdd 一本化への移行作業（docs/プロセスのみ、src/ 変更なし）。方式そのものは `.kiro/steering/master-spec-sync.md` v2 が規範であり、本設計書は移行の実施手順を確定する。
**ユーザー**: 開発者・AIエージェント（迷わない現役ディレクトリ）、PM・新規参加者（INDEX.md による全体像）。

### ゴール / 非ゴール
- ゴール: 要件1〜5 の実現（スキル規則・INDEX.md・attic 退避・CLAUDE.md・phase0 マスター同期）
- 非ゴール: src/ の変更、`.kiro/settings/templates/` の変更（cc-sdd 上流テンプレートは不変。規則は skills の rules/ 追記で対応）、phase1〜5 spec の内容変更

## 境界コミットメント

- **担う**: `.claude/skills/kiro-spec-tasks/rules/tasks-generation.md`・`.claude/skills/kiro-validate-impl/SKILL.md` への規則追記、`docs/specs/domain/master/INDEX.md` 新設、`docs/attic/` 体系、features 22ファイルの吸収監査と退避、yaml 9本削除、CLAUDE.md/README のリンク張り替え、phase0 分の master 同期
- **担わない**: GLOSSARY 本体の再構成、evmtools スキル/webui 側 docs、リリース作業（release/0.0.29 は本 spec マージ後に別途）
- **再検証トリガー**: master-spec-sync.md v2 の規約変更、INDEX.md のフォーマット変更

## 主要設計

### D1. スキル規則の追記位置
- `kiro-spec-tasks/rules/tasks-generation.md` 末尾に「マスター設計書同期タスクの必須化」節を追加（tasks 生成時、実装タスクの後段に `{Class}.spec.md` + `INDEX.md` 更新タスクを必ず配置。_Requirements にはその spec の該当要件を紐づける）
- `kiro-validate-impl/SKILL.md` の検証チェックリストに「master/INDEX 同期の存在確認（変更された公開シンボルが INDEX.md と該当 {Class}.spec.md に反映されているか）」を追加

### D2. INDEX.md のフォーマット

```markdown
# マスター設計書 INDEX / 公開APIカタログ
## レイヤー別クラス一覧
| レイヤー | クラス/モジュール | 責務 | マスター設計書 |
## 公開APIカタログ
### domain（evmtools-node/domain）
| シンボル | 種別 | 概要 | 導入 | 詳細 |
（infrastructure / usecase / common / logger / project / resource も同様）
```
- 「導入」列はバージョンが判明するもののみ記載（不明は `-`）
- 網羅の正: `src/{domain,infrastructure,usecase,common,logger,project,resource}/index.ts` のバレル export
- master spec が無いモジュール（common ユーティリティ、usecase、resource 等）は INDEX の行から `-`（未文書化・Backlog）とし、クラス spec の新設は Project/ProjectService/TaskRow 等の既存 9 本 + 明確な不足分に留める（一括新設はしない: 過剰文書化を避ける）

### D3. 吸収監査の手順（features 22ファイル）
1. 各 `features/{name}.spec.md` の対象クラスを特定（ファイル名プレフィックス）
2. 対応する `master/{Class}.spec.md` の変更履歴・メソッド仕様に、当該 feature の内容（メソッド・AC・TC）が反映済みかを確認
3. 監査結果を `docs/attic/features/AUDIT.md` に表形式で記録（ファイル / 対象クラス / 反映状況 / 吸収した差分）
4. 未反映があれば master に吸収 → 全件 `git mv` で `docs/attic/features/` へ
- `.tasks.md`（8本）は開発タスクの履歴のため監査不要でそのまま退避

### D4. attic 構造
```
docs/attic/
├── README.md          # 誘導（現行: CC-SDD_WORKFLOW.md / master/INDEX.md）
├── DEVELOPMENT_WORKFLOW.md
├── SAMPLE_DEVELOPMENT_FLOW.md
└── features/          # 旧・案件設計書（AUDIT.md 付き）
```

### D5. CLAUDE.md 書き換え方針
- 「仕様駆動開発（重要）」節を全面差し替え: cc-sdd 最小ワークフロー（.kiro/CLAUDE.md へ委譲）+ master-spec-sync v2 の要点（同期必須・INDEX 更新）+ 参照表（CC-SDD_WORKFLOW / GLOSSARY / INDEX）
- 「参考となる既存仕様書」の features 例示を master 例示に差し替え。旧 workflow 文書への参照を削除

## 要件トレーサビリティ

| 要件 | 設計 | タスク |
|------|------|--------|
| 1.1-1.2 | D1 | 1.x |
| 2.1-2.3 | D2 | 2.x |
| 3.1-3.5 | D3, D4 | 3.x |
| 4.1-4.3 | D5 | 4.x |
| 5.1-5.3 | （master 既存フォーマット踏襲） | 5.x |

## エラー処理・リスク
- 吸収監査で大きな未反映が見つかった場合: master への吸収を優先し、工数超過なら該当ファイルのみ退避を保留（AUDIT.md に保留と明記）
- リンク切れ: 退避後に `git grep` で旧パス参照を全確認

## テスト戦略
- docs のみのため検証は: `npm test`（無影響確認）+ `git grep` によるリンク検査 + `/kiro-spec-status` 相当の spec 整合確認
