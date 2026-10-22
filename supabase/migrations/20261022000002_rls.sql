-- Every row belongs to one user; nobody can read or write another user's rows.

alter table public.vehicles enable row level security;
alter table public.entries enable row level security;
alter table public.reminders enable row level security;
alter table public.documents enable row level security;

create policy "own vehicles" on public.vehicles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own entries" on public.entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own reminders" on public.reminders for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own documents" on public.documents for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- RLS checks the row's own user_id but not the rows it points to: without this trigger,
-- a user could attach an entry or a document to someone else's vehicle.
create function public.check_ownership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  linked_entry uuid;
begin
  if not exists (select 1 from public.vehicles v where v.id = new.vehicle_id and v.user_id = new.user_id) then
    raise exception 'vehicle % does not belong to the current user', new.vehicle_id using errcode = '42501';
  end if;

  if tg_table_name = 'documents' then
    linked_entry := new.entry_id;
  elsif tg_table_name = 'reminders' then
    linked_entry := new.done_entry_id;
  end if;

  if linked_entry is not null and not exists (
    select 1 from public.entries e
    where e.id = linked_entry and e.vehicle_id = new.vehicle_id and e.user_id = new.user_id
  ) then
    raise exception 'entry % does not belong to this vehicle', linked_entry using errcode = '42501';
  end if;

  return new;
end $$;

create trigger check_ownership before insert or update on public.entries
  for each row execute function public.check_ownership();
create trigger check_ownership before insert or update on public.reminders
  for each row execute function public.check_ownership();
create trigger check_ownership before insert or update on public.documents
  for each row execute function public.check_ownership();

-- Deletes the caller's account; cascades remove all their rows.
-- Files must be removed through the Storage API beforehand (direct SQL deletes are blocked by Supabase).
create function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
