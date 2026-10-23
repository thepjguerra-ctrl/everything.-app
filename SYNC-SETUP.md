# Setting up Sync (optional)

EVERYTHING. works fully without this. Sync is for keeping your own phone and
laptop on one copy of your data. It uses a free Supabase project that **you**
create and own. The app never talks to anyone else's server, and nothing is
sent anywhere until you connect and sign in on a device.

Setup takes about ten minutes, once.

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a new project on
   the free plan. Pick the region closest to you.
2. Supabase asks for a database password. Save it in your password manager.
   The app never needs it.
3. Under **Security**, set these:
   - **Enable Data API**: leave it on. The app talks to Supabase through it.
   - **Automatically expose new tables**: turn it off. The SQL below grants
     exactly the access the app needs.
   - **Enable automatic RLS**: turn it on. It's a safety net, since the SQL
     below switches RLS on anyway.

## 2. Create the table, the push function and the file bucket

Open **SQL Editor**, paste everything below, and click **Run**. It's safe to
run again if something goes wrong partway.

```sql
-- One row per person, holding the app's data.
create table if not exists public.app_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  rev        bigint not null default 1,
  build      integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
-- Needed if "Automatically expose new tables" was left off when the project
-- was created (the recommended setting). Harmless if it was on.
grant select on public.app_state to authenticated;

-- You can read your own row. Nobody else's, and nobody can read yours.
drop policy if exists "Read own data" on public.app_state;
create policy "Read own data" on public.app_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Writes go only through this function. It saves only if the device saw the
-- latest revision, so two devices saving at once can't overwrite each other.
-- The slower one gets -1 back, merges, and tries again.
create or replace function public.push_state(expected_rev bigint, new_data jsonb, new_build integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_rev bigint;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if expected_rev = 0 then
    insert into public.app_state (user_id, data, rev, build)
    values (uid, new_data, 1, new_build)
    on conflict (user_id) do nothing
    returning rev into new_rev;
  else
    update public.app_state
       set data = new_data, rev = rev + 1, build = new_build, updated_at = now()
     where user_id = uid and rev = expected_rev
    returning rev into new_rev;
  end if;
  return coalesce(new_rev, -1);
end;
$$;
revoke execute on function public.push_state(bigint, jsonb, integer) from public, anon;
grant execute on function public.push_state(bigint, jsonb, integer) to authenticated;

-- Project files: a private bucket, one folder per person.
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

drop policy if exists "Read own files" on storage.objects;
create policy "Read own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Upload own files" on storage.objects;
create policy "Upload own files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

## 3. Create your account and lock the project

The app signs in with an email and password. No emails are sent, so you don't
need to edit any email templates or set up an email sender.

1. Go to **Authentication → Users**, click **Add user → Create new user**,
   enter your email and a password, and tick **Auto Confirm User**. Save the
   password in your password manager.
2. Go to **Authentication → Sign In / Providers** and turn off **Allow new
   users to sign up**. Your project's public key ships inside the app's page,
   so this stops anyone else from creating an account on your project. They
   still couldn't see your data.

## 4. Connect the app

1. Open **Project Settings → API Keys**. Copy the **Project URL** and the
   **publishable** key. On older projects this is the `anon` `public` key.
   Never copy the **secret** / `service_role` key. It bypasses every rule
   above, and the app refuses it anyway.
2. In the app, go to **Settings → Sync**, paste both, and click **Connect**.
3. Sign in with the email and password from step 3.
4. Do the same on your other device.

The first time a device signs in, its data is merged with what's already in
the cloud, the same way Import works, so nothing is replaced. After that,
changes sync on their own.

## Good to know

- **Supabase can see your data.** It is stored in your Supabase account, not
  encrypted end to end. You can see it in **Table Editor → app_state**.
- **Free projects pause** after about a week with no activity. Sync then shows
  an error. Open the Supabase dashboard and click **Restore**. Your data is
  kept.
- **Backups still matter.** Sync is not a backup. A mistake on one device
  syncs to the other. **Settings → Sync → Undo last sync change** puts a
  device back to how it was before sync last changed it. **Back up
  everything** is still your safety net.
- **Deleting a project file** removes it from your devices but leaves its
  bytes in the bucket. Clear them out under **Storage → project-files** if
  you need the space back.
- **If you fork the app:** bump `APP_BUILD` in `index.html` whenever you add a
  new kind of saved data. That stops a device running older code from syncing
  over your newer data.
