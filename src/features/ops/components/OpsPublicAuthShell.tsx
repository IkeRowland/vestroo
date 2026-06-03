import { marketingHeroVideoSrc } from '@/content/marketing-chrome'

/**
 * Full-viewport drone video behind public ops auth routes (login, invite callback, set password).
 */
export function OpsPublicAuthShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="relative flex min-h-screen w-full flex-col items-center justify-center">
			<video
				className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
				autoPlay
				loop
				muted
				playsInline
				aria-hidden
			>
				<source src={marketingHeroVideoSrc} type="video/mp4" />
			</video>
			<div className="pointer-events-none fixed inset-0 z-[1] bg-black/50" aria-hidden />
			<div className="relative z-10 flex w-full min-w-0 flex-col items-center">{children}</div>
		</div>
	)
}
