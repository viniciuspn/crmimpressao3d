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
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-zinc-500">
          Valores padrão dos orçamentos. Mudar aqui não altera orçamentos já salvos.
        </p>
      </div>

      {config ? (
        <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:p-6">
          <Formulario grupos={camposConfiguracoes} valores={config} acao={salvarConfiguracoes} />
        </div>
      ) : (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {error
            ? "Não foi possível carregar as configurações."
            : "Suas configurações ainda não foram criadas. Saia e entre de novo para criá-las."}
        </p>
      )}
    </section>
  );
}
