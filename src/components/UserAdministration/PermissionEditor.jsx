import { useMemo, useState } from 'react'
import { CheckCheck, Search, ShieldCheck, X } from 'lucide-react'
import { permissionGroups, permissionKey } from '../../permissions.js'

const actionLabels = {
  view: 'View',
  create: 'Create / Add',
  edit: 'Edit / Update',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export / Print',
  financialView: 'View financial details',
  manage: 'Manage settings',
  dailyOpeningCreate: 'Daily Opening',
  dailyClosingCreate: 'Daily Closing',
  dailyOpeningEdit: 'Edit Opening',
  dailyClosingEdit: 'Edit Closing',
  bankBalances: 'Bank Balances',
  cashManagement: 'Cash Management',
  chequeRecords: 'Cheque Records',
  chequeUpdates: 'Cheque Updates',
  withdrawals: 'Withdrawals',
  dailyHistory: 'View History',
  financialExport: 'Export financial reports',
  closingApprove: 'Approve / Reopen',
}

export function permissionCount(permissions = {}) {
  return permissionGroups.reduce((total, group) => total + group.actions.filter((action) => permissions[permissionKey(group.key, action)] === true).length, 0)
}

export default function PermissionEditor({ value, onChange, compact = false }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const groups = useMemo(() => permissionGroups.map((group) => ({
    ...group,
    actions: group.actions.filter((action) => !query || group.label.toLowerCase().includes(query) || (actionLabels[action] || action).toLowerCase().includes(query)),
  })).filter((group) => group.actions.length), [query])

  const setGroup = (group, enabled) => {
    if (group.key === 'users') return
    const next = { ...value, [group.key]: enabled }
    const allActions = permissionGroups.find((entry) => entry.key === group.key)?.actions || group.actions
    for (const action of allActions) next[permissionKey(group.key, action)] = enabled
    onChange(next)
  }

  const setAction = (group, action, enabled) => {
    if (group.key === 'users') return
    const next = { ...value, [permissionKey(group.key, action)]: enabled }
    const allActions = permissionGroups.find((entry) => entry.key === group.key)?.actions || group.actions
    next[group.key] = allActions.some((key) => next[permissionKey(group.key, key)] === true)
    onChange(next)
  }

  const readOnly = () => {
    const next = { ...value }
    for (const group of permissionGroups) {
      if (group.key === 'users') {
        next[group.key] = false
        for (const action of group.actions) next[permissionKey(group.key, action)] = false
        continue
      }
      for (const action of group.actions) next[permissionKey(group.key, action)] = action === 'view'
      next[group.key] = group.actions.includes('view')
    }
    next.admin = false
    onChange(next)
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="relative min-w-[210px] flex-1"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#829087]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a module or permission" className="w-full h-9 pl-8 pr-3 rounded-md border border-[#dfe6df] text-xs" /></label>
      {!compact && <button type="button" onClick={readOnly} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#dfe6df] text-xs font-semibold text-[#52645c] hover:bg-[#f7faf7]"><ShieldCheck size={14} />Read only preset</button>}
      <span className="text-[11px] font-semibold text-[#176148]">{permissionCount(value)} enabled</span>
    </div>
    <div className="space-y-2">
      {groups.map((group) => <details key={group.key} open={Boolean(query)} className="rounded-lg border border-[#e2e8e2] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-bold text-[#31473c]">
          <span>{group.label}</span>
          <span className="flex items-center gap-2"><span className="text-[10px] font-medium text-[#819087]">{group.actions.filter((action) => value[permissionKey(group.key, action)]).length}/{group.actions.length}</span>{group.key === 'users' ? <span className="text-[10px] font-medium text-[#819087]">Administrator role required</span> : <span className="flex gap-1"><button type="button" title={`Select all ${group.label}`} aria-label={`Select all ${group.label}`} onClick={(event) => { event.preventDefault(); setGroup(group, true) }} className="grid place-items-center w-7 h-7 rounded text-[#176148] hover:bg-[#edf5ee]"><CheckCheck size={14} /></button><button type="button" title={`Deselect all ${group.label}`} aria-label={`Deselect all ${group.label}`} onClick={(event) => { event.preventDefault(); setGroup(group, false) }} className="grid place-items-center w-7 h-7 rounded text-[#718078] hover:bg-[#f2f4f1]"><X size={14} /></button></span>}</span>
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-2 px-3 pb-3">
          {group.actions.map((action) => {
            const key = permissionKey(group.key, action)
            return <label key={key} className="flex min-h-7 items-center gap-2 text-[11px] text-[#52645c]"><input type="checkbox" disabled={group.key === 'users'} checked={value[key] === true} onChange={(event) => setAction(group, action, event.target.checked)} className="h-4 w-4 accent-[#176148]" />{actionLabels[action] || action}</label>
          })}
        </div>
      </details>)}
      {!groups.length && <p className="py-5 text-center text-xs text-[#819087]">No permissions match that search.</p>}
    </div>
  </div>
}
