import { NextResponse } from 'next/server'

import { runInvoiceDueReminderJob } from '@/lib/invoice-due-reminder-job'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Epic 13 **13.11** + Epic 15 **15C.7** — single daily maintenance entry (quote expiry RPC + invoice reminders).
 * Secure with **`Authorization: Bearer ${CRON_SECRET}`** (same secret as other scheduled callers).
 */
export async function GET(request: Request) {
  return handleDailyMaintenance(request)
}

export async function POST(request: Request) {
  return handleDailyMaintenance(request)
}

async function handleDailyMaintenance(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = request.headers.get('authorization')?.trim()
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = await createServiceRoleClient()

  let quoteExpiry: { ok: true; data: unknown } | { ok: false; message: string }
  try {
    const { data, error } = await sb.rpc('expire_sent_booking_quotes_past_due_v1')
    if (error) {
      quoteExpiry = { ok: false, message: error.message }
    } else {
      quoteExpiry = { ok: true, data }
    }
  } catch (e) {
    quoteExpiry = { ok: false, message: e instanceof Error ? e.message : String(e) }
  }

  const invoiceDueReminder = await runInvoiceDueReminderJob({ serviceSupabase: sb })

  return NextResponse.json({
    ok: true,
    quote_expiry: quoteExpiry,
    invoice_due_reminder: invoiceDueReminder,
  })
}
