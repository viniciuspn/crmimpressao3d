// O PostgREST devolve no máximo 1000 linhas por consulta. Para totais e backup, busca em páginas.
export const PAGINA = 1000;

type Pagina<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** Busca todas as páginas. `buscar(de, ate)` deve aplicar `.range(de, ate)` com ordenação estável. */
export async function todasAsPaginas<T>(buscar: (de: number, ate: number) => Pagina<T>): Promise<{ dados: T[]; erro: boolean }> {
  const dados: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await buscar(de, de + PAGINA - 1);
    if (error || !data) return { dados, erro: true };
    dados.push(...data);
    if (data.length < PAGINA) return { dados, erro: false };
  }
}
