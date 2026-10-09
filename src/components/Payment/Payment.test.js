import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformSync } from 'rolldown/utils'

async function componentUrl(url) {
  const path = new URL(url)
  const { code } = transformSync(path.pathname, await readFile(path, 'utf8'), { jsx: { runtime: 'automatic' } })
  let resolved = code
  for (const match of code.matchAll(/from "([^"]+)"/g)) {
    const name = match[1]
    const target = name.startsWith('.') ? new URL(name, path).href : import.meta.resolve(name)
    resolved = resolved.replace(`from "${name}"`, `from ${JSON.stringify(target.endsWith('.jsx') ? await componentUrl(target) : target)}`)
  }
  return `data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`
}

const { default: Payment } = await import(await componentUrl(new URL('./Payment.jsx', import.meta.url).href))
const render = (props) => renderToStaticMarkup(createElement(Payment, {
  total: 0,
  payments: { cash: '', bank: '', cheque: '' },
  chequeDetails: { chequeNumber: '', bankName: '', chequeDate: '', dueDate: '' },
  onMethodChange() {},
  onChange() {},
  onChequeDetailsChange() {},
  onBankDetailsChange() {},
  ...props,
}))

test('sale payment shows sale-only totals and the four payment methods', () => {
  const html = render({ total: 1250.5, payments: { cash: '200', bank: '100', cheque: '50' }, method: 'split' })
  for (const text of ['Payment Details', 'Amounts below apply to this sale only.', 'Total Sale Amount', 'Amount Paid', 'Remaining Customer Balance', 'Rs. 1,250.50', 'Rs. 350.00', 'Rs. 900.50', 'Cash', 'Bank', 'Cheque', 'Split Payment', 'Cash Amount', 'Bank Amount', 'Cheque Amount']) {
    assert.ok(html.includes(text), `Missing sale payment detail: ${text}`)
  }
  assert.equal((html.match(/type="radio"/g) || []).length, 4)
  assert.equal((html.match(/checked=""/g) || []).length, 1)
})

test('single payment methods expose one Amount Paid input', () => {
  const html = render({ total: 120, payments: { cash: '', bank: '50', cheque: '' }, method: 'bank' })
  assert.ok(html.includes('Bank / Account Details'))
  assert.equal((html.match(/name="payment-/g) || []).length, 1)
  assert.ok(html.includes('value="50"'))
  assert.ok(!html.includes('Cheque Details'))
})