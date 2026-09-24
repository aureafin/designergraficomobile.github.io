// Cria módulos, aulas (títulos provisórios) e fontes. Correr uma vez, no Google Cloud Shell ou no PC, com credenciais do projeto:
//   cd tools && npm i firebase-admin && GOOGLE_CLOUD_PROJECT=<id-do-projeto> node seed.js
const admin = require('firebase-admin'); admin.initializeApp(); const db = admin.firestore();
const M = [['Conceitos Iniciais', 3, 'Os primeiros passos: mentalidade e base para arrancar.'], ['Designers de Marcas/Negócios', 7, 'Criação de identidades visuais para marcas e negócios.'],
  ['Designer de Flyers Publicitários', 7, 'Flyers e peças publicitárias prontas a publicar.'], ['Designer Esportivo', 7, 'Artes desportivas: jogadores, jogos e promoções.'],
  ['AI Visual Designer', 3, 'Criatividade e inteligência artificial ao serviço do design.'], ['Portfólio Internacional', 4, 'Organiza e apresenta o teu trabalho a clientes e oportunidades internacionais.']];
const S = [['arbeitnow', 'Arbeitnow', true, 'https://www.arbeitnow.com', 'Fonte: Arbeitnow', 'API pública sem chave.'],
  ['remotive', 'Remotive', true, 'https://remotive.com', 'Fonte: Remotive (remotive.com)', 'Termos: link para o original + atribuição, máx. 4 pedidos/dia, não republicar noutros sites.'],
  ['jobicy', 'Jobicy', true, 'https://jobicy.com', 'Fonte: Jobicy (jobicy.com)', 'API pública sem chave. Manter atribuição e link original.'],
  ['adzuna', 'Adzuna', false, 'https://developer.adzuna.com', 'Jobs by Adzuna', 'Requer chaves em functions/.env. Ativar só após rever os termos.'],
  ['themuse', 'The Muse', false, 'https://www.themuse.com/developers/api/v2', 'Fonte: The Muse', 'Não integrada: verificar termos/acesso antes.'],
  ['wellfound', 'Wellfound', false, 'https://wellfound.com', '', 'Sem API pública verificada. Não integrada (sem scraping).']];
(async () => { const b = db.batch();
  M.forEach((m, i) => { b.set(db.collection('modules').doc('m' + (i + 1)), { titulo: m[0], descricao: m[2], capa: null, ordem: i + 1 });
    for (let n = 1; n <= m[1]; n++) b.set(db.collection('lessons').doc(`m${i + 1}a${n}`), { module_id: 'm' + (i + 1), titulo: 'Aula ' + n, descricao: 'Descrição a definir.', capa: null, video_url: null, ordem: n }); });
  S.forEach(s => b.set(db.collection('sources').doc(s[0]), { nome: s[1], ativo: s[2], url: s[3], atribuicao: s[4], notas: s[5], ultima_sync: null, ultimo_erro: null }));
  await b.commit(); console.log('OK: 6 módulos, 31 aulas, 6 fontes'); })();
