export const initialSaleQuantity = '1'
export const saleQuantity = (value) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}
export const moveSuggestion = (active, direction, count) => count > 0 ? (active < 0 ? (direction > 0 ? 0 : count - 1) : Math.max(0, Math.min(count - 1, active + direction))) : -1
