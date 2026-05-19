'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
	archiveOpsFleetDriverAction,
	clearOpsFleetDriverAvatarAction,
	updateOpsFleetDriverAction,
	updateOpsFleetDriverAvatarPositionAction,
	uploadOpsFleetDriverAvatarAction,
} from '@/actions/opsDriverFleet'
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
import { Select } from '@/components/ui/select'
import { OpsDriverAvatarThumb } from '@/features/ops/components/OpsDriverAvatarThumb'
import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import {
	opsFleetDriversCopy,
	fleetDriverShiftStatusLabel,
	fleetDriverTripStatusLabel,
	opsFleetDriverAvatarPositionLabel,
} from '@/features/ops/copy/ops-fleet-drivers-copy'
import type {
	FleetDriverShiftStatus,
	FleetDriverTripStatus,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import {
	fleetDriverShiftStatusPillKey,
	fleetDriverTripStatusPillKey,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import {
	OPS_DRIVER_AVATAR_OBJECT_POSITIONS,
	normalizeOpsDriverAvatarObjectPosition,
} from '@/features/ops/lib/ops-driver-avatar-display'
import type { OpsFleetDriverRow } from '@/features/ops/ops-fleet-drivers-types'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { opsFulfilQueueHref } from '@/lib/ops-fulfil-nav'
import { cn } from '@/lib/utils'

export type OpsFleetDriverDetailRailProps = {
	driver: OpsFleetDriverRow
	tripStatus: FleetDriverTripStatus
	shiftStatus: FleetDriverShiftStatus
	defaultVehicleDisplay: string | null
	vehicleOptions: { id: string; name: string }[]
	onClose: () => void
	/** From **`?driverEdit=1`** — open the edit form once. */
	openEditInitially?: boolean
	/** From **`?driverArchive=1`** — open the archive dialog once. */
	openArchiveInitially?: boolean
	/** Strip **`driverEdit`** / **`driverArchive`** from the fleet drivers URL (client navigation). */
	onClearFleetDriversIntentParams?: () => void
}

export function OpsFleetDriverDetailRail({
	driver,
	tripStatus,
	shiftStatus,
	defaultVehicleDisplay,
	vehicleOptions,
	onClose,
	openEditInitially = false,
	openArchiveInitially = false,
	onClearFleetDriversIntentParams,
}: OpsFleetDriverDetailRailProps) {
	const router = useRouter()
	const [editOpen, setEditOpen] = React.useState(false)
	const [archiveOpen, setArchiveOpen] = React.useState(false)
	const [busy, setBusy] = React.useState(false)
	const [banner, setBanner] = React.useState<{ variant: 'ok' | 'err'; text: string } | null>(null)

	const [fullName, setFullName] = React.useState(driver.full_name)
	const [phone, setPhone] = React.useState(driver.phone ?? '')
	const [status, setStatus] = React.useState(driver.status === 'inactive' ? 'inactive' : 'active')
	const [defaultVehicleId, setDefaultVehicleId] = React.useState(driver.default_vehicle_id ?? '')

	const appliedEditIntentRef = React.useRef(false)
	const appliedArchiveIntentRef = React.useRef(false)

	React.useEffect(() => {
		if (!openEditInitially) {
			appliedEditIntentRef.current = false
		}
	}, [openEditInitially])

	React.useEffect(() => {
		if (!openArchiveInitially) {
			appliedArchiveIntentRef.current = false
		}
	}, [openArchiveInitially])

	React.useEffect(() => {
		appliedEditIntentRef.current = false
		appliedArchiveIntentRef.current = false
		setEditOpen(false)
		setArchiveOpen(false)
	}, [driver.id])

	React.useEffect(() => {
		if (!openEditInitially) return
		if (appliedEditIntentRef.current) return
		setEditOpen(true)
		appliedEditIntentRef.current = true
	}, [openEditInitially, driver.id])

	React.useEffect(() => {
		const inactive = driver.status === 'inactive'
		if (!openArchiveInitially || inactive) return
		if (appliedArchiveIntentRef.current) return
		setArchiveOpen(true)
		appliedArchiveIntentRef.current = true
	}, [openArchiveInitially, driver.status, driver.id])

	const onArchiveDialogOpenChange = React.useCallback(
		(next: boolean) => {
			setArchiveOpen(next)
			if (!next) {
				onClearFleetDriversIntentParams?.()
			}
		},
		[onClearFleetDriversIntentParams],
	)

	React.useEffect(() => {
		setFullName(driver.full_name)
		setPhone(driver.phone ?? '')
		setStatus(driver.status === 'inactive' ? 'inactive' : 'active')
		setDefaultVehicleId(driver.default_vehicle_id ?? '')
		setBanner(null)
	}, [driver.id, driver.full_name, driver.phone, driver.status, driver.default_vehicle_id])

	const assignHref = opsFulfilQueueHref('paid', { focusDriverProfileId: driver.id })

	async function saveEdit() {
		setBusy(true)
		setBanner(null)
		const res = await updateOpsFleetDriverAction({
			profileId: driver.id,
			fullName: fullName.trim(),
			phone: phone.trim() || null,
			status: status === 'inactive' ? 'inactive' : 'active',
			defaultVehicleId: defaultVehicleId.trim().length > 0 ? defaultVehicleId.trim() : null,
		})
		setBusy(false)
		if (!res.ok) {
			setBanner({ variant: 'err', text: res.error.message })
			return
		}
		onClearFleetDriversIntentParams?.()
		setEditOpen(false)
		setBanner({ variant: 'ok', text: opsFleetDriversCopy.driverSaved })
		router.refresh()
	}

	async function onAlignmentChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const next = normalizeOpsDriverAvatarObjectPosition(e.target.value)
		setAvatarAlign(next)
		if (!avatarUrl) return
		setAlignBusy(true)
		setBanner(null)
		const res = await updateOpsFleetDriverAvatarPositionAction({
			profileId: driver.id,
			objectPosition: next,
		})
		setAlignBusy(false)
		if (!res.ok) {
			setAvatarAlign(normalizeOpsDriverAvatarObjectPosition(driver.avatar_object_position))
			setBanner({ variant: 'err', text: res.error.message })
			return
		}
		router.refresh()
	}

	async function onPickPhotoFile(file: File | undefined) {
		if (!file || file.size === 0) return
		setPhotoBusy(true)
		setBanner(null)
		const res = await uploadOpsFleetDriverAvatarAction({ profileId: driver.id, file })
		setPhotoBusy(false)
		if (fileInputRef.current) fileInputRef.current.value = ''
		if (!res.ok) {
			setBanner({ variant: 'err', text: res.error.message || opsFleetDriversCopy.driverPhotoError })
			return
		}
		setBanner({ variant: 'ok', text: opsFleetDriversCopy.driverPhotoSaved })
		router.refresh()
	}

	async function removePhoto() {
		setPhotoBusy(true)
		setBanner(null)
		const res = await clearOpsFleetDriverAvatarAction({ profileId: driver.id })
		setPhotoBusy(false)
		if (!res.ok) {
			setBanner({ variant: 'err', text: res.error.message || opsFleetDriversCopy.driverPhotoError })
			return
		}
		setBanner({ variant: 'ok', text: opsFleetDriversCopy.driverPhotoRemoved })
		router.refresh()
	}

	async function confirmArchive() {
		setBusy(true)
		setBanner(null)
		const res = await archiveOpsFleetDriverAction({ profileId: driver.id })
		setBusy(false)
		setArchiveOpen(false)
		if (!res.ok) {
			setBanner({ variant: 'err', text: res.error.message })
			return
		}
		onClose()
		router.refresh()
	}

	const displayName = driver.full_name?.trim() || 'Unnamed'
	const shiftInactive = driver.status === 'inactive'
	const avatarUrl = driver.avatar_url?.trim() ? driver.avatar_url.trim() : null
	const fileInputRef = React.useRef<HTMLInputElement>(null)
	const [photoBusy, setPhotoBusy] = React.useState(false)
	const [alignBusy, setAlignBusy] = React.useState(false)
	const [avatarAlign, setAvatarAlign] = React.useState(() =>
		normalizeOpsDriverAvatarObjectPosition(driver.avatar_object_position),
	)

	React.useEffect(() => {
		setAvatarAlign(normalizeOpsDriverAvatarObjectPosition(driver.avatar_object_position))
	}, [driver.id, driver.avatar_object_position])

	return (
		<>
			<OpsDetailRail
				title={displayName}
				onClose={onClose}
				footer={
					editOpen ? (
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="border-ops-border"
								disabled={busy}
								onClick={() => {
									onClearFleetDriversIntentParams?.()
									setEditOpen(false)
									setFullName(driver.full_name)
									setPhone(driver.phone ?? '')
									setStatus(driver.status === 'inactive' ? 'inactive' : 'active')
									setDefaultVehicleId(driver.default_vehicle_id ?? '')
								}}
							>
								{opsFleetDriversCopy.cancelEdit}
							</Button>
							<Button type="button" size="sm" disabled={busy} onClick={() => void saveEdit()}>
								{opsFleetDriversCopy.saveDriver}
							</Button>
						</div>
					) : (
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="border-ops-border"
								disabled={busy}
								onClick={() => setEditOpen(true)}
							>
								{opsFleetDriversCopy.editDriver}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="border-red-500/50 text-red-600 hover:bg-red-500/10"
								disabled={shiftInactive}
								onClick={() => setArchiveOpen(true)}
							>
								{opsFleetDriversCopy.archiveDriver}
							</Button>
							{shiftInactive ? (
								<Button type="button" size="sm" variant="secondary" className="border-ops-border" disabled>
									{opsFleetDriversCopy.assignDriverToTrip}
								</Button>
							) : (
								<Button type="button" size="sm" variant="secondary" className="border-ops-border" asChild>
									<Link href={assignHref}>{opsFleetDriversCopy.assignDriverToTrip}</Link>
								</Button>
							)}
						</div>
					)
				}
			>
				<div className="space-y-6">
					{banner ? (
						<p
							className={cn(
								'text-sm',
								banner.variant === 'ok' ? 'text-emerald-600' : 'text-red-600',
							)}
						>
							{banner.text}
						</p>
					) : null}

					<section aria-labelledby="ops-driver-photo-heading" className="space-y-2">
						<h3
							id="ops-driver-photo-heading"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsFleetDriversCopy.driverPhotoHeading}
						</h3>
						<div className="flex justify-center">
							<OpsDriverAvatarThumb
								imageUrl={avatarUrl}
								objectPosition={avatarAlign}
								displayName={displayName}
								sizeClassName="h-40 w-40"
								imageSizes="160px"
								className="border-2 border-ops-border shadow-sm"
							/>
						</div>
						{editOpen ? (
							<>
								{avatarUrl ? (
									<div className="space-y-1.5">
										<Label htmlFor="ops-driver-photo-align">{opsFleetDriversCopy.driverPhotoAlignment}</Label>
										<Select
											id="ops-driver-photo-align"
											value={avatarAlign}
											onChange={(e) => void onAlignmentChange(e)}
											disabled={alignBusy || photoBusy}
											className="min-h-11 w-full max-w-sm border-ops-border bg-ops-canvas text-ops-foreground"
										>
											{OPS_DRIVER_AVATAR_OBJECT_POSITIONS.map((p) => (
												<option key={p} value={p}>
													{opsFleetDriverAvatarPositionLabel(p)}
												</option>
											))}
										</Select>
										<p className="text-xs text-ops-muted">
											{opsFleetDriversCopy.driverPhotoAlignmentHint}
										</p>
									</div>
								) : null}
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp"
									className="sr-only"
									aria-label={opsFleetDriversCopy.driverPhotoInputAria}
									disabled={photoBusy}
									onChange={(e) => {
										const f = e.target.files?.[0]
										void onPickPhotoFile(f)
									}}
								/>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="border-ops-border"
										disabled={photoBusy}
										onClick={() => fileInputRef.current?.click()}
									>
										{photoBusy
											? opsFleetDriversCopy.driverPhotoBusy
											: avatarUrl
												? opsFleetDriversCopy.driverPhotoReplace
												: opsFleetDriversCopy.driverPhotoAdd}
									</Button>
									{avatarUrl ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="border-ops-border text-red-600 hover:bg-red-500/10"
											disabled={photoBusy}
											onClick={() => void removePhoto()}
										>
											{opsFleetDriversCopy.driverPhotoRemove}
										</Button>
									) : null}
								</div>
							</>
						) : null}
					</section>

					<section aria-labelledby="ops-driver-trip-status">
						<h3
							id="ops-driver-trip-status"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsFleetDriversCopy.detailTripStatusHeading}
						</h3>
						<div className="mt-2">
							<OpsStatusPill tone={getOpsStatusPillTone(fleetDriverTripStatusPillKey(tripStatus))}>
								{fleetDriverTripStatusLabel(tripStatus)}
							</OpsStatusPill>
						</div>
					</section>

					<section aria-labelledby="ops-driver-shift-status">
						<h3
							id="ops-driver-shift-status"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsFleetDriversCopy.detailShiftStatusHeading}
						</h3>
						<div className="mt-2">
							<OpsStatusPill tone={getOpsStatusPillTone(fleetDriverShiftStatusPillKey(shiftStatus))}>
								{fleetDriverShiftStatusLabel(shiftStatus)}
							</OpsStatusPill>
						</div>
					</section>

					{editOpen ? (
						<div className="space-y-4 rounded-md border border-ops-border bg-ops-surface-active/40 p-3">
							<div className="space-y-1.5">
								<Label htmlFor="ops-driver-edit-name">{opsFleetDriversCopy.fieldFullName}</Label>
								<Input
									id="ops-driver-edit-name"
									value={fullName}
									onChange={(e) => setFullName(e.target.value)}
									className="border-ops-border bg-ops-canvas"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="ops-driver-edit-phone">{opsFleetDriversCopy.fieldPhone}</Label>
								<Input
									id="ops-driver-edit-phone"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									className="border-ops-border bg-ops-canvas"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="ops-driver-edit-shift-status">{opsFleetDriversCopy.fieldShiftStatus}</Label>
								<Select
									id="ops-driver-edit-shift-status"
									value={status}
									onChange={(e) => setStatus(e.target.value)}
									className="min-h-11 border-ops-border bg-ops-canvas text-ops-foreground"
								>
									<option value="active">{opsFleetDriversCopy.shiftStatusActive}</option>
									<option value="inactive">{opsFleetDriversCopy.shiftStatusInactive}</option>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="ops-driver-edit-vehicle">{opsFleetDriversCopy.fieldDefaultVehicle}</Label>
								<Select
									id="ops-driver-edit-vehicle"
									value={defaultVehicleId}
									onChange={(e) => setDefaultVehicleId(e.target.value)}
									className="min-h-11 border-ops-border bg-ops-canvas text-ops-foreground"
								>
									<option value="">{opsFleetDriversCopy.noDefaultVehicle}</option>
									{vehicleOptions.map((v) => (
										<option key={v.id} value={v.id}>
											{v.name}
										</option>
									))}
								</Select>
								<p className="text-xs text-ops-muted">{opsFleetDriversCopy.defaultVehicleHint}</p>
							</div>
						</div>
					) : (
						<>
							<section>
								<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
									{opsFleetDriversCopy.sectionProfile}
								</h3>
								<p className="mt-1 text-sm font-medium text-ops-foreground">{driver.full_name}</p>
								<p className="mt-0.5 text-xs text-ops-muted">{driver.phone ?? opsFleetDriversCopy.noPhone}</p>
								<p className="mt-1 text-xs text-ops-muted">
									<span className="text-ops-muted">{opsFleetDriversCopy.fieldEmail}: </span>
									{driver.email?.trim() ? driver.email : '—'}
								</p>
							</section>
							<section>
								<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
									{opsFleetDriversCopy.sectionDefaultVehicle}
								</h3>
								<p className="mt-1 text-sm text-ops-foreground">
									{defaultVehicleDisplay ?? opsFleetDriversCopy.noDefaultVehicleAssigned}
								</p>
							</section>
						</>
					)}
				</div>
			</OpsDetailRail>

			<AlertDialog open={archiveOpen} onOpenChange={onArchiveDialogOpenChange}>
				<AlertDialogContent className="border-ops-border bg-ops-surface text-ops-foreground">
					<AlertDialogHeader>
						<AlertDialogTitle>{opsFleetDriversCopy.archiveDriverTitle}</AlertDialogTitle>
						<AlertDialogDescription className="text-ops-muted">
							{opsFleetDriversCopy.archiveDriverDescription}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-ops-border" disabled={busy}>
							{opsFleetDriversCopy.cancelEdit}
						</AlertDialogCancel>
						<AlertDialogAction onClick={() => void confirmArchive()} disabled={busy}>
							{opsFleetDriversCopy.archiveDriver}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
