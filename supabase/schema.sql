-- Obra 360 · banco de dados compartilhado da equipe (Supabase)
-- Cole este arquivo inteiro no Supabase em SQL Editor > New query > Run.
-- Pode rodar de novo sem problema: só cria o que ainda não existe.

-- Empresa (equipe) que compartilha as obras. Cada usuário entra com o código de convite.
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  criado_por uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.membros (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  papel text not null default 'membro' check (papel in ('admin', 'membro')),
  entrou_em timestamptz not null default now(),
  primary key (empresa_id, user_id)
);

-- Todos os dados do app: um registro por item (obra, trabalhador, compra, medição...).
-- "colecao" é o nome da lista no app (ex: obras, comprasMaterial) e "dados" é o item em JSON.
create table if not exists public.registros (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  colecao text not null,
  id text not null,
  dados jsonb not null,
  excluido boolean not null default false,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  primary key (empresa_id, colecao, id)
);

create index if not exists registros_empresa_atualizado on public.registros (empresa_id, atualizado_em);

create or replace function public.eh_membro(e uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.membros m where m.empresa_id = e and m.user_id = auth.uid());
$$;

create or replace function public.tocar_registro()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists registros_tocar on public.registros;
create trigger registros_tocar before insert or update on public.registros
for each row execute function public.tocar_registro();

-- Criar empresa: quem cria vira admin.
create or replace function public.criar_empresa(nome_empresa text)
returns public.empresas
language plpgsql
security definer
set search_path = public
as $$
declare
  nova public.empresas;
begin
  if auth.uid() is null then
    raise exception 'É preciso entrar na conta';
  end if;
  insert into public.empresas (nome, criado_por) values (trim(nome_empresa), auth.uid()) returning * into nova;
  insert into public.membros (empresa_id, user_id, email, papel)
  values (nova.id, auth.uid(), auth.jwt() ->> 'email', 'admin');
  return nova;
end;
$$;

-- Entrar numa empresa com o código de convite.
create or replace function public.entrar_empresa(codigo text)
returns public.empresas
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo public.empresas;
begin
  if auth.uid() is null then
    raise exception 'É preciso entrar na conta';
  end if;
  select * into alvo from public.empresas where codigo_convite = upper(trim(codigo));
  if alvo.id is null then
    raise exception 'Código de convite inválido';
  end if;
  insert into public.membros (empresa_id, user_id, email)
  values (alvo.id, auth.uid(), auth.jwt() ->> 'email')
  on conflict do nothing;
  return alvo;
end;
$$;

alter table public.empresas enable row level security;
alter table public.membros enable row level security;
alter table public.registros enable row level security;

drop policy if exists empresas_ver on public.empresas;
create policy empresas_ver on public.empresas for select using (public.eh_membro(id));

drop policy if exists membros_ver on public.membros;
create policy membros_ver on public.membros for select using (public.eh_membro(empresa_id));

drop policy if exists membros_sair on public.membros;
create policy membros_sair on public.membros for delete using (user_id = auth.uid());

drop policy if exists registros_ver on public.registros;
create policy registros_ver on public.registros for select using (public.eh_membro(empresa_id));

drop policy if exists registros_inserir on public.registros;
create policy registros_inserir on public.registros for insert with check (public.eh_membro(empresa_id));

drop policy if exists registros_alterar on public.registros;
create policy registros_alterar on public.registros for update using (public.eh_membro(empresa_id)) with check (public.eh_membro(empresa_id));

grant execute on function public.criar_empresa(text) to authenticated;
grant execute on function public.entrar_empresa(text) to authenticated;

-- Atualização em tempo real entre os aparelhos da equipe.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registros'
  ) then
    alter publication supabase_realtime add table public.registros;
  end if;
end;
$$;
