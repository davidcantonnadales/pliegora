import { test } from "node:test";
import assert from "node:assert/strict";
import { quote, canTransition } from "../src/lib/pricing.mjs";
const base = {
  product: "copies",
  quantity: 2,
  pages: 2,
  color: "bw",
  size: "a4",
  binding: "none",
};
test("precios enteros en céntimos, IVA redondeado y espiral por ejemplar", () => {
  assert.equal(quote(base).total, 48);
  assert.equal(quote({ ...base, binding: "spiral" }).subtotal, 740);
  assert.equal(quote({ ...base, color: "color", size: "a3" }).subtotal, 240);
});
test("rechaza valores no válidos, páginas manipuladas y mínimos", () => {
  for (const data of [
    { quantity: -1 },
    { quantity: 1.5 },
    { quantity: NaN },
    { pages: 0 },
    { pages: 501 },
    { color: "gratis" },
    { product: "otro" },
    { product: "flyers", quantity: 1, pages: 1 },
  ])
    assert.throws(() => quote({ ...base, ...data }));
  assert.throws(() => quote({ ...base, product: "posters" }));
});
test("descuentos por tramo y transiciones sin volver a estados anteriores", () => {
  assert.equal(quote({ ...base, quantity: 100, pages: 1 }).unit, 9);
  assert.equal(quote({ ...base, quantity: 500, pages: 1 }).unit, 8);
  assert.equal(canTransition("pending", "printing"), true);
  assert.equal(canTransition("pending", "collected"), false);
  assert.equal(canTransition("collected", "pending"), false);
});
