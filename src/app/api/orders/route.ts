import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes } from "node:crypto";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  db,
  dataDir,
  origin,
  requireUser,
  limit,
  saveDocument,
  failure,
  HttpError,
  hash,
} from "@/lib/server";
import { quote } from "@/lib/pricing.mjs";
import type { Order } from "@/lib/orders";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    requireUser(req);
    const rows = db()
      .prepare(
        "SELECT json FROM documents WHERE owner='orders' ORDER BY rowid DESC LIMIT 500",
      )
      .all() as { json: string }[];
    return NextResponse.json(
      rows.map((r) => {
        const { tokenHash, ...order } = JSON.parse(r.json) as Order;
        return order;
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  let filePath = "";
  try {
    origin(req);
    limit("orders-global", 30, 3600_000);
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data;"))
      throw new HttpError(400, "Envía un formulario con un PDF");
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = req.body?.getReader();
    if (!reader) throw new HttpError(400, "Faltan datos");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 21 * 1024 * 1024) {
        await reader.cancel();
        throw new HttpError(413, "Máximo 20 MB por PDF");
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": req.headers.get("content-type")! },
    }).formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 20 * 1024 * 1024 ||
      file.size < 5
    )
      throw new HttpError(400, "Adjunta un PDF de hasta 20 MB");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
      throw new HttpError(400, "El archivo no es un PDF");
    let pages = 0;
    try {
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      pages = pdf.getPageCount();
    } catch {
      throw new HttpError(
        400,
        "No se puede leer el PDF. Comprueba que no esté cifrado o dañado.",
      );
    }
    let price;
    try {
      price = quote({
        product: form.get("product"),
        quantity: Number(form.get("quantity")),
        pages,
        color: form.get("color"),
        size: form.get("size"),
        binding: form.get("binding"),
      });
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    const name = String(form.get("name") || "").trim(),
      contact = String(form.get("contact") || "").trim();
    if (name.length < 2 || name.length > 80 || contact.length > 150)
      throw new HttpError(
        400,
        "Indica un nombre de 2–80 caracteres y contacto de hasta 150",
      );
    const id = randomUUID(),
      token = randomBytes(32).toString("hex");
    const order: Order = {
      id,
      name,
      contact,
      fileName:
        file.name.replace(/[^p{L}p{N} ._-]/gu, "_").slice(0, 100) ||
        "documento.pdf",
      created: new Date().toISOString(),
      status: "pending",
      price,
      tokenHash: hash(token),
    };
    await mkdir(resolve(dataDir(), "files"), { recursive: true, mode: 0o700 });
    filePath = resolve(dataDir(), "files", id + ".pdf");
    await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
    saveDocument(id, "orders", order);
    return NextResponse.json(
      { id, token, price },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (filePath) await unlink(filePath).catch(() => {});
    return failure(e);
  }
}
