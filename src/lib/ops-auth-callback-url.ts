import { absoluteUrl } from '@/lib/site-url'

/** Canonical Supabase `redirectTo` for ops team invite / recovery links. */
export function opsAuthCallbackUrl(): string {
	return absoluteUrl('/ops/auth/callback')
}
