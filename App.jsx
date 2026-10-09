import { useEffect, useRef, useState } from 'react'
import { apiRequest, getBootstrapStatus, getCurrentUser, getWorkspace, registerFirstAdmin, signIn } from './src/api/client.js'
import AccountStatement from './src/components/AccountStatement/AccountStatement.jsx'
import Header from './src/components/Header/Header.jsx'
import NotificationsPage from './src/components/Notifications/Notifications.jsx'
import Footer from './src/components/Footer/Footer.jsx'
import Sidebar from './src/components/Sidebar/Sidebar.jsx'
import SignIn from './src/components/SignIn/SignIn.jsx'
import { createEmptyDatabase } from './src/data/businessLogic.js'
import NewSale from './src/pages/new-sale/NewSale.jsx'
import NewCustomer from './src/pages/new-customer/NewCustomer.jsx'
import BillsReceipts from './src/pages/bills-receipts/BillsReceipts.jsx'
import BillReceipt from './src/pages/bill-receipt/BillReceipt.jsx'
import CustomerReturns from './src/pages/customer-returns/CustomerReturns.jsx'
import OrdersHeld from './src/pages/orders-held/OrdersHeld.jsx'
import StockProducts from './src/pages/stock-products/StockProducts.jsx'
import ReceiveStock from './src/pages/receive-stock/ReceiveStock.jsx'
import Suppliers from './src/pages/suppliers/Suppliers.jsx'
import CustomerKhata from './src/pages/customer-khata/CustomerKhata.jsx'
import ChequeRegister from './src/pages/cheque-register/ChequeRegister.jsx'
import ShopExpenses from './src/pages/shop-expenses/ShopExpenses.jsx'
import DailyClosing from './src/pages/daily-closing/DailyClosing.jsx'
import Reports from './src/pages/reports/Reports.jsx'
import Settings from './src/pages/settings/Settings.jsx'
import Claims from './src/pages/claims/Claims.jsx'
import SupplierReturns from './src/pages/supplier-returns/SupplierReturns.jsx'
import { useDocumentLanguage } from './src/i18n/urdu.js'
import { createTripleRightShortcut, navigationReturnTarget } from './src/keyboard/sidebarNavigation.js'
import { runSingleFlight } from './src/keyboard/singleFlight.js'
import { hasModulePermission, hasModuleView } from './src/permissions.js'

const pagePermissions = {
  'new-sale': 'sales',
  bills: 'sales',
  'bill-receipt': 'sales',
  'new-customer': 'customers',
  returns: 'returns',
  orders: 'orders',
  stock: 'stock',
  receive: 'purchases',
  'supplier-returns': 'stock',
  claims: 'stock',
  suppliers: 'suppliers',
  khata: 'customers',
  cheques: 'cheques',
  expenses: 'finance',
  closing: 'dailyClosing',
  reports: 'reports',
  settings: 'settings',
}

