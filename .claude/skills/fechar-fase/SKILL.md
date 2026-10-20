---
name: fechar-fase
description: Checklist de encerramento de uma fase do projeto Ideia — valida build/lint/testes, atualiza o mapa do código, faz commit em português e para para mostrar o resultado ao usuário. Use ao terminar qualquer fase da seção 8 do prompt-ideia.md.
---

# Fechar uma fase

Siga em ordem. Se algum passo falhar, pare e reporte a falha com a saída real.

1. **Validar**
   - `npm run lint`
   - `npm run typecheck`
   - `npm test` (a partir da fase 3)
   - `npm run build` com variáveis fictícias:
     `NEXT_PUBLIC_SUPABASE_URL=https://exemplo.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_teste npm run build`
2. **Revisar** com o agente `code-reviewer` quando a fase tiver mais do que algumas dezenas de linhas novas. Corrija o que for bug antes de seguir.
3. **Mapear** com o skill `cartographer` para criar ou atualizar `docs/CODEBASE_MAP.md`.
4. **Commit**: commits pequenos e descritivos em português, um por etapa lógica. Nunca faça push sem o usuário pedir.
5. **Parar e mostrar**: resumo curto do que foi feito, como testar, pendências e o que o usuário precisa fazer (por exemplo, criar o projeto no Supabase). Espere a confirmação antes de começar a próxima fase.
