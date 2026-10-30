import { Suspense } from "react";
import { ReportView } from "./ReportView";

export const metadata = { title: "Reporte de inversión" };

export default function ReportePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando reporte…</p>}>
      <ReportView />
    </Suspense>
  );
}
