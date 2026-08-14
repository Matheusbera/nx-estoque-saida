import { getStockRequest } from "@/lib/stock-store";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const row = await getStockRequest(id);

  if (!row) {
    return NextResponse.json({ ok: false, error: "Requisicao nao encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, request: row });
}
