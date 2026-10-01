import { stopSimulation, ROLE_LABELS, ROLE_COLORS } from "@/lib/simulation";
import { resetSandboxDb } from "@/lib/sandboxDb";
import { FlaskConical, X, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function SimulationBanner({ role }) {
  function exit() {
    stopSimulation();
    window.location.href = "/siteowner/simulador";
  }

  function handleReset() {
    resetSandboxDb();
    toast.success("Dados do ambiente Sandbox resetados com sucesso!");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between px-4 py-2 text-xs font-medium gap-2 z-50 relative"
      style={{ background: ROLE_COLORS[role] + "22", borderBottom: `1px solid ${ROLE_COLORS[role]}44` }}
    >
      <div className="flex items-center gap-3" style={{ color: ROLE_COLORS[role] }}>
        <div className="flex items-center gap-1.5 font-bold">
          <FlaskConical className="w-4 h-4" />
          <span>Simulação ativa: {ROLE_LABELS[role]}</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] opacity-80 border-l pl-3 border-current">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sandbox Isolado (Zero alterações no banco de produção)</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          title="Restaura os dados mockados de demonstração"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all hover:opacity-80 bg-slate-800/80 text-slate-200 border border-slate-700 hover:bg-slate-700"
        >
          <RotateCcw className="w-3 h-3" /> Resetar Dados Mock
        </button>
        <button
          onClick={exit}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all hover:opacity-80 font-bold"
          style={{ background: ROLE_COLORS[role] + "44", color: ROLE_COLORS[role] }}
        >
          <X className="w-3.5 h-3.5" /> Sair da simulação
        </button>
      </div>
    </div>
  );
}