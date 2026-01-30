import { TreeFormatter, TreeNode } from '../TreeFormatter'

describe('TreeFormatter', () => {
    // テスト用のツリー構造
    const singleRoot: TreeNode[] = [
        {
            name: 'プロジェクトA',
            children: [
                {
                    name: 'サブプロジェクト1',
                    children: [
                        { name: 'タスク1-1', children: [] },
                        { name: 'タスク1-2', children: [] },
                    ],
                },
                {
                    name: 'サブプロジェクト2',
                    children: [],
                },
            ],
        },
    ]

    const multipleRoots: TreeNode[] = [
        {
            name: 'プロジェクトA',
            children: [
                { name: 'サブプロジェクト1', children: [] },
                { name: 'サブプロジェクト2', children: [] },
            ],
        },
        {
            name: 'プロジェクトB',
            children: [
                { name: 'タスク2-1', children: [] },
                { name: 'タスク2-2', children: [] },
            ],
        },
    ]

    describe('toText', () => {
        // TC-01: 単一ルート・テキスト形式
        it('TC-01: 単一ルートのツリーを正しい罫線で表示する', () => {
            const result = TreeFormatter.toText(singleRoot)

            expect(result).toContain('プロジェクトA')
            expect(result).toContain('├── サブプロジェクト1')
            expect(result).toContain('│   ├── タスク1-1')
            expect(result).toContain('│   └── タスク1-2')
            expect(result).toContain('└── サブプロジェクト2')
        })

        // TC-02: 複数ルート・テキスト形式
        it('TC-02: 複数ルートを空行で区切って表示する', () => {
            const result = TreeFormatter.toText(multipleRoots)

            // 各ルートが含まれる
            expect(result).toContain('プロジェクトA')
            expect(result).toContain('プロジェクトB')

            // 空行で区切られている
            expect(result).toContain('\n\n')
        })

        // TC-03: depth=1 指定
        it('TC-03: depth=1 で直下の子のみ表示する', () => {
            const result = TreeFormatter.toText(singleRoot, { depth: 1 })

            expect(result).toContain('プロジェクトA')
            expect(result).toContain('├── サブプロジェクト1')
            expect(result).toContain('└── サブプロジェクト2')
            // 孫は表示されない
            expect(result).not.toContain('タスク1-1')
            expect(result).not.toContain('タスク1-2')
        })

        // TC-04: depth=0 指定
        it('TC-04: depth=0 でルートのみ表示する', () => {
            const result = TreeFormatter.toText(singleRoot, { depth: 0 })

            expect(result).toContain('プロジェクトA')
            // 子は表示されない
            expect(result).not.toContain('サブプロジェクト1')
            expect(result).not.toContain('サブプロジェクト2')
        })

        // TC-06: 空配列
        it('TC-06: 空配列の場合は空文字列を返す', () => {
            const result = TreeFormatter.toText([])
            expect(result).toBe('')
        })
    })

    describe('toJson', () => {
        // TC-05: JSON形式出力
        it('TC-05: TreeNode[] をそのまま返す（depth 未指定）', () => {
            const result = TreeFormatter.toJson(singleRoot)

            expect(result).toEqual(singleRoot)
        })

        it('TC-05: depth 指定時は子を制限する', () => {
            const result = TreeFormatter.toJson(singleRoot, { depth: 1 })

            expect(result[0].name).toBe('プロジェクトA')
            expect(result[0].children.length).toBe(2)
            // 孫は空配列
            expect(result[0].children[0].children).toEqual([])
            expect(result[0].children[1].children).toEqual([])
        })

        // TC-06: 空配列
        it('TC-06: 空配列の場合は空配列を返す', () => {
            const result = TreeFormatter.toJson([])
            expect(result).toEqual([])
        })
    })
})
