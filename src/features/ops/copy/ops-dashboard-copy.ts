import { OPS_WALK_IN_NEW_QUEUE_HREF } from '@/lib/ops-walk-in-queue-query'

/**
 * Page-level strings for `/ops` dashboard (Story 17.6 / FE.17.12) — NFR.17.8.
 * KPI tile strings remain in `ops-kpi-card-copy.ts`; chart empties in `ops-charts-copy.ts`.
 */
export const opsDashboardCopy = {
	overviewSectionHeading: 'Overview',
	scorecardsLandmarkLabel: 'Operations scorecards',
	chartsSectionHeading: 'Analytics',
	/** Right column (Wheelzie-style dashboard): shortcuts + static guidance. */
	rightRailSectionHeading: 'At a glance',
	shortcutsLandmarkLabel: 'Dashboard shortcuts',
	shortcutsTitle: 'Shortcuts',
	tipListTitle: 'Reminders',
	tipList: [
		'Review Trips for live status and assignment before reassigning drivers.',
		'Use advanced booking search on Bookings when a customer only has a reference or contact fragment.',
		'Check walk-in and account queues when trip queues show unexpected counts.',
	] as const,
	tipListAria: 'Operational reminders',
	linkTrips: { label: 'Trips & assignment', href: '/ops/trips' },
	linkBookings: { label: 'Bookings queue', href: '/ops/bookings' },
	linkBookingsSearch: {
		label: 'Booking search',
		href: '/ops/bookings#ops-advanced-booking-search',
	},
	linkWalkIn: { label: 'Walk-in queue', href: OPS_WALK_IN_NEW_QUEUE_HREF },
	revenueChartTitle: 'Revenue this week',
	revenueChartSummary:
		'Illustrative seven-day curve — live revenue integration lands in a dedicated loader story.',
	tripMixChartTitle: 'Trip status mix',
	tripMixChartSummary:
		'Shares use dashboard trip counts (en route, booking stage, completed in last 7 days). Cancelled split follows when that aggregate ships.',
	/** Shown next to the revenue card title (Wheelzie “Last 8 Month” cue). */
	revenuePeriodPill: 'This week',
	activityBarTitle: 'Activity overview',
	activityBarSummary:
		'Preview mix of in-flight vs settled work by month — not a financial or payroll report.',
	activityBarAria: (label: string) => `${label} (preview layout data).`,
	activityBarSegmentUp: 'In flight',
	activityBarSegmentDown: 'Settled',
	previewBadge: 'Preview',
	sparklineAria: (metricTitle: string) =>
		`${metricTitle}: sample trend curve anchored to the current value (preview, not historical data).`,
	revenueChartAria:
		'Revenue this week: illustrative seven-day trend preview for layout; not live financial data.',
	tripMixChartAria: (partsSummary: string, total: number) =>
		`Trip status mix: ${partsSummary}. Total ${total} trips in this snapshot.`,
	demoBadgeAria: 'Preview data — not live analytics',
	segmentOnTrip: 'On trip',
	segmentScheduled: 'Scheduled',
	segmentCompleted: 'Completed',
	segmentCancelled: 'Cancelled',
} as const
