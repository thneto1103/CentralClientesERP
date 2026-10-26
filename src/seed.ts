import type { CheckItem, ClientRecord } from "./types";
import { EMPTY_SECRETS } from "./types";

function checks(flags: Record<CheckItem["key"], boolean>): CheckItem[] {
  const labels: Record<CheckItem["key"], string> = {
    repositorio: "Repositório no disco",
    banco: "Banco Supabase da loja",
    cnpj: "CNPJ no .env",
    focus_homolog: "Token Focus homologação",
    focus_producao: "Token Focus produção",
    instalado: "Instalador na loja",
  };
  return (Object.keys(labels) as CheckItem["key"][]).map((key) => ({
    key,
    label: labels[key],
    done: flags[key],
  }));
}

const DRAFT = [
  {
    slug: "mix-parfum",
    tradeName: "Mix Parfum",
    repoName: "ERPOnlyPy-Demo",
    repoPath: "C:\\Users\\Thnet\\Desktop\\SaaSProjects\\ERPOnlyPy-Demo",
    status: "homologacao",
    summary:
      "Clone amarelo usado no desenvolvimento fiscal. Banco e tokens Focus estão preenchidos. Marque Em produção se a loja já emite nota de verdade.",
    cnpj: "46409303000163",
    supabaseRef: "gqrfzsgcfwpadyvfnbes",
    supabaseHost: "aws-1-us-east-1.pooler.supabase.com",
    focusHomolog: true,
    focusProduction: true,
    focusEmail: "",
    focusPanelUrl: "",
    focusAmbiente: "",
    checklist: checks({
      repositorio: true,
      banco: true,
      cnpj: true,
      focus_homolog: true,
      focus_producao: true,
      instalado: false,
    }),
  },
  {
    slug: "hara-perfumes",
    tradeName: "Hara Perfumes",
    repoName: "ERPOnlyPy",
    repoPath: "C:\\Users\\Thnet\\Desktop\\SaaSProjects\\ERPOnlyPy",
    status: "producao",
    summary:
      "Repositório principal. Banco e os dois tokens Focus estão preenchidos. A instalação na loja fica desmarcada até um de vocês confirmar.",
    cnpj: "48460137000155",
    supabaseRef: "aepwxmawlifqkfczoicc",
    supabaseHost: "aws-1-us-east-1.pooler.supabase.com",
    focusHomolog: true,
    focusProduction: true,
    focusEmail: "",
    focusPanelUrl: "",
    focusAmbiente: "",
    checklist: checks({
      repositorio: true,
      banco: true,
      cnpj: true,
      focus_homolog: true,
      focus_producao: true,
      instalado: false,
    }),
  },
  {
    slug: "tabacaju",
    tradeName: "Tabacaju",
    repoName: "ERPOnlyPy-ylcfqm",
    repoPath: "C:\\Users\\Thnet\\Desktop\\SaaSProjects\\ERPOnlyPy-ylcfqm",
    status: "em_andamento",
    summary:
      "O projeto Supabase da loja existe. CNPJ e tokens Focus ainda estão vazios no .env.",
    cnpj: null,
    supabaseRef: "ylcfqmnowjewynsvtxqc",
    supabaseHost: "aws-1-us-west-2.pooler.supabase.com",
    focusHomolog: false,
    focusProduction: false,
    focusEmail: "",
    focusPanelUrl: "",
    focusAmbiente: "",
    checklist: checks({
      repositorio: true,
      banco: true,
      cnpj: false,
      focus_homolog: false,
      focus_producao: false,
      instalado: false,
    }),
  },
  {
    slug: "elo",
    tradeName: "ELO",
    repoName: "ERPOnlyPy-Elo",
    repoPath: "C:\\Users\\Thnet\\Desktop\\SaaSProjects\\ERPOnlyPy-Elo",
    status: "nao_iniciado",
    summary:
      "Ainda não implantado. A pasta Elo Criativo existe e há um host de banco, sem token Focus. Passe para Em andamento quando a implantação começar.",
    cnpj: "69113601000107",
    supabaseRef: "zxfvaawfbrfjuxsjbvif",
    supabaseHost: "db.zxfvaawfbrfjuxsjbvif.supabase.co",
    focusHomolog: false,
    focusProduction: false,
    focusEmail: "",
    focusPanelUrl: "",
    focusAmbiente: "",
    checklist: checks({
      repositorio: true,
      banco: false,
      cnpj: true,
      focus_homolog: false,
      focus_producao: false,
      instalado: false,
    }),
  },
];

export const SEED: ClientRecord[] = DRAFT.map((client) => ({
  ...client,
  dbUser: "",
  dbPort: "",
  dbName: "",
  smtpHost: "",
  smtpPort: "",
  smtpUser: "",
  smtpFrom: "",
  smtpTls: "",
  smtpSsl: "",
  printerName: "",
  secrets: { ...EMPTY_SECRETS },
})) as ClientRecord[];

export function blankChecklist(): CheckItem[] {
  return checks({
    repositorio: false,
    banco: false,
    cnpj: false,
    focus_homolog: false,
    focus_producao: false,
    instalado: false,
  });
}
