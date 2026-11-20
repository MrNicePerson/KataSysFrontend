export function formatDmyDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${Number(match[3])}/${Number(match[2])}/${match[1]}` : String(value || '')
}

export function parseDmyDate(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return ''
  const [, dayText, monthText, yearText] = match
  const day = Number(dayText), month = Number(monthText), year = Number(yearText)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''
  return `${yearText}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
