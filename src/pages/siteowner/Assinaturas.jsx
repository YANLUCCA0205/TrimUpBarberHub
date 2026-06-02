import db from '@/lib/db';

import { useState, useEffect } from "react";

import { FileText, Store, Search, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-400",
  trial: "bg-blue-500/10 text-blue-400",
  cancelled: "bg-red-500/10 text-red-400",
  expired: "bg-muted text-muted-foreground",
};

export default function SiteOwnerAssinaturas() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [shops, setShops] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [subList, shopList, planList] = await Promise.all([
      db.entities.Subscription.list("-created_at", 500),
      db.entities.Shop.list("-created_at", 500),
      db.entities.Plan.list("-created_at", 20),
    ]);
    setSubscriptions(subList);
    setShops(shopList);
    setPlans(planList);
    setLoading(false);
  }

  const shopMap = Object.fromEntries(shops.map(s => [s.id, s]));
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));

  // Shops without a subscription
  const subscribedShopIds = new Set(subscriptions.map(s => s.shop_id));
  const unsubscribed = shops.filter(s => !subscribedShopIds.has(s.id));

  const filtered = subscriptions.filter(s => {
    const shopName = shopMap[s.shop_id]?.name || "";
    const planName = planMap[s.plan_id]?.name || "";
    const matchSearch = !search || shopName.toLowerCase().includes(search.toLowerCase()) || planName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  function startNew(shopId) {
    setForm({
      shop_id: shopId,
      plan_id: plans[0]?.id || "",
      status: "active",
      monthly_value: plans[0]?.monthly_price || 0,
      start_date: new Date().toISOString().slice(0, 10),
      renewal_date: "",
      auto_renew: true,
    });
    setEditing("new");
  }

  function startEdit(sub) {
    setForm({ ...sub });
    setEditing(sub);
  }

  function onPlanChange(planId) {
    const plan = planMap[planId];
    setForm(f => ({ ...f, plan_id: planId, monthly_value: plan?.monthly_price || 0 }));
  }

  async function save() {
    setSaving(true);
    // Send only valid columns in the payload for subscriptions table
    const payload = {
      shop_id: form.shop_id,
      plan_id: form.plan_id,
      status: form.status,
      monthly_value: Number(form.monthly_value),
      start_date: form.start_date,
      renewal_date: form.renewal_date || null,
      auto_renew: form.auto_renew !== false,
    };
    if (editing === "new") {
      await db.entities.Subscription.create(payload);
    } else {
      await db.entities.Subscription.update(editing.id, payload);
    }
    await load();
    setEditing(null);
    setSaving(false);
  }

  const counts = {
    all: subscriptions.length,
    active: subscriptions.filter(s => s.status === "active").length,
    trial: subscriptions.filter(s => s.status === "trial").length,
    cancelled: subscriptions.filter(s => s.status === "cancelled").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Assinaturas</h1>
        <p className="text-sm text-muted-foreground mt-1">{subscriptions.length} assinaturas · {unsubscribed.length} barbearias sem plano</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: counts.all, key: "all" },
          { label: "Ativas", value: counts.active, key: "active" },
          { label: "Trial", value: counts.trial, key: "trial" },
          { label: "Canceladas", value: counts.cancelled, key: "cancelled" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`p-4 rounded-2xl border text-center transition-all ${filter === s.key ? "bg-primary/10 border-primary/30" : "bg-card border-border/50"}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Form */}
      {editing && (
        <div className="mb-6 p-6 rounded-2xl bg-card border border-primary/20">
          <h3 className="font-semibold mb-4">{editing === "new" ? "Nova Assinatura" : `Editar: ${shopMap[form.shop_id]?.name}`}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5">Barbearia</Label>
              <Input value={shopMap[form.shop_id]?.name || ""} disabled className="bg-background opacity-60" />
            </div>
            <div>
              <Label className="text-xs mb-1.5">Plano</Label>
              <select value={form.plan_id} onChange={e => onPlanChange(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — R${p.monthly_price}/mês</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1.5">Status</Label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                {["active", "trial", "cancelled", "expired"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1.5">Valor Mensal (R$)</Label>
              <Input type="number" value={form.monthly_value || ""} onChange={e => setForm(f => ({ ...f, monthly_value: Number(e.target.value) }))} className="bg-background" />
            </div>
            <div>
              <Label className="text-xs mb-1.5">Data de Início</Label>
              <Input type="date" value={form.start_date || ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="bg-background" />
            </div>
            <div>
              <Label className="text-xs mb-1.5">Data de Renovação</Label>
              <Input type="date" value={form.renewal_date || ""} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} className="bg-background" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save} disabled={saving} className="gap-1"><Check className="w-4 h-4" />{saving ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={() => setEditing(null)} className="gap-1"><X className="w-4 h-4" /> Cancelar</Button>
          </div>
        </div>
      )}

      {/* Unsubscribed shops */}
      {unsubscribed.length > 0 && !search && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs font-medium text-amber-400 mb-3">{unsubscribed.length} barbearia(s) sem plano vinculado</p>
          <div className="flex flex-wrap gap-2">
            {unsubscribed.slice(0, 6).map(s => (
              <button key={s.id} onClick={() => startNew(s.id)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-all">
                <Plus className="w-3 h-3 text-primary" /> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por barbearia ou plano..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card border-border/50" />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-border/30 text-xs text-muted-foreground font-medium">
          <span className="col-span-2">Barbearia</span>
          <span>Plano</span>
          <span>Renovação</span>
          <span>Status</span>
        </div>
        {filtered.map(sub => {
          const shopName = shopMap[sub.shop_id]?.name || "Barbearia";
          const planName = planMap[sub.plan_id]?.name || "Plano";
          return (
            <div key={sub.id} onClick={() => startEdit(sub)}
              className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-all cursor-pointer">
              <div className="col-span-2">
                <p className="text-sm font-medium truncate">{shopName}</p>
                <p className="text-xs text-muted-foreground">R${sub.monthly_value || 0}/mês</p>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-medium">{planName}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground">{sub.renewal_date || "—"}</span>
              </div>
              <div className="flex items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sub.status] || STATUS_COLORS.expired}`}>
                  {sub.status}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Store className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nenhuma assinatura encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}