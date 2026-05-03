export { e2eServiceSupabase as epic13ServiceClient } from './supabase-e2e-service-client'

import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveProfileIdByEmail(
	svc: SupabaseClient,
	email: string,
): Promise<string | null> {
	const trimmed = email.trim()
	const { data, error } = await svc.from('profiles').select('id').eq('email', trimmed).maybeSingle()
	if (error || !data?.id) return null
	return data.id as string
}
