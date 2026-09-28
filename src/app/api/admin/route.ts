import { NextRequest, NextResponse } from "next/server";
import {
  origin,
  body,
  limit,
  safeEqual,
  session,
  logout,
  user,
  db,
  failure,
  HttpError,
} from "@/lib/server";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      authenticated: !!user(req),
      configured: (process.env.ADMIN_PASSWORD || "").length >= 16,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: NextRequest) {
  try {
    origin(req);
    limit("admin-login", 10, 15 * 60_000);
    const data = await body(req, 2000);
    const secret = process.env.ADMIN_PASSWORD || "";
    if (secret.length < 16)
      throw new HttpError(
        503,
        "Define ADMIN_PASSWORD (mínimo 16 caracteres) en .env.local y reinicia el servidor.",
      );
    if (
      typeof data.password !== "string" ||
      data.password.length > 200 ||
      !safeEqual(data.password, secret)
    )
      throw new HttpError(401, "Contraseña incorrecta");
    db()
      .prepare(
        "INSERT OR IGNORE INTO users VALUES('admin','admin@local.invalid','','')",
      )
      .run();
    return session("admin");
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: NextRequest) {
  try {
    origin(req);
    return logout(req);
  } catch (e) {
    return failure(e);
  }
}
