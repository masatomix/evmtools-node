/**
 * EV 算定方式（EV 測定技法）の純関数モジュール。
 *
 * spec: phase5-evmethod-knowledge-0.0.34 要件1, 要件2, 要件3
 *
 * - `'progressRate'`: 現行の出来高按分。Excel 由来の `TaskRow.ev` をそのまま用いる（既定）
 * - `'0/100'`: 完了タスクのみ工数（workload）を計上する、最も保守的な客観方式
 * - `'50/50'`: 着手（actualStartDate あり）で工数の半分、完了で全部を計上する客観方式
 *
 * 完了判定は phase0-bugfix-0.0.29 の許容誤差付き `TaskRow.finished`
 * （`progressRate >= 1.0 − PROGRESS_RATE_EPSILON`）に委譲する（要件2.3）。
 * 本モジュールは `TaskRow.ev` を書き換えず、EV の導出のみを行う（要件1.5）。
 */
import type { TaskRow } from './TaskRow'
import { sum } from '../common/calcUtils'

/** EV 算定方式。既定は 'progressRate'（現行の出来高按分） */
export type EvMethod = 'progressRate' | '0/100' | '50/50'

/**
 * 方式に応じて 1 タスクの EV を導出する純関数。
 * TaskRow の値（ev / workload / actualStartDate / finished）のみを参照し、副作用を持たない。
 *
 * - `'progressRate'`: Excel 由来の `ev` をそのまま返す（再計算しない。要件1.1, 1.5）。
 *   `ev` 未設定は undefined（既存 sumEVs の undefined 除外挙動に整合）
 * - `'0/100'`: 完了なら `workload ?? 0`、未完了は仕掛・未着手を区別せず 0（要件2.1, 2.2, 2.4）
 * - `'50/50'`: 完了なら `workload ?? 0`、未完了かつ着手済みなら `(workload ?? 0) × 0.5`、
 *   未着手なら 0（要件3.1〜3.4）
 *
 * @param task 対象タスク（リーフタスクを想定）
 * @param method EV 算定方式
 * @returns 導出した EV。'progressRate' で ev 未設定の場合のみ undefined
 */
export const resolveTaskEv = (task: TaskRow, method: EvMethod): number | undefined => {
    switch (method) {
        case 'progressRate':
            return task.ev
        case '0/100':
            return task.finished ? (task.workload ?? 0) : 0
        case '50/50':
            if (task.finished) return task.workload ?? 0
            return task.actualStartDate !== undefined ? (task.workload ?? 0) * 0.5 : 0
    }
}

/**
 * 方式別の EV 合計（小数第3位丸め）。
 *
 * 既定（未指定 or 'progressRate'）は各タスクの `ev` をそのまま合計するため、
 * 既存の sumEVs（`sum(tasks.map((d) => d.ev), 3)`）と同値になる（要件1.1。
 * 有効値ゼロ件で undefined を返す挙動も既存どおり維持する）。
 *
 * @param tasks リーフタスクの配列
 * @param method EV 算定方式（既定 'progressRate'）
 * @returns EV 合計。有効値がゼロ件（空配列、または全タスクの導出 EV が undefined）の場合は undefined
 */
export const sumEvsBy = (tasks: TaskRow[], method: EvMethod = 'progressRate'): number | undefined =>
    sum(
        tasks.map((task) => resolveTaskEv(task, method)),
        3
    )
