'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
	createOpsExperiencePackageAction,
	deactivateOpsExperiencePackageAction,
	updateOpsExperiencePackageAction,
} from '@/actions/opsExperiencePackages'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'

export type OpsExperiencePackageCategoryOption = { id: string; name: string }

export type OpsExperiencePackageRow = {
	id: string
	slug: string
	title: string
	description: string | null
	base_price_zar: number
	per_passenger_increment_zar: number
	included_passengers: number
	default_vehicle_category_id: string | null
	estimated_duration_minutes: number | null
	is_active: boolean
}

type OpsExperiencePackagesPanelProps = {
	packages: OpsExperiencePackageRow[]
	categories: OpsExperiencePackageCategoryOption[]
}

function FieldLabel({ children }: { children: React.ReactNode }) {
	return <span className="text-xs font-medium text-ops-muted">{children}</span>
}

export function OpsExperiencePackagesPanel({
	packages,
	categories,
}: OpsExperiencePackagesPanelProps) {
	const router = useRouter()
	const [busy, setBusy] = React.useState(false)
	const [banner, setBanner] = React.useState<{ variant: 'ok' | 'err'; text: string } | null>(null)
	const [showAdd, setShowAdd] = React.useState(false)
	const [editingId, setEditingId] = React.useState<string | null>(null)
	const [deactivateId, setDeactivateId] = React.useState<string | null>(null)

	const [addSlug, setAddSlug] = React.useState('')
	const [addTitle, setAddTitle] = React.useState('')
	const [addDesc, setAddDesc] = React.useState('')
	const [addBase, setAddBase] = React.useState('4490')
	const [addPerPass, setAddPerPass] = React.useState('0')
	const [addIncluded, setAddIncluded] = React.useState('2')
	const [addCategory, setAddCategory] = React.useState('')
	const [addDuration, setAddDuration] = React.useState('')

	const [editSlug, setEditSlug] = React.useState('')
	const [editTitle, setEditTitle] = React.useState('')
	const [editDesc, setEditDesc] = React.useState('')
	const [editBase, setEditBase] = React.useState('')
	const [editPerPass, setEditPerPass] = React.useState('')
	const [editIncluded, setEditIncluded] = React.useState('')
	const [editCategory, setEditCategory] = React.useState('')
	const [editDuration, setEditDuration] = React.useState('')
	const [editActive, setEditActive] = React.useState(true)

	React.useEffect(() => {
		if (!editingId) return
		const p = packages.find((x) => x.id === editingId)
		if (!p) return
		setEditSlug(p.slug)
		setEditTitle(p.title)
		setEditDesc(p.description ?? '')
		setEditBase(String(p.base_price_zar))
		setEditPerPass(String(p.per_passenger_increment_zar))
		setEditIncluded(String(p.included_passengers))
		setEditCategory(p.default_vehicle_category_id ?? '')
		setEditDuration(
			p.estimated_duration_minutes != null ? String(p.estimated_duration_minutes) : '',
		)
		setEditActive(p.is_active)
	}, [editingId, packages])

	async function onCreate(e: React.FormEvent) {
		e.preventDefault()
		setBanner(null)
		setBusy(true)
		const res = await createOpsExperiencePackageAction({
			slug: addSlug.trim(),
			title: addTitle.trim(),
			description: addDesc.trim() || null,
			base_price_zar: Number(addBase),
			per_passenger_increment_zar: Number(addPerPass || 0),
			included_passengers: Number(addIncluded || 2),
			default_vehicle_category_id: addCategory ? addCategory : null,
			estimated_duration_minutes: addDuration.trim() ? Number(addDuration) : null,
		})
		setBusy(false)
		if (res.ok) {
			setBanner({ variant: 'ok', text: 'Package created. Edit JSON stubs/itinerary later if needed.' })
			setAddSlug('')
			setAddTitle('')
			setAddDesc('')
			setShowAdd(false)
			router.refresh()
			return
		}
		setBanner({
			variant: 'err',
			text: `${res.error.message}${res.error.correlationId ? ` (ref ${res.error.correlationId.slice(0, 8)}…)` : ''}`,
		})
	}

	async function onSaveEdit(e: React.FormEvent) {
		e.preventDefault()
		if (!editingId) return
		setBanner(null)
		setBusy(true)
		const res = await updateOpsExperiencePackageAction({
			id: editingId,
			slug: editSlug.trim(),
			title: editTitle.trim(),
			description: editDesc.trim() || null,
			base_price_zar: Number(editBase),
			per_passenger_increment_zar: Number(editPerPass || 0),
			included_passengers: Number(editIncluded || 1),
			default_vehicle_category_id: editCategory ? editCategory : null,
			estimated_duration_minutes: editDuration.trim() ? Number(editDuration) : null,
			is_active: editActive,
		})
		setBusy(false)
		if (res.ok) {
			setBanner({ variant: 'ok', text: 'Package updated.' })
			setEditingId(null)
			router.refresh()
			return
		}
		setBanner({
			variant: 'err',
			text: `${res.error.message}${res.error.correlationId ? ` (ref ${res.error.correlationId.slice(0, 8)}…)` : ''}`,
		})
	}

	async function confirmDeactivate() {
		if (!deactivateId) return
		setBanner(null)
		setBusy(true)
		const res = await deactivateOpsExperiencePackageAction({ id: deactivateId })
		setBusy(false)
		setDeactivateId(null)
		if (res.ok) {
			setBanner({ variant: 'ok', text: 'Package deactivated (hidden from public catalogue).' })
			setEditingId(null)
			router.refresh()
			return
		}
		setBanner({
			variant: 'err',
			text: `${res.error.message}${res.error.correlationId ? ` (ref ${res.error.correlationId.slice(0, 8)}…)` : ''}`,
		})
	}

	return (
		<div className="space-y-4">
			{banner ? (
				<div
					className={
						banner.variant === 'ok'
							? 'rounded-md border border-emerald-800/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100'
							: 'rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-100'
					}
					role="status"
				>
					{banner.text}
				</div>
			) : null}

			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="border-ops-border bg-transparent text-ops-foreground"
					onClick={() => setShowAdd((s) => !s)}
				>
					{showAdd ? 'Cancel add' : 'Add package'}
				</Button>
			</div>

			{showAdd ? (
				<form
					onSubmit={onCreate}
					className="space-y-3 rounded-lg border border-ops-border bg-ops-surface/40 p-4"
				>
					<p className="text-sm text-ops-muted">
						New packages get empty itinerary/add-ons and default Cape Town stubs — adjust in
						Supabase or a future editor if needed.
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-slug">
							<FieldLabel>Slug</FieldLabel>
							<Input
								id="exp-pkg-add-slug"
								value={addSlug}
								onChange={(e) => setAddSlug(e.target.value)}
								required
								className="border-ops-border bg-ops-canvas text-ops-foreground"
								placeholder="my-day-tour"
							/>
						</label>
						<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-title">
							<FieldLabel>Title</FieldLabel>
							<Input
								id="exp-pkg-add-title"
								value={addTitle}
								onChange={(e) => setAddTitle(e.target.value)}
								required
								className="border-ops-border bg-ops-canvas text-ops-foreground"
							/>
						</label>
					</div>
					<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-desc">
						<FieldLabel>Description (optional)</FieldLabel>
						<Input
							id="exp-pkg-add-desc"
							value={addDesc}
							onChange={(e) => setAddDesc(e.target.value)}
							className="border-ops-border bg-ops-canvas text-ops-foreground"
						/>
					</label>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-base">
							<FieldLabel>Base price (ZAR)</FieldLabel>
							<Input
								id="exp-pkg-add-base"
								type="number"
								min={0}
								step="0.01"
								value={addBase}
								onChange={(e) => setAddBase(e.target.value)}
								required
								className="border-ops-border bg-ops-canvas text-ops-foreground"
							/>
						</label>
						<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-per">
							<FieldLabel>Per extra guest (ZAR)</FieldLabel>
							<Input
								id="exp-pkg-add-per"
								type="number"
								min={0}
								step="0.01"
								value={addPerPass}
								onChange={(e) => setAddPerPass(e.target.value)}
								className="border-ops-border bg-ops-canvas text-ops-foreground"
							/>
						</label>
						<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-inc">
							<FieldLabel>Included guests</FieldLabel>
							<Input
								id="exp-pkg-add-inc"
								type="number"
								min={1}
								value={addIncluded}
								onChange={(e) => setAddIncluded(e.target.value)}
								required
								className="border-ops-border bg-ops-canvas text-ops-foreground"
							/>
						</label>
						<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-dur">
							<FieldLabel>Duration (min, optional)</FieldLabel>
							<Input
								id="exp-pkg-add-dur"
								type="number"
								min={0}
								value={addDuration}
								onChange={(e) => setAddDuration(e.target.value)}
								className="border-ops-border bg-ops-canvas text-ops-foreground"
							/>
						</label>
					</div>
					<label className="flex flex-col gap-1" htmlFor="exp-pkg-add-cat">
						<FieldLabel>Default vehicle category</FieldLabel>
						<select
							id="exp-pkg-add-cat"
							value={addCategory}
							onChange={(e) => setAddCategory(e.target.value)}
							className="h-11 rounded-md border border-ops-border bg-ops-canvas px-3 text-sm text-ops-foreground"
						>
							<option value="">None (auto-pick by group size)</option>
							{categories.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
					</label>
					<Button type="submit" size="sm" disabled={busy}>
						Create package
					</Button>
				</form>
			) : null}

			<OpsTableShell caption="Experience packages (catalogue)">
				<thead className="border-b border-ops-border bg-ops-surface/60 text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
					<tr>
						<th scope="col" className="px-3 py-2 font-medium text-left">
							Slug
						</th>
						<th scope="col" className="px-3 py-2 font-medium text-left">
							Title
						</th>
						<th scope="col" className="px-3 py-2 font-medium text-left">
							Base (ZAR)
						</th>
						<th scope="col" className="px-3 py-2 font-medium text-left">
							Active
						</th>
						<th scope="col" className="px-3 py-2 font-medium text-left">
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{packages.map((p) => (
						<React.Fragment key={p.id}>
							<tr className="border-b border-ops-border/80 transition-colors hover:bg-ops-accent-soft">
								<td className="px-3 py-2 font-mono text-xs text-ops-foreground">{p.slug}</td>
								<td className="max-w-[12rem] truncate px-3 py-2 text-sm text-ops-foreground">
									{p.title}
								</td>
								<td className="px-3 py-2 text-sm text-ops-muted">
									{Number(p.base_price_zar).toFixed(2)}
								</td>
								<td className="px-3 py-2 text-sm">
									<OpsStatusPill tone={p.is_active ? 'success' : 'neutral'}>
										{p.is_active ? 'Active' : 'Inactive'}
									</OpsStatusPill>
								</td>
								<td className="px-3 py-2 text-xs">
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="border-ops-border"
										onClick={() => setEditingId((id) => (id === p.id ? null : p.id))}
									>
										{editingId === p.id ? 'Close' : 'Edit'}
									</Button>
									{p.is_active ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="ml-2 border-red-500/50 text-red-600 hover:bg-red-500/10"
											onClick={() => setDeactivateId(p.id)}
										>
											Deactivate…
										</Button>
									) : null}
								</td>
							</tr>
							{editingId === p.id ? (
								<tr className="border-b border-ops-border bg-ops-surface/30">
									<td colSpan={5} className="px-3 py-4">
										<form onSubmit={onSaveEdit} className="space-y-3 max-w-3xl">
											<div className="grid gap-3 sm:grid-cols-2">
												<label className="flex flex-col gap-1" htmlFor={`exp-edit-slug-${p.id}`}>
													<FieldLabel>Slug</FieldLabel>
													<Input
														id={`exp-edit-slug-${p.id}`}
														value={editSlug}
														onChange={(e) => setEditSlug(e.target.value)}
														required
														className="border-ops-border bg-ops-canvas text-ops-foreground"
													/>
												</label>
												<label className="flex flex-col gap-1" htmlFor={`exp-edit-title-${p.id}`}>
													<FieldLabel>Title</FieldLabel>
													<Input
														id={`exp-edit-title-${p.id}`}
														value={editTitle}
														onChange={(e) => setEditTitle(e.target.value)}
														required
														className="border-ops-border bg-ops-canvas text-ops-foreground"
													/>
												</label>
											</div>
											<label className="flex flex-col gap-1" htmlFor={`exp-edit-desc-${p.id}`}>
												<FieldLabel>Description</FieldLabel>
												<Input
													id={`exp-edit-desc-${p.id}`}
													value={editDesc}
													onChange={(e) => setEditDesc(e.target.value)}
													className="border-ops-border bg-ops-canvas text-ops-foreground"
												/>
											</label>
											<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
												<label className="flex flex-col gap-1" htmlFor={`exp-edit-base-${p.id}`}>
													<FieldLabel>Base price (ZAR)</FieldLabel>
													<Input
														id={`exp-edit-base-${p.id}`}
														type="number"
														min={0}
														step="0.01"
														value={editBase}
														onChange={(e) => setEditBase(e.target.value)}
														required
														className="border-ops-border bg-ops-canvas text-ops-foreground"
													/>
												</label>
												<label className="flex flex-col gap-1" htmlFor={`exp-edit-per-${p.id}`}>
													<FieldLabel>Per extra guest</FieldLabel>
													<Input
														id={`exp-edit-per-${p.id}`}
														type="number"
														min={0}
														step="0.01"
														value={editPerPass}
														onChange={(e) => setEditPerPass(e.target.value)}
														className="border-ops-border bg-ops-canvas text-ops-foreground"
													/>
												</label>
												<label className="flex flex-col gap-1" htmlFor={`exp-edit-inc-${p.id}`}>
													<FieldLabel>Included guests</FieldLabel>
													<Input
														id={`exp-edit-inc-${p.id}`}
														type="number"
														min={1}
														value={editIncluded}
														onChange={(e) => setEditIncluded(e.target.value)}
														required
														className="border-ops-border bg-ops-canvas text-ops-foreground"
													/>
												</label>
												<label className="flex flex-col gap-1" htmlFor={`exp-edit-dur-${p.id}`}>
													<FieldLabel>Duration (min)</FieldLabel>
													<Input
														id={`exp-edit-dur-${p.id}`}
														type="number"
														min={0}
														value={editDuration}
														onChange={(e) => setEditDuration(e.target.value)}
														className="border-ops-border bg-ops-canvas text-ops-foreground"
													/>
												</label>
											</div>
											<label className="flex flex-col gap-1" htmlFor={`exp-edit-cat-${p.id}`}>
												<FieldLabel>Default vehicle category</FieldLabel>
												<select
													id={`exp-edit-cat-${p.id}`}
													value={editCategory}
													onChange={(e) => setEditCategory(e.target.value)}
													className="h-11 rounded-md border border-ops-border bg-ops-canvas px-3 text-sm text-ops-foreground"
												>
													<option value="">None</option>
													{categories.map((c) => (
														<option key={c.id} value={c.id}>
															{c.name}
														</option>
													))}
												</select>
											</label>
											<label className="flex items-center gap-2 text-sm text-ops-foreground">
												<input
													type="checkbox"
													checked={editActive}
													onChange={(e) => setEditActive(e.target.checked)}
													className="h-4 w-4 rounded border-ops-border"
												/>
												Active (visible on public /tours)
											</label>
											<div className="flex flex-wrap gap-2">
												<Button type="submit" size="sm" disabled={busy}>
													Save
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													className="border-ops-border"
													onClick={() => setEditingId(null)}
												>
													Cancel
												</Button>
											</div>
										</form>
									</td>
								</tr>
							) : null}
						</React.Fragment>
					))}
				</tbody>
			</OpsTableShell>

			<AlertDialog open={deactivateId != null} onOpenChange={(o) => !o && setDeactivateId(null)}>
				<AlertDialogContent className="border-ops-border bg-ops-surface text-ops-foreground">
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate package?</AlertDialogTitle>
						<AlertDialogDescription className="text-ops-muted">
							Public catalogue and tour detail pages hide inactive packages. Existing bookings are
							unchanged.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-ops-border">Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => void confirmDeactivate()} disabled={busy}>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
