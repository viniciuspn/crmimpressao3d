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
