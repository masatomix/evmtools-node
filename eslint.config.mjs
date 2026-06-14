import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    // 本体ソース(src)以外は lint 対象外。docs/examples・samples は実行例の
    // スクリプトで tsconfig.json にも含まれない。
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'docs/**', 'samples/**', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    // 型対応 lint は tsconfig.json の対象（src 配下の本体 .ts）に限定する。
    // テスト/spec は tsconfig.json から exclude されているため project に含めない。
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
    rules: {
      // 型情報必須の strict 系は段階導入（Phase 1 では CI を通すため warn、
      // 型定義クリーンアップ（Phase 3A）で error へ引き上げる）。型情報がある
      // src の本体 .ts にのみ適用する。
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/require-await': 'warn',
    },
  },
  {
    // JS 設定ファイルは CommonJS / Node 実行。型情報必須ルールを無効化し node globals を与える。
    files: ['**/*.{js,cjs,mjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // テスト/spec は tsconfig.json 対象外のため型情報必須ルールを無効化する。
    files: ['**/*.test.ts', '**/*.spec.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // 構文ベースの cleanup 系（型情報不要）は全ファイルで warn にし、CI を通しつつ
    // 可視化する（dead code 除去・any 解消は Phase 3A）。
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  prettier,
]
