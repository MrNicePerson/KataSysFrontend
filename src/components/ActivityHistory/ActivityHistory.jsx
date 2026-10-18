import { useEffect, useState } from 'react'
import { CalendarDays, CircleAlert, Download, FileClock, LogIn, LogOut, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { apiRequest } from '../../api/client.js'

const actions = ['Created', 'Updated', 'Deleted', 'Login', 'Logout', 'Activity']

const dateRange = (preset) => {
  if (preset === 'all' || preset === 'custom') return { from: '', to: '' }
  const today = new Date()
  const format = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  const to = new Date(today)
  const from = new Date(today)
  if (preset === 'yesterday') from.setDate(from.getDate() - 1)
  if (preset === 'yesterday') to.setDate(to.getDate() - 1)
  if (preset === '7days') from.setDate(from.getDate() - 6)
  if (preset === '30days') from.setDate(from.getDate() - 29)
  return { from: format(from), to: format(to) }
}

function activityIcon(action) {
  if (action === 'Created') return [Plus, 'bg-emerald-50 text-emerald-700']
  if (action === 'Updated') return [Pencil, 'bg-sky-50 text-sky-700']
  if (action === 'Deleted') return [Trash2, 'bg-rose-50 text-rose-700']
  if (action === 'Login') return [LogIn, 'bg-blue-50 text-blue-700']
  if (action === 'Logout') return [LogOut, 'bg-orange-50 text-orange-700']
  return [FileClock, 'bg-stone-100 text-stone-600']
}

export default function ActivityHistory({ token, canExport = false }) {
  const [entries, setEntries] = useState([])
  const [facets, setFacets] = useState({ users: [], modules: [], actions: [] })
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState(null)
  const [preset, setPreset] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const load = async ({ append = false, cursor = nextCursor } = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (userId) params.set('userId', userId)
      if (action) params.set('action', action)
      if (module) params.set('module', module)
      if (search.trim()) params.set('search', search.trim())
      if (append && cursor) params.set('cursor', cursor)
      const result = await apiRequest(`admin/audit?${params}`, { token })
      setEntries((current) => append ? [...current, ...result.activities] : result.activities)
      setTotal(result.total || 0)
      setNextCursor(result.nextCursor || null)
      setFacets({ users: result.users || [], modules: result.modules || [], actions: result.actions || [] })
      setError('')
    } catch (issue) {
      setError(issue.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load({ append: false, cursor: null }) }, search ? 250 : 0)
    return () => window.clearTimeout(timeout)
  }, [token, from, to, userId, action, module, search])

  const choosePreset = (value) => {
    setPreset(value)
    if (value !== 'custom') {
      const range = dateRange(value)
      setFrom(range.from)
      setTo(range.to)
    }
  }

  const clearFilters = () => {
    setPreset('all')
    setFrom('')
    setTo('')
    setUserId('')
    setAction('')
    setModule('')
    setSearch('')
  }

  const exportHistory = async () => {
    setExporting(true)
    try {
      const exported = []
      let cursor = null
      do {
        const params = new URLSearchParams({ limit: '100', export: 'true' })
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        if (userId) params.set('userId', userId)
        if (action) params.set('action', action)
        if (module) params.set('module', module)
        if (search.trim()) params.set('search', search.trim())
        if (cursor) params.set('cursor', cursor)
        const result = await apiRequest(`admin/audit?${params}`, { token })
        exported.push(...result.activities)
        cursor = result.nextCursor
      } while (cursor)
      const rows = [
        ['Time', 'Username', 'Activity', 'Module', 'Description', 'Record ID'],
        ...exported.map((entry) => [entry.date, entry.userName, entry.action, entry.module, entry.description, entry.referenceId]),
      ]
      const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'activity-history.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (issue) {
      setError(issue.message)
    } finally {
      setExporting(false)
    }
  }

  const showLess = () => {
    setEntries((current) => current.slice(0, 10))
    setNextCursor(total > 10 ? 'more' : null)
    if (total > 10) void load({ append: false, cursor: null })
  }

  return <section className="mt-8">
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div><h2 className="text-[#173b32] text-xl font-bold">Activity history</h2><p className="mt-1 text-xs text-[#718078]">{total.toLocaleString()} matching activities</p></div>
      <div className="flex gap-2">{canExport && <button type="button" disabled={exporting || !total} onClick={() => void exportHistory()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#dfe6df] bg-white text-xs font-semibold text-[#52645c] disabled:opacity-50"><Download size={14} />{exporting ? 'Exporting…' : 'Export CSV'}</button>}<button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#dfe6df] bg-white text-xs font-semibold text-[#52645c] hover:bg-[#f7faf7]"><X size={14} />Clear filters</button></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2 mb-3">
      <label className="relative xl:col-span-2"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#829087]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Invoice, user, record ID, description" className="w-full h-9 pl-8 pr-3 rounded-md border border-[#dfe6df] text-xs" /></label>
      <select aria-label="Activity date range" value={preset} onChange={(event) => choosePreset(event.target.value)} className="h-9 px-2 rounded-md border border-[#dfe6df] bg-white text-xs"><option value="all">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7days">Last 7 days</option><option value="30days">Last 30 days</option><option value="custom">Custom range</option></select>
      <select aria-label="Activity user" value={userId} onChange={(event) => setUserId(event.target.value)} className="h-9 px-2 rounded-md border border-[#dfe6df] bg-white text-xs"><option value="">All users</option>{facets.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
      <select aria-label="Activity type" value={action} onChange={(event) => setAction(event.target.value)} className="h-9 px-2 rounded-md border border-[#dfe6df] bg-white text-xs"><option value="">All activity types</option>{[...new Set([...actions, ...facets.actions])].map((value) => <option key={value}>{value}</option>)}</select>
      <select aria-label="Activity module" value={module} onChange={(event) => setModule(event.target.value)} className="h-9 px-2 rounded-md border border-[#dfe6df] bg-white text-xs"><option value="">All modules</option>{facets.modules.map((value) => <option key={value}>{value}</option>)}</select>
    </div>
    {preset === 'custom' && <div className="flex flex-wrap gap-2 mb-3"><label className="inline-flex items-center gap-2 text-xs text-[#65736b]"><CalendarDays size={14} />From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /></label><label className="inline-flex items-center gap-2 text-xs text-[#65736b]">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /></label></div>}
    <div className="overflow-hidden rounded-lg border border-[#e2e8e2] bg-white">
      {error ? <p role="alert" className="p-6 text-sm text-rose-700">{error}</p>
        : loading && !entries.length ? <div className="p-4 space-y-3 animate-pulse">{[1, 2, 3].map((item) => <div key={item} className="h-12 rounded bg-[#f1f4f0]" />)}</div>
          : entries.length ? <div className="divide-y divide-[#edf0eb]">{entries.map((entry) => {
            const [Icon, color] = activityIcon(entry.action)
            const expanded = expandedId === entry.id
            return <article key={entry.id} className="px-3 sm:px-4 py-3 hover:bg-[#fafbf9]">
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? '' : entry.id)} className="w-full flex items-start gap-3 text-left">
                <span className={`mt-0.5 grid place-items-center w-8 h-8 shrink-0 rounded-md ${color}`}><Icon size={15} /></span>
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="text-xs font-bold text-[#263b30]">{entry.action}</strong><span className="text-[10px] font-semibold text-[#176148]">{entry.module}</span><span className="text-[10px] text-[#7b877f]">{entry.userName}</span></span><span className="block mt-1 text-xs leading-5 text-[#52645c]">{entry.description}</span></span>
                <time className="shrink-0 text-right text-[10px] leading-4 text-[#87928a]">{new Date(entry.date).toLocaleDateString()}<span className="block">{new Date(entry.date).toLocaleTimeString()}</span></time>
              </button>
              {expanded && <div className="ml-11 mt-2 p-3 rounded-md bg-[#f8faf7] text-[11px] text-[#65736b]"><div>Record ID: <strong className="font-mono font-medium text-[#354a3e]">{entry.referenceId || '—'}</strong></div><div className="mt-1">Activity type: {entry.type}</div>{entry.details && <pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(entry.details, null, 2)}</pre>}</div>}
            </article>
          })}</div>
            : <div className="py-12 text-center"><CircleAlert size={20} className="mx-auto mb-2 text-[#819087]" /><p className="text-sm font-semibold text-[#42584c]">No activities match these filters.</p><p className="mt-1 text-xs text-[#87928a]">Clear one or more filters to see more results.</p></div>}
      {!error && entries.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0eb] px-3 py-3"><span className="text-[11px] text-[#7b877f]">Showing {entries.length} of {total.toLocaleString()}</span><div className="flex gap-2">{entries.length > 10 && <button type="button" onClick={showLess} className="h-8 px-3 rounded-md border border-[#dfe6df] text-xs font-semibold text-[#52645c]">Show less</button>}{nextCursor && <button type="button" disabled={loading} onClick={() => void load({ append: true })} className="h-8 px-3 rounded-md bg-[#155b4b] text-xs font-bold text-white disabled:opacity-50">{loading ? 'Loading…' : 'See more'}</button>}</div></footer>}
    </div>
  </section>
}
