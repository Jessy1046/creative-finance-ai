"use client";

import { forwardRef, useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Info } from "lucide-react";
import { toCents, fromCents } from "@/domain/money";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, title, subtitle, actions }: { children?: ReactNode; className?: string; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-border bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-text">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-primary text-primary-fg hover:brightness-110",
        variant === "secondary" && "border border-border bg-surface text-text hover:bg-surface-2",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-text",
        variant === "danger" && "border border-border bg-surface text-danger hover:bg-danger-bg",
        className,
      )}
    />
  );
});

export type Tone = "neutral" | "positive" | "warning" | "danger" | "info";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium",
        tone === "neutral" && "bg-surface-2 text-muted",
        tone === "positive" && "bg-positive-bg text-positive",
        tone === "warning" && "bg-warning-bg text-warning",
        tone === "danger" && "bg-danger-bg text-danger",
        tone === "info" && "bg-info-bg text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, tone, help }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "positive" | "danger" | "warning"; help?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-1 text-[12.5px] text-muted">
        {label}
        {help && <Tip text={help} />}
      </div>
      <div className={cx("num mt-1 truncate text-xl font-semibold", tone === "positive" && "text-positive", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

export function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info aria-hidden className="h-3.5 w-3.5 cursor-help text-muted" />
      <span className="sr-only">{text}</span>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-normal leading-snug text-text shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

/** Campo numérico: dinero (escribe dólares, guarda centavos), porcentaje (escribe %, guarda fracción) o entero. */
export function NumberField({
  label,
  value,
  onChange,
  kind = "money",
  help,
  term,
  placeholder,
  min = 0,
  allowNull = false,
  adornment,
}: {
  label: ReactNode;
  value: number | null;
  onChange: (v: number | null) => void;
  kind?: "money" | "percent" | "int";
  help?: string;
  term?: string;
  placeholder?: string;
  min?: number;
  allowNull?: boolean;
  adornment?: ReactNode;
}) {
  const id = useId();
  const toText = (v: number | null) =>
    v === null ? "" : kind === "money" ? String(fromCents(v)) : kind === "percent" ? String(+(v * 100).toFixed(4)) : String(v);
  const [text, setText] = useState(toText(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, kind]);

  const commit = (t: string) => {
    const clean = t.replace(/[$,%\s]/g, "");
    if (clean === "") return onChange(allowNull ? null : 0);
    const n = Number(clean);
    if (!Number.isFinite(n) || n < min) return;
    onChange(kind === "money" ? toCents(n) : kind === "percent" ? n / 100 : Math.round(n));
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-muted">
        <span className="truncate">{label}</span>
        {term && <span className="font-normal italic opacity-80">· {term}</span>}
        {help && <Tip text={help} />}
      </label>
      <div className="flex h-10 items-center rounded-lg border border-border bg-surface focus-within:border-accent">
        {kind === "money" && <span className="pl-3 text-sm text-muted">$</span>}
        <input
          id={id}
          inputMode="decimal"
          className="num h-full w-full min-w-0 bg-transparent px-2.5 text-sm text-text outline-none placeholder:text-muted/60"
          value={text}
          placeholder={placeholder ?? (allowNull ? "Pendiente" : "0")}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(text);
          }}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
        />
        {kind === "percent" && <span className="pr-3 text-sm text-muted">%</span>}
        {adornment}
      </div>
    </div>
  );
}

export function Select<T extends string>({ label, value, onChange, options, help }: { label: ReactNode; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; help?: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-muted">
        {label}
        {help && <Tip text={help} />}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text outline-none focus:border-accent">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, maxLength = 200 }: { label: ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[12.5px] font-medium text-muted">
        {label}
      </label>
      <input id={id} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text outline-none focus:border-accent" />
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: ReactNode; badge?: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="no-print -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className={cx(
            "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
            t.id === value ? "border-accent font-semibold text-text" : "border-transparent text-muted hover:text-text",
          )}
        >
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: Tone; title?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-lg px-4 py-3 text-[13.5px] leading-relaxed",
        tone === "info" && "bg-info-bg text-text",
        tone === "warning" && "bg-warning-bg text-text",
        tone === "danger" && "bg-danger-bg text-text",
        tone === "positive" && "bg-positive-bg text-text",
        tone === "neutral" && "bg-surface-2 text-text",
      )}
    >
      {title && <div className="mb-0.5 font-semibold">{title}</div>}
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Row({ label, value, strong, tone, sub }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: "positive" | "danger"; sub?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-1.5 text-sm", strong && "border-t border-border pt-2.5 font-semibold", sub && "pl-3 text-muted")}>
      <span className="min-w-0">{label}</span>
      <span className={cx("num shrink-0", tone === "positive" && "text-positive", tone === "danger" && "text-danger")}>{value}</span>
    </div>
  );
}

export function Disclaimer({ children }: { children?: ReactNode }) {
  return (
    <p className="text-[12px] leading-relaxed text-muted">
      {children ??
        "Contenido educativo. No es asesoría legal, fiscal ni financiera, ni una aprobación de compra. Los resultados dependen de supuestos visibles; verifica cada dato y consulta a profesionales con licencia en tu estado."}
    </p>
  );
}
