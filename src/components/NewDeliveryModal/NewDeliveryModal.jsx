import { useEffect, useRef, useState } from "react";
import { Banknote, Landmark, ReceiptText, Split } from 'lucide-react';
import { receivingBatchPreview } from '../../data/receiving.js';
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js';
import { BANK_OPTIONS } from '../Payment/Payment.jsx';

const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export function receivingBatchNumber(supplier, date, purchases = []) {
  return receivingBatchPreview(supplier, date, purchases);
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  options,
  error,
  min,
  step,
  readOnly,
  required,
  onFocus,
  onBlur,
}) {
  const id = `delivery-${name}`;
  return (
    <label
      className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]"
      htmlFor={id}
    >
      <span>{label}</span>
      {options ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
        >
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          min={min}
          step={step}
          readOnly={readOnly}
          required={required}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (type === "number" && ["PageUp", "PageDown"].includes(event.key)) event.preventDefault()
          }}
          aria-invalid={Boolean(error)}
          className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b]"
        />
      )}
      {error && (
        <small className="text-red-600 text-xs font-normal" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

function SeasonField({ value, onChange, error }) {
  const seasons = ["Summer", "Winter"];
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs sm:text-sm font-semibold text-[#173b32] mb-1.5">
        Season
      </legend>
      <div className="flex gap-3">
        {seasons.map((option) => (
          <label
            key={option}
            className={`flex-1 h-11 flex items-center gap-2 px-3.5 rounded-xl border text-sm cursor-pointer ${
              value === option
                ? "border-[#155b4b] bg-[#e8f2e3] text-[#155b4b] font-semibold"
                : "border-[#dfe4dc] bg-white text-[#173b32]"
            }`}
          >
            <input
              type="radio"
              name="season"
              value={option}
              checked={value === option}
              onChange={(event) => onChange(event.target.value)}
              className="accent-[#155b4b]"
            />
            {option}
          </label>
        ))}
      </div>
      {error && (
        <small className="text-red-600 text-xs font-normal" role="alert">
          {error}
        </small>
      )}
    </fieldset>
  );
}

const money = (amount) =>
  `Rs. ${Number(amount).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AddedStockCard({ items, onRemove, paymentMethod = "cash", amountPaid = "0", splitCash = "0", splitBank = "0", bankDetails = {}, cheques = [] }) {
  const stockTotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
  const cashPaid = paymentMethod === "split" ? Number(splitCash || 0) : paymentMethod === "cash" ? Number(amountPaid || 0) : 0;
  const bankPaid = paymentMethod === "split" ? Number(splitBank || 0) : paymentMethod === "bank" ? Number(amountPaid || 0) : 0;
  const chequePaid = paymentMethod === "cheque" || paymentMethod === "split" ? totalChequeAmount(cheques) : 0;
  const totalPaid = cashPaid + bankPaid + chequePaid;
  return (
    <aside
      className="min-w-0 p-4 sm:p-5 rounded-2xl bg-[#f7faf5] border border-[#e2e6df] h-fit"
      aria-label="Added stock"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#edf0eb] mb-3">
        <h3 className="text-[#173b32] font-bold text-sm sm:text-base">
          Added stock
        </h3>
        <span role="status" className="px-2.5 py-0.5 rounded-md bg-[#e8f2e3] text-[#557250] text-xs font-semibold">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-[#718078] text-xs sm:text-sm">
          As you add stock, it will appear here.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              className="p-3 rounded-xl bg-white border border-[#edf0eb] text-xs sm:text-sm text-[#12332d]"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-2 font-bold mb-1">
                <span className="min-w-0 break-words"><small className="block text-[10px] font-normal uppercase tracking-wide text-[#718078]">Product</small>
                  {item.productName || item.articleNumber || "Stock item"}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.productName || "stock item"}`}
                  className="w-6 h-6 shrink-0 grid place-items-center rounded-md text-red-600 hover:bg-red-50 cursor-pointer"
                  onClick={() => onRemove(item.id)}
                >
                  ×
                </button>
              </div>
              <small className="text-[#718078] block break-words">
                {item.season}
                {item.articleNumber ? ` · Article ${item.articleNumber}` : ""}
              </small>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                <div className="col-span-2 min-w-0">
                  <dt className="text-xs text-[#718078]">Batch number</dt>
                  <dd className="mt-0.5 font-semibold break-words">{item.batchNumber}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-[#718078]">Quantity</dt>
                  <dd className="mt-0.5 font-semibold">{item.quantity} {item.quantity === 1 ? "suit" : "suits"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-[#718078]">Cost per suit</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums break-words">{money(item.unitCost)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-[#718078]">Sale price per suit</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums break-words">{money(item.salePrice)}</dd>
                </div>
                <div className="col-span-2 pt-3 border-t border-[#edf0eb]">
                  <dt className="font-bold text-[#155b4b]">Total cost <span className="block text-xs font-normal text-[#718078]">Total purchase cost</span></dt>
                  <dd className="mt-1 text-base font-bold text-[#155b4b] tabular-nums break-words">{money(item.quantity * item.unitCost)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-4 pt-4 border-t border-[#dfe8dc]" aria-label="Payment summary">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#173b32] mb-3">Payment Summary</h4>
        <dl className="space-y-1.5 text-xs">
          {[["Stock Total", stockTotal], ["Cash Paid", cashPaid], ["Bank Paid", bankPaid], ["Cheque Paid", chequePaid], ["Total Paid", totalPaid], ["Remaining Supplier Balance", Math.max(0, stockTotal - totalPaid)]].map(([label, value], index) => (
            <div key={label} className={`flex items-center justify-between gap-3 ${index === 4 ? "pt-2 mt-2 border-t border-[#edf0eb] font-bold text-[#155b4b]" : index === 5 ? "font-bold text-[#155b4b]" : "text-[#52645c]"}`}>
              <dt>{label}</dt><dd className="tabular-nums">{money(value)}</dd>
            </div>
          ))}
        </dl>
        {bankPaid > 0 && <p className="mt-3 text-xs text-[#52645c] break-words"><strong className="text-[#173b32]">Bank:</strong> {bankDetails.bankName || "Selected bank"}</p>}
        {cheques.length > 0 && <div className="mt-3 space-y-1.5"><p className="text-xs font-semibold text-[#173b32]">Cheques</p>{cheques.map((cheque) => <p key={cheque.id || `${cheque.number}-${cheque.bank}`} className="flex justify-between gap-2 text-xs text-[#52645c]"><span className="min-w-0 break-words">{cheque.number || "Cheque"} · {cheque.bank || "Bank"}</span><span className="shrink-0 tabular-nums">{money(cheque.amount)}</span></p>)}</div>}
      </section>
    </aside>
  );
}

export function calculateStockPayment(items, amountPaid) {
  const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0);
  const paid = Number(amountPaid);
  const valid = Number.isFinite(paid) && paid >= 0;
  const error = !valid
    ? "Enter a valid, non-negative payment amount."
    : paid > total + 0.005
      ? "Amount paid cannot exceed the total stock cost."
      : "";
  return { total, paid: valid ? paid : 0, remaining: Math.max(0, total - (valid ? paid : 0)), error };
}

export const totalChequeAmount = (cheques) => cheques.reduce((sum, cheque) => sum + (Number.isFinite(Number(cheque.amount)) && Number(cheque.amount) > 0 ? Number(cheque.amount) : 0), 0);

export function chequeError(cheque) {
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!cheque.number.trim() || !cheque.bank.trim()) return "Enter the cheque number and bank.";
  if (!Number.isFinite(Number(cheque.amount)) || Number(cheque.amount) <= 0) return "Cheque amount must be greater than zero.";
  if (!validDate(cheque.issued)) return "Enter a valid cheque date.";
  if (cheque.expectedClearanceDate && (!validDate(cheque.expectedClearanceDate) || cheque.expectedClearanceDate < cheque.issued)) return "Clearing date must be on or after the cheque date.";
  return "";
}

const newCheque = () => ({ id: `${Date.now()}-${Math.random()}`, number: "", bank: "", amount: "", issued: today(), expectedClearanceDate: "" });

export function ChequeDetails({ cheques, onChange, disabled }) {
  const [editingId, setEditingId] = useState(cheques[0]?.id);
  const [error, setError] = useState("");
  const update = (id, key, value) => { onChange(cheques.map((cheque) => cheque.id === id ? { ...cheque, [key]: value } : cheque)); setError(""); };
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-semibold text-[#173b32] mb-2">Supplier cheques</legend>
      <ul className="space-y-3">
        {cheques.map((cheque, index) => (
          <li key={cheque.id} className="p-3 rounded-xl border border-[#dfe4dc] bg-white space-y-3">
            <div className="flex justify-between gap-2 text-sm text-[#173b32]">
              <strong>Cheque {index + 1}</strong>
              <div className="flex gap-3">
                <button type="button" className="text-[#155b4b] font-semibold cursor-pointer" onClick={() => { setEditingId(cheque.id); setError(""); }} aria-label={`Edit cheque ${index + 1}`}>Edit</button>
                <button type="button" className="text-red-600 cursor-pointer" onClick={() => { onChange(cheques.filter((entry) => entry.id !== cheque.id)); setError(""); }} aria-label={`Remove cheque ${index + 1}`}>Remove</button>
              </div>
            </div>
            {editingId === cheque.id ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[["Cheque Number", "number", "text"], ["Bank", "bank", "text"], ["Cheque Amount", "amount", "number"], ["Cheque Date", "issued", "date"], ["Due / Clearing Date (optional)", "expectedClearanceDate", "date"]].map(([label, key, type]) => (
                  <Field key={key} label={label} name={`cheque-${cheque.id}-${key}`} type={type} value={cheque[key]} min={key === "amount" ? "0.01" : key === "expectedClearanceDate" ? cheque.issued : undefined} step={key === "amount" ? "0.01" : undefined} onChange={(event) => update(cheque.id, key, event.target.value)} />
                ))}
                <button type="button" className="h-10 self-end rounded-lg bg-[#155b4b] text-white text-sm font-semibold cursor-pointer" onClick={() => { const message = chequeError(cheque); setError(message); if (!message) setEditingId(null); }}>Done</button>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-2 text-xs text-[#173b32] break-words">
                {[["Cheque Number", cheque.number], ["Bank", cheque.bank], ["Cheque Amount", money(Number(cheque.amount) || 0)], ["Cheque Date", cheque.issued], ["Due / Clearing Date", cheque.expectedClearanceDate || "Not provided"]].map(([label, value]) => <div key={label}><dt className="text-[#718078]">{label}</dt><dd className="font-semibold">{value || "Not provided"}</dd></div>)}
              </dl>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button type="button" className="h-10 px-3 rounded-lg border border-[#155b4b] text-[#155b4b] text-sm font-semibold cursor-pointer" onClick={() => { const cheque = newCheque(); onChange([...cheques, cheque]); setEditingId(cheque.id); setError(""); }}>Add Another Cheque</button>
      <p role="status" className="text-sm font-bold text-[#155b4b]">Total Cheque Amount: {money(totalChequeAmount(cheques))}</p>
      <p className="text-xs text-[#718078]">Cheques stay pending in the Cheque Register. Amount Paid and the supplier balance change when each cheque clears.</p>
    </fieldset>
  );
}

export function prepareStockPayment(items, amountPaid, method, bankDetails = {}, cheques = [], split = {}) {
  if (method === "split") {
    const cash = Number(split.cash || 0); const bank = Number(split.bank || 0); const cheque = totalChequeAmount(cheques); const total = calculateStockPayment(items, 0).total;
    if (![cash, bank].every((value) => Number.isFinite(value) && value >= 0)) return { error: "Cash and bank amounts must be valid, non-negative amounts." };
    if (bank > 0 && !String(bankDetails.bankName || "").trim()) return { error: "Select a bank/account or enter a bank name for the bank payment." };
    if (cheques.length) { const validation = prepareStockPayment(items, cheque, "cheque", {}, cheques); if (validation.error) return validation; }
    if (cash + bank + cheque > total + 0.005) return { error: "Total paid cannot exceed the total stock cost." };
    return { payments: { cash, bank, cheque }, bankDetails: bank > 0 ? { bankName: String(bankDetails.bankName || "").trim(), amount: bank } : null, cheques };
  }
  if (method === "cheque") {
    if (!cheques.length) return { error: "Add at least one cheque." };
    const seen = new Set();
    for (const cheque of cheques) {
      const error = chequeError(cheque);
      if (error) return { error };
      const key = JSON.stringify([cheque.bank.trim().toLowerCase(), cheque.number.trim().toLowerCase()]);
      if (seen.has(key)) return { error: "The same cheque number and bank cannot be added twice." };
      seen.add(key);
    }
    const total = totalChequeAmount(cheques);
    const summary = calculateStockPayment(items, total);
    if (summary.error) return { error: "Total cheque amount cannot exceed the total stock cost." };
    return { payments: { cash: 0, bank: 0, cheque: total }, cheques: cheques.map(({ number, bank, amount, issued, expectedClearanceDate }) => ({ number: number.trim(), bank: bank.trim(), amount: Number(amount), issued, expectedClearanceDate })) };
  }
  const summary = calculateStockPayment(items, amountPaid);
  if (summary.error) return { error: summary.error };
  if (method === "bank") {
    const bankName = String(bankDetails.bankName || "").trim();
    if (!bankName) return { error: "Select a bank." };
    return { payments: { cash: 0, bank: summary.paid, cheque: 0 }, bankDetails: { bankName, amount: summary.paid } };
  }
  if (method !== "cash" && summary.paid > 0)
    return { error: "This payment method is preview-only. Choose Cash or Bank to record a payment, or enter 0 to save the delivery unpaid." };
  return { payments: { cash: summary.paid, bank: 0, cheque: 0 } };
}

export function getReceivingBanks(purchases = []) {
  const banks = new Map();
  for (const purchase of purchases) {
    const bankName = String(purchase.bankDetails?.bankName || "").trim();
    const accountNumber = String(purchase.bankDetails?.accountNumber || "").trim();
    if (!bankName) continue;
    const key = JSON.stringify([bankName.toLowerCase(), accountNumber.toLowerCase()]);
    if (!banks.has(key)) banks.set(key, { key, bankName, accountNumber });
  }
  return [...banks.values()];
}

export function PaymentDetails({ items, method, amountPaid, onMethodChange, onAmountChange, error, bankDetails = {}, onBankDetailsChange, cheques = [], onChequesChange, splitCash = "0", splitBank = "0", onSplitCashChange, onSplitBankChange }) {
  const splitTotal = Number(splitCash || 0) + Number(splitBank || 0) + totalChequeAmount(cheques);
  const summary = calculateStockPayment(items, method === "cheque" ? 0 : method === "split" ? splitTotal : amountPaid);
  const paymentError = summary.error || (method === "cheque" && totalChequeAmount(cheques) > summary.total + 0.005 ? "Total cheque amount cannot exceed the total stock cost." : "") || error;
  return (
    <section className="p-4 sm:p-5 rounded-xl bg-[#fafbf8] border border-[#e8ece3] space-y-4" aria-labelledby="delivery-payment-title">
      <h3 id="delivery-payment-title" className="text-sm font-bold text-[#173b32] uppercase tracking-wider">Payment Details</h3>
      <p className="text-xs text-[#718078]">Amounts below apply to this delivery only.</p>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-live="polite">
        {[["Total Stock Cost", summary.total], ["Amount Paid", summary.paid], ["Remaining Supplier Balance", summary.remaining]].map(([label, value]) => (
          <div key={label} className="min-w-0 p-3 rounded-xl bg-[#e8f2e3]">
            <dt className="text-xs text-[#557250]">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-[#155b4b] tabular-nums break-words">{money(value)}</dd>
          </div>
        ))}
      </dl>
      <fieldset disabled={!items.length}>
        <legend className="text-xs sm:text-sm font-semibold text-[#173b32] mb-2">Payment method</legend>
        <div className="grid grid-cols-2 gap-2">
          {[["cash", "Cash", Banknote], ["bank", "Bank", Landmark], ["cheque", "Cheque", ReceiptText], ["split", "Split Payment", Split]].map(([value, label, Icon]) => (
            <label key={value} className={`flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-colors ${method === value ? "border-[#155b4b] bg-[#e8f2e3] text-[#155b4b] font-semibold" : "border-[#dfe4dc] bg-white text-[#173b32] hover:border-[#155b4b]/50"}`}>
              <input type="radio" name="delivery-payment-method" value={value} checked={method === value} onChange={() => onMethodChange(value)} onKeyDown={(event) => {
                if (event.key !== "Enter" || event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || !["bank", "split"].includes(value)) return
                event.preventDefault()
                const scope = event.currentTarget.closest("[data-keyboard-scope]")
                onMethodChange(value)
                requestAnimationFrame(() => {
                  const group = scope?.querySelector('[aria-label="Bank logos"]')
                  const selected = group?.querySelector('button[aria-pressed="true"]')
                  ;(selected || group?.querySelector("button"))?.focus()
                })
              }} className="accent-[#155b4b]" />
              <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {(method === "bank" || method === "split") && (
        <fieldset disabled={!items.length} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Bank logos" onKeyDown={(event) => {
            if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
            const directions = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
            const direction = directions[event.key]
            if (!direction) return
            const buttons = [...event.currentTarget.querySelectorAll("button")]
            const index = buttons.indexOf(event.target)
            if (index < 0) return
            event.preventDefault()
            buttons[(index + direction + buttons.length) % buttons.length]?.focus()
          }}>
            {BANK_OPTIONS.map((bank) => (
              <button
                key={bank.name}
                type="button"
                aria-pressed={bankDetails.bankName?.toLowerCase() === bank.name.toLowerCase()}
                onClick={() => {
                  onBankDetailsChange({ bankName: bank.name })
                  requestAnimationFrame(() => {
                    const nextField = method === "split" ? document.getElementById("delivery-splitBank") : document.getElementById("delivery-amount-paid")
                    nextField?.focus()
                  })
                }}
                className={`min-h-24 p-3 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155b4b] ${bankDetails.bankName?.toLowerCase() === bank.name.toLowerCase() ? "border-[#155b4b] bg-[#e8f2e3]" : "border-[#dfe4dc] bg-white hover:border-[#155b4b]/50"}`}
              >
                <img src={bank.logo} alt="" className="h-10 w-full object-contain" />
                <span className="text-xs font-semibold text-[#173b32]">{bank.name}</span>
              </button>
            ))}
          </div>
          {bankDetails.bankName && <p className="text-sm font-semibold text-[#173b32]">Bank Name: {bankDetails.bankName}</p>}
        </fieldset>
      )}
      {method === "split" && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Cash" name="splitCash" type="number" min="0" step="0.01" value={splitCash} onChange={(event) => onSplitCashChange(event.target.value)} onFocus={() => { if (Number(splitCash) === 0) onSplitCashChange("") }} onBlur={() => { if (splitCash === "") onSplitCashChange("0") }} /><Field label="Bank" name="splitBank" type="number" min="0" step="0.01" value={splitBank} onChange={(event) => onSplitBankChange(event.target.value)} onFocus={() => { if (Number(splitBank) === 0) onSplitBankChange("") }} onBlur={() => { if (splitBank === "") onSplitBankChange("0") }} /></div>}
      {method === "cheque" || method === "split" ? <ChequeDetails cheques={cheques} onChange={onChequesChange} disabled={!items.length} /> : <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]" htmlFor="delivery-amount-paid">
        {method === "bank" ? "Payment Amount" : "Amount Paid"}
        <input id="delivery-amount-paid" name="amountPaid" type="number" min="0" max={summary.total} step="0.01" value={amountPaid} disabled={!items.length} onFocus={() => { if (Number(amountPaid) === 0) onAmountChange("") }} onBlur={() => { if (amountPaid === "") onAmountChange("0") }} onKeyDown={(event) => { if (["PageUp", "PageDown"].includes(event.key)) event.preventDefault() }} onChange={(event) => onAmountChange(event.target.value)} aria-invalid={Boolean(paymentError)} aria-describedby={paymentError ? "delivery-payment-error" : undefined} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b] disabled:opacity-50" />
      </label>}
      {!items.length && <p className="text-xs text-[#718078]">Add stock items to enter payment details.</p>}
      {method === "split" && <p className="text-xs text-[#718078]">This method is available for preview. Saving a payment with this method will be available when its details are added. You can still save this delivery unpaid with Amount Paid set to 0.</p>}
      {paymentError && <p id="delivery-payment-error" className="text-xs text-red-600" role="alert">{paymentError}</p>}
    </section>
  );
}

export default function NewDeliveryModal({
  onClose,
  onSave,
  suppliers = [],
  purchases = [],
}) {
  const [supplier, setSupplier] = useState("");
  const [arrivalDate, setArrivalDate] = useState(today());
  const batchNumber = receivingBatchNumber(suppliers.find((entry) => entry.id === supplier), arrivalDate, purchases);
  const [padNumber, setPadNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [articleNumber, setArticleNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [salePrice, setSalePrice] = useState("0");
  const [season, setSeason] = useState("Summer");
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [splitCash, setSplitCash] = useState("0");
  const [splitBank, setSplitBank] = useState("0");
  const [cheques, setCheques] = useState(() => [newCheque()]);
  const [bankDetails, setBankDetails] = useState({ bankName: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true });

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    keyboard.ref.current?.querySelector("#delivery-supplier")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const addItem = () => {
    const nextErrors = {};
    const trimmedBatch = batchNumber.trim();
    if (!trimmedBatch) nextErrors.batchNumber = "Choose a supplier with a Supplier Code to generate the batch number.";
    if (!articleNumber.trim())
      nextErrors.articleNumber = "Please enter the article name or design number.";
    if (!season) nextErrors.season = "Choose a season.";
    if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0)
      nextErrors.quantity = "Quantity must be greater than 0.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setItems((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        batchNumber: trimmedBatch,
        productName: productName.trim(),
        articleNumber: articleNumber.trim(),
        quantity: Number(quantity),
        unitCost: Number(unitCost) || 0,
        salePrice: Number(salePrice) || 0,
        season,
      },
    ]);
    setErrors({});
    setProductName("");
    setArticleNumber("");
    setQuantity("1");
  };

  const saveDelivery = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    const nextErrors = {};
    if (!supplier) nextErrors.supplier = "Choose a supplier.";
    if (!arrivalDate) nextErrors.arrivalDate = "Choose an arrival date.";
    if (!batchNumber) nextErrors.batchNumber = "Choose a supplier with a Supplier Code to generate the batch number.";
    if (items.length === 0)
      nextErrors.items = "Add at least one stock item before saving.";
    const payment = prepareStockPayment(items, amountPaid, paymentMethod, bankDetails, cheques, { cash: splitCash, bank: splitBank });
    if (payment.error) nextErrors.payment = payment.error;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    savingRef.current = true;
    setSaving(true);
    try {
      await onSave({
      supplierId: supplier,
      arrivalDate,
      padNumber: padNumber.trim(),
      items: items.map((item) => ({ ...item, batchNumber })),
      payments: payment.payments,
      bankDetails: payment.bankDetails,
      cheques: payment.cheques,
      chequeDetails: null,
      createdAt: new Date().toISOString(),
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#203832]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <section
        ref={keyboard.ref}
        onKeyDownCapture={(event) => {
          if (event.target instanceof HTMLInputElement && event.target.type === "number" && ["PageUp", "PageDown"].includes(event.key)) event.preventDefault()
        }}
        onKeyDown={keyboard.onKeyDown}
        data-keyboard-scope
        className="w-full max-w-4xl p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-2xl max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-delivery-title"
      >
        <header className="flex items-center justify-between pb-4 mb-5 border-b border-[#edf0eb]">
          <h2
            id="new-delivery-title"
            className="text-[#173b32] text-xl sm:text-2xl font-bold"
          >
            Receive a new delivery
          </h2>
          <button
            type="button"
            className="w-8 h-8 grid place-items-center rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1] cursor-pointer"
            aria-label="Close new delivery"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <form className="space-y-6" onSubmit={saveDelivery} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Supplier"
                name="supplier"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                options={[
                  ["", "Choose one"],
                  ...suppliers.map((entry) => [entry.id, entry.name]),
                ]}
                error={errors.supplier}
              />
              <Field
                label="Arrival date"
                name="arrivalDate"
                type="date"
                value={arrivalDate}
                onChange={(event) => setArrivalDate(event.target.value)}
                error={errors.arrivalDate}
              />
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-[#fafbf8] border border-[#e8ece3] space-y-4">
              <h3 className="text-sm font-bold text-[#173b32] uppercase tracking-wider">
                Item details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Batch number (automatic)"
                  name="batchNumber"
                  value={batchNumber}
                  placeholder="Select supplier and bill date"
                  readOnly
                  error={errors.batchNumber}
                />
                <Field
                  label="Pad number (optional)"
                  name="padNumber"
                  value={padNumber}
                  onChange={(event) => setPadNumber(event.target.value)}
                  placeholder="Enter supplier pad number"
                />

                <Field
                  label="Article / design number"
                  name="articleNumber"
                  value={articleNumber}
                  onChange={(event) => setArticleNumber(event.target.value)}
                  placeholder="Please enter the article name or design number"
                  required
                  error={errors.articleNumber}
                />
                <Field
                  label="Brand Name"
                  name="productName"
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  placeholder="e.g. Lawn Suit"
                  error={errors.productName}
                />
                <SeasonField
                  value={season}
                  onChange={setSeason}
                  error={errors.season}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field
                  label="Qty (suits)"
                  name="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  onFocus={() => { if (Number(quantity) === 0) setQuantity("") }}
                  onBlur={() => { if (quantity === "") setQuantity("1") }}
                  error={errors.quantity}
                />
                <Field
                  label="Cost per suit"
                  name="unitCost"
                  type="number"
                  min="0"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  onFocus={() => { if (Number(unitCost) === 0) setUnitCost("") }}
                  onBlur={() => { if (unitCost === "") setUnitCost("0") }}
                />
                <Field
                  label="Sale price"
                  name="salePrice"
                  type="number"
                  min="0"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  onFocus={() => { if (Number(salePrice) === 0) setSalePrice("") }}
                  onBlur={() => { if (salePrice === "") setSalePrice("0") }}
                />
              </div>

              <button
                className="w-full h-11 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
                type="button"
                data-enter-next
                onClick={addItem}
              >
                ＋ Add item to delivery
              </button>
              {errors.items && (
                <small className="text-red-600 text-xs block" role="alert">
                  {errors.items}
                </small>
              )}
            </div>

            <PaymentDetails
              items={items}
              method={paymentMethod}
              amountPaid={amountPaid}
              splitCash={splitCash}
              splitBank={splitBank}
              onSplitCashChange={setSplitCash}
              onSplitBankChange={setSplitBank}
              cheques={cheques}
              onChequesChange={(entries) => {
                setCheques(entries);
                setErrors((current) => ({ ...current, payment: undefined }));
              }}
              bankDetails={bankDetails}
              onBankDetailsChange={(details) => {
                setBankDetails(details);
                setErrors((current) => ({ ...current, payment: undefined }));
              }}
              onMethodChange={(method) => {
                setPaymentMethod(method);
                setErrors((current) => ({ ...current, payment: undefined }));
              }}
              onAmountChange={(value) => {
                setAmountPaid(value);
                setErrors((current) => ({ ...current, payment: undefined }));
              }}
              error={errors.payment}
            />

            <button
              disabled={saving}
              className="w-full h-12 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-sm sm:text-base font-bold shadow-md transition-all cursor-pointer active:scale-98"
              type="submit"
            >
              {saving ? "Saving…" : "Save delivery & add stock"}
            </button>
          </form>

          <AddedStockCard
            items={items.map((item) => ({ ...item, batchNumber }))}
            paymentMethod={paymentMethod}
            amountPaid={amountPaid}
            splitCash={splitCash}
            splitBank={splitBank}
            bankDetails={bankDetails}
            cheques={cheques}
            onRemove={(id) =>
              setItems((current) => current.filter((item) => item.id !== id))
            }
          />
        </div>
      </section>
    </div>
  );
}
