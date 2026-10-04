import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { apiRequest } from '../../api/client.js'

const permissionOptions = [
  ['sales', 'Sales & bills'],
  ['stock', 'Stock & receiving'],
  ['suppliers', 'Suppliers'],
  ['customers', 'Customer accounts'],
  ['cheques', 'Cheque register'],
  ['returns', 'Returns'],
  ['orders', 'Held orders'],
  ['finance', 'Finance & closing'],
  ['reports', 'Reports'],
  ['settings', 'Shop settings'],
]
const defaultStaffPermissions = { sales: true, stock: true, suppliers: true, customers: true, cheques: true, returns: true, orders: true, finance: false, reports: true, settings: false, admin: false }

export default function UserAdministration({ token, currentUserId }) {
  const [users, setUsers] = useState([])
  const [permissions, setPermissions] = useState(defaultStaffPermissions)
  const [newRole, setNewRole] = useState('staff')
  const [editingUserId, setEditingUserId] = useState('')
  const [permissionDraft, setPermissionDraft] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState('')
  const creatingRef = useRef(false)

  const loadUsers = async () => {
    try {
      setUsers(await apiRequest('auth/users', { token }))
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [token])

  const createUser = async (event) => {
    event.preventDefault()
    if (creatingRef.current) return
    creatingRef.current = true
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setSaving(true)
    try {
      await apiRequest('auth/users', {
        token,
        method: 'POST',
        body: {
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          role: newRole,
          permissions: newRole === 'admin' ? {} : permissions,
        },
      })
      formElement.reset()
      setNewRole('staff')
      setPermissions(defaultStaffPermissions)
      setMessage('User created.')
      await loadUsers()
    } catch (error) {
      setMessage(error.message)
    } finally {
      creatingRef.current = false
      setSaving(false)
    }
  }

  const updateUser = async (user, values) => {
    try {
      await apiRequest(`auth/users/${user.id}`, { token, method: 'PATCH', body: values })
      setMessage('User updated.')
      await loadUsers()
      return true
    } catch (error) {
      setMessage(error.message)
      return false
    }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) return
    setDeletingUserId(user.id)
    try {
      await apiRequest(`auth/users/${user.id}`, { token, method: 'DELETE' })
      setMessage('User deleted.')
      await loadUsers()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setDeletingUserId('')
    }
  }

  return (
    <section className="p-5 sm:p-7 bg-white border border-[#e2e6df] rounded-xl space-y-5">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold">Users &amp; permissions</h2>
      <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="name" placeholder="Full name" required className="h-10 px-3 rounded-lg border border-[#dfe4dc] text-sm" />
        <input name="email" type="email" placeholder="Email" required className="h-10 px-3 rounded-lg border border-[#dfe4dc] text-sm" />
        <div className="relative">
          <input name="password" type={showNewPassword ? 'text' : 'password'} minLength="12" placeholder="Temporary password (12+ characters)" required className="h-10 w-full px-3 pr-10 rounded-lg border border-[#dfe4dc] text-sm" />
          <button type="button" onClick={() => setShowNewPassword((visible) => !visible)} aria-label={showNewPassword ? 'Hide new user password' : 'Show new user password'} title={showNewPassword ? 'Hide password' : 'Show password'} className="absolute right-1 top-0.5 h-9 w-9 grid place-items-center rounded-md text-[#718078] hover:bg-[#f6f8f1]">
            {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <select name="role" value={newRole} onChange={(event) => setNewRole(event.target.value)} className="h-10 px-3 rounded-lg border border-[#dfe4dc] text-sm"><option value="staff">Staff</option><option value="admin">Administrator</option></select>
        {newRole === 'staff' ? <div className="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-2">
          {permissionOptions.map(([permission, label]) => <label key={permission} className="flex items-center gap-1.5 text-xs text-[#52645c]"><input type="checkbox" checked={Boolean(permissions[permission])} onChange={(event) => setPermissions((current) => ({ ...current, [permission]: event.target.checked }))} />{label}</label>)}
        </div> : <p className="sm:col-span-2 text-sm text-[#718078]">Administrators receive access to all areas.</p>}
        <button type="submit" disabled={saving} className="sm:col-span-2 h-10 rounded-lg bg-[#155b4b] disabled:opacity-60 text-white text-sm font-semibold">{saving ? 'Creating user…' : 'Create user'}</button>
      </form>
      {message && <p className="text-sm text-[#155b4b]" role="status">{message}</p>}
      {loading ? <p className="text-sm text-[#718078]">Loading users…</p> : <div data-keyboard-list className="divide-y divide-[#edf0eb]">
        {users.map((user) => <div key={user.id} data-keyboard-row tabIndex={0} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div><strong className="text-[#173b32]">{user.name}</strong><span className="ml-2 text-[#718078]">{user.email} · {user.role} · {user.active ? 'Active' : 'Inactive'}</span></div>
          <div className="flex gap-2">
            {user.role !== 'admin' && <button type="button" data-keyboard-primary className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] text-xs font-semibold" onClick={() => { setEditingUserId(editingUserId === user.id ? '' : user.id); setPermissionDraft({ ...user.permissions }) }}>Permissions</button>}
            <button type="button" className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] text-xs font-semibold" onClick={() => updateUser(user, { active: !user.active })}>{user.active ? 'Deactivate' : 'Activate'}</button>
            <button type="button" className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] text-xs font-semibold" onClick={() => updateUser(user, { role: user.role === 'admin' ? 'staff' : 'admin' })}>{user.role === 'admin' ? 'Make staff' : 'Make admin'}</button>
            {user.id !== currentUserId && <button type="button" disabled={deletingUserId === user.id} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold disabled:opacity-60" onClick={() => deleteUser(user)}>{deletingUserId === user.id ? 'Deleting…' : 'Delete'}</button>}
          </div>
          {editingUserId === user.id && <div className="w-full flex flex-wrap gap-x-4 gap-y-2">
            {permissionOptions.map(([permission, label]) => <label key={permission} className="flex items-center gap-1.5 text-xs text-[#52645c]"><input type="checkbox" checked={Boolean(permissionDraft[permission])} onChange={(event) => setPermissionDraft((current) => ({ ...current, [permission]: event.target.checked }))} />{label}</label>)}
            <button type="button" className="px-3 py-1.5 rounded-lg bg-[#155b4b] text-white text-xs font-semibold" onClick={async () => { if (await updateUser(user, { permissions: permissionDraft })) setEditingUserId('') }}>Save permissions</button>
          </div>}
        </div>)}
      </div>}
    </section>
  )
}
