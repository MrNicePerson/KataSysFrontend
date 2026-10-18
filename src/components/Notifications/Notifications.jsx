import { useEffect, useRef, useState } from 'react'
import { Archive, Bell, Check, CheckCheck, Circle, CreditCard, FileText, Package, Search, Settings2, ShieldAlert, Wallet, X } from 'lucide-react'
import { apiRequest } from '../../api/client.js'

const categoryStyle = {
  sales: { icon: FileText, className: 'bg-emerald-50 text-emerald-700' },
  stock: { icon: Package, className: 'bg-violet-50 text-violet-700' },
  payments: { icon: Wallet, className: 'bg-sky-50 text-sky-700' },
  cheques: { icon: CreditCard, className: 'bg-orange-50 text-orange-700' },
  warnings: { icon: ShieldAlert, className: 'bg-rose-50 text-rose-700' },
  activity: { icon: Settings2, className: 'bg-stone-100 text-stone-600' },
}

function relativeDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function NotificationRow({ notification, compact = false, canManage = true, onOpen, selected, onSelect, onStatus }) {
  const style = categoryStyle[notification.category] || categoryStyle.activity
  const Icon = style.icon
  const scheduled = !notification.deliveredAt
  return <article className={`group flex gap-3 ${compact ? 'px-4 py-3' : 'px-4 sm:px-5 py-4'} border-b border-[#edf0eb] ${!notification.readAt && !scheduled ? 'bg-[#f2f8f3]' : 'bg-white'} hover:bg-[#f8faf7] transition-colors`}>
    {!compact && canManage && <input aria-label={`Select ${notification.title}`} type="checkbox" checked={Boolean(selected)} onChange={() => onSelect?.(notification._id)} className="mt-3 accent-[#155b4b]" />}
    <span className={`mt-0.5 w-9 h-9 shrink-0 rounded-lg grid place-items-center ${style.className}`}><Icon size={17} strokeWidth={1.8} /></span>
    <button type="button" onClick={() => onOpen?.(notification)} className="min-w-0 flex-1 text-left cursor-pointer">
      <span className="flex items-start justify-between gap-2">
        <strong className="text-[13px] leading-5 text-[#21372e] font-semibold">{notification.title}</strong>
        {!notification.readAt && !scheduled && <Circle size={8} fill="currentColor" className="mt-1.5 shrink-0 text-[#17815e]" aria-label="Unread" />}
      </span>
      <span className="block mt-1 text-xs leading-[1.45] text-[#65736b]">{notification.message}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[10px] text-[#89938d]">
        <time dateTime={notification.scheduledAt || notification.createdAt}>{scheduled ? `Scheduled · ${relativeDate(notification.scheduledAt)}` : relativeDate(notification.createdAt)}</time>
        {notification.actorName && <><span aria-hidden="true">·</span><span>{notification.actorName}</span></>}
        {notification.priority !== 'normal' && <span className={`uppercase font-bold ${notification.priority === 'urgent' ? 'text-rose-600' : 'text-amber-700'}`}>{notification.priority}</span>}
      </span>
    </button>
    {!compact && canManage && <div className="flex items-start gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
      {!scheduled && (notification.readAt ? <button title="Mark unread" aria-label="Mark unread" onClick={() => onStatus(notification._id, 'unread')} className="grid place-items-center w-8 h-8 rounded-md text-[#748178] hover:bg-[#e9eee8]"><Circle size={15} /></button> : <button title="Mark read" aria-label="Mark read" onClick={() => onStatus(notification._id, 'read')} className="grid place-items-center w-8 h-8 rounded-md text-[#748178] hover:bg-[#e9eee8]"><Check size={15} /></button>)}
      <button title="Archive" aria-label="Archive" onClick={() => onStatus(notification._id, 'archive')} className="grid place-items-center w-8 h-8 rounded-md text-[#748178] hover:bg-[#e9eee8]"><Archive size={15} /></button>
    </div>}
  </article>
}

export function NotificationBell({ token, onViewAll, onOpenNotification, canManage = true }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState('')
  const [preferences, setPreferences] = useState({})
  const newestId = useRef(null)

  const playAlert = () => {
    try {
      const audio = new AudioContext()
      const oscillator = audio.createOscillator()
      const volume = audio.createGain()
      oscillator.frequency.value = 740
      volume.gain.value = 0.035
      oscillator.connect(volume)
      volume.connect(audio.destination)
      oscillator.start()
      oscillator.stop(audio.currentTime + 0.12)
      oscillator.onended = () => audio.close()
    } catch {}
  }

  const load = async () => {
    try {
      const data = await apiRequest('notifications?limit=8', { token })
      const topId = data.notifications?.[0]?._id
      if (newestId.current && topId && newestId.current !== topId && data.preferences?.sound) playAlert()
      newestId.current = topId || newestId.current
      setItems(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
      setPreferences(data.preferences || {})
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    void load()
    const interval = window.setInterval(load, 15000)
    return () => window.clearInterval(interval)
  }, [token])

  const markAllRead = async () => {
    if (!unreadCount) return
    await apiRequest('notifications/bulk', { token, method: 'POST', body: { action: 'read' } })
    await load()
  }

  const openItem = async (notification) => {
    if (canManage && !notification.readAt && notification.deliveredAt) {
      await apiRequest(`notifications/${notification._id}`, { token, method: 'PATCH', body: { status: 'read' } })
      setUnreadCount((count) => Math.max(0, count - 1))
    }
    setOpen(false)
    onOpenNotification(notification)
  }

  return <div className="relative">
    <button type="button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg text-[#36564a] hover:bg-[#f1f5f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287158]">
      <Bell size={20} strokeWidth={1.8} />
      {unreadCount > 0 && <span className="absolute -top-0.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center bg-[#c64b35] text-white text-[10px] leading-none font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <>
      <button aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
      <section aria-label="Recent notifications" className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(92vw,390px)] overflow-hidden rounded-xl border border-[#e1e7e1] bg-white shadow-[0_18px_48px_rgba(29,48,39,0.18)] animate-in fade-in slide-in-from-top-2 duration-150">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#edf0eb]">
          <div><h2 className="text-sm font-bold text-[#20382d]">Notifications</h2><p className="text-[11px] text-[#758179] mt-0.5">{unreadCount} unread</p></div>
          <div className="flex items-center gap-1">
            {canManage && <button type="button" onClick={markAllRead} title="Mark all as read" aria-label="Mark all as read" className="grid place-items-center w-8 h-8 rounded-md text-[#63746b] hover:bg-[#f1f5f0]"><CheckCheck size={17} /></button>}
            <button type="button" onClick={() => setOpen(false)} title="Close" aria-label="Close" className="grid place-items-center w-8 h-8 rounded-md text-[#63746b] hover:bg-[#f1f5f0]"><X size={17} /></button>
          </div>
        </header>
        <div className="max-h-[min(65vh,480px)] overflow-y-auto">
          {loading ? <div className="space-y-3 p-4" aria-label="Loading notifications">{[1, 2, 3].map((row) => <div key={row} className="flex gap-3 animate-pulse"><span className="w-9 h-9 rounded-lg bg-[#edf1ec]" /><span className="flex-1 space-y-2 py-1"><span className="block h-3 w-2/3 rounded bg-[#edf1ec]" /><span className="block h-3 w-full rounded bg-[#f2f4f1]" /></span></div>)}</div>
            : error ? <p role="alert" className="px-5 py-8 text-center text-sm text-rose-700">{error}</p>
              : items.length ? items.map((item) => <NotificationRow key={item._id} notification={item} compact onOpen={openItem} />)
                : <div className="py-10 text-center"><span className="mx-auto mb-2 grid place-items-center w-10 h-10 rounded-full bg-[#eef5ef] text-[#34765a]"><Check size={19} /></span><p className="text-sm font-semibold text-[#31473c]">You're all caught up!</p><p className="mt-1 text-xs text-[#859088]">New activity will show up here.</p></div>}
        </div>
        <button type="button" onClick={() => { setOpen(false); onViewAll() }} className="w-full py-3 border-t border-[#edf0eb] text-xs font-bold text-[#176148] hover:bg-[#f7faf7]">View all notifications</button>
      </section>
    </>}
  </div>
}

const filters = ['all', 'today', 'tomorrow', 'yesterday', 'upcoming', 'unread', 'history']

export default function NotificationsPage({ token, onOpenNotification, canManage = true }) {
  const [filter, setFilter] = useState('all')
  const [data, setData] = useState({ notifications: [], unreadCount: 0, preferences: {} })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [cursor, setCursor] = useState(null)
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')

  const load = async ({ append = false } = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter, limit: '30' })
      if (search.trim()) params.set('search', search.trim())
      if (filter === 'history' && historyFrom) params.set('from', historyFrom)
      if (filter === 'history' && historyTo) params.set('to', historyTo)
      if (append && cursor) params.set('cursor', cursor)
      const result = await apiRequest(`notifications?${params}`, { token })
      setData((current) => ({ ...result, notifications: append ? [...current.notifications, ...result.notifications] : result.notifications }))
      setCursor(result.nextCursor)
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCursor(null)
    void load()
    const interval = window.setInterval(load, 15000)
    return () => window.clearInterval(interval)
  }, [token, filter, search, historyFrom, historyTo])

  const update = async (id, status) => {
    await apiRequest(`notifications/${id}`, { token, method: 'PATCH', body: { status } })
    await load()
  }

  const bulk = async (action) => {
    if (!selected.length) return
    await apiRequest('notifications/bulk', { token, method: 'POST', body: { ids: selected, action } })
    setSelected([])
    await load()
  }

  const togglePreference = async (category, enabled) => {
    const preferences = { ...data.preferences, [category]: enabled }
    const saved = await apiRequest('notifications/preferences/categories', { token, method: 'PATCH', body: { preferences } })
    setData((current) => ({ ...current, preferences: saved }))
  }

  const openItem = async (notification) => {
    if (canManage && !notification.readAt && notification.deliveredAt) {
      await apiRequest(`notifications/${notification._id}`, { token, method: 'PATCH', body: { status: 'read' } })
    }
    onOpenNotification(notification)
  }

  const groups = data.notifications.reduce((result, notification) => {
    const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date(notification.scheduledAt || notification.createdAt))
    result[date] ||= []
    result[date].push(notification)
    return result
  }, {})

  return <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 py-6 sm:py-9">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div><p className="text-[10px] uppercase font-bold tracking-[2px] text-[#718078]">Activity center</p><h1 className="mt-1 text-2xl sm:text-[30px] font-bold text-[#173b32]">Notifications</h1><p className="mt-1 text-sm text-[#748078]">{data.unreadCount} unread notifications</p></div>
      <div className="relative w-full sm:w-[300px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829087]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search activity" className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#dfe6df] bg-white text-sm outline-none focus:border-[#47846b]" /></div>
    </div>
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[#dfe6df] mb-4" role="tablist" aria-label="Notification date filter">
      {filters.map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={`shrink-0 px-3 py-2.5 text-xs font-semibold capitalize border-b-2 ${filter === item ? 'border-[#176148] text-[#176148]' : 'border-transparent text-[#758179] hover:text-[#36564a]'}`}>{item}</button>)}
      <button type="button" title="Notification preferences" onClick={() => document.getElementById('notification-preferences')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="ml-auto grid place-items-center w-9 h-9 shrink-0 rounded-md text-[#63746b] hover:bg-[#f1f5f0]"><Settings2 size={17} /></button>
    </div>
    {filter === 'history' && <div className="flex flex-wrap items-center gap-2 mb-4"><label className="text-xs text-[#64736b]">From <input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} className="ml-1 h-9 px-2 border border-[#dfe6df] rounded-md text-xs" /></label><label className="text-xs text-[#64736b]">To <input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} className="ml-1 h-9 px-2 border border-[#dfe6df] rounded-md text-xs" /></label></div>}
    {canManage && selected.length > 0 && <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[#edf5ee]"><span className="px-2 text-xs font-semibold text-[#385b48]">{selected.length} selected</span><button onClick={() => bulk('read')} className="px-3 py-1.5 rounded-md bg-white text-xs font-semibold text-[#36564a]">Mark read</button><button onClick={() => bulk('archive')} className="px-3 py-1.5 rounded-md bg-white text-xs font-semibold text-[#36564a]">Archive</button></div>}
    <section className="overflow-hidden rounded-xl border border-[#e2e8e2] bg-white" aria-label="Notification list">
      {error ? <div role="alert" className="p-8 text-center text-sm text-rose-700">{error}</div>
        : loading && !data.notifications.length ? <div className="p-5 space-y-4 animate-pulse">{[1, 2, 3, 4].map((row) => <div key={row} className="h-14 rounded bg-[#f1f4f0]" />)}</div>
          : data.notifications.length ? Object.entries(groups).map(([date, notifications]) => <div key={date}><h2 className="px-5 py-2.5 bg-[#f8faf7] text-[10px] font-bold uppercase text-[#738078]">{date}</h2>{notifications.map((notification) => <NotificationRow key={notification._id} notification={notification} canManage={canManage} selected={selected.includes(notification._id)} onSelect={(id) => setSelected((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])} onStatus={update} onOpen={openItem} />)}</div>)
            : <div className="py-16 text-center"><span className="mx-auto mb-3 grid place-items-center w-12 h-12 rounded-full bg-[#eef5ef] text-[#34765a]"><Bell size={21} /></span><p className="text-sm font-semibold text-[#31473c]">You're all caught up!</p><p className="mt-1 text-xs text-[#859088]">No notifications match this view.</p></div>}
      {cursor && <div className="p-3 text-center border-t border-[#edf0eb]"><button disabled={loading} onClick={() => void load({ append: true })} className="px-4 py-2 rounded-md text-xs font-bold text-[#176148] hover:bg-[#f3f7f3]">Load older notifications</button></div>}
    </section>
    {canManage && <section id="notification-preferences" className="mt-8 border-t border-[#e2e8e2] pt-6">
      <h2 className="text-base font-bold text-[#20382d]">Notification preferences</h2><p className="mt-1 text-xs text-[#78847d]">Essential cheque and overdue alerts remain enabled.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">{['sales', 'stock', 'payments', 'activity'].map((category) => <label key={category} className="flex items-center justify-between gap-3 text-sm capitalize text-[#42584c]">{category}<input type="checkbox" checked={data.preferences?.[category] !== false} onChange={(event) => void togglePreference(category, event.target.checked)} className="w-4 h-4 accent-[#176148]" /></label>)}<label className="flex items-center justify-between gap-3 text-sm text-[#42584c]">Sound alerts<input type="checkbox" checked={data.preferences?.sound === true} onChange={(event) => void togglePreference('sound', event.target.checked)} className="w-4 h-4 accent-[#176148]" /></label></div>
    </section>}
  </main>
}
