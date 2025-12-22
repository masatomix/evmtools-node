/**
 * VersionInfo - バージョン情報ユーティリティ
 * @see docs/specs/domain/VersionInfo.spec.md
 * @see docs/specs/requirements/REQ-VERSION-001.md
 * @see docs/specs/requirements/REQ-VERSION-002.md
 */

import * as packageJson from '../../package.json';

/**
 * バージョン情報を表すインターフェース
 */
export interface VersionInfo {
    /** パッケージのバージョン番号 */
    version: string;
    /** パッケージ名 */
    name: string;
    /** パッケージの説明文 */
    description: string;
    /** パッケージの作者名 */
    author: string;
}

/** キャッシュされたバージョン情報 */
let cachedVersionInfo: VersionInfo | null = null;

/**
 * バージョン情報を取得する
 * @returns VersionInfo オブジェクト
 */
export function getVersionInfo(): VersionInfo {
    if (cachedVersionInfo !== null) {
        return cachedVersionInfo;
    }

    // authorがオブジェクト形式の場合はnameプロパティを使用
    const author = typeof packageJson.author === 'object' && packageJson.author !== null
        ? (packageJson.author as { name?: string }).name || ''
        : packageJson.author || '';

    cachedVersionInfo = {
        version: packageJson.version || '',
        name: packageJson.name || '',
        description: packageJson.description || '',
        author,
    };

    return cachedVersionInfo;
}
