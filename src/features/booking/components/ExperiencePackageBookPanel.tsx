'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useBookingStore } from '@/features/booking/hooks/useBookingStore'
import { calculateExperienceQuote } from '@/actions/calculateExperienceQuote'
import type { ExperiencePackageAddonDef } from '@/lib/experience-package-quote'

export type ExperiencePackageBookPanelProps = {
  packageId: string
  packageTitle: string
  addons: ExperiencePackageAddonDef[]
}

export function ExperiencePackageBookPanel({
  packageId,
  packageTitle,
  addons,
}: ExperiencePackageBookPanelProps) {
  const router = useRouter()
  const {
    setTripDetails,
    setQuoteDetails,
    setBookingProduct,
    selectVehicle,
  } = useBookingStore()

  const [groupSize, setGroupSize] = useState(2)
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(8, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  })
  const [timeStr, setTimeStr] = useState('08:00')
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>(
    {}
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const toggleAddon = (id: string, checked: boolean) => {
    setSelectedAddons((prev) => ({ ...prev, [id]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const [h, m] = timeStr.split(':').map(Number)
      const dateWithTime = new Date(dateStr)
      dateWithTime.setHours(h || 8, m || 0, 0, 0)
      if (dateWithTime < new Date(new Date().setHours(0, 0, 0, 0))) {
        setError('Please choose today or a future date.')
        setLoading(false)
        return
      }

      const addonIds = Object.entries(selectedAddons)
        .filter(([, on]) => on)
        .map(([id]) => id)

      const result = await calculateExperienceQuote({
        packageId,
        date: dateWithTime,
        groupSize,
        selectedAddonIds: addonIds,
      })

      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return
      }

      const { data } = result
      const vehicle = data.vehicleOptions[0]
      if (!vehicle) {
        setError('No vehicle option returned for this package.')
        setLoading(false)
        return
      }

      setTripDetails({
        origin: data.stubOrigin,
        destination: data.stubDestination,
        date: dateWithTime,
        passengers: groupSize,
        flightNumber: null,
      })
      setBookingProduct({
        bookingIntent: 'experience_package',
        hourlyDurationHours: null,
        hourlyServiceAreaNotes: null,
        hourlyBillableHours: null,
        experiencePackageId: packageId,
        experienceAddonIds: addonIds,
      })
      setQuoteDetails({
        quoteAmount: data.totalZar,
        estimatedDuration: data.estimatedDurationMinutes,
        distance: null,
        vehicleOptions: data.vehicleOptions,
      })
      selectVehicle(vehicle.id, vehicle.price)

      router.push('/book/quote')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Book this experience
        </h2>
        <p className="text-sm text-gray-600 mt-1">{packageTitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="exp-date">Date</Label>
          <Input
            id="exp-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp-time">Start time</Label>
          <Input
            id="exp-time"
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            required
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exp-group">Group size</Label>
        <Input
          id="exp-group"
          type="number"
          min={1}
          max={20}
          value={groupSize}
          onChange={(e) =>
            setGroupSize(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
          }
          required
          className="h-11 max-w-[8rem]"
        />
      </div>

      {addons.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">Add-ons</p>
          <div className="space-y-2">
            {addons.map((a) => (
              <Checkbox
                key={a.id}
                id={`addon-${a.id}`}
                label={`${a.label} — R ${a.price_zar.toFixed(2)}`}
                checked={selectedAddons[a.id] ?? false}
                onChange={(ev) => toggleAddon(a.id, ev.target.checked)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-vest-rust hover:bg-vest-rust-dark text-white"
      >
        {loading ? 'Getting quote…' : 'Continue to quote'}
      </Button>
    </form>
  )
}
