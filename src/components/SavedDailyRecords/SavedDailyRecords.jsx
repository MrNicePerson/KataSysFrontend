import { Trash2 } from 'lucide-react'

export default function SavedDailyRecords({ records = [], onDelete }) {
  const hasDeleteAction = typeof onDelete === 'function'

  return (
    <section className="mt-8">
      <h2 className="text-[#173b32] text-xl font-bold mb-4">Saved daily records</h2>
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Date</th>
              <th className="px-4 sm:px-6 py-3.5">Record</th>
              <th className="px-4 sm:px-6 py-3.5">Expected</th>
              <th className="px-4 sm:px-6 py-3.5">Actual</th>
              <th className="px-4 sm:px-6 py-3.5">Difference</th>
              <th className="px-4 sm:px-6 py-3.5">Note</th>
              {hasDeleteAction && <th className="px-4 sm:px-6 py-3.5 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0eb]">
            {records.length ? (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-[#f8faf7]">
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{record.date}</td>
                  <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32] capitalize">{record.type}</td>
                  <td className="px-4 sm:px-6 py-4 font-medium">Rs. {record.expected.toLocaleString()}</td>
                  <td className="px-4 sm:px-6 py-4 font-medium">Rs. {record.actual.toLocaleString()}</td>
                  <td className="px-4 sm:px-6 py-4 font-bold text-[#155b4b]">Rs. {record.difference.toLocaleString()}</td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{record.note || '—'}</td>
                  {hasDeleteAction && !record.finalized && (
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`Delete ${record.type} record for ${record.date}`}
                        title="Delete daily record"
                        className="w-8 h-8 inline-grid place-items-center rounded-lg border border-[#e2e6df] text-[#718078] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (window.confirm(`Delete the ${record.type} record for ${record.date}? This cannot be undone.`)) {
                            onDelete(record.id)
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={hasDeleteAction ? 7 : 6} className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
