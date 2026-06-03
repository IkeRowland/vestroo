import { Suspense } from 'react'

import { OpsAuthCallbackClient } from '@/features/ops/components/OpsAuthCallbackClient'
import { OpsPublicAuthPage } from '@/features/ops/components/OpsPublicAuthPage'
import { opsAuthCallbackCopy } from '@/features/ops/copy/ops-auth-callback-copy'

const C = opsAuthCallbackCopy

export default function OpsAuthCallbackPage() {
	return (
		<OpsPublicAuthPage title={C.pageTitle} subtitle={C.subtitle}>
			<Suspense
				fallback={
					<p className="text-center text-sm text-ops-muted" aria-live="polite">
						{C.loading}
					</p>
				}
			>
				<OpsAuthCallbackClient />
			</Suspense>
		</OpsPublicAuthPage>
	)
}
