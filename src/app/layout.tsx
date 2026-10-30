import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Shell } from "@/components/layout/Shell";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Creative Finance AI", template: "%s · Creative Finance AI" },
  description: "Academia, simulador y analista de financiamiento creativo en bienes raíces para la comunidad de Latinos Creativos.",
  manifest: "/manifest.webmanifest",
  applicationName: "Creative Finance AI",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b2350" },
    { media: "(prefers-color-scheme: dark)", color: "#071630" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Aplica el tema antes de pintar para evitar parpadeo.
const themeScript = `try{var t=localStorage.getItem("cfai:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
          Saltar al contenido
        </a>
        <Shell>
          <div id="contenido">{children}</div>
        </Shell>
      </body>
    </html>
  );
}
