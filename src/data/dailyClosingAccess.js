export function canOpenDailyClosing(openingRecord) {
  return Boolean(openingRecord)
}

export function resolveDailyClosingTab(tab, openingRecord) {
  return tab === 'closing' && !canOpenDailyClosing(openingRecord) ? 'opening' : tab
}

export function canEditDailyOpening(user) {
  return user?.role === 'admin' || user?.permissions?.admin === true
}
