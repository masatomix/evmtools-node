/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        'cli-shebang\\.test\\.ts$', // リリース検証用（リグレッションテスト対象外）
    ],
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
        '!src/presentation/**', // CLIは除外
    ],
    coverageDirectory: 'coverage',
    coverageReporters: [
        'text',           // コンソール出力
        'text-summary',   // サマリー出力
        'html',           // HTMLレポート
        'lcov',           // CI/CD用（Codecovなど）
    ],
    verbose: true,
}
