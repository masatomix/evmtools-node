/**
 * VersionInfo テスト
 * @see docs/specs/domain/VersionInfo.spec.md
 * @see docs/specs/requirements/REQ-VERSION-001.md
 * @see docs/specs/requirements/REQ-VERSION-002.md
 */

import { getVersionInfo, VersionInfo } from '../VersionInfo';
import * as packageJson from '../../../package.json';

describe('VersionInfo', () => {
    describe('getVersionInfo()', () => {
        // TC-01: getVersionInfo()を呼び出す → VersionInfoオブジェクトが返る
        it('TC-01: VersionInfoオブジェクトを返す', () => {
            const info = getVersionInfo();

            expect(info).toBeDefined();
            expect(typeof info.version).toBe('string');
            expect(typeof info.name).toBe('string');
            expect(typeof info.description).toBe('string');
            expect(typeof info.author).toBe('string');
        });

        // TC-02: versionがpackage.jsonと一致する
        it('TC-02: versionがpackage.jsonと一致する', () => {
            const info = getVersionInfo();

            expect(info.version).toBe(packageJson.version);
        });

        // TC-03: nameがpackage.jsonと一致する
        it('TC-03: nameがpackage.jsonと一致する', () => {
            const info = getVersionInfo();

            expect(info.name).toBe(packageJson.name);
        });

        // TC-04: descriptionがpackage.jsonと一致する
        it('TC-04: descriptionがpackage.jsonと一致する', () => {
            const info = getVersionInfo();

            expect(info.description).toBe(packageJson.description);
        });

        // TC-05: 2回呼び出しても同じ結果が返る（キャッシュ）
        it('TC-05: 2回呼び出しても同じオブジェクトが返る（キャッシュ）', () => {
            const info1 = getVersionInfo();
            const info2 = getVersionInfo();

            expect(info1).toBe(info2); // 同一参照
        });

        // TC-06: authorがpackage.jsonと一致する
        it('TC-06: authorがpackage.jsonと一致する', () => {
            const info = getVersionInfo();

            expect(info.author).toBe(packageJson.author);
        });
    });
});
