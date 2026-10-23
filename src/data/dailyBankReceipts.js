// Count receipt ledger entries once; older invoices may have no linked payment entry.
export function dailyBankReceipts(database, date, names) {
  const normalize = value => { const name = String(value || '').trim().toLowerCase(); return ['abl', 'allied', 'allied bank'].includes(name) ? 'allied bank' : name }
  const amounts = new Map(names.map(name => [normalize(name), 0]))
  let unassigned = 0
  const add = (name, amount) => {
    const key = normalize(name)
    if (amounts.has(key)) amounts.set(key, amounts.get(key) + Number(amount || 0))
    else unassigned += Number(amount || 0)
  }
  const payments = (database.payments || []).filter(entry => entry.method === 'bank' && entry.type === 'customer-payment')
  const sales = new Map((database.sales || []).map(sale => [sale.id, sale]))
  for (const payment of payments) {
    if (String(payment.date || '').slice(0, 10) !== date) continue
    const account = (database.bankAccounts || []).find(account => account.id === payment.accountId)
    add(payment.bankDetails?.bankName || payment.bankName || account?.name || sales.get(payment.referenceId)?.bankDetails?.bankName, payment.amount)
  }
  for (const sale of sales.values()) {
    if (String(sale.date || '').slice(0, 10) !== date || payments.some(payment => payment.referenceId === sale.id)) continue
    add(sale.bankDetails?.bankName, sale.payments?.bank ?? sale.payments?.bankTransfer ?? 0)
  }
  return { accounts: names.map(name => ({ name, amount: amounts.get(normalize(name)) })), unassigned, total: [...amounts.values()].reduce((sum, amount) => sum + amount, 0) + unassigned }
}
