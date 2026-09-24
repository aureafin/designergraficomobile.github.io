# Área de alunos — passos de publicação
1. Supabase: criar projeto. SQL Editor: correr `sql/schema.sql`, depois `sql/seed.sql`.
2. Authentication > Users: criar o teu utilizador admin; inserir a linha em `public.users` com `is_admin=true` (ver fim do seed.sql).
3. Cada aluno: criar em Authentication > Users (Auto-confirm) e inserir `public.users(id, nome, email)` (status 'active' por defeito). Desativar "Allow new users to sign up" em Authentication > Providers > Email.
4. `js/config.js`: colar SUPABASE_URL e anon key. Publicar a pasta (Netlify/Cloudflare Pages/Vercel) por HTTPS.
5. Oportunidades: `supabase functions deploy sync-opportunities --no-verify-jwt`; `supabase secrets set CRON_SECRET=<segredo>` (e ADZUNA_APP_ID/ADZUNA_APP_KEY se ativares Adzuna). Agendar 2x/dia com pg_cron + pg_net a chamar a função com o cabeçalho `x-cron-secret`, ou correr manualmente a 1.ª vez.
6. Vídeos: Storage > bucket privado `videos`; em `lessons.video_url` guardar o caminho do ficheiro (ex.: `m1/aula1.mp4`). Capas: bucket `covers` (URL pública em `capa`).
7. Testar: login com aluno active / inactive / blocked; abrir `#/perfil` sem sessão (deve ir para login); com 2 alunos confirmar que cada um só vê o seu progresso.
