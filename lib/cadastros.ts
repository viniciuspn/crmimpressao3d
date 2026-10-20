// Schemas (validação nas Server Actions) e campos (formulários) de cadastros e configurações.
// Os limites espelham os CHECKs das migrações.
import { z } from "zod";
import { TIPOS_FILAMENTO, UNIDADES_INSUMO } from "@/lib/dominio";
import {
  checkbox,
  decimal,
  decimalOpcional,
  inteiro,
  textoObrigatorio,
  textoOpcional,
  type GrupoCampos,
} from "@/lib/form";

// ---------- Filamentos ----------

export const filamentoSchema = z.object({
  nome: textoObrigatorio("Informe o nome"),
  tipo: z.enum(TIPOS_FILAMENTO, "Escolha um tipo"),
  marca: textoOpcional(),
  cor: z.preprocess(
    (v) => (typeof v === "string" && v !== "" ? v : null),
    z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable(),
  ),
  preco_rolo: decimal({ min: 0, casas: 2 }),
  frete: decimalOpcional({ min: 0, casas: 2 }).transform((v) => v ?? 0),
  peso_rolo_g: inteiro({ maiorQue: 0, max: 100_000 }),
  ativo: checkbox,
});

export const camposFilamento: GrupoCampos[] = [
  {
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, inteiro: true },
      { nome: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: TIPOS_FILAMENTO },
      { nome: "marca", rotulo: "Marca", tipo: "texto" },
      { nome: "cor", rotulo: "Cor", tipo: "cor" },
      { nome: "preco_rolo", rotulo: "Preço do rolo", tipo: "decimal", prefixo: "R$", obrigatorio: true },
      { nome: "frete", rotulo: "Frete", tipo: "decimal", prefixo: "R$" },
      { nome: "peso_rolo_g", rotulo: "Peso do rolo", tipo: "inteiro", sufixo: "g", obrigatorio: true },
      { nome: "ativo", rotulo: "Ativo", tipo: "checkbox" },
    ],
  },
];

// ---------- Impressoras ----------

export const impressoraSchema = z.object({
  nome: textoObrigatorio("Informe o nome"),
  preco: decimal({ min: 0, casas: 2 }),
  vida_util_h: inteiro({ maiorQue: 0, max: 1_000_000 }),
  consumo_w: decimal({ min: 0, max: 100_000, casas: 2 }),
  manutencao_h: decimalOpcional({ min: 0, casas: 2 }).transform((v) => v ?? 0),
  ativo: checkbox,
});

export const camposImpressora: GrupoCampos[] = [
  {
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, inteiro: true },
      { nome: "preco", rotulo: "Preço", tipo: "decimal", prefixo: "R$", obrigatorio: true },
      { nome: "vida_util_h", rotulo: "Vida útil", tipo: "inteiro", sufixo: "h", obrigatorio: true },
      { nome: "consumo_w", rotulo: "Consumo médio", tipo: "decimal", sufixo: "W", obrigatorio: true },
      { nome: "manutencao_h", rotulo: "Manutenção", tipo: "decimal", prefixo: "R$", sufixo: "/h" },
      { nome: "ativo", rotulo: "Ativa", tipo: "checkbox" },
    ],
  },
];

// ---------- Insumos ----------

export const insumoSchema = z.object({
  nome: textoObrigatorio("Informe o nome"),
  unidade: z.enum(UNIDADES_INSUMO, "Escolha a unidade"),
  preco_pago: decimal({ min: 0, casas: 2 }),
  qtd_embalagem: decimalOpcional({ maiorQue: 0, casas: 4 }),
  ativo: checkbox,
});

export const camposInsumo: GrupoCampos[] = [
  {
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, inteiro: true },
      { nome: "unidade", rotulo: "Unidade", tipo: "selecao", opcoes: UNIDADES_INSUMO },
      { nome: "preco_pago", rotulo: "Preço pago", tipo: "decimal", prefixo: "R$", obrigatorio: true },
      {
        nome: "qtd_embalagem",
        rotulo: "Quantidade na embalagem",
        tipo: "decimal",
        ajuda: "Sem isso o insumo não pode entrar em orçamentos",
      },
      { nome: "ativo", rotulo: "Ativo", tipo: "checkbox" },
    ],
  },
];

// ---------- Configurações ----------

const pct = (opcoes: { max?: number; menorQue?: number } = { max: 100 }) => decimal({ min: 0, casas: 2, ...opcoes });
const reais = () => decimal({ min: 0, casas: 2 });
const minutos = () => decimal({ min: 0, max: 100_000, casas: 2 });

