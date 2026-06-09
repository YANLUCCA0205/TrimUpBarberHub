import db from '@/lib/db';
import { useState, useEffect } from "react";
import { CreditCard, Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVAILABLE_FEATURES, migrateFeatureStringToId, getFeatureLabel } from '@/utils/planFeatures';
import { toast } from "sonner";

const EMPTY = { 
  name: "", 
  monthly_price: "", 
  annual_price: "", 
  annual_discount: "", 
  trial_days: 14, 
  max_barbers: "", 
  max_clients: "", 
  max_appointments: "", 
  max_units: 1, 
  features: [], 
  description: "", 
  is_active: true 
};

export default function SiteOwnerPlanos() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | plan object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await db.entities.Plan.list("-created_at", 20);
      setPlans(data);
    } catch (err) {
      console.error("Erro ao carregar planos:", err);
      toast.error("Erro ao carregar planos do banco de dados.");
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setForm({ ...EMPTY, features: [] });
    setEditing("new");
  }

  function startEdit(plan) {
    const migrated = (plan.features || []).map(f => migrateFeatureStringToId(f));
    setForm({ 
      ...plan, 
      features: migrated,
      max_appointments: plan.max_appointments !== undefined && plan.max_appointments !== null ? plan.max_appointments : ""
    });
    setEditing(plan);
  }

  async function save() {
    setSaving(true);
    try {
      const monthlyVal = Number(form.monthly_price) || 0;
      const payload = {
        ...form,
        monthly_price: monthlyVal,
        annual_price: Number(form.annual_price) || (monthlyVal * 12) || 0,
        annual_discount: Number(form.annual_discount) || 0,
        trial_days: Number(form.trial_days) || 14,
        max_barbers: form.max_barbers ? Number(form.max_barbers) : null,
        max_clients: form.max_clients ? Number(form.max_clients) : null,
        max_appointments: form.max_appointments ? Number(form.max_appointments) : null,
        max_units: Number(form.max_units) || 1,
        features: Array.isArray(form.features) ? form.features : [],
      };
      if (editing === "new") {
        await db.entities.Plan.create(payload);
        toast.success("Plano criado com sucesso!");
      } else {
        await db.entities.Plan.update(editing.id, payload);
        toast.success("Plano atualizado com sucesso!");
      }
      await load();
      setEditing(null);
    } catch (err) {
      console.error("Erro ao salvar plano:", err);
      toast.error("Erro ao salvar o plano.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan) {
    try {
      await db.entities.Plan.update(plan.id, { is_active: !plan.is_active });
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
      toast.success(plan.is_active ? "Plano inativado!" : "Plano ativado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao alterar status do plano.");
    }
  }

  async function deletePlan(id) {
    try {
      await db.entities.Plan.delete(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success("Plano removido!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover o plano.");
    }
  }

  async function seedDefaultPlans() {
    setSeeding(true);
    try {
      const defaultPlans = [
        {
          name: "Free",
          description: "Plano gratuito com recursos essenciais para começar",
          monthly_price: 0,
          annual_price: 0,
          annual_discount: 0,
          trial_days: 0,
          max_barbers: 1,
          max_clients: 20,
          max_appointments: 50,
          max_units: 1,
          features: ["agenda_online", "crm_cadastro", "sys_dashboard", "sys_theme"],
          is_active: true
        },
        {
          name: "Pro",
          description: "Ideal para barbearias em crescimento",
          monthly_price: 49.90,
          annual_price: 499.00,
          annual_discount: 15,
          trial_days: 14,
          max_barbers: 5,
          max_clients: 200,
          max_appointments: 500,
          max_units: 1,
          features: [
            "agenda_online", "agenda_reagendamento", "agenda_cancelamento", "agenda_bloqueio", "agenda_personalizada",
            "crm_cadastro", "crm_historico", "crm_observacoes",
            "barber_cadastro", "barber_agenda", "barber_horarios",
            "sys_dashboard", "sys_theme"
          ],
          is_active: true
        },
        {
          name: "Premium",
          description: "Gestão completa e ilimitada para o seu negócio",
          monthly_price: 99.90,
          annual_price: 999.00,
          annual_discount: 20,
          trial_days: 14,
          max_barbers: 15,
          max_clients: 1000,
          max_appointments: 5000,
          max_units: 3,
          features: AVAILABLE_FEATURES.map(f => f.id),
          is_active: true
        }
      ];

      let seededCount = 0;
      for (const plan of defaultPlans) {
        const exists = plans.find(p => p.name.toLowerCase() === plan.name.toLowerCase());
        if (!exists) {
          await db.entities.Plan.create(plan);
          seededCount++;
        }
      }
      
      if (seededCount > 0) {
        toast.success(`${seededCount} plano(s) padrão semeado(s) com sucesso!`);
      } else {
        toast.info("Todos os planos padrão já existem no banco.");
      }
      await load();
    } catch (err) {
      console.error("Erro ao semear planos padrão:", err);
      toast.error("Erro ao semear planos: " + (err.message || "tente novamente."));
    } finally {
      setSeeding(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os planos disponíveis na plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={seedDefaultPlans} 
            variant="outline" 
            disabled={seeding} 
            className="gap-2 border-primary/20 hover:bg-primary/10 rounded-xl text-xs h-10"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Semear Planos Padrão
          </Button>
          <Button onClick={startNew} className="gap-2 rounded-xl text-xs h-10"><Plus className="w-4 h-4" /> Novo Plano</Button>
        </div>
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
              { key: "max_appointments", label: "Limite Agendamentos Mensais", placeholder: "500", type: "number" },
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
            <Button onClick={save} disabled={saving} className="gap-1 rounded-xl"><Check className="w-4 h-4" />{saving ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={() => setEditing(null)} className="gap-1 rounded-xl"><X className="w-4 h-4" /> Cancelar</Button>
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
              {plan.max_appointments && <p className="text-xs text-muted-foreground">· Até {plan.max_appointments} agendamentos/mês</p>}
              {plan.trial_days && <p className="text-xs text-muted-foreground">· {plan.trial_days} dias grátis</p>}
              {(plan.features || []).map((f, i) => <p key={i} className="text-xs text-muted-foreground">· {getFeatureLabel(f)}</p>)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => startEdit(plan)} className="flex-1 h-8 text-xs gap-1 rounded-lg">
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
          <div className="md:col-span-3 text-center py-16 text-muted-foreground bg-card/40 border border-border/40 rounded-2xl p-6">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20 text-primary" />
            <p className="mb-3">Nenhum plano criado ainda no banco de dados.</p>
            <div className="flex justify-center gap-3">
              <Button onClick={startNew} size="sm" className="rounded-xl"><Plus className="w-4 h-4 mr-1" /> Criar primeiro plano</Button>
              <Button onClick={seedDefaultPlans} size="sm" variant="outline" disabled={seeding} className="gap-2 border-primary/20 hover:bg-primary/10 rounded-xl">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Semear Planos Padrão
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}