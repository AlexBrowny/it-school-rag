import type { Metadata } from "next";
import "../globals.css";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Админ-панель — Orbit IT School",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="bg-surface-2">{children}</body>
    </html>
  );
}
