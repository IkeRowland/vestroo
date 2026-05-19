'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
	archiveOpsVehicleAction,
	createOpsVehicleAction,
	updateOpsVehicleAction,
} from '@/actions/opsVehicles'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OpsVehiclesFleetBrowser } from '@/features/ops/components/OpsVehiclesFleetBrowser'
import { opsVehiclesCopy } from '@/features/ops/copy/ops-vehicles-copy'
import type { OpsVehiclesPageView } from '@/lib/ops-vehicles-url'
import { createClientClient } from '@/lib/supabase/client'
import type {
	OpsFleetCategoryOption,
	OpsFleetVehicleDriverOption,
	OpsFleetVehicleRow,
} from '@/features/ops/ops-fleet-types'

const VEHICLE_BUCKET = 'vehicles'
const MAX_PRIMARY_BYTES = 6 * 1024 * 1024
const MAX_GALLERY_FILES = 6
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

const TRANSMISSION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
	{ value: 'automatic', label: 'Automatic' },
	{ value: 'manual', label: 'Manual' },
	{ value: 'cvt', label: 'CVT' },
	{ value: 'semi_automatic', label: 'Semi-automatic' },
]

const FUEL_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
	{ value: 'petrol', label: 'Petrol' },
	{ value: 'diesel', label: 'Diesel' },
	{ value: 'electric', label: 'Electric' },
	{ value: 'hybrid', label: 'Hybrid' },
	{ value: 'plug_in_hybrid', label: 'Plug-in hybrid' },
]

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
	{ value: 'available', label: 'Available' },
	{ value: 'maintenance', label: 'In maintenance' },
	{ value: 'reserved', label: 'Reserved' },
	{ value: 'archived', label: 'Archived' },
]

const SEAT_OPTIONS: ReadonlyArray<number> = [2, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16]

export type { OpsFleetCategoryOption, OpsFleetVehicleDriverOption, OpsFleetVehicleRow } from '@/features/ops/ops-fleet-types'

type OpsVehiclesFleetPanelProps = {
	vehicles: OpsFleetVehicleRow[]
	categories: OpsFleetCategoryOption[]
	driverOptions: OpsFleetVehicleDriverOption[]
	view: OpsVehiclesPageView
	selectedVehicleId: string | null
}

type FormValues = {
	vehicleName: string
	make: string
	model: string
	modelYear: string
	categoryId: string
	mileageKm: string
	color: string
	seats: string
	transmission: string
	fuelType: string
	status: string
	isFleetActive: boolean
	description: string
	licensePlate: string
	primaryImageUrl: string | null
	galleryImageUrls: string[]
	assignedDriverId: string
}

function emptyFormValues(categories: OpsFleetCategoryOption[]): FormValues {
	return {
		vehicleName: '',
		make: '',
		model: '',
		modelYear: String(new Date().getUTCFullYear()),
		categoryId: categories[0]?.id ?? '',
		mileageKm: '',
		color: '',
		seats: '5',
		transmission: 'automatic',
		fuelType: 'petrol',
		status: 'available',
		isFleetActive: true,
		description: '',
		licensePlate: '',
		primaryImageUrl: null,
		galleryImageUrls: [],
		assignedDriverId: '',
	}
}

function vehicleToFormValues(vehicle: OpsFleetVehicleRow): FormValues {
	return {
		vehicleName: vehicle.name ?? '',
		make: vehicle.make ?? '',
		model: vehicle.model ?? '',
		modelYear: vehicle.model_year != null ? String(vehicle.model_year) : '',
		categoryId: vehicle.category_id,
		mileageKm: vehicle.mileage_km != null ? String(vehicle.mileage_km) : '',
		color: vehicle.color ?? '',
		seats: vehicle.seats != null ? String(vehicle.seats) : '5',
		transmission: vehicle.transmission ?? 'automatic',
		fuelType: vehicle.fuel_type ?? 'petrol',
		status: vehicle.vehicle_condition || 'available',
		isFleetActive: vehicle.is_fleet_active,
		description: vehicle.description ?? '',
		licensePlate: vehicle.license_plate,
		primaryImageUrl: vehicle.primary_image_url,
		galleryImageUrls: vehicle.gallery_image_urls ?? [],
		assignedDriverId: vehicle.assigned_driver?.id ?? '',
	}
}

