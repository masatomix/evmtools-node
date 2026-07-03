# プロジェクト構成

## 組織方針

レイヤードアーキテクチャ（クリーンアーキテクチャ）。機能ではなく責務でディレクトリを分割する。依存は常に下方向（presentation → usecase → domain）で、domain 層は他層に依存しない。

## ディレクトリパターン

### ドメイン層
**配置**: `src/domain/`
**目的**: ビジネスエンティティ、インターフェース定義、ビジネスロジック。外部依存なし
**例**: `Project.ts`, `TaskRow.ts`, `TaskNode.ts`, `ProjectService.ts`, `ProjectCreator.ts`（インターフェース）

### インフラ層
**配置**: `src/infrastructure/`
**目的**: ドメインインターフェースの具象実装、外部 I/O（Excel/CSV 読み書き）、DTO ↔ Entity 変換
**例**: `ExcelProjectCreator.ts`（ProjectCreator 実装）, `CsvProjectCreator.ts`, `TaskRowFactory.ts`

### ユースケース層
**配置**: `src/usecase/`
**目的**: アプリケーションロジックの組み立て。ドメインとインフラを協調させる
**例**: `pbevm-diff-usecase.ts`, `pbevm-show-project-usecase.ts`

### プレゼンテーション層
**配置**: `src/presentation/`
**目的**: CLI エントリーポイント（yargs ベース）。ビジネスロジックは持たない
**例**: `cli-pbevm-diff.ts`, `cli-pbevm-show-project.ts`

### 共通ユーティリティ
**配置**: `src/common/`
**目的**: 全レイヤーから利用可能なヘルパー（日付操作、バリデーション等）
**例**: `dateUtils.ts`, `validators.ts`

### リソースモジュール（ベータ）
**配置**: `src/resource/`
**目的**: 要員計画機能。内部に独自の domain/infrastructure/usecase/presentation 構造を持つ自己完結サブモジュール
**例**: `resource/domain/ResourcePlansCreator.ts`, `resource/infrastructure/ExcelResourcePlansCreator.ts`

## 命名規約

- **クラス / インターフェース**: PascalCase（`ProjectService`, `TaskRowCreator`）
- **具象実装**: `{接頭辞}{ドメインインターフェース名}` パターン（`ExcelProjectCreator` は `ProjectCreator` を実装）
- **クラスファイル**: PascalCase（`Project.ts`, `ExcelProjectCreator.ts`）
- **ユースケース / CLI ファイル**: kebab-case（`pbevm-diff-usecase.ts`, `cli-pbevm-diff.ts`）
- **関数 / 変数**: camelCase（`calculatePV()`, `baseDate`）
- **定数**: UPPER_SNAKE_CASE（`DEFAULT_TIMEOUT`）

## import の整理

```typescript
// 同一レイヤー内: 相対パス
import { TaskNode } from './TaskNode'
import { TaskService } from './TaskService'

// レイヤー間: 相対パス（パスエイリアスは不使用）
import { Project } from '../domain/Project'
import { ProjectCreator } from '../domain/ProjectCreator'

// バレル経由での import も可
import { Project, ProjectCreator } from '../domain'
```

**パスエイリアス**: 未使用。全て相対パスで統一。

## テスト配置

```
src/{layer}/
├── SomeClass.ts
└── __tests__/
    ├── SomeClass.test.ts                    # 単体テスト
    ├── SomeClass.{method}.test.ts           # メソッド特化テスト
    ├── SomeClass.integration.test.ts        # 統合テスト
    └── fixtures/                            # テストデータ
```

- テストは対象クラスと同じレイヤーの `__tests__/` に co-locate
- メソッド単位で分割する場合は `{Class}.{method}.test.ts` 命名
- 統合テストは `*.integration.test.ts` で明示的に区別

## コード組織化の原則

1. **依存は下方向のみ**: presentation → usecase → domain。domain は他層を import しない
2. **依存性逆転**: domain がインターフェースを定義し、infrastructure が実装する（例: `ProjectCreator` → `ExcelProjectCreator`）
3. **レイヤー別エクスポート**: 各層の `index.ts` が公開 API を定義し、package.json の exports でエントリーポイントとして公開
4. **サブモジュールパターン**: 大きな機能は `src/resource/` のように内部にレイヤー構造を持つ自己完結モジュールとして配置

## 仕様書配置

| 配置場所 | 用途 |
|---------|------|
| `docs/specs/requirements/` | 要件定義書（REQ-xxx-nnn 形式） |
| `docs/specs/domain/master/` | クラス別マスター設計書 |
| `docs/specs/domain/master/INDEX.md` | 全クラス・公開APIカタログ（横串） |
| `docs/attic/` | 廃止済み旧方式文書（歴史資料。参照しない） |
| `.kiro/specs/` | kiro 式 SDD による新規仕様書 |
| `docs/GLOSSARY.md` | EVM ドメイン用語集・クラス仕様リファレンス |

---
_ファイルツリーではなくパターンを文書化する。パターンに従う新規ファイルの追加で更新が必要にならないようにする_
