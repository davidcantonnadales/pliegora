import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Pliegora · edición abierta",
  description: "Una aplicación abierta y configurable, de David Cantón.",
  icons: { icon: "/logo.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ "--accent": "#6350bb" } as React.CSSProperties}>
        <a className="skip" href="#contenido">
          Saltar al contenido
        </a>
        <header>
          <a className="brand" href="/">
            <img src="/logo.svg" alt="" />
            Pliegora
          </a>
          <nav>
            <a href="/#configurar">Configurar pedido</a>
            <a href="/admin">Administración</a>
          </nav>
        </header>
        {children}
        <footer>
          <span>Pliegora · Edición abierta · David Cantón</span>
          <a href="https://github.com/davidcantonnadales/pliegora">
            Código y documentación ↗
          </a>
        </footer>
      </body>
    </html>
  );
}
