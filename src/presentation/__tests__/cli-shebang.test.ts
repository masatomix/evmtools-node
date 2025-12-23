/**
 * CLI shebang検証テスト
 *
 * 分離環境でCLIコマンドの動作を検証する。
 * リリース検証用のワンショットテストであり、リグレッションテストには含めない。
 *
 * @see docs/specs/domain/features/CLI.shebang.spec.md
 * @see docs/specs/requirements/REQ-CLI-001.md
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('CLI shebang検証', () => {
    const projectRoot = path.resolve(__dirname, '../../..')
    const distDir = path.join(projectRoot, 'dist/presentation')

    const cliFiles = [
        'cli-pbevm-show-project.js',
        'cli-pbevm-diff.js',
        'cli-pbevm-show-pv.js',
    ]

    describe('TC-01: distファイルのshebang確認', () => {
        it.each(cliFiles)('%s にshebangが含まれる', (filename) => {
            const filePath = path.join(distDir, filename)

            // ファイル存在確認
            expect(fs.existsSync(filePath)).toBe(true)

            // 先頭行がshebangであることを確認
            const content = fs.readFileSync(filePath, 'utf-8')
            const firstLine = content.split('\n')[0]
            expect(firstLine).toBe('#!/usr/bin/env node')
        })
    })

    describe('分離環境でのCLI動作確認', () => {
        let tempDir: string
        let tarballPath: string

        beforeAll(() => {
            // 一時ディレクトリ作成
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-shebang-test-'))

            // npm pack でtarball作成
            const packOutput = execSync('npm pack --pack-destination ' + tempDir, {
                cwd: projectRoot,
                encoding: 'utf-8',
            }).trim()

            tarballPath = path.join(tempDir, packOutput)

            // package.json作成
            const packageJson = { name: 'cli-test', version: '1.0.0' }
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            )

            // tarballインストール
            execSync(`npm install ${tarballPath}`, {
                cwd: tempDir,
                encoding: 'utf-8',
                stdio: 'pipe',
            })
        }, 60000) // 60秒タイムアウト

        afterAll(() => {
            // 一時ディレクトリ削除
            if (tempDir && fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true })
            }
        })

        it('TC-02: pbevm-show-project --help が動作する', () => {
            const result = execSync('npx pbevm-show-project --help', {
                cwd: tempDir,
                encoding: 'utf-8',
            })

            expect(result).toContain('Usage')
            expect(result).toContain('pbevm-show-project')
        })

        it('TC-03: pbevm-diff --help が動作する', () => {
            const result = execSync('npx pbevm-diff --help', {
                cwd: tempDir,
                encoding: 'utf-8',
            })

            expect(result).toContain('Usage')
            expect(result).toContain('pbevm-diff')
        })

        it('TC-04: pbevm-show-pv --help が動作する', () => {
            const result = execSync('npx pbevm-show-pv --help', {
                cwd: tempDir,
                encoding: 'utf-8',
            })

            expect(result).toContain('Usage')
            expect(result).toContain('pbevm-show-pv')
        })
    })
})
