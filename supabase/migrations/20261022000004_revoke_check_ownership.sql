-- check_ownership is only meant to run as a trigger; keep it out of the public RPC API.
revoke execute on function public.check_ownership() from public, anon, authenticated;
