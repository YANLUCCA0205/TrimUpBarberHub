import db from '@/lib/db';
import { supabase } from "@/lib/supabase";

import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import ImageUpload from '../components/ImageUpload';
import { User, Calendar, Save, LogOut, MapPin, Edit2, Trash2 } from "lucide-react";
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
  const [form, setForm] = useState(/** @type {any} */ ({}));
  const [tab, setTab] = useState("historico");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [barberProfile, setBarberProfile] = useState(null);
  const [linkRequest, setLinkRequest] = useState(null);
  const [availableShops, setAvailableShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [barberForm, setBarberForm] = useState({ name: "", bio: "", specialties: "" });
  const [shopForm, setShopForm] = useState({ name: "", address: "", phone: "", startTime: "08:00", endTime: "19:00" });
  const [barberLoading, setBarberLoading] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [userShops, setUserShops] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!user) return;
    async function load() {
      setAvatarUrl(user?.avatar_url || "");
      // 1. Load appointments
      let appts = [];
      try {
        appts = await db.entities.Appointment.filter({ client_email: user.email }, "-date", 50);
        setAppointments(appts);
      } catch (err) {
        console.error("Error loading appointments:", err);
      }

      // 2. Find or create Client record linked to this user
      try {
        const existing = await db.entities.Client.filter({ email: user.email });
        if (existing.length > 0) {
          setClient(existing[0]);
          setForm(existing[0]);
        } else {
          // Auto-create Client for this user
          const created = await db.entities.Client.create({
            profile_id: user.id,
            name: user.full_name || user.email.split("@")[0],
            email: user.email,
            total_visits: appts.filter(a => a.status === "concluido").length,
            total_spent: appts.filter(a => a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0),
          });
          setClient(created);
          setForm(created);
        }
      } catch (err) {
        console.error("Error loading or creating client record:", err);
      }

      // 3. Load barber profile if exists
      try {
        const barbers = await db.entities.Barber.filter({ profile_id: user.id });
        if (barbers.length > 0) {
          setBarberProfile(barbers[0]);
          setBarberForm({
            name: barbers[0].name || "",
            bio: barbers[0].bio || "",
            specialties: barbers[0].specialties ? barbers[0].specialties.join(", ") : ""
          });
          // Load pending link request
          const reqs = await db.entities.BarberLinkRequest.filter({ profile_id: user.id, status: "pending" });
          if (reqs.length > 0) {
            setLinkRequest(reqs[0]);
          }
        } else {
          setBarberForm({ name: user.full_name || "", bio: "", specialties: "" });
        }
      } catch (err) {
        console.error("Error loading barber profile:", err);
      }

      // 4. Load shops list
      try {
        const shopsData = await db.entities.Shop.list();
        setAvailableShops(shopsData);
      } catch (err) {
        console.error("Error loading available shops:", err);
      }

      // 5. Load user's own shops
      try {
        const ownedShops = await db.entities.Shop.filter({ owner_id: user.id });
        setUserShops(ownedShops);
      } catch (err) {
        console.error("Error loading owned shops:", err);
      }

      setLoading(false);
    }
    load();
  }, [user]);

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await db.entities.Client.update(client.id, form);
      setClient(updated);
      setForm(updated);
      // Sync to profiles table
      await supabase.from('profiles').update({
        full_name: form.name,
        phone: form.phone
      }).eq('id', user.id);
      setEditing(false);
      toast.success("Perfil atualizado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateBarber(e) {
    e.preventDefault();
    setBarberLoading(true);
    try {
      const created = await db.entities.Barber.create({
        profile_id: user.id,
        owner_email: user.email,
        name: barberForm.name || user.full_name || "Barbeiro",
        bio: barberForm.bio || "",
        specialties: barberForm.specialties ? barberForm.specialties.split(",").map(s => s.trim()) : [],
        is_active: false
      });
      setBarberProfile(created);
      toast.success("Perfil de barbeiro criado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar perfil de barbeiro.");
    } finally {
      setBarberLoading(false);
    }
  }

  async function handleRequestLink(e) {
    e.preventDefault();
    if (!selectedShopId) {
      toast.error("Por favor, selecione uma barbearia.");
      return;
    }
    setBarberLoading(true);
    try {
      const req = await db.entities.BarberLinkRequest.create({
        shop_id: selectedShopId,
        profile_id: user.id,
        barber_id: barberProfile.id,
        status: "pending"
      });
      setLinkRequest(req);
      toast.success("Solicitação de vínculo enviada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setBarberLoading(false);
    }
  }

  async function handleUnlinkBarber() {
    if (!barberProfile || !barberProfile.shop_id) return;
    setBarberLoading(true);
    try {
      const oldShopId = barberProfile.shop_id;
      // 1. Update barber's shop_id to null
      await db.entities.Barber.update(barberProfile.id, { shop_id: null });
      // 2. Remove from shop_memberships
      await supabase
        .from('shop_memberships')
        .delete()
        .eq('shop_id', oldShopId)
        .eq('profile_id', user.id)
        .eq('role', 'barber');
      
      // 3. Create BarberLinkHistory record
      await db.entities.BarberLinkHistory.create({
        shop_id: oldShopId,
        profile_id: user.id,
        barber_id: barberProfile.id,
        action: 'unlinked',
        notes: 'Desvinculado pelo próprio profissional.'
      });

      // 4. Update local state
      setBarberProfile(prev => ({ ...prev, shop_id: null }));
      setLinkRequest(null);
      
      toast.success("Desvinculado da barbearia com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao se desvincular da barbearia.");
    } finally {
      setBarberLoading(false);
    }
  }

  async function handleCreateShop(e) {
    e.preventDefault();
    if (!shopForm.name || !shopForm.address || !shopForm.phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setShopLoading(true);
    try {
      const slug = shopForm.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-4);
      const workingHours = {
        monday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
        tuesday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
        wednesday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
        thursday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
        friday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
        saturday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
        sunday: { start: shopForm.startTime, end: shopForm.endTime, active: false }
      };

      await db.entities.Shop.create({
        owner_id: user.id,
        owner_email: user.email,
        name: shopForm.name,
        address: shopForm.address,
        phone: shopForm.phone,
        slug: slug,
        working_hours: workingHours,
        is_active: true
      });

      toast.success("Barbearia criada! Você agora é administrador.");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar barbearia.");
    } finally {
      setShopLoading(false);
    }
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
        {editing ? (
          <div className="flex justify-center mb-4">
            <ImageUpload
              value={avatarUrl}
              onChange={async (url) => {
                await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
                setAvatarUrl(url);
                toast.success('Foto atualizada!');
              }}
              onRemove={async () => {
                await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
                setAvatarUrl("");
                toast.success('Foto removida!');
              }}
              label="Foto de Perfil"
              aspect="square"
              maxSizeMB={5}
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-primary/50" />
            )}
          </div>
        )}
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
        {[["historico", "Histórico"], ["perfil", "Meus dados"], ["endereco", "Endereço"], ["equipe", "Junte-se à equipe"]].map(([k, l]) => (
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

      {/* Tab: Junte-se à equipe */}
      {tab === "equipe" && (
        <div className="space-y-6">
          <div className="bg-card border border-border/50 p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-2">Junte-se à nossa equipe</h3>
            <p className="text-sm text-muted-foreground">
              Escolha uma das opções abaixo para evoluir sua conta e começar a usar as ferramentas profissionais do TrimUp.
            </p>
          </div>

          {(user.roles?.includes("barber") || user.roles?.includes("admin") || user.role === "barber" || user.role === "admin") && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl text-emerald-400 text-sm">
              <p className="font-semibold mb-1">Você já possui acesso profissional:</p>
              <ul className="list-disc pl-5 space-y-1">
                {(user.roles?.includes("admin") || user.role === "admin") && <li><strong>Administrador:</strong> Você gerencia uma ou mais barbearias. Acesso ao <Link to="/admin" className="underline font-bold">Painel Admin</Link> liberado.</li>}
                {(user.roles?.includes("barber") || user.role === "barber") && <li><strong>Barbeiro:</strong> Você está vinculado a uma equipe. Acesso ao <Link to="/barber-dashboard" className="underline font-bold">Painel do Barbeiro</Link> liberado.</li>}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CARD 1: TORNAR-SE BARBEIRO */}
            {userShops.length > 0 ? (
              <div className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base mb-1">Quero ser Barbeiro</h4>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs mt-3">
                    Donos de barbearia não podem se cadastrar como barbeiro em outro local.
                  </div>
                </div>
              </div>
            ) : (
            <div className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-base mb-1">Quero ser Barbeiro</h4>
                <p className="text-xs text-muted-foreground mb-4">Crie seu perfil profissional, defina especialidades e associe-se a uma barbearia parceira.</p>

                {barberProfile ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-1">
                      <p><strong>Nome Profissional:</strong> {barberProfile.name}</p>
                      <p><strong>Status:</strong> {barberProfile.shop_id ? "Vinculado a uma barbearia" : "Sem vínculo ativo"}</p>
                    </div>

                    {!barberProfile.shop_id ? (
                      <div className="space-y-3 mt-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs">
                          Você ainda não está vinculado a uma barbearia.
                        </div>

                        {linkRequest ? (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs">
                            Solicitação de vínculo pendente para a barbearia: 
                            <strong className="block mt-1">{availableShops.find(s => s.id === linkRequest.shop_id)?.name || "Barbearia"}</strong>
                          </div>
                        ) : (
                          <form onSubmit={handleRequestLink} className="space-y-3">
                            <Label className="text-xs text-muted-foreground">Selecione a Barbearia:</Label>
                            <select 
                              value={selectedShopId} 
                              onChange={e => setSelectedShopId(e.target.value)}
                              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            >
                              <option value="">Selecione...</option>
                              {availableShops.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.address})</option>
                              ))}
                            </select>
                            <Button type="submit" disabled={barberLoading} className="w-full text-xs h-9">
                              Solicitar Vínculo
                            </Button>
                          </form>
                        )}
                      </div>
                    ) : (
                       <div className="space-y-3">
                         <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                           Vinculado com sucesso à barbearia <strong>{availableShops.find(s => s.id === barberProfile.shop_id)?.name}</strong>!
                         </div>
                         <Button 
                           type="button"
                           onClick={handleUnlinkBarber} 
                           disabled={barberLoading} 
                           variant="destructive" 
                           className="w-full text-xs h-9 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                         >
                           {barberLoading ? "Desvinculando..." : "Desvincular da Barbearia"}
                         </Button>
                       </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleCreateBarber} className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Nome Profissional</Label>
                      <Input value={barberForm.name} onChange={e => setBarberForm({ ...barberForm, name: e.target.value })} required placeholder="Ex: Barber João" className="h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Biografia</Label>
                      <Textarea value={barberForm.bio} onChange={e => setBarberForm({ ...barberForm, bio: e.target.value })} placeholder="Ex: Especialista em corte degradê e barba clássica..." className="text-xs h-16 resize-none" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Especialidades (separadas por vírgula)</Label>
                      <Input value={barberForm.specialties} onChange={e => setBarberForm({ ...barberForm, specialties: e.target.value })} placeholder="Ex: Degradê, Barba, Pigmentação" className="h-9 text-xs" />
                    </div>
                    <Button type="submit" disabled={barberLoading} className="w-full text-xs h-9 mt-2">
                      Criar Perfil Profissional
                    </Button>
                  </form>
                )}
              </div>
            </div>
            )}

            {/* CARD 2: TORNAR-SE ADMIN (CRIAR BARBEARIA) */}
            {barberProfile && barberProfile.shop_id ? (
              <div className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base mb-1">Cadastrar Barbearia</h4>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs mt-3">
                    Barbeiros vinculados a uma barbearia não podem cadastrar outra.
                  </div>
                </div>
              </div>
            ) : (
            <div className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-base mb-1">Cadastrar Barbearia</h4>
                <p className="text-xs text-muted-foreground mb-4">Crie sua barbearia para começar a gerenciar sua agenda, equipe e faturamento.</p>

                <form onSubmit={handleCreateShop} className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Nome da Barbearia</Label>
                    <Input value={shopForm.name} onChange={e => setShopForm({ ...shopForm, name: e.target.value })} required placeholder="Ex: Barbearia Premium" className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Endereço Completo</Label>
                    <Input value={shopForm.address} onChange={e => setShopForm({ ...shopForm, address: e.target.value })} required placeholder="Ex: Av. Paulista, 1000 - São Paulo" className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Telefone Comercial</Label>
                    <Input value={shopForm.phone} onChange={e => setShopForm({ ...shopForm, phone: e.target.value })} required placeholder="(11) 99999-9999" className="h-9 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Abre às</Label>
                      <Input type="time" value={shopForm.startTime} onChange={e => setShopForm({ ...shopForm, startTime: e.target.value })} required className="h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Fecha às</Label>
                      <Input type="time" value={shopForm.endTime} onChange={e => setShopForm({ ...shopForm, endTime: e.target.value })} required className="h-9 text-xs" />
                    </div>
                  </div>
                  <Button type="submit" disabled={shopLoading} className="w-full text-xs h-9 mt-2">
                    Criar Barbearia & Ser Admin
                  </Button>
                </form>
              </div>
            </div>
            )}
          </div>
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