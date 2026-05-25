# テスト標準

## 方針

- 実装ではなく**振る舞い**をテストする
- 外部依存（ファイル I/O）のみモック対象。ドメインロジックはモックしない
- クリティカルパス（EVM 計算、差分計算、完了予測）を深くカバーする。100% は追わない
- テストファースト: cc-sdd の `/kiro-impl` は TDD（RED → GREEN → REFACTOR）で実行する

## 配置

`__tests__/` ディレクトリに co-locate:

```
src/{layer}/
├── SomeClass.ts
└── __tests__/
    ├── SomeClass.test.ts                # 単体テスト
    ├── SomeClass.{method}.test.ts       # メソッド特化テスト
    ├── SomeClass.integration.test.ts    # 統合テスト
    └── fixtures/                        # テストデータ
```

命名ルール:
- メソッド単位で分割する場合: `{Class}.{method}.test.ts`（例: `Project.completionForecast.test.ts`）
- 統合テスト: `*.integration.test.ts` で明示的に区別
- `cli-shebang.test.ts` はリリース検証用のため通常テストから除外

## テスト種別

| 種別 | 対象 | モック | 例 |
|------|------|:------:|-----|
| **ユニット** | ドメインロジック単体 | なし（pure function） | `TaskRow.test.ts`, `Project.spiOverride.test.ts` |
| **統合** | 入力→ドメイン→出力の一連のフロー | ファイル I/O は実ファイル使用 | `CsvProjectCreator.integration.test.ts` |
| **ユースケース** | usecase 層の結合 | Excel ファイルは fixtures 使用 | `pbevm-diff-usecase.test.ts` |

presentation 層（CLI）はカバレッジ対象外（`jest.config.js` で除外済み）。

## テスト構造

AAA パターン（Arrange-Act-Assert）を基本とする:

```typescript
it('基準日のPVを正しく計算する', () => {
    // Arrange
    const taskNode = createTaskNode({ workload: 10, scheduledWorkDays: 5 })
    const baseDate = new Date('2025-01-08')

    // Act
    const pv = taskNode.calculatePV(baseDate)

    // Assert
    expect(pv).toBe(2) // 10 ÷ 5 = 1日あたり2
})
```

## ヘルパーとフィクスチャ

- **`createTaskNode(overrides)`**: テスト用 TaskNode を生成するヘルパー。各テストファイルで定義
- **`createPlotMap(startDate, endDate)`**: 指定期間の稼働日（土日除外）を plotMap として生成
- **`fixtures/`**: 統合テスト用の CSV/Excel ファイル。テスト内で生成してクリーンアップするパターンも可

## EVM テスト特有の注意点

- **plotMap のキーは Excel シリアル値**: `date2Sn(date)` で変換。Date オブジェクトを直接キーにしない
- **浮動小数点の比較**: EVM 計算結果は `toBeCloseTo()` を使う場面がある
- **基準日の選び方**: テストケースでは稼働日と非稼働日の両方を基準日に設定して検証する
- **統合テストのヘッダーコメント**: 要件 ID・受入基準（AC-ID）を冒頭に記載し、トレーサビリティを確保する

```typescript
/**
 * CsvProjectCreator 統合テスト
 *
 * 要件ID: REQ-CSV-001
 * 受け入れ基準: AC-04 - 生成されたProjectで既存のEVM計算が正しく動作する
 */
```

## カバレッジ

- カバレッジ除外: index ファイル、`.d.ts`、presentation 層
- レポーター: text（コンソール）、HTML、lcov（CI 用）
- 重要ドメイン（EVM 計算、差分計算）は高カバレッジを維持する

---
_パターンと意思決定に集中する。Jest の設定詳細は `jest.config.js` を参照。_
