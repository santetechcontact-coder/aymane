-- Public landing read models.
-- These policies expose only non-sensitive operational data required by the
-- public homepage. Patient data, orders, consultations and emergencies remain
-- protected by authenticated RLS policies.

grant select on public.health_structures to anon, authenticated;
grant select on public.medications to anon, authenticated;
grant select on public.blood_bank to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'health_structures'
      and policyname = 'Public read verified health structures'
  ) then
    create policy "Public read verified health structures"
      on public.health_structures
      for select
      to anon, authenticated
      using (verified = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'medications'
      and policyname = 'Public read medication catalogue'
  ) then
    create policy "Public read medication catalogue"
      on public.medications
      for select
      to anon, authenticated
      using (stock > 0);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blood_bank'
      and policyname = 'Public read blood bank availability'
  ) then
    create policy "Public read blood bank availability"
      on public.blood_bank
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

create index if not exists idx_health_structures_public_verified
  on public.health_structures (city, type, name)
  where verified = true;

create index if not exists idx_medications_public_stock
  on public.medications (name, stock)
  where stock > 0;

create index if not exists idx_blood_bank_public_city_group
  on public.blood_bank (city, blood_group);
