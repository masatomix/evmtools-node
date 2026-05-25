# マスター設計書の同期ルール

本プロジェクトでは、kiro 式の spec 設計書（`.kiro/specs/{feature}/design.md`）に加えて、クラス単位の**マスター設計書**（`docs/specs/domain/master/{Class}.spec.md`）を維持する。機能実装後、設計書の内容をマスター設計書に反映するフローは必須である。

## なぜマスター設計書が必要か

kiro spec は機能（feature）単位で作成される。一方、マスター設計書はクラス単位で蓄積される永続的なリファレンスであり、以下の価値がある:

- **クラスの全体像**: 複数の feature spec に分散した変更が、マスターに集約される
- **新メンバーのオンボーディング**: 機能横断でクラスの振る舞いを把握できる
- **影響範囲の特定**: あるクラスに関わる全要件・テストを一箇所で確認できる

## 同期タイミング

- **実装完了後、PR マージ前**に実施する
- `/kiro-impl` 完了後の作業として位置づける

## 反映内容

| feature spec の変更 | マスター設計書への反映 |
|--------------------|---------------------|
| 新規メソッド/プロパティ | メソッド仕様セクションに追加 |
| テストケース | テストシナリオセクションに追加（または参照） |
| インターフェース変更 | 型定義・シグネチャを更新 |
| 変更履歴 | 変更履歴セクションにバージョン・日付・概要・feature 名を追記 |

## 配置場所

```
docs/specs/domain/
├── master/                          # マスター設計書（クラス単位、永続）
│   ├── Project.spec.md
│   ├── TaskRow.spec.md
│   └── CsvProjectCreator.spec.md
└── features/                        # 旧 SDD の案件設計書（参照用に維持）
    └── Project.excludedTasks.spec.md
```

新規開発での feature spec は `.kiro/specs/` に作成されるが、マスター設計書への反映先は引き続き `docs/specs/domain/master/` とする。

## 参考: 既存マスター設計書の例

- `docs/specs/domain/master/CsvProjectCreator.spec.md` — トレーサビリティセクション付きの正例
- `docs/specs/domain/master/Project.spec.md` — 複数要件を集約した正例

---
_kiro spec は機能を記述し、マスター設計書はクラスの全体像を記述する。両者は補完関係にある。_
