// Lógica de sincronização de vagas. Usada pela Cloud Function (plano Blaze) ou à mão via tools/sync.js (sem cartão).
const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp(); const db = admin.firestore();
const H = { 'User-Agent': 'dgm-alunos/1.0 (plataforma privada de alunos)' };
const DESIGN = /(design|illustrat|brand|logo|motion|graphic|packaging|art director|creative)/i;
const strip = (s = '') => String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
const iso = d => { const t = typeof d === 'number' ? d * 1000 : Date.parse(String(d)); return isFinite(t) ? new Date(t).toISOString() : null; };
const specialty = t => /sport|football|soccer/i.test(t) ? 'Design Esportivo' : /\bai\b|generative|midjourney/i.test(t) ? 'AI Visual Design' : /logo/i.test(t) ? 'Logo Design' : /brand|identity/i.test(t) ? 'Branding'
  : /social/i.test(t) ? 'Social Media' : /flyer|poster/i.test(t) ? 'Flyer Design' : /\bui\b|\bux\b|product design/i.test(t) ? 'UI/UX' : /illustrat/i.test(t) ? 'Ilustração' : /motion|animat/i.test(t) ? 'Motion Design'
  : /packag/i.test(t) ? 'Packaging' : /advert|campaign/i.test(t) ? 'Publicidade' : 'Design Gráfico';
const level = t => /intern|trainee|apprentic|estagi/i.test(t) ? 'Iniciante' : /junior|\bjr\b|entry/i.test(t) ? 'Júnior' : /senior|\bsr\b|lead|principal|head of/i.test(t) ? 'Sénior' : /\bmid\b|intermediate/i.test(t) ? 'Intermediário' : null;
const etype = (s = '', t = '') => { const x = (s + ' ' + t).toLowerCase(); return /freelanc/.test(x) ? 'freelance' : /contract/.test(x) ? 'contract' : /intern/.test(x) ? 'internship' : /part.?time/.test(x) ? 'part_time' : /full.?time/.test(x) ? 'full_time' : null; };
const row = (source, o) => ({ source, salary: null, budget: null, ...o, specialty: specialty(o.title), experience_level: level(o.title), category: 'Design', status: 'open', manual: false, last_seen: new Date().toISOString() });
const get = async url => { const r = await fetch(url, { headers: H }); if (!r.ok) throw new Error(`${url.split('/')[2]} ${r.status}`); return r.json(); };

const adapters = {
  async arbeitnow() { const out = []; for (let p = 1; p <= 3; p++) for (const j of (await get(`https://www.arbeitnow.com/api/job-board-api?page=${p}`)).data || []) if (DESIGN.test(j.title))
    out.push(row('arbeitnow', { external_id: j.slug, title: j.title, company: j.company_name, description: strip(j.description), location: j.location, remote: !!j.remote, employment_type: etype((j.job_types || []).join(' '), j.title), published_at: iso(j.created_at), source_url: j.url })); return out; },
  async remotive() { return ((await get('https://remotive.com/api/remote-jobs?category=design')).jobs || []).map(j => row('remotive', { external_id: String(j.id), title: j.title, company: j.company_name, description: strip(j.description),
    location: j.candidate_required_location || 'Remoto', remote: true, employment_type: etype(j.job_type, j.title), salary: j.salary || null, published_at: iso(j.publication_date), source_url: j.url })); },
  async jobicy() { return ((await get('https://jobicy.com/api/v2/remote-jobs?count=100&industry=design-multimedia')).jobs || []).map(j => row('jobicy', { external_id: String(j.id), title: j.jobTitle, company: j.companyName,
    description: strip(j.jobDescription || j.jobExcerpt), location: [].concat(j.jobGeo || []).join(', ') || 'Remoto', remote: true, employment_type: etype([].concat(j.jobType || []).join(' '), j.jobTitle),
    salary: j.salaryMin ? `${j.salaryMin}-${j.salaryMax} ${j.salaryCurrency || ''}`.trim() : null, published_at: iso(j.pubDate), source_url: j.url })); },
  async adzuna() { const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY; if (!id || !key) throw new Error('faltam ADZUNA_APP_ID/ADZUNA_APP_KEY em functions/.env'); const out = [];
    for (const c of ['gb', 'br', 'za']) { let d; try { d = await get(`https://api.adzuna.com/v1/api/jobs/${c}/search/1?app_id=${id}&app_key=${key}&what=${encodeURIComponent('graphic designer')}&results_per_page=50&content-type=application/json`); } catch (e) { continue; }
      for (const j of d.results || []) out.push(row('adzuna', { external_id: String(j.id), title: j.title, company: j.company && j.company.display_name, description: strip(j.description), location: j.location && j.location.display_name,
        remote: /remote/i.test(j.title), employment_type: etype(j.contract_type, j.contract_time), salary: j.salary_min ? `${Math.round(j.salary_min)}-${Math.round(j.salary_max)}` : null, published_at: iso(j.created), source_url: j.redirect_url })); } return out; }
};

async function runSync() {
  const srcs = await db.collection('sources').where('ativo', '==', true).get();
  for (const s of srcs.docs) { const run = adapters[s.id]; if (!run) continue;
    try { const rows = (await run()).filter(r => /^https?:\/\//.test(r.source_url || ''));
      for (let i = 0; i < rows.length; i += 400) { const b = db.batch(); rows.slice(i, i + 400).forEach(r => b.set(db.collection('opportunities').doc(`${r.source}_${r.external_id}`.replace(/\//g, '_')), r, { merge: true })); await b.commit(); }
      await s.ref.update({ ultima_sync: new Date().toISOString(), ultimo_erro: null });
    } catch (e) { await s.ref.update({ ultimo_erro: String(e.message).slice(0, 300) }); } }
  // Feeds são parciais: "não visto" não prova expiração. >3 dias => estado desconhecido; >21 dias => expirada.
  const d = n => new Date(Date.now() - n * 864e5).toISOString(), old = await db.collection('opportunities').where('last_seen', '<', d(3)).get();
  for (const o of old.docs) { const x = o.data(); if (x.manual || x.status === 'expired') continue; await o.ref.update({ status: x.last_seen < d(21) ? 'expired' : 'unknown' }); }
}

module.exports = { runSync };
