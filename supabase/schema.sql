-- ============================================================
-- Habitude 4 · « Où vous situez-vous ? » — version 2
-- À coller dans Supabase > SQL Editor > New query, puis Run.
-- Fonctionne sur une base neuve ET sur une base qui a déjà la version 1
-- (le PIN déjà enregistré est conservé).
-- ============================================================

-- ---------- État de la présentation (une seule ligne) ----------
create table if not exists public.app_state (
  id         int primary key default 1 check (id = 1),
  phase      text not null default 'closed',
  round      int  not null default 1,
  opened_at  timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.app_state add column if not exists step int not null default 0;
alter table public.app_state add column if not exists duration_s int not null default 180;
alter table public.app_state drop column if exists focus;
alter table public.app_state drop constraint if exists app_state_phase_check;
update public.app_state set phase = 'closed' where phase not in ('closed', 'open', 'results');
alter table public.app_state add constraint app_state_phase_check check (phase in ('closed', 'open', 'results'));
insert into public.app_state (id) values (1) on conflict (id) do nothing;

-- ---------- Participants (ceux qui ont commencé) et réponses anonymes ----------
create table if not exists public.participants (
  id         uuid primary key,
  round      int not null,
  created_at timestamptz not null default now()
);
create index if not exists participants_round_idx on public.participants (round);

create table if not exists public.responses (
  id         uuid primary key default gen_random_uuid(),
  round      int not null,
  courage    numeric(4,3) not null check (courage between 0 and 3),
  prevenance numeric(4,3) not null check (prevenance between 0 and 3),
  created_at timestamptz not null default now()
);
create index if not exists responses_round_idx on public.responses (round);

-- ---------- PIN, dans un schéma non exposé par l'API ----------
create schema if not exists private;
create table if not exists private.admin_secret (id int primary key default 1 check (id = 1), pin text not null);
-- PIN par défaut seulement s'il n'y en a pas déjà un (changez-le avec la ligne tout en bas)
insert into private.admin_secret (id, pin) values (1, '2468') on conflict (id) do nothing;

-- ---------- Droits et sécurité (RLS) ----------
grant usage on schema public to anon, authenticated;
grant select on public.app_state to anon, authenticated;
grant select, insert on public.responses to anon, authenticated;
grant select, insert on public.participants to anon, authenticated;

alter table public.app_state enable row level security;
alter table public.responses enable row level security;
alter table public.participants enable row level security;

drop policy if exists "lecture etat" on public.app_state;
create policy "lecture etat" on public.app_state for select to anon, authenticated using (true);

drop policy if exists "lecture reponses" on public.responses;
create policy "lecture reponses" on public.responses for select to anon, authenticated using (true);

drop policy if exists "lecture participants" on public.participants;
create policy "lecture participants" on public.participants for select to anon, authenticated using (true);

-- On ne peut commencer / répondre que pendant la phase 'open' et pour le tour en cours
drop policy if exists "ajout reponse si ouvert" on public.responses;
create policy "ajout reponse si ouvert" on public.responses for insert to anon, authenticated
  with check (exists (select 1 from public.app_state s where s.id = 1 and s.phase = 'open' and s.round = responses.round));

drop policy if exists "ajout participant si ouvert" on public.participants;
create policy "ajout participant si ouvert" on public.participants for insert to anon, authenticated
  with check (exists (select 1 from public.app_state s where s.id = 1 and s.phase = 'open' and s.round = participants.round));
-- Aucune policy update/delete : personne ne modifie les données directement.

-- ---------- Fonctions de pilotage (protégées par le PIN) ----------
drop function if exists public.admin_set_phase(text, text);
drop function if exists public.admin_set_focus(text, text);

create or replace function public.admin_check(p_pin text) returns boolean
language sql security definer set search_path = '' as $$
  select exists (select 1 from private.admin_secret where pin = p_pin);
$$;

-- Lance le questionnaire (3 minutes)
create or replace function public.admin_start(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set phase = 'open', step = 0, opened_at = now(), duration_s = 180, updated_at = now() where id = 1;
end $$;

-- Ajoute du temps (si le temps est écoulé, on repart de maintenant)
create or replace function public.admin_add_time(p_pin text, p_seconds int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set
    duration_s = greatest(duration_s, ceil(extract(epoch from now() - opened_at))::int) + least(greatest(p_seconds, 0), 600),
    updated_at = now()
  where id = 1 and phase = 'open';
end $$;

-- Affiche les résultats : grand écran + tous les téléphones
create or replace function public.admin_reveal(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set phase = 'results', step = 0, updated_at = now() where id = 1;
end $$;

-- Étape du récapitulatif (0 à 4)
create or replace function public.admin_step(p_pin text, p_step int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set step = least(greatest(p_step, 0), 4), updated_at = now() where id = 1;
end $$;

-- Nouveau tour : tout repart de zéro à l'écran
create or replace function public.admin_reset(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_check(p_pin) then raise exception 'PIN incorrect'; end if;
  update public.app_state set phase = 'closed', step = 0, opened_at = null, duration_s = 180,
    round = round + 1, updated_at = now() where id = 1;
end $$;

-- Réponses fictives pour les répétitions
create or replace function public.admin_seed(p_pin text, p_n int) returns void
language plpgsql security definer set search_path = '' as $$
declare r int; i int; j int; c numeric; p numeric; x float; rid uuid;
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
    rid := gen_random_uuid();
    insert into public.participants (id, round) values (rid, r);
    insert into public.responses (id, round, courage, prevenance) values (rid, r, c / 6, p / 6);
  end loop;
  -- quelques participants qui n'ont pas encore fini, pour voir la barre de progression
  for i in 1 .. greatest(least(p_n, 300) / 8, 1) loop
    insert into public.participants (id, round) values (gen_random_uuid(), r);
  end loop;
end $$;

revoke all on function public.admin_start(text), public.admin_add_time(text, int), public.admin_reveal(text),
  public.admin_step(text, int), public.admin_reset(text), public.admin_seed(text, int) from public;
grant execute on function public.admin_check(text), public.admin_start(text), public.admin_add_time(text, int),
  public.admin_reveal(text), public.admin_step(text, int), public.admin_reset(text), public.admin_seed(text, int)
  to anon, authenticated;

-- ---------- Temps réel ----------
do $$ begin alter publication supabase_realtime add table public.app_state; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.responses; exception when duplicate_object then null; end $$;

-- ---------- Pour changer le PIN : décommentez, mettez votre code, Run ----------
-- update private.admin_secret set pin = 'VOTRE_PIN' where id = 1;
