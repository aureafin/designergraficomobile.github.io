/* Supabase Auth. Sem cadastro público: as contas são criadas pelo administrador. */
(function () {
  const gate = p => (p && p.status === 'active') ? p : null;
  window.Auth = {
    init: () => DB.init(),
    async user() { return gate(await DB.profile()); },
    async login(email, pass) {
      const { error } = await DB.client().auth.signInWithPassword({ email, password: pass });
      if (error) throw new Error('Email ou senha incorretos.');
      const p = await DB.profile();
      if (!p || p.status !== 'active') { await this.logout(); throw new Error('A tua conta está inativa ou bloqueada. Contacta o suporte.'); }
      return p;
    },
    logout: () => DB.client().auth.signOut(),
    reset: email => DB.client().auth.resetPasswordForEmail(email)
  };
})();
