# Ideia — crmimpressao3d

Sistema pessoal de orçamentos e clientes para a oficina de impressão 3D, com um único usuário.
Next.js 16 (App Router, Server Actions) + Supabase (Postgres com RLS + Auth), deploy por Docker no Coolify.

A especificação está em [prompt-ideia.md](prompt-ideia.md) (decisões na seção 9) e a arquitetura em [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

Ordem para colocar no ar do zero:

1. [Criar o projeto no Supabase](#1-projeto-no-supabase)
2. [Aplicar as migrações](#2-migrações)
3. [Criar seu usuário e fechar o cadastro](#3-seu-usuário-e-cadastro-fechado)
4. [Publicar no Coolify](#4-deploy-no-coolify)
5. [Ajustar as URLs do Auth para o domínio](#5-depois-do-primeiro-deploy)

---

## 1. Projeto no Supabase

1. Em [supabase.com](https://supabase.com), **New project**. Escolha a organização, um nome (ex.: `crmimpressao3d`), uma senha forte para o banco (guarde num gerenciador de senhas) e a região **South America (São Paulo)**.
2. Quando o projeto terminar de criar, anote em **Project Settings → API Keys**:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **Publishable key** (`sb_publishable_...`). Se o projeto só tiver as chaves legadas, use a `anon` key.
3. Anote também o **Project ref** (Project Settings → General). É o trecho `<ref>` da URL.

O app só usa a URL e a publishable key. **Nunca** coloque a `service_role`/secret key no app nem em variáveis `NEXT_PUBLIC_*`: ela ignora o RLS.

## 2. Migrações

As migrações ficam em [supabase/migrations/](supabase/migrations/) e criam as tabelas, o RLS, os triggers e as funções. Elas devem ser aplicadas em ordem e nunca editadas depois de aplicadas: uma mudança no banco é sempre uma migração nova.

**Opção A — SQL Editor (sem instalar nada)**

```bash
node scripts/sql-editor.mjs                  # todas as migrações (projeto novo)
node scripts/sql-editor.mjs 20261023010000   # só as migrações a partir desta versão
```

O script grava `aplicar-banco.sql` (ignorado pelo git). No painel: **SQL Editor → New query**, cole o conteúdo e clique em **Run**. O SQL roda numa transação (aplica tudo ou nada), termina com "Banco do Ideia atualizado com sucesso" e registra as versões no histórico, para o CLI reconhecer depois.

Para saber o que já foi aplicado, rode no SQL Editor:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

**Opção B — CLI**

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF   # pede a senha do banco
npm run db:push
```

**Tipos do banco**: `npm run db:types` regenera [lib/database.types.ts](lib/database.types.ts). Ele precisa de `SUPABASE_ACCESS_TOKEN` (Account → Access Tokens) no ambiente, e o project ref está fixo no script `db:types` do [package.json](package.json): troque-o se usar outro projeto. O token dá acesso a **todos** os projetos da conta, então revogue-o quando terminar.

## 3. Seu usuário e cadastro fechado

O app não tem tela de cadastro: é só seu.

1. **Authentication → Users → Add user → Create new user**: seu e-mail e uma senha **longa e aleatória** (o login fica exposto na internet). Marque **Auto Confirm User**.
2. **Authentication → Sign In / Providers**: desligue **Allow new users to sign up** e deixe **Allow anonymous sign-ins** desligado. Sem isso, qualquer pessoa com a URL e a publishable key (que vão no bundle público) cria uma conta. O RLS não a deixaria ver seus dados, mas ela usaria o app e o seu banco.
3. Confira que o cadastro está fechado (deve responder `422 signup_disabled`):

   ```bash
   curl -X POST "https://<ref>.supabase.co/auth/v1/signup" \
     -H "apikey: <publishable key>" -H "Content-Type: application/json" \
     -d '{"email":"teste@example.com","password":"Teste-123456-xyz"}'
   ```

No primeiro login, o app cria os dados iniciais: a impressora Creality K1C, os filamentos PLA e ABS e o insumo Tinta. Depois, preencha a quantidade por embalagem da Tinta em **Cadastros**.

## 4. Deploy no Coolify

O Coolify constrói a imagem a partir do [Dockerfile](Dockerfile) do repositório e a publica atrás do proxy dele (Traefik), com HTTPS.

**Antes**: crie no DNS do seu domínio um registro **A** (ex.: `ideia.seudominio.com.br`) apontando para o IP do servidor do Coolify.

1. **Projects → (seu projeto) → + New → Resource**.
2. Escolha **Private Repository (with GitHub App)** e o GitHub App já instalado. Se for o primeiro, use **+ Add GitHub App** e dê acesso só ao repositório `crmimpressao3d`. Para repositório público, também serve **Public Repository** com a URL do GitHub.
3. Repositório **`crmimpressao3d`**, branch **`main`**.
4. **Build Pack: Dockerfile** (não Nixpacks). Base directory `/`, Dockerfile `/Dockerfile`.
5. Em **Configuration → General**:
   - **Name**: `crmimpressao3d`
   - **Domains**: `https://ideia.seudominio.com.br`. Com `https://`, o Coolify emite e renova o certificado Let's Encrypt sozinho.
   - **Ports Exposes**: `3000`
6. Em **Environment Variables**, adicione as duas e marque **Build Variable** em ambas (elas entram no bundle durante o build; mudar sem refazer o build não tem efeito):

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |

   Não adicione nenhuma outra chave do Supabase.
7. **Health Check**: o Dockerfile já tem `HEALTHCHECK` em `/api/health`. Se preferir configurar no Coolify, use path `/api/health`, porta `3000`.
8. **Deploy**. O build leva poucos minutos; acompanhe em **Deployments**. Quando terminar, `https://ideia.seudominio.com.br/api/health` deve responder `{"status":"ok"}` e a raiz deve levar ao login.
9. Com o GitHub App, cada push na `main` gera um deploy automático (**Configuration → Advanced → Auto Deploy**).

Opcional: limitar tentativas de login com um middleware de rate limit do Traefik nas rotas do app. O limite do próprio Supabase Auth enxerga o IP do servidor, e não o do visitante, porque o login sai do servidor.

## 5. Depois do primeiro deploy

1. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://ideia.seudominio.com.br`
   - **Redirect URLs**: `https://ideia.seudominio.com.br/**`

   Assim os e-mails do Auth (ex.: recuperação de senha) não apontam para `localhost`.
2. Supabase → **Advisors → Security Advisor**: rode e confira que não há alertas de RLS ou de funções.
3. Entre no app, confira **Configurações** e faça um orçamento de teste.
4. Revogue tokens de acesso que não forem mais usados (Account → Access Tokens).

**Backup**: em **Configurações → Exportar .xlsx**, uma aba por tabela. O Supabase também faz backups diários do banco no plano pago.

---

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # URL e publishable key do Supabase
npm run dev                  # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build de produção (`output: 'standalone'`) e servidor |
| `npm run lint` | ESLint |
| `npm run typecheck` | gera os tipos de rota e roda o `tsc` |
| `npm test` | Vitest: cálculo, regras e as migrações com RLS num Postgres em memória (PGlite) |
| `npx playwright test` | E2E no navegador (celular), ver abaixo |
| `npm run db:push` / `db:types` | aplica as migrações / gera os tipos |

**E2E (Playwright)**: roda contra o Supabase do `.env.local`, com dados reais. Ele precisa de `E2E_EMAIL` e `E2E_SENHA` no `.env.local`. O ideal é um usuário de teste separado, criado no painel (o RLS isola os dados dele). Os testes só criam registros com o prefixo `E2E ` e os apagam no fim. Se já houver um servidor na porta 3000, ele é reutilizado. Depois, apague `test-results/` e `e2e/.auth/`, que guardam a sessão.

**Docker local**:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
  -t crmimpressao3d .
docker run -p 3000:3000 crmimpressao3d
```

A imagem roda como usuário não-root, com os arquivos do app somente leitura, e não contém nenhum `.env`.

Ao fim de cada fase de desenvolvimento, use o skill `fechar-fase` (ver [CLAUDE.md](CLAUDE.md)).
