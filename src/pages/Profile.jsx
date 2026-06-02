const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";

import { User, Calendar, Save, LogOut, Phone, MapPin, Star, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STATUS_LABELS = {
  agendado: "Agendado", confirmado: "Confirmado", em_andamento: "Em andamento",
  concluido: "Concluído", cancelado: "Cancelado", faltou: "Faltou"
};
const STATUS_COLORS = {
  concluido: "bg-emerald-500/10 text-emerald-400", cancelado: "bg-red-500/10 text-red-400",
  faltou: "bg-muted text-muted-foreground", agendado: "bg-blue-500/10 text-blue-400",
  confirmado: "bg-primary/10 text-primary", em_andamento: "bg-amber-500/10 text-amber-400"
};

export default function Profile() {
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState("historico");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      // Load appointments
      const appts = await db.entities.Appointment.filter({ client_email: user.email }, "-date", 50);
      setAppointments(appts);

      // Find or create Client record linked to this user
      const existing = await db.entities.Client.filter({ email: user.email });
      if (existing.length > 0) {
        setClient(existing[0]);
        setForm(existing[0]);
      } else {
        // Auto-create Client for this user
        const created = await db.entities.Client.create({
          name: user.full_name || user.email.split("@")[0],
          email: user.email,
          total_visits: appts.filter(a => a.status === "concluido").length,
          total_spent: appts.filter(a => a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0),
        });
        setClient(created);
        setForm(created);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function saveProfile() {
    setSaving(true);
    const updated = await db.entities.Client.update(client.id, form);
    setClient(updated);
    setForm(updated);
    setEditing(false);
    toast.success("Perfil atualizado!");
    setSaving(false);
  }

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  const completed = appointments.filter(a => a.status === "concluido");
  const totalSpent = completed.reduce((s, a) => s + (a.price || 0), 0);
  const avgTicket = completed.length > 0 ? (totalSpent / completed.length).toFixed(0) : 0;
  const upcoming = appointments.filter(a => ["agendado", "confirmado"].includes(a.status));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-primary/50" />
        </div>
        <h1 className="text-xl font-bold">{client?.name || user?.full_name || "Meu Perfil"}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        {client?.is_vip && <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">⭐ Cliente VIP</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Cortes", value: completed.length },
          { label: "Total gasto", value: `R$${totalSpent}` },
          { label: "Ticket médio", value: `R$${avgTicket}` },
          { label: "Próximos", value: upcoming.length },
        ].map((s, i) => (
          <div key={i} className="text-center p-3 rounded-2xl bg-card border border-border/50">
            <div className="text-lg font-bold text-primary">{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
        {[["historico", "Histórico"], ["perfil", "Meus dados"], ["endereco", "Endereço"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: Histórico */}
      {tab === "historico" && (
        <div>
          {upcoming.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Próximos agendamentos</h3>
              <div className="space-y-2">
                {upcoming.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/15">
                    <div>
                      <p className="font-medium text-sm">{a.service_name}</p>
                      <p className="text-xs text-muted-foreground">{a.barber_name} • {new Date(a.date + "T12:00").toLocaleDateString("pt-BR")} às {a.time}</p>
                    </div>
                    <div className="text-right">
                      {a.price && <p className="font-semibold text-primary">R${a.price}</p>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || ""}`}>{STATUS_LABELS[a.status] || a.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Histórico completo</h3>
          {appointments.filter(a => !["agendado", "confirmado"].includes(a.status)).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
              <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Nenhum agendamento ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.filter(a => !["agendado", "confirmado"].includes(a.status)).map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
                  <div>
                    <p className="font-medium text-sm">{a.service_name}</p>
                    <p className="text-xs text-muted-foreground">{a.barber_name} • {new Date(a.date + "T12:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    {a.price && <p className="font-medium text-sm text-primary">R${a.price}</p>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || "bg-muted text-muted-foreground"}`}>{STATUS_LABELS[a.status] || a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Dados pessoais */}
      {tab === "perfil" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Dados pessoais</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Nome completo</Label>
            <Input value={form.name || ""} onChange={e => setF("name", e.target.value)} disabled={!editing} className="bg-muted/20 border-border/40 disabled:opacity-70" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Telefone</Label>
              <Input value={form.phone || ""} onChange={e => setF("phone", e.target.value)} disabled={!editing} placeholder="(11) 00000-0000" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp</Label>
              <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", e.target.value)} disabled={!editing} placeholder="(11) 00000-0000" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Data de nascimento</Label>
            <Input type="date" value={form.birthday || ""} onChange={e => setF("birthday", e.target.value)} disabled={!editing} className="bg-muted/20 border-border/40 disabled:opacity-70" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Observações / preferências</Label>
            <Textarea value={form.notes || ""} onChange={e => setF("notes", e.target.value)} disabled={!editing} rows={3} className="bg-muted/20 border-border/40 disabled:opacity-70 resize-none" placeholder="Ex: prefere corte degradê, alérgico a certos produtos..." />
          </div>

          {editing && (
            <div className="flex gap-2">
              <Button onClick={saveProfile} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl gap-2">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar dados"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(client); }} className="rounded-xl">Cancelar</Button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Endereço */}
      {tab === "endereco" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Endereço</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Seus dados de endereço melhoram sua experiência e ajudam na análise de atendimento na sua região.</p>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">CEP</Label>
            <Input value={form.cep || ""} onChange={e => setF("cep", e.target.value)} disabled={!editing} placeholder="00000-000" className="bg-muted/20 border-border/40 disabled:opacity-70" maxLength={9} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Rua / Avenida</Label>
              <Input value={form.street || ""} onChange={e => setF("street", e.target.value)} disabled={!editing} placeholder="Ex: Rua das Flores" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Número</Label>
              <Input value={form.street_number || ""} onChange={e => setF("street_number", e.target.value)} disabled={!editing} placeholder="123" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Complemento</Label>
            <Input value={form.complement || ""} onChange={e => setF("complement", e.target.value)} disabled={!editing} placeholder="Apto, bloco, casa..." className="bg-muted/20 border-border/40 disabled:opacity-70" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Bairro</Label>
              <Input value={form.neighborhood || ""} onChange={e => setF("neighborhood", e.target.value)} disabled={!editing} placeholder="Ex: Pinheiros" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cidade</Label>
              <Input value={form.city || ""} onChange={e => setF("city", e.target.value)} disabled={!editing} placeholder="Ex: São Paulo" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Estado</Label>
            <Input value={form.state || ""} onChange={e => setF("state", e.target.value)} disabled={!editing} placeholder="SP" className="bg-muted/20 border-border/40 disabled:opacity-70" maxLength={2} />
          </div>

          {editing && (
            <div className="flex gap-2">
              <Button onClick={saveProfile} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl gap-2">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar endereço"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(client); }} className="rounded-xl">Cancelar</Button>
            </div>
          )}
        </div>
      )}

      <Button onClick={() => db.auth.logout()} variant="outline" className="w-full mt-8 rounded-xl border-border/50 text-muted-foreground hover:text-destructive">
        <LogOut className="w-4 h-4 mr-2" /> Sair da conta
      </Button>

      {!showDeleteConfirm ? (
        <button onClick={() => setShowDeleteConfirm(true)}
          className="w-full mt-3 text-xs text-muted-foreground/40 hover:text-destructive transition-colors text-center py-2">
          Excluir conta
        </button>
      ) : (
        <div className="mt-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
          <p className="text-sm text-center text-destructive mb-1 font-medium">Excluir conta permanentemente?</p>
          <p className="text-xs text-center text-muted-foreground mb-4">Todos os seus dados serão removidos. Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl text-xs h-9">Cancelar</Button>
            <Button onClick={() => { toast.error("Para excluir sua conta, entre em contato: suporte@trimup.com"); setShowDeleteConfirm(false); }}
              className="flex-1 rounded-xl text-xs h-9 bg-destructive hover:bg-destructive/90 text-white">
              <Trash2 className="w-3 h-3 mr-1" /> Confirmar exclusão
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}