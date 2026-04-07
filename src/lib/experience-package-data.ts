import { createServerClient } from '@/lib/supabase/server'
import { fetchActiveVehicleTypes } from '@/lib/pricing-data'
import type { QuoteLocation } from '@/lib/booking-quote-types'

export type ExperiencePackageRow = {
  id: string
  slug: string
  title: string
  description: string | null
  base_price_zar: number
  per_passenger_increment_zar: number
  included_passengers: number
  default_vehicle_category_id: string | null
  itinerary: unknown
  addon_catalog: unknown
  stub_origin: unknown
  stub_destination: unknown
  estimated_duration_minutes: number | null
  is_active: boolean
}

function parseLocationStub(raw: unknown, label: string): QuoteLocation {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid ${label} stub`)
  }
  const o = raw as Record<string, unknown>
  const placeId = String(o.placeId ?? '')
  const formattedAddress = String(o.formattedAddress ?? '')
  const name = String(o.name ?? '')
  const latitude = Number(o.latitude)
  const longitude = Number(o.longitude)
  if (
    !placeId ||
    !formattedAddress ||
    !name ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(`Invalid ${label} stub fields`)
  }
  return { placeId, formattedAddress, name, latitude, longitude }
}

export function experiencePackageStubLocations(row: ExperiencePackageRow): {
  origin: QuoteLocation
  destination: QuoteLocation
} {
  return {
    origin: parseLocationStub(row.stub_origin, 'origin'),
    destination: parseLocationStub(row.stub_destination, 'destination'),
  }
}

function mapRow(data: Record<string, unknown>): ExperiencePackageRow {
  return {
    id: String(data.id),
    slug: String(data.slug),
    title: String(data.title),
    description: data.description != null ? String(data.description) : null,
    base_price_zar: Number(data.base_price_zar),
    per_passenger_increment_zar: Number(data.per_passenger_increment_zar),
    included_passengers: Number(data.included_passengers),
    default_vehicle_category_id:
      data.default_vehicle_category_id != null
        ? String(data.default_vehicle_category_id)
        : null,
    itinerary: data.itinerary,
    addon_catalog: data.addon_catalog,
    stub_origin: data.stub_origin,
    stub_destination: data.stub_destination,
    estimated_duration_minutes:
      data.estimated_duration_minutes != null
        ? Number(data.estimated_duration_minutes)
        : null,
    is_active: Boolean(data.is_active),
  }
}

export async function fetchExperiencePackageById(
  id: string
): Promise<ExperiencePackageRow | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('experience_packages')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    if (error) {
      console.warn('[experience-package-data] fetch by id:', error.message)
    }
    return null
  }

  return mapRow(data as Record<string, unknown>)
}

export async function fetchExperiencePackageBySlug(
  slug: string
): Promise<ExperiencePackageRow | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('experience_packages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    if (error) {
      console.warn('[experience-package-data] fetch by slug:', error.message)
    }
    return null
  }

  return mapRow(data as Record<string, unknown>)
}

export type ExperienceItineraryStep = {
  order: number
  title: string
  duration_minutes?: number
  location_label?: string
  highlight?: string
}

export function normalizeItinerarySteps(raw: unknown): ExperienceItineraryStep[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: ExperienceItineraryStep[] = []
  let i = 0
  for (const step of raw) {
    i += 1
    if (!step || typeof step !== 'object') {
      continue
    }
    const s = step as Record<string, unknown>
    const title = String(s.title ?? '')
    if (!title) {
      continue
    }
    const order = typeof s.order === 'number' ? s.order : i
    const duration_minutes =
      typeof s.duration_minutes === 'number' ? s.duration_minutes : undefined
    out.push({
      order,
      title,
      duration_minutes,
      location_label:
        s.location_label != null ? String(s.location_label) : undefined,
      highlight: s.highlight != null ? String(s.highlight) : undefined,
    })
  }
  return out.sort((a, b) => a.order - b.order)
}

export type ExperiencePackageListItem = {
  id: string
  slug: string
  title: string
  description: string | null
  base_price_zar: number
}

export async function listActiveExperiencePackages(): Promise<
  ExperiencePackageListItem[]
> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('experience_packages')
    .select('id, slug, title, description, base_price_zar')
    .eq('is_active', true)
    .order('title')

  if (error || !data?.length) {
    if (error) {
      console.warn('[experience-package-data] list:', error.message)
    }
    return []
  }

  return data.map((row) => ({
    id: String((row as Record<string, unknown>).id),
    slug: String((row as Record<string, unknown>).slug),
    title: String((row as Record<string, unknown>).title),
    description:
      (row as Record<string, unknown>).description != null
        ? String((row as Record<string, unknown>).description)
        : null,
    base_price_zar: Number((row as Record<string, unknown>).base_price_zar),
  }))
}

/**
 * Vehicle category id used for quote + reconciliation (single tier for the package).
 */
export async function resolveExperiencePackageVehicleCategoryId(
  row: ExperiencePackageRow,
  groupSize: number
): Promise<string> {
  if (row.default_vehicle_category_id) {
    return row.default_vehicle_category_id
  }
  const types = await fetchActiveVehicleTypes()
  const fitting = types
    .filter((t) => t.passenger_capacity >= groupSize)
    .sort((a, b) => a.passenger_capacity - b.passenger_capacity)
  const pick = fitting[0] ?? types[0]
  if (!pick) {
    throw new Error('No vehicle tier available for this experience package')
  }
  return pick.id
}
