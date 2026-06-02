import { stopSimulation, ROLE_LABELS, ROLE_COLORS } from "@/lib/simulation";
import { FlaskConical, X } from "lucide-react";

export default function SimulationBanner({ role }) {
  function exit() {
    stopSimulation();
    window.location.href = "/siteowner/simulador";
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-xs font-medium"
      style={{ background: ROLE_COLORS[role] + "22", borderBottom: `1px solid ${ROLE_COLORS[role]}44` }}
    >
      <div className="flex items-center gap-2" style={{ color: ROLE_COLORS[role] }}>
        <FlaskConical className="w-3.5 h-3.5" />
        <span>Simulação ativa — {ROLE_LABELS[role]}</span>
      </div>
      <button
        onClick={exit}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
        style={{ background: ROLE_COLORS[role] + "33", color: ROLE_COLORS[role] }}
      >
        <X className="w-3 h-3" /> Sair da simulação
      </button>
    </div>
  );
}