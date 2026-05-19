'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn('fixed inset-0 z-50 bg-black/50', className)}
		{...props}
	/>
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

/** Google Places dropdown is portaled to `body` — ignore outside-dismiss so picks reach `place_changed`. */
function isGooglePlacesDropdownTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false
	return Boolean(target.closest('.pac-container'))
}

function swallowIfPlacesDropdown(e: { preventDefault: () => void }, target: EventTarget | null): void {
	if (!isGooglePlacesDropdownTarget(target)) return
	e.preventDefault()
}

const SheetContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
		side?: 'right' | 'left'
		/** When false, omit the default corner close (e.g. **`OpsDetailRail`** supplies header close). */
		showCloseButton?: boolean
	}
>(
	(
		{
			side = 'right',
			className,
			children,
			showCloseButton = true,
			onPointerDownOutside,
			onInteractOutside,
			onFocusOutside,
			...props
		},
		ref,
	) => (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Content
				ref={ref}
				onPointerDownOutside={(e) => {
					swallowIfPlacesDropdown(e, e.target)
					onPointerDownOutside?.(e)
				}}
				onInteractOutside={(e) => {
					swallowIfPlacesDropdown(e, e.target)
					onInteractOutside?.(e)
				}}
				onFocusOutside={(e) => {
					const rel = (e as { relatedTarget?: EventTarget | null }).relatedTarget ?? null
					swallowIfPlacesDropdown(e, rel)
					swallowIfPlacesDropdown(e, e.target)
					onFocusOutside?.(e)
				}}
				className={cn(
					'fixed z-50 flex h-full w-full max-w-md flex-col border-ops-border bg-ops-surface shadow-ops-2 outline-none',
					side === 'right' ? 'right-0 top-0 border-l' : 'left-0 top-0 border-r',
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton ? (
					<DialogPrimitive.Close
						className="absolute right-3 top-3 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-ops-muted ring-offset-ops-canvas transition hover:bg-ops-surface-hover hover:text-ops-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2"
						aria-label="Close"
					>
						<X className="h-5 w-5" aria-hidden />
					</DialogPrimitive.Close>
				) : null}
			</DialogPrimitive.Content>
		</SheetPortal>
	),
)
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('border-b border-ops-border px-4 py-3 pr-12', className)} {...props} />
)

const SheetTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn('text-base font-semibold text-ops-foreground', className)}
		{...props}
	/>
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetPortal,
}
