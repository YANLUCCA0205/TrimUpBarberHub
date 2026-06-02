import db from '@/lib/db';

import { useState, useEffect } from "react";

import { Store, Users, Scissors, Calendar, TrendingUp, DollarSign, BarChart2, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function SiteOwnerDashboard() {
  const [shops, setShops] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [clients, setClients] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [shopList, barberList, clientList, subList, planList] = await Promise.all([
        db.entities.Shop.list("-created_at", 500),
        db.entities.Barber.list("-created_at", 500),
        db.entities.Client.list("-created_at", 1000),
        db.entities.Subscription.list("-created_at", 500),
        db.entities.Plan.list("-created_at", 20),
      ]);
      setShops(shopList);
      setBarbers(barberList);
      setClients(clientList);
      setSubscriptions(subList);
      setPlans(planList);
      setLoading(false);
    }
    load();
  }, []);

  const shopMap = Object.fromEntries(shops.map(s => [s.id, s]));
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));

  const activeSubs = subscriptions.filter(s => s.status === "active" || s.status === "trial");
  const mrr = activeSubs.reduce((sum, s) => sum + (s.monthly_value || 0), 0);
  const arr = mrr * 12;

  // Group subscriptions by plan name
  const planCounts = {};
  subscriptions.forEach(s => {
    const name = planMap[s.plan_id]?.name || "Free";
    planCounts[name] = (planCounts[name] || 0) + 1;
  });

  // Monthly subscription growth (last 6 months)
  const monthMap = {};
  subscriptions.forEach(s => {
    if (!s.start_date) return;
    const m = s.start_date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { month: m, novas: 0, canceladas: 0 };
    monthMap[m].novas++;
    if (s.status === "cancelled") monthMap[m].canceladas++;
  });
  const monthlyData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
    .map(d => ({ ...d, month: d.month.slice(5) }));

  const planChartData = Object.entries(planCounts).map(([name, count]) => ({ name, assinaturas: count }));

  const kpis = [
    { icon: Store, label: "Barbearias", value: shops.length, color: "#6366f1" },
    { icon: Scissors, label: "Barbeiros", value: barbers.length, color: "#D4A017" },
    { icon: Users, label: "Clientes", value: clients.length, color: "#10b981" },
    { icon: Calendar, label: "Assinaturas Ativas", value: activeSubs.length, color: "#3b82f6" },
    { icon: DollarSign, label: "MRR", value: `R$${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "#f59e0b" },
    { icon: Activity, label: "ARR", value: `R$${arr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "#ec4899" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">Visão geral</p>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Painel da Plataforma
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Métricas calculadas a partir das assinaturas reais</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {kpis.map((k, i) => (
          <div key={i} className="p-5 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.color + "20" }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <div className="text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Monthly growth chart */}
        {monthlyData.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Crescimento de Assinaturas</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="novas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Novas" />
                <Line type="monotone" dataKey="canceladas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Canceladas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distribution by plan */}
        {planChartData.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Distribuição por Plano</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={planChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="assinaturas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent subscriptions */}
      <div className="rounded-2xl bg-card border border-border/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Assinaturas Recentes</h3>
        </div>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma assinatura cadastrada ainda. Vá em Planos → crie planos → depois vincule barbearias em Assinaturas.</p>
        ) : (
          <div className="space-y-2">
            {subscriptions.slice(0, 8).map(sub => {
              const shopName = shopMap[sub.shop_id]?.name || "Barbearia";
              const planName = planMap[sub.plan_id]?.name || "Plano";
              return (
                <div key={sub.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{shopName}</p>
                    <p className="text-xs text-muted-foreground">{planName} · R${sub.monthly_value || 0}/mês</p>
                  </div>
                <div className="flex items-center gap-2">
                  {sub.renewal_date && <span className="text-xs text-muted-foreground">Renova {sub.renewal_date}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sub.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                    sub.status === "trial" ? "bg-blue-500/10 text-blue-400" :
                    sub.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {sub.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}