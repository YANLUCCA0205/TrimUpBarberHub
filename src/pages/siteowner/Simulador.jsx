import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, User, Scissors, LayoutDashboard, FlaskConical, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSimulation, getSimulation, stopSimulation, ROLE_LABELS, ROLE_COLORS } from "@/lib/simulation";

const ROLES = [
  {
    key: "user",
    label: "Cliente",
    subtitle: "USER",
    icon: User,
    description: "Veja o marketplace, agenda de serviços e painel do cliente.",
    redirect: "/",
    perms: ["Marketplace", "Agendar serviços", "Histórico", "Perfil pessoal"],
    blocked: ["Painel admin", "CRM", "Financeiro", "Agenda administrativa"],
  },
  {
    key: "barber",
    label: "Barbeiro",
    subtitle: "BARBER",
    icon: Scissors,
    description: "Acesse a agenda do barbeiro, clientes próprios e desempenho.",
    redirect: "/barber-dashboard",
    perms: ["Agenda própria", "Clientes atendidos", "Histórico pessoal", "Perfil"],
    blocked: ["Financeiro geral", "CRM completo", "Outros barbeiros", "Config. barbearia"],
  },
  {
    key: "admin",
    label: "Administrador",
    subtitle: "ADMIN",
    icon: LayoutDashboard,
    description: "Painel completo da barbearia — KPIs, agenda, CRM e analytics.",
    redirect: "/admin",
    perms: ["Dashboard completo", "Agenda", "CRM de clientes", "Analytics", "Barbeiros", "Produtos"],
    blocked: ["Dados de outras barbearias", "Painel da plataforma"],
  },
];

export default function SiteOwnerSimulador() {
  const navigate = useNavigate();
  const [currentSim, setCurrentSim] = useState(null);

  useEffect(() => {
    setCurrentSim(getSimulation());
  }, []);

  function enter(role) {
    startSimulation(role);
    window.location.href = ROLES.find(r => r.key === role).redirect;
  }

  function exit() {
    stopSimulation();
    setCurrentSim(null);
    window.location.reload();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" /> Simulador de Ambiente
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Navegue pelo sistema exatamente como cada perfil enxerga. Use dados de demonstração.
        </p>
      </div>

      {/* Active simulation warning */}
      {currentSim?.active && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">Simulação ativa: {ROLE_LABELS[currentSim.role]}</p>
              <p className="text-xs text-muted-foreground">Você está em modo simulação. A interface está mostrando a perspectiva deste perfil.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exit} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            Encerrar simulação
          </Button>
        </div>
      )}

      <div className="mb-4 p-4 rounded-xl bg-muted/20 border border-border/30 flex items-start gap-3">
        <Monitor className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ao entrar em modo simulação, toda a interface — navegação, menus, dashboards e permissões — será trocada para refletir exatamente o que aquela role enxerga. Nenhum dado real de clientes é utilizado.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {ROLES.map(role => {
          const Icon = role.icon;
          const color = ROLE_COLORS[role.key];
          const isActive = currentSim?.role === role.key && currentSim?.active;
          return (
            <div
              key={role.key}
              className={`rounded-2xl bg-card border transition-all ${isActive ? "border-primary/40" : "border-border/50"}`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "20" }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Ativo</span>
                  )}
                </div>
                <h3 className="font-bold text-base">{role.label}</h3>
                <p className="text-[10px] font-mono text-muted-foreground mb-2">{role.subtitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{role.description}</p>

                <div className="space-y-1 mb-4">
                  {role.perms.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span>{p}</span>
                    </div>
                  ))}
                  {role.blocked.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground/50 line-through">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted flex-shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => enter(role.key)}
                  className="w-full gap-2 text-sm"
                  style={isActive ? {} : { background: color + "22", color, border: `1px solid ${color}44` }}
                  variant={isActive ? "default" : "outline"}
                >
                  {isActive ? "Entrar novamente" : `Entrar como ${role.label}`}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}