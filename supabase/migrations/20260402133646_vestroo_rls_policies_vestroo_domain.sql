create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_all on public.profiles
  for all to authenticated using (public.is_staff(auth.uid())) with check (true);

create policy vehicle_categories_staff on public.vehicle_categories
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy service_configs_staff on public.service_configs
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy vehicle_pricings_staff on public.vehicle_pricings
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy vehicles_staff on public.vehicles
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy service_points_staff on public.service_points
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy service_routes_staff on public.service_routes
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy service_route_points_staff on public.service_route_points
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy service_patterns_staff on public.service_patterns
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy service_runs_staff on public.service_runs
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy driver_schedules_staff on public.driver_schedules
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy chauffeur_assignments_staff on public.chauffeur_assignments
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy trip_seats_staff on public.trip_seats
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create policy service_points_read_active on public.service_points
  for select to authenticated using (status = 'active');
create policy service_routes_read on public.service_routes
  for select to authenticated using (true);
create policy service_route_points_read on public.service_route_points
  for select to authenticated using (true);
create policy scenic_routes_read on public.scenic_routes
  for select to authenticated using (true);
