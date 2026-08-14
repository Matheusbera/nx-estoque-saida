import { getOptions, listStockRequests } from "@/lib/stock-store";
import EstoqueClient from "./estoque-client";

export default async function EstoquePage() {
  const [options, requests] = await Promise.all([getOptions(), listStockRequests()]);

  return <EstoqueClient options={options} initialRequests={requests} />;
}
