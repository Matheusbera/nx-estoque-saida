import { getOptions, listBalances, listMovements, listStockRequests } from "@/lib/stock-store";
import EstoqueClient from "./estoque-client";

export default async function EstoquePage() {
  const [options, requests, balances, movements] = await Promise.all([
    getOptions(),
    listStockRequests(),
    listBalances(),
    listMovements(),
  ]);

  return <EstoqueClient options={options} initialRequests={requests} initialBalances={balances} initialMovements={movements} />;
}
