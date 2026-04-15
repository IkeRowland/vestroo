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
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-ops-page-title text-ops-foreground">Experience bookings</h1>
        <p className="mt-1 text-sm text-ops-muted">
          Recent web bookings with{' '}
          <code className="rounded bg-muted px-1 font-mono text-sm text-ops-foreground">
            booking_intent = experience_package
          </code>
          . Read-only list (VST-10).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-ops-border bg-ops-surface shadow-sm">
        <table className="min-w-full text-left text-sm text-ops-foreground">
          <thead className="bg-muted/80 text-xs font-semibold uppercase tracking-wide text-ops-muted">
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
                <td colSpan={6} className="px-3 py-8 text-center text-ops-muted">
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
                    className="border-t border-ops-border odd:bg-muted/40"
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
                        className="text-xs text-primary hover:underline"
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
