/**
 * Projectに定義された祝日情報を保持するオブジェクト
 */
export class HolidayData {
    constructor(
        private readonly _date: Date,
        private readonly _desc?: string,
        private readonly _rule?: string,
        private readonly _hurikae?: string
    ) {}

    get date() {
        return this._date
    }
}
