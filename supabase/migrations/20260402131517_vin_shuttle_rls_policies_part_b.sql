create policy trips_select on public.trips
  for select to authenticated using (
    public.is_staff(auth.uid())
    or customer_id = auth.uid()
    or driver_id = auth.uid()
  );
create policy trips_insert_customer on public.trips
  for insert to authenticated with check (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy trips_update_parties on public.trips
  for update to authenticated using (
    public.is_staff(auth.uid())
    or customer_id = auth.uid()
    or driver_id = auth.uid()
  ) with check (true);

create policy bookings_select on public.bookings
  for select to authenticated using (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy bookings_insert on public.bookings
  for insert to authenticated with check (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy bookings_update on public.bookings
  for update to authenticated using (customer_id = auth.uid() or public.is_staff(auth.uid()));

create policy booking_trips_select on public.booking_trips
  for select to authenticated using (
    public.is_staff(auth.uid())
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );
create policy booking_trips_write on public.booking_trips
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy booking_trips_customer_insert on public.booking_trips
  for insert to authenticated with check (
    exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
    and exists (select 1 from public.trips t where t.id = trip_id and t.customer_id = auth.uid())
  );

create policy tickets_passenger on public.tickets
  for select to authenticated using (passenger_id = auth.uid() or public.is_staff(auth.uid()));
create policy tickets_insert on public.tickets
  for insert to authenticated with check (passenger_id = auth.uid() or public.is_staff(auth.uid()));
create policy tickets_update on public.tickets
  for update to authenticated using (passenger_id = auth.uid() or public.is_staff(auth.uid()));

create policy conversations_parties on public.conversations
  for all to authenticated using (
    public.is_staff(auth.uid())
    or customer_id = auth.uid()
    or driver_id = auth.uid()
  ) with check (
    public.is_staff(auth.uid())
    or customer_id = auth.uid()
    or driver_id = auth.uid()
  );

create policy notifications_own on public.notifications
  for all to authenticated using (recipient_id = auth.uid() or public.is_staff(auth.uid()))
  with check (recipient_id = auth.uid() or public.is_staff(auth.uid()));

create policy ratings_parties on public.ratings
  for select to authenticated using (
    public.is_staff(auth.uid()) or customer_id = auth.uid() or driver_id = auth.uid()
  );
create policy ratings_insert_customer on public.ratings
  for insert to authenticated with check (customer_id = auth.uid() or public.is_staff(auth.uid()));
