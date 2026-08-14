import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NX Estoque",
  description: "Nexora - Saida de materiais",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
