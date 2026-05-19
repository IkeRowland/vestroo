-- Epic 12 / bookings queue: expose bookings + booking_trips to Supabase Realtime so
-- `/ops/bookings` postgres_changes subscriptions receive assignment and status updates.
-- (`public.trips` is already in supabase_realtime per VST-9.)

DO $body$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'bookings'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'booking_trips'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_trips;
	END IF;
END;
$body$;
