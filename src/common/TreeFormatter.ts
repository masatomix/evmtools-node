/**
 * ツリー表示用のノード構造
 */
export interface TreeNode {
    name: string
    children: TreeNode[]
}

/**
 * ツリーフォーマットオプション
 */
export interface TreeFormatOptions {
    /** 出力する深さ（undefined = 全階層） */
    depth?: number
}

/**
 * ツリー構造をテキストまたはJSON形式にフォーマットするユーティリティ
 */
export class TreeFormatter {
    // 罫線文字
    private static readonly BRANCH = '├── '
    private static readonly LAST_BRANCH = '└── '
    private static readonly VERTICAL = '│   '
    private static readonly SPACE = '    '

    /**
     * TreeNode[] をテキスト形式のツリーに変換
     * @param nodes ルートノードの配列（複数可）
     * @param options フォーマットオプション
     */
    static toText(nodes: TreeNode[], options?: TreeFormatOptions): string {
        if (nodes.length === 0) {
            return ''
        }

        const results: string[] = []

        for (const node of nodes) {
            const lines = this.formatNode(node, '', true, 0, options?.depth)
            results.push(lines.join('\n'))
        }

        // 複数ルートの場合は空行で区切る
        return results.join('\n\n')
    }

    /**
     * ノードを再帰的にフォーマット
     */
    private static formatNode(
        node: TreeNode,
        prefix: string,
        isRoot: boolean,
        currentDepth: number,
        maxDepth?: number
    ): string[] {
        const lines: string[] = []

        // ルートノードはプレフィックスなし
        if (isRoot) {
            lines.push(node.name)
        }

        // depth 制限チェック
        if (maxDepth !== undefined && currentDepth >= maxDepth) {
            return lines
        }

        const children = node.children
        const lastIndex = children.length - 1

        for (let i = 0; i < children.length; i++) {
            const child = children[i]
            const isLast = i === lastIndex
            const branch = isLast ? this.LAST_BRANCH : this.BRANCH
            const childPrefix = isLast ? this.SPACE : this.VERTICAL

            lines.push(prefix + branch + child.name)

            // 子ノードを再帰処理
            const childLines = this.formatNode(
                child,
                prefix + childPrefix,
                false,
                currentDepth + 1,
                maxDepth
            )
            // 最初の行（ノード名）は既に追加済みなので除外
            lines.push(...childLines)
        }

        return lines
    }

    /**
     * TreeNode[] をJSON形式に変換
     * @param nodes ルートノードの配列（複数可）
     * @param options フォーマットオプション
     */
    static toJson(nodes: TreeNode[], options?: TreeFormatOptions): TreeNode[] {
        if (nodes.length === 0) {
            return []
        }

        if (options?.depth === undefined) {
            // depth 未指定の場合はそのまま返す
            return nodes
        }

        // depth 指定時は子を制限してコピー
        return nodes.map((node) => this.limitDepth(node, 0, options.depth!))
    }

    /**
     * 指定した深さまでの子のみを含むノードを作成
     */
    private static limitDepth(node: TreeNode, currentDepth: number, maxDepth: number): TreeNode {
        if (currentDepth >= maxDepth) {
            return { name: node.name, children: [] }
        }

        return {
            name: node.name,
            children: node.children.map((child) => this.limitDepth(child, currentDepth + 1, maxDepth)),
        }
    }
}
