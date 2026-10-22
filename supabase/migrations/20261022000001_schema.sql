-- Carnet de Voiture: core tables. Amounts are integer cents; business dates are `date`.

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  nickname text not null check (length(trim(nickname)) > 0),
  make text,
  model text,
  year integer check (year between 1886 and 2100),
  plate text,
  fuel_type text not null default 'petrol'
    check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'other')),
  initial_odometer integer not null default 0 check (initial_odometer >= 0),
  photo_path text,
  archived_at timestamptz
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles on delete cascade,
  kind text not null check (kind in ('maintenance', 'repair', 'fuel', 'other')),
  date date not null check (date <= current_date + 365),
  odometer integer check (odometer > 0),
  title text not null,
  category text,
  garage text,
  amount_cents integer check (amount_cents >= 0),
  liters numeric(7, 2) check (liters > 0),
  full_tank boolean,
  notes text,
  constraint fuel_needs_liters check (kind <> 'fuel' or liters is not null)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles on delete cascade,
  type text not null check (type in ('ct', 'insurance', 'oil', 'tires', 'timing_belt', 'custom')),
  label text not null,
  due_date date,
  due_odometer integer check (due_odometer > 0),
  every_months integer check (every_months > 0),
  every_km integer check (every_km > 0),
  done_at date,
  done_entry_id uuid references public.entries on delete set null,
  constraint reminder_has_due check (due_date is not null or due_odometer is not null)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles on delete cascade,
  entry_id uuid references public.entries on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  title text,
  doc_date date
);

create index on public.vehicles (user_id);
create index on public.entries (user_id);
create index on public.entries (vehicle_id, date);
create index on public.reminders (user_id);
create index on public.reminders (vehicle_id);
create index on public.documents (user_id);
create index on public.documents (vehicle_id);
create index on public.documents (entry_id);
