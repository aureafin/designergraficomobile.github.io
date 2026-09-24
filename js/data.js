/* Camada de dados: 100% Firebase (Auth + Firestore + Storage), SDK compat carregado do CDN oficial do Firebase. */
(function () {
  const F = (window.CONFIG || {}).FIREBASE || {}; let auth, db, st, uid = null, prof = null, cache = null, cacheAt = 0;
  const iso = d => !d ? null : d.toDate ? d.toDate().toISOString() : String(d);
  const now = () => new Date().toISOString();
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const list = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
  const DB = window.DB = {
    configured: !!(F.apiKey && F.projectId),
    async init() { if (auth || !this.configured) return; const V = '10.12.2';
      for (const n of ['app', 'auth', 'firestore', 'storage']) await load(`https://www.gstatic.com/firebasejs/${V}/firebase-${n}-compat.js`);
      firebase.initializeApp(F); auth = firebase.auth(); db = firebase.firestore(); st = firebase.storage(); },
    auth: () => auth, uid: () => uid,
    reset() { uid = null; prof = null; cache = null; },
    async profile() { const u = await new Promise(r => { const off = auth.onAuthStateChanged(x => { off(); r(x); }); }); if (!u) return null; uid = u.uid;
      const d = await db.collection('users').doc(uid).get(); if (!d.exists) return null; const x = d.data();
      return (prof = { id: uid, nome: x.nome, email: x.email || u.email, avatar: x.avatar || null, status: x.status, data_criacao: iso(x.data_criacao) }); },
    avatarUrl: p => p || null,   // guardamos a URL de download completa
    async setAvatar(file) { const ref = st.ref(`avatars/${uid}/avatar-${Date.now()}`); await ref.put(file, { contentType: file.type });
      const url = await ref.getDownloadURL(); await db.collection('users').doc(uid).update({ avatar: url }); return url; },
    async videoUrl(v) { if (!v) return null; return /^https?:\/\//.test(v) ? v : st.ref(v).getDownloadURL().catch(() => null); },
    async modules() { return list(await db.collection('modules').orderBy('ordem').get()); },
    async lessons() { return list(await db.collection('lessons').orderBy('ordem').get()); },
    async progress() { const m = {}; (await db.collection('users').doc(uid).collection('progress').get()).forEach(d => m[d.id] = { lesson_id: d.id, ...d.data() }); return m; },
    save: (lid, p) => db.collection('users').doc(uid).collection('progress').doc(lid).set({ ...p, updated_at: now() }, { merge: true }),
    async posts() { const s = await db.collection('posts').orderBy('data', 'desc').limit(30).get();
      return Promise.all(s.docs.map(async d => { const p = d.data(), c = await d.ref.collection('comments').orderBy('data').limit(100).get(), likes = p.likes || [];
        return { id: d.id, user_id: p.user_id, conteudo: p.conteudo, data: p.data, autor: { nome: p.autor_nome, avatar: p.autor_avatar || null },
          comments: c.docs.map(x => ({ id: x.id, ...x.data(), autor: { nome: x.data().autor_nome } })), likes: likes.length, liked: likes.includes(uid) }; })); },
    post: t => db.collection('posts').add({ user_id: uid, autor_nome: prof.nome, autor_avatar: prof.avatar || null, conteudo: t, aviso: false, likes: [], data: now() }),
    comment: (pid, t) => db.collection('posts').doc(pid).collection('comments').add({ user_id: uid, autor_nome: prof.nome, conteudo: t, data: now() }),
    delPost: id => db.collection('posts').doc(id).delete(),
    delComment: (id, pid) => db.collection('posts').doc(pid).collection('comments').doc(id).delete(),
    react: (pid, on) => db.collection('posts').doc(pid).update({ likes: on ? firebase.firestore.FieldValue.arrayRemove(uid) : firebase.firestore.FieldValue.arrayUnion(uid) }),
    /* oportunidades: filtragem no cliente sobre as 400 mais recentes (Firestore não tem pesquisa de texto). */
    async allOpps() { if (cache && Date.now() - cacheAt < 3e5) return cache; cache = list(await db.collection('opportunities').orderBy('published_at', 'desc').limit(400).get()); cacheAt = Date.now(); return cache; },
    async opps({ q, specialty, type, place, level, freelance, kws, page = 0 }) { const lc = s => String(s || '').toLowerCase(), Q = lc(q);
      let r = (await this.allOpps()).filter(o => o.status !== 'expired');
      if (Q) r = r.filter(o => lc(o.title + ' ' + o.company + ' ' + o.description).includes(Q));
      if (kws?.length) r = r.filter(o => kws.some(k => lc(o.title).includes(lc(k))));
      if (specialty) r = r.filter(o => o.specialty === specialty);
      if (type) r = r.filter(o => o.employment_type === type);
      if (level) r = r.filter(o => o.experience_level === level);
      if (freelance) r = r.filter(o => ['freelance', 'project'].includes(o.employment_type));
      if (place === 'Remoto') r = r.filter(o => o.remote === true); else if (place) r = r.filter(o => lc(o.location).includes(lc(place)));
      r = [...r.filter(o => o.featured), ...r.filter(o => !o.featured)]; return r.slice(page * 20, page * 20 + 20); },
    async opp(id) { const d = await db.collection('opportunities').doc(id).get(); return d.exists ? { id: d.id, ...d.data() } : null; },
    async savedIds() { return new Set((await db.collection('users').doc(uid).collection('saved').get()).docs.map(d => d.id)); },
    async saved() { const s = await db.collection('users').doc(uid).collection('saved').orderBy('created_at', 'desc').get();
      return (await Promise.all(s.docs.map(d => db.collection('opportunities').doc(d.id).get()))).filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })); },
    toggleSave(id, on) { const r = db.collection('users').doc(uid).collection('saved').doc(id); return on ? r.delete() : r.set({ created_at: now() }); }
  };
})();
