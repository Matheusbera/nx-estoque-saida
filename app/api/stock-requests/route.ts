import { createStockRequest, listStockRequests } from "@/lib/stock-store";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  cliente: z.string().trim().min(1),
  ambiente: z.string().trim().min(1),
  destino: z.enum(["CLIENTE", "FABRICA", "ESCRITORIO", "LOJA"]),
  retiradoPor: z.string().trim().min(1),
  responsavelEstoque: z.string().trim().min(1).default("JO"),
  justificativa: z.string().trim().min(1),
  items: z.array(
    z.object({
      id: z.string().optional(),
      descricao: z.string().trim().min(1),
      quantidade: z.string().trim().min(1),
      unidade: z.string().trim().min(1),
      observacao: z.string().trim().optional(),
    }),
  ).min(1),
});

function upper(value: string) {
  return value.trim().toUpperCase();
}

export async function GET() {
  return NextResponse.json({ ok: true, requests: await listStockRequests() });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Campos obrigatorios incompletos." }, { status: 422 });
  }

  const body = parsed.data;
  const row = await createStockRequest({
    cliente: upper(body.cliente),
    ambiente: upper(body.ambiente),
    destino: body.destino,
    retiradoPor: upper(body.retiradoPor),
    responsavelEstoque: upper(body.responsavelEstoque),
    justificativa: body.justificativa.trim(),
    items: body.items.map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      descricao: upper(item.descricao),
      quantidade: item.quantidade.trim(),
      unidade: upper(item.unidade),
      observacao: item.observacao?.trim(),
    })),
  });

  return NextResponse.json({ ok: true, request: row });
}
