/**
 * VersionInfo - バージョン情報ユーティリティ
 * @see docs/specs/domain/VersionInfo.spec.md
 * @see docs/specs/requirements/REQ-VERSION-001.md
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

    cachedVersionInfo = {
        version: packageJson.version || '',
        name: packageJson.name || '',
        description: packageJson.description || '',
    };

    return cachedVersionInfo;
}
