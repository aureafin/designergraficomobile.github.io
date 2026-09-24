# Área de alunos — Firebase: passos de publicação

## 1. Criar o projeto
1. console.firebase.google.com > Adicionar projeto.
2. **Authentication** > Começar > ativar **Email/Password**. Se a consola tiver a opção de desativar o registo de novos utilizadores (Definições > Ações do utilizador), desativa-a. Mesmo sem isso, quem criar conta por fora **não tem acesso a nada**: as regras exigem um documento `users/{uid}` com `status: "active"`.
3. **Firestore Database** > Criar base de dados (modo produção).
4. **Storage** > Começar.
5. **Configurações do projeto > Os teus apps > Web (</>)** > copiar o `firebaseConfig` para `js/config.js`.
6. Passar o projeto para o plano **Blaze** (pagamento por uso). É necessário para a Cloud Function que vai buscar vagas; confirma os limites gratuitos no site do Firebase.

## 2. Publicar (precisas do Firebase CLI: computador ou Google Cloud Shell no navegador)
```
npm i -g firebase-tools && firebase login
firebase use --add            # escolhe o teu projeto
cd functions && npm i && cd ..
firebase deploy               # publica regras, funções e o site (Hosting)
```

## 3. Dados iniciais do curso e das fontes
```
cd tools && npm i firebase-admin
GOOGLE_CLOUD_PROJECT=<id-do-projeto> node seed.js
```
Cria 6 módulos, 31 aulas (títulos provisórios) e as fontes de vagas. Sem alunos ou vagas fictícias.

## 4. Criar o administrador e os alunos (manual, sem cadastro público)
Para **cada pessoa**, dois passos:
1. Authentication > Utilizadores > **Adicionar utilizador** (email + senha). Copia o **UID**.
2. Firestore > coleção `users` > **Adicionar documento** com ID = esse UID e os campos:
   `nome` (string), `email` (string), `status` (string: `active`, `inactive` ou `blocked`), `is_admin` (boolean: `false`; `true` só para ti), `avatar` (null), `data_criacao` (timestamp).
Para bloquear um aluno: mudar `status` para `blocked`.

## 5. Conteúdo
- **Vídeos:** Storage > enviar para `videos/…` e, em `lessons/{id}`, pôr o caminho em `video_url` (ex.: `videos/m1/aula1.mp4`). Também aceita um link https.
- **Capas:** enviar para `covers/…`, copiar o URL de download e colar em `capa` (módulo ou aula).
- **Vagas:** a função `syncOpportunities` corre às 06h e 18h (Luanda). Para a 1.ª vez, corre-a manualmente em Google Cloud > Cloud Scheduler > Forçar execução.
- **Adzuna (opcional):** criar `functions/.env` com `ADZUNA_APP_ID=` e `ADZUNA_APP_KEY=`, depois pôr `ativo: true` em `sources/adzuna` e voltar a fazer deploy.

## 6. Testar antes de lançar
- Login com aluno `active`, `inactive` e `blocked`.
- Abrir `/#/perfil` sem sessão: deve ir para o login.
- Com dois alunos: cada um só vê o seu progresso e as suas oportunidades guardadas.
- Publicar, comentar, reagir e apagar na comunidade.
- Ver um vídeo e voltar à aula: deve continuar do ponto onde parou.
- Pesquisa e filtros de Oportunidades; abrir uma vaga e o link da fonte original.

## Limitações conhecidas
- **Vídeos:** o link de download do Firebase Storage é permanente para quem o tiver; as regras só controlam quem o consegue pedir.
- **Pesquisa de vagas:** feita no telemóvel sobre as 400 mais recentes (o Firestore não tem pesquisa de texto).
- **Fotos antigas:** se um aluno mudar de foto, as publicações antigas mantêm a foto anterior.
