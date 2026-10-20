import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { como, criarBanco, criarUsuario } from "./supabase-stub";

const ANA = "00000000-0000-0000-0000-00000000000a";
const BETO = "00000000-0000-0000-0000-00000000000b";

let db: PGlite;
let filamentoAna: string;
let insumoAna: string;

const dados = (extra: Record<string, unknown> = {}) => ({
  peca: "Vaso",
  quantidade: 3,
  pecas_por_mesa: 2,
  gramas_por_mesa: 48,
  horas_por_mesa: 3.5,
  pintado: false,
  material: "PLA",
  impressora_nome: "Manual",
  parametros: { versao: 1 },
  custo_total: 46.32,
  preco: 83.37,
  lucro: 37.05,
  detalhamento: {},
  ...extra,
});

const linha = (extra: Record<string, unknown> = {}) => ({
  nome_snapshot: "Tinta",
  unidade: "ml",
  custo_unitario_snapshot: 0.06,
  quantidade: 5,
  base: "peca",
  ...extra,
});

async function salvar(id: string | null, d: object, insumos: object[]) {
  const { rows } = await db.query<{ id: string }>("select public.salvar_orcamento($1, $2, $3) as id", [
    id,
    JSON.stringify(d),
    JSON.stringify(insumos),
  ]);
  return rows[0].id;
}

async function linhasDe(id: string) {
  const { rows } = await db.query<{ nome_snapshot: string; insumo_id: string | null }>(
    "select nome_snapshot, insumo_id from public.orcamento_insumos where orcamento_id = $1 order by nome_snapshot",
    [id],
  );
  return rows;
}

beforeAll(async () => {
  db = await criarBanco();
  await criarUsuario(db, ANA);
  await criarUsuario(db, BETO);
  await como(db, ANA, async () => {
    await db.query("select public.criar_dados_iniciais()");
    filamentoAna = (await db.query<{ id: string }>("select id from public.filamentos limit 1")).rows[0].id;
    insumoAna = (await db.query<{ id: string }>("select id from public.insumos limit 1")).rows[0].id;
  });
}, 60_000);

describe("salvar_orcamento", () => {
  it("cria orçamento manual (sem impressora nem filamento cadastrados) com linhas", async () => {
    await como(db, ANA, async () => {
      const id = await salvar(null, dados(), [linha({ insumo_id: insumoAna }), linha({ nome_snapshot: "Ímã" })]);
      const { rows } = await db.query<{ status: string; filamento_id: string | null; user_id: string }>(
        "select status, filamento_id, user_id from public.orcamentos where id = $1",
        [id],
      );
      expect(rows).toEqual([{ status: "enviado", filamento_id: null, user_id: ANA }]);
      expect(await linhasDe(id)).toEqual([
        { nome_snapshot: "Tinta", insumo_id: insumoAna },
        { nome_snapshot: "Ímã", insumo_id: null },
      ]);
    });
  });

  it("atualizar substitui as linhas e mantém status e data de criação", async () => {
    await como(db, ANA, async () => {
      const id = await salvar(null, dados({ filamento_id: filamentoAna }), [linha(), linha({ nome_snapshot: "B" })]);
      await db.query("update public.orcamentos set status = 'aprovado' where id = $1", [id]);
      const antes = (await db.query<{ created_at: string }>("select created_at from public.orcamentos where id = $1", [id]))
        .rows[0].created_at;

      expect(await salvar(id, dados({ peca: "Vaso grande", preco: 100 }), [linha({ nome_snapshot: "C" })])).toBe(id);

      const { rows } = await db.query<{ peca: string; preco: string; status: string; created_at: string; filamento_id: string | null }>(
        "select peca, preco, status, created_at, filamento_id from public.orcamentos where id = $1",
        [id],
      );
      expect(rows[0]).toMatchObject({ peca: "Vaso grande", preco: "100.00", status: "aprovado", filamento_id: null });
      expect(rows[0].created_at).toEqual(antes);
      expect(await linhasDe(id)).toEqual([{ nome_snapshot: "C", insumo_id: null }]);
    });
  });

  it("é atômico: uma linha inválida desfaz o orçamento inteiro", async () => {
    const antes = await como(db, ANA, async () =>
      (await db.query<{ n: number }>("select count(*)::int n from public.orcamentos")).rows[0].n,
    );
    await expect(
      como(db, ANA, () => salvar(null, dados(), [linha(), linha({ quantidade: 0 })])),
    ).rejects.toThrow(/check constraint/);
    const depois = await como(db, ANA, async () =>
      (await db.query<{ n: number }>("select count(*)::int n from public.orcamentos")).rows[0].n,
    );
    expect(depois).toBe(antes);
  });

  it("Beto não atualiza orçamento da Ana nem usa cadastros dela", async () => {
    const idAna = await como(db, ANA, () => salvar(null, dados(), []));
    await expect(como(db, BETO, () => salvar(idAna, dados({ peca: "invasão" }), []))).rejects.toThrow(
      /não encontrado/,
    );
    await expect(
      como(db, BETO, () => salvar(null, dados({ filamento_id: filamentoAna }), [])),
    ).rejects.toThrow(/foreign key/);
    await expect(
      como(db, BETO, () => salvar(null, dados(), [linha({ insumo_id: insumoAna })])),
    ).rejects.toThrow(/foreign key/);
    const { rows } = await como(db, ANA, () =>
      db.query<{ peca: string }>("select peca from public.orcamentos where id = $1", [idAna]),
    );
    expect(rows[0].peca).toBe("Vaso");
  });

  it("anon não executa", async () => {
    await expect(como(db, null, () => salvar(null, dados(), []))).rejects.toThrow(/permission denied/);
  });

  it("filamento usado em orçamento não pode ser apagado (restrict continua valendo)", async () => {
    await como(db, ANA, () => salvar(null, dados({ filamento_id: filamentoAna }), []));
    await expect(
      como(db, ANA, () => db.query("delete from public.filamentos where id = $1", [filamentoAna])),
    ).rejects.toThrow(/foreign key/);
  });
});
