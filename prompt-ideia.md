# Projeto Ideia — sistema de orçamentos e clientes para oficina de impressão 3D

Você vai construir o **Ideia**, um sistema web de uso pessoal (um único usuário: o dono da oficina) para calcular custo e preço de impressões 3D, salvar orçamentos e acompanhar clientes. Existe um protótipo funcional em HTML; este projeto é a versão definitiva, com banco próprio e deploy no servidor do usuário.

Trabalhe em fases. **Ao final de cada fase, pare, mostre o que foi feito e espere minha confirmação antes de seguir.** Toda a interface em português do Brasil, valores em R$ (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`), layout mobile-first (vou usar muito no celular).

---

## 1. Stack (decidido, não substituir)

- **Next.js** (versão estável atual, App Router, TypeScript estrito), front e back no mesmo projeto. Use Server Components para leitura e **Server Actions** para escrita. Sem API REST separada, sem GraphQL.
- **Supabase Cloud** (Postgres + Auth). Cliente via `@supabase/ssr`, com middleware para renovar a sessão.
- **Autenticação:** e-mail e senha, um único usuário. Nenhuma tela pública de cadastro. Eu crio minha conta pelo painel do Supabase e desativo novos cadastros (Authentication → Sign In / Providers → desligar "Allow new users to sign up"). Me lembre disso no README.
- **Estilo:** Tailwind CSS. Componentes simples, sem biblioteca pesada. Pode usar shadcn/ui se ajudar.
- **Validação:** Zod em todas as Server Actions.
- **Testes:** Vitest para a lógica de cálculo; Playwright só para o fluxo principal (login → orçamento → salvar).
- **Deploy:** **Coolify** (servidor próprio), a partir de repositório no GitHub, com `Dockerfile` e `output: 'standalone'` no `next.config`. **Não use Railway, Vercel ou qualquer outra plataforma.**
- **Repositório:** `crmimpressao3d` no GitHub (privado). Nome do pacote no `package.json`: `crmimpressao3d`. Se o diretório ainda não for um repositório git ligado a ele, me peça a URL do remote antes do primeiro push.
- **Migrações:** Supabase CLI (`supabase/migrations/*.sql`), versionadas no repositório.

## 2. Modelo de dados

Todas as tabelas têm `id uuid primary key default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `created_at` e `updated_at timestamptz` (trigger para `updated_at`). **RLS ligado em todas**, com políticas de select/insert/update/delete usando `(select auth.uid()) = user_id`. Índice em `user_id` em todas. Valores monetários em `numeric(12,2)`; custos unitários pequenos (insumos) em `numeric(12,4)`.

- **configuracoes** (uma linha por usuário, `unique(user_id)`): tarifa_kwh, desperdicio_pct, taxa_falha_pct, valor_hora, preparo_min, acabamento_min_peca, embalagem_pedido, margem_pct, taxa_pagamento_pct, pedido_minimo, retorno_ativo (bool), retorno_meses, retorno_horas_mes, validade_orcamento_dias (padrão 7), followup_dias (padrão 7).
- **clientes**: nome (obrigatório), telefone, email, cidade, observacoes.
- **filamentos**: nome, tipo (PLA, PLA Silk, PLA-CF, PETG, ABS, ASA, TPU, Tritan, Wood, Outro), marca, cor (hex), preco_rolo, frete, peso_rolo_g (padrão 1000), ativo (bool). Preço por kg derivado: `(preco_rolo + frete) / (peso_rolo_g / 1000)`.
- **impressoras**: nome, preco, vida_util_h, consumo_w, manutencao_h, ativo.
- **insumos**: nome, unidade (un, ml, g, cm, folha), preco_pago, qtd_embalagem, ativo. Custo por unidade: `preco_pago / qtd_embalagem`.
- **orcamentos**:
  - Referências: cliente_id (nullable, `on delete set null`), filamento_id, impressora_id.
  - Descrição: peca, quantidade, pecas_por_mesa, gramas_por_mesa, horas_por_mesa, pintado (bool).
  - `parametros jsonb`: **snapshot de todos os valores usados no cálculo** (preço/kg, consumo, tarifa, margens, linhas de insumo com custo unitário da época etc.). O orçamento salvo nunca muda se o cadastro mudar depois.
  - Resultado congelado: custo_total, preco, lucro, `detalhamento jsonb` com cada componente do custo.
  - status: enum `enviado | aprovado | recusado | entregue`, padrão `enviado`; status_alterado_em.
  - Dados reais na entrega (nullable): horas_reais, gramas_reais, houve_falha (bool), observacao_entrega.
- **orcamento_insumos**: orcamento_id (`on delete cascade`), insumo_id (nullable, `on delete set null`), nome_snapshot, unidade, custo_unitario_snapshot, quantidade, base (`peca | pedido`).

Ao criar o usuário, uma trigger ou o primeiro acesso cria a linha de `configuracoes` com os valores padrão da seção 3.

## 3. Regra de cálculo (implementar exatamente assim)

Coloque em `lib/calculo.ts` como **função pura**, sem acesso a banco, usada tanto no cliente (atualização ao vivo) quanto no servidor (valor gravado). O servidor **sempre recalcula** antes de salvar; nunca confie no preço enviado pelo navegador.

```
mesas        = ceil(quantidade / pecas_por_mesa)
gramas       = gramas_por_mesa × mesas × (1 + desperdicio%)
horas        = horas_por_mesa × mesas
material     = gramas / 1000 × preco_kg
energia      = horas × consumo_w / 1000 × tarifa_kwh
deprec_h     = preco_impressora / vida_util_h
depreciacao  = horas × deprec_h
manutencao   = horas × manutencao_h
falhas       = (material + energia + depreciacao + manutencao) × taxa_falha%
mao_de_obra  = (preparo_min + acabamento_min_peca × quantidade) / 60 × valor_hora
insumos      = Σ custo_unit × qtd × (base = 'peca' ? quantidade : 1) + extras avulsos + embalagem_pedido
pintura      = pintado ? (insumos_pintura_peca × quantidade + pintura_min_peca × quantidade / 60 × valor_hora) : 0
custo_total  = material + energia + depreciacao + manutencao + falhas + mao_de_obra + insumos + pintura

meta_h       = retorno_ativo ? preco_impressora / (retorno_meses × retorno_horas_mes) : 0
retorno      = max(0, meta_h − deprec_h) × horas        // entra no preço, NÃO no custo, e NÃO recebe margem
preco        = max( (custo_total × (1 + margem%) + retorno) / (1 − taxa_pagamento%), pedido_minimo )
lucro        = preco × (1 − taxa_pagamento%) − custo_total
```

**Testes obrigatórios (Vitest)**, valores arredondados a 2 casas:

| Caso | Entradas | Esperado |
|---|---|---|
| A — padrão | qtd 3, 2 por mesa, 48 g/mesa, 3,5 h/mesa, R$ 110/kg, desperdício 5%, 120 W, R$ 1,05/kWh, impressora R$ 3.200 / 6.000 h, manutenção R$ 0,40/h, falha 8%, R$ 40/h, preparo 20 min, acabamento 5 min/peça, embalagem R$ 3, margem 80%, taxa 0%, mínimo R$ 30 | mesas 2 · gramas 100,80 · material 11,09 · energia 0,88 · depreciação 3,73 · manutenção 2,80 · falhas 1,48 · mão de obra 23,33 · **custo 46,32 · preço 83,37 · lucro 37,05** |
| B — pintura + retorno + taxa | caso A + pintura (R$ 12/peça, 15 min/peça) + retorno (12 meses, 160 h/mês) + taxa 5% | pintura 66,00 · **custo 112,32 · retorno 7,93 · preço 221,16 · lucro 97,79** |
| C — pedido mínimo | qtd 1, 1 por mesa, 5 g, 0,5 h, preparo 5 min, acabamento 0, embalagem 0, demais como A | **custo 4,53 · preço 30,00 (mínimo aplicado) · lucro 25,47** |

## 4. Telas

Navegação: barra inferior no celular, lateral no desktop.

1. **Orçamento (tela inicial)**: formulário em seções (Trabalho, Material, Máquina, Mão de obra, Insumos do pedido, Pintura, Retorno da máquina, Preço) e um painel de resultado fixo (sticky no desktop, ao final no celular) com:
   - preço total e por peça;
   - barra empilhada com a composição do custo e tabela com valor e % de cada componente;
   - lucro líquido, margem real e "seu R$/hora" (mão de obra + lucro ÷ horas trabalhadas);
   - avisos: "pedido mínimo aplicado" e "mão de obra > 3× o filamento".
   - Selecionar impressora e filamento preenche os campos, que podem ser ajustados só para aquele orçamento. Insumos entram como linhas (insumo + quantidade + por peça/por pedido).
   - Botões: **Salvar orçamento** (ou **Atualizar**, se aberto do histórico), **Novo orçamento** e **Copiar texto** para o WhatsApp. Texto do orçamento:
     ```
     *Orçamento — {peça}*
     Cliente: {nome}
     Material: {filamento}
     Acabamento: pintado | sem pintura
     Quantidade: {n} peça(s)
     Tempo de produção: ~{horas arredondadas para cima} h de impressão

     Valor por peça: R$ …
     *Total: R$ …*

     Orçamento válido por {validade} dias.
     ```
2. **Histórico**: lista de orçamentos com filtros (status, cliente, busca por peça/material) e indicadores do filtro atual: quantidade, taxa de aprovação (aprovados + entregues ÷ todos exceto enviados), valor fechado, lucro estimado. Status editável direto na lista.
   - **Follow-up:** orçamentos "enviados" há mais de `followup_dias` aparecem destacados, com ações rápidas "Marcar recusado" e "Abrir WhatsApp".
   - Ao marcar **entregue**, abre um formulário curto para horas reais, gramas reais e "houve falha?".
3. **Clientes**: CRUD com busca. Cada cliente mostra quantidade de orçamentos, quantos fechou e valor total, além de link `https://wa.me/55{dígitos}` quando o telefone tem DDD. Página do cliente com o histórico dele.
4. **Cadastros**: abas Filamentos, Impressoras e Insumos, cada uma com CRUD. Itens usados em orçamentos são **desativados**, não apagados.
5. **Configurações**: os parâmetros da oficina (tabela `configuracoes`).
6. **Relatório de calibração**: comparação estimado × real dos orçamentos entregues (média de desvio de horas e gramas e taxa de falha real), com sugestão de ajuste da taxa de falha. É isso que vai calibrar meus preços.
7. **Exportar**: botão em Configurações que gera um `.xlsx` com uma aba por tabela (use `exceljs`). É o meu backup.

## 5. Dados iniciais

Script `supabase/seed.sql` (ou uma action de primeiro acesso) com:
- Impressora **Creality K1C**: R$ 3.000, vida útil 6.000 h, 120 W, R$ 0,40/h.
- Filamentos **PLA** (rolo R$ 110, 1.000 g) e **ABS** (rolo R$ 90, 1.000 g).
- Insumo **Tinta (frasco)**: R$ 6, unidade ml. Deixe a quantidade por embalagem em branco para eu preencher.

## 6. Segurança (o security-auditor deve revisar antes do deploy)

- RLS testado: um segundo usuário de teste não pode ler nem alterar nada do primeiro.
- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o cliente nem para variáveis `NEXT_PUBLIC_*`. Se não for necessária, não use.
- Toda Server Action valida a sessão e a entrada com Zod.
- Cabeçalhos de segurança básicos no `next.config`.

## 7. Deploy no Coolify

- `Dockerfile` multi-stage (deps → build → runner com `node:<lts>-alpine`, usuário não-root, `output: 'standalone'`, porta 3000, `HEALTHCHECK` em `/api/health`).
- `.env.example` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou a publishable key atual do Supabase).
- `README.md` em português com: criação do projeto no Supabase, como rodar as migrações, criação do meu usuário e desativação de novos cadastros, e passo a passo no Coolify (novo recurso a partir do repositório GitHub `crmimpressao3d`, nome do app no Coolify `crmimpressao3d`, build pack Dockerfile, variáveis de ambiente, domínio e HTTPS).

## 8. Fases

1. **Fundação**: projeto Next.js, Tailwind, cliente Supabase, middleware, login, layout e navegação, `Dockerfile`, `/api/health`. → parar e mostrar.
2. **Banco**: migrações, RLS, triggers, seed, tipos TypeScript gerados (`supabase gen types`). → parar.
3. **Cálculo**: `lib/calculo.ts` + testes da seção 3 passando. → parar.
4. **Cadastros e configurações**. → parar.
5. **Orçamento e histórico** (inclui follow-up e registro da entrega). → parar.
6. **Clientes, relatório de calibração e exportação .xlsx**. → parar.
7. **Revisão de segurança, teste E2E, README e deploy**. → parar.

Use os agentes instalados onde fizer sentido (database-architect na fase 2, test-engineer na 3, security-auditor e code-reviewer na 7), mas **não delegue por delegar**: tarefas pequenas, faça direto. Commits pequenos e descritivos em português a cada etapa concluída.

Se algo nesta especificação estiver errado ou for uma má ideia técnica, diga antes de implementar, em vez de seguir cegamente.

---

## 9. Decisões tomadas na revisão da spec (2026-10-19)

1. **Pintura:** `configuracoes` ganha `pintura_insumos_peca` (R$ por peça, `numeric(12,2)`, padrão 0) e `pintura_min_peca` (padrão 0). São preenchidos no orçamento, ajustáveis, e congelados em `parametros`. O insumo "Tinta" pode ser usado como linha de insumo **ou** embutido em `pintura_insumos_peca`, nunca nos dois (a tela avisa).
2. **Extras avulsos:** campo único `extras_peca` (R$ **por peça**, como no protótipo `Ideia.html`), congelado em `parametros`.
3. **Seu R$/hora:** horas trabalhadas = `(preparo_min + acabamento_min_peca × qtd + (pintado ? pintura_min_peca × qtd : 0)) / 60`. Sem horas de impressão. Numerador: mão de obra + mão de obra da pintura + lucro (o tempo de pintura está no denominador, então o valor dele também entra no numerador).
4. **Seed:** `configuracoes` criada por trigger em `auth.users`; dados iniciais (K1C, PLA, ABS, Tinta) criados por action de primeiro acesso, não por `seed.sql`.
5. **insumos.qtd_embalagem** é nullable; insumo sem quantidade não pode entrar em orçamento.
6. **FKs de orcamentos** para filamento/impressora: `on delete restrict`.
7. **Zod:** `taxa_pagamento_pct < 100`, `quantidade ≥ 1`, `pecas_por_mesa ≥ 1`.
8. **Arredondamento:** cálculo em precisão total; arredonda a 2 casas só ao gravar/exibir.
9. **Next.js 16:** renovação de sessão em `proxy.ts` (antigo `middleware.ts`).
10. **Docker/Coolify:** `NEXT_PUBLIC_*` entram como `ARG` de build; no Coolify, marcar como build variable.
11. **Agentes e skills:** definidos em `.claude/agents/` (database-architect, test-engineer, security-auditor, code-reviewer) e `.claude/skills/fechar-fase/` (checklist de fim de fase). Mapa do código com o skill **cartographer** ao fim de cada fase.
12. **`parametros` é a fonte do recálculo:** guarda todas as entradas em precisão total, inclusive `extras_peca`, `pintura_insumos_peca` e `pintura_min_peca`, que não têm coluna própria. As colunas de descrição do orçamento servem para listar e filtrar. "Atualizar" um orçamento recalcula a partir das entradas do formulário, nunca das colunas arredondadas.
13. **`configuracoes` protegida:** o usuário só faz `update` nas colunas de parâmetros. Insert e delete não são permitidos (a linha nasce pelo trigger), e `dados_iniciais_criados` não pode ser alterado. `criar_dados_iniciais()` é `security definer` e grava `user_id = auth.uid()`.
14. **Tipos:** `lib/database.types.ts` é gerado (`npm run db:types`); valores de domínio (`TIPOS_FILAMENTO`, `UNIDADES_INSUMO`, `BASES_INSUMO`, `STATUS_ORCAMENTO`) ficam em `lib/dominio.ts`.
15. **Testes de banco:** `tests/db/` aplica as migrações num Postgres 17 em memória (PGlite) com um stub do schema `auth` e testa RLS com dois usuários.
16. **Margem real** = lucro ÷ preço (como no protótipo): quanto do que o cliente paga fica com você. A margem configurada é sobre o custo (markup), então os dois números são diferentes (caso A: 80% configurado → 44% real).
17. **Números digitados:** vírgula é decimal; ponto em grupos de 3 ("1.000", "3.200") é milhar; demais pontos são decimais. Casas decimais acima do que a coluna guarda são recusadas, não arredondadas.
18. **Protótipo `Ideia.html`** é a referência visual e de comportamento: identidade (Archivo + IBM Plex Mono, paleta verde-petróleo, modo escuro), excluir com dois toques, filamento genérico e impressora manual no orçamento.
19. **Linhas de insumo do orçamento** guardam nome, unidade e custo unitário do momento em que foram adicionadas (snapshot), como os demais valores ajustáveis do editor; o servidor valida mas não busca o custo de novo. Somar um insumo repetido passa a usar o custo atual.
20. **Banco aplicado por token:** migrações podem ser aplicadas pela Management API com `SUPABASE_ACCESS_TOKEN` no `.env.local` (ou pelo SQL Editor com `node scripts/sql-editor.mjs <versão>`). `lib/database.types.ts` agora é gerado de verdade (`npm run db:types`).
21. **Entrega:** campos de horas/gramas reais começam em branco (o estimado aparece como dica) para não enviesar a calibração; a entrega pode ser editada depois.
