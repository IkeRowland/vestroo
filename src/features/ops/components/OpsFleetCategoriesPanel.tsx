'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
	createOpsVehicleCategoryAction,
	deleteOpsVehicleCategoryAction,
	updateOpsVehicleCategoryAction,
} from '@/actions/opsVehicleCategories'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OpsTableShell } from '@/features/ops/components/OpsTableShell'
import { opsFleetCategoriesCopy } from '@/features/ops/copy/ops-fleet-categories-copy'
import { createClientClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const VEHICLE_BUCKET = 'vehicles'
const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export type OpsFleetCategoryRow = {
	id: string
	name: string
	description: string
	number_of_seat: number
	image_url: string | null
	is_active: boolean
}

type CategoryFormValues = {
	name: string
	description: string
	numberOfSeat: string
	imageUrl: string | null
	isActive: boolean
}

function emptyForm(): CategoryFormValues {
	return {
		name: '',
		description: '',
		numberOfSeat: '4',
		imageUrl: null,
		isActive: true,
	}
}

function rowToForm(row: OpsFleetCategoryRow): CategoryFormValues {
	return {
		name: row.name,
		description: row.description,
		numberOfSeat: String(row.number_of_seat),
		imageUrl: row.image_url,
		isActive: row.is_active,
	}
}

export type OpsFleetCategoriesPanelProps = {
	rows: OpsFleetCategoryRow[]
}

export function OpsFleetCategoriesPanel({ rows }: OpsFleetCategoriesPanelProps) {
	const router = useRouter()
	const [busy, setBusy] = React.useState(false)
	const [banner, setBanner] = React.useState<{ variant: 'ok' | 'err'; text: string } | null>(null)
	const [showAdd, setShowAdd] = React.useState(false)
	const [editing, setEditing] = React.useState<OpsFleetCategoryRow | null>(null)
	const [deleteId, setDeleteId] = React.useState<string | null>(null)

	const closeBanner = () => setBanner(null)

	const refresh = (msg: string) => {
		setBanner({ variant: 'ok', text: msg })
		router.refresh()
	}

	const reportFailure = (message: string) => {
		setBanner({ variant: 'err', text: message })
	}

	async function confirmDelete() {
		if (!deleteId) return
		setBusy(true)
		const res = await deleteOpsVehicleCategoryAction({ id: deleteId })
		setBusy(false)
		setDeleteId(null)
		if (res.ok) {
			refresh('Category removed.')
			return
		}
		reportFailure(res.error.message)
	}

	return (
		<div className="space-y-4">
			{banner ? (
				<div
					className={cn(
						'flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm',
						banner.variant === 'ok'
							? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-100'
							: 'border-red-900/50 bg-red-950/40 text-red-100',
					)}
					role="status"
				>
					<span>{banner.text}</span>
					<button
						type="button"
						className="text-xs uppercase tracking-wide opacity-80 hover:opacity-100"
						onClick={closeBanner}
					>
						Dismiss
					</button>
				</div>
			) : null}

			<div className="flex justify-end">
				<Button
					type="button"
					size="sm"
					onClick={() => setShowAdd(true)}
					className="bg-primary text-primary-foreground hover:bg-primary/90"
				>
					Add category
				</Button>
			</div>

			{rows.length === 0 ? null : (
				<OpsTableShell caption={opsFleetCategoriesCopy.tableCaption} tableClassName="text-sm">
					<thead className="border-b border-ops-border bg-ops-surface-hover/50">
						<tr>
							<th scope="col" className="px-3 py-2 font-semibold text-ops-foreground">
								{opsFleetCategoriesCopy.columnImage}
							</th>
							<th scope="col" className="px-3 py-2 font-semibold text-ops-foreground">
								{opsFleetCategoriesCopy.columnName}
							</th>
							<th scope="col" className="px-3 py-2 font-semibold text-ops-foreground">
								{opsFleetCategoriesCopy.columnDescription}
							</th>
							<th scope="col" className="px-3 py-2 font-semibold text-ops-foreground">
								{opsFleetCategoriesCopy.columnSeats}
							</th>
							<th scope="col" className="px-3 py-2 font-semibold text-ops-foreground">
								{opsFleetCategoriesCopy.columnPublic}
							</th>
							<th scope="col" className="px-3 py-2 text-right font-semibold text-ops-foreground">
								{opsFleetCategoriesCopy.columnActions}
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={r.id} className="border-b border-ops-border/80">
								<td className="px-3 py-2">
									<div className="relative h-10 w-14 overflow-hidden rounded-md bg-ops-surface-active">
										{r.image_url?.trim() ? (
											<Image
												src={r.image_url.trim()}
												alt=""
												width={56}
												height={40}
												className="h-full w-full object-cover"
												sizes="56px"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center text-[10px] text-ops-muted">
												—
											</div>
										)}
									</div>
								</td>
								<td className="px-3 py-2 font-medium text-ops-foreground">{r.name}</td>
								<td className="max-w-md px-3 py-2 text-ops-muted">
									{r.description?.trim() ? r.description : '—'}
								</td>
								<td className="whitespace-nowrap px-3 py-2 tabular-nums text-ops-foreground">
									{r.number_of_seat}
								</td>
								<td className="px-3 py-2 text-ops-muted">{r.is_active ? 'Yes' : 'No'}</td>
								<td className="px-3 py-2 text-right">
									<div className="flex justify-end gap-2">
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="border-ops-border"
											onClick={() => setEditing(r)}
										>
											Edit
										</Button>
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="border-red-500/50 text-red-600 hover:bg-red-500/10"
											onClick={() => setDeleteId(r.id)}
										>
											Remove
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</OpsTableShell>
			)}

			{showAdd ? (
				<CategoryFormDialog
					title="Add vehicle category"
					submitLabel="Create category"
					initial={emptyForm()}
					busy={busy}
					onCancel={() => setShowAdd(false)}
					onSubmit={async (values) => {
						const seats = Number.parseInt(values.numberOfSeat, 10)
						if (!Number.isFinite(seats) || seats < 1 || seats > 80) {
							reportFailure('Seats must be between 1 and 80.')
							return false
						}
						setBusy(true)
						const res = await createOpsVehicleCategoryAction({
							name: values.name.trim(),
							description: values.description.trim() || null,
							number_of_seat: seats,
							image_url: values.imageUrl,
							is_active: values.isActive,
						})
						setBusy(false)
						if (res.ok) {
							setShowAdd(false)
							refresh('Category created.')
							return true
						}
						reportFailure(res.error.message)
						return false
					}}
				/>
			) : null}

			{editing ? (
				<CategoryFormDialog
					title="Edit vehicle category"
					submitLabel="Save changes"
					initial={rowToForm(editing)}
					busy={busy}
					onCancel={() => setEditing(null)}
					onSubmit={async (values) => {
						const seats = Number.parseInt(values.numberOfSeat, 10)
						if (!Number.isFinite(seats) || seats < 1 || seats > 80) {
							reportFailure('Seats must be between 1 and 80.')
							return false
						}
						setBusy(true)
						const res = await updateOpsVehicleCategoryAction({
							id: editing.id,
							name: values.name.trim(),
							description: values.description.trim() || null,
							number_of_seat: seats,
							image_url: values.imageUrl,
							is_active: values.isActive,
						})
						setBusy(false)
						if (res.ok) {
							setEditing(null)
							refresh('Category updated.')
							return true
						}
						reportFailure(res.error.message)
						return false
					}}
				/>
			) : null}

			<AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
				<AlertDialogContent className="border-ops-border bg-ops-surface text-ops-foreground">
					<AlertDialogHeader>
						<AlertDialogTitle>Remove this category?</AlertDialogTitle>
						<AlertDialogDescription className="text-ops-muted">
							This cannot be undone while vehicles still reference the category — reassign those
							vehicles first. Trip booking only lists active categories with enough seats.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-ops-border">Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => void confirmDelete()} disabled={busy}>
							Remove
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

type CategoryFormDialogProps = {
	title: string
	submitLabel: string
	initial: CategoryFormValues
	busy: boolean
	onCancel: () => void
	onSubmit: (values: CategoryFormValues) => Promise<boolean>
}

function CategoryFormDialog({
	title,
	submitLabel,
	initial,
	busy,
	onCancel,
	onSubmit,
}: CategoryFormDialogProps) {
	const titleId = React.useId()
	const [values, setValues] = React.useState<CategoryFormValues>(initial)
	const [error, setError] = React.useState<string | null>(null)
	const [uploading, setUploading] = React.useState(false)
	const fileRef = React.useRef<HTMLInputElement | null>(null)

	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onCancel()
			}
		}
		window.addEventListener('keydown', onKey)
		const original = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			window.removeEventListener('keydown', onKey)
			document.body.style.overflow = original
		}
	}, [onCancel])

	const update = <K extends keyof CategoryFormValues>(key: K, v: CategoryFormValues[K]) => {
		setValues((prev) => ({ ...prev, [key]: v }))
	}

	async function uploadFile(file: File): Promise<string | null> {
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			setError('Use JPEG, PNG, WebP or AVIF.')
			return null
		}
		if (file.size > MAX_IMAGE_BYTES) {
			setError('Image is too large (max 6MB).')
			return null
		}
		const supabase = createClientClient()
		const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
		const filename = `categories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
		const { error: uploadError } = await supabase.storage
			.from(VEHICLE_BUCKET)
			.upload(filename, file, { upsert: false, cacheControl: '3600' })
		if (uploadError) {
			setError(`Upload failed: ${uploadError.message}`)
			return null
		}
		const { data } = supabase.storage.from(VEHICLE_BUCKET).getPublicUrl(filename)
		return data.publicUrl
	}

	async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		e.target.value = ''
		if (!file) return
		setError(null)
		setUploading(true)
		const url = await uploadFile(file)
		setUploading(false)
		if (url) update('imageUrl', url)
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		if (!values.name.trim()) {
			setError('Name is required.')
			return
		}
		const ok = await onSubmit(values)
		if (!ok) return
	}

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onCancel()
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="w-full max-w-lg overflow-y-auto rounded-lg border border-ops-border bg-ops-surface p-6 shadow-xl"
				style={{ maxHeight: 'calc(100vh - 2rem)' }}
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
							{title}
						</h2>
						<p className="mt-1 text-sm text-ops-muted">{opsFleetCategoriesCopy.formSubtitle}</p>
					</div>
					<button
						type="button"
						className="rounded-md p-1 text-ops-muted hover:bg-ops-surface-hover hover:text-ops-foreground"
						onClick={onCancel}
						aria-label="Close"
					>
						<span aria-hidden>×</span>
					</button>
				</div>

				<form onSubmit={(ev) => void handleSubmit(ev)} className="mt-5 space-y-4">
					{error ? (
						<div
							className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-100"
							role="alert"
						>
							{error}
						</div>
					) : null}

					<div className="space-y-1.5">
						<Label htmlFor="cat-name">Name</Label>
						<Input
							id="cat-name"
							value={values.name}
							onChange={(e) => update('name', e.target.value)}
							disabled={busy}
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="cat-desc">Description</Label>
						<Textarea
							id="cat-desc"
							value={values.description}
							onChange={(e) => update('description', e.target.value)}
							className="min-h-[80px]"
							disabled={busy}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="cat-seats">Passenger seats (capacity)</Label>
						<Input
							id="cat-seats"
							type="number"
							min={1}
							max={80}
							value={values.numberOfSeat}
							onChange={(e) => update('numberOfSeat', e.target.value)}
							disabled={busy}
							required
						/>
					</div>

					<div className="flex items-center gap-2">
						<input
							id="cat-active"
							type="checkbox"
							checked={values.isActive}
							onChange={(e) => update('isActive', e.target.checked)}
							disabled={busy}
							className="h-4 w-4 rounded border-ops-border"
						/>
						<Label htmlFor="cat-active" className="text-sm font-normal text-ops-muted">
							{opsFleetCategoriesCopy.publicCatalogLabel}
						</Label>
					</div>

					<div className="space-y-2 rounded-lg border border-ops-border bg-ops-surface/40 p-4">
						<Label>Category image</Label>
						<p className="text-xs text-ops-muted">{opsFleetCategoriesCopy.imageHelp}</p>
						<div className="flex flex-wrap items-center gap-3">
							{values.imageUrl ? (
								<div className="relative">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={values.imageUrl}
										alt=""
										className="h-24 w-32 rounded-md object-cover"
									/>
									<button
										type="button"
										className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
										onClick={() => update('imageUrl', null)}
										disabled={busy}
									>
										Remove
									</button>
								</div>
							) : (
								<div className="flex h-24 w-32 items-center justify-center rounded-md border border-dashed border-ops-border text-xs text-ops-muted">
									No image
								</div>
							)}
							<input
								ref={fileRef}
								type="file"
								accept="image/jpeg,image/png,image/webp,image/avif"
								className="hidden"
								onChange={(e) => void onFile(e)}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="border-ops-border"
								onClick={() => fileRef.current?.click()}
								disabled={busy || uploading}
							>
								{uploading ? 'Uploading…' : values.imageUrl ? 'Replace image' : 'Upload image'}
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap justify-end gap-2 border-t border-ops-border pt-4">
						<Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={busy || uploading}
							className="bg-primary text-primary-foreground hover:bg-primary/90"
						>
							{busy ? 'Saving…' : submitLabel}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
