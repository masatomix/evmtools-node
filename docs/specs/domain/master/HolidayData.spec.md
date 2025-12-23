# HolidayData 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-12-16
**ソースファイル**: `src/domain/HolidayData.ts`

---

## 1. 基本情報

### 1.1 概要

| 項目 | 内容 |
|------|------|
| **クラス名** | `HolidayData` |
| **分類** | **値オブジェクト（Value Object）** |
| **パッケージ** | `src/domain/HolidayData.ts` |
| **責務** | プロジェクトに定義された祝日情報を保持する。イミュータブルなデータ構造 |

### 1.2 ユビキタス言語（ドメイン用語）

| ドメイン用語 | 実装名 | 定義 |
|-------------|--------|------|
| 祝日 | `HolidayData` | プロジェクトで非稼働日として定義された日 |
| 祝日説明 | `_desc` | 祝日の名称（例：「元日」） |
| 祝日ルール | `_rule` | 祝日の定義ルール（例：「法律」） |
| 振替 | `_hurikae` | 振替元の祝日名 |

---

## 2. 不変条件（Invariants）

| ID | 不変条件 | 検証タイミング |
|----|----------|----------------|
| INV-HD-01 | `_date`は常に存在する | 生成時 |
| INV-HD-02 | 全プロパティはreadonly（イミュータブル） | 常時 |

---

## 3. プロパティ仕様

### 3.1 コンストラクタ引数

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|:----:|------|
| `_date` | `Date` | ○ | 祝日の日付 |
| `_desc` | `string` | - | 祝日の説明（例：「元日」） |
| `_rule` | `string` | - | 祝日定義ルール |
| `_hurikae` | `string` | - | 振替元の祝日 |

### 3.2 公開プロパティ（getter）

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `date` | `Date` | 祝日の日付（readonly） |

---

## 4. コンストラクタ仕様

### 4.1 シグネチャ

```typescript
constructor(
    private readonly _date: Date,
    private readonly _desc?: string,
    private readonly _rule?: string,
    private readonly _hurikae?: string
)
```

### 4.2 事前条件

| ID | 条件 | 違反時の動作 |
|----|------|-------------|
| PRE-CON-01 | `_date`がDateオブジェクトである | 不正なHolidayDataが生成される |

### 4.3 事後条件

| ID | 条件 |
|----|------|
| POST-CON-01 | 全プロパティがreadonlyで設定される |
| POST-CON-02 | `date`getterで日付が取得可能 |

---

## 5. メソッド仕様

### 5.1 `get date(): Date`

| 項目 | 内容 |
|------|------|
| **目的** | 祝日の日付を取得する |
| **戻り値** | `Date` |

#### 事後条件

| ID | 条件 |
|----|------|
| POST-DATE-01 | コンストラクタで設定された`_date`を返す |

---

## 6. テストシナリオ（Given-When-Then形式）

```gherkin
Scenario: 祝日データを生成する
  Given 日付=2025-01-01, 説明="元日", ルール="法律"
  When  new HolidayData(date, "元日", "法律")を呼び出す
  Then  HolidayDataが生成される
  And   date getterで2025-01-01が取得できる

Scenario: 振替休日を生成する
  Given 日付=2025-01-02, 説明="振替休日", 振替="元日"
  When  new HolidayData(date, "振替休日", "", "元日")を呼び出す
  Then  HolidayDataが生成される

Scenario: 最小限の情報で生成する
  Given 日付=2025-01-01のみ
  When  new HolidayData(date)を呼び出す
  Then  HolidayDataが生成される
  And   _desc, _rule, _hurikaeはundefined
```

---

## 7. 関連オブジェクト

| 関係先 | 関係タイプ | 説明 |
|--------|-----------|------|
| `Project` | aggregates | ProjectがHolidayData[]を保持 |
| `MappingProjectCreator` | creates | Excelから読み込んだデータから生成 |

---

## 8. 設計ノート

### 8.1 値オブジェクトとしての特性

- イミュータブル：全プロパティがreadonly
- 同一性は値で判断（日付が同じなら同じ祝日）
- ライフサイクルはProjectに依存

### 8.2 拡張検討事項

現状、`_desc`, `_rule`, `_hurikae`のgetterが未実装。必要に応じて追加を検討。

---

## 9. テストケース数サマリ

| カテゴリ | テストケース数 |
|----------|--------------|
| コンストラクタ | 3件 |
| date getter | 1件 |
| **合計** | **約4件** |
