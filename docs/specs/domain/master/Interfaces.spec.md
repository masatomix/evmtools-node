# ドメイン層インターフェース 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16

---

## 1. 基本情報

### 1.1 概要

このドキュメントは、ドメイン層に定義されたインターフェース（ポート）の仕様をまとめたものです。
これらはクリーンアーキテクチャにおける「ポート」として機能し、外部依存を抽象化します。

### 1.2 インターフェース一覧

| インターフェース名 | ソースファイル | 分類 | 責務 |
|-------------------|----------------|------|------|
| `TaskRowCreator` | `src/domain/TaskRowCreator.ts` | ポート | TaskRowを生成。データソースの抽象化 |
| `ProjectRepository` | `src/domain/ProjectRepository.ts` | リポジトリ | Projectの永続化を抽象化 |
| `ProjectProgressCreator` | `src/domain/ProjectProgressCreator.ts` | ポート | 時系列の進捗データを生成 |
| `ProjectStatisticsCreator` | `src/domain/ProjectStatisticsCreator.ts` | ポート | プロジェクト統計を生成 |

### 1.3 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| ポート | Port | 外部依存を抽象化するインターフェース |
| リポジトリ | Repository | DDDパターンにおける永続化の抽象化 |
| アダプター | Adapter | ポートの具体的な実装 |

### 1.4 境界づけられたコンテキスト（所属ドメイン）

```
┌─────────────────────────────────────────────────────────────┐
│                      ドメイン層                              │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │  TaskRowCreator    │  │  ProjectProgressCreator    │    │
│  │  (ポート)          │  │  (ポート)                   │    │
│  └────────────────────┘  └────────────────────────────┘    │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │  ProjectRepository │  │ ProjectStatisticsCreator   │    │
│  │  (リポジトリ)      │  │  (ポート)                   │    │
│  └────────────────────┘  └────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                  インフラストラクチャ層                      │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │ TaskRowCreatorImpl │  │ ExcelProjectStatistics     │    │
│  │                    │  │ Creator                    │    │
│  └────────────────────┘  └────────────────────────────┘    │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐    │
│  │ProjectRepositoryImpl│  │ExcelBufferProjectStatistics│   │
│  │                    │  │ Creator                    │    │
│  └────────────────────┘  └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-IF-01 | 各インターフェースは1つ以上の実装を持つ | 設計時 |
| INV-IF-02 | インターフェースはドメイン層に配置される | 設計時 |
| INV-IF-03 | 実装クラスはインフラストラクチャ層に配置される | 設計時 |

---

## 3. プロパティ仕様

### 3.1 TaskRowCreator

該当なし（メソッドのみのインターフェース）

### 3.2 ProjectRepository

該当なし（メソッドのみのインターフェース）

### 3.3 ProjectProgressCreator

該当なし（メソッドのみのインターフェース）

### 3.4 ProjectStatisticsCreator

該当なし（メソッドのみのインターフェース）

---

## 4. コンストラクタ仕様

該当なし（インターフェースのため）

---

## 5. メソッド仕様

### 5.1 TaskRowCreator

#### 定義

```typescript
export interface TaskRowCreator {
    createRowData(): Promise<TaskRow[]>
}
```

#### `createRowData(): Promise<TaskRow[]>`

##### 目的
データソースからTaskRow配列を生成する

##### 事後条件

| ID | 条件 |
|----|------|
| POST-TRC-01 | TaskRow[]を返す（空配列可） |
| POST-TRC-02 | 各TaskRowのparentId, isLeafが設定されている |

##### 実装クラス

| クラス名 | パッケージ | 説明 |
|----------|-----------|------|
| `TaskRowCreatorImpl` | infrastructure | Excelマッピングデータから生成 |

---

### 5.2 ProjectRepository

#### 定義

```typescript
export interface ProjectRepository {
    save(project: Project): Promise<void>
}
```

#### `save(project: Project): Promise<void>`

##### 目的
Projectを永続化する

##### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-PR-01 | projectが有効なProjectインスタンス | 例外 |

##### 事後条件

| ID | 条件 |
|----|------|
| POST-PR-01 | Projectが永続化される（実装依存） |

##### 実装クラス

| クラス名 | パッケージ | 説明 |
|----------|-----------|------|
| `ProjectRepositoryImpl` | infrastructure | Excelファイルへの出力 |

---

### 5.3 ProjectProgressCreator

#### 定義

```typescript
export interface ProjectProgressCreator {
    createProjectProgress(): Promise<ProjectProgress[]>
}
```

#### `createProjectProgress(): Promise<ProjectProgress[]>`

##### 目的
時系列のプロジェクト進捗データを生成する

##### 事後条件

| ID | 条件 |
|----|------|
| POST-PPC-01 | ProjectProgress[]を返す（date, pv, ev, spiを含む） |

---

### 5.4 ProjectStatisticsCreator

#### 定義

```typescript
export interface ProjectStatisticsCreator {
    createProjectStatistics(): Promise<ProjectStatistics[]>
}
```

#### `createProjectStatistics(): Promise<ProjectStatistics[]>`

##### 目的
プロジェクト統計データを生成する

##### 事後条件

| ID | 条件 |
|----|------|
| POST-PSC-01 | ProjectStatistics[]を返す |

##### 実装クラス（同一ファイル内）

| クラス名 | 説明 |
|----------|------|
| `ExcelProjectStatisticsCreator` | Excelファイルパスから読み込み |
| `ExcelBufferProjectStatisticsCreator` | ArrayBufferから読み込み |

---

## 6. テストシナリオ（Given-When-Then形式）

### 6.1 TaskRowCreator

```gherkin
Scenario: TaskRow配列を生成する
  Given 有効なデータソース
  When  createRowData()を呼び出す
  Then  TaskRow[]が返される
  And   各TaskRowにparentId, isLeafが設定されている
