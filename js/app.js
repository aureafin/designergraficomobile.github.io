(async function () {
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = { home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13', chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6A8 8 0 1 1 21 12z', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', brief: 'M3 8h18v12H3zM8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3', heart: 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z', user: 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', play: 'M7 4l13 8-13 8z', pause: 'M7 4h4v16H7zM13 4h4v16h-4z', vol: 'M4 9v6h4l5 4V5L8 9zM17 8a5 5 0 0 1 0 8', full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' };
  const av = (u, c = '') => { const url = u?.avatar ? DB.avatarUrl(u.avatar) : null; return `<div class="ava ${c}">${url ? `<img src="${esc(url)}" alt="" loading="lazy" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : esc((u?.nome || '?')[0])}</div>`; };
  const fd = d => d ? new Date(d).toLocaleDateString('pt-PT') : '—';
  const ic = n => `<svg class="i" viewBox="0 0 24 24"><path d="${P[n]}"/></svg>`;
  let S = {}, me = null;

  async function load() { const [m, l, p] = await Promise.all([DB.modules(), DB.lessons(), DB.progress()]); S = { mods: m, less: l, prog: p }; }
  const done = l => !!S.prog[l.id]?.concluido;
  const pct = ls => ls.length ? Math.round(ls.filter(done).length / ls.length * 100) : 0;
  const mLess = m => S.less.filter(l => l.module_id === m.id).sort((a, b) => a.ordem - b.ordem);
  const bar = p => `<div class="bar"><i style="width:${p}%"></i></div>`;
  const cover = (c, n) => `<div class="cover" ${c ? `style="background-image:url('${esc(c)}')"` : ''}>${n != null ? `<b>${String(n).padStart(2, '0')}</b>` : ''}</div>`;
  const nextLesson = () => S.less.find(l => !done(l)) || S.less[0];
  const modCls = m => m.ordem === 5 ? 'mod--ai' : m.ordem === 6 ? 'mod--end' : '';

  const modCard = m => { const ls = mLess(m), p = pct(ls);
    return `<a href="#/modulo/${m.id}" class="box mod reveal ${modCls(m)}">${cover(m.capa, m.ordem)}<div class="in"><h3>${esc(m.titulo)}</h3>${bar(p)}<p class="muted" style="margin-top:8px">${ls.filter(done).length}/${ls.length} aulas · ${p}%</p></div></a>`; };

  function shell(inner, route) {
    const nav = [['#/', 'home', 'Início'], ['#/curso', 'book', 'Curso'], ['#/comunidade', 'chat', 'Comunidade'], ['#/oportunidades', 'brief', 'Oportunidades'], ['#/perfil', 'user', 'Perfil']]
      .map(n => `<a href="${n[0]}" class="${route === n[0] ? 'on' : ''}">${ic(n[1])}${n[2]}</a>`).join('');
    return `<aside class="side"><div class="logo">DGM<span class="dot">.</span></div>${nav}</aside><main><div class="wrap">${inner}</div></main><nav class="bottom">${nav}</nav>`;
  }

  /* ---------- views ---------- */
  function login() {
    app.innerHTML = `<div class="login"><form class="box glow" id="lf" novalidate><div class="display" style="font-size:26px;text-align:center">DGM<span class="dot">.</span></div>
    <span class="pill" style="display:table;margin:14px auto 0">Área exclusiva dos alunos</span><h1 class="display">Bem-vindo de volta</h1>
    <p class="muted" style="text-align:center">Entra na tua conta para continuar a tua formação.</p>
    <label for="em">Email</label><input class="field" id="em" type="email" autocomplete="username" required>
    <label for="pw">Senha</label><div class="pw"><input class="field" id="pw" type="password" autocomplete="current-password" required><button type="button" id="tg">Mostrar</button></div>
    <p class="err" id="er" role="alert"></p><button class="btn primary wide" id="go">Entrar</button>
    <p style="text-align:center;margin-top:16px"><button type="button" class="muted" id="fg">Esqueci a minha senha</button></p></form></div>`;
    const er = $('#er'), go = $('#go');
    $('#tg').onclick = () => { const i = $('#pw'), s = i.type === 'password'; i.type = s ? 'text' : 'password'; $('#tg').textContent = s ? 'Ocultar' : 'Mostrar'; };
    $('#fg').onclick = async () => { const e = $('#em').value.trim(); if (!e) { er.textContent = 'Escreve o teu email primeiro.'; return; }
      try { await Auth.reset(e); } catch (x) {} er.style.color = 'var(--gray)'; er.textContent = 'Se o email existir, vais receber instruções de recuperação.'; };
    $('#lf').onsubmit = async ev => { ev.preventDefault(); er.style.color = ''; er.textContent = ''; go.disabled = true; go.textContent = 'A entrar…';
      try { me = await Auth.login($('#em').value.trim().toLowerCase(), $('#pw').value); await load(); location.hash = '#/'; route(); }
      catch (x) { er.textContent = x.message; go.disabled = false; go.textContent = 'Entrar'; } };
  }

  function dashboard() {
    const all = pct(S.less), nx = nextLesson(), first = me.nome.split(' ')[0];
    return `<section class="box glow hero reveal"><span class="pill">Área de alunos</span><h1 class="display">Olá, ${esc(first)}.</h1>
      <p class="muted">Progresso do curso</p><div style="margin:8px 0 6px">${bar(all)}</div><p class="muted">${S.less.filter(done).length} de ${S.less.length} aulas concluídas · ${all}%</p>
      <a class="btn primary" style="margin-top:18px" href="#/aula/${nx.id}">Continuar aprendizagem</a></section>
      <h2 class="sec">Módulos</h2>${S.mods.map(modCard).join('')}
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn ghost" href="#/progresso">Progresso</a><a class="btn ghost" href="#/sobre">Sobre o curso</a><a class="btn ghost" href="#/criador">O criador</a></div>`;
  }
  const curso = () => `<h1 class="display" style="font-size:34px;margin-bottom:18px">O Curso</h1>${S.mods.map(modCard).join('')}`;

  function modulo(id) {
    const m = S.mods.find(x => x.id === id); if (!m) return '<p>Módulo não encontrado.</p>'; const ls = mLess(m);
    return `<a class="muted" href="#/curso">← Módulos</a><div class="box glow mod ${modCls(m)}" style="margin:14px 0 22px">${cover(m.capa, m.ordem)}<div class="in"><h1 class="display" style="font-size:30px">${esc(m.titulo)}</h1><p class="muted" style="margin:8px 0 12px">${esc(m.descricao)}</p>${bar(pct(ls))}<p class="muted" style="margin-top:8px">${pct(ls)}% concluído</p></div></div>
      ${ls.map(l => { const d = done(l), st = S.prog[l.id]; return `<div class="box lesson reveal ${modCls(m)}">${cover(l.capa, l.ordem)}<div><p class="tag ${d ? 'ok' : ''}">${d ? '✓ Concluída' : st?.ultima_posicao > 0 ? 'Em andamento' : 'Disponível'}</p><h3>${esc(l.titulo)}</h3><p class="muted" style="font-size:13px;margin:2px 0 8px">${esc(l.descricao)}</p><a class="btn ghost" style="padding:8px 18px;font-size:13px" href="#/aula/${l.id}">Assistir aula</a></div></div>`; }).join('')}`;
  }

  function aula(id) {
    const l = S.less.find(x => x.id === id); if (!l) return '<p>Aula não encontrada.</p>'; const m = S.mods.find(x => x.id === l.module_id), ls = mLess(m), i = ls.indexOf(l), nx = ls[i + 1];
    return `<a class="muted" href="#/modulo/${m.id}">← ${esc(m.titulo)}</a><h1 class="display" style="font-size:28px;margin:12px 0"><span class="dot">${String(l.ordem).padStart(2, '0')}</span> ${esc(l.titulo)}</h1>
      <div class="box glow player" id="pl">${l._src ? `<video id="vid" playsinline preload="metadata" controlsList="nodownload" oncontextmenu="return false" src="${esc(l._src)}"></video><div class="spin" id="sp">A carregar…</div>` : '<div class="ph">Vídeo em breve.<br>O administrador poderá adicioná-lo mais tarde.</div>'}
      <div class="ctl"><button id="pp" aria-label="Play/Pausa">${ic('play')}</button><input type="range" id="sk" min="0" max="1000" value="0" aria-label="Progresso da aula"><button id="mu" aria-label="Volume">${ic('vol')}</button><input type="range" id="vol" min="0" max="100" value="100" aria-label="Volume"><button id="fs" aria-label="Ecrã inteiro">${ic('full')}</button></div></div>
      <p class="muted" style="margin:16px 0" id="st">${done(l) ? '✓ Aula concluída' : ''}</p><p>${esc(l.descricao)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="btn ghost" id="dn">${done(l) ? 'Concluída ✓' : 'Marcar como concluída'}</button>${nx ? `<a class="btn primary" href="#/aula/${nx.id}">Próxima aula</a>` : ''}</div>`;
  }
  function player(id) {
    const v = $('#vid'), sk = $('#sk'), vol = $('#vol'), pp = $('#pp'); let last = 0;
    const fill = (el, x) => el.style.setProperty('--p', x + '%');
    const mark = async (p, pos, ok) => { const c = ok || S.prog[id]?.concluido; await DB.save(id, { progresso: p, ultima_posicao: pos, concluido: !!c }); S.prog = await DB.progress(); if (ok) { $('#st').textContent = '✓ Aula concluída'; $('#dn').textContent = 'Concluída ✓'; } };
    $('#dn').onclick = () => mark(100, v ? v.currentTime : 0, true);
    if (!v) return;
    const seed = S.prog[id]?.ultima_posicao || 0; v.addEventListener('loadedmetadata', () => { if (seed && seed < v.duration - 3) v.currentTime = seed; });
    pp.onclick = () => v.paused ? v.play() : v.pause();
    v.onclick = pp.onclick; v.onplay = () => pp.innerHTML = ic('pause'); v.onpause = () => { pp.innerHTML = ic('play'); mark(Math.round(v.currentTime / v.duration * 100) || 0, v.currentTime); };
    v.onwaiting = () => $('#sp').classList.add('on'); v.oncanplay = () => $('#sp').classList.remove('on');
    v.ontimeupdate = () => { const x = v.currentTime / v.duration * 1000 || 0; sk.value = x; fill(sk, x / 10);
      if (Date.now() - last > 5000) { last = Date.now(); mark(Math.round(x / 10), v.currentTime, x / 10 >= 90); } };
    v.onended = () => mark(100, 0, true);
    sk.oninput = () => { v.currentTime = sk.value / 1000 * v.duration; fill(sk, sk.value / 10); };
    vol.oninput = () => { v.volume = vol.value / 100; fill(vol, vol.value); }; fill(vol, 100);
    $('#mu').onclick = () => { v.muted = !v.muted; };
    $('#fs').onclick = () => { const p = $('#pl'); (document.fullscreenElement ? document.exitFullscreen() : (p.requestFullscreen || v.webkitEnterFullscreen || (() => {})).call(p.requestFullscreen ? p : v)); };
  }

  async function comunidade() {
    const posts = await DB.posts(), mine = DB.uid();
    return `<h1 class="display" style="font-size:34px;margin-bottom:6px">Comunidade</h1><p class="muted" style="margin-bottom:16px">Partilha trabalhos, dúvidas e progresso com outros alunos.</p>
    <div class="box post"><textarea class="field" id="np" maxlength="1000" placeholder="Partilha algo com a comunidade…"></textarea><p class="err" id="ce"></p><button class="btn primary" id="pb">Publicar</button></div>
    ${posts.length ? posts.map(p => `<article class="box post reveal"><div class="top">${av(p.autor)}<div style="flex:1"><b>${esc(p.autor?.nome)}</b><span class="tagv">Aluno</span><div class="muted" style="font-size:12px">${fd(p.data)}</div></div>${p.user_id === mine ? `<button class="muted" data-act="dp" data-id="${p.id}">Apagar</button>` : ''}</div>
    <p style="white-space:pre-line">${esc(p.conteudo)}</p><button class="btn ghost" style="padding:6px 14px;font-size:13px;margin-top:10px;${p.liked ? 'border-color:var(--red);color:var(--red)' : ''}" data-act="lk" data-id="${p.id}" data-on="${p.liked ? 1 : 0}">${ic('heart')} ${p.likes}</button>
    ${p.comments.map(c => `<div class="cm"><b>${esc(c.autor?.nome)}</b> ${esc(c.conteudo)} ${c.user_id === mine ? `<button class="muted" style="font-size:12px" data-act="dc" data-id="${c.id}">apagar</button>` : ''}</div>`).join('')}
    <form class="cm cf" data-id="${p.id}" style="display:flex;gap:8px"><input class="field" maxlength="500" placeholder="Comentar…" style="padding:9px 12px"><button class="btn ghost" style="padding:8px 16px">Enviar</button></form></article>`).join('') : '<p class="muted">Ainda não há publicações. Sê o primeiro a partilhar.</p>'}`;
  }
  function comInit() {
    const fail = e => { $('#ce').textContent = 'Não foi possível concluir: ' + e.message; };
    $('#pb').onclick = async () => { const t = $('#np').value.trim(); if (!t) return; try { await DB.post(t); route(); } catch (e) { fail(e); } };
    document.querySelectorAll('.cf').forEach(f => f.onsubmit = async e => { e.preventDefault(); const t = f.querySelector('input').value.trim(); if (t) try { await DB.comment(f.dataset.id, t); route(); } catch (x) { fail(x); } });
    $('main').onclick = async e => { const b = e.target.closest('[data-act]'); if (!b) return; const id = b.dataset.id;
      try { if (b.dataset.act === 'lk') await DB.react(id, b.dataset.on === '1'); else if (b.dataset.act === 'dp' && confirm('Apagar esta publicação?')) await DB.delPost(id); else if (b.dataset.act === 'dc') await DB.delComment(id); else return; route(); } catch (x) { fail(x); } };
  }

  function progresso() { const all = pct(S.less);
    return `<h1 class="display" style="font-size:34px;margin-bottom:18px">Progresso</h1><div class="box glow hero"><p class="muted">Progresso do curso</p><h2 class="display" style="font-size:54px;color:var(--red)">${all}%</h2>${bar(all)}</div>
    ${S.mods.map(m => { const ls = mLess(m); return `<div class="box post"><b>Módulo ${m.ordem} — ${esc(m.titulo)}</b><div style="margin:10px 0 6px">${bar(pct(ls))}</div><span class="muted">${ls.filter(done).length}/${ls.length} aulas · ${pct(ls)}%</span></div>`; }).join('')}`; }

  function perfil() {
    const d = S.less.filter(done), md = S.mods.filter(m => pct(mLess(m)) === 100), all = pct(S.less);
    const ach = [[d.length >= 1, 'Primeira aula concluída'], [md.length >= 1, 'Primeiro módulo concluído'], [all >= 50, 'Metade do curso'], [all === 100, 'Curso concluído']];
    const rec = Object.values(S.prog).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).slice(0, 4);
    return `<div style="display:flex;gap:16px;align-items:center;margin-bottom:8px">${av(me, "big")}<div><h1 class="display" style="font-size:30px">${esc(me.nome)}</h1><p class="muted"><span class="tagv" style="margin:0 6px 0 0">Aluno</span>desde ${fd(me.data_criacao)}</p><label class="btn ghost" style="padding:6px 14px;font-size:12px;margin-top:8px;cursor:pointer">Alterar foto<input type="file" id="ph" accept="image/*" hidden></label><p class="err" id="pe"></p></div></div>
    <div class="stats"><div class="box"><b>${all}%</b><span class="muted">Progresso</span></div><div class="box"><b>${d.length}</b><span class="muted">Aulas</span></div><div class="box"><b>${md.length}</b><span class="muted">Módulos</span></div></div>
    <h2 class="sec">Conquistas</h2>${ach.map(a => `<p class="tag ${a[0] ? 'ok' : ''}" style="margin:6px 0">${a[0] ? '✓' : '○'} ${a[1]}</p>`).join('')}
    <h2 class="sec">Atividade recente</h2>${rec.length ? rec.map(r => `<p class="muted">${esc(S.less.find(l => l.id === r.lesson_id)?.titulo || r.lesson_id)} — ${Math.round(r.progresso || 0)}%</p>`).join('') : '<p class="muted">Ainda sem atividade.</p>'}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:28px"><a class="btn ghost" href="#/sobre">Sobre o curso</a><a class="btn ghost" href="#/criador">O criador</a><button class="btn ghost" id="lo">Terminar sessão</button></div>`;
  }
  const sobre = () => `<div class="prose"><h1 class="display" style="font-size:34px">Designer Gráfico Mobile</h1>
    <p>Aprende a criar como um profissional, direto do telemóvel: do zero ao portfólio, sem precisares de computador.</p>
    <h2>Metodologia</h2><p>Aulas curtas e diretas, feitas para veres entre tarefas do dia a dia, com ficheiros e templates de apoio e uma comunidade para partilhar trabalhos.</p>
    <h2>Módulos</h2>${S.mods.map(m => `<p><b>${m.ordem}. ${esc(m.titulo)}</b> — ${esc(m.descricao)}</p>`).join('')}
    <h2>Competências</h2><p>Composição, tipografia e cor; logótipos; flyers e artes para redes sociais; design desportivo; portfólio.</p>
    <h2>Distribuidor e criador</h2><p>Rosário David. <a class="dot" href="#/criador">Ver página</a></p></div>`;
  const criador = () => `<div class="prose"><div class="ava big">R</div><h1 class="display" style="font-size:34px;margin-top:14px">Rosário David</h1><p>Criador e distribuidor do curso Designer Gráfico Mobile.</p>
    <div class="ph-box">Fotografia — a adicionar</div><div class="ph-box">Biografia — a adicionar</div><div class="ph-box">Contactos e redes sociais — a adicionar</div><div class="ph-box">Projetos e links — a adicionar</div></div>`;

  /* ---------- oportunidades ---------- */
  const OP = { tab: 'todas', q: '', sp: '', ty: '', pl: '', lv: '' };
  const SPEC = ['Design Gráfico', 'Branding', 'Logo Design', 'Social Media', 'Flyer Design', 'Design Esportivo', 'UI/UX', 'Ilustração', 'Motion Design', 'Publicidade', 'Packaging', 'AI Visual Design'];
  const TYPES = [['freelance', 'Freelancer'], ['project', 'Projeto'], ['full_time', 'Full-time'], ['part_time', 'Part-time'], ['internship', 'Estágio'], ['contract', 'Contrato'], ['remote', 'Trabalho remoto']];
  const TL = Object.fromEntries(TYPES);
  const PL = { Angola: 'Angola', 'África': 'Africa', Portugal: 'Portugal', Brasil: 'Brazil', Europa: 'Europe', Internacional: 'Worldwide', Remoto: 'Remoto' };
  const LV = ['Iniciante', 'Júnior', 'Intermediário', 'Sénior'];
  const SUG = ['Designer Gráfico', 'Graphic Designer', 'Brand Designer', 'Logo Designer', 'Social Media Designer', 'Flyer Designer', 'Sports Designer', 'Visual Designer', 'AI Visual Designer', 'AI Designer', 'UI Designer', 'Illustrator', 'Motion Designer', 'Presentation Designer', 'Packaging Designer'];
  const MKW = { m2: ['brand', 'logo', 'identity'], m3: ['flyer', 'social media', 'advertis', 'poster'], m4: ['sport', 'football'], m5: ['ai designer', 'ai visual', 'generative ai'], m6: ['graphic designer', 'visual designer'] };
  const recKws = () => { const k = S.mods.filter(m => pct(mLess(m)) === 100).flatMap(m => MKW[m.id] || []); return k.length ? k : ['graphic designer', 'visual designer', 'brand designer']; };
  const opt = (arr, v, ph) => `<option value="">${ph}</option>` + arr.map(a => { const [k, l] = Array.isArray(a) ? a : [a, a]; return `<option value="${esc(k)}" ${v === k ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
  const oppCard = (o, sv) => `<article class="box opp reveal ${o.featured ? 'glow' : ''}"><div class="muted" style="font-size:12px">${esc(o.specialty || '')}${o.featured ? ' · Destaque' : ''}</div><h3>${esc(o.title)}</h3><p class="muted">${esc(o.company || 'Empresa não indicada')}</p>
    <p class="meta">${[o.remote ? 'Remoto' : null, o.location, TL[o.employment_type], o.experience_level, o.salary && 'Salário: ' + o.salary, o.budget && 'Orçamento: ' + o.budget].filter(Boolean).map(esc).join(' · ')}</p>
    <p class="muted" style="font-size:12px">${fd(o.published_at)} · Fonte: ${esc(o.source)}${o.status === 'unknown' ? ' · <b>Estado não verificado</b>' : ''}</p>
    <div style="display:flex;gap:8px;margin-top:12px"><a class="btn primary" style="padding:10px 20px;font-size:14px" href="#/oportunidade/${o.id}">Ver oportunidade</a><button class="btn ghost" style="padding:10px 18px;font-size:14px" data-save="${o.id}" data-on="${sv ? 1 : 0}">${sv ? 'Guardada ✓' : 'Guardar'}</button></div></article>`;
  function bindSave(root, after) { root.onclick = async e => { const b = e.target.closest('[data-save]'); if (!b) return; const on = b.dataset.on === '1'; b.disabled = true;
    try { await DB.toggleSave(b.dataset.save, on); b.dataset.on = on ? '0' : '1'; b.textContent = on ? 'Guardar' : 'Guardada ✓'; if (after && on) after(); } catch (x) { b.textContent = 'Erro — tenta de novo'; } b.disabled = false; }; }
  function oportunidades() {
    const tab = (k, l) => `<button class="chip ${OP.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`;
    return `<h1 class="display" style="font-size:34px;margin-bottom:6px">Oportunidades</h1><p class="muted" style="margin-bottom:14px">Vagas e projetos agregados de fontes públicas. Confirma sempre na fonte original.</p>
    <div class="tabs">${tab('todas', 'Pesquisar')}${tab('para-ti', 'Para ti')}${tab('freelance', 'Projetos Freelance')}${tab('guardadas', 'Guardadas')}</div>
    <div id="flt" ${OP.tab === 'guardadas' ? 'hidden' : ''}><input class="field" id="oq" list="sug" placeholder="Pesquisar oportunidades (ex.: Brand Designer)" value="${esc(OP.q)}"><datalist id="sug">${SUG.map(x => `<option value="${x}">`).join('')}</datalist>
    <div class="sels"><select class="field" id="sp">${opt(SPEC, OP.sp, 'Especialidade')}</select><select class="field" id="ty">${opt(TYPES, OP.ty, 'Tipo')}</select><select class="field" id="pl">${opt(Object.keys(PL), OP.pl, 'Localização')}</select><select class="field" id="lv">${opt(LV, OP.lv, 'Experiência')}</select></div></div>
    ${OP.tab === 'para-ti' ? '<p class="muted" style="margin:8px 0">Com base nos módulos que concluíste. A pesquisa geral continua disponível no separador Pesquisar.</p>' : ''}<div id="ol" style="margin-top:14px"></div>`;
  }
  async function oppFill() { const box = $('#ol'); box.innerHTML = '<p class="muted">A carregar…</p>';
    try { const ids = await DB.savedIds(); let list;
      if (OP.tab === 'guardadas') list = await DB.saved();
      else { const p = { q: OP.q, specialty: OP.sp, level: OP.lv, type: OP.ty === 'remote' ? '' : OP.ty, place: OP.ty === 'remote' ? 'Remoto' : PL[OP.pl] || '', freelance: OP.tab === 'freelance' }; if (OP.tab === 'para-ti') p.kws = recKws(); list = await DB.opps(p); }
      box.innerHTML = list.length ? list.map(o => oppCard(o, ids.has(o.id))).join('') : '<p class="muted">Sem resultados. Se a base de dados ainda estiver vazia, o administrador precisa de executar a sincronização de fontes.</p>';
      box.querySelectorAll('.reveal').forEach(el => el.classList.add('on')); bindSave(box, oppFill);
    } catch (e) { box.innerHTML = `<p class="err">Não foi possível carregar: ${esc(e.message)}</p>`; } }
  function oppInit() { let t; const go = () => { OP.q = $('#oq').value.trim(); OP.sp = $('#sp').value; OP.ty = $('#ty').value; OP.pl = $('#pl').value; OP.lv = $('#lv').value; oppFill(); };
    $('#oq').oninput = () => { clearTimeout(t); t = setTimeout(go, 400); }; ['sp', 'ty', 'pl', 'lv'].forEach(i => $('#' + i).onchange = go);
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { OP.tab = b.dataset.tab; route(); }); oppFill(); }
  function oppDetail(o, sv) { if (!o) return '<p>Oportunidade não encontrada ou já não disponível.</p>';
    return `<a class="muted" href="#/oportunidades">← Oportunidades</a><p class="muted" style="margin-top:14px">${esc(o.specialty || '')}</p><h1 class="display" style="font-size:30px;margin:6px 0">${esc(o.title)}</h1><p class="muted">${esc(o.company || 'Empresa não indicada')}</p>
    <p class="meta" style="margin:12px 0">${[o.remote ? 'Remoto' : null, o.location, TL[o.employment_type], o.experience_level, o.salary && 'Salário: ' + o.salary, o.budget && 'Orçamento: ' + o.budget].filter(Boolean).map(esc).join(' · ')}</p>
    <p class="muted" style="font-size:13px">Publicada: ${fd(o.published_at)} · Vista pela última vez: ${fd(o.last_seen)} · Fonte: ${esc(o.source)}</p>${o.status !== 'open' ? '<p class="ph-box">Não foi possível verificar se esta oportunidade ainda está disponível. Confirma na fonte original.</p>' : ''}
    <div class="box post" style="margin-top:16px"><p style="white-space:pre-line">${esc(o.description || 'Sem descrição. Consulta a fonte original.')}</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><a class="btn primary" href="${esc(o.source_url)}" target="_blank" rel="noopener noreferrer">Candidatar na fonte original</a><button class="btn ghost" data-save="${o.id}" data-on="${sv ? 1 : 0}">${sv ? 'Guardada ✓' : 'Guardar'}</button></div>`; }

  /* ---------- router ---------- */
  async function route0() {
    const h = location.hash || '#/', [, r, a] = h.split('/');
    if (r === 'login') { if (me) { location.hash = '#/'; return; } return login(); }
    if (!me) { location.hash = '#/login'; return; }
    let html, nav = h, after;
    if (r === '') { html = dashboard(); nav = '#/'; }
    else if (r === 'curso') html = curso();
    else if (r === 'modulo') { html = modulo(a); nav = '#/curso'; }
    else if (r === 'aula') { const L = S.less.find(x => x.id === a); if (L) L._src = await DB.videoUrl(L.video_url); html = aula(a); nav = '#/curso'; after = () => player(a); }
    else if (r === 'comunidade') { html = await comunidade(); after = comInit; }
    else if (r === 'progresso') { html = progresso(); nav = '#/perfil'; }
    else if (r === 'perfil') { html = perfil(); after = () => { $('#lo').onclick = async () => { await Auth.logout(); me = null; location.hash = '#/login'; };
      $('#ph').onchange = async e => { const f = e.target.files[0]; if (!f) return; if (f.size > 2e6) { $('#pe').textContent = 'Imagem demasiado grande (máx. 2 MB).'; return; } try { me.avatar = await DB.setAvatar(f); route(); } catch (x) { $('#pe').textContent = x.message; } }; }; }
    else if (r === 'sobre') { html = sobre(); nav = '#/perfil'; } else if (r === 'criador') { html = criador(); nav = '#/perfil'; }
    else if (r === 'oportunidades') { html = oportunidades(); after = oppInit; }
    else if (r === 'oportunidade') { const o = await DB.opp(a), ids = await DB.savedIds(); html = oppDetail(o, ids.has(a)); after = () => bindSave($('main')); nav = '#/oportunidades'; }
    else html = '<p>Página não encontrada.</p>';
    app.innerHTML = shell(html, nav); window.scrollTo(0, 0); if (after) after();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  async function route() { try { await route0(); } catch (e) { app.innerHTML = me ? shell(`<p class="err">Ocorreu um erro: ${esc(e.message)}</p>`, '') : `<div class="login"><p class="err">${esc(e.message)}</p></div>`; } }
  if (!DB.configured) { app.innerHTML = '<div class="login"><div class="box glow" style="padding:28px;max-width:420px"><h1 class="display">Configuração em falta</h1><p class="muted" style="margin-top:8px">Preenche js/config.js com SUPABASE_URL e SUPABASE_ANON_KEY.</p></div></div>'; return; }
  try { await Auth.init(); me = await Auth.user(); if (me) await load(); } catch (e) { me = null; }
  window.addEventListener('hashchange', route); route();
})();
