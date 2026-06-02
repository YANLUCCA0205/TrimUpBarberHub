const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh.jsx";

import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Calendar, Clock, Star, Sparkles, ArrowRight, TrendingUp, Scissors, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_MAP = {
  agendado: { label: "Agendado", color: "bg-blue-500/10 text-blue-400" },
  confirmado: { label: "Confirmado", color: "bg-emerald-500/10 text-emerald-400" },
  concluido: { label: "Concluído", color: "bg-muted text-muted-foreground" },
  cancelado: { label: "Cancelado", color: "bg-red-500/10 text-red-400" },
  no_show: { label: "No-show", color: "bg-orange-500/10 text-orange-400" },
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [cancelling, setCancelling] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const apts = await db.entities.Appointment.filter({ client_email: user.email }, "-date", 20);
    setAppointments(apts);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const { indicator } = usePullToRefresh(loadData);

  async function cancelAppointment(id) {
    setCancelling(id);
    await db.entities.Appointment.update(id, { status: "cancelado" });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelado" } : a));
    setCancelling(null);
  }

  const upcoming = appointments.filter(a => ["agendado", "confirmado"].includes(a.status));
  const history = appointments.filter(a => ["concluido", "cancelado", "no_show"].includes(a.status));
  const totalSpent = history.filter(a => a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0);
  const completedCuts = history.filter(a => a.status === "concluido").length;

  const firstName = user?.full_name?.split(" ")[0] || "Cliente";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  // Simple AI-like recommendation based on data
  const lastApt = appointments.find(a => a.status === "concluido");
  const daysSinceLast = lastApt
    ? Math.floor((Date.now() - new Date(lastApt.date)) / 86400000)
    : null;
  const aiMessage = daysSinceLast === null
    ? "Agende seu primeiro corte e comece sua jornada premium conosco."
    : daysSinceLast > 20
    ? `Já faz ${daysSinceLast} dias desde seu último corte. Está na hora de renovar o visual! 💈`
    : `Seu último corte foi há ${daysSinceLast} dias. Você está em dia! Que tal explorar um novo estilo?`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {indicator}
      {/* Header */}
      <div className="mb-8">
        <p className="text-muted-foreground text-sm mb-1">{greeting},</p>
        <h1 className="text-2xl md:text-3xl font-bold">{firstName} ✂️</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Scissors, label: "Cortes", value: completedCuts },
          { icon: TrendingUp, label: "Total gasto", value: `R$${totalSpent.toFixed(0)}` },
          { icon: Star, label: "Avaliações", value: history.filter(a => a.rating).length },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm text-primary">Insight IA</h3>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{aiMessage}</p>
        <Link to="/" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
          Explorar barbearias <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Upcoming */}
      <div className="mb-8">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Próximos agendamentos</h2>
        {upcoming.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card/50 border border-border/30 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Nenhum agendamento futuro</p>
            <Link to="/">
              <Button size="sm" className="rounded-xl">Agendar agora</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(apt => (
              <div key={apt.id} className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{apt.service_name}</p>
                    <p className="text-sm text-muted-foreground">{apt.barber_name}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{apt.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.time}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_MAP[apt.status]?.color}`}>
                      {STATUS_MAP[apt.status]?.label}
                    </span>
                    {apt.price && <span className="text-sm font-bold text-primary">R$ {apt.price.toFixed(2)}</span>}
                    <button
                      onClick={() => cancelAppointment(apt.id)}
                      disabled={cancelling === apt.id}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />{cancelling === apt.id ? "Cancelando..." : "Cancelar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Histórico</h2>
          <div className="space-y-2">
            {history.slice(0, 5).map(apt => (
              <div key={apt.id} className="flex items-center justify-between p-3 rounded-xl bg-card/30 border border-border/20 hover:border-border/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{apt.service_name}</p>
                    <p className="text-xs text-muted-foreground">{apt.date} · {apt.barber_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {apt.rating && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      <span className="text-xs">{apt.rating}</span>
                    </div>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[apt.status]?.color}`}>
                    {STATUS_MAP[apt.status]?.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}