import { useEffect } from 'react'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'
import abbasTextileLogo from '../../assets/abbas-textile-logo.jpeg'

export default function BillReceipt({ bill, onClose, modal = false }) {
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: modal })
  useEffect(() => { keyboard.ref.current?.querySelector('[aria-label="Close receipt"]')?.focus() }, [])
  useEffect(() => {
    if (!bill) return undefined
    const handleAfterPrint = () => onClose?.()
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [bill, onClose])
  if (!bill) return null

  const customer = bill.customerDetails ?? {
    name: bill.customer || 'Walk-in customer',
    phone: bill.customerPhone,
    address: bill.customerAddress,
    city: bill.customerCity,
  }

  const num = (value) => Number(value || 0)
  const plainMoney = (value) => num(value).toLocaleString()
  const subtotal = bill.subtotal ?? bill.items?.reduce((sum, item) => sum + num(item.quantity) * num(item.price), 0) ?? bill.total ?? 0
  const discount = num(bill.discount)
  const total = num(bill.total ?? (subtotal - discount))
  const cash = num(bill.payments?.cash ?? bill.paid)
  const bank = num(bill.payments?.bank)
  const cheque = num(bill.payments?.cheque)
  const paid = cash + bank + cheque
  const due = num(bill.due ?? Math.max(0, total - paid))
  const previousBalance = num(bill.previousBalance ?? bill.customerPreviousBalance ?? bill.openingBalance)
  const remaining = num(bill.totalRemaining ?? bill.remainingBalance ?? (previousBalance + due))
  const totalQty = (bill.items || []).reduce((sum, item) => sum + Math.abs(num(item.quantity)), 0)
  const rows = bill.items?.length ? bill.items : [{ name: `${bill.customer || 'Customer'} purchase`, quantity: 1, price: total }]
  const emptyRows = 3
  const invoiceNo = bill.padInvoiceNumber || bill.paidInvoiceNumber || bill.number || '—'
  const shopName = 'Abbas Textile'
  const address = bill.receiptAddress || 'New Road, Shangai Market, Sohrab Khan Chowk, Mingora, Swat'
  const phones = bill.receiptPhones || 'Riaz 0300-5745719 · Arsalan 0348-1958108 · Anees 0345-6553785'

  return (
    <main ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} id="invoice-receipt" className="invoice-shell">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
          @bottom-center {
            content: "Page " counter(page);
            font: 10pt Roboto,Arial,sans-serif;
            color: #111;
            vertical-align: top;
            line-height: 1;
          }
        }
        .invoice-shell { width:100%; max-width:820px; margin:0 auto; background:#fff; color:#111; font-family:Roboto,Arial,sans-serif; box-sizing:border-box; }
        .receipt-controls { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #ddd; }
        .receipt-controls h1 { margin:0; font-size:18px; }
        .close-btn { border:0; background:transparent; font-size:22px; cursor:pointer; }
        .invoice-page { width:100%; padding:28px 30px 24px; box-sizing:border-box; background:#fff; }
        .inv-top { display:grid; grid-template-columns:1fr auto; align-items:center; gap:16px; min-height:54px; }
        .brand { display:flex; align-items:center; gap:10px; min-width:0; }
        .logo-image { width:48px; height:48px; border-radius:50%; object-fit:contain; display:block; flex:0 0 auto; }
        .brand-name { font-family:inherit; font-weight:700; font-size:22px; white-space:nowrap; }
        .since { font-family:inherit; font-size:9px; font-weight:500; margin-left:5px; }
        .invoice-number { font-weight:700; font-size:15px; white-space:nowrap; }
        .company-rule { border-top:2px solid #111; margin-top:7px; }
        .company-contact { text-align:center; padding:7px 4px 6px; border-bottom:1px solid #555; font-size:10px; font-weight:500; line-height:1.55; }
        .customer-block { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #777; min-height:72px; margin-bottom:8px; }
        .customer-left, .customer-right { padding:7px 8px; font-size:12px; line-height:1.65; }
        .customer-left { border-right:1px solid #777; }
        .customer-block strong { font-weight:700; }
        .items-wrap { position:relative; break-inside:auto; page-break-inside:auto; }
        .watermark { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:210px; height:210px; pointer-events:none; }
        .watermark-image { width:100%; height:100%; display:block; object-fit:contain; opacity:.07; }
        .invoice-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px; position:relative; z-index:1; break-inside:auto; page-break-inside:auto; }
        .invoice-table th,.invoice-table td { border:1px solid #666; height:25px; padding:3px 6px; box-sizing:border-box; }
        .invoice-table th { font-size:10px; font-weight:700; text-align:left; border-top:2px solid #111; }
        .invoice-table .sr { width:7%; text-align:center; }
        .invoice-table .item { width:57%; }
        .invoice-table .qty { width:10%; text-align:right; }
        .invoice-table .rate { width:12%; text-align:right; }
        .invoice-table .amount { width:14%; text-align:right; }
        .invoice-table .subtotal-row td { height:30px; font-weight:700; border-bottom:2px solid #111; }
        .summary { display:grid; grid-template-columns:1fr 1.05fr; gap:12px; margin-top:10px; font-size:12px; }
        .summary-row { display:flex; justify-content:space-between; align-items:center; min-height:29px; border-bottom:1px solid #aaa; gap:12px; font-weight:500; }
        .summary-row strong { font-weight:700; white-space:nowrap; }
        .remaining { margin-top:5px; border:1.5px solid #555; min-height:42px; padding:0 9px; display:flex; align-items:center; justify-content:space-between; font-size:14px; font-weight:700; }
        .invoice-footer { margin-top:68px; border-top:2px solid #111; padding-top:24px; display:flex; justify-content:space-between; align-items:flex-end; font-size:11px; }
        .signature { display:flex; align-items:flex-end; gap:10px; font-weight:700; font-size:13px; }
        .signature-line { width:170px; border-bottom:1.5px solid #111; height:18px; }
        .thanks { font-size:9px; }
        .action-bar { display:flex; justify-content:flex-end; gap:10px; padding:14px 18px; border-top:1px solid #ddd; }
        .action-bar button { padding:8px 14px; border-radius:8px; border:1px solid #ccc; background:#fff; cursor:pointer; font-weight:600; }
        .action-bar .print-btn { background:#155b4b; color:#fff; border-color:#155b4b; }
        @media (max-width:700px) { .invoice-page{padding:18px 14px}.brand-name{font-size:18px}.invoice-number{font-size:12px}.customer-left,.customer-right{font-size:11px}.invoice-table{font-size:10px} }
        @media print {
          body * { visibility:hidden !important; }
          #invoice-receipt, #invoice-receipt * { visibility:visible !important; }
          #invoice-receipt { position:absolute; left:0; top:0; width:100%; max-width:none; margin:0; }
          .receipt-controls,.action-bar { display:none !important; }
          .invoice-page { padding:0; width:100%; }
          .invoice-page { orphans:3; widows:3; }
          .brand-name { font-size:34px; }
          .since { font-size:15px; }
          .invoice-number { font-size:25px; }
          .company-contact { font-size:17px; line-height:1.2; }
          .customer-left, .customer-right { font-size:21px; line-height:24px; }
          .invoice-table { font-size:18px; }
          .invoice-table th { font-size:17px; }
          .summary { font-size:21px; }
          .remaining { font-size:24px; }
          .invoice-footer { font-size:17px; }
          .signature { font-size:22px; }
          .thanks { font-size:16px; }
          .inv-top { min-height:44px; }
          .company-rule { margin-top:4px; }
          .company-contact { padding:4px 4px 3px; line-height:1.35; }
          .customer-block { min-height:58px; margin-bottom:4px; }
          .customer-left, .customer-right { padding:5px 8px; line-height:1.45; }
          .invoice-table th, .invoice-table td { height:22px; padding:2px 5px; }
          .invoice-table thead { display:table-header-group; }
          .invoice-table tbody { display:table-row-group; }
          .invoice-table tr { break-inside:avoid; page-break-inside:avoid; }
          .invoice-table .subtotal-row { break-inside:avoid; page-break-inside:avoid; }
          .summary { break-inside:avoid; page-break-inside:avoid; }
          .invoice-table .subtotal-row td { height:26px; }
          .summary { margin-top:6px; }
          .summary-row { min-height:25px; }
          .remaining { min-height:36px; margin-top:3px; }
          .invoice-footer { break-inside:avoid; page-break-inside:avoid; margin-top:18mm; padding-top:16px; }
          .signature-line { height:14px; }
        }
      `}</style>

      <div className="receipt-controls">
        <h1>Bill receipt</h1>
        <button className="close-btn" type="button" aria-label="Close receipt" onClick={onClose}>×</button>
      </div>

      <article className="invoice-page">
        <header>
          <div className="inv-top">
            <div className="brand">
              <img className="logo-image" src={abbasTextileLogo} alt="Abbas Textile logo" />
              <div className="brand-name">{shopName}<span className="since">SINCE 2001</span></div>
            </div>
            <div className="invoice-number">INVOICE No. {invoiceNo}</div>
          </div>
          <div className="company-rule" />
          <div className="company-contact">
            <div>{address}</div>
            <div>{phones}</div>
          </div>
        </header>

        <section className="customer-block">
          <div className="customer-left">
            <div>C.Name: <strong>{customer.name || bill.customer || '—'}</strong></div>
            <div>Contact: {customer.phone || '—'}</div>
            <div>Address: {[customer.address, customer.city].filter(Boolean).join(', ') || '—'}</div>
          </div>
          <div className="customer-right">Date: {bill.date || '—'}</div>
        </section>

        <div className="items-wrap">
          <div className="watermark" aria-hidden="true"><img className="watermark-image" src={abbasTextileLogo} alt="" /></div>
          <table className="invoice-table">
            <thead>
              <tr><th className="sr">SR</th><th className="item">ITEM NAME</th><th className="qty">QTY</th><th className="rate">RATE</th><th className="amount">AMOUNT</th></tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="sr">{index + 1}</td>
                  <td className="item">{item.name}{(item.shade || item.colour || item.color || item.variant || item.description) ? ` ${item.shade || item.colour || item.color || item.variant || item.description}` : ''}</td>
                  <td className="qty">{Math.abs(num(item.quantity))}</td>
                  <td className="rate">{plainMoney(Math.abs(item.price ?? item.unitPrice))}</td>
                  <td className="amount">{plainMoney(num(item.quantity) * num(item.price ?? item.unitPrice))}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, index) => <tr key={`empty-${index}`}><td className="sr">&nbsp;</td><td/><td/><td/><td/></tr>)}
              <tr className="subtotal-row"><td></td><td>SUB TOTAL</td><td className="qty">{totalQty}</td><td></td><td className="amount">{plainMoney(subtotal)}</td></tr>
            </tbody>
          </table>
        </div>

        <section className="summary">
          <div>
            <div className="summary-row"><span>Total Suit</span><strong>{totalQty}</strong></div>
            <div className="summary-row"><span>Cash / Bank / Cheque / JV</span><strong>{plainMoney(paid)}</strong></div>
          </div>
          <div>
            <div className="summary-row"><span>Gross Total</span><strong>Rs. {plainMoney(total)}</strong></div>
            <div className="summary-row"><span>Discount</span><strong>Rs. {plainMoney(discount)}</strong></div>
            <div className="summary-row"><span>Previous Balance</span><strong>Rs. {plainMoney(previousBalance)}</strong></div>
            <div className="remaining"><span>Total Remaining</span><span>Rs. {plainMoney(remaining)}</span></div>
          </div>
        </section>

        <footer className="invoice-footer">
          <div className="signature"><span>Signature:</span><span className="signature-line" /></div>
          <div className="thanks">Thank you for your business</div>
        </footer>
      </article>

      <div className="action-bar receipt-controls">
        <button type="button" onClick={onClose}>Close</button>
        <button type="button" className="print-btn" onClick={() => window.print()}>Print receipt</button>
      </div>
    </main>
  )
}
