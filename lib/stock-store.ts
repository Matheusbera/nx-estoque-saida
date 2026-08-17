import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StockItem = {
  id: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  observacao?: string;
};

export type StockRequest = {
  id: string;
  numero: string;
  createdAt: string;
  data: string;
  hora: string;
  cliente: string;
  ambiente: string;
  destino: "CLIENTE" | "FABRICA" | "ESCRITORIO" | "LOJA";
  retiradoPor: string;
  responsavelEstoque: string;
  justificativa: string;
  status: "salva" | "impressa";
  items: StockItem[];
};

export type StockOptions = {
  clientes: string[];
  ambientes: string[];
  funcionarios: string[];
  materiais: string[];
};

export type RegisterKind = keyof StockOptions;

export type StockBalance = {
  item: string;
  unidade: string;
  quantidade: number;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  item: string;
  unidade: string;
  quantidade: number;
  observacao: string;
  origem: string;
  createdAt: string;
  data: string;
  hora: string;
};

const dataDir = path.join(process.cwd(), "data");
const requestsFile = path.join(dataDir, "stock-requests.json");
const optionsFile = path.join(dataDir, "options.json");
const balancesFile = path.join(dataDir, "stock-balances.json");
const movementsFile = path.join(dataDir, "stock-movements.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, value: T) {
  await ensureDataDir();
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

export async function getOptions(): Promise<StockOptions> {
  return readJson<StockOptions>(optionsFile, {
    clientes: [],
    ambientes: [],
    funcionarios: [],
    materiais: [],
  });
}

function normalizeText(value: string) {
  return value.trim().toUpperCase();
}

function parseQuantity(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nowLabels(date = new Date()) {
  return {
    createdAt: date.toISOString(),
    data: new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date),
    hora: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

export async function saveOptions(options: StockOptions): Promise<StockOptions> {
  const clean = {
    clientes: uniqueSorted(options.clientes),
    ambientes: uniqueSorted(options.ambientes),
    funcionarios: uniqueSorted(options.funcionarios),
    materiais: uniqueSorted(options.materiais),
  };
  await writeJson(optionsFile, clean);
  return clean;
}

export async function addOption(kind: RegisterKind, value: string): Promise<StockOptions> {
  const options = await getOptions();
  options[kind] = uniqueSorted([...options[kind], value]);
  return saveOptions(options);
}

export async function removeOption(kind: RegisterKind, value: string): Promise<StockOptions> {
  const options = await getOptions();
  const target = normalizeText(value);
  options[kind] = options[kind].filter((row) => normalizeText(row) !== target);
  return saveOptions(options);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function listStockRequests(): Promise<StockRequest[]> {
  const rows = await readJson<StockRequest[]>(requestsFile, []);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStockRequest(id: string): Promise<StockRequest | null> {
  const rows = await listStockRequests();
  return rows.find((row) => row.id === id) ?? null;
}

export async function listBalances(): Promise<StockBalance[]> {
  const rows = await readJson<StockBalance[]>(balancesFile, []);
  return rows.sort((a, b) => a.item.localeCompare(b.item));
}

export async function listMovements(): Promise<StockMovement[]> {
  const rows = await readJson<StockMovement[]>(movementsFile, []);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function applyMovement(input: Omit<StockMovement, "id" | "createdAt" | "data" | "hora">): Promise<StockMovement> {
  const labels = nowLabels();
  const movement: StockMovement = {
    ...input,
    id: crypto.randomUUID(),
    item: normalizeText(input.item),
    unidade: normalizeText(input.unidade || "UN"),
    quantidade: parseQuantity(input.quantidade),
    observacao: input.observacao.trim(),
    origem: input.origem.trim(),
    ...labels,
  };

  const balances = await readJson<StockBalance[]>(balancesFile, []);
  const itemIndex = balances.findIndex((row) => normalizeText(row.item) === movement.item);
  const current = itemIndex >= 0 ? balances[itemIndex] : null;
  const signal = movement.tipo === "ENTRADA" ? 1 : -1;
  const nextQuantity = (current?.quantidade ?? 0) + signal * movement.quantidade;
  const nextBalance: StockBalance = {
    item: movement.item,
    unidade: movement.unidade || current?.unidade || "UN",
    quantidade: nextQuantity,
    updatedAt: labels.createdAt,
  };

  if (itemIndex >= 0) balances[itemIndex] = nextBalance;
  else balances.push(nextBalance);

  const movements = await readJson<StockMovement[]>(movementsFile, []);
  movements.push(movement);
  await writeJson(balancesFile, balances);
  await writeJson(movementsFile, movements);
  return movement;
}

export async function createStockEntry(input: {
  item: string;
  unidade: string;
  quantidade: string | number;
  observacao: string;
}): Promise<StockMovement> {
  await addOption("materiais", input.item);
  return applyMovement({
    tipo: "ENTRADA",
    item: input.item,
    unidade: input.unidade,
    quantidade: parseQuantity(input.quantidade),
    observacao: input.observacao,
    origem: "ENTRADA MANUAL",
  });
}

export async function createStockRequest(input: Omit<StockRequest, "id" | "numero" | "createdAt" | "data" | "hora" | "status">): Promise<StockRequest> {
  const allRows = await readJson<StockRequest[]>(requestsFile, []);
  const now = new Date();
  const labels = nowLabels(now);
  const year = String(now.getFullYear());
  const max = allRows.reduce((highest, row) => {
    const match = row.numero.match(new RegExp(`^SE-${year}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  const row: StockRequest = {
    ...input,
    id: crypto.randomUUID(),
    numero: `SE-${year}-${String(max + 1).padStart(5, "0")}`,
    ...labels,
    status: "salva",
  };

  allRows.push(row);
  await writeJson(requestsFile, allRows);

  await addOption("clientes", row.cliente);
  await addOption("ambientes", row.ambiente);
  await addOption("funcionarios", row.retiradoPor);
  await addOption("funcionarios", row.responsavelEstoque);
  for (const item of row.items) {
    await addOption("materiais", item.descricao);
    await applyMovement({
      tipo: "SAIDA",
      item: item.descricao,
      unidade: item.unidade,
      quantidade: parseQuantity(item.quantidade),
      observacao: row.justificativa,
      origem: row.numero,
    });
  }

  return row;
}
