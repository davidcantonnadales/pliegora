"use client";
import { useEffect, useState } from "react";
import { money, labels, canTransition, states } from "@/lib/pricing.mjs";
import type { Order } from "@/lib/orders";
export default function Admin() {
  const [auth, setAuth] = useState(false),
    [loaded, setLoaded] = useState(false),
    [orders, setOrders] = useState<Order[]>([]),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState("all");
  async function refresh() {
    const r = await fetch("/api/orders");
    if (r.ok) {
      setOrders(await r.json());
      setAuth(true);
    } else setAuth(false);
    setLoaded(true);
  }
  useEffect(() => {
    refresh();
  }, []);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get("password"),
        }),
      }),
      d = await r.json();
    if (r.ok) {
      setMessage("");
      refresh();
    } else setMessage(d.error);
  }
  async function change(id: string, status: string) {
    const r = await fetch("/api/orders/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) setMessage((await r.json()).error);
    else {
      setMessage("Estado actualizado");
      refresh();
    }
  }
  return (
    <main id="contenido">
      <p className="eyebrow">PLIEGORA / ADMINISTRACIÓN</p>
      <h1>
        Del pedido
        <br />a la recogida.
      </h1>
      {!loaded ? (
        <p>Cargando…</p>
      ) : !auth ? (
        <form className="panel auth stack" onSubmit={login}>
          <h2>Entrar al taller</h2>
          <p>
            Utiliza la contraseña configurada por el propietario de esta
            instalación.
          </p>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button>Entrar</button>
          <p role="status">{message}</p>
        </form>
      ) : (
        <>
          <div className="row">
            <p>
              {orders.length} solicitudes ·{" "}
              {orders.filter((o) => o.status === "pending").length} pendientes
            </p>
            <button
              className="secondary"
              onClick={async () => {
                await fetch("/api/admin", { method: "DELETE" });
                setAuth(false);
              }}
            >
              Cerrar sesión
            </button>
          </div>
          <div className="tabs">
            {["all", ...states].map((s) => (
              <button
                key={s}
                aria-pressed={filter === s}
                onClick={() => setFilter(s)}
              >
                {s === "all" ? "Todos" : labels[s]}
              </button>
            ))}
          </div>
          <p role="status">{message}</p>
          <div className="items">
            {orders
              .filter((o) => filter === "all" || filter === o.status)
              .map((o) => (
                <article className="panel" key={o.id}>
                  <div className="row">
                    <div>
                      <span className="badge">{labels[o.status]}</span>
                      <h2>{o.name}</h2>
                      <p>
                        {o.contact || "Sin contacto indicado"} ·{" "}
                        {new Date(o.created).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <strong className="price">{money(o.price.total)}</strong>
                  </div>
                  <p>
                    {o.price.quantity} ejemplares · {o.price.pages} páginas ·{" "}
                    {o.price.color === "color" ? "color" : "blanco y negro"} ·{" "}
                    {o.price.size.toUpperCase()} ·{" "}
                    {o.price.binding === "spiral"
                      ? "espiral"
                      : "sin encuadernar"}
                  </p>
                  <div className="actions">
                    <a
                      className="button secondary"
                      href={"/api/orders/" + o.id + "?file=1"}
                    >
                      Descargar PDF
                    </a>
                    {states
                      .filter((s) => canTransition(o.status, s))
                      .map((s) => (
                        <button
                          key={s}
                          className={s === "cancelled" ? "danger" : ""}
                          onClick={() => change(o.id, s)}
                        >
                          {labels[s]}
                        </button>
                      ))}
                  </div>
                  <p className="tiny">
                    Referencia: {o.id} · {o.fileName}
                  </p>
                </article>
              ))}
          </div>
          {orders.length === 0 && (
            <p className="empty">
              Todavía no hay pedidos. Crea una solicitud desde la portada.
            </p>
          )}
        </>
      )}
    </main>
  );
}
