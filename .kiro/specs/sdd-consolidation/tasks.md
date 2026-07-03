# 実装計画

> docs/プロセスのみ（src/ 変更なし）。ブランチ: `feature/sdd-consolidation`（develop から分岐）。

- [x] 1. M1: スキルへの同期規則組み込み
- [x] 1.1 kiro-spec-tasks の生成規則にマスター同期タスク必須化を追記
  - `.claude/skills/kiro-spec-tasks/rules/tasks-generation.md` 末尾に規則を追加
  - 完了条件: 規則に {Class}.spec.md + INDEX.md 更新の必須配置が明記されること
  - _Requirements: 1.1_
- [x] 1.2 kiro-validate-impl に同期検証項目を追記
  - `.claude/skills/kiro-validate-impl/SKILL.md` のチェックリストに master/INDEX 同期確認を追加
  - _Requirements: 1.2_

- [x] 2. M2: INDEX.md（APIカタログ）初版
- [x] 2.1 バレル export の棚卸しと INDEX.md 作成
  - `src/*/index.ts` の全 export を列挙し、design D2 のフォーマットで `docs/specs/domain/master/INDEX.md` を新設
  - master spec 不在のモジュールは「-（未文書化）」と明示
  - 完了条件: 全バレル export が INDEX に載っていること（grep で突合）
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. M3: 旧方式資産の Attic 退避
- [x] 3.1 attic 新設と旧 workflow 文書の退避
  - `docs/attic/README.md` 作成、DEVELOPMENT_WORKFLOW.md / SAMPLE_DEVELOPMENT_FLOW.md を git mv
  - _Requirements: 3.1, 3.2_
- [x] 3.2 features 22ファイルの吸収監査と退避
  - design D3 の手順で AUDIT.md を作成し、未反映分を master に吸収後、`docs/attic/features/` へ git mv
  - _Requirements: 3.3_
- [x] 3.3 spec.yaml 9本の削除と #65 クローズ
  - _Requirements: 3.4_
- [x] 3.4 リンク検査
  - `git grep` で旧パス（docs/workflow/DEVELOPMENT_WORKFLOW / specs/domain/features）参照を洗い出し、現行文書に張り替え
  - _Requirements: 3.5_

- [x] 4. M3: CLAUDE.md・案内の一本化
- [x] 4.1 CLAUDE.md の仕様駆動開発セクション全面書き換え（design D5）
  - _Requirements: 4.1, 4.2_
- [x] 4.2 #66 の再定義またはクローズ
  - _Requirements: 4.3_

- [x] 5. M4: phase0 のマスター同期（新方式の初運用）
- [x] 5.1 ProjectService.spec.md の同期（期間SPI・空diff）
  - _Requirements: 5.1_
- [x] 5.2 TaskRow.spec.md の同期（finished/toDaySerial/calculatePVs）
  - _Requirements: 5.2_
- [x] 5.3 INDEX.md へ phase0 追加シンボルを反映
  - _Requirements: 5.3_

- [x] 6. 検証と PR
- [x] 6.1 `npm test` 無影響確認 + リンク検査再実行 + roadmap.md の sdd-consolidation チェック
- [x] 6.2 PR 作成（base: develop）