export const configuracoesSchema = z.object({
  tarifa_kwh: decimal({ min: 0, max: 100, casas: 4 }),
  desperdicio_pct: pct(),
  taxa_falha_pct: pct(),
  valor_hora: reais(),
  preparo_min: minutos(),
  acabamento_min_peca: minutos(),
  embalagem_pedido: reais(),
  margem_pct: decimal({ min: 0, max: 9999, casas: 2 }),
  taxa_pagamento_pct: pct({ menorQue: 100 }),
  pedido_minimo: reais(),
  pintura_insumos_peca: reais(),
  pintura_min_peca: minutos(),
  retorno_ativo: checkbox,
  retorno_meses: inteiro({ maiorQue: 0, max: 600 }),
  retorno_horas_mes: inteiro({ maiorQue: 0, max: 744 }),
  validade_orcamento_dias: inteiro({ maiorQue: 0, max: 365 }),
  followup_dias: inteiro({ maiorQue: 0, max: 365 }),
});

export const camposConfiguracoes: GrupoCampos[] = [
  {
    titulo: "Máquina e material",
    campos: [
      { nome: "tarifa_kwh", rotulo: "Tarifa de energia", tipo: "decimal", prefixo: "R$", sufixo: "/kWh" },
      { nome: "desperdicio_pct", rotulo: "Desperdício de filamento", tipo: "decimal", sufixo: "%" },
      { nome: "taxa_falha_pct", rotulo: "Taxa de falha", tipo: "decimal", sufixo: "%" },
    ],
  },
  {
    titulo: "Mão de obra",
    campos: [
      { nome: "valor_hora", rotulo: "Valor da sua hora", tipo: "decimal", prefixo: "R$", sufixo: "/h" },
      { nome: "preparo_min", rotulo: "Preparo por pedido", tipo: "decimal", sufixo: "min" },
      { nome: "acabamento_min_peca", rotulo: "Acabamento por peça", tipo: "decimal", sufixo: "min" },
      { nome: "embalagem_pedido", rotulo: "Embalagem por pedido", tipo: "decimal", prefixo: "R$" },
    ],
  },
  {
    titulo: "Pintura (padrão quando o orçamento é pintado)",
    campos: [
      { nome: "pintura_insumos_peca", rotulo: "Material de pintura por peça", tipo: "decimal", prefixo: "R$" },
      { nome: "pintura_min_peca", rotulo: "Tempo de pintura por peça", tipo: "decimal", sufixo: "min" },
    ],
  },
  {
    titulo: "Preço",
    campos: [
      { nome: "margem_pct", rotulo: "Margem", tipo: "decimal", sufixo: "%" },
      {
        nome: "taxa_pagamento_pct",
        rotulo: "Taxa de pagamento",
        tipo: "decimal",
        sufixo: "%",
        ajuda: "Maquininha, Pix com taxa, marketplace…",
      },
      { nome: "pedido_minimo", rotulo: "Pedido mínimo", tipo: "decimal", prefixo: "R$" },
    ],
  },
  {
    titulo: "Retorno da máquina",
    campos: [
      {
        nome: "retorno_ativo",
        rotulo: "Cobrar retorno do investimento",
        tipo: "checkbox",
        inteiro: true,
      },
      { nome: "retorno_meses", rotulo: "Pagar a máquina em", tipo: "inteiro", sufixo: "meses" },
      { nome: "retorno_horas_mes", rotulo: "Horas de impressão por mês", tipo: "inteiro", sufixo: "h" },
    ],
  },
  {
    titulo: "Orçamentos",
    campos: [
      { nome: "validade_orcamento_dias", rotulo: "Validade do orçamento", tipo: "inteiro", sufixo: "dias" },
      {
        nome: "followup_dias",
        rotulo: "Lembrar de cobrar resposta após",
        tipo: "inteiro",
        sufixo: "dias",
      },
    ],
  },
];

// ---------- Clientes ----------

export const clienteSchema = z.object({
  nome: textoObrigatorio("Informe o nome"),
  telefone: textoOpcional(40),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.email("E-mail inválido").max(200).nullable(),
  ),
  cidade: textoOpcional(),
  observacoes: textoOpcional(2000),
});

export const camposCliente: GrupoCampos[] = [
  {
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, inteiro: true },
      { nome: "telefone", rotulo: "WhatsApp / telefone", tipo: "texto", entrada: "tel", ajuda: "Com DDD, para gerar o link do WhatsApp" },
      { nome: "email", rotulo: "E-mail", tipo: "texto", entrada: "email" },
      { nome: "cidade", rotulo: "Cidade", tipo: "texto" },
      { nome: "observacoes", rotulo: "Observações", tipo: "textarea", inteiro: true },
    ],
  },
];
