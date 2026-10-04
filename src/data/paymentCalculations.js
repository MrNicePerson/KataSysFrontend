export const toPaymentNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

export function calculatePaymentSummary(totalBill, payment = {}) {
  const cash = toPaymentNumber(payment.cash)
  const bank = toPaymentNumber(payment.bankTransfer ?? payment.bank)
  const cheque = toPaymentNumber(payment.cheque)
  const totalReceived = cash + bank + cheque
  const cashAndBankReceived = cash + bank
  const pendingCheque = cheque
  const uncoveredBalance = Math.max(0, totalBill - cashAndBankReceived - pendingCheque)
  const excessPayment = Math.max(0, totalReceived - totalBill)
  return { cash, bank, cheque, totalReceived, cashAndBankReceived, pendingCheque, uncoveredBalance, excessPayment }
}
