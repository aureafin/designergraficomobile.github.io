// Edge Function: agrega oportunidades de fontes com acesso público/permitido. Segredos ficam aqui, nunca no frontend.
// Agendar 2x/dia (Remotive pede no máximo 4/dia). Cabeçalho obrigatório: x-cron-secret = CRON_SECRET.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const H = { 'User-Agent': 'dgm-alunos/1.0 (plataforma privada de alunos)' };
const DESIGN = /(design|illustrat|brand|logo|motion|graphic|packaging|art director|creative)/i;
const strip = (s = '') => String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
const iso = (d: unknown) => { const t = typeof d === 'number' ? d * 1000 : Date.parse(String(d)); return isFinite(t) ? new Date(t).toISOString() : null; };
const specialty = (t: string) => /sport|football|soccer/i.test(t) ? 'Design Esportivo' : /\bai\b|generative|midjourney/i.test(t) ? 'AI Visual Design' : /logo/i.test(t) ? 'Logo Design' : /brand|identity/i.test(t) ? 'Branding'
  : /social/i.test(t) ? 'Social Media' : /flyer|poster/i.test(t) ? 'Flyer Design' : /\bui\b|\bux\b|product design/i.test(t) ? 'UI/UX' : /illustrat/i.test(t) ? 'Ilustração' : /motion|animat/i.test(t) ? 'Motion Design'
  : /packag/i.test(t) ? 'Packaging' : /advert|campaign/i.test(t) ? 'Publicidade' : 'Design Gráfico';
const level = (t: string) => /intern|trainee|apprentic|estagi/i.test(t) ? 'Iniciante' : /junior|\bjr\b|entry/i.test(t) ? 'Júnior' : /senior|\bsr\b|lead|principal|head of/i.test(t) ? 'Sénior' : /\bmid\b|intermediate/i.test(t) ? 'Intermediário' : null;
const etype = (s = '', t = '') => { const x = (s + ' ' + t).toLowerCase(); return /freelanc/.test(x) ? 'freelance' : /contract/.test(x) ? 'contract' : /intern/.test(x) ? 'internship' : /part.?time/.test(x) ? 'part_time' : /full.?time/.test(x) ? 'full_time' : null; };
const row = (source: string, o: Record<string, unknown>) => ({ source, ...o, specialty: specialty(String(o.title)), experience_level: level(String(o.title)), category: 'Design', status: 'open', last_seen: new Date().toISOString() });

const adapters: Record<string, () => Promise<any[]>> = {
  async arbeitnow() { const out: any[] = [];
    for (let p = 1; p <= 3; p++) { const r = await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${p}`, { headers: H }); if (!r.ok) throw new Error('arbeitnow ' + r.status);
      for (const j of (await r.json()).data || []) if (DESIGN.test(j.title)) out.push(row('arbeitnow', { external_id: j.slug, title: j.title, company: j.company_name, description: strip(j.description), location: j.location, remote: !!j.remote,
        employment_type: etype((j.job_types || []).join(' '), j.title), published_at: iso(j.created_at), source_url: j.url })); } return out; },
  async remotive() { const r = await fetch('https://remotive.com/api/remote-jobs?category=design', { headers: H }); if (!r.ok) throw new Error('remotive ' + r.status);
    return ((await r.json()).jobs || []).map((j: any) => row('remotive', { external_id: String(j.id), title: j.title, company: j.company_name, description: strip(j.description), location: j.candidate_required_location || 'Remoto', remote: true,
      employment_type: etype(j.job_type, j.title), salary: j.salary || null, published_at: iso(j.publication_date), source_url: j.url })); },
  async jobicy() { const r = await fetch('https://jobicy.com/api/v2/remote-jobs?count=100&industry=design-multimedia', { headers: H }); if (!r.ok) throw new Error('jobicy ' + r.status);
    return ((await r.json()).jobs || []).map((j: any) => row('jobicy', { external_id: String(j.id), title: j.jobTitle, company: j.companyName, description: strip(j.jobDescription || j.jobExcerpt), location: [].concat(j.jobGeo || []).join(', ') || 'Remoto', remote: true,
      employment_type: etype([].concat(j.jobType || []).join(' '), j.jobTitle), salary: j.salaryMin ? `${j.salaryMin}-${j.salaryMax} ${j.salaryCurrency || ''}`.trim() : null, published_at: iso(j.pubDate), source_url: j.url })); },
  async adzuna() { const id = Deno.env.get('ADZUNA_APP_ID'), key = Deno.env.get('ADZUNA_APP_KEY'); if (!id || !key) throw new Error('faltam secrets ADZUNA_*'); const out: any[] = [];
    for (const c of ['gb', 'br', 'za']) { const r = await fetch(`https://api.adzuna.com/v1/api/jobs/${c}/search/1?app_id=${id}&app_key=${key}&what=${encodeURIComponent('graphic designer')}&results_per_page=50&content-type=application/json`, { headers: H }); if (!r.ok) continue;
      for (const j of (await r.json()).results || []) out.push(row('adzuna', { external_id: String(j.id), title: j.title, company: j.company?.display_name, description: strip(j.description), location: j.location?.display_name, remote: /remote/i.test(j.title),
        employment_type: etype(j.contract_type, j.contract_time), salary: j.salary_min ? `${Math.round(j.salary_min)}-${Math.round(j.salary_max)}` : null, published_at: iso(j.created), source_url: j.redirect_url })); } return out; }
};

Deno.serve(async req => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });
  const { data: srcs } = await sb.from('sources').select('id').eq('ativo', true); const report: Record<string, string> = {};
  for (const { id } of srcs || []) { const run = adapters[id]; if (!run) continue;
    try { const rows = (await run()).filter(r => /^https?:\/\//.test(r.source_url || ''));
      if (rows.length) { const { error } = await sb.from('opportunities').upsert(rows, { onConflict: 'source,external_id' }); if (error) throw error; }
      await sb.from('sources').update({ ultima_sync: new Date().toISOString(), ultimo_erro: null }).eq('id', id); report[id] = `${rows.length} ok`;
    } catch (e) { await sb.from('sources').update({ ultimo_erro: String((e as Error).message).slice(0, 300) }).eq('id', id); report[id] = 'erro'; } }
  // Feeds são parciais: "não visto" NÃO prova expiração. >3 dias sem aparecer => estado desconhecido; >21 dias => expirada.
  const d = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
  await sb.from('opportunities').update({ status: 'unknown' }).eq('manual', false).eq('status', 'open').lt('last_seen', d(3));
  await sb.from('opportunities').update({ status: 'expired' }).eq('manual', false).neq('status', 'expired').lt('last_seen', d(21));
  return Response.json(report);
});
