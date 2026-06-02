const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Store, Palette, MapPin, Phone, Save, Plus, Trash2, Edit2, X, Check, Scissors, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Barbers state
  const [barbers, setBarbers] = useState([]);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberForm, setBarberForm] = useState({});
  const [showBarberForm, setShowBarberForm] = useState(false);

  // Services state
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ duration_minutes: "30", category: "corte", is_active: true });
  const [showServiceForm, setShowServiceForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const shops = await db.entities.Shop.filter({ owner_email: user.email });
      if (shops.length > 0) {
        setShop(shops[0]);
        setForm(shops[0]);
        const [b, s] = await Promise.all([
          db.entities.Barber.filter({ shop_id: shops[0].id }),
          db.entities.Service.filter({ barber_id: { $exists: true } }),
        ]);
        setBarbers(b);
        // Get services for all barbers in this shop
        const barberIds = b.map(x => x.id);
        setServices(s.filter(x => barberIds.includes(x.barber_id)));
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
    await db.entities.Barber.delete(id);
    setBarbers(barbers.filter(b => b.id !== id));
  }

  function editBarber(b) {
    setEditingBarber(b);
    setBarberForm(b);
    setShowBarberForm(true);
  }

  // Service CRUD
  async function saveService() {
    if (!serviceForm.name || !serviceForm.price) return;
    const data = { ...serviceForm, price: parseFloat(serviceForm.price), duration_minutes: parseInt(serviceForm.duration_minutes) };
    if (editingService) {
      const updated = await db.entities.Service.update(editingService.id, data);
      setServices(services.map(s => s.id === editingService.id ? updated : s));
    } else {
      if (!serviceForm.barber_id) return;
      const created = await db.entities.Service.create(data);
      setServices([...services, created]);
    }
    setShowServiceForm(false);
    setEditingService(null);
    setServiceForm({ duration_minutes: "30", category: "corte", is_active: true });
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
            <Field label="URL da Logo">
              <Input value={form.logo || ""} onChange={e => set("logo", e.target.value)} placeholder="https://..." className="bg-muted border-border/50 rounded-xl" />
            </Field>
            <Field label="URL do Banner">
              <Input value={form.banner || ""} onChange={e => set("banner", e.target.value)} placeholder="https://..." className="bg-muted border-border/50 rounded-xl" />
            </Field>
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