import { createStockEntry, listBalances, listMovements } from "@/lib/stock-store";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  item: z.string().trim().min(1),
  unidade: z.string().trim().min(1).default("UN"),
  quantidade: z.union([z.string().trim().min(1), z.number().positive()]),
  observacao: z.string().trim().optional().default(""),
});

export async function GET() {
  return NextResponse.json({
    ok: true,
    balances: await listBalances(),
    movements: await listMovements(),
  });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Entrada invalida." }, { status: 422 });
  }

  const movement = await createStockEntry(parsed.data);
  return NextResponse.json({
    ok: true,
    movement,
    balances: await listBalances(),
    movements: await listMovements(),
  });
}
