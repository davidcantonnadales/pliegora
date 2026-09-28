import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
const derive = promisify(scrypt);
let connection: DatabaseSync | undefined;
export const dataDir = () => {
  const dir = resolve(
    /* turbopackIgnore: true */ process.env.DATA_DIR || "data",
  );
  const pub = resolve(process.cwd(), "public");
  if (dir === pub || dir.startsWith(pub + "/"))
    throw new Error("DATA_DIR debe estar fuera de public");
  return dir;
};
export function db() {
  if (!connection) {
    mkdirSync(dataDir(), { recursive: true, mode: 0o700 });
    connection = new DatabaseSync(resolve(dataDir(), "app.sqlite"));
    connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,salt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,owner TEXT NOT NULL,json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS slugs(slug TEXT PRIMARY KEY,owner TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE);`);
  }
  return connection;
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function baseUrl() {
  const u = new URL(process.env.APP_URL || "http://127.0.0.1:3000");
  if (
    u.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
  )
    throw new Error("APP_URL necesita HTTPS fuera de localhost");
  return u.origin;
}
export function origin(req: NextRequest) {
  if (req.headers.get("origin") !== baseUrl())
    throw new HttpError(403, "Origen no permitido");
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function failure(e: unknown) {
  return NextResponse.json(
    {
      error:
        e instanceof HttpError
          ? e.message
          : "No se ha podido completar la operación.",
    },
    { status: e instanceof HttpError ? e.status : 500 },
  );
}
export function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const row = db()
    .prepare("SELECT count,until FROM limits WHERE key=?")
    .get(key) as { count: number; until: number } | undefined;
  if (!row || row.until < now) {
    db()
      .prepare(
        "INSERT INTO limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,until=excluded.until",
      )
      .run(key, now + windowMs);
    db().prepare("DELETE FROM limits WHERE until<?").run(now);
    return;
  }
  if (row.count >= max)
    throw new HttpError(
      429,
      "Demasiados intentos. Espera antes de volver a probar.",
    );
  db().prepare("UPDATE limits SET count=count+1 WHERE key=?").run(key);
}
export async function body(req: NextRequest, max = 100_000) {
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Faltan datos");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, "Solicitud demasiado grande");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, "JSON no válido");
  }
}
export async function passwordHash(password: string, salt: string) {
  return ((await derive(password, salt, 64)) as Buffer).toString("hex");
}
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(hash(a)),
    y = Buffer.from(hash(b));
  return timingSafeEqual(x, y);
}
export type User = {
  id: string;
  email: string;
  password: string;
  salt: string;
};
export function user(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  return (
    (db()
      .prepare(
        "SELECT users.* FROM sessions JOIN users ON sessions.uid=users.id WHERE token=? AND expires>?",
      )
      .get(hash(token), Date.now()) as User | undefined) || null
  );
}
export function requireUser(req: NextRequest) {
  const u = user(req);
  if (!u) throw new HttpError(401, "Inicia sesión para continuar");
  return u;
}
export function session(uid: string) {
  db().prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(hash(token), uid, Date.now() + 8 * 3600_000);
  const r = NextResponse.json({ ok: true });
  r.cookies.set("session", token, {
    httpOnly: true,
    secure: baseUrl().startsWith("https:"),
    sameSite: "strict",
    maxAge: 8 * 3600,
    path: "/",
  });
  r.headers.set("Cache-Control", "no-store");
  return r;
}
export function logout(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (token)
    db().prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
  const r = NextResponse.json({ ok: true });
  r.cookies.set("session", "", {
    httpOnly: true,
    secure: baseUrl().startsWith("https:"),
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return r;
}
export function saveDocument(id: string, owner: string, value: unknown) {
  db()
    .prepare(
      "INSERT INTO documents VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json WHERE owner=excluded.owner",
    )
    .run(id, owner, JSON.stringify(value));
}
export function document<T>(id: string) {
  const row = db()
    .prepare("SELECT owner,json FROM documents WHERE id=?")
    .get(id) as { owner: string; json: string } | undefined;
  return row ? { owner: row.owner, value: JSON.parse(row.json) as T } : null;
}
