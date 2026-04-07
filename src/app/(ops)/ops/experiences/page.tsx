import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

type ExperienceBookingRow = {
  id: string
  payment_reference: string | null
  created_at: string
  booking_metadata: Record<string, unknown> | null
  total_amount: number | string | null
  customer_name: string | null
}

function metaString(meta: Record<string, unknown> | null, key: string): string {
  if (!meta) {
    return '—'
  }
  const v = meta[key]
  if (v == null) {
    return '—'
  }
  return String(v)
}

export default async function OpsExperiencesPage() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, payment_reference, created_at, booking_metadata, total_amount, customer_name, booking_intent'
    )
    .eq('booking_intent', 'experience_package')
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as ExperienceBookingRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Experience bookings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Recent web bookings with{' '}
          <code className="rounded bg-zinc-800 px-1">booking_intent = experience_package</code>.
          Read-only list (VST-10).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full text-left text-sm text-zinc-200">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Package id</th>
              <th className="px-3 py-2">Total (ZAR)</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  No experience package bookings yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const total =
                  row.total_amount != null ? Number(row.total_amount) : null
                return (
                  <tr
                    key={row.id}
                    className="border-t border-zinc-800 odd:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString('en-ZA')}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.payment_reference ?? '—'}
                    </td>
                    <td className="px-3 py-2 max-w-[10rem] truncate">
                      {row.customer_name ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {metaString(row.booking_metadata, 'experience_package_id')}
                    </td>
                    <td className="px-3 py-2">
                      {total != null && Number.isFinite(total)
                        ? total.toFixed(2)
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/ops/search`}
                        className="text-teal-400 hover:underline text-xs"
                      >
                        Search
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
