"use client";

import { useEffect, useState } from "react";
import { HybridSim, SellerFinanceSim, SubjectToSim } from "@/components/lab/StructureSims";
import { BrrrrSim, FlipSim, LeaseOptionSim, PartnersSim, WrapSim } from "@/components/lab/OtherSims";
import { Disclaimer, PageHeader, Tabs } from "@/components/ui";

const TABS = [
  { id: "subject_to", label: "Subject-To" },
  { id: "seller_finance", label: "Seller Financing" },
  { id: "hibrido", label: "Híbrido" },
  { id: "wrap", label: "Wraparound" },
  { id: "lease_option", label: "Lease Option" },
  { id: "socios", label: "Socios y prestamistas" },
  { id: "brrrr", label: "BRRRR" },
  { id: "flip", label: "Fix and Flip" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function LaboratorioPage() {
  const [tab, setTab] = useState<TabId>("subject_to");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t as TabId);
  }, []);
  const change = (t: TabId) => {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  };
  return (
    <>
      <PageHeader
        eyebrow="Laboratorio de Estrategias"
        title="Simuladores especializados"
        description="Una calculadora distinta para cada estrategia. Cambia cualquier número y los resultados se recalculan al instante con el mismo motor financiero que usa toda la plataforma."
      />
      <Tabs label="Estrategia" value={tab} onChange={change} tabs={TABS.map((t) => ({ id: t.id, label: t.label }))} />
      <div className="mt-5">
        {tab === "subject_to" && <SubjectToSim />}
        {tab === "seller_finance" && <SellerFinanceSim />}
        {tab === "hibrido" && <HybridSim />}
        {tab === "wrap" && <WrapSim />}
        {tab === "lease_option" && <LeaseOptionSim />}
        {tab === "socios" && <PartnersSim />}
        {tab === "brrrr" && <BrrrrSim />}
        {tab === "flip" && <FlipSim />}
      </div>
      <div className="mt-6">
        <Disclaimer />
      </div>
    </>
  );
}
