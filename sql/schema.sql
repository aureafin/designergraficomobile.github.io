-- Executar no SQL Editor do Supabase. Contas de aluno: criar em Authentication > Users e inserir a linha em public.users (status 'active').
create table public.users(id uuid primary key references auth.users on delete cascade, nome text not null, email text unique, avatar text,
  status text not null default 'active' check (status in ('active','inactive','blocked')), virtual boolean default false, is_admin boolean default false, data_criacao timestamptz default now());
create table public.modules(id text primary key, titulo text not null, descricao text, capa text, ordem int not null);
create table public.lessons(id text primary key, module_id text references public.modules on delete cascade, titulo text not null, descricao text, capa text, video_url text, ordem int not null);
create table public.progress(user_id uuid default auth.uid() references public.users on delete cascade, lesson_id text references public.lessons on delete cascade,
  progresso numeric default 0, concluido boolean default false, ultima_posicao numeric default 0, primary key(user_id, lesson_id));
create table public.community_posts(id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid() references public.users, conteudo text not null check (length(conteudo)<=1000), data timestamptz default now());
create table public.comments(id uuid primary key default gen_random_uuid(), post_id uuid references public.community_posts on delete cascade, user_id uuid default auth.uid() references public.users, conteudo text not null check (length(conteudo)<=500), data timestamptz default now());

create function public.is_active() returns boolean language sql security definer stable as $$ select exists(select 1 from public.users where id=auth.uid() and status='active') $$;
create function public.is_admin() returns boolean language sql security definer stable as $$ select exists(select 1 from public.users where id=auth.uid() and is_admin and status='active') $$;

alter table public.users enable row level security; alter table public.modules enable row level security; alter table public.lessons enable row level security;
alter table public.progress enable row level security; alter table public.community_posts enable row level security; alter table public.comments enable row level security;

create policy "ver perfis" on public.users for select using (id=auth.uid() or (public.is_active()));   -- autores da comunidade
create policy "admin users" on public.users for all using (public.is_admin());
create policy "conteudo ativo" on public.modules for select using (public.is_active());
create policy "conteudo ativo" on public.lessons for select using (public.is_active());
create policy "admin modules" on public.modules for all using (public.is_admin());
create policy "admin lessons" on public.lessons for all using (public.is_admin());
create policy "meu progresso" on public.progress for all using (user_id=auth.uid() and public.is_active()) with check (user_id=auth.uid() and public.is_active());
create policy "ler posts" on public.community_posts for select using (public.is_active());
create policy "criar post" on public.community_posts for insert with check (user_id=auth.uid() and public.is_active());
create policy "admin posts" on public.community_posts for all using (public.is_admin());
create policy "ler comentarios" on public.comments for select using (public.is_active());
create policy "criar comentario" on public.comments for insert with check (user_id=auth.uid() and public.is_active());
-- Nota: para proteger os ficheiros de vídeo, usar Supabase Storage com bucket PRIVADO + signed URLs (só utilizadores ativos).
