import { localDateString } from './businessLogic.js'

export const DEFAULT_BRANCH_ID = 'default'
export const normalizeBranchId = (value) => String(value || DEFAULT_BRANCH_ID)

export function getSaleDayStatus(database, { date = localDateString(), branchId = DEFAULT_BRANCH_ID } = {}) {
  const normalizedBranchId = normalizeBranchId(branchId)
  const matchesBranch = (entry) => normalizeBranchId(entry?.branchId) === normalizedBranchId
  const records = database?.dailyClosings || []
  const openingCompleted = records.some((entry) => entry.date === date && entry.type === 'opening' && matchesBranch(entry))
  const closingCompleted = records.some((entry) => entry.date === date && entry.type === 'closing' && matchesBranch(entry))
  const reason = !openingCompleted
    ? "Daily Opening is required before creating a new sale. Please complete today's opening first."
    : closingCompleted
      ? 'Daily Closing has already been completed for this business date. New sales are not allowed.'
      : ''
  return { date, branchId: normalizedBranchId, openingCompleted, closingCompleted, canCreateSale: !reason, reason }
}
