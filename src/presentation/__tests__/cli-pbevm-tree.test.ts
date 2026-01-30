import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

describe('cli-pbevm-tree', () => {
    const cliPath = path.join(__dirname, '../cli-pbevm-tree.ts')

    // TC-07: --help オプション
    describe('TC-07: --help option', () => {
        it('--help で Usage 文字列を表示し、終了コード 0 で終了する', () => {
            const result = execSync(`npx ts-node ${cliPath} --help`, {
                encoding: 'utf-8',
            })

            expect(result).toContain('Usage:')
            expect(result).toContain('pbevm-tree')
            expect(result).toContain('--path')
            expect(result).toContain('--depth')
            expect(result).toContain('--json')
        })
    })

    // TC-08, TC-09: ファイル指定と組み合わせオプションのテスト
    // 実際の Excel ファイルが必要なため、テストデータがある場合のみ実行
    describe('with test data', () => {
        const testDataPath = path.join(__dirname, '../../infrastructure/__tests__/testdata')
        const testFile = path.join(testDataPath, 'test-project.xlsm')

        // テストデータの存在確認
        const hasTestData = fs.existsSync(testFile)

        // テストデータがない場合はスキップ
        const testOrSkip = hasTestData ? it : it.skip

        testOrSkip('TC-08: --path でファイルを指定して実行できる', () => {
            const result = execSync(`npx ts-node ${cliPath} --path "${testFile}"`, {
                encoding: 'utf-8',
            })

            // ツリー形式の出力があることを確認
            expect(result.length).toBeGreaterThan(0)
        })

        testOrSkip('TC-09: --depth と --json の組み合わせが動作する', () => {
            const result = execSync(`npx ts-node ${cliPath} --path "${testFile}" --depth 1 --json`, {
                encoding: 'utf-8',
            })

            // JSON として解析できることを確認
            const parsed = JSON.parse(result)
            expect(Array.isArray(parsed)).toBe(true)
        })
    })
})
