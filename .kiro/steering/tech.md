# 技術スタック

## アーキテクチャ

クリーンアーキテクチャに基づくレイヤー分離。ドメイン層が一切の外部依存を持たず、インフラ層がドメインインターフェースを実装する依存性逆転の原則を適用している。各レイヤーを package.json の exports で独立したエントリーポイントとして公開し、ライブラリ利用者が必要なレイヤーだけを import できる設計。

```
presentation → usecase → domain ← infrastructure
                ↑          ↓
                └── common ─┘
```

## コア技術

- **言語**: TypeScript 5.8（strict モード、ES2020 ターゲット、CommonJS 出力）
- **ランタイム**: Node.js（@types/node ^22）
- **型出力**: declaration + declarationMap で .d.ts とソースマップを公開

## 主要ライブラリ

| ライブラリ | 用途 | 開発パターンへの影響 |
|-----------|------|---------------------|
| **excel-csv-read-write** | Excel/CSV 入出力 | データ入力の中核。DTO → Entity 変換パターンの起点 |
| **yargs** | CLI 引数パース | presentation 層の CLI コマンド構造を規定 |
| **handlebars** | テンプレートエンジン | Excel 出力時のレポート書式を .hbs ファイルで管理 |
| **pino** + **pino-pretty** | 構造化ロギング | JSON ログ出力。config モジュールでレベル制御 |
| **config** | 環境設定 | `config/default.json` でログレベル等を外部化 |
| **@tidyjs/tidy** | データ変換 | 関数型のデータ操作パイプライン |
| **iconv-lite** | 文字コード変換 | Shift-JIS 対応（日本語 Excel/CSV） |

## 開発標準

### 型安全性
- TypeScript strict モード + isolatedModules 有効
- ESLint の TypeScript strict ルールセット適用
- `any` は原則禁止

### コード品質
- **ESLint** 9.x（flat config 形式: `eslint.config.mjs`）
- **Prettier** 3.5: セミコロンなし、シングルクォート、行幅 100、インデント 4 スペース、末尾カンマ ES5

### テスト
- **Jest** 30 + **ts-jest**: `__tests__/` ディレクトリに co-locate
- `pretest` で typecheck を自動実行
- カバレッジ: text + HTML + lcov 出力。index ファイルと CLI は除外
- 統合テストは `*.integration.test.ts` で区別

## 開発環境

### よく使うコマンド
```bash
npm run build          # clean → tsc → .hbs コピー
npm test               # typecheck + Jest 実行
npm run test:coverage  # カバレッジ付きテスト
npm run lint           # ESLint チェック
npm run lint:fix       # ESLint 自動修正
npm run format         # Prettier チェック
npm run format:fix     # Prettier 自動修正
```

## 主要な技術判断

1. **クリーンアーキテクチャ + レイヤー別 exports**: ライブラリとして各層を独立消費可能にする設計。CLI 利用者はフルスタック、SDK 利用者はドメイン層のみ import できる
2. **CommonJS 出力**: ライブラリ利用者の互換性を優先。declaration map で IDE 体験を補完
3. **Handlebars テンプレート**: レポート書式をコード外で管理し、非開発者でもカスタマイズ可能に
4. **Pino + config**: ライブラリとして組み込まれる前提で、構造化ログと外部設定を標準装備
5. **Shift-JIS 対応（iconv-lite）**: 日本企業の Excel 環境で不可避なエンコーディング問題への対応

---
_すべての依存ではなく、標準とパターンを文書化する_
