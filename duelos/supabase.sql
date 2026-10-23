-- Ranking geral dos duelos.
-- Rode este script uma vez no Supabase: menu SQL Editor -> New query -> cole tudo -> Run.

create table if not exists public.resultados (
  id bigint generated always as identity primary key,
  categoria text not null check (categoria in ('pregadores', 'internacionais', 'historicos', 'hereges')),
  ouro   text not null check (char_length(ouro)   between 2 and 60),
  prata  text not null check (char_length(prata)  between 2 and 60),
  bronze text not null check (char_length(bronze) between 2 and 60),
  criado_em timestamptz not null default now(),
  check (ouro <> prata and ouro <> bronze and prata <> bronze)
);

-- Quem visita o site pode registrar um pódio, mas não pode ler, alterar nem apagar a tabela.
alter table public.resultados enable row level security;
drop policy if exists "registrar podio" on public.resultados;
create policy "registrar podio" on public.resultados for insert to anon with check (true);
grant insert on public.resultados to anon;

-- O que o site lê: só os totais somados.
create or replace view public.ranking as
  select categoria, nome,
         count(*) filter (where lugar = 1) as ouro,
         count(*) filter (where lugar = 2) as prata,
         count(*) filter (where lugar = 3) as bronze
  from (
    select categoria, ouro   as nome, 1 as lugar from public.resultados
    union all
    select categoria, prata  as nome, 2 as lugar from public.resultados
    union all
    select categoria, bronze as nome, 3 as lugar from public.resultados
  ) podios
  group by categoria, nome;

create or replace view public.totais as
  select categoria, count(*) as torneios from public.resultados group by categoria;

grant select on public.ranking, public.totais to anon;
