// ─────────────────────────────────────────────────────────────
// diff.ts — line-level diff (LCS) for the CV/cover-letter compare
// view. Returns aligned rows so two documents can be rendered
// side-by-side with added/removed highlighting, plus summary stats.
// ─────────────────────────────────────────────────────────────

export type DiffRowType = 'same' | 'added' | 'removed'

export interface DiffRow {
  left: string | null // null = line only exists on the right
  right: string | null // null = line only exists on the left
  type: DiffRowType
}

const MAX_LINES = 1200 // CVs are small; guard the O(n·m) table anyway

export function diffLines(base: string, target: string): DiffRow[] {
  const A = base.replace(/\r/g, '').split('\n').slice(0, MAX_LINES)
  const B = target.replace(/\r/g, '').split('\n').slice(0, MAX_LINES)
  const n = A.length
  const m = B.length

  // Longest-common-subsequence table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      rows.push({ left: A[i], right: B[j], type: 'same' })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ left: A[i], right: null, type: 'removed' })
      i++
    } else {
      rows.push({ left: null, right: B[j], type: 'added' })
      j++
    }
  }
  while (i < n) rows.push({ left: A[i++], right: null, type: 'removed' })
  while (j < m) rows.push({ left: null, right: B[j++], type: 'added' })
  return rows
}

export interface DiffStats {
  added: number
  removed: number
  same: number
  changedPct: number
}

export function diffStats(rows: DiffRow[]): DiffStats {
  const added = rows.filter((r) => r.type === 'added').length
  const removed = rows.filter((r) => r.type === 'removed').length
  const same = rows.length - added - removed
  const changedPct = rows.length ? Math.round(((added + removed) / rows.length) * 100) : 0
  return { added, removed, same, changedPct }
}
