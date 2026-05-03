'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import {
  combineRideDateAndTime,
  TRIP_REQUEST_MIN_LEAD_MS,
  type RideDetailsFieldErrors,
} from './ride-details-validate';
import {
  addJohannesburgCalendarDaysFromYmd,
  getJohannesburgTodayYmd,
  getJohannesburgWallPartsFromInstant,
  johannesburgWallToUtcInstant,
  roundUpToNext15MinutesJohannesburg,
  TRIP_REQUEST_MARKET_TIME_ZONE,
} from './trip-request-market-time';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatLocalDatetimeLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const m = d.getMinutes();
  return `${y}-${pad2(mo)}-${pad2(day)}T${pad2(h)}:${pad2(m)}`;
}

/** Maps stored Johannesburg ride fields to `datetime-local` value (device-local presentation). */
export function johannesburgRideToDatetimeLocalValue(rideDate: string, rideTime: string): string {
  const combined = combineRideDateAndTime(rideDate, rideTime);
  if (!combined) return '';
  return formatLocalDatetimeLocal(combined);
}

function daysInGregorianMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function weekdaySun0Johannesburg(y: number, mo: number, d: number): number {
  const ms = johannesburgWallToUtcInstant(y, mo, d, 12, 0);
  if (ms === null) return 0;
  const short = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: TRIP_REQUEST_MARKET_TIME_ZONE,
  }).format(new Date(ms));
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? 0;
}

function useMinWidthLg(): boolean {
  const [lg, setLg] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setLg(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return lg;
}

function formatTriggerLabel(rideDate: string, rideTime: string): string {
  const combined = combineRideDateAndTime(rideDate, rideTime);
  if (!combined) return 'Pick date & time';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TRIP_REQUEST_MARKET_TIME_ZONE,
  }).format(combined);
}

function computeTodayChip(nowMs: number): { rideDate: string; rideTime: string } | null {
  const target = roundUpToNext15MinutesJohannesburg(Math.max(nowMs + TRIP_REQUEST_MIN_LEAD_MS, nowMs));
  const p = getJohannesburgWallPartsFromInstant(target);
  const ymd = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
  const todayYmd = getJohannesburgTodayYmd(nowMs);
  if (ymd !== todayYmd) return null;
  return { rideDate: ymd, rideTime: `${pad2(p.hour)}:${pad2(p.minute)}` };
}

