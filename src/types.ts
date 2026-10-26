export const STATUSES = [
  "nao_iniciado",
  "em_andamento",
  "homologacao",
  "producao",
  "pausado",
  "encerrado",
] as const;

export type ProjectStatus = (typeof STATUSES)[number];

export type CheckKey =
  | "repositorio"
  | "banco"
  | "cnpj"
  | "focus_homolog"
  | "focus_producao"
  | "instalado";

export type CheckItem = {
  key: CheckKey;
  label: string;
  done: boolean;
};

export type EnvSnapshot = {
  dbUser: string;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbPassword: string;
  databaseUrl: string;
  focusCnpj: string;
  focusEnv: string;
  focusToken: string;
  focusHomolog: string;
  focusProduction: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  smtpTls: string;
  smtpSsl: string;
  printerName: string;
};

export type ClientSecrets = {
  dbPassword: string;
  databaseUrl: string;
  focusToken: string;
  focusHomolog: string;
  focusProduction: string;
  smtpPassword: string;
};

export const EMPTY_SECRETS: ClientSecrets = {
  dbPassword: "",
  databaseUrl: "",
  focusToken: "",
  focusHomolog: "",
  focusProduction: "",
  smtpPassword: "",
};

export type ClientRecord = {
  slug: string;
  tradeName: string;
  repoName: string;
  repoPath: string;
  status: ProjectStatus;
  summary: string;
  cnpj: string | null;
  supabaseRef: string | null;
  supabaseHost: string | null;
  focusHomolog: boolean;
  focusProduction: boolean;
  focusEmail: string;
  focusPanelUrl: string;
  focusAmbiente: "" | "homologacao" | "producao";
  dbUser: string;
  dbPort: string;
  dbName: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpFrom: string;
  smtpTls: string;
  smtpSsl: string;
  printerName: string;
  secrets: ClientSecrets;
  checklist: CheckItem[];
};

export const DATE_KINDS = ["pagamento", "entrega", "treinamento", "visita", "certificado"] as const;

export type DateKind = (typeof DATE_KINDS)[number];

export type CalendarDate = {
  id: string;
  clientSlug: string;
  kind: DateKind;
  day: string;
  amountCents: number | null;
  note: string;
  done: boolean;
};

export const DATE_LABEL: Record<DateKind, string> = {
  pagamento: "Pagamento",
  entrega: "Entrega",
  treinamento: "Treinamento",
  visita: "Visita",
  certificado: "Certificado",
};

export type HistoryEvent = {
  id: string;
  at: string;
  slug: string;
  text: string;
};

export type BoardState = {
  clients: ClientRecord[];
  events: HistoryEvent[];
  dates: CalendarDate[];
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  homologacao: "Homologação",
  producao: "Em produção",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export const STATUS_HINT: Record<ProjectStatus, string> = {
  nao_iniciado: "A loja ainda não está em implantação.",
  em_andamento: "O código ou o banco já existem. Falta fechar fiscal ou instalação.",
  homologacao: "A nota está em teste. A loja ainda não emite em produção.",
  producao: "A loja opera neste ERP.",
  pausado: "Parado de propósito.",
  encerrado: "Cliente encerrado.",
};
