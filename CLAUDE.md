@AGENTS.md

## Visão geral do código

**Ideia** (crmimpressao3d) é um sistema pessoal, com um único usuário, de orçamentos e clientes para uma oficina de impressão 3D. A interface é em pt-BR, mobile-first, com valores em R$. O desenvolvimento segue em fases: ao fim de cada uma, use o skill `fechar-fase`.

**Stack**: Next.js 16 (App Router, Server Actions, `proxy.ts`), Supabase (`@supabase/ssr`, Postgres com RLS), Tailwind v4, Zod 4. Deploy por Docker no Coolify.
**Estrutura**: `app/` (rotas; `(app)/` é a área autenticada), `lib/supabase/` (clientes e sessão), `components/`, `.claude/` (agentes e skills).

Especificação: [prompt-ideia.md](prompt-ideia.md). As decisões estão na seção 9.
Arquitetura detalhada: [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).
