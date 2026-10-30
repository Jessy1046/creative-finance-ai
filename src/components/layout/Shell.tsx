"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  Calculator,
  FlaskConical,
  GitCompare,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldAlert,
  Sun,
  Wrench,
  X,
} from "lucide-react";
import { Badge, cx } from "@/components/ui";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; phase2?: boolean }[] = [
  { href: "/", label: "Mi Dashboard", icon: LayoutDashboard },
  { href: "/academia", label: "Academia Creativa", icon: BookOpen },
  { href: "/analizar", label: "Analizar Propiedad", icon: Calculator },
  { href: "/laboratorio", label: "Laboratorio de Estrategias", icon: FlaskConical },
  { href: "/comparador", label: "Comparador de Financiamiento", icon: GitCompare },
  { href: "/ingeniero", label: "Ingeniero de Tratos AI", icon: Wrench },
  { href: "/negociacion", label: "Simulador de Negociación AI", icon: Handshake },
  { href: "/riesgos", label: "Analizador de Riesgos", icon: ShieldAlert },
  { href: "/salida", label: "Plan de Salida", icon: LogOut },
  { href: "/propiedades", label: "Mis Propiedades", icon: Building2 },
  { href: "/progreso", label: "Mi Progreso", icon: BarChart3 },
  { href: "/asistente", label: "Asistente AI", icon: Bot },
  { href: "/instructor", label: "Panel del Instructor", icon: GraduationCap, phase2: true },
];

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cfai:theme", next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

function useAiStatus() {
  const [mode, setMode] = useState<"ia" | "demo" | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { mode: "ia" | "demo" }) => setMode(d.mode))
      .catch(() => setMode("demo"));
  }, []);
  return mode;
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const ai = useAiStatus();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <nav aria-label="Menú principal" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
              active ? "bg-white/10 font-semibold text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon aria-hidden className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.phase2 && <span className="ml-auto rounded bg-white/10 px-1.5 text-[10.5px] text-white/70">Fase 2</span>}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2.5 px-1.5">
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M3 11.5 12 4l9 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10v9h12v-9" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 16l2.2-2.4 1.8 1.6L16 12" stroke="#3ccf95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[14px] font-semibold text-white">Creative Finance AI</span>
        <span className="block text-[11.5px] text-white/60">by Latinos Creativos</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto bg-[#0b2350] px-3 py-5 lg:flex dark:bg-[#071630]">
        {brand}
        {nav}
        <p className="mt-auto px-2 text-[11px] leading-snug text-white/50">Plataforma educativa. No es asesoría legal, fiscal ni financiera.</p>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button aria-label="Cerrar menú" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col gap-6 overflow-y-auto bg-[#0b2350] px-3 py-5 dark:bg-[#071630]">
            <div className="flex items-center justify-between">
              {brand}
              <button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-white/80 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6">
          <button aria-label="Abrir menú" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold lg:hidden">Creative Finance AI</span>
          <div className="ml-auto flex items-center gap-2">
            {ai && (
              <Badge tone={ai === "ia" ? "positive" : "warning"}>
                {ai === "ia" ? "IA conectada" : "Modo demostración"}
              </Badge>
            )}
            <button aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} onClick={toggle} className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-text">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <main className="fade-in mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
