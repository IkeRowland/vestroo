create policy bus_trackings_read on public.bus_trackings
  for select to authenticated using (
    public.is_staff(auth.uid())
    or exists (
      select 1 from public.driver_bus_schedules d
      where d.id = driver_bus_schedule_id and d.driver_id = auth.uid()
    )
  );
create policy bus_trackings_write on public.bus_trackings
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy bus_trackings_driver_insert on public.bus_trackings
  for insert to authenticated with check (
    exists (
      select 1 from public.driver_bus_schedules d
      where d.id = driver_bus_schedule_id and d.driver_id = auth.uid()
    )
  );
create policy bus_trackings_driver_update on public.bus_trackings
  for update to authenticated using (
    exists (
      select 1 from public.driver_bus_schedules d
      where d.id = driver_bus_schedule_id and d.driver_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.driver_bus_schedules d
      where d.id = driver_bus_schedule_id and d.driver_id = auth.uid()
    )
  );

create policy shared_itineraries_rw on public.shared_itineraries
  for all to authenticated using (
    public.is_staff(auth.uid()) or driver_id = auth.uid()
  ) with check (
    public.is_staff(auth.uid()) or driver_id = auth.uid()
  );

create policy key_tokens_rw on public.key_tokens
  for all to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()))
  with check (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy otp_sessions_rw on public.otp_sessions
  for all to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()))
  with check (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy bus_trips_read_auth on public.bus_trips
  for select to authenticated using (true);
create policy bus_schedules_read_auth on public.bus_schedules
  for select to authenticated using (true);

create policy driver_bus_schedules_driver_read on public.driver_bus_schedules
  for select to authenticated using (driver_id = auth.uid() or public.is_staff(auth.uid()));
create policy driver_bus_schedules_driver_update on public.driver_bus_schedules
  for update to authenticated using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy driver_schedules_driver_rw on public.driver_schedules
  for all to authenticated using (
    public.is_staff(auth.uid()) or driver_id = auth.uid()
  ) with check (
    public.is_staff(auth.uid()) or driver_id = auth.uid()
  );
