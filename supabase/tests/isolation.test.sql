begin;
select plan(23);

-- Two users, A and B.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'b@example.com');

set local role authenticated;

-- ===== As A: create one row of each kind =====
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}';

select lives_ok($$ insert into public.vehicles (id, nickname, fuel_type, initial_odometer)
  values ('a0000000-0000-0000-0000-00000000000a', 'Clio', 'petrol', 40000) $$, 'A creates a vehicle');
select lives_ok($$ insert into public.entries (id, vehicle_id, kind, date, odometer, title, liters, full_tank, amount_cents)
  values ('a0000000-0000-0000-0000-0000000000e1', 'a0000000-0000-0000-0000-00000000000a', 'fuel', '2026-10-01', 41000, 'Plein', 40, true, 7000) $$, 'A creates a fuel entry');
select lives_ok($$ insert into public.reminders (vehicle_id, type, label, due_date)
  values ('a0000000-0000-0000-0000-00000000000a', 'ct', 'Contrôle technique', '2027-01-01') $$, 'A creates a reminder');
select lives_ok($$ insert into public.documents (vehicle_id, entry_id, storage_path, file_name, mime_type, size_bytes)
  values ('a0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-0000000000e1',
          'aaaaaaaa-0000-0000-0000-000000000000/a0000000-0000-0000-0000-00000000000a/f.pdf', 'f.pdf', 'application/pdf', 1000) $$, 'A creates a document');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('factures', 'aaaaaaaa-0000-0000-0000-000000000000/a0000000-0000-0000-0000-00000000000a/f.pdf') $$, 'A uploads into their folder');
select is((select count(*) from public.vehicles), 1::bigint, 'A sees their vehicle');

-- ===== As B =====
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}';

select is((select count(*) from public.vehicles), 0::bigint, 'B cannot see A vehicles');
select is((select count(*) from public.entries), 0::bigint, 'B cannot see A entries');
select is((select count(*) from public.reminders), 0::bigint, 'B cannot see A reminders');
select is((select count(*) from public.documents), 0::bigint, 'B cannot see A documents');
select is((select count(*) from storage.objects where bucket_id = 'factures'), 0::bigint, 'B cannot see A files');

-- Silently affects zero rows; checked below as A.
select lives_ok($$ update public.vehicles set nickname = 'pwned' $$, 'B update runs');
select lives_ok($$ delete from public.vehicles $$, 'B delete runs');

select throws_ok($$ insert into public.entries (vehicle_id, kind, date, title, amount_cents)
  values ('a0000000-0000-0000-0000-00000000000a', 'repair', '2026-10-01', 'x', 100) $$, null, null, 'B cannot attach an entry to A vehicle');

select lives_ok($$ insert into public.vehicles (id, nickname, fuel_type, initial_odometer)
  values ('b0000000-0000-0000-0000-00000000000b', 'Golf', 'diesel', 10000) $$, 'B creates a vehicle');
select throws_ok($$ insert into public.documents (vehicle_id, entry_id, storage_path, file_name, mime_type, size_bytes)
  values ('b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-000000000000/x.pdf', 'x.pdf', 'application/pdf', 10) $$,
  null, null, 'B cannot link a document to A entry');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('factures', 'aaaaaaaa-0000-0000-0000-000000000000/a0000000-0000-0000-0000-00000000000a/evil.pdf') $$,
  null, null, 'B cannot upload into A folder');

-- ===== Data rules =====
select throws_ok($$ insert into public.entries (vehicle_id, kind, date, title)
  values ('b0000000-0000-0000-0000-00000000000b', 'fuel', '2026-10-01', 'Plein') $$, '23514', null, 'a fuel entry needs liters');
select throws_ok($$ insert into public.reminders (vehicle_id, type, label)
  values ('b0000000-0000-0000-0000-00000000000b', 'custom', 'x') $$, '23514', null, 'a reminder needs a date or an odometer');
select throws_ok($$ insert into public.entries (vehicle_id, kind, date, title, odometer)
  values ('b0000000-0000-0000-0000-00000000000b', 'repair', current_date + 400, 'x', 10) $$, '23514', null, 'a date more than one year ahead is refused');

-- ===== Account deletion =====
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}';
select results_eq($$ select nickname from public.vehicles $$, array['Clio'], 'B could neither update nor delete A vehicle');
select lives_ok($$ select public.delete_my_account() $$, 'A deletes their account');
select is((select count(*) from public.vehicles), 0::bigint, 'A data is gone');

select * from finish();
rollback;
