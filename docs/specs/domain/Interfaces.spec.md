# ドメイン層インターフェース仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16

---

## 概要

このドキュメントは、ドメイン層に定義されたインターフェース（ポート）の仕様をまとめたものです。
これらはクリーンアーキテクチャにおける「ポート」として機能し、外部依存を抽象化します。

---

## 1. TaskRowCreator

**ソースファイル**: `src/domain/TaskRowCreator.ts`

### 1.1 基本情報

| 項目 | 内容 |
|------|------|
| **インターフェース名** | `TaskRowCreator` |
| **分類** | **ポート（Port）** |
| **責務** | TaskRowを何らかの方法で生成する。データソースの抽象化 |

### 1.2 定義

```typescript
export interface TaskRowCreator {
    createRowData(): Promise<TaskRow[]>
}
```

### 1.3 メソッド仕様

#### `createRowData(): Promise<TaskRow[]>`

| 項目 | 内容 |
|------|------|
| **目的** | データソースからTaskRow配列を生成する |
| **戻り値** | `Promise<TaskRow[]>` |

##### 事後条件

| ID | 条件 |
|----|------|
| POST-TRC-01 | TaskRow[]を返す（空配列可） |
| POST-TRC-02 | 各TaskRowのparentId, isLeafが設定されている |

### 1.4 実装クラス

| クラス名 | パッケージ | 説明 |
|----------|-----------|------|
| `TaskRowCreatorImpl` | infrastructure | Excelマッピングデータから生成 |

---

## 2. ProjectRepository

**ソースファイル**: `src/domain/ProjectRepository.ts`

### 2.1 基本情報

| 項目 | 内容 |
|------|------|
| **インターフェース名** | `ProjectRepository` |
| **分類** | **リポジトリ（Repository）** - DDDパターン |
| **責務** | Projectの永続化を抽象化する |

### 2.2 定義

```typescript
export interface ProjectRepository {
    save(project: Project): Promise<void>
}
```

### 2.3 メソッド仕様

#### `save(project: Project): Promise<void>`

| 項目 | 内容 |
|------|------|
| **目的** | Projectを永続化する |
| **引数** | `project: Project` |
| **戻り値** | `Promise<void>` |

##### 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-PR-01 | projectが有効なProjectインスタンス | 例外 |

##### 事後条件

| ID | 条件 |
|----|------|
| POST-PR-01 | Projectが永続化される（実装依存） |

### 2.4 実装クラス

| クラス名 | パッケージ | 説明 |
|----------|-----------|------|
| `ProjectRepositoryImpl` | infrastructure | Excelファイルへの出力 |

---

## 3. ProjectProgressCreator

**ソースファイル**: `src/domain/ProjectProgressCreator.ts`

### 3.1 基本情報

| 項目 | 内容 |
|------|------|
| **インターフェース名** | `ProjectProgressCreator` |
| **分類** | **ポート（Port）** |
| **責務** | ProjectProgress（時系列の進捗データ）を生成する |

### 3.2 定義

```typescript
export interface ProjectProgressCreator {
    createProjectProgress(): Promise<ProjectProgress[]>
}
```

### 3.3 メソッド仕様

#### `createProjectProgress(): Promise<ProjectProgress[]>`

| 項目 | 内容 |
|------|------|
| **目的** | 時系列のプロジェクト進捗データを生成する |
| **戻り値** | `Promise<ProjectProgress[]>` |

##### 事後条件

| ID | 条件 |
|----|------|
| POST-PPC-01 | ProjectProgress[]を返す（date, pv, ev, spiを含む） |

### 3.4 設計上の課題

| 課題 | 現状 | 改善案 |
|------|------|--------|
| **ドメイン層がプレゼンテーション層に依存** | `ProjectProgress`型が`presentation/project-test2.ts`で定義 | 型定義をドメイン層に移動 |

---

## 4. ProjectStatisticsCreator

**ソースファイル**: `src/domain/ProjectStatisticsCreator.ts`

### 4.1 基本情報

| 項目 | 内容 |
|------|------|
| **インターフェース名** | `ProjectStatisticsCreator` |
| **分類** | **ポート（Port）** |
| **責務** | ProjectStatistics（プロジェクト統計）を生成する |

### 4.2 定義

```typescript
export interface ProjectStatisticsCreator {
    createProjectStatistics(): Promise<ProjectStatistics[]>
}
```

### 4.3 メソッド仕様

#### `createProjectStatistics(): Promise<ProjectStatistics[]>`

| 項目 | 内容 |
|------|------|
| **目的** | プロジェクト統計データを生成する |
| **戻り値** | `Promise<ProjectStatistics[]>` |

##### 事後条件

| ID | 条件 |
|----|------|
| POST-PSC-01 | ProjectStatistics[]を返す |

### 4.4 実装クラス（同一ファイル内）

| クラス名 | 説明 |
|----------|------|
| `ExcelProjectStatisticsCreator` | Excelファイルパスから読み込み |
| `ExcelBufferProjectStatisticsCreator` | ArrayBufferから読み込み |

### 4.5 設計上の課題

| 課題 | 現状 | 改善案 |
|------|------|--------|
| **インターフェースと実装が同一ファイル** | 同じファイルに実装クラスが定義されている | 実装クラスをinfrastructure層に移動 |
| **ドメイン層がExcelライブラリに依存** | `excel-csv-read-write`をimport | 実装クラス移動で解消 |

---

## 5. インターフェース関係図

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

## 6. テストシナリオ（共通）

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

## 7. テストケース数サマリ

| インターフェース | テストケース数（実装含む） |
|------------------|-------------------------|
| TaskRowCreator | 3件 |
| ProjectRepository | 2件 |
| ProjectProgressCreator | 2件 |
| ProjectStatisticsCreator | 4件 |
| **合計** | **約11件** |
