"use client";
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { products, quote, money } from "@/lib/pricing.mjs";
export default function Home() {
  const [product, setProduct] = useState("copies"),
    [file, setFile] = useState<File | null>(null),
    [pages, setPages] = useState(0),
    [quantity, setQuantity] = useState(1),
    [color, setColor] = useState("bw"),
    [size, setSize] = useState("a4"),
    [binding, setBinding] = useState("none"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  let estimate: ReturnType<typeof quote> | null = null;
  try {
    estimate = quote({ product, quantity, pages, color, size, binding });
  } catch {}
  async function read(file: File | undefined) {
    setFile(null);
    setPages(0);
    setMessage("");
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error("Máximo 20 MB por archivo");
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      setFile(file);
      setPages(pdf.getPageCount());
    } catch (e) {
      setMessage(
        "No se puede leer este PDF: puede estar cifrado, dañado o superar el tamaño permitido.",
      );
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !estimate) return;
    setBusy(true);
    setMessage("Guardando el pedido…");
    const form = new FormData(e.currentTarget);
    form.set("file", file);
    for (const [k, v] of Object.entries({
      product,
      quantity,
      color,
      size,
      binding,
    }))
      form.set(k, String(v));
    try {
      const r = await fetch("/api/orders", { method: "POST", body: form }),
        data = await r.json();
      if (!r.ok) throw Error(data.error);
      location.assign(`/pedido/${data.id}#${data.token}`);
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main id="contenido">
      <section className="hero hero-split">
        <div>
          <p className="eyebrow">DEL ARCHIVO AL PAPEL</p>
          <h1>
            Tus ideas merecen
            <br />
            salir impresas.
          </h1>
          <p className="lead">
            Elige el formato, adjunta tu PDF y prepara una solicitud de
            impresión con el precio desglosado.
          </p>
          <div className="actions">
            <a className="button" href="#configurar">
              Preparar mi impresión →
            </a>
            <span className="tiny">Sin tarjeta · recogida en tienda</span>
          </div>
        </div>
        <div className="visual" style={{ background: "#ece6fa" }}>
          <div className="paper">
            <span className="eyebrow">PLIEGORA</span>
            <h3>
              Ideas que
              <br />
              se pueden tocar.
            </h3>
            <div
              style={{
                height: 90,
                background: "#b9a7ee",
                borderRadius: 4,
                margin: "20px 0",
              }}
            />
            <p>Tu próximo proyecto empieza con una hoja en blanco.</p>
            <small>DOCUMENTOS / FLYERS / CARTELES</small>
          </div>
        </div>
      </section>
      <div className="notice">
        Edición de ejemplo: las tarifas y el IVA del 21 % son datos de
        demostración. Guardar una solicitud no cobra ni envía nada a una
        imprenta real.
      </div>
      <section id="configurar">
        <h2>¿Qué vamos a imprimir?</h2>
        <div className="grid">
          {products.map((p) => (
            <button
              type="button"
              className="card"
              key={p.id}
              onClick={() => {
                setProduct(p.id);
                setQuantity(p.min);
              }}
              aria-pressed={product === p.id}
              style={{
                color: "#182526",
                display: "block",
                textAlign: "left",
                borderColor: product === p.id ? "#6350bb" : undefined,
                boxShadow: product === p.id ? "0 0 0 2px #6350bb" : undefined,
              }}
            >
              <span className="symbol">{p.icon}</span>
              <h3>{p.name}</h3>
              <p className="muted">{p.text}</p>
              <small>Desde {money(p.unit)} / unidad · antes de IVA</small>
            </button>
          ))}
        </div>
        <div className="layout" style={{ marginTop: 28 }}>
          <form className="panel stack" onSubmit={submit}>
            <h2>Configura tu pedido</h2>
            <label>
              Archivo PDF (máximo 20 MB)
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => read(e.target.files?.[0])}
              />
            </label>
            {file && (
              <p className="notice">
                {file.name} · {pages} {pages === 1 ? "página" : "páginas"} ·{" "}
                {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
            <div className="fields">
              <label>
                {product === "copies" ? "Ejemplares completos" : "Unidades"}
                <input
                  aria-label="Cantidad"
                  type="number"
                  min={products.find((p) => p.id === product)!.min}
                  max="5000"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
              {product === "copies" && (
                <>
                  <label>
                    Color
                    <select
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    >
                      <option value="bw">Blanco y negro</option>
                      <option value="color">Color</option>
                    </select>
                  </label>
                  <label>
                    Tamaño
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                    >
                      <option value="a4">A4</option>
                      <option value="a3">A3</option>
                    </select>
                  </label>
                  <label>
                    Acabado
                    <select
                      value={binding}
                      onChange={(e) => setBinding(e.target.value)}
                    >
                      <option value="none">Sin encuadernar</option>
                      <option value="spiral">
                        Espiral · 3,50 € / ejemplar
                      </option>
                    </select>
                  </label>
                </>
              )}
            </div>
            {product !== "copies" && (
              <p className="tiny">
                PDF de una página, impresión en color.{" "}
                {product === "posters"
                  ? "Formato A3."
                  : "Formato A4, mínimo 25 unidades."}
              </p>
            )}
            <hr className="divider" />
            <label>
              Nombre para la recogida
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="Nombre de ejemplo"
              />
            </label>
            <label>
              Contacto (opcional)
              <input
                name="contact"
                maxLength={150}
                placeholder="En la demo, utiliza datos ficticios"
              />
            </label>
            <p className="tiny">
              Al guardar se envían el PDF y estos datos al servidor de esta
              instalación. La URL de seguimiento es privada: consérvala y no la
              compartas.
            </p>
            <button disabled={busy || !estimate || !file}>
              {busy ? "Guardando…" : "Guardar solicitud de impresión"}
            </button>
            <p role="status" className="status">
              {message}
            </p>
          </form>
          <aside className="panel">
            <span className="eyebrow">TODO CLARO, ANTES DE PEDIR</span>
            <h2>Tu presupuesto</h2>
            {estimate ? (
              <>
                <p className="price">{money(estimate.total)}</p>
                <div className="row">
                  <span>Impresión y acabados</span>
                  <strong>{money(estimate.subtotal)}</strong>
                </div>
                <div className="row">
                  <span>IVA de ejemplo · 21 %</span>
                  <strong>{money(estimate.tax)}</strong>
                </div>
                <hr className="divider" />
                <p>
                  {quantity}{" "}
                  {product === "copies"
                    ? `ejemplares × ${pages} páginas`
                    : "unidades"}
                </p>
                <p className="tiny">
                  El servidor vuelve a leer el PDF y calcula el importe. No
                  utiliza el precio enviado por el navegador.
                </p>
              </>
            ) : (
              <p>
                Adjunta un PDF y elige una cantidad válida para calcular el
                presupuesto.
              </p>
            )}
            <p className="notice">
              Sin pago en línea. El estado inicial es Pendiente. La
              administración puede preparar el pedido y marcarlo como listo para
              recoger.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
