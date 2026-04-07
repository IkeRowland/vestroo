create policy vehicle_trackings_read on public.vehicle_trackings
  for select to authenticated using (
    public.is_staff(auth.uid())
    or exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.driver_id = auth.uid()
    )
  );
create policy vehicle_trackings_write on public.vehicle_trackings
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy vehicle_trackings_chauffeur_insert on public.vehicle_trackings
  for insert to authenticated with check (
    exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.driver_id = auth.uid()
    )
  );
create policy vehicle_trackings_chauffeur_update on public.vehicle_trackings
  for update to authenticated using (
    exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.driver_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.driver_id = auth.uid()
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

create policy service_runs_read_auth on public.service_runs
  for select to authenticated using (true);
create policy service_patterns_read_auth on public.service_patterns
  for select to authenticated using (true);

create policy chauffeur_assignments_driver_read on public.chauffeur_assignments
  for select to authenticated using (driver_id = auth.uid() or public.is_staff(auth.uid()));
create policy chauffeur_assignments_driver_update on public.chauffeur_assignments
  for update to authenticated using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

create policy driver_schedules_driver_rw on public.driver_schedules
  for all to authenticated using (
    public.is_staff(auth.uid()) or driver_id = auth.uid()
  ) with check (
    public.is_staff(auth.uid()) or driver_id = auth.uid()
  );
