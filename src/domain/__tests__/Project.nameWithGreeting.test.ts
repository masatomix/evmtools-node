import { Project } from '../Project'

/**
 * Project.getNameWithGreeting() のテスト
 *
 * 要件ID: REQ-HELLO-001
 * 仕様書: docs/specs/domain/features/Project.nameWithGreeting.spec.md
 */
describe('Project.getNameWithGreeting', () => {
    const baseDate = new Date('2026-04-20')

    describe('TC-01: 通常の英字プロジェクト名', () => {
        it('"SamplePJ Hello World." を返す', () => {
            const project = new Project([], baseDate, [], undefined, undefined, 'SamplePJ')
            expect(project.getNameWithGreeting()).toBe('SamplePJ Hello World.')
        })
    })

    describe('TC-02: 空文字のプロジェクト名', () => {
        it('" Hello World." を返す', () => {
            const project = new Project([], baseDate, [], undefined, undefined, '')
            expect(project.getNameWithGreeting()).toBe(' Hello World.')
        })
    })

    describe('TC-03: 日本語を含むプロジェクト名', () => {
        it('"日本語PJ Hello World." を返す', () => {
            const project = new Project([], baseDate, [], undefined, undefined, '日本語PJ')
            expect(project.getNameWithGreeting()).toBe('日本語PJ Hello World.')
        })
    })

    describe('TC-04: 副作用がないこと', () => {
        it('呼び出し後も project.name が変更されない', () => {
            const project = new Project([], baseDate, [], undefined, undefined, 'サンプルPJ')
            const nameBefore = project.name
            project.getNameWithGreeting()
            const nameAfter = project.name
            expect(nameAfter).toBe(nameBefore)
            expect(nameAfter).toBe('サンプルPJ')
        })
    })
})