function buildVehicleName(values: FormValues): string {
	const explicit = values.vehicleName.trim()
	if (explicit) return explicit
	const make = values.make.trim()
	const model = values.model.trim()
	const year = values.modelYear.trim()
	const parts = [year, make, model].filter(Boolean)
	return parts.join(' ').trim()
}

function parseOptionalNumber(raw: string): number | null {
	const trimmed = raw.trim()
	if (!trimmed) return null
	const n = Number(trimmed)
	if (!Number.isFinite(n)) return null
	return n
}

function parseOptionalInt(raw: string): number | null {
	const n = parseOptionalNumber(raw)
	if (n == null) return null
	return Math.trunc(n)
}

export function OpsVehiclesFleetPanel({
	vehicles,
	categories,
	driverOptions,
	view,
	selectedVehicleId,
}: OpsVehiclesFleetPanelProps) {
	const router = useRouter()
	const [busy, setBusy] = React.useState(false)
	const [banner, setBanner] = React.useState<{ variant: 'ok' | 'err'; text: string } | null>(null)
	const [showAdd, setShowAdd] = React.useState(false)
	const [editingVehicle, setEditingVehicle] = React.useState<OpsFleetVehicleRow | null>(null)
	const [archiveId, setArchiveId] = React.useState<string | null>(null)

	const closeBanner = React.useCallback(() => setBanner(null), [])

	const refreshAfterChange = React.useCallback(
		(message: string) => {
			setBanner({ variant: 'ok', text: message })
			router.refresh()
		},
		[router],
	)

	const reportFailure = React.useCallback(
		(message: string, correlationId?: string) => {
			setBanner({
				variant: 'err',
				text: `${message}${correlationId ? ` (ref ${correlationId.slice(0, 8)}…)` : ''}`,
			})
		},
		[],
	)

	async function confirmArchive() {
		if (!archiveId) return
		setBanner(null)
		setBusy(true)
		const res = await archiveOpsVehicleAction({ id: archiveId })
		setBusy(false)
		setArchiveId(null)
		if (res.ok) {
			refreshAfterChange('Vehicle archived. It no longer appears in the public catalogue.')
			setEditingVehicle(null)
			return
		}
		reportFailure(res.error.message, res.error.correlationId)
	}

	return (
		<div className="space-y-4">
			{banner ? (
				<div
					className={
						banner.variant === 'ok'
							? 'flex items-start justify-between gap-3 rounded-md border border-emerald-800/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100'
							: 'flex items-start justify-between gap-3 rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-100'
					}
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

			<div className="flex flex-wrap items-center justify-end gap-2">
				<Button
					type="button"
					size="sm"
					onClick={() => setShowAdd(true)}
					className="bg-primary text-primary-foreground hover:bg-primary/90"
				>
					Add vehicle
				</Button>
			</div>

			<OpsVehiclesFleetBrowser
				vehicles={vehicles}
				categories={categories}
				view={view}
				selectedVehicleId={selectedVehicleId}
				onEditVehicle={(v) => setEditingVehicle(v)}
				onRequestArchive={(id) => setArchiveId(id)}
			/>

			{showAdd ? (
				<VehicleFormDialog
					title="Add new vehicle"
					subtitle={opsVehiclesCopy.addVehicleSubtitle}
					submitLabel="Add vehicle"
					initialValues={emptyFormValues(categories)}
					categories={categories}
					driverOptions={driverOptions}
					busy={busy}
					onCancel={() => setShowAdd(false)}
					onSubmit={async (values) => {
						setBusy(true)
						const computedName = buildVehicleName(values).trim() || values.licensePlate.trim()
						const res = await createOpsVehicleAction({
							name: computedName,
							license_plate: values.licensePlate.trim(),
							category_id: values.categoryId,
							is_fleet_active: values.isFleetActive,
							vehicle_condition: values.status,
							make: values.make.trim() || null,
							model: values.model.trim() || null,
							model_year: parseOptionalInt(values.modelYear),
							mileage_km: parseOptionalInt(values.mileageKm),
							color: values.color.trim() || null,
							seats: parseOptionalInt(values.seats),
							transmission:
								(values.transmission as
									| 'automatic'
									| 'manual'
									| 'cvt'
									| 'semi_automatic'
									| undefined) || null,
							fuel_type:
								(values.fuelType as
									| 'petrol'
									| 'diesel'
									| 'electric'
									| 'hybrid'
									| 'plug_in_hybrid'
									| undefined) || null,
							description: values.description.trim() || null,
							primary_image_url: values.primaryImageUrl,
							gallery_image_urls: values.galleryImageUrls,
							assigned_driver_profile_id: values.assignedDriverId.trim() || null,
						})
						setBusy(false)
						if (res.ok) {
							setShowAdd(false)
							refreshAfterChange('Vehicle added to the fleet.')
							return true
						}
						reportFailure(res.error.message, res.error.correlationId)
						return false
					}}
				/>
			) : null}

			{editingVehicle ? (
				<VehicleFormDialog
					title="Edit vehicle"
					subtitle={`Update details for ${editingVehicle.name}.`}
					submitLabel="Save changes"
					initialValues={vehicleToFormValues(editingVehicle)}
					categories={categories}
					driverOptions={driverOptions}
					busy={busy}
					existingVehicleId={editingVehicle.id}
					onCancel={() => setEditingVehicle(null)}
					onSubmit={async (values) => {
						setBusy(true)
						const computedName =
							buildVehicleName(values).trim() ||
							editingVehicle.name ||
							values.licensePlate.trim()
						const res = await updateOpsVehicleAction({
							id: editingVehicle.id,
							name: computedName,
							license_plate: values.licensePlate.trim(),
							category_id: values.categoryId,
							is_fleet_active: values.isFleetActive,
							vehicle_condition: values.status,
							make: values.make.trim() || null,
							model: values.model.trim() || null,
							model_year: parseOptionalInt(values.modelYear),
							mileage_km: parseOptionalInt(values.mileageKm),
							color: values.color.trim() || null,
							seats: parseOptionalInt(values.seats),
							transmission:
								(values.transmission as
									| 'automatic'
									| 'manual'
									| 'cvt'
									| 'semi_automatic'
									| undefined) || null,
							fuel_type:
								(values.fuelType as
									| 'petrol'
									| 'diesel'
									| 'electric'
									| 'hybrid'
									| 'plug_in_hybrid'
									| undefined) || null,
							description: values.description.trim() || null,
							primary_image_url: values.primaryImageUrl,
							gallery_image_urls: values.galleryImageUrls,
							assigned_driver_profile_id: values.assignedDriverId.trim() || null,
						})
						setBusy(false)
						if (res.ok) {
							setEditingVehicle(null)
							refreshAfterChange('Vehicle updated.')
							return true
						}
						reportFailure(res.error.message, res.error.correlationId)
						return false
					}}
				/>
			) : null}

			<AlertDialog open={archiveId != null} onOpenChange={(o) => !o && setArchiveId(null)}>
				<AlertDialogContent className="border-ops-border bg-ops-surface text-ops-foreground">
					<AlertDialogHeader>
						<AlertDialogTitle>Archive this vehicle?</AlertDialogTitle>
						<AlertDialogDescription className="text-ops-muted">
							The vehicle will no longer appear in the public catalogue. Trips already assigned keep
							their historical records.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-ops-border">Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => void confirmArchive()} disabled={busy}>
							Archive
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

type VehicleFormDialogProps = {
	title: string
	subtitle: string
	submitLabel: string
	initialValues: FormValues
	categories: OpsFleetCategoryOption[]
	driverOptions: OpsFleetVehicleDriverOption[]
	busy: boolean
	existingVehicleId?: string
	onCancel: () => void
	onSubmit: (values: FormValues) => Promise<boolean>
}

function VehicleFormDialog({
	title,
	subtitle,
	submitLabel,
	initialValues,
	categories,
	driverOptions,
	busy,
	existingVehicleId,
	onCancel,
	onSubmit,
}: VehicleFormDialogProps) {
	const titleId = React.useId()
	const [values, setValues] = React.useState<FormValues>(initialValues)
	const [error, setError] = React.useState<string | null>(null)
	const [uploadingPrimary, setUploadingPrimary] = React.useState(false)
	const [uploadingGallery, setUploadingGallery] = React.useState(false)
	const primaryInputRef = React.useRef<HTMLInputElement | null>(null)
	const galleryInputRef = React.useRef<HTMLInputElement | null>(null)

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

	const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
		setValues((prev) => ({ ...prev, [key]: value }))
	}

	async function uploadFile(file: File, prefix: string): Promise<string | null> {
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			setError(`Unsupported image type. Use JPEG, PNG, WebP or AVIF.`)
			return null
		}
		if (file.size > MAX_PRIMARY_BYTES) {
			setError(`Image is too large. Max ${MAX_PRIMARY_BYTES / (1024 * 1024)}MB per image.`)
			return null
		}
		const supabase = createClientClient()
		const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
		const folder = existingVehicleId ?? 'new'
		const filename = `${folder}/${prefix}-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2, 8)}.${ext}`
		const { error: uploadError } = await supabase.storage
			.from(VEHICLE_BUCKET)
			.upload(filename, file, { upsert: false, cacheControl: '3600' })
		if (uploadError) {
			setError(`Image upload failed: ${uploadError.message}`)
			return null
		}
		const { data } = supabase.storage.from(VEHICLE_BUCKET).getPublicUrl(filename)
		return data.publicUrl
	}

	async function onPrimarySelected(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		e.target.value = ''
		if (!file) return
		setError(null)
		setUploadingPrimary(true)
		const url = await uploadFile(file, 'primary')
		setUploadingPrimary(false)
		if (url) update('primaryImageUrl', url)
	}

	async function onGallerySelected(e: React.ChangeEvent<HTMLInputElement>) {
		const fileList = e.target.files
		e.target.value = ''
		if (!fileList || fileList.length === 0) return
		setError(null)
		const remaining = MAX_GALLERY_FILES - values.galleryImageUrls.length
		if (remaining <= 0) {
			setError(`You can attach up to ${MAX_GALLERY_FILES} gallery images.`)
			return
		}
		const files = Array.from(fileList).slice(0, remaining)
		setUploadingGallery(true)
		const uploaded: string[] = []
		for (const file of files) {
			const url = await uploadFile(file, 'gallery')
			if (url) uploaded.push(url)
		}
		setUploadingGallery(false)
		if (uploaded.length > 0) {
			setValues((prev) => ({
				...prev,
				galleryImageUrls: [...prev.galleryImageUrls, ...uploaded].slice(0, MAX_GALLERY_FILES),
			}))
		}
	}

	function removeGalleryImage(url: string) {
		setValues((prev) => ({
			...prev,
			galleryImageUrls: prev.galleryImageUrls.filter((g) => g !== url),
		}))
	}

	function clearPrimary() {
		update('primaryImageUrl', null)
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setError(null)

		if (!values.vehicleName.trim()) {
			if (!values.make.trim()) return setError('Make is required when vehicle name is empty.')
			if (!values.model.trim()) return setError('Model is required when vehicle name is empty.')
		}
		if (!buildVehicleName(values).trim() && !values.licensePlate.trim()) {
			return setError('Enter a vehicle name or year/make/model, and a license plate.')
		}
		if (!values.categoryId) return setError('Select a category.')
		if (!values.licensePlate.trim()) return setError('License plate is required.')

		const year = parseOptionalInt(values.modelYear)
		if (year != null && (year < 1950 || year > 2100)) {
			return setError('Enter a valid model year between 1950 and 2100.')
		}
		const mileage = parseOptionalInt(values.mileageKm)
		if (mileage != null && mileage < 0) {
			return setError('Mileage cannot be negative.')
		}
		const seats = parseOptionalInt(values.seats)
		if (seats != null && (seats < 1 || seats > 80)) {
			return setError('Seats must be between 1 and 80.')
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
				className="w-full max-w-3xl overflow-y-auto rounded-lg border border-ops-border bg-ops-surface p-6 shadow-xl"
				style={{ maxHeight: 'calc(100vh - 2rem)' }}
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
							{title}
						</h2>
						<p className="mt-1 text-sm text-ops-muted">{subtitle}</p>
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

				<form onSubmit={handleSubmit} className="mt-5 space-y-5">
					{error ? (
						<div
							className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-100"
							role="alert"
						>
							{error}
						</div>
					) : null}

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5 sm:col-span-2">
							<Label htmlFor="vehicle-display-name">Vehicle name</Label>
							<Input
								id="vehicle-display-name"
								value={values.vehicleName}
								onChange={(e) => update('vehicleName', e.target.value)}
								placeholder="e.g. Executive sedan 01"
								disabled={busy}
							/>
							<p className="text-xs text-ops-muted">
								Shown in ops lists and assignment. If blank, year + make + model is used.
							</p>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-make">Make</Label>
							<Input
								id="vehicle-make"
								value={values.make}
								onChange={(e) => update('make', e.target.value)}
								placeholder="Toyota"
								disabled={busy}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-model">Model</Label>
							<Input
								id="vehicle-model"
								value={values.model}
								onChange={(e) => update('model', e.target.value)}
								placeholder="Quantum"
								disabled={busy}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-year">Year</Label>
							<Input
								id="vehicle-year"
								type="number"
								inputMode="numeric"
								min={1950}
								max={2100}
								value={values.modelYear}
								onChange={(e) => update('modelYear', e.target.value)}
								disabled={busy}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-category">Category</Label>
							<select
								id="vehicle-category"
								value={values.categoryId}
								onChange={(e) => update('categoryId', e.target.value)}
								className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B]"
								required
								disabled={busy}
							>
								<option value="">Select category</option>
								{categories.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5 sm:col-span-2">
							<Label htmlFor="vehicle-assigned-driver">Driver</Label>
							<select
								id="vehicle-assigned-driver"
								value={values.assignedDriverId}
								onChange={(e) => update('assignedDriverId', e.target.value)}
								className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B]"
								disabled={busy}
							>
								<option value="">Not assigned</option>
								{driverOptions.map((d) => (
									<option key={d.id} value={d.id}>
										{d.full_name}
									</option>
								))}
							</select>
							<p className="text-xs text-ops-muted">
								Sets this vehicle as the driver’s default vehicle for ops dispatch.
							</p>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-mileage">Mileage (km)</Label>
							<Input
								id="vehicle-mileage"
								type="number"
								inputMode="numeric"
								min={0}
								value={values.mileageKm}
								onChange={(e) => update('mileageKm', e.target.value)}
								placeholder="45000"
								disabled={busy}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-color">Color</Label>
							<Input
								id="vehicle-color"
								value={values.color}
								onChange={(e) => update('color', e.target.value)}
								placeholder="Pearl White"
								disabled={busy}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-seats">Seats</Label>
							<select
								id="vehicle-seats"
								value={values.seats}
								onChange={(e) => update('seats', e.target.value)}
								className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B]"
								disabled={busy}
							>
								{SEAT_OPTIONS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-transmission">Transmission</Label>
							<select
								id="vehicle-transmission"
								value={values.transmission}
								onChange={(e) => update('transmission', e.target.value)}
								className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B]"
								disabled={busy}
							>
								{TRANSMISSION_OPTIONS.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-fuel">Fuel Type</Label>
							<select
								id="vehicle-fuel"
								value={values.fuelType}
								onChange={(e) => update('fuelType', e.target.value)}
								className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B]"
								disabled={busy}
							>
								{FUEL_TYPE_OPTIONS.map((t) => (
									<option key={t.value} value={t.value}>
										{t.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-status">Status</Label>
							<select
								id="vehicle-status"
								value={values.status}
								onChange={(e) => update('status', e.target.value)}
								className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B]"
								disabled={busy}
							>
								{STATUS_OPTIONS.map((s) => (
									<option key={s.value} value={s.value}>
										{s.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5 sm:col-span-2">
							<div className="flex items-center gap-2">
								<input
									id="vehicle-fleet-active"
									type="checkbox"
									checked={values.isFleetActive}
									onChange={(e) => update('isFleetActive', e.target.checked)}
									disabled={busy}
									className="h-4 w-4 rounded border-gray-300"
								/>
								<Label htmlFor="vehicle-fleet-active" className="text-sm font-normal text-ops-muted">
									Active for assignment and availability (inactive stays on this fleet list)
								</Label>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="vehicle-plate">License plate</Label>
							<Input
								id="vehicle-plate"
								value={values.licensePlate}
								onChange={(e) => update('licensePlate', e.target.value)}
								placeholder="CA 123-456"
								disabled={busy}
								required
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="vehicle-description">Description</Label>
						<Textarea
							id="vehicle-description"
							value={values.description}
							onChange={(e) => update('description', e.target.value)}
							placeholder="Additional details about the vehicle..."
							className="min-h-[90px]"
							disabled={busy}
						/>
					</div>

					<div className="space-y-2 rounded-lg border border-ops-border bg-ops-surface/40 p-4">
						<Label>Main image</Label>
						<p className="text-xs text-ops-muted">
							Shown as the primary photo on the public catalogue. JPEG, PNG, WebP or AVIF, up to 6MB.
						</p>
						<div className="flex flex-wrap items-center gap-3">
							{values.primaryImageUrl ? (
								<div className="relative">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={values.primaryImageUrl}
										alt="Primary vehicle preview"
										className="h-24 w-32 rounded-md object-cover"
									/>
									<button
										type="button"
										className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
										onClick={clearPrimary}
										disabled={busy || uploadingPrimary}
									>
										Remove
									</button>
								</div>
							) : (
								<div
									className="flex h-24 w-32 items-center justify-center rounded-md border border-dashed border-ops-border text-xs text-ops-muted"
									aria-hidden
								>
									No image
								</div>
							)}
							<input
								ref={primaryInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp,image/avif"
								className="hidden"
								onChange={(e) => void onPrimarySelected(e)}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="border-ops-border"
								onClick={() => primaryInputRef.current?.click()}
								disabled={busy || uploadingPrimary}
							>
								{uploadingPrimary
									? 'Uploading…'
									: values.primaryImageUrl
										? 'Replace image'
										: 'Upload image'}
							</Button>
						</div>
					</div>

					<div className="space-y-2 rounded-lg border border-ops-border bg-ops-surface/40 p-4">
						<div className="flex items-center justify-between gap-3">
							<Label>Gallery images</Label>
							<span className="text-xs text-ops-muted">
								{values.galleryImageUrls.length}/{MAX_GALLERY_FILES}
							</span>
						</div>
						<p className="text-xs text-ops-muted">
							Add up to {MAX_GALLERY_FILES} extra photos for the public listing.
						</p>
						<div className="flex flex-wrap gap-3">
							{values.galleryImageUrls.map((url) => (
								<div key={url} className="relative">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={url}
										alt="Vehicle gallery"
										className="h-20 w-28 rounded-md object-cover"
									/>
									<button
										type="button"
										className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
										onClick={() => removeGalleryImage(url)}
										disabled={busy}
									>
										Remove
									</button>
								</div>
							))}
							<input
								ref={galleryInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp,image/avif"
								multiple
								className="hidden"
								onChange={(e) => void onGallerySelected(e)}
							/>
							<button
								type="button"
								className="flex h-20 w-28 items-center justify-center rounded-md border border-dashed border-ops-border text-xs text-ops-muted hover:bg-ops-surface-hover disabled:opacity-50"
								onClick={() => galleryInputRef.current?.click()}
								disabled={
									busy ||
									uploadingGallery ||
									values.galleryImageUrls.length >= MAX_GALLERY_FILES
								}
							>
								{uploadingGallery ? 'Uploading…' : '+ Add'}
							</button>
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-end gap-2 border-t border-ops-border pt-4">
						<Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={busy || uploadingPrimary || uploadingGallery}
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
