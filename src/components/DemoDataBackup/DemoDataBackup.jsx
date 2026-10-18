import { useRef, useState } from 'react'
import { validateBackup } from '../../data/businessLogic.js'

export default function DemoDataBackup({ backupData, onImport, onReset }) {
  const fileInput = useRef(null)
  const [message, setMessage] = useState('')

  const exportBackup = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'abbas-textile-backup.json'
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Backup downloaded.')
  }

  const importBackup = async (event) => {
    const [file] = event.target.files ?? []
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      const restored = await onImport(validateBackup(data))
      if (!restored) {
        setMessage('The server did not restore this backup. Check your permissions and try again.')
        return
      }
      setMessage('Backup imported.')
    } catch (error) {
      setMessage(error.message || 'Could not read this backup file.')
    }
    event.target.value = ''
  }

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">
        Data backup &amp; restore
      </h2>
      <p className="text-xs sm:text-sm text-[#718078]">
        Export a copy of the shop database or restore a previously exported backup. Restoring replaces the server data.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-11 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
          onClick={exportBackup}
        >
          Export backup
        </button>
        <button
          type="button"
          className="h-11 rounded-xl border border-[#dfe4dc] bg-white hover:bg-[#f6f8f1] text-[#173b32] text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-98"
          onClick={() => fileInput.current?.click()}
        >
          Import backup
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={importBackup} hidden />
      </div>

      {message && (
        <p className="p-3 rounded-xl bg-[#eaf3e7] text-[#155b4b] text-xs sm:text-sm font-medium" role="status">
          {message}
        </p>
      )}

    </section>
  )
}
