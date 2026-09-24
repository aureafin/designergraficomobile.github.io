-- Estrutura do curso (títulos das aulas são provisórios: editar no Supabase/app admin). Nenhum conteúdo fictício de alunos ou vagas.
insert into public.modules(id,titulo,descricao,ordem) values
('m1','Conceitos Iniciais','Os primeiros passos: mentalidade e base para arrancar.',1),
('m2','Designers de Marcas/Negócios','Criação de identidades visuais para marcas e negócios.',2),
('m3','Designer de Flyers Publicitários','Flyers e peças publicitárias prontas a publicar.',3),
('m4','Designer Esportivo','Artes desportivas: jogadores, jogos e promoções.',4),
('m5','AI Visual Designer','Criatividade e inteligência artificial ao serviço do design.',5),
('m6','Portfólio Internacional','Organiza e apresenta o teu trabalho a clientes e oportunidades internacionais.',6);
insert into public.lessons(id,module_id,titulo,descricao,ordem)
select m.id||'a'||n, m.id, 'Aula '||n, 'Descrição a definir.', n
from (values ('m1',3),('m2',7),('m3',7),('m4',7),('m5',3),('m6',4)) as c(id,q) join public.modules m on m.id=c.id, generate_series(1,c.q) n;
insert into public.sources(id,nome,ativo,url,atribuicao,notas) values
('arbeitnow','Arbeitnow',true,'https://www.arbeitnow.com','Fonte: Arbeitnow','API pública sem chave.'),
('remotive','Remotive',true,'https://remotive.com','Fonte: Remotive (remotive.com)','API pública. Termos: link para o original + atribuição, máx. 4 pedidos/dia, não republicar noutros sites.'),
('jobicy','Jobicy',true,'https://jobicy.com','Fonte: Jobicy (jobicy.com)','API pública sem chave. Manter atribuição e link original.'),
('adzuna','Adzuna',false,'https://developer.adzuna.com','Jobs by Adzuna','Requer app_id/app_key (secrets da Edge Function). Ativar só após rever os termos.'),
('themuse','The Muse',false,'https://www.themuse.com/developers/api/v2','Fonte: The Muse','Não integrada: verificar termos/acesso antes.'),
('wellfound','Wellfound',false,'https://wellfound.com','','Sem API pública verificada. Não integrada (sem scraping).'),
('manual','Manual (admin)',true,null,'','Oportunidades criadas pelo administrador.');
-- Depois: criar o 1.º admin em Authentication > Users e correr:
-- insert into public.users(id,nome,email,is_admin) values ('<uuid>','Nome','email',true);
