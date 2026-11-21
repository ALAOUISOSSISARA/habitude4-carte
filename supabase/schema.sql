-- ============================================================
-- Habitude 4 · « Où vous situez-vous ? »
-- À coller dans Supabase > SQL Editor > New query, puis Run.
-- Pensez à changer le PIN admin à la dernière ligne.
-- ============================================================

-- État de la présentation (une seule ligne)
create table if not exists public.app_state (
  id         int primary key default 1 check (id = 1),
  phase      text not null default 'closed' check (phase in ('closed', 'open', 'map', 'profiles')),
  focus      text check (focus in ('gg', 'gp', 'pg', 'pp')),
  round      int  not null default 1,
  opened_at  timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.app_state (id) values (1) on conflict (id) do nothing;

-- Réponses anonymes : uniquement deux moyennes entre 0 et 3
create table if not exists public.responses (
  id         uuid primary key default gen_random_uuid(),
  round      int not null,
  courage    numeric(4,3) not null check (courage between 0 and 3),
  prevenance numeric(4,3) not null check (prevenance between 0 and 3),
  created_at timestamptz not null default now()
);
create index if not exists responses_round_idx on public.responses (round);

-- PIN admin, dans un schéma non exposé par l'API
create schema if not exists private;
create table if not exists private.admin_secret (id int primary key default 1 check (id = 1), pin text not null);

-- Droits d'accès explicites (utile si l'exposition automatique des tables est désactivée)
grant usage on schema public to anon, authenticated;
grant select on public.app_state to anon, authenticated;
grant select, insert on public.responses to anon, authenticated;

-- ---------- Sécurité (RLS) ----------
alter table public.app_state enable row level security;
alter table public.responses enable row level security;

drop policy if exists "lecture etat" on public.app_state;
create policy "lecture etat" on public.app_state for select to anon, authenticated using (true);

drop policy if exists "lecture reponses" on public.responses;
create policy "lecture reponses" on public.responses for select to anon, authenticated using (true);

-- On ne peut répondre que pendant la phase 'open' et pour le tour en cours
drop policy if exists "ajout reponse si ouvert" on public.responses;
create policy "ajout reponse si ouvert" on public.responses for insert to anon, authenticated
  with check (
    exists (select 1 from public.app_state s where s.id = 1 and s.phase = 'open' and s.round = responses.round)
  );
-- Aucune policy update/delete : personne ne modifie les données directement.

-- ---------- Fonctions admin (protégées par le PIN) ----------
create or replace function public.admin_check(p_pin text) returns boolean
language sql security definer set search_path = '' as $$
  select exists (select 1 from private.admin_secret where pin = p_pin);
$$;

create or replace function public.admin_set_phase(p_pin text, p_phase text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set
    phase = p_phase,
    opened_at = case when p_phase = 'open' then now() else opened_at end,
    focus = case when p_phase in ('map', 'profiles') then focus else null end,
    updated_at = now()
  where id = 1;
end $$;

create or replace function public.admin_set_focus(p_pin text, p_focus text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set focus = p_focus, updated_at = now() where id = 1;
end $$;

-- Nouveau tour : l'écran repart de zéro (les anciennes réponses restent en base mais ne sont plus affichées)
create or replace function public.admin_reset(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set phase = 'closed', focus = null, opened_at = null,
    round = round + 1, updated_at = now() where id = 1;
end $$;

-- Réponses fictives pour les répétitions
create or replace function public.admin_seed(p_pin text, p_n int) returns void
language plpgsql security definer set search_path = '' as $$
declare r int; i int; j int; c numeric; p numeric; x float;
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  select round into r from public.app_state where id = 1;
  for i in 1 .. least(p_n, 300) loop
    c := 0; p := 0;
    for j in 1 .. 6 loop
      x := random();
      if x < 0.38 then c := c + 3; p := p + 3;      -- gagnant/gagnant
      elsif x < 0.68 then p := p + 3;               -- perdant/gagnant
      elsif x < 0.88 then c := c + 3;               -- gagnant/perdant
      end if;                                       -- sinon perdant/perdant
    end loop;
    insert into public.responses (round, courage, prevenance) values (r, c / 6, p / 6);
  end loop;
end $$;

revoke all on function public.admin_set_phase(text, text), public.admin_set_focus(text, text),
  public.admin_reset(text), public.admin_seed(text, int) from public;
grant execute on function public.admin_check(text), public.admin_set_phase(text, text),
  public.admin_set_focus(text, text), public.admin_reset(text), public.admin_seed(text, int) to anon, authenticated;

-- ---------- Temps réel ----------
do $$ begin
  alter publication supabase_realtime add table public.app_state;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.responses;
exception when duplicate_object then null; end $$;

-- ---------- PIN admin : À CHANGER ----------
insert into private.admin_secret (id, pin) values (1, '2468')
  on conflict (id) do update set pin = excluded.pin;
