// Workspace sales and cheque records are stored separately. Rejoin them when
// reopening a receipt, including legacy sales without embedded cheque details.
export function receiptBill(bill, cheques = []) {
  const linked = cheques.filter((entry) => entry.referenceId === bill.id)
  const rows = new Map()
  for (const entry of [...(bill.cheques || []), ...linked]) {
    rows.set(entry.id || entry.number, entry)
  }
  return { ...bill, cheques: [...rows.values()].filter((entry) => entry.status !== 'Cancelled') }
}
