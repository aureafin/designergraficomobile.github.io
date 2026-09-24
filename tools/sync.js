// Sincroniza vagas à mão (sem Cloud Functions nem cartão). No Cloud Shell, na pasta do projeto:
//   cd functions && npm i firebase-admin && cd ../tools && GOOGLE_CLOUD_PROJECT=curso-4398c node sync.js
// Correr no máximo 2x/dia (Remotive pede até 4/dia).
require('../functions/sync').runSync().then(() => console.log('Sincronização concluída.')).catch(e => { console.error(e); process.exit(1); });
