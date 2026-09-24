// Sincroniza oportunidades de fontes com acesso público/permitido. Chaves (ex.: Adzuna) ficam só aqui, em functions/.env — nunca no frontend.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentDeleted } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin'); admin.initializeApp(); const db = admin.firestore();
const { runSync } = require('./sync');
// 2x/dia (Remotive pede no máximo 4/dia). Requer plano Blaze.
exports.syncOpportunities = onSchedule({ schedule: '0 6,18 * * *', timeZone: 'Africa/Luanda', region: 'europe-west1' }, runSync);
// O Firestore não apaga subcoleções: remove os comentários quando uma publicação é apagada.
exports.cleanupPost = onDocumentDeleted({ document: 'posts/{id}', region: 'europe-west1' }, e => admin.firestore().recursiveDelete(db.collection('posts').doc(e.params.id)));
