import type { Metadata, Viewport } from "next";
import { Geist, Lora } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["cyrillic", "latin"] });
const lora = Lora({ variable: "--font-lora", weight: ["500", "600"], style: ["normal", "italic"], subsets: ["cyrillic", "latin"] });

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f3eee2" };

export const metadata: Metadata = {
  title: "Библейская карта — Писание во времени и пространстве",
  description: "Интерактивная карта библейской истории: события, места, маршруты и точные ссылки на Священное Писание.",
  applicationName: "Библейская карта",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/icon-192.svg" },
  openGraph: { title: "Библейская карта", description: "Писание во времени и пространстве", type: "website", locale: "ru_RU" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body className={`${geist.variable} ${lora.variable}`}>{children}</body></html>;
}
