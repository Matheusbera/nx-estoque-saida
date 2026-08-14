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

const dataDir = path.join(process.cwd(), "data");
const requestsFile = path.join(dataDir, "stock-requests.json");
const optionsFile = path.join(dataDir, "options.json");

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

export async function listStockRequests(): Promise<StockRequest[]> {
  const rows = await readJson<StockRequest[]>(requestsFile, []);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStockRequest(id: string): Promise<StockRequest | null> {
  const rows = await listStockRequests();
  return rows.find((row) => row.id === id) ?? null;
}

export async function createStockRequest(input: Omit<StockRequest, "id" | "numero" | "createdAt" | "data" | "hora" | "status">): Promise<StockRequest> {
  const allRows = await readJson<StockRequest[]>(requestsFile, []);
  const now = new Date();
  const createdAt = now.toISOString();
  const year = String(now.getFullYear());
  const max = allRows.reduce((highest, row) => {
    const match = row.numero.match(new RegExp(`^SE-${year}-(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  const row: StockRequest = {
    ...input,
    id: crypto.randomUUID(),
    numero: `SE-${year}-${String(max + 1).padStart(5, "0")}`,
    createdAt,
    data: new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(now),
    hora: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now),
    status: "salva",
  };

  allRows.push(row);
  await writeJson(requestsFile, allRows);
  return row;
}
