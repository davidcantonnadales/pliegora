import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  origin,
  body,
  requireUser,
  user,
  document,
  db,
  dataDir,
  failure,
  HttpError,
  hash,
  safeEqual,
} from "@/lib/server";
import { canTransition } from "@/lib/pricing.mjs";
import type { Order } from "@/lib/orders";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
function find(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new HttpError(404, "Pedido no encontrado");
  const d = document<Order>(id);
  if (!d || d.owner !== "orders")
    throw new HttpError(404, "Pedido no encontrado");
  return d.value;
}
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const order = find(id);
    const token =
      req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    if (!user(req) && !safeEqual(hash(token), order.tokenHash))
      throw new HttpError(404, "Pedido no encontrado");
    if (req.nextUrl.searchParams.get("file") === "1") {
      const bytes = await readFile(resolve(dataDir(), "files", id + ".pdf"));
      return new Response(bytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="pedido-${id}.pdf"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox",
        },
      });
    }
    const { tokenHash, ...safe } = order;
    return NextResponse.json(safe, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    origin(req);
    requireUser(req);
    const { id } = await params,
      order = find(id),
      data = await body(req, 1000);
    if (!canTransition(order.status, data.status))
      throw new HttpError(400, "Cambio de estado no permitido");
    const previous = order.status;
    order.status = data.status;
    const result = db().prepare("UPDATE documents SET json=? WHERE id=? AND owner='orders' AND json_extract(json,'$.status')=?").run(JSON.stringify(order), id, previous);
    if(result.changes !== 1) throw new HttpError(409, "El pedido ha cambiado. Actualiza el panel y vuelve a intentarlo.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
