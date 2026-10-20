# Ideia — crmimpressao3d

Sistema pessoal de orçamentos e clientes para a oficina de impressão 3D.
Next.js 16 (App Router) + Supabase (Postgres + Auth), deploy no Coolify.

> Guia completo (Supabase, migrações, Coolify) chega na fase 7. A especificação está em [prompt-ideia.md](prompt-ideia.md).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a publishable key do Supabase
npm run dev
```

Abra http://localhost:3000.

## Usuário único

Não existe tela de cadastro. Crie sua conta pelo painel do Supabase
(**Authentication → Users → Add user**) e **desative novos cadastros** em
**Authentication → Sign In / Providers → "Allow new users to sign up"**.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (`output: 'standalone'`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | gera os tipos de rota e roda o `tsc` |

## Docker

As variáveis `NEXT_PUBLIC_*` entram no bundle durante o build, então são passadas como build args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  -t crmimpressao3d .
docker run -p 3000:3000 crmimpressao3d
```

No Coolify, marque essas duas variáveis como **Build Variable**. Health check: `GET /api/health`.
