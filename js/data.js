/* Camada de dados: 100% Supabase. Sem dados em memória/localStorage. */
(function () {
  const C = window.CONFIG; let sb = null, uid = null;
  const ok = async q => { const r = await q; if (r.error) throw new Error(r.error.message); return r.data; };
  const OP_COLS = 'id,title,company,category,specialty,location,remote,employment_type,experience_level,salary,budget,published_at,source,source_url,status,featured';
  const DB = window.DB = {
    configured: !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY),
    async init() { if (!this.configured || sb) return;
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); },
    client: () => sb, uid: () => uid,
    async profile() { const { data: { session } } = await sb.auth.getSession(); if (!session) return null; uid = session.user.id;
      const { data } = await sb.from('users').select('id,nome,email,avatar,status,data_criacao').eq('id', uid).maybeSingle(); return data; },
    avatarUrl: p => p ? sb.storage.from('avatars').getPublicUrl(p).data.publicUrl : null,
    async setAvatar(file) { const path = `${uid}/avatar-${Date.now()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
      await ok(sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })); await ok(sb.from('users').update({ avatar: path }).eq('id', uid)); return path; },
    async videoUrl(v) { if (!v) return null; if (/^https?:\/\//.test(v)) return v; const { data } = await sb.storage.from('videos').createSignedUrl(v, 7200); return data?.signedUrl || null; },
    modules: () => ok(sb.from('modules').select('*').order('ordem')),
    lessons: () => ok(sb.from('lessons').select('id,module_id,titulo,descricao,capa,video_url,ordem').order('ordem')),
    async progress() { const m = {}; (await ok(sb.from('progress').select('*'))).forEach(r => m[r.lesson_id] = r); return m; },
    save: (lid, p) => ok(sb.from('progress').upsert({ user_id: uid, lesson_id: lid, ...p, updated_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' })),
    async posts() { const rows = await ok(sb.from('community_posts').select('id,user_id,conteudo,data,autor:users(nome,avatar),comments(id,user_id,conteudo,data,autor:users(nome)),reactions(user_id)').order('data', { ascending: false }).limit(50));
      return rows.map(p => ({ ...p, comments: (p.comments || []).sort((a, b) => a.data.localeCompare(b.data)), likes: (p.reactions || []).length, liked: (p.reactions || []).some(r => r.user_id === uid) })); },
    post: t => ok(sb.from('community_posts').insert({ user_id: uid, conteudo: t })),
    comment: (pid, t) => ok(sb.from('comments').insert({ post_id: pid, user_id: uid, conteudo: t })),
    delPost: id => ok(sb.from('community_posts').delete().eq('id', id)),
    delComment: id => ok(sb.from('comments').delete().eq('id', id)),
    react: (pid, on) => on ? ok(sb.from('reactions').delete().eq('post_id', pid).eq('user_id', uid)) : ok(sb.from('reactions').insert({ post_id: pid, user_id: uid, tipo: 'like' })),
    /* oportunidades */
    async opps({ q, specialty, type, place, level, freelance, kws, page = 0 }) {
      let r = sb.from('opportunities').select(OP_COLS).neq('status', 'expired').order('featured', { ascending: false }).order('published_at', { ascending: false, nullsFirst: false }).range(page * 20, page * 20 + 19);
      const clean = s => String(s).replace(/[%,()*]/g, ' ').trim();
      if (q) { const c = clean(q); r = r.or(`title.ilike.%${c}%,company.ilike.%${c}%,description.ilike.%${c}%`); }
      if (kws?.length) r = r.or(kws.map(k => `title.ilike.%${clean(k)}%`).join(','));
      if (specialty) r = r.eq('specialty', specialty);
      if (type) r = r.eq('employment_type', type);
      if (level) r = r.eq('experience_level', level);
      if (freelance) r = r.in('employment_type', ['freelance', 'project']);
      if (place === 'Remoto') r = r.eq('remote', true); else if (place) r = r.ilike('location', `%${clean(place)}%`);
      return ok(r); },
    opp: id => ok(sb.from('opportunities').select('*').eq('id', id).maybeSingle()),
    async savedIds() { return new Set((await ok(sb.from('saved_opportunities').select('opportunity_id'))).map(r => r.opportunity_id)); },
    async saved() { const rows = await ok(sb.from('saved_opportunities').select(`created_at,o:opportunities(${OP_COLS})`).order('created_at', { ascending: false })); return rows.map(r => r.o).filter(Boolean); },
    toggleSave: (id, on) => on ? ok(sb.from('saved_opportunities').delete().eq('opportunity_id', id).eq('user_id', uid)) : ok(sb.from('saved_opportunities').insert({ opportunity_id: id, user_id: uid }))
  };
})();
