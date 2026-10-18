import { CalendarClock } from 'lucide-react'

export default function SaleAccessGate({ status, onOpenDailyOpening }) {
  return <main className="mx-auto w-full max-w-[1680px] px-4 py-8 sm:px-6 lg:px-12">
    <section className="mx-auto max-w-2xl rounded-2xl border border-[#d9e2dc] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="sale-access-title">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[#eef4e8] text-[#14634f]"><CalendarClock size={24} /></div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#75877f]">Business day control</p>
      <h1 id="sale-access-title" className="mt-2 text-2xl font-bold text-[#123f35]">New sale unavailable</h1>
      <p className="mt-3 text-[#52645c]" role="alert">{status.reason}</p>
      <p className="mt-2 text-sm text-[#75877f]">Business date: {status.date}</p>
      {!status.closingCompleted && <button type="button" onClick={onOpenDailyOpening} className="mt-6 rounded-xl bg-[#14634f] px-5 py-3 font-semibold text-white hover:bg-[#0f513f] focus:outline-none focus:ring-2 focus:ring-[#14634f] focus:ring-offset-2">Open Daily Opening</button>}
    </section>
  </main>
}
