import { addOption, getOptions, removeOption, type RegisterKind } from "@/lib/stock-store";
import { NextResponse } from "next/server";
import { z } from "zod";

const kinds: RegisterKind[] = ["clientes", "ambientes", "funcionarios", "materiais"];

const schema = z.object({
  kind: z.enum(kinds),
  value: z.string().trim().min(1),
  action: z.enum(["add", "remove"]).default("add"),
});

export async function GET() {
  return NextResponse.json({ ok: true, options: await getOptions() });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Cadastro invalido." }, { status: 422 });
  }

  const { kind, value, action } = parsed.data;
  const options = action === "remove" ? await removeOption(kind, value) : await addOption(kind, value);
  return NextResponse.json({ ok: true, options });
}
