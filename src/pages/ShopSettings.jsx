import db from '@/lib/db';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Store, Palette, MapPin, Phone, Save, Plus, Trash2, Edit2, X, Check, Scissors, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from '../components/ImageUpload';

const SECTION = ({ icon: Icon, title, children }) => (
  <div className="p-6 rounded-2xl bg-card border border-border/50">
    <div className="flex items-center gap-2 mb-5">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="font-semibold">{title}</h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
    {children}
  </div>
);

const TABS = ["Configurações", "Barbeiros", "Serviços"];

export default function ShopSettings() {
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState(/** @type {any} */ ({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Barbers state
  const [barbers, setBarbers] = useState([]);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberForm, setBarberForm] = useState(/** @type {any} */ ({}));
  const [showBarberForm, setShowBarberForm] = useState(false);
  const [linkRequests, setLinkRequests] = useState([]);

  // Services state
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(/** @type {any} */ ({ duration_minutes: "30", category: "corte", is_active: true }));
  const [showServiceForm, setShowServiceForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const shops = await db.entities.Shop.filter({ owner_email: user.email });
      if (shops.length > 0) {
        const currentShop = shops[0];
        setShop(currentShop);
        setForm(currentShop);
        
        const [b, s, reqs] = await Promise.all([
          db.entities.Barber.filter({ shop_id: currentShop.id }),
          db.entities.Service.filter({ shop_id: currentShop.id }),
          db.entities.BarberLinkRequest.filter({ shop_id: currentShop.id, status: "pending" })
        ]);
        
        setBarbers(b);
        
        // Get services for all barbers in this shop
        const barberIds = b.map(x => x.id);
        setServices(s.filter(x => barberIds.includes(x.barber_id)));

        // Load details for each pending request
        const reqsWithDetails = await Promise.all(reqs.map(async (r) => {
          try {
            const bProfile = await db.entities.Barber.get(r.barber_id);
            const { data: userProf } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', r.profile_id)
              .maybeSingle();
            
            return {
              ...r,
              barber_name: bProfile ? bProfile.name : "Barbeiro",
              barber_specialties: bProfile ? bProfile.specialties : [],
              barber_photo: bProfile ? bProfile.photo : null,
              email: userProf ? userProf.email : ""
            };
          } catch (e) {
            console.error("Erro ao carregar detalhes da solicitação:", e);
            return r;
          }
        }));
        setLinkRequests(reqsWithDetails);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function createShop() {
    setSaving(true);
    const slug = (user.full_name || "minha-barbearia").toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-4);
    const s = await db.entities.Shop.create({ name: form.name || "Minha Barbearia", slug, owner_email: user.email });
    setShop(s);
    setForm(s);
    setSaving(false);
  }

  async function save() {
    if (!shop) return;
    setSaving(true);
    const updated = await db.entities.Shop.update(shop.id, form);
    setShop(updated);
    setForm(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Barber CRUD
  async function saveBarber() {
    if (!barberForm.name) return;
    if (editingBarber) {
      const updated = await db.entities.Barber.update(editingBarber.id, barberForm);
      setBarbers(barbers.map(b => b.id === editingBarber.id ? updated : b));
    } else {
      const created = await db.entities.Barber.create({ ...barberForm, shop_id: shop.id, owner_email: user.email });
      setBarbers([...barbers, created]);
    }
    setShowBarberForm(false);
    setEditingBarber(null);
    setBarberForm({});
  }

  async function deleteBarber(id) {
    const bObj = barbers.find(b => b.id === id);
    try {
      if (bObj && bObj.profile_id) {
        // É um barbeiro vinculado com conta real. Desvincular.
        await db.entities.Barber.update(id, { shop_id: null });
        // Remover do shop_memberships
        await supabase
          .from('shop_memberships')
          .delete()
          .eq('shop_id', shop.id)
          .eq('profile_id', bObj.profile_id)
          .eq('role', 'barber');
        
        // Registrar desvinculação no histórico
        await db.entities.BarberLinkHistory.create({
          shop_id: shop.id,
          profile_id: bObj.profile_id,
          barber_id: id,
          action: 'unlinked',
          notes: 'Desvinculado pelo administrador da barbearia.'
        });

        toast.success(`${bObj.name} foi desvinculado com sucesso.`);
      } else {
        // Criado manualmente pelo admin, deleta permanente
        await db.entities.Barber.delete(id);
        toast.success("Barbeiro excluído.");
      }
      setBarbers(barbers.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover/desvincular barbeiro.");
    }
  }

  async function handleAcceptRequest(reqId) {
    try {
      await db.entities.BarberLinkRequest.update(reqId, { status: "accepted" });
      toast.success("Solicitação de vínculo aprovada!");
      
      // Recarregar os barbeiros
      if (shop) {
        const b = await db.entities.Barber.filter({ shop_id: shop.id });
        setBarbers(b);
      }
      setLinkRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar solicitação.");
    }
  }

  async function handleRejectRequest(reqId) {
    try {
      await db.entities.BarberLinkRequest.update(reqId, { status: "rejected" });
      toast.success("Solicitação de vínculo rejeitada.");
      setLinkRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao rejeitar solicitação.");
    }
  }

  function editBarber(b) {
    setEditingBarber(b);
    setBarberForm(b);
    setShowBarberForm(true);
  }

  // Service CRUD
  async function saveService() {
    if (!serviceForm.name || !serviceForm.price) {
      toast.error("Preencha o nome e o preço do serviço.");
      return;
    }
    // Handle Brazilian price format (comma as decimal separator)
    const priceStr = String(serviceForm.price).replace(",", ".");
    const priceNum = parseFloat(priceStr);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Informe um preço válido (ex: 67.00).");
      return;
    }
    try {
      const data = { ...serviceForm, price: priceNum, duration_minutes: parseInt(serviceForm.duration_minutes) || 30 };
      if (editingService) {
        const updated = await db.entities.Service.update(editingService.id, data);
        setServices(services.map(s => s.id === editingService.id ? updated : s));
        toast.success("Serviço atualizado!");
      } else {
        if (!serviceForm.barber_id) {
          toast.error("Selecione o barbeiro para este serviço.");
          return;
        }
        const created = await db.entities.Service.create(data);
        setServices([...services, created]);
        toast.success("Serviço criado com sucesso!");
      }
      setShowServiceForm(false);
      setEditingService(null);
      setServiceForm({ duration_minutes: "30", category: "corte", is_active: true });
    } catch (err) {
      console.error("Erro ao salvar serviço:", err);
      toast.error("Erro ao salvar serviço: " + (err.message || "tente novamente."));
    }
  }

  async function deleteService(id) {
    await db.entities.Service.delete(id);
    setServices(services.filter(s => s.id !== id));
  }

  function editService(s) {
    setEditingService(s);
    setServiceForm({ ...s, price: String(s.price), duration_minutes: String(s.duration_minutes) });
    setShowServiceForm(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Crie sua Barbearia</h2>
        <p className="text-muted-foreground mb-6">Ainda não há nenhuma barbearia vinculada à sua conta.</p>
        <Field label="Nome da barbearia">
          <Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Ex: Barbearia do João" className="bg-muted border-border/50 rounded-xl mb-4" />
        </Field>
        <Button onClick={createShop} disabled={saving} className="bg-primary text-primary-foreground rounded-xl px-8 w-full">
          <Plus className="w-4 h-4 mr-1" /> {saving ? "Criando..." : "Criar Barbearia"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestão da Barbearia</h1>
        <p className="text-sm text-muted-foreground mt-1">{shop.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted mb-6">
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
              activeTab === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 0: Configurações */}
      {activeTab === 0 && (
        <div className="space-y-6">
          <SECTION icon={Store} title="Identidade">
            <Field label="Nome da Barbearia">
              <Input value={form.name || ""} onChange={e => set("name", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </Field>
            <Field label="Slogan">
              <Input value={form.slogan || ""} onChange={e => set("slogan", e.target.value)} placeholder="Ex: Estilo que fala por você" className="bg-muted border-border/50 rounded-xl" />
            </Field>
            <Field label="Descrição / Personalidade">
              <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={4} placeholder="Conte a história da sua barbearia..." className="bg-muted border-border/50 rounded-xl resize-none" />
            </Field>
            <ImageUpload
              value={form.logo}
              onChange={(url) => setForm(prev => ({ ...prev, logo: url }))}
              onRemove={() => setForm(prev => ({ ...prev, logo: '' }))}
              label="Logo da Barbearia"
              aspect="square"
              maxSizeMB={5}
            />
            <ImageUpload
              value={form.banner}
              onChange={(url) => setForm(prev => ({ ...prev, banner: url }))}
              onRemove={() => setForm(prev => ({ ...prev, banner: '' }))}
              label="Banner da Barbearia"
              aspect="banner"
              maxSizeMB={10}
            />
          </SECTION>

          <SECTION icon={Palette} title="Tema e Cores">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cor Primária">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color || "#D4A017"} onChange={e => set("primary_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border/50 bg-transparent cursor-pointer p-0.5" />
                  <Input value={form.primary_color || "#D4A017"} onChange={e => set("primary_color", e.target.value)} className="bg-muted border-border/50 rounded-xl font-mono text-sm" />
                </div>
              </Field>
              <Field label="Cor Secundária">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color || "#1a1a2e"} onChange={e => set("secondary_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border/50 bg-transparent cursor-pointer p-0.5" />
                  <Input value={form.secondary_color || "#1a1a2e"} onChange={e => set("secondary_color", e.target.value)} className="bg-muted border-border/50 rounded-xl font-mono text-sm" />
                </div>
              </Field>
            </div>
          </SECTION>

          <SECTION icon={MapPin} title="Localização">
            <Field label="Endereço">
              <Input value={form.address || ""} onChange={e => set("address", e.target.value)} placeholder="Rua, número..." className="bg-muted border-border/50 rounded-xl" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bairro">
                <Input value={form.neighborhood || ""} onChange={e => set("neighborhood", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
              </Field>
              <Field label="Cidade">
                <Input value={form.city || ""} onChange={e => set("city", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
              </Field>
            </div>
          </SECTION>

          <SECTION icon={Phone} title="Contato e Redes">
            <Field label="WhatsApp">
              <Input value={form.whatsapp || ""} onChange={e => set("whatsapp", e.target.value)} placeholder="5511999999999" className="bg-muted border-border/50 rounded-xl" />
            </Field>
            <Field label="Instagram">
              <Input value={form.instagram || ""} onChange={e => set("instagram", e.target.value)} placeholder="@suabarbearia" className="bg-muted border-border/50 rounded-xl" />
            </Field>
          </SECTION>

          <Button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground rounded-xl h-12 text-base font-semibold">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
          </Button>
        </div>
      )}

      {/* Tab 1: Barbeiros */}
      {activeTab === 1 && (
        <div className="space-y-4">
          {/* Solicitações de Vínculo Pendentes */}
          {linkRequests.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-3">
              <h4 className="font-semibold text-amber-500 flex items-center gap-2">
                <Users className="w-4 h-4" /> Solicitações de Vínculo Pendentes ({linkRequests.length})
              </h4>
              <p className="text-xs text-muted-foreground">Profissionais solicitando vínculo com a sua barbearia:</p>
              
              <div className="space-y-2 mt-2">
                {linkRequests.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {r.barber_photo ? (
                          <img src={r.barber_photo} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-primary/50">{r.barber_name?.[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.barber_name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.email}</p>
                        {r.barber_specialties?.length > 0 && (
                          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                            Especialidades: {r.barber_specialties.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleRejectRequest(r.id)} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                        Rejeitar
                      </Button>
                      <Button size="sm" onClick={() => handleAcceptRequest(r.id)} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
                        Aceitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{barbers.length} barbeiro(s) cadastrado(s)</p>
            <Button size="sm" onClick={() => { setEditingBarber(null); setBarberForm({}); setShowBarberForm(true); }}
              className="bg-primary text-primary-foreground rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Adicionar barbeiro
            </Button>
          </div>

          {showBarberForm && (
            <div className="p-5 rounded-2xl bg-card border border-primary/20 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{editingBarber ? "Editar barbeiro" : "Novo barbeiro"}</h4>
                <button onClick={() => { setShowBarberForm(false); setEditingBarber(null); setBarberForm({}); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome *">
                  <Input value={barberForm.name || ""} onChange={e => setBarberForm(f => ({ ...f, name: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
                </Field>
                <Field label="Foto (URL)">
                  <Input value={barberForm.photo || ""} onChange={e => setBarberForm(f => ({ ...f, photo: e.target.value }))} placeholder="https://..." className="bg-muted border-border/50 rounded-xl" />
                </Field>
              </div>
              <Field label="Quem sou eu / Bio">
                <Textarea value={barberForm.bio || ""} onChange={e => setBarberForm(f => ({ ...f, bio: e.target.value }))} rows={3} placeholder="Apresentação do barbeiro, personalidade, estilo..." className="bg-muted border-border/50 rounded-xl resize-none" />
              </Field>
              <Field label="Carreira e Experiência">
                <Textarea value={barberForm.career || ""} onChange={e => setBarberForm(f => ({ ...f, career: e.target.value }))} rows={3} placeholder="Trajetória profissional, formações, conquistas..." className="bg-muted border-border/50 rounded-xl resize-none" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="WhatsApp">
                  <Input value={barberForm.whatsapp || ""} onChange={e => setBarberForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="5511999999999" className="bg-muted border-border/50 rounded-xl" />
                </Field>
                <Field label="Instagram">
                  <Input value={barberForm.instagram || ""} onChange={e => setBarberForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@barbeiro" className="bg-muted border-border/50 rounded-xl" />
                </Field>
              </div>
              <Field label="Especialidades (separadas por vírgula)">
                <Input
                  value={(barberForm.specialties || []).join(", ")}
                  onChange={e => setBarberForm(f => ({ ...f, specialties: e.target.value.split(",").map(x => x.trim()).filter(Boolean) }))}
                  placeholder="Ex: Degradê, Barba, Coloração"
                  className="bg-muted border-border/50 rounded-xl"
                />
              </Field>
              <Button onClick={saveBarber} className="w-full bg-primary text-primary-foreground rounded-xl">
                <Check className="w-4 h-4 mr-1" /> Salvar barbeiro
              </Button>
            </div>
          )}

          {barbers.length === 0 && !showBarberForm && (
            <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>Nenhum barbeiro cadastrado ainda.</p>
            </div>
          )}

          <div className="space-y-3">
            {barbers.map(b => (
              <div key={b.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {b.photo ? <img src={b.photo} className="w-full h-full object-cover rounded-xl" /> : <span className="text-lg font-bold text-primary/50">{b.name?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{b.name}</p>
                  {b.specialties?.length > 0 && <p className="text-xs text-muted-foreground">{b.specialties.join(", ")}</p>}
                  {b.bio && <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{b.bio}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => editBarber(b)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteBarber(b.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Serviços */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{services.length} serviço(s) cadastrado(s)</p>
            <Button size="sm" onClick={() => { setEditingService(null); setServiceForm({ duration_minutes: "30", category: "corte", is_active: true }); setShowServiceForm(true); }}
              className="bg-primary text-primary-foreground rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Adicionar serviço
            </Button>
          </div>

          {showServiceForm && (
            <div className="p-5 rounded-2xl bg-card border border-primary/20 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{editingService ? "Editar serviço" : "Novo serviço"}</h4>
                <button onClick={() => { setShowServiceForm(false); setEditingService(null); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {!editingService && barbers.length > 0 && (
                <Field label="Barbeiro *">
                  <Select value={serviceForm.barber_id || ""} onValueChange={v => setServiceForm(f => ({ ...f, barber_id: v }))}>
                    <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome *">
                  <Input value={serviceForm.name || ""} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
                </Field>
                <Field label="Categoria">
                  <Select value={serviceForm.category || "corte"} onValueChange={v => setServiceForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["corte","barba","combo","tratamento","coloração","outros"].map(c => (
                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Descrição">
                <Textarea value={serviceForm.description || ""} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descreva o que está incluso neste serviço..." className="bg-muted border-border/50 rounded-xl resize-none" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Preço (R$) *">
                  <Input type="number" value={serviceForm.price || ""} onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
                </Field>
                <Field label="Duração (min)">
                  <Input type="number" value={serviceForm.duration_minutes || "30"} onChange={e => setServiceForm(f => ({ ...f, duration_minutes: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
                </Field>
              </div>
              <Button onClick={saveService} className="w-full bg-primary text-primary-foreground rounded-xl">
                <Check className="w-4 h-4 mr-1" /> Salvar serviço
              </Button>
            </div>
          )}

          {services.length === 0 && !showServiceForm && (
            <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
              <Scissors className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>Nenhum serviço cadastrado ainda.</p>
              {barbers.length === 0 && <p className="text-xs mt-1">Cadastre um barbeiro primeiro.</p>}
            </div>
          )}

          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{s.name}</p>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{s.category}</span>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{s.duration_minutes} min • {barbers.find(b => b.id === s.barber_id)?.name || ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-primary font-bold">R${s.price}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => editService(s)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteService(s.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}