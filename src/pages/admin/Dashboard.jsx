import db from '@/lib/db';

import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { useEntityQuery } from '@/hooks/useSupabaseQuery';

import { useAuth } from "@/lib/AuthContext";
import { DollarSign, Scissors, TrendingUp, Clock, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ClientHeatmap from "@/components/dashboard/ClientHeatmap";

const TIMES_COUNT = 19; // approximate slots per day

const STATUS_CONFIG = {
  disponivel:     { label: "Disponível",    color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
  em_atendimento: { label: "Em atendimento",color: "text-primary",     bg: "bg-primary/10",     dot: "bg-primary" },
  preparando:     { label: "Preparando",    color: "text-amber-400",   bg: "bg-amber-500/10",   dot: "bg-amber-400" },
  ausente:        { label: "Ausente",       color: "text-red-400",     bg: "bg-red-500/10",     dot: "bg-red-400" },
  em_pausa:       { label: "Em pausa",      color: "text-amber-400",   bg: "bg-amber-500/10",   dot: "bg-amber-400" },
  finalizado:     { label: "Finalizado",    color: "text-muted-foreground", bg: "bg-muted",     dot: "bg-muted-foreground" },
};

const APPT_STATUS = {
  agendado:     { label: "Agendado",      color: "text-blue-400",    bg: "bg-blue-500/10" },
  confirmado:   { label: "Confirmado",    color: "text-primary",     bg: "bg-primary/10" },
  em_andamento: { label: "Em andamento",  color: "text-amber-400",   bg: "bg-amber-500/10" },
  concluido:    { label: "Concluído",     color: "text-emerald-400", bg: "bg-emerald-500/10" },
  cancelado:    { label: "Cancelado",     color: "text-red-400",     bg: "bg-red-500/10" },
  faltou:       { label: "Faltou/Ausente",color: "text-muted-foreground", bg: "bg-muted" },
};

function getAutoBarberStatus(barber, todayAppts) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const barberAppts = todayAppts
    .filter(a => a.barber_id === barber.id && !["cancelado", "faltou"].includes(a.status))
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  for (const appt of barberAppts) {
    if (!appt.time) continue;
    const [h, m] = appt.time.split(":").map(Number);
    const start = h * 60 + m;
    if (nowMin >= start && nowMin < start + 45) return "em_atendimento";
    if (nowMin >= start - 10 && nowMin < start) return "preparando";
  }
  const hasMore = barberAppts.some(a => {
    const [h, m] = (a.time || "23:59").split(":").map(Number);
    return h * 60 + m > nowMin;
  });
  if (!hasMore && now.getHours() >= 17) return "finalizado";
  return "disponivel";
}

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data: shops = [], isLoading: loadingShops } = useEntityQuery(
    'Shop',
    user?.email ? { owner_email: user.email } : {},
    { enabled: !!user?.email }
  );
  const shop = shops[0];

  const { data: barbers = [], isLoading: loadingBarbers } = useEntityQuery(
    'Barber',
    shop?.id ? { shop_id: shop.id } : {},
    { enabled: !!shop?.id }
  );

  const { data: allAppointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', barbers.map(b => b.id)],
    queryFn: async () => {
      if (barbers.length === 0) return [];
      const allA = [];
      for (const barber of barbers) {
        const a = await db.entities.Appointment.filter({ barber_id: barber.id }, "-date", 500);
        allA.push(...a);
      }
      return allA;
    },
    enabled: barbers.length > 0,
  });

  const { data: clients = [], isLoading: loadingClients } = useEntityQuery(
    'Client',
    shop?.id ? { shop_id: shop.id } : {},
    { enabled: !!shop?.id }
  );

  const [barberStatuses, setBarberStatuses] = useState({});
  const [aiInsights, setAiInsights] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const todayAppointments = allAppointments.filter(a => a.date === today);

  const loading = (
    loadingShops ||
    (!!shop && (
      loadingBarbers ||
      loadingClients ||
      (barbers.length > 0 && loadingAppointments)
    ))
  );

  async function generateInsights() {
    if (!shop) return;
    setLoadingAI(true);
    const completedAppts = allAppointments.filter(a => a.status === "concluido");
    const serviceCount = {};
    allAppointments.forEach(a => { if (a.service_name) serviceCount[a.service_name] = (serviceCount[a.service_name] || 0) + 1; });
    const topSvc = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    const stats = {
      totalAppointments: allAppointments.length,
      todayCount: todayAppointments.length,
      completed: completedAppts.length,
      cancelled: allAppointments.filter(a => a.status === "cancelado").length,
      noShow: allAppointments.filter(a => a.status === "faltou").length,
      revenue: completedAppts.reduce((s, a) => s + (a.price || 0), 0),
      avgTicket: completedAppts.length > 0 ? Math.round(completedAppts.reduce((s, a) => s + (a.price || 0), 0) / completedAppts.length) : 0,
      topServices: topSvc,
      uniqueClients: [...new Set(allAppointments.map(a => a.client_email))].length,
      cancellationRate: allAppointments.length > 0 ? Math.round((allAppointments.filter(a => a.status === "cancelado").length / allAppointments.length) * 100) : 0,
    };
    const res = await db.integrations.Core.InvokeLLM(/** @type {any} */ ({
      prompt: `Você é um consultor especialista em barbearias. Analise os dados reais desta barbearia: ${JSON.stringify(stats)}.
      Gere 4 insights práticos e específicos. Inclua: análise de horários de pico, otimização de equipe, recomendações baseadas na taxa de cancelamento e oportunidades de crescimento.
      Seja direto, acionável e use emojis.`,
      response_json_schema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                text: { type: "string" },
                type: { type: "string", enum: ["positive", "warning", "tip", "alert"] }
              }
            }
          }
        }
      },
    }));
    setAiInsights(res.insights || []);
    setLoadingAI(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!shop) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h2 className="text-xl font-bold mb-3">Nenhuma barbearia encontrada</h2>
      <p className="text-muted-foreground mb-6">Crie sua barbearia primeiro em "Minha Barbearia".</p>
      <Button asChild className="bg-primary text-primary-foreground rounded-xl">
        <a href="/admin/barbearia">Criar barbearia</a>
      </Button>
    </div>
  );

  // Real metrics from data
  const revenue = todayAppointments.filter(a => a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0);
  const completedToday = todayAppointments.filter(a => a.status === "concluido").length;
  const avgTicket = completedToday > 0 ? (revenue / completedToday).toFixed(0) : 0;
  const occupation = todayAppointments.length > 0 ? Math.round((completedToday / todayAppointments.length) * 100) : 0;
  const inProgress = todayAppointments.find(a => a.status === "em_andamento");

  // Real weekly revenue (last 7 days, concluded appointments only)
  const realWeekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const value = allAppointments
      .filter(a => a.status === "concluido" && a.date === ds)
      .reduce((s, a) => s + (a.price || 0), 0);
    return { day: d.toLocaleDateString("pt-BR", { weekday: "short" }), value };
  });

  // Real peak hours from all appointments
  const hourCount = {};
  allAppointments.forEach(a => {
    if (a.time) {
      const h = a.time.slice(0, 2) + "h";
      hourCount[h] = (hourCount[h] || 0) + 1;
    }
  });
  const peakHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];
  const idleRate = todayAppointments.length > 0
    ? Math.round(((TIMES_COUNT - todayAppointments.length) / TIMES_COUNT) * 100)
    : 100;

  const serviceCount = {};
  allAppointments.forEach(a => { if (a.service_name) serviceCount[a.service_name] = (serviceCount[a.service_name] || 0) + 1; });
  const topServices = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const insightColors = { positive: "border-emerald-500/20 bg-emerald-500/5", warning: "border-amber-500/20 bg-amber-500/5", tip: "border-primary/20 bg-primary/5", alert: "border-red-500/20 bg-red-500/5" };
  const insightDots = { positive: "bg-emerald-400", warning: "bg-amber-400", tip: "bg-primary", alert: "bg-red-400" };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-bold mt-0.5">Bom dia, {user?.full_name?.split(" ")[0] || "Admin"} 👋</h1>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Barbearia</p>
          <p className="font-semibold">{shop.name}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: DollarSign, label: "Faturamento hoje", value: `R$${revenue.toLocaleString()}`, sub: `${completedToday} serviço(s) concluído(s)`, color: "text-primary", bg: "bg-primary/10" },
          { icon: Scissors, label: "Cortes realizados", value: completedToday, sub: `de ${todayAppointments.length} agendados`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: TrendingUp, label: "Ticket médio", value: `R$${avgTicket}`, sub: "por atendimento hoje", color: "text-blue-400", bg: "bg-blue-500/10" },
          { icon: Clock, label: "Taxa de ocupação", value: `${occupation}%`, sub: "agenda do dia", color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <div key={i} className="p-5 rounded-2xl bg-card border border-border/50">
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Agenda hoje */}
        <div className="lg:col-span-2 space-y-4">
          {inProgress && (
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Em atendimento agora</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{inProgress.client_name || inProgress.client_email}</p>
                  <p className="text-sm text-muted-foreground">{inProgress.service_name} • {inProgress.time}</p>
                </div>
                {inProgress.price && <span className="text-primary font-bold">R${inProgress.price}</span>}
              </div>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Agenda de hoje</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{todayAppointments.length} agendamentos</span>
            </div>
            {todayAppointments.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum agendamento para hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayAppointments.slice(0, 7).map(a => {
                  const st = APPT_STATUS[a.status] || APPT_STATUS.agendado;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-all">
                      <span className="text-xs font-mono text-muted-foreground w-10 flex-shrink-0">{a.time}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.client_name || a.client_email}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.service_name}{a.price ? ` • R$${a.price}` : ""}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.color} flex-shrink-0`}>{st.label}</span>
                    </div>
                  );
                })}
                {todayAppointments.length > 7 && <p className="text-xs text-center text-muted-foreground pt-2">+{todayAppointments.length - 7} mais</p>}
              </div>
            )}
          </div>
        </div>

        {/* Barbeiros + IA */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold mb-4">Status dos barbeiros</h3>
            {barbers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum barbeiro cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {barbers.map(b => {
                  const autoStatus = getAutoBarberStatus(b, todayAppointments);
                  const status = barberStatuses[b.id] || autoStatus;
                  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.disponivel;
                  return (
                    <div key={b.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {b.photo ? <img src={b.photo} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary/50">{b.name?.[0]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                          <span className={`text-xs ${conf.color}`}>{conf.label}</span>
                          {!barberStatuses[b.id] && <span className="text-[9px] text-muted-foreground/50">(auto)</span>}
                        </div>
                      </div>
                      <select value={status} onChange={e => setBarberStatuses(s => ({ ...s, [b.id]: e.target.value }))}
                        className="text-xs bg-muted border-0 rounded-lg px-2 py-1 text-muted-foreground cursor-pointer">
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick operational stats from real data */}
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold mb-3">Indicadores operacionais</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Horário de pico</span>
                <span className="font-semibold">{peakHour ? `${peakHour[0]} (${peakHour[1]}x)` : "—"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Taxa de conclusão</span>
                <span className="font-semibold text-emerald-400">
                  {allAppointments.length > 0 ? Math.round((allAppointments.filter(a => a.status === "concluido").length / allAppointments.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Taxa de cancelamento</span>
                <span className="font-semibold text-red-400">
                  {allAppointments.length > 0 ? Math.round((allAppointments.filter(a => a.status === "cancelado").length / allAppointments.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Taxa de faltas</span>
                <span className="font-semibold text-amber-400">
                  {allAppointments.length > 0 ? Math.round((allAppointments.filter(a => a.status === "faltou").length / allAppointments.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Clientes únicos</span>
                <span className="font-semibold">{[...new Set(allAppointments.map(a => a.client_email))].length}</span>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">IA Insights</h3>
              </div>
              <button onClick={generateInsights} disabled={loadingAI}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${loadingAI ? "animate-spin" : ""}`} />
                {loadingAI ? "Analisando..." : "Gerar"}
              </button>
            </div>
            {aiInsights.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clique "Gerar" para insights baseados nos seus dados reais de agendamentos.
              </p>
            ) : (
              <div className="space-y-3">
                {aiInsights.map((insight, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${insightColors[insight.type] || insightColors.tip}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${insightDots[insight.type] || insightDots.tip}`} />
                      <p className="text-xs font-semibold">{insight.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart (real data) + Summary */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold mb-1">Faturamento — últimos 7 dias</h3>
          <p className="text-xs text-muted-foreground mb-4">Apenas agendamentos com status "Concluído"</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realWeekData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,55%)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,55%)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(220,18%,10%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "10px", fontSize: 12 }} formatter={(v) => [`R$${v}`, "Faturamento"]} />
                <Area type="monotone" dataKey="value" stroke="hsl(38,92%,50%)" strokeWidth={2} fill="url(#goldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold mb-4">Resumo geral</h3>
          <div className="space-y-3">
            {[
              { label: "Total de agendamentos", value: allAppointments.length },
              { label: "Atendimentos concluídos", value: allAppointments.filter(a => a.status === "concluido").length },
              { label: "Cancelamentos", value: allAppointments.filter(a => a.status === "cancelado").length },
              { label: "Faltas / Ausências", value: allAppointments.filter(a => a.status === "faltou").length },
              { label: "Faturamento total", value: `R$${allAppointments.filter(a => a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0).toLocaleString()}` },
              { label: "Clientes únicos", value: [...new Set(allAppointments.map(a => a.client_email))].length },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Serviços + Barbeiros */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold mb-4">Serviços mais realizados</h3>
          {topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados ainda.</p>
          ) : (
            <div className="space-y-3">
              {topServices.map(([name, count]) => {
                const max = topServices[0][1];
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">{count}x</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <h3 className="font-semibold mb-4">Performance por barbeiro</h3>
          {barbers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum barbeiro cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {barbers.map(b => {
                const bAppts = allAppointments.filter(a => a.barber_id === b.id && a.status === "concluido");
                const bRev = bAppts.reduce((s, a) => s + (a.price || 0), 0);
                const maxRev = Math.max(...barbers.map(bb => allAppointments.filter(a => a.barber_id === bb.id && a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0)), 1);
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-muted-foreground">{bAppts.length} cortes • R${bRev}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(bRev / maxRev) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Geo Heatmap with real client data */}
      <ClientHeatmap clients={clients} />
    </div>
  );
}