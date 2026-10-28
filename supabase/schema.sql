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

-- =====================================================================
-- Conta mestre e licenças (período de teste e plano mensal por empresa)
-- =====================================================================

alter table public.empresas add column if not exists plano text not null default 'teste';
alter table public.empresas add column if not exists acesso_ate timestamptz not null default now() + interval '7 days';
alter table public.empresas add column if not exists bloqueada boolean not null default false;
alter table public.empresas add column if not exists observacao text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'empresas_plano_check') then
    alter table public.empresas add constraint empresas_plano_check check (plano in ('teste', 'mensal'));
  end if;
end;
$$;

-- Donos do sistema. A conta é reconhecida pelo e-mail confirmado e depois fica presa ao user_id.
create table if not exists public.admins_sistema (
  email text primary key,
  user_id uuid unique references auth.users (id) on delete set null
);
alter table public.admins_sistema enable row level security;

insert into public.admins_sistema (email) values ('joaogarraio@gmail.com') on conflict do nothing;

create or replace function public.eh_mestre()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.admins_sistema a
    join auth.users u on u.id = auth.uid()
    where (a.user_id = u.id)
       or (a.user_id is null and lower(a.email) = lower(u.email) and u.email_confirmed_at is not null)
  );
$$;

-- Membro de uma empresa com acesso liberado (teste ou mensalidade em dia e não bloqueada).
create or replace function public.eh_membro_ativo(e uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.eh_membro(e) and (
    public.eh_mestre()
    or exists (select 1 from public.empresas x where x.id = e and not x.bloqueada and x.acesso_ate > now())
  );
$$;

drop policy if exists registros_ver on public.registros;
create policy registros_ver on public.registros for select using (public.eh_membro_ativo(empresa_id));

drop policy if exists registros_inserir on public.registros;
create policy registros_inserir on public.registros for insert with check (public.eh_membro_ativo(empresa_id));

drop policy if exists registros_alterar on public.registros;
create policy registros_alterar on public.registros for update using (public.eh_membro_ativo(empresa_id)) with check (public.eh_membro_ativo(empresa_id));

-- Empresa criada pelo próprio cliente começa no período de teste; a da conta mestre não vence.
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
  insert into public.empresas (nome, criado_por, plano, acesso_ate)
  values (
    trim(nome_empresa), auth.uid(),
    case when public.eh_mestre() then 'mensal' else 'teste' end,
    case when public.eh_mestre() then timestamptz '2999-12-31' else now() + interval '7 days' end
  )
  returning * into nova;
  insert into public.membros (empresa_id, user_id, email, papel)
  values (nova.id, auth.uid(), auth.jwt() ->> 'email', 'admin');
  return nova;
end;
$$;

-- Quem entra numa empresa ainda sem ninguém (criada pela conta mestre) vira o administrador dela.
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
  insert into public.membros (empresa_id, user_id, email, papel)
  values (
    alvo.id, auth.uid(), auth.jwt() ->> 'email',
    case when exists (select 1 from public.membros m where m.empresa_id = alvo.id) then 'membro' else 'admin' end
  )
  on conflict do nothing;
  return alvo;
end;
$$;

create or replace function public.eu_sou_mestre()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_mestre() then
    return false;
  end if;
  -- prende a conta mestre ao usuário na primeira vez que ele entra
  update public.admins_sistema a set user_id = auth.uid()
  from auth.users u
  where u.id = auth.uid() and a.user_id is null and lower(a.email) = lower(u.email);
  return true;
end;
$$;

create or replace function public.admin_listar_empresas()
returns table (
  id uuid,
  nome text,
  codigo_convite text,
  plano text,
  acesso_ate timestamptz,
  bloqueada boolean,
  observacao text,
  criado_em timestamptz,
  admin_email text,
  membros bigint,
  obras bigint,
  ultima_atividade timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_mestre() then
    raise exception 'Acesso só para a conta mestre';
  end if;
  return query
  select e.id, e.nome, e.codigo_convite, e.plano, e.acesso_ate, e.bloqueada, e.observacao, e.criado_em,
    (select m.email from public.membros m where m.empresa_id = e.id and m.papel = 'admin' order by m.entrou_em limit 1),
    (select count(*) from public.membros m where m.empresa_id = e.id),
    (select count(*) from public.registros r where r.empresa_id = e.id and r.colecao = 'obras' and not r.excluido),
    (select max(r.atualizado_em) from public.registros r where r.empresa_id = e.id)
  from public.empresas e
  order by e.criado_em desc;
end;
$$;

create or replace function public.admin_atualizar_empresa(
  empresa uuid,
  novo_plano text,
  novo_acesso_ate timestamptz,
  nova_bloqueada boolean,
  nova_observacao text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_mestre() then
    raise exception 'Acesso só para a conta mestre';
  end if;
  update public.empresas
  set plano = novo_plano, acesso_ate = novo_acesso_ate, bloqueada = nova_bloqueada, observacao = nullif(trim(nova_observacao), '')
  where id = empresa;
end;
$$;

-- A conta mestre cria a empresa do cliente e manda o código de convite; quem entrar primeiro vira o administrador.
create or replace function public.admin_criar_empresa(nome_empresa text, dias_teste int default 7)
returns public.empresas
language plpgsql
security definer
set search_path = public
as $$
declare
  nova public.empresas;
begin
  if not public.eh_mestre() then
    raise exception 'Acesso só para a conta mestre';
  end if;
  insert into public.empresas (nome, criado_por, acesso_ate)
  values (trim(nome_empresa), auth.uid(), now() + make_interval(days => greatest(dias_teste, 0)))
  returning * into nova;
  return nova;
end;
$$;

revoke execute on function public.admin_listar_empresas() from public, anon;
revoke execute on function public.admin_atualizar_empresa(uuid, text, timestamptz, boolean, text) from public, anon;
revoke execute on function public.admin_criar_empresa(text, int) from public, anon;
revoke execute on function public.eu_sou_mestre() from public, anon;
grant execute on function public.admin_listar_empresas() to authenticated;
grant execute on function public.admin_atualizar_empresa(uuid, text, timestamptz, boolean, text) to authenticated;
grant execute on function public.admin_criar_empresa(text, int) to authenticated;
grant execute on function public.eu_sou_mestre() to authenticated;
