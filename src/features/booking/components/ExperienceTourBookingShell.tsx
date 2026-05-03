'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { calculateExperienceQuote } from '@/actions/calculateExperienceQuote';
import {
  ContactDetailsForm,
  type ContactDetailsFormData,
} from '@/features/booking/components/ContactDetailsForm';
import { useBookingStore } from '@/features/booking/hooks/useBookingStore';
import type { ExperiencePackageAddonDef } from '@/lib/experience-package-quote';

const STEPS = [
  { id: 'schedule', title: 'Schedule & add-ons' },
  { id: 'contact', title: 'Your contact details' },
] as const;

export type ExperienceTourBookingShellProps = {
  packageId: string;
  packageSlug: string;
  packageTitle: string;
  addons: ExperiencePackageAddonDef[];
};

export function ExperienceTourBookingShell({
  packageId,
  packageSlug,
  packageTitle,
  addons,
}: ExperienceTourBookingShellProps) {
  const router = useRouter();
  const {
    setTripDetails,
    setQuoteDetails,
    setBookingProduct,
    setCustomerDetails,
    setRiderContact,
    selectVehicle,
  } = useBookingStore();

  const [stepIndex, setStepIndex] = React.useState(0);
  const [groupSize, setGroupSize] = React.useState(2);
  const [dateStr, setDateStr] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(8, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [timeStr, setTimeStr] = React.useState('08:00');
  const [selectedAddons, setSelectedAddons] = React.useState<Record<string, boolean>>({});
  const [step0Error, setStep0Error] = React.useState<string | null>(null);
  const [contactError, setContactError] = React.useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);

  const slideHeadingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => slideHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [stepIndex]);

  const toggleAddon = (id: string, checked: boolean) => {
    setSelectedAddons((prev) => ({ ...prev, [id]: checked }));
  };

  const goNextFromSchedule = () => {
    setStep0Error(null);
    const [h, m] = timeStr.split(':').map(Number);
    const dateWithTime = new Date(dateStr);
    dateWithTime.setHours(h || 8, m || 0, 0, 0);
    if (dateWithTime < new Date(new Date().setHours(0, 0, 0, 0))) {
      setStep0Error('Please choose today or a future date.');
      return;
    }
    setStepIndex(1);
  };

  const goBack = () => {
    setContactError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const handleContactSubmit = async (data: ContactDetailsFormData) => {
    setContactError(null);
    setQuoteLoading(true);
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const dateWithTime = new Date(dateStr);
      dateWithTime.setHours(h || 8, m || 0, 0, 0);

      const addonIds = Object.entries(selectedAddons)
        .filter(([, on]) => on)
        .map(([id]) => id);

      const result = await calculateExperienceQuote({
        packageId,
        date: dateWithTime,
        groupSize,
        selectedAddonIds: addonIds,
      });

      if (!result.success) {
        setContactError(result.error);
        setQuoteLoading(false);
        return;
      }

      const { data: q } = result;
      const vehicle = q.vehicleOptions[0];
      if (!vehicle) {
        setContactError('No vehicle option returned for this package.');
        setQuoteLoading(false);
        return;
      }

      setTripDetails({
        origin: q.stubOrigin,
        destination: q.stubDestination,
        date: dateWithTime,
        passengers: groupSize,
        flightNumber: null,
      });
      setBookingProduct({
        bookingIntent: 'experience_package',
        hourlyDurationHours: null,
        hourlyServiceAreaNotes: null,
        hourlyBillableHours: null,
        experiencePackageId: packageId,
        experiencePackageSlug: packageSlug,
        experienceAddonIds: addonIds,
      });
      setQuoteDetails({
        quoteAmount: q.totalZar,
        estimatedDuration: q.estimatedDurationMinutes,
        distance: null,
        vehicleOptions: q.vehicleOptions,
      });
      selectVehicle(vehicle.id, vehicle.price);
      setCustomerDetails({
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      const rn = (data.riderName ?? '').trim();
      const re = (data.riderEmail ?? '').trim();
      const rp = (data.riderPhone ?? '').trim();
      setRiderContact(rn || re || rp ? { name: rn, email: re, phone: rp } : null);

      router.push('/book/quote');
    } catch {
      setContactError('Something went wrong. Please try again.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="flex w-full max-w-2xl min-h-0 flex-1 flex-col">
      <nav aria-label="Booking progress" className="mb-4">
        <ol className="flex flex-wrap gap-4 text-sm">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                'flex items-center gap-2',
                i === stepIndex && 'font-semibold text-[#1a7a70]',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs',
                  i === stepIndex
                    ? 'border-[#25A89B] bg-[#25A89B]/10 text-slate-900'
                    : i < stepIndex
                      ? 'border-slate-300 bg-slate-100 text-slate-800'
                      : 'border-slate-200 text-slate-500',
                )}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                {i + 1}
              </span>
              <span className={cn(i > stepIndex ? 'text-slate-400' : 'text-slate-800')}>
                {s.title}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md"
        role="region"
        aria-labelledby="experience-tour-slide-heading"
      >
        <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <h2
            id="experience-tour-slide-heading"
            ref={slideHeadingRef}
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B] focus-visible:ring-offset-2"
          >
            {STEPS[stepIndex].title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{packageTitle}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7 max-h-[min(32rem,72vh)]">
          {stepIndex === 0 ? (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-tour-date">Date</Label>
                  <Input
                    id="exp-tour-date"
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-tour-time">Start time</Label>
                  <Input
                    id="exp-tour-time"
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-tour-group">Group size</Label>
                <Input
                  id="exp-tour-group"
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
                  <p className="text-sm font-medium text-slate-800">Add-ons</p>
                  <div className="space-y-2">
                    {addons.map((a) => (
                      <Checkbox
                        key={a.id}
                        id={`exp-tour-addon-${a.id}`}
                        label={`${a.label} — R ${a.price_zar.toFixed(2)}`}
                        checked={selectedAddons[a.id] ?? false}
                        onChange={(ev) => toggleAddon(a.id, ev.target.checked)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {step0Error ? (
                <p className="text-sm text-red-600" role="alert">
                  {step0Error}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="sr-only">
                Package {packageTitle}. Next we need your contact details for the booking.
              </p>
              <ContactDetailsForm
                formId="experience-tour-contact-form"
                onSubmit={handleContactSubmit}
                showFlightNumber={false}
                disabled={quoteLoading}
              />
              {contactError ? (
                <p className="text-sm text-red-600" role="alert">
                  {contactError}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-col-reverse gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          {!isFirstStep ? (
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-11 sm:w-auto"
              onClick={goBack}
              disabled={quoteLoading}
              aria-label={`Go back from ${STEPS[stepIndex].title}`}
            >
              Back
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {!isLastStep ? (
            <Button
              type="button"
              className="w-full min-h-11 sm:min-w-[7rem]"
              onClick={goNextFromSchedule}
              aria-label={`Continue from ${STEPS[stepIndex].title}`}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full min-h-11 sm:min-w-[10rem] bg-[#25A89B] hover:bg-[#1f8f83] text-white"
              disabled={quoteLoading}
              onClick={() => {
                const el = document.getElementById(
                  'experience-tour-contact-form',
                ) as HTMLFormElement | null;
                el?.requestSubmit();
              }}
            >
              {quoteLoading ? 'Getting quote…' : 'Continue to quote'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
