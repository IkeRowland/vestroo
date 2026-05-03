import type { SaasTheme } from '@/components/saas/saas-theme'

export function saasCls(theme: SaasTheme, ops: string, account: string): string {
	return theme === 'ops' ? ops : account
}
