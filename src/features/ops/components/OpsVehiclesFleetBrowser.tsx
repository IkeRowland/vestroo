'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Car } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { OpsCardGrid } from '@/features/ops/components/OpsCardGrid'
import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsSplitView } from '@/features/ops/components/OpsSplitView'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsVehicleFleetCard } from '@/features/ops/components/OpsVehicleFleetCard'
import type { OpsFleetCategoryOption, OpsFleetVehicleRow } from '@/features/ops/ops-fleet-types'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsVehiclesCopy } from '@/features/ops/copy/ops-vehicles-copy'
import {
	formatVehicleFuelLabel,
	formatVehicleTransmissionLabel,
} from '@/features/ops/lib/ops-vehicle-field-labels'
import {
	getVehicleFleetStatusKey,
	getVehicleFleetStatusLabel,
	getVehicleFleetStatusPillTone,
} from '@/features/ops/lib/ops-vehicles-fleet-status'
import { buildOpsVehiclesHref } from '@/lib/ops-vehicles-url'
import type { OpsVehiclesPageView } from '@/lib/ops-vehicles-url'
import { cn } from '@/lib/utils'

function formatSnakeTitle(raw: string): string {
	const t = raw.trim()
	if (!t) return '—'
	return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export type OpsVehiclesFleetBrowserProps = {
	vehicles: OpsFleetVehicleRow[]
	categories: OpsFleetCategoryOption[]
	activeTripCountByVehicleId: Record<string, number>
	view: OpsVehiclesPageView
	selectedVehicleId: string | null
	onEditVehicle: (v: OpsFleetVehicleRow) => void
	onRequestArchive: (vehicleId: string) => void
}

export function OpsVehiclesFleetBrowser({
	vehicles,
	categories,
	activeTripCountByVehicleId,
	view,
	selectedVehicleId,
	onEditVehicle,
	onRequestArchive,
}: OpsVehiclesFleetBrowserProps) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLTableRowElement | null>(null)
	const selectedVehicle = React.useMemo(
		() => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
		[vehicles, selectedVehicleId],
	)
	const detailOpen = Boolean(selectedVehicleId && selectedVehicle)

	const handleCloseDetail = () => {
		const returnId = selectedVehicleId
		router.push(buildOpsVehiclesHref({ view, id: null }), { scroll: false })
		queueMicrotask(() => {
			const el =
				listFocusReturnRef.current ??
				(returnId
					? (document.querySelector(
							`[data-ops-vehicle-row="${returnId}"]`,
						) as HTMLTableRowElement | null)
					: null)
			el?.focus()
		})
	}

	const openOrToggleVehicle = (v: OpsFleetVehicleRow, rowEl: HTMLTableRowElement) => {
		listFocusReturnRef.current = rowEl
		const next = selectedVehicleId === v.id ? null : v.id
		router.push(buildOpsVehiclesHref({ view, id: next }), { scroll: false })
	}

	const openVehicleFromCard = (v: OpsFleetVehicleRow) => {
		router.push(buildOpsVehiclesHref({ view, id: v.id }), { scroll: false })
	}

	const listHref = (nextView: OpsVehiclesPageView) =>
		buildOpsVehiclesHref({ view: nextView, id: selectedVehicleId })

	const tableBody = (
		<OpsTableShell caption={opsVehiclesCopy.tableCaption} tableClassName="text-sm">
			<thead>
				<tr className="border-b border-ops-border text-ops-table-header text-ops-muted">
					<th scope="col" className="py-2 pr-4 font-semibold">
						Vehicle
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Plate
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Category
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Fleet status
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Active trips
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Actions
					</th>
				</tr>
			</thead>
			<tbody>
				{vehicles.length === 0 ? (
					<tr>
						<td colSpan={6} className="py-8 text-center text-sm text-ops-muted">
							No vehicles yet. Use “Add vehicle” to create the first one.
						</td>
					</tr>
				) : (
					vehicles.map((v) => {
						const catLabel = categories.find((c) => c.id === v.category_id)?.name ?? '—'
						const active = activeTripCountByVehicleId[v.id] ?? 0
						const displayName =
							v.name?.trim() ||
							[v.model_year, v.make, v.model].filter(Boolean).join(' ') ||
							'—'
						const statusKey = getVehicleFleetStatusKey(v.vehicle_condition, active)
						const selected = selectedVehicleId === v.id
						return (
							<tr
								key={v.id}
								data-ops-vehicle-row={v.id}
								data-testid="ops-vehicles-fleet-row"
								tabIndex={0}
								aria-label={opsVehiclesCopy.rowOpenDetailAria(displayName)}
								className={cn(
									'cursor-pointer border-b border-ops-border/80 outline-none transition-colors hover:bg-ops-accent-soft focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
									selected ? 'bg-ops-accent-soft' : null,
								)}
								onClick={(e) => {
									if ((e.target as HTMLElement).closest('button, a')) return
									openOrToggleVehicle(v, e.currentTarget)
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										if ((e.target as HTMLElement).closest('button, a')) return
										e.preventDefault()
										openOrToggleVehicle(v, e.currentTarget)
									}
								}}
							>
								<td className="py-3 pr-4 text-ops-foreground">
									<div className="flex items-center gap-3">
										<div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-ops-surface-active">
											{v.primary_image_url?.trim() ? (
												<Image
													src={v.primary_image_url.trim()}
													alt=""
													width={56}
													height={40}
													className="h-full w-full object-cover"
													sizes="56px"
												/>
											) : (
												<div
													className="flex h-full w-full items-center justify-center text-ops-muted"
													aria-hidden
												>
													<Car className="h-4 w-4 opacity-50" strokeWidth={1.5} />
												</div>
											)}
										</div>
										<div className="min-w-0">
											<div className="truncate font-medium">{displayName}</div>
											{v.color ? (
												<div className="truncate text-xs text-ops-muted">{v.color}</div>
											) : null}
										</div>
									</div>
								</td>
								<td className="py-3 pr-4 font-mono text-sm text-ops-muted">{v.license_plate}</td>
								<td className="py-3 pr-4 text-sm text-ops-muted">{catLabel}</td>
								<td className="py-3 pr-4">
									<OpsStatusPill tone={getVehicleFleetStatusPillTone(statusKey)}>
										{getVehicleFleetStatusLabel(statusKey)}
									</OpsStatusPill>
								</td>
								<td className="py-3 pr-4 text-sm tabular-nums text-ops-foreground/90">{active}</td>
								<td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="border-ops-border"
											onClick={() => onEditVehicle(v)}
										>
											Edit
										</Button>
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="border-red-500/50 text-red-600 hover:bg-red-500/10"
											onClick={() => onRequestArchive(v.id)}
											disabled={v.vehicle_condition === 'archived'}
										>
											Archive
										</Button>
										<Button size="sm" variant="secondary" className="border-ops-border" asChild>
											<Link href={opsVehiclesCopy.fulfilAssignHref}>{opsVehiclesCopy.assignToTrip}</Link>
										</Button>
									</div>
								</td>
							</tr>
						)
					})
				)}
			</tbody>
		</OpsTableShell>
	)

	const gridBody =
		vehicles.length === 0 ? (
			<p className="py-8 text-center text-sm text-ops-muted">
				No vehicles yet. Use “Add vehicle” to create the first one.
			</p>
		) : (
			<div role="region" aria-label={opsVehiclesCopy.gridListAria}>
				<OpsCardGrid>
					{vehicles.map((v) => {
					const catLabel = categories.find((c) => c.id === v.category_id)?.name ?? '—'
					const active = activeTripCountByVehicleId[v.id] ?? 0
					const statusKey = getVehicleFleetStatusKey(v.vehicle_condition, active)
					return (
						<OpsVehicleFleetCard
							key={v.id}
							vehicle={v}
							categoryLabel={catLabel}
							statusKey={statusKey}
							activeTripCount={active}
							onOpen={() => openVehicleFromCard(v)}
						/>
					)
					})}
				</OpsCardGrid>
			</div>
		)

	const detail =
		selectedVehicle ? (
			<OpsDetailRail
				title={
					selectedVehicle.name?.trim() ||
					[selectedVehicle.model_year, selectedVehicle.make, selectedVehicle.model]
						.filter(Boolean)
						.join(' ') ||
					selectedVehicle.license_plate
				}
				onClose={handleCloseDetail}
				footer={
					<div className="flex flex-wrap gap-2">
						<Button type="button" size="sm" onClick={() => onEditVehicle(selectedVehicle)}>
							Edit
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="border-red-500/50 text-red-600 hover:bg-red-500/10"
							onClick={() => onRequestArchive(selectedVehicle.id)}
							disabled={selectedVehicle.vehicle_condition === 'archived'}
						>
							Archive
						</Button>
						<Button size="sm" variant="secondary" className="border-ops-border" asChild>
							<Link href={opsVehiclesCopy.fulfilAssignHref}>{opsVehiclesCopy.assignToTrip}</Link>
						</Button>
					</div>
				}
			>
				<div className="space-y-6">
					<div className="relative aspect-video w-full overflow-hidden rounded-md border border-ops-border bg-ops-surface-active">
						{selectedVehicle.primary_image_url?.trim() ? (
							<Image
								src={selectedVehicle.primary_image_url.trim()}
								alt={opsVehiclesCopy.detailHeroAlt(
									selectedVehicle.name ||
										[selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(' ') ||
										selectedVehicle.license_plate,
								)}
								fill
								className="object-cover"
								sizes="(max-width: 420px) 100vw, 420px"
							/>
						) : (
							<div className="flex h-full min-h-[140px] flex-col items-center justify-center text-ops-muted">
								<span className="sr-only">
									{opsVehiclesCopy.detailHeroAlt(
										selectedVehicle.name ||
											[selectedVehicle.make, selectedVehicle.model].filter(Boolean).join(' ') ||
											selectedVehicle.license_plate,
									)}
								</span>
								<Car className="h-14 w-14 opacity-35" strokeWidth={1} aria-hidden />
							</div>
						)}
					</div>

					<section aria-labelledby="ops-vehicle-detail-status">
						<h3
							id="ops-vehicle-detail-status"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsVehiclesCopy.detailStatusHeading}
						</h3>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<OpsStatusPill
								tone={getVehicleFleetStatusPillTone(
									getVehicleFleetStatusKey(
										selectedVehicle.vehicle_condition,
										activeTripCountByVehicleId[selectedVehicle.id] ?? 0,
									),
								)}
							>
								{getVehicleFleetStatusLabel(
									getVehicleFleetStatusKey(
										selectedVehicle.vehicle_condition,
										activeTripCountByVehicleId[selectedVehicle.id] ?? 0,
									),
								)}
							</OpsStatusPill>
							<span className="text-xs text-ops-muted">
								{opsVehiclesCopy.activeTripsLabel}:{' '}
								<span className="tabular-nums text-ops-foreground">
									{activeTripCountByVehicleId[selectedVehicle.id] ?? 0}
								</span>
							</span>
						</div>
						<dl className="mt-3 space-y-1 text-sm">
							<div className="flex justify-between gap-2">
								<dt className="text-ops-muted">{opsVehiclesCopy.operationStatusLabel}</dt>
								<dd className="text-right text-ops-foreground">
									{formatSnakeTitle(selectedVehicle.operation_status)}
								</dd>
							</div>
						</dl>
					</section>

					<section aria-labelledby="ops-vehicle-detail-specs">
						<h3
							id="ops-vehicle-detail-specs"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsVehiclesCopy.detailSpecsHeading}
						</h3>
						<dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
							<div>
								<dt className="text-ops-muted">{opsVehiclesCopy.seatsLabel}</dt>
								<dd className="text-ops-foreground">{selectedVehicle.seats ?? '—'}</dd>
							</div>
							<div>
								<dt className="text-ops-muted">{opsVehiclesCopy.transmissionLabel}</dt>
								<dd className="text-ops-foreground">
									{formatVehicleTransmissionLabel(selectedVehicle.transmission)}
								</dd>
							</div>
							<div>
								<dt className="text-ops-muted">{opsVehiclesCopy.fuelLabel}</dt>
								<dd className="text-ops-foreground">
									{formatVehicleFuelLabel(selectedVehicle.fuel_type)}
								</dd>
							</div>
							<div className="sm:col-span-2">
								<dt className="text-ops-muted">Make / model / year</dt>
								<dd className="text-ops-foreground">
									{opsVehiclesCopy.makeModelYear(
										selectedVehicle.make ?? '',
										selectedVehicle.model ?? '',
										selectedVehicle.model_year != null ? String(selectedVehicle.model_year) : '',
									)}
								</dd>
							</div>
							<div className="sm:col-span-2">
								<dt className="text-ops-muted">Plate</dt>
								<dd className="font-mono text-ops-foreground">{selectedVehicle.license_plate}</dd>
							</div>
							{selectedVehicle.mileage_km != null ? (
								<div className="sm:col-span-2">
									<dt className="text-ops-muted">Mileage (km)</dt>
									<dd className="tabular-nums text-ops-foreground">{selectedVehicle.mileage_km}</dd>
								</div>
							) : null}
							{selectedVehicle.description?.trim() ? (
								<div className="sm:col-span-2">
									<dt className="text-ops-muted">Notes</dt>
									<dd className="text-ops-foreground">{selectedVehicle.description}</dd>
								</div>
							) : null}
						</dl>
					</section>

					<section aria-labelledby="ops-vehicle-detail-reminders">
						<h3
							id="ops-vehicle-detail-reminders"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsVehiclesCopy.detailRemindersHeading}
						</h3>
						<p className="mt-2 text-sm text-ops-muted">
							{opsVehiclesCopy.detailRemindersPlaceholder}
						</p>
					</section>

					<section aria-labelledby="ops-vehicle-detail-activity">
						<h3
							id="ops-vehicle-detail-activity"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsVehiclesCopy.detailActivityHeading}
						</h3>
						<p className="mt-2 min-h-[4rem] rounded-md border border-dashed border-ops-border/80 bg-ops-surface-active/40 px-3 py-3 text-sm text-ops-muted">
							{opsVehiclesCopy.detailActivityPlaceholder}
						</p>
					</section>
				</div>
			</OpsDetailRail>
		) : null

	return (
		<div className="space-y-3">
			<div
				className="flex flex-wrap items-center justify-between gap-3"
				role="toolbar"
				aria-label={opsVehiclesCopy.viewToggleGroupAria}
			>
				<div className="inline-flex rounded-md border border-ops-border p-0.5">
					<Button
						type="button"
						size="sm"
						variant={view === 'list' ? 'default' : 'ghost'}
						className={cn(view === 'list' ? 'shadow-sm' : 'text-ops-muted')}
						asChild
					>
						<Link href={listHref('list')} scroll={false}>
							{opsVehiclesCopy.viewList}
						</Link>
					</Button>
					<Button
						type="button"
						size="sm"
						variant={view === 'grid' ? 'default' : 'ghost'}
						className={cn(view === 'grid' ? 'shadow-sm' : 'text-ops-muted')}
						asChild
					>
						<Link href={listHref('grid')} scroll={false}>
							{opsVehiclesCopy.viewGrid}
						</Link>
					</Button>
				</div>
			</div>

			<OpsSplitView
				detailVisible={detailOpen}
				onCloseDetail={handleCloseDetail}
				listFocusReturnRef={listFocusReturnRef}
				list={view === 'list' ? tableBody : gridBody}
				detail={detail}
			/>
		</div>
	)
}
