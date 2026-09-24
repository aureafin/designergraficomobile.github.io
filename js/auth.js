/* Firebase Auth (email + senha). Sem cadastro público: a conta só dá acesso se existir users/{uid} com status 'active'. */
(function () {
  const gate = p => (p && p.status === 'active') ? p : null;
  window.Auth = {
    init: () => DB.init(),
    async user() { return gate(await DB.profile()); },
    async login(email, pass) {
      try { await DB.auth().signInWithEmailAndPassword(email, pass); } catch (e) { throw new Error('Email ou senha incorretos.'); }
      const p = await DB.profile();
      if (!p || p.status !== 'active') { await this.logout(); throw new Error('A tua conta está inativa ou bloqueada. Contacta o suporte.'); }
      return p;
    },
    async logout() { await DB.auth().signOut(); DB.reset(); },
    reset: email => DB.auth().sendPasswordResetEmail(email)
  };
})();
