export default function ActivityHistory({ entries = [] }) {
  return (
    <section className="mt-8">
      <h2 className="text-[#173b32] text-xl font-bold mb-4">Activity history</h2>
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Time</th>
              <th className="px-4 sm:px-6 py-3.5">Action</th>
              <th className="px-4 sm:px-6 py-3.5">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0eb]">
            {entries.length ? (
              [...entries]
                .reverse()
                .slice(0, 100)
                .map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#f8faf7]">
                    <td className="px-4 sm:px-6 py-4 text-[#718078]">
                      {new Date(entry.date || entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">{entry.description}</td>
                    <td className="px-4 sm:px-6 py-4 text-[#718078]">{entry.referenceId || '—'}</td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="3" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
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
