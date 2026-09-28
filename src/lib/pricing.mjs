export const products = [
  {
    id: "copies",
    name: "Documentos",
    icon: "▤",
    text: "Apuntes, dosieres y documentos. Desde un PDF.",
    unit: 10,
    min: 1,
  },
  {
    id: "flyers",
    name: "Flyers",
    icon: "◩",
    text: "Pequeñas ideas que pasan de mano en mano.",
    unit: 18,
    min: 25,
  },
  {
    id: "posters",
    name: "Carteles",
    icon: "▧",
    text: "Diseños para mirar a lo grande. Formato A3.",
    unit: 250,
    min: 1,
  },
];
export function quote(input) {
  const p = products.find((p) => p.id === input.product);
  if (!p) throw new Error("Producto no válido");
  const qty = Number(input.quantity),
    pages = Number(input.pages);
  if (!Number.isInteger(qty) || qty < p.min || qty > 5000)
    throw new Error(`Cantidad entre ${p.min} y 5000`);
  if (!Number.isInteger(pages) || pages < 1 || pages > 500)
    throw new Error("El PDF debe tener entre 1 y 500 páginas");
  if (p.id !== "copies" && pages !== 1)
    throw new Error("Para flyers y carteles utiliza un PDF de una sola página");
  if (
    !["bw", "color"].includes(input.color) ||
    !["a4", "a3"].includes(input.size) ||
    !["none", "spiral"].includes(input.binding)
  )
    throw new Error("Configuración no válida");
  const sheets = qty * pages;
  const discount = sheets >= 500 ? 0.8 : sheets >= 100 ? 0.9 : 1;
  const unit =
    p.id === "copies"
      ? Math.round(
          p.unit *
            (input.color === "color" ? 3 : 1) *
            (input.size === "a3" ? 2 : 1) *
            discount,
        )
      : p.unit;
  const binding =
    p.id === "copies" && input.binding === "spiral" ? 350 * qty : 0;
  const subtotal = unit * qty * (p.id === "copies" ? pages : 1) + binding;
  const tax = Math.round(subtotal * 0.21);
  return {
    unit,
    subtotal,
    tax,
    total: subtotal + tax,
    pages,
    quantity: qty,
    product: p.id,
    color: p.id === "copies" ? input.color : "color",
    size: p.id === "posters" ? "a3" : p.id === "flyers" ? "a4" : input.size,
    binding: p.id === "copies" ? input.binding : "none",
  };
}
export const money = (cents) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export const states = [
  "pending",
  "printing",
  "ready",
  "collected",
  "cancelled",
];
/** @type {Record<string,string>} */
export const labels = {
  pending: "Pendiente",
  printing: "En impresión",
  ready: "Listo para recoger",
  collected: "Recogido",
  cancelled: "Cancelado",
};
export function canTransition(from, to) {
  return (
    {
      pending: ["printing", "cancelled"],
      printing: ["ready", "cancelled"],
      ready: ["collected", "cancelled"],
      collected: [],
      cancelled: [],
    }[from] || []
  ).includes(to);
}
