import db from '@/lib/db';
import { useState, useEffect } from "react";
import { CreditCard, Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVAILABLE_FEATURES, migrateFeatureStringToId, getFeatureLabel } from '@/utils/planFeatures';

const EMPTY = { name: "", monthly_price: "", annual_price: "", annual_discount: "", trial_days: 14, max_barbers: "", max_clients: "", max_units: 1, features: [], description: "", is_active: true };

export default function SiteOwnerPlanos() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | plan object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await db.entities.Plan.list("-created_at", 20);
    setPlans(data);
    setLoading(false);
  }

  function startNew() {
    setForm({ ...EMPTY, features: [] });
    setEditing("new");
  }

  function startEdit(plan) {
    const migrated = (plan.features || []).map(f => migrateFeatureStringToId(f));
    setForm({ ...plan, features: migrated });
    setEditing(plan);
  }

  async function save() {
    setSaving(true);
    const monthlyVal = Number(form.monthly_price) || 0;
    const payload = {
      ...form,
      monthly_price: monthlyVal,
      annual_price: Number(form.annual_price) || (monthlyVal * 12) || 0,
      annual_discount: Number(form.annual_discount) || 0,
      trial_days: Number(form.trial_days) || 14,
      max_barbers: Number(form.max_barbers) || undefined,
      max_clients: Number(form.max_clients) || undefined,
      max_units: Number(form.max_units) || 1,
      features: Array.isArray(form.features) ? form.features : [],
    };
    if (editing === "new") {
      await db.entities.Plan.create(payload);
    } else {
      await db.entities.Plan.update(editing.id, payload);
    }
    await load();
    setEditing(null);
    setSaving(false);
  }

  async function toggleActive(plan) {
    await db.entities.Plan.update(plan.id, { is_active: !plan.is_active });
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
  }

  async function deletePlan(id) {
    await db.entities.Plan.delete(id);
    setPlans(prev => prev.filter(p => p.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os planos disponíveis na plataforma</p>
        </div>
        <Button onClick={startNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Plano</Button>
      </div>

      {/* Form */}
      {editing && (
        <div className="mb-8 p-6 rounded-2xl bg-card border border-primary/20">
          <h3 className="font-semibold mb-4">{editing === "new" ? "Novo Plano" : `Editar: ${editing.name}`}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "name", label: "Nome", placeholder: "Ex: Pro, Premium" },
              { key: "monthly_price", label: "Valor Mensal (R$)", placeholder: "99.90", type: "number" },
              { key: "annual_price", label: "Valor Anual (R$)", placeholder: "999.00", type: "number" },
              { key: "annual_discount", label: "Desconto Anual (%)", placeholder: "15", type: "number" },
              { key: "trial_days", label: "Dias de Teste", placeholder: "14", type: "number" },
              { key: "max_barbers", label: "Limite Barbeiros", placeholder: "5", type: "number" },
              { key: "max_clients", label: "Limite Clientes", placeholder: "500", type: "number" },
              { key: "max_units", label: "Limite Unidades", placeholder: "1", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs mb-1.5">{f.label}</Label>
                <Input type={f.type || "text"} placeholder={f.placeholder} value={form[f.key] || ""}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="bg-background" />
              </div>
            ))}
            <div className="md:col-span-2">
              <Label className="text-xs mb-3 block font-semibold text-primary">Recursos do Plano (Selecione os recursos ativos)</Label>
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 border border-border/40 rounded-xl p-4 bg-muted/20">
                {Object.entries(
                  AVAILABLE_FEATURES.reduce((acc, feat) => {
                    (acc[feat.category] = acc[feat.category] || []).push(feat);
                    return acc;
                  }, {})
                ).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/20 pb-1">{category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map(feat => {
                        const checked = (form.features || []).includes(feat.id);
                        return (
                          <label key={feat.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-primary transition-colors py-0.5 select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const current = form.features || [];
                                const next = checked
                                  ? current.filter(x => x !== feat.id)
                                  : [...current, feat.id];
                                setForm(p => ({ ...p, features: next }));
                              }}
                              className="rounded border-border/50 bg-background text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>{feat.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs mb-1.5">Descrição</Label>
              <Input placeholder="Ideal para barbearias em crescimento" value={form.description || ""}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-background" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save} disabled={saving} className="gap-1"><Check className="w-4 h-4" />{saving ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={() => setEditing(null)} className="gap-1"><X className="w-4 h-4" /> Cancelar</Button>
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className={`p-5 rounded-2xl bg-card border transition-all ${plan.is_active ? "border-border/50" : "border-border/20 opacity-60"}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-2xl font-bold text-primary mt-1">R${plan.monthly_price}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${plan.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {plan.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
            {plan.description && <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>}
            <div className="space-y-1 mb-4">
              {plan.max_barbers && <p className="text-xs text-muted-foreground">· Até {plan.max_barbers} barbeiros</p>}
              {plan.max_clients && <p className="text-xs text-muted-foreground">· Até {plan.max_clients} clientes</p>}
              {plan.trial_days && <p className="text-xs text-muted-foreground">· {plan.trial_days} dias grátis</p>}
              {(plan.features || []).map((f, i) => <p key={i} className="text-xs text-muted-foreground">· {getFeatureLabel(f)}</p>)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => startEdit(plan)} className="flex-1 h-8 text-xs gap-1">
                <Edit2 className="w-3 h-3" /> Editar
              </Button>
              <button onClick={() => toggleActive(plan)} className="p-2 rounded-lg hover:bg-muted/50 transition-all">
                {plan.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button onClick={() => deletePlan(plan.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-all">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && !editing && (
          <div className="md:col-span-3 text-center py-16 text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="mb-3">Nenhum plano criado ainda.</p>
            <Button onClick={startNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Criar primeiro plano</Button>
          </div>
        )}
      </div>
    </div>
  );
}