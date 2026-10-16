-- Net Profit's games, kept online under their save codes (src/state/cloud.ts). Anyone who finds the game can play it,
-- so there are no accounts and nothing personal: a code of four words, the game squeezed as for a link, what it has
-- earned, and when.
--
-- It lives in the owner's waterways project (her call, 2026-10-16: the free plan runs two projects), apart from that
-- app: the table in a schema of its own, which the API does not serve, and two functions, np_save_game and
-- np_load_game, the only way in, which touch nothing else. Applied there as the migration net_profit_saves.

create schema if not exists net_profit;
revoke all on schema net_profit from public, anon, authenticated;

create table net_profit.saves (
  code text primary key check (code ~ '^[a-z]{3,7}(-[a-z]{3,7}){3}$'),
  game text not null check (length(game) between 2 and 65536),
  earned bigint not null default 0 check (earned >= 0),
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table net_profit.saves enable row level security;
revoke all on table net_profit.saves from public, anon, authenticated;

-- Put a game online. A game that has earned less than the one already under its code is refused, so an old copy on
-- another device cannot write over a newer one; the answer says whether it was kept, and what the one there has earned.
create function public.np_save_game(p_code text, p_game text, p_earned bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r net_profit.saves;
begin
  if p_code is null or p_code !~ '^[a-z]{3,7}(-[a-z]{3,7}){3}$'
     or p_game is null or length(p_game) not between 2 and 65536
     or p_earned is null or p_earned < 0 then
    raise exception 'not a save' using errcode = '22023';
  end if;
  insert into net_profit.saves as s (code, game, earned)
  values (p_code, p_game, p_earned)
  on conflict (code) do update
    set game = excluded.game, earned = excluded.earned, saved_at = now()
    where s.earned <= excluded.earned
  returning * into r;
  if found then
    return jsonb_build_object('saved', true, 'earned', r.earned, 'at', r.saved_at);
  end if;
  select * into r from net_profit.saves where code = p_code;
  return jsonb_build_object('saved', false, 'earned', r.earned, 'at', r.saved_at);
end;
$$;

-- Fetch the game under a code, or null.
create function public.np_load_game(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('game', s.game, 'earned', s.earned, 'at', s.saved_at)
  from net_profit.saves s
  where s.code = p_code;
$$;

revoke all on function public.np_save_game(text, text, bigint) from public, anon, authenticated;
revoke all on function public.np_load_game(text) from public, anon, authenticated;
grant execute on function public.np_save_game(text, text, bigint) to anon, authenticated;
grant execute on function public.np_load_game(text) to anon, authenticated;