```

### 6.2 ProjectRepository

```gherkin
Scenario: Projectを保存する
  Given 有効なProjectインスタンス
  When  save(project)を呼び出す
  Then  Projectが永続化される（エラーなし）
```

### 6.3 ProjectStatisticsCreator

```gherkin
Scenario: ProjectStatisticsを生成する
  Given 有効なデータソース（Excelファイル or ArrayBuffer）
  When  createProjectStatistics()を呼び出す
  Then  ProjectStatistics[]が返される
```

---

## 7. 外部依存

該当なし（インターフェースのため外部依存はない）

---

## 8. 関連オブジェクト

### 8.1 依存関係図

```
┌─────────────────────────────────────────────────────────────┐
│                    インターフェース群                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │TaskRowCreator│  │ProjectRepo │  │ProjectProgress│        │
│  │             │  │sitory      │  │Creator       │         │
│  └──────┬──────┘  └──────┬─────┘  └──────┬───────┘         │
│         │                │               │                  │
│         ▼                ▼               ▼                  │
│    ┌────────────────────────────────────────────────┐      │
│    │          インフラストラクチャ層実装             │      │
│    └────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 関係一覧

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `TaskRow` | uses | TaskRowCreatorの戻り値 |
| `Project` | uses | ProjectRepositoryの引数 |
| `ProjectProgress` | uses | ProjectProgressCreatorの戻り値 |
| `ProjectStatistics` | uses | ProjectStatisticsCreatorの戻り値 |

---

## 9. テストケース数サマリ

| インターフェース | 計画 | 実装 |
|------------------|------|------|
| TaskRowCreator | 3件 | 3件 |
| ProjectRepository | 2件 | 2件 |
| ProjectProgressCreator | 2件 | 2件 |
| ProjectStatisticsCreator | 4件 | 4件 |
| **合計** | **11件** | **11件** |

---

## 10. 要件トレーサビリティ

> **重要**: このセクションは必須です。grepで検索可能な形式で記載すること。

該当なし（基盤インターフェースのため特定の要件に紐づかない）

---

## 11. テスト実装

### 11.1 テストファイル

| ファイル | 説明 | テスト数 |
|---------|------|---------|
| `src/infrastructure/__tests__/TaskRowCreatorImpl.test.ts` | TaskRowCreator実装の単体テスト | 3件 |
| `src/infrastructure/__tests__/ProjectRepositoryImpl.test.ts` | ProjectRepository実装の単体テスト | 2件 |

### 11.2 テストフィクスチャ

該当なし

### 11.3 テスト実行結果

```
実行日: 2025-12-16
Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
```

---

## 12. 設計上の課題・改善提案

| 課題 | 現状 | 改善案 |
|------|------|--------|
| ProjectProgressCreatorの型定義 | `ProjectProgress`型が`presentation/project-test2.ts`で定義 | 型定義をドメイン層に移動 |
| ProjectStatisticsCreatorの実装配置 | 同じファイルに実装クラスが定義されている | 実装クラスをinfrastructure層に移動 |
| ProjectStatisticsCreatorの外部依存 | ドメイン層が`excel-csv-read-write`をimport | 実装クラス移動で解消 |

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 | 要件ID |
|-----------|------|---------|--------|
| 1.0.0 | 2025-12-16 | 初版作成 | - |