const pageOrder = Object.entries(pagePermissions)
  .filter(([page]) => !['bill-receipt', 'new-customer'].includes(page))
  .map(([page]) => page)

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('katasys-token') || '')
  const [user, setUser] = useState(null)
  const [database, setDatabase] = useState(createEmptyDatabase)
  const [authLoading, setAuthLoading] = useState(() => Boolean(sessionStorage.getItem('katasys-token')))
  const [registrationAvailable, setRegistrationAvailable] = useState(false)
  const [language, setLanguage] = useState(() => localStorage.getItem('katasys-language') === 'ur' ? 'ur' : 'en')
  const [operationError, setOperationError] = useState('')
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('new-sale')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerReturnPage, setCustomerReturnPage] = useState('new-sale')
  const [currentReceipt, setCurrentReceipt] = useState(null)
  const [receiptReturnPage, setReceiptReturnPage] = useState('new-sale')
  const [currentStatement, setCurrentStatement] = useState(null)
  const [resumeDraft, setResumeDraft] = useState(null)
  const menuButtonRef = useRef(null)
  const navigationOpenerRef = useRef(null)
  const pendingMutationRef = useRef(new Set())

  const openNavigation = () => {
    navigationOpenerRef.current = document.activeElement
    setSidebarOpen(true)
  }

  const closeNavigation = (changedPage = false) => {
    setSidebarOpen(false)
    requestAnimationFrame(() => {
      const opener = navigationOpenerRef.current
      const target = navigationReturnTarget(opener, menuButtonRef.current, { changedPage, doc: document })
      target?.focus()
    })
  }

  useEffect(() => {
    if (!token || !user || authLoading || isSidebarOpen) return undefined
    const onKeyDown = createTripleRightShortcut(openNavigation, {
      canOpen: () => !document.querySelector('[aria-modal="true"]'),
    })
    const onShiftTab = (event) => {
      if (event.key !== 'Tab' || !event.shiftKey || event.repeat || event.isComposing ||
          event.ctrlKey || event.altKey || event.metaKey || event.defaultPrevented ||
          document.querySelector('[aria-modal="true"]')) return
      event.preventDefault()
      event.stopPropagation()
      openNavigation()
    }
    document.addEventListener('keydown', onShiftTab, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onShiftTab, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [token, user, authLoading, isSidebarOpen])

  useDocumentLanguage(language)

  useEffect(() => {
    localStorage.setItem('katasys-language', language)
  }, [language])

  const can = (permission, action = 'view') => user?.role === 'admin' || hasModulePermission(user?.permissions, permission, action) || permission === 'settings' && action === 'view' && hasModuleView(user?.permissions, 'activityHistory')
  const customers = database.customers || []
  const suppliers = database.suppliers || []
  const savedBills = database.sales || []
  const heldBills = database.heldOrders || []
  const activePage = currentPage === 'notifications' ? currentPage : can(pagePermissions[currentPage])
    ? currentPage
    : pageOrder.find((page) => can(pagePermissions[page])) || 'new-sale'

  const refreshWorkspace = async (activeToken = token) => {
    const workspace = await getWorkspace(activeToken)
    setDatabase({ ...createEmptyDatabase(), ...workspace.database })
    setUser(workspace.user)
    setLanguage(workspace.language === 'ur' ? 'ur' : 'en')
    return workspace.database
  }

  useEffect(() => {
    if (!token) {
      getBootstrapStatus().then((status) => {
        setRegistrationAvailable(status.registrationAvailable)
        setLanguage(status.language === 'ur' ? 'ur' : 'en')
      }).catch(() => setRegistrationAvailable(false))
      setAuthLoading(false)
      return undefined
    }
    let active = true
    setAuthLoading(true)
    Promise.all([getCurrentUser(token), getWorkspace(token)])
      .then(([current, workspace]) => {
        if (!active) return
        setUser(current.user)
        setDatabase({ ...createEmptyDatabase(), ...workspace.database })
        setLanguage(workspace.language === 'ur' ? 'ur' : 'en')
      })
      .catch((error) => {
        if (!active) return
        sessionStorage.removeItem('katasys-token')
        setToken('')
        setUser(null)
        setOperationError(error.message)
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!selectedCustomerId && customers[0]) setSelectedCustomerId(customers[0].id)
  }, [customers, selectedCustomerId])

  const handleSignIn = async (credentials) => {
    const result = credentials.registration
      ? await registerFirstAdmin(credentials)
      : await signIn(credentials)
    sessionStorage.setItem('katasys-token', result.token)
    setUser(result.user)
    setToken(result.token)
  }

  const signOut = async () => {
    try {
      await apiRequest('auth/logout', { token, method: 'POST' })
    } catch {
      // Clear the local session even if audit logging is unavailable.
    }
    sessionStorage.removeItem('katasys-token')
    setToken('')
    setUser(null)
    setDatabase(createEmptyDatabase())
    setCurrentReceipt(null)
  }

  const mutate = async (path, { method = 'POST', body, throwOnError = false, refresh = true } = {}) => {
    const mutationKey = `${method}:${path}:${JSON.stringify(body ?? {})}`
    return runSingleFlight(pendingMutationRef.current, mutationKey, async () => {
      setOperationError('')
      try {
        const result = await apiRequest(path, { token, method, body })
        if (refresh) await refreshWorkspace(token)
        return result
      } catch (error) {
        setOperationError(error.message)
        if (throwOnError) throw error
        return null
      }
    })
  }

  const saveLanguage = async (nextLanguage) => {
    const saved = await mutate('admin/settings', {
      method: 'PATCH',
      body: {
        ...database.settings,
        shopName: database.settings.shopName || 'Abbas Textile',
        stockThreshold: database.settings.stockThreshold || '10',
        receiptFooter: database.settings.receiptFooter || '',
        language: nextLanguage,
      },
    })
    if (saved) setLanguage(saved.language === 'ur' ? 'ur' : 'en')
    return saved
  }

  const navigateTo = (page) => {
    const pages = { 'New sale': 'new-sale', 'New customer': 'new-customer', 'Bills & receipts': 'bills', 'Customer returns': 'returns', 'Orders & held bills': 'orders', 'Stock & products': 'stock', 'Receive stock': 'receive', 'Supplier returns': 'supplier-returns', 'Defects & claims': 'claims', Suppliers: 'suppliers', 'Customer khata': 'khata', 'Cheque register': 'cheques', 'Shop expenses': 'expenses', 'Daily closing': 'closing', Reports: 'reports', Settings: 'settings' }
    setCurrentPage(pages[page] || page || 'new-sale')
    setSidebarOpen(false)
  }

  const saveCustomer = async (customer) => {
    const saved = await mutate('customers', { body: customer })
    if (!saved) return null
    if (customerReturnPage === 'new-sale') setSelectedCustomerId(saved.id)
    setCurrentPage(customerReturnPage)
  }

  const showInvoice = async (sale, returnPage = 'bills') => {
    try {
      const invoice = await apiRequest(`sales/${sale.id}/invoice`, { token })
      setCurrentReceipt({
        ...invoice.sale,
        customerDetails: invoice.customer,
        receiptShopName: invoice.shopName,
        receiptFooter: invoice.receiptFooter,
      })
    } catch (error) {
      setOperationError(error.message)
      setCurrentReceipt(sale)
    }
    setReceiptReturnPage(returnPage)
    setCurrentPage('bill-receipt')
  }

  const saveBill = async (bill) => {
    const saved = await mutate('sales', { body: bill, refresh: false })
    if (!saved) return null
    // Load the preview while workspace data refreshes in the background.
    void refreshWorkspace(token).catch((error) => {
      setOperationError(`Bill saved, but workspace refresh failed: ${error.message}`)
    })
    await showInvoice(saved, 'new-sale')
    return saved
  }

  const changeStatus = (path, status) => mutate(path, { method: 'PATCH', body: { status } })

  const openNotification = async (notification) => {
    const targets = {
      cheque: 'cheques',
      'cheque-reminder': 'cheques',
      purchase: 'receive',
      'stock-adjustment': 'stock',
      'stock-audit': 'stock',
      'supplier-return': 'supplier-returns',
      return: 'returns',
      payment: 'khata',
      expense: 'expenses',
      'finance-entry': 'expenses',
      'daily-closing': 'closing',
      product: 'stock',
      claim: 'claims',
      order: 'orders',
      customer: 'khata',
      supplier: 'suppliers',
      'supplier-payment': 'suppliers',
      settings: 'settings',
      'bank-account': 'closing',
      'bank-transaction': 'closing',
    }
    if (notification.relatedType === 'sale' && notification.relatedId) {
      await showInvoice({ id: notification.relatedId }, 'bills')
      return
    }
    setCurrentPage(targets[notification.relatedType] || 'notifications')
  }

  const showStatement = async (type, id) => {
    setOperationError('')
    try {
      const statement = await apiRequest(`${type === 'supplier' ? 'suppliers' : 'customers'}/${id}/statement`, { token })
      setCurrentStatement({ type, statement })
    } catch (error) {
      setOperationError(error.message)
    }
  }

  if (authLoading) return <main className="min-h-screen grid place-items-center text-[#52645c]">Connecting to KataSys…</main>
  if (!token || !user) return <SignIn onSignIn={handleSignIn} allowRegistration={registrationAvailable} />

  return <>
    <Header user={user} token={token} showNotifications={can('notifications')} canManageNotifications={can('notifications', 'manage')} menuButtonRef={menuButtonRef} onMenuClick={openNavigation} onSignOut={signOut} onViewAllNotifications={() => setCurrentPage('notifications')} onOpenNotification={openNotification} />
    {operationError && <div className="mx-auto max-w-[1680px] px-4 sm:px-6 lg:px-12 pt-4"><p className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">{operationError}</p></div>}
    {activePage === 'notifications' ? <NotificationsPage token={token} canManage={can('notifications', 'manage')} onOpenNotification={openNotification} />
      : activePage === 'bill-receipt' && currentReceipt ? <BillReceipt bill={currentReceipt} onClose={() => navigateTo(receiptReturnPage)} />
      : activePage === 'new-customer' ? <NewCustomer onCancel={() => setCurrentPage(customerReturnPage)} onSave={saveCustomer} />
      : activePage === 'bills' ? <BillsReceipts bills={savedBills} customers={customers} products={database.products} onNewSale={() => navigateTo('New sale')} onReturn={() => navigateTo('Customer returns')} onViewInvoice={(sale) => showInvoice(sale, 'bills')} onUpdateReceipt={(id, details) => mutate(`sales/${id}/receipt`, { method: 'PATCH', body: details, throwOnError: true })} onUpdateBill={(id, details) => mutate(`sales/${id}`, { method: 'PATCH', body: details, throwOnError: true })} />
      : activePage === 'returns' ? <CustomerReturns bills={savedBills} customers={customers} returns={database.returns} onReturnProcessed={(input) => mutate('returns/customers', { body: input })} />
      : activePage === 'orders' ? <OrdersHeld bills={heldBills} customers={customers} onResume={async (bill) => { const resumed = await mutate(`orders/${bill.id}/resume`); if (resumed) { setResumeDraft(resumed); setCurrentPage('new-sale') } }} onDiscard={(id) => mutate(`orders/${id}/cancel`)} onDeliver={(id, delivery) => mutate(`orders/${id}/deliver`, { body: delivery })} onComplete={async (bill) => { const sale = await mutate(`orders/${bill.id}/complete`); if (sale?.id) await showInvoice(sale, 'orders') }} />
      : activePage === 'stock' ? <StockProducts products={database.products} suppliers={suppliers} onReceiveStock={() => navigateTo('Receive stock')} onSaveAudit={(audit) => mutate('products/stock-audit', { body: audit })} />
      : activePage === 'receive' ? <ReceiveStock suppliers={suppliers} purchases={database.purchases} onSave={(delivery) => mutate('purchases', { body: delivery })} />
      : activePage === 'supplier-returns' ? <SupplierReturns purchases={database.purchases} returns={database.supplierReturns} onSubmit={(input) => mutate('returns/suppliers', { body: input })} />
      : activePage === 'claims' ? <Claims claims={database.claims} products={database.products} suppliers={suppliers} onCreate={(input) => mutate('claims', { body: input })} onStatusChange={(id, status) => changeStatus(`claims/${id}/status`, status)} onUpdateDetails={(id, details) => mutate(`claims/${id}`, { method: 'PATCH', body: details })} />
      : activePage === 'suppliers' ? <Suppliers suppliers={suppliers} products={database.products} purchases={database.purchases} payments={database.payments} returns={database.supplierReturns} claims={database.claims} cheques={database.cheques} onCreate={(supplier) => mutate('suppliers', { body: supplier })} onUpdate={(id, supplier) => mutate(`suppliers/${id}`, { method: 'PATCH', body: supplier })} onPayment={(payment) => mutate(`suppliers/${payment.accountId}/payments`, { body: payment })} onStatement={(id) => showStatement('supplier', id)} />
      : activePage === 'khata' ? <CustomerKhata customers={customers} payments={database.payments} sales={savedBills} returns={database.returns} installments={database.installments} onNewCustomer={() => { setCustomerReturnPage('khata'); setCurrentPage('new-customer') }} onPayment={(payment) => mutate(`customers/${payment.accountId}/payments`, { body: payment })} onBulkRecovery={(input) => mutate('customers/recovery/bulk', { body: input })} onInstallmentPayment={(id, payment) => mutate(`customers/installments/${id}/payments`, { body: payment })} onStatement={(id) => showStatement('customer', id)} />
      : activePage === 'cheques' ? <ChequeRegister cheques={database.cheques} customers={customers} suppliers={suppliers} onCreate={(cheque) => mutate('cheques', { body: cheque })} onStatusChange={(id, status) => changeStatus(`cheques/${id}/status`, status)} />
      : activePage === 'expenses' ? <ShopExpenses expenses={database.expenses} financeEntries={database.financeEntries} onCreate={(entry) => mutate('finance/entries', { body: entry })} />
      : activePage === 'closing' ? <DailyClosing database={database} user={user} onSave={(record) => mutate('finance/daily-closing', { body: record })} onDelete={(id) => mutate(`finance/daily-closing/${id}`, { method: 'DELETE' })} onReviewStock={() => navigateTo('stock')} onAddBank={(account) => mutate('finance/banks', { body: account })} onUpdateBank={(id, changes) => mutate(`finance/banks/${id}`, { method: 'PATCH', body: changes })} onSaveBankBalances={(input) => mutate('finance/banks/balances', { body: input })} onRecordBankTransaction={(id, transaction) => mutate(`finance/banks/${id}/transactions`, { body: transaction })} onCreateCheque={(cheque) => mutate('cheques', { body: cheque })} onUpdateChequeStatus={(id, status, details) => mutate(`cheques/${id}/status`, { method: 'PATCH', body: { status, ...details } })} onUpdateChequeDetails={(id, details) => mutate(`cheques/${id}/details`, { method: 'PATCH', body: details })} />
      : activePage === 'reports' ? <Reports bills={savedBills} customers={customers} database={database} token={token} permissions={user.permissions} />
      : activePage === 'settings' ? <Settings backupData={database} products={database.products} settings={database.settings} token={token} currentUserId={user.id} language={language} canManageSettings={user.role === 'admin' || hasModuleView(user.permissions, 'settings')} canEditSettings={user.role === 'admin' || hasModulePermission(user.permissions, 'settings', 'edit')} canManageLanguage={user.role === 'admin'} canViewActivity={can('activityHistory')} canExportActivity={user.role === 'admin' || hasModulePermission(user.permissions, 'activityHistory', 'export')} onSaveLanguage={saveLanguage} canBackup={user.role === 'admin' || user.permissions?.admin} onSaveSettings={(settings) => mutate('admin/settings', { method: 'PATCH', body: settings })} onImport={(backup) => mutate('admin/backup/restore', { body: { backup } })} />
      : <NewSale customers={customers} products={database.products} bills={savedBills} selectedCustomerId={selectedCustomerId} onCustomerChange={setSelectedCustomerId} onNewCustomer={can('customers') ? () => { setCustomerReturnPage('new-sale'); setCurrentPage('new-customer') } : undefined} onSaveBill={saveBill} onHoldBill={(order) => mutate('orders', { body: order })} initialDraft={resumeDraft} onDraftLoaded={() => setResumeDraft(null)} />}
    <Footer />
    {currentStatement && <AccountStatement type={currentStatement.type} statement={currentStatement.statement} onClose={() => setCurrentStatement(null)} />}
    {isSidebarOpen && <Sidebar activePage={activePage} permissions={user.permissions} role={user.role} onClose={() => closeNavigation()} onNavigate={(page) => { navigateTo(page); closeNavigation(true) }} />}
  </>
}
