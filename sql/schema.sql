-- 1) Executar no SQL Editor do Supabase. 2) Depois executar sql/seed.sql.
create table public.users(id uuid primary key references auth.users on delete cascade, nome text not null, email text unique, avatar text,
  status text not null default 'active' check (status in ('active','inactive','blocked')), is_admin boolean not null default false,
  is_demo boolean not null default false, foto_autorizada boolean not null default false, data_criacao timestamptz not null default now());
create table public.modules(id text primary key, titulo text not null, descricao text, capa text, ordem int not null unique);
create table public.lessons(id text primary key, module_id text not null references public.modules on delete cascade, titulo text not null, descricao text, capa text, video_url text, ordem int not null, unique(module_id, ordem));
create table public.progress(user_id uuid not null default auth.uid() references public.users on delete cascade, lesson_id text not null references public.lessons on delete cascade,
  progresso numeric not null default 0, concluido boolean not null default false, ultima_posicao numeric not null default 0, updated_at timestamptz not null default now(), primary key(user_id, lesson_id));
create table public.community_posts(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.users on delete cascade, conteudo text not null check (length(conteudo) between 1 and 1000), aviso boolean not null default false, data timestamptz not null default now());
create table public.comments(id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts on delete cascade, user_id uuid not null default auth.uid() references public.users on delete cascade, conteudo text not null check (length(conteudo) between 1 and 500), data timestamptz not null default now());
create table public.reactions(post_id uuid references public.community_posts on delete cascade, user_id uuid default auth.uid() references public.users on delete cascade, tipo text not null default 'like', primary key(post_id, user_id));

create table public.sources(id text primary key, nome text not null, ativo boolean not null default false, url text, atribuicao text, notas text, ultima_sync timestamptz, ultimo_erro text);
create table public.opportunities(id uuid primary key default gen_random_uuid(), source text not null references public.sources on delete cascade, external_id text not null,
  title text not null, company text, description text, category text, specialty text, location text, remote boolean, employment_type text, experience_level text,
  salary text, budget text, published_at timestamptz, source_updated_at timestamptz, source_url text not null check (source_url ~* '^https?://'),
  status text not null default 'unknown' check (status in ('open','expired','unknown')), featured boolean not null default false, manual boolean not null default false,
  last_seen timestamptz not null default now(), unique(source, external_id));
create index on public.opportunities(published_at desc); create index on public.opportunities(specialty); create index on public.opportunities(employment_type);
create table public.saved_opportunities(user_id uuid not null default auth.uid() references public.users on delete cascade, opportunity_id uuid not null references public.opportunities on delete cascade, created_at timestamptz not null default now(), primary key(user_id, opportunity_id));

create function public.is_active() returns boolean language sql security definer stable set search_path=public as $$ select exists(select 1 from users where id=auth.uid() and status='active') $$;
create function public.is_admin() returns boolean language sql security definer stable set search_path=public as $$ select exists(select 1 from users where id=auth.uid() and is_admin and status='active') $$;

do $$ declare t text; begin foreach t in array array['users','modules','lessons','progress','community_posts','comments','reactions','sources','opportunities','saved_opportunities'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "admin all" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t); end loop; end $$;

-- users: cada um lê o seu; alunos ativos leem nome/foto dos outros (comunidade). Aluno só altera a própria foto (coluna avatar) — ver trigger.
create policy "ler perfis" on public.users for select using (public.is_active() or id=auth.uid());
create policy "editar proprio avatar" on public.users for update using (id=auth.uid() and public.is_active()) with check (id=auth.uid());
create function public.users_guard() returns trigger language plpgsql security definer as $$ begin
  if auth.uid() is not null and not public.is_admin() and (new.status<>old.status or new.is_admin<>old.is_admin or new.email is distinct from old.email or new.is_demo<>old.is_demo or new.foto_autorizada<>old.foto_autorizada) then raise exception 'not allowed'; end if; return new; end $$;
create trigger users_guard before update on public.users for each row execute function public.users_guard();

create policy "ler modulos" on public.modules for select using (public.is_active());
create policy "ler aulas" on public.lessons for select using (public.is_active());
create policy "meu progresso" on public.progress for all using (user_id=auth.uid() and public.is_active()) with check (user_id=auth.uid() and public.is_active());
create policy "ler posts" on public.community_posts for select using (public.is_active());
create policy "criar post" on public.community_posts for insert with check (user_id=auth.uid() and public.is_active() and (aviso=false));
create policy "apagar meu post" on public.community_posts for delete using (user_id=auth.uid() and public.is_active());
create policy "ler comentarios" on public.comments for select using (public.is_active());
create policy "criar comentario" on public.comments for insert with check (user_id=auth.uid() and public.is_active());
create policy "apagar meu comentario" on public.comments for delete using (user_id=auth.uid() and public.is_active());
create policy "ler reacoes" on public.reactions for select using (public.is_active());
create policy "reagir" on public.reactions for insert with check (user_id=auth.uid() and public.is_active());
create policy "remover reacao" on public.reactions for delete using (user_id=auth.uid() and public.is_active());
create policy "ler oportunidades" on public.opportunities for select using (public.is_active() and status<>'expired');
create policy "ler fontes" on public.sources for select using (public.is_active());
create policy "meus guardados" on public.saved_opportunities for all using (user_id=auth.uid() and public.is_active()) with check (user_id=auth.uid() and public.is_active());
-- Escrita em opportunities/sources: só admin (policy "admin all") ou Edge Function com service role (ignora RLS).

-- Storage: avatars (público, caminho <uid>/...), covers (público), videos (PRIVADO, URLs assinadas só para alunos ativos).
insert into storage.buckets(id,name,public) values ('avatars','avatars',true),('covers','covers',true),('videos','videos',false) on conflict do nothing;
create policy "avatar upload proprio" on storage.objects for insert with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.is_active());
create policy "avatar update proprio" on storage.objects for update using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatar apagar proprio" on storage.objects for delete using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "videos alunos ativos" on storage.objects for select using (bucket_id='videos' and public.is_active());
create policy "admin storage" on storage.objects for all using (public.is_admin()) with check (public.is_admin());
