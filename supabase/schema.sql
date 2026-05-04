-- Run this in Supabase SQL Editor

create type gender_type as enum ('male', 'female');

create table if not exists persons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  gender      gender_type not null,
  phone       text,
  birth_date  date,
  birth_place text,
  is_alive    boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists relationships (
  id                 uuid primary key default gen_random_uuid(),
  person_id          uuid not null references persons(id) on delete cascade,
  related_person_id  uuid not null references persons(id) on delete cascade,
  type               text not null check (type in ('father', 'mother', 'spouse')),
  unique (person_id, related_person_id, type)
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger persons_updated_at
  before update on persons
  for each row execute procedure update_updated_at();

-- RLS: public read, admin write
alter table persons enable row level security;
alter table relationships enable row level security;

create policy "public can read persons"
  on persons for select using (true);

create policy "authenticated can manage persons"
  on persons for all using (auth.role() = 'authenticated');

create policy "public can read relationships"
  on relationships for select using (true);

create policy "authenticated can manage relationships"
  on relationships for all using (auth.role() = 'authenticated');
