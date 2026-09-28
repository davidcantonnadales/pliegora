"use client";
import { useEffect, useState, use } from "react";
import type { Order } from "@/lib/orders";
import { money, labels } from "@/lib/pricing.mjs";
export default function Pedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    [order, setOrder] = useState<Order | null>(null),
    [message, setMessage] = useState("Cargando pedido…");
  async function refresh() {
    const r = await fetch("/api/orders/" + id, {
        headers: { Authorization: "Bearer " + location.hash.slice(1) },
      }),
      d = await r.json();
    if (r.ok) {
      setOrder(d);
      setMessage("Estado actualizado");
    } else setMessage(d.error);
  }
  useEffect(() => {
    refresh();
  }, [id]);
  return (
    <main id="contenido">
      <p className="eyebrow">TU SOLICITUD</p>
      <h1>{order ? "Ya está guardada." : "Seguimiento del pedido"}</h1>
      {order && (
        <section className="panel stack">
          <span className="badge">{labels[order.status]}</span>
          <h2>{order.name}, este es tu resumen.</h2>
          <p>
            {order.fileName} · {order.price.pages} páginas ·{" "}
            {order.price.quantity} ejemplares
          </p>
          <strong className="price">{money(order.price.total)}</strong>
          <p>Importe de ejemplo. No se ha realizado ningún cobro.</p>
          <p className="notice">
            Guarda esta URL completa: contiene tu acceso privado al pedido. Si
            la pierdes, pide ayuda a la administración de esta instalación.
          </p>
          <button className="secondary" onClick={refresh}>
            Actualizar estado
          </button>
          <small>Referencia: {order.id}</small>
        </section>
      )}
      <p role="status">{message}</p>
      <a href="/">← Preparar otro pedido</a>
    </main>
  );
}
