import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { como, criarBanco, criarUsuario } from "./supabase-stub";

const ANA = "00000000-0000-0000-0000-00000000000a";
const BETO = "00000000-0000-0000-0000-00000000000b";

const TABELAS = [
  "configuracoes",
  "clientes",
  "filamentos",
  "impressoras",
  "insumos",
  "orcamentos",
  "orcamento_insumos",
];

// Coluna que o dono pode alterar em cada tabela (configuracoes só aceita update nos parâmetros).
const COLUNA_EDITAVEL: Record<string, string> = { configuracoes: "valor_hora" };

// Os testes deste arquivo compartilham o banco e rodam em ordem (padrão do Vitest dentro de um arquivo):
// "integridade" apaga dados da Ana, e o último teste apaga a Ana. Não reordene sem ajustar.
let db: PGlite;

async function contar(tabela: string) {
  const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.${tabela}`);
  return rows[0].n;
}

/** Cria um orçamento completo para o usuário logado e devolve os ids. */
async function criarOrcamento() {
  const cliente = await db.query<{ id: string }>(
    "insert into public.clientes (nome, telefone) values ('Cliente', '11999990000') returning id",
  );
  const filamento = await db.query<{ id: string }>("select id from public.filamentos order by nome limit 1");
  const impressora = await db.query<{ id: string }>("select id from public.impressoras limit 1");
  const insumo = await db.query<{ id: string }>("select id from public.insumos limit 1");

  const orc = await db.query<{ id: string }>(
    `insert into public.orcamentos
       (cliente_id, filamento_id, impressora_id, peca, quantidade, pecas_por_mesa,
        gramas_por_mesa, horas_por_mesa, parametros, custo_total, preco, lucro, detalhamento)
     values ($1, $2, $3, 'Vaso', 3, 2, 48, 3.5, '{}', 46.32, 83.37, 37.05, '{}')
     returning id`,
    [cliente.rows[0].id, filamento.rows[0].id, impressora.rows[0].id],
  );
  await db.query(
    `insert into public.orcamento_insumos
       (orcamento_id, insumo_id, nome_snapshot, unidade, custo_unitario_snapshot, quantidade, base)
     values ($1, $2, 'Tinta (frasco)', 'ml', 0.2, 5, 'peca')`,
    [orc.rows[0].id, insumo.rows[0].id],
  );
  return {
    orcamento: orc.rows[0].id,
    cliente: cliente.rows[0].id,
    filamento: filamento.rows[0].id,
    impressora: impressora.rows[0].id,
    insumo: insumo.rows[0].id,
  };
}

let idsAna: Awaited<ReturnType<typeof criarOrcamento>>;

beforeAll(async () => {
  db = await criarBanco();
  await criarUsuario(db, ANA);
  await criarUsuario(db, BETO);
  idsAna = await como(db, ANA, async () => {
    await db.query("select public.criar_dados_iniciais()");
    return criarOrcamento();
  });
}, 60_000);

describe("configurações e dados iniciais", () => {
  it("cria a linha de configurações com os padrões ao criar o usuário", async () => {
    const { rows } = await como(db, BETO, () =>
      db.query<{ validade_orcamento_dias: number; followup_dias: number; margem_pct: string }>(
        "select validade_orcamento_dias, followup_dias, margem_pct from public.configuracoes",
      ),
    );
    expect(rows).toEqual([{ validade_orcamento_dias: 7, followup_dias: 7, margem_pct: "80.00" }]);
  });

  it("cria K1C, PLA, ABS e Tinta uma única vez", async () => {
    const segunda = await como(db, ANA, () =>
      db.query<{ r: boolean }>("select public.criar_dados_iniciais() as r"),
    );
    expect(segunda.rows[0].r).toBe(false);

    const nomes = await como(db, ANA, async () => ({
      impressoras: (await db.query<{ nome: string }>("select nome from public.impressoras")).rows,
      filamentos: (await db.query<{ nome: string }>("select nome from public.filamentos order by nome")).rows,
      insumos: (await db.query<{ nome: string; qtd_embalagem: string | null }>(
        "select nome, qtd_embalagem from public.insumos",
      )).rows,
    }));
    expect(nomes.impressoras).toEqual([{ nome: "Creality K1C" }]);
    expect(nomes.filamentos).toEqual([{ nome: "ABS" }, { nome: "PLA" }]);
    expect(nomes.insumos).toEqual([{ nome: "Tinta (frasco)", qtd_embalagem: null }]);
  });

  it("anon não consegue criar dados iniciais", async () => {
    await expect(como(db, null, () => db.query("select public.criar_dados_iniciais()"))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("RLS: um usuário não vê nem altera dados de outro", () => {
  it.each(TABELAS)("%s: Beto não lê nada da Ana", async (tabela) => {
    const n = await como(db, BETO, async () => {
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from public.${tabela} where user_id = $1`,
        [ANA],
      );
      return rows[0].n;
    });
    expect(n).toBe(0);
  });

  it.each(TABELAS)("%s: Beto não altera nem apaga nada da Ana", async (tabela) => {
    await como(db, BETO, async () => {
      const col = COLUNA_EDITAVEL[tabela] ?? "updated_at";
      const upd = await db.query(`update public.${tabela} set ${col} = ${col} where user_id = $1`, [ANA]);
      expect(upd.affectedRows).toBe(0);
      // configuracoes não aceita delete de ninguém (testado em "integridade")
      if (tabela !== "configuracoes") {
        const del = await db.query(`delete from public.${tabela} where user_id = $1`, [ANA]);
        expect(del.affectedRows).toBe(0);
      }
    });
    const n = await como(db, ANA, () => contar(tabela));
    expect(n).toBeGreaterThan(0);
  });

  it("Beto não insere linhas em nome da Ana", async () => {
    await expect(
      como(db, BETO, () => db.query("insert into public.clientes (user_id, nome) values ($1, 'x')", [ANA])),
    ).rejects.toThrow(/row-level security/);
  });

  it("Beto não cria orçamento apontando para cadastros da Ana", async () => {
    await expect(
      como(db, BETO, () =>
        db.query(
          `insert into public.orcamentos
             (filamento_id, impressora_id, peca, quantidade, pecas_por_mesa, gramas_por_mesa,
              horas_por_mesa, parametros, custo_total, preco, lucro, detalhamento)
           values ($1, $2, 'x', 1, 1, 1, 1, '{}', 1, 1, 0, '{}')`,
          [idsAna.filamento, idsAna.impressora],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("Beto não cria linha de insumo em orçamento ou insumo da Ana", async () => {
    await expect(
      como(db, BETO, () =>
        db.query(
          `insert into public.orcamento_insumos
             (orcamento_id, nome_snapshot, unidade, custo_unitario_snapshot, quantidade, base)
           values ($1, 'x', 'un', 1, 1, 'pedido')`,
          [idsAna.orcamento],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("Beto não aponta orçamento próprio para cadastro da Ana nem troca o dono", async () => {
    await como(db, BETO, async () => {
      await db.query("select public.criar_dados_iniciais()");
    });
    await expect(
      como(db, BETO, async () => {
        const proprio = await criarOrcamento();
        await db.query("update public.orcamentos set filamento_id = $1 where id = $2", [
          idsAna.filamento,
          proprio.orcamento,
        ]);
      }),
    ).rejects.toThrow(/foreign key/);
    await expect(
      como(db, BETO, async () => {
        const { rows } = await db.query<{ id: string }>(
          "insert into public.clientes (nome) values ('Do Beto') returning id",
        );
        await db.query("update public.clientes set user_id = $1 where id = $2", [ANA, rows[0].id]);
      }),
    ).rejects.toThrow(/row-level security/);
  });

  it("anon não lê nada", async () => {
    for (const tabela of TABELAS.filter((t) => t !== "configuracoes")) {
      expect(await como(db, null, () => contar(tabela))).toBe(0);
    }
    // configuracoes não tem nem o grant de select para anon.
    await expect(como(db, null, () => contar("configuracoes"))).rejects.toThrow(/permission denied/);
  });
});

describe("integridade", () => {
  it("apagar cliente mantém o orçamento, sem cliente", async () => {
    await como(db, ANA, async () => {
      await db.query("delete from public.clientes where id = $1", [idsAna.cliente]);
      const { rows } = await db.query<{ cliente_id: string | null; user_id: string }>(
        "select cliente_id, user_id from public.orcamentos where id = $1",
        [idsAna.orcamento],
      );
      expect(rows).toEqual([{ cliente_id: null, user_id: ANA }]);
    });
  });

  it("não deixa apagar filamento usado em orçamento", async () => {
    await expect(
      como(db, ANA, () => db.query("delete from public.filamentos where id = $1", [idsAna.filamento])),
    ).rejects.toThrow(/foreign key/);
  });

  it("apagar insumo mantém a linha do orçamento com o snapshot", async () => {
    await como(db, ANA, async () => {
      await db.query("delete from public.insumos where id = $1", [idsAna.insumo]);
      const { rows } = await db.query<{ insumo_id: string | null; nome_snapshot: string }>(
        "select insumo_id, nome_snapshot from public.orcamento_insumos where orcamento_id = $1",
        [idsAna.orcamento],
      );
      expect(rows).toEqual([{ insumo_id: null, nome_snapshot: "Tinta (frasco)" }]);
    });
  });

  it("mudar o status atualiza status_alterado_em", async () => {
    await como(db, ANA, async () => {
      await db.query(
        "update public.orcamentos set status_alterado_em = '2000-01-01' where id = $1",
        [idsAna.orcamento],
      );
      await db.query("update public.orcamentos set status = 'aprovado' where id = $1", [idsAna.orcamento]);
      const { rows } = await db.query<{ recente: boolean }>(
        "select status_alterado_em > now() - interval '1 minute' as recente from public.orcamentos where id = $1",
        [idsAna.orcamento],
      );
      expect(rows[0].recente).toBe(true);
    });
  });

  it("o usuário não apaga nem recria a própria linha de configurações", async () => {
    await expect(como(db, ANA, () => db.query("delete from public.configuracoes"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      como(db, ANA, () => db.query("insert into public.configuracoes (user_id) values ($1)", [ANA])),
    ).rejects.toThrow(/permission denied/);
  });

  it("o usuário não reabre os dados iniciais para duplicá-los", async () => {
    await expect(
      como(db, ANA, () => db.query("update public.configuracoes set dados_iniciais_criados = false")),
    ).rejects.toThrow(/permission denied/);
    const n = await como(db, ANA, async () => {
      await db.query("select public.criar_dados_iniciais()");
      return contar("impressoras");
    });
    expect(n).toBe(1);
  });

  it("o usuário altera os parâmetros da oficina", async () => {
    const { rows } = await como(db, ANA, async () => {
      await db.query("update public.configuracoes set valor_hora = 45");
      return db.query<{ valor_hora: string }>("select valor_hora from public.configuracoes");
    });
    expect(rows).toEqual([{ valor_hora: "45.00" }]);
  });

  it("rejeita preço negativo gravado direto no banco", async () => {
    await expect(
      como(db, ANA, () =>
        db.query("update public.orcamentos set preco = -5 where id = $1", [idsAna.orcamento]),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("rejeita taxa de pagamento de 100%", async () => {
    await expect(
      como(db, ANA, () => db.query("update public.configuracoes set taxa_pagamento_pct = 100")),
    ).rejects.toThrow(/check constraint/);
  });

  it("apagar o usuário apaga tudo dele em cascata", async () => {
    await db.query("delete from auth.users where id = $1", [ANA]);
    for (const tabela of TABELAS) {
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from public.${tabela} where user_id = $1`,
        [ANA],
      );
      expect(rows[0].n).toBe(0);
    }
  });
});

describe("usuário criado antes das migrações", () => {
  it("ganha a linha de configurações mesmo assim", async () => {
    const antigo = "00000000-0000-0000-0000-0000000000cc";
    const banco = await criarBanco({ usuariosAntes: [antigo] });
    const { rows } = await banco.query<{ user_id: string }>("select user_id from public.configuracoes");
    expect(rows).toEqual([{ user_id: antigo }]);
  });
});
