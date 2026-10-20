import Link from "next/link";
import { Formulario } from "@/components/formulario";
import { camposConfiguracoes, configuracoesSchema } from "@/lib/cadastros";
import type { Valores } from "@/lib/form";
import { requireUser } from "@/lib/supabase/server";
import { salvarConfiguracoes } from "./actions";

export default async function ConfiguracoesPage() {
  const { supabase } = await requireUser();
  const colunas = configuracoesSchema.keyof().options.join(",");
  const { data: config, error } = await supabase.from("configuracoes").select(colunas).maybeSingle<Valores>();

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted">
          Valores padrão dos orçamentos. Mudar aqui não altera orçamentos já salvos.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-panel p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Backup</p>
          <p className="text-sm text-muted">Planilha .xlsx com uma aba por tabela: cadastros, clientes e orçamentos.</p>
        </div>
        <a href="/api/exportar" className="rounded bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink">
          Exportar .xlsx
        </a>
        <Link href="/calibracao" className="rounded border border-line px-3.5 py-2 text-sm font-semibold">
          Relatório de calibração
        </Link>
      </div>

      {config ? (
        <Formulario grupos={camposConfiguracoes} valores={config} acao={salvarConfiguracoes} />
      ) : (
        <p className="rounded-xl border-l-4 border-warn bg-soft p-4 text-sm">
          {error
            ? "Não foi possível carregar as configurações."
            : "Suas configurações ainda não foram criadas. Saia e entre de novo para criá-las."}
        </p>
      )}
    </section>
  );
}