function computeTomorrowChip(nowMs: number): { rideDate: string; rideTime: string } {
  const todayYmd = getJohannesburgTodayYmd(nowMs);
  const rideDate = addJohannesburgCalendarDaysFromYmd(todayYmd, 1);
  const deadline = nowMs + TRIP_REQUEST_MIN_LEAD_MS;
  for (let mins = 0; mins < 24 * 60; mins += 15) {
    const h = Math.floor(mins / 60);
    const mi = mins % 60;
    const label = `${pad2(h)}:${pad2(mi)}`;
    const combined = combineRideDateAndTime(rideDate, label);
    if (combined && combined.getTime() >= deadline) {
      return { rideDate, rideTime: label };
    }
  }
  return { rideDate, rideTime: '23:45' };
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export type TripRequestPickupScheduleProps = {
  rideDate: string;
  rideTime: string;
  onChange: (patch: { rideDate: string; rideTime: string }) => void;
  errors: Pick<RideDetailsFieldErrors, 'rideDate' | 'rideTime' | 'schedule'>;
};

export function TripRequestPickupSchedule({
  rideDate,
  rideTime,
  onChange,
  errors,
}: TripRequestPickupScheduleProps) {
  const isDesktop = useMinWidthLg();
  const [open, setOpen] = React.useState(false);
  const nowMs = Date.now();

  const parsedRide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rideDate.trim());
  const initialY = parsedRide
    ? Number(parsedRide[1])
    : getJohannesburgWallPartsFromInstant(nowMs).year;
  const initialM = parsedRide
    ? Number(parsedRide[2])
    : getJohannesburgWallPartsFromInstant(nowMs).month;

  const [viewYear, setViewYear] = React.useState(initialY);
  const [viewMonth, setViewMonth] = React.useState(initialM);

  React.useEffect(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rideDate.trim());
    if (m) {
      setViewYear(Number(m[1]));
      setViewMonth(Number(m[2]));
    }
  }, [rideDate]);

  const todayYmd = getJohannesburgTodayYmd(nowMs);
  const todayChip = computeTodayChip(nowMs);
  const tomorrowChip = computeTomorrowChip(nowMs);

  const minDatetimeLocal = formatLocalDatetimeLocal(new Date(nowMs + TRIP_REQUEST_MIN_LEAD_MS));

  const datetimeLocalValue = johannesburgRideToDatetimeLocalValue(rideDate, rideTime);

  const handleDatetimeLocalChange = (raw: string) => {
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    const p = getJohannesburgWallPartsFromInstant(d.getTime());
    onChange({
      rideDate: `${p.year}-${pad2(p.month)}-${pad2(p.day)}`,
      rideTime: `${pad2(p.hour)}:${pad2(p.minute)}`,
    });
  };

  const dim = daysInGregorianMonth(viewYear, viewMonth);
  const firstWd = weekdaySun0Johannesburg(viewYear, viewMonth, 1);
  const pad = firstWd;
  const cells: ({ kind: 'empty' } | { kind: 'day'; day: number })[] = [];
  for (let i = 0; i < pad; i++) cells.push({ kind: 'empty' });
  for (let day = 1; day <= dim; day++) cells.push({ kind: 'day', day });
  while (cells.length % 7 !== 0) cells.push({ kind: 'empty' });
  while (cells.length < 42) cells.push({ kind: 'empty' });

  const deadlineMs = nowMs + TRIP_REQUEST_MIN_LEAD_MS;

  const timeSlots = React.useMemo(() => {
    const slots: string[] = [];
    for (let mins = 0; mins < 24 * 60; mins += 15) {
      const h = Math.floor(mins / 60);
      const mi = mins % 60;
      slots.push(`${pad2(h)}:${pad2(mi)}`);
    }
    return slots;
  }, []);

  const selectedYmd = rideDate.trim();
  const combinedMessage = errors.schedule ?? errors.rideDate ?? errors.rideTime;

  const shiftMonth = (delta: number) => {
    let y = viewYear;
    let m = viewMonth + delta;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  const monthMidMs = johannesburgWallToUtcInstant(viewYear, viewMonth, 15, 12, 0);
  const monthLabel =
    monthMidMs != null
      ? new Intl.DateTimeFormat(undefined, {
          month: 'long',
          year: 'numeric',
          timeZone: TRIP_REQUEST_MARKET_TIME_ZONE,
        }).format(new Date(monthMidMs))
      : `${viewYear}-${pad2(viewMonth)}`;

  return (
    <div className="space-y-2 font-Poppins">
      <Label htmlFor="trip-pickup-schedule" className="font-display text-sm font-semibold text-foreground" required>
        Pickup date & time
      </Label>

      <div className="flex flex-wrap gap-2">
        {todayChip ? (
          <button
            type="button"
            className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-full border border-border bg-muted/50 px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => onChange(todayChip)}
          >
            Today
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-full border border-border bg-muted/50 px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => onChange(tomorrowChip)}
        >
          Tomorrow
        </button>
      </div>

      {!isDesktop ? (
        <input
          id="trip-pickup-schedule"
          type="datetime-local"
          step={900}
          min={minDatetimeLocal}
          value={datetimeLocalValue}
          onChange={(e) => handleDatetimeLocalChange(e.target.value)}
          className={cn(
            'flex min-h-[44px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm',
            'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            combinedMessage ? 'border-destructive' : '',
          )}
          aria-invalid={!!combinedMessage}
          aria-describedby={combinedMessage ? 'trip-schedule-error' : undefined}
        />
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              id="trip-pickup-schedule"
              className={cn(
                'min-h-[44px] w-full justify-between rounded-lg border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm hover:bg-muted/50',
                combinedMessage ? 'border-destructive' : '',
              )}
              aria-invalid={!!combinedMessage}
              aria-describedby={combinedMessage ? 'trip-schedule-error' : undefined}
            >
              <span>{formatTriggerLabel(rideDate, rideTime)}</span>
              <span className="text-slate-400" aria-hidden>
                ▾
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(calc(100vw-1.5rem),22rem)] border border-border bg-card p-3 text-card-foreground shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 min-w-11 shrink-0 px-0"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                ‹
              </Button>
              <p className="font-display text-sm font-semibold text-foreground">{monthLabel}</p>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 min-w-11 shrink-0 px-0"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                ›
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((c, idx) => {
                if (c.kind === 'empty') {
                  return <div key={`e-${idx}`} className="h-9" />;
                }
                const ymd = `${viewYear}-${pad2(viewMonth)}-${pad2(c.day)}`;
                const disabled = ymd.localeCompare(todayYmd) < 0;
                const isSelected = selectedYmd === ymd;
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={disabled}
                    className={cn(
                      'flex h-9 min-h-9 min-w-9 items-center justify-center rounded-md text-xs font-medium transition',
                      disabled && 'cursor-not-allowed text-slate-300',
                      !disabled && 'text-slate-800 hover:bg-slate-100',
                      isSelected && 'bg-vest-rust text-white hover:bg-vest-rust-dark',
                    )}
                    onClick={() => {
                      const nextDate = ymd;
                      let nextTime = rideTime;
                      const tryComb = combineRideDateAndTime(nextDate, nextTime);
                      if (
                        !tryComb ||
                        tryComb.getTime() < deadlineMs
                      ) {
                        for (const slot of timeSlots) {
                          const comb = combineRideDateAndTime(nextDate, slot);
                          if (comb && comb.getTime() >= deadlineMs) {
                            nextTime = slot;
                            break;
                          }
                        }
                      }
                      onChange({ rideDate: nextDate, rideTime: nextTime });
                    }}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-600">Time (15 min)</p>
              <div className="max-h-40 overflow-y-auto [scrollbar-width:thin]">
                <div className="grid grid-cols-3 gap-1">
                  {timeSlots.map((slot) => {
                    const comb =
                      selectedYmd && combineRideDateAndTime(selectedYmd, slot);
                    const disabled = !comb || comb.getTime() < deadlineMs;
                    const isSel = rideTime === slot && rideDate === selectedYmd;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={disabled}
                        className={cn(
                          'min-h-11 rounded-md px-1 py-2 text-xs font-medium transition',
                          disabled && 'cursor-not-allowed text-slate-300',
                          !disabled && 'text-slate-800 hover:bg-slate-100',
                          isSel && !disabled && 'bg-slate-900 text-white hover:bg-slate-900',
                        )}
                        onClick={() => {
                          if (selectedYmd) {
                            onChange({ rideDate: selectedYmd, rideTime: slot });
                          }
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {combinedMessage ? (
        <p id="trip-schedule-error" className="text-xs text-destructive font-Poppins" role="alert">
          {combinedMessage}
        </p>
      ) : null}
    </div>
  );
}
