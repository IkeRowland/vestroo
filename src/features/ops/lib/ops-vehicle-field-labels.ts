/** Short labels for fleet grid / detail (Story 17.12) — keep in sync with form options in **`OpsVehiclesFleetPanel`**. */

const TRANSMISSION: Record<string, string> = {
	automatic: 'Automatic',
	manual: 'Manual',
	cvt: 'CVT',
	semi_automatic: 'Semi-automatic',
}

const FUEL: Record<string, string> = {
	petrol: 'Petrol',
	diesel: 'Diesel',
	electric: 'Electric',
	hybrid: 'Hybrid',
	plug_in_hybrid: 'Plug-in hybrid',
}

export function formatVehicleTransmissionLabel(value: string | null | undefined): string {
	if (!value) return '—'
	return TRANSMISSION[value] ?? value.replace(/_/g, ' ')
}

export function formatVehicleFuelLabel(value: string | null | undefined): string {
	if (!value) return '—'
	return FUEL[value] ?? value.replace(/_/g, ' ')
}
