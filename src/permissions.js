export const permissionGroups = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { key: 'sales', label: 'Sales / New Sale', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'financialView'] },
  { key: 'purchases', label: 'Purchases / Receive Stock', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'financialView'] },
  { key: 'stock', label: 'Products & Inventory', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { key: 'customers', label: 'Customers', actions: ['view', 'create', 'edit', 'delete', 'financialView', 'export'] },
  { key: 'suppliers', label: 'Suppliers', actions: ['view', 'create', 'edit', 'delete', 'financialView', 'export'] },
  { key: 'finance', label: 'Payments & Finance', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'financialView'] },
  { key: 'cheques', label: 'Cheque Management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { key: 'dailyClosing', label: 'Daily Open & Closing', actions: ['view', 'dailyOpeningCreate', 'dailyClosingCreate', 'dailyOpeningEdit', 'dailyClosingEdit', 'bankBalances', 'cashManagement', 'chequeRecords', 'chequeUpdates', 'withdrawals', 'dailyHistory', 'financialExport', 'closingApprove'] },
  { key: 'reports', label: 'Reports & Analytics', actions: ['view', 'export', 'financialView'] },
  { key: 'returns', label: 'Returns', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { key: 'activityHistory', label: 'Activity History', actions: ['view', 'export'] },
  { key: 'notifications', label: 'Notifications', actions: ['view', 'manage'] },
  { key: 'settings', label: 'Settings', actions: ['view', 'edit', 'manage'] },
  { key: 'users', label: 'Users & Permissions', actions: ['view', 'create', 'edit', 'delete', 'manage'] },
  { key: 'orders', label: 'Orders & Held Bills', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { key: 'claims', label: 'Claims', actions: ['view', 'create', 'edit', 'approve'] },
]

const legacyFallback = { dashboard: 'reports', purchases: 'stock', dailyClosing: 'finance', claims: 'stock' }
const actionKey = (module, action) => module === 'dailyClosing' && action !== 'view'
  ? action
  : `${module}${action[0].toUpperCase()}${action.slice(1)}`

export function hasModulePermission(permissions, module, action = 'view') {
  if (permissions?.admin) return true
  if (action !== 'view' && permissions?.[actionKey(module, 'view')] === false) return false
  const key = actionKey(module, action)
  if (typeof permissions?.[key] === 'boolean') return permissions[key]
  if (typeof permissions?.[module] === 'boolean') return permissions[module]
  if (module === 'notifications') return true
  const fallback = legacyFallback[module]
  return fallback ? Boolean(permissions?.[fallback]) : false
}

export function hasModuleView(permissions, module) {
  if (permissions?.admin) return true
  const group = permissionGroups.find((entry) => entry.key === module)
  if (group && group.actions.some((action) => typeof permissions?.[actionKey(module, action)] === 'boolean')) {
    return hasModulePermission(permissions, module, 'view')
  }
  return hasModulePermission(permissions, module, 'view')
}

export function createPermissionDraft(permissions = {}) {
  const draft = { ...permissions }
  for (const group of permissionGroups) {
    const fallback = hasModulePermission(permissions, group.key, 'view')
    for (const action of group.actions) {
      const key = actionKey(group.key, action)
      if (typeof draft[key] !== 'boolean') draft[key] = action === 'view' ? fallback : hasModulePermission(permissions, group.key, action) || fallback
    }
  }
  return draft
}

export function permissionKey(module, action) {
  return actionKey(module, action)
}
