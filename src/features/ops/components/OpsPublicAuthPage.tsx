import Image from 'next/image'
import Link from 'next/link'

import { opsLoginCopy } from '@/features/ops/copy/ops-login-copy'

const brand = opsLoginCopy

type OpsPublicAuthPageProps = {
	title: string
	subtitle?: string
	hint?: string
	children: React.ReactNode
	footer?: React.ReactNode
}

export function OpsPublicAuthPage({ title, subtitle, hint, children, footer }: OpsPublicAuthPageProps) {
	return (
		<main className="flex w-full flex-col items-center px-4 py-12">
			<div className="flex w-full max-w-md flex-col items-center">
				<div className="mb-8 flex justify-center">
					<Link
						href={brand.backToSiteHref}
						className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface"
						aria-label={brand.brandAria}
					>
						<Image
							src="/images/vestro-logo.png"
							alt=""
							width={180}
							height={90}
							className="h-auto w-[11.25rem] max-w-full object-contain sm:w-[12.5rem]"
							priority
						/>
					</Link>
				</div>

				<div className="w-full rounded-ops-card border border-ops-border bg-ops-surface p-6 shadow-ops-2">
					<header className="text-center">
						<h1 className="text-ops-page-title text-ops-foreground">{title}</h1>
						{subtitle ? (
							<p className="mt-1 text-sm font-medium text-ops-accent">{subtitle}</p>
						) : null}
						{hint ? <p className="mt-2 text-sm text-ops-muted">{hint}</p> : null}
					</header>

					<div className="mt-6">{children}</div>

					{footer ? <div className="mt-6 border-t border-ops-border pt-4">{footer}</div> : null}
				</div>
			</div>
		</main>
	)
}
