import db from '@/lib/db';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { validateCPF, formatCPF, hashDocument } from '@/lib/cpfCnpjUtils';
import { notifyBarberLinked, notifyBarberUnlinked } from '../lib/notifications';

import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Store, Palette, MapPin, Phone, Save, Plus, Trash2, Edit2, X, Check, Scissors, Users, CreditCard, Sparkles, ShieldCheck, Copy, QrCode, Calendar, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from '../components/ImageUpload';
import { getFeatureLabel } from '@/utils/planFeatures';

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

const TABS = ["Configurações", "Barbeiros", "Serviços", "Plano & Assinatura"];

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
  const [barberCpfInput, setBarberCpfInput] = useState("");
  const [importingCpf, setImportingCpf] = useState(false);

  // Plans & Subscription state
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [simulatingPix, setSimulatingPix] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const shops = await db.entities.Shop.filter({ owner_email: user.email });
      if (shops.length > 0) {
        const currentShop = shops[0];
        setShop(currentShop);
        setForm(currentShop);
        
        const [b, s, reqs, allPlans, subs] = await Promise.all([
          db.entities.Barber.filter({ shop_id: currentShop.id }),
          db.entities.Service.filter({ shop_id: currentShop.id }),
          db.entities.BarberLinkRequest.filter({ shop_id: currentShop.id, status: "pending" }),
          db.entities.Plan.list("-monthly_price", 20).catch(() => []),
          db.entities.Subscription.filter({ shop_id: currentShop.id }).catch(() => [])
        ]);
        
        setBarbers(b);

        const fallbackPlans = [
          {
            id: "sandbox-plan-1",
            name: "FREE",
            description: "Plano inicial gratuito",
            monthly_price: 0,
            annual_price: 0,
            max_barbers: 1,
            max_clients: 50,
            features: ["agenda_online", "crm_cadastro"]
          },
          {
            id: "sandbox-plan-2",
            name: "PRO",
            description: "Plano ideal para barbearias em expansão",
            monthly_price: 79.90,
            annual_price: 799.00,
            max_barbers: 5,
            max_clients: 9999,
            features: ["agenda_online", "crm_cadastro", "mkt_whatsapp", "fin_relatorios"]
          },
          {
            id: "sandbox-plan-3",
            name: "PREMIUM",
            description: "Multi-unidades e recursos completos",
            monthly_price: 149.90,
            annual_price: 1499.00,
            max_barbers: 15,
            max_clients: 9999,
            features: ["agenda_online", "crm_cadastro", "mkt_whatsapp", "fin_relatorios", "sys_multi", "mkt_campanhas"]
          }
        ];

        const validPlans = (allPlans && allPlans.length > 0) ? allPlans : fallbackPlans;
        setPlans(validPlans);
        setSubscription(subs?.[0] || null);
        
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

  async function confirmPixPayment() {
    if (!checkoutPlan || !shop) return;
    setSimulatingPix(true);
    try {
      const payload = {
        shop_id: shop.id,
        plan_id: checkoutPlan.id,
        status: "active",
        monthly_value: Number(checkoutPlan.monthly_price),
        start_date: new Date().toISOString().slice(0, 10),
        renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        auto_renew: true
      };

      let updatedSub;
      if (subscription?.id) {
        updatedSub = await db.entities.Subscription.update(subscription.id, payload);
      } else {
        updatedSub = await db.entities.Subscription.create(payload);
      }

      await db.entities.Shop.update(shop.id, { plan_id: checkoutPlan.id });
      setSubscription(updatedSub);
      setShop(prev => ({ ...prev, plan_id: checkoutPlan.id }));
      setCheckoutPlan(null);
      toast.success(`Pagamento confirmado! Sua barbearia agora é ${checkoutPlan.name}! 🎉`);
    } catch (err) {
      console.error("Erro ao ativar assinatura Pix:", err);
      toast.error("Erro ao processar assinatura Pix.");
    } finally {
      setSimulatingPix(false);
    }
  }

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

  async function handleImportByCpf() {
    const clean = barberCpfInput.replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error("Informe um CPF com 11 dígitos.");
      return;
    }
    if (!validateCPF(clean)) {
      toast.error("CPF inválido.");
      return;
    }
    setImportingCpf(true);
    try {
      const hash = await hashDocument(clean);
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('cpf_hash', hash)
        .maybeSingle();
      
      if (error) throw error;
      if (!prof) {
        toast.error("Nenhum profissional encontrado com este CPF.");
        return;
      }
      
      setBarberForm(prev => ({
        ...prev,
        name: prof.full_name || prev.name || "",
        photo: prof.avatar_url || prev.photo || "",
        whatsapp: prof.phone || prev.whatsapp || "",
        profile_id: prof.id
      }));
      toast.success("Dados do profissional importados!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar dados pelo CPF.");
    } finally {
      setImportingCpf(false);
    }
  }

  function closeBarberForm() {
    setShowBarberForm(false);
    setEditingBarber(null);
    setBarberForm({});
    setBarberCpfInput("");
  }

  // Barber CRUD
  async function saveBarber() {
    if (!barberForm.name?.trim()) {
      toast.error("Informe o nome do barbeiro.");
      return;
    }
    if (!barberForm.photo) {
      toast.error("Informe a foto do barbeiro.");
      return;
    }
    if (!barberForm.bio?.trim()) {
      toast.error("Preencha a biografia (Quem sou eu / Bio) do barbeiro.");
      return;
    }
    if (!barberForm.career?.trim()) {
      toast.error("Preencha a trajetória de carreira e experiência do barbeiro.");
      return;
    }
    if (!barberForm.whatsapp?.trim()) {
      toast.error("Informe o número de WhatsApp do barbeiro.");
      return;
    }
    if (!barberForm.specialties || barberForm.specialties.length === 0) {
      toast.error("Informe ao menos uma especialidade para o barbeiro.");
      return;
    }

    try {
      if (editingBarber) {
        const updated = await db.entities.Barber.update(editingBarber.id, barberForm);
        setBarbers(barbers.map(b => b.id === editingBarber.id ? updated : b));
        toast.success("Barbeiro atualizado!");
      } else {
        // Check for duplicate barber name in this shop
        const duplicate = barbers.find(b => b.name.toLowerCase().trim() === barberForm.name.toLowerCase().trim());
        if (duplicate) {
          toast.error(`Já existe um barbeiro chamado "${duplicate.name}" nesta barbearia.`);
          return;
        }
        const created = await db.entities.Barber.create({ ...barberForm, shop_id: shop.id, owner_email: user.email });
        setBarbers([...barbers, created]);
        toast.success("Barbeiro adicionado!");
      }
      setShowBarberForm(false);
      setEditingBarber(null);
      setBarberForm({});
    } catch (err) {
      console.error("Erro ao salvar barbeiro:", err);
      toast.error("Erro ao salvar barbeiro: " + (err.message || "tente novamente."));
    }
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

        try {
          await notifyBarberUnlinked(bObj.profile_id, shop.name);
        } catch (nErr) {
          console.warn("Failed to send unlink notification:", nErr);
        }

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

  async function handleAcceptRequest(req) {
    try {
      const requestingBarber = barbers.find(b => b.id === req.barber_id);
      const existingManual = barbers.find(b =>
        b.id !== req.barber_id &&
        !b.profile_id &&
        b.name.toLowerCase().trim() === requestingBarber?.name?.toLowerCase()?.trim()
      );

      if (existingManual) {
        await db.entities.Barber.update(existingManual.id, {
          profile_id: req.profile_id,
          shop_id: shop.id
        });
        try { await db.entities.Barber.delete(req.barber_id); } catch (e) { console.warn('Could not delete duplicate barber:', e); }
        toast.success(`Barbeiro "${existingManual.name}" vinculado ao perfil do solicitante (merge automático).`);
      }

      await db.entities.BarberLinkRequest.update(req.id, { status: 'accepted' });

      try {
        await notifyBarberLinked(req.profile_id, shop.name);
      } catch (nErr) {
        console.warn("Failed to send link notification:", nErr);
      }

      setLinkRequests(prev => prev.filter(r => r.id !== req.id));

      const updatedBarbers = await db.entities.Barber.filter({ shop_id: shop.id });
      setBarbers(updatedBarbers);

      if (!existingManual) toast.success("Solicitação aceita!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aceitar solicitação.");
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
      const data = { ...serviceForm, price: priceNum, duration_minutes: parseInt(serviceForm.duration_minutes) || 30, shop_id: shop?.id };
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
                      <Button size="sm" onClick={() => handleAcceptRequest(r)} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
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
                <button onClick={closeBarberForm}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {!editingBarber && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2.5">
                  <Label className="text-xs font-semibold text-foreground">Importar dados por CPF</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="000.000.000-00"
                      value={barberCpfInput}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        setBarberCpfInput(v.length <= 11 ? formatCPF(v) : v);
                      }}
                      className="bg-muted border-border/50 rounded-xl max-w-[200px]"
                      maxLength={14}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleImportByCpf}
                      disabled={importingCpf}
                      className="rounded-xl text-xs h-9"
                    >
                      {importingCpf ? "Buscando..." : "Importar"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Se o profissional já tiver cadastro no TrimUp, seus dados serão preenchidos automaticamente.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Nome *">
                    <Input value={barberForm.name || ""} onChange={e => setBarberForm(f => ({ ...f, name: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
                  </Field>
                </div>
                <div className="col-span-2">
                  <ImageUpload
                    value={barberForm.photo}
                    onChange={(url) => setBarberForm(prev => ({ ...prev, photo: url }))}
                    onRemove={() => setBarberForm(prev => ({ ...prev, photo: '' }))}
                    label="Foto do Barbeiro *"
                    aspect="square"
                    maxSizeMB={5}
                  />
                </div>
              </div>
              <Field label="Quem sou eu / Bio *">
                <Textarea value={barberForm.bio || ""} onChange={e => setBarberForm(f => ({ ...f, bio: e.target.value }))} rows={3} placeholder="Apresentação do barbeiro, personalidade, estilo..." className="bg-muted border-border/50 rounded-xl resize-none" />
              </Field>
              <Field label="Carreira e Experiência *">
                <Textarea value={barberForm.career || ""} onChange={e => setBarberForm(f => ({ ...f, career: e.target.value }))} rows={3} placeholder="Trajetória profissional, formações, conquistas..." className="bg-muted border-border/50 rounded-xl resize-none" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="WhatsApp *">
                  <Input value={barberForm.whatsapp || ""} onChange={e => setBarberForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="5511999999999" className="bg-muted border-border/50 rounded-xl" />
                </Field>
                <Field label="Instagram (Opcional)">
                  <Input value={barberForm.instagram || ""} onChange={e => setBarberForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@barbeiro" className="bg-muted border-border/50 rounded-xl" />
                </Field>
              </div>
              <Field label="Especialidades (separadas por vírgula) *">
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

      {/* Tab 3: Plano & Assinatura */}
      {activeTab === 3 && (
        <div className="space-y-6">
          {/* Card: Status do Plano Atual */}
          {(() => {
            const currentPlan = plans.find(p => p.id === (subscription?.plan_id || shop?.plan_id)) || plans.find(p => p.monthly_price === 0) || plans[0];
            const isSubActive = subscription?.status === "active";
            const isTrial = subscription?.status === "trial" || !subscription;

            return (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Plano da Barbearia</span>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      {currentPlan?.name || "Plano TrimUp"}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        isSubActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        isTrial ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {isSubActive ? "Assinatura Ativa" : isTrial ? "Período de Testes" : "Pendente/Inativa"}
                      </span>
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">
                      {currentPlan?.monthly_price > 0 ? `R$ ${Number(currentPlan.monthly_price).toFixed(2)}` : "Grátis"}
                      {currentPlan?.monthly_price > 0 && <span className="text-xs text-muted-foreground font-normal"> / mês</span>}
                    </p>
                    {subscription?.renewal_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Renovação em: {new Date(subscription.renewal_date + "T12:00").toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Métricas de Uso vs Limites */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">Barbeiros Cadastrados</p>
                    <p className="text-lg font-bold mt-1 text-foreground">
                      {barbers.length} <span className="text-xs text-muted-foreground font-normal">/ {currentPlan?.max_barbers || "Ilimitado"}</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">Serviços no Catálogo</p>
                    <p className="text-lg font-bold mt-1 text-foreground">
                      {services.length} <span className="text-xs text-muted-foreground font-normal">ativos</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">Limite de Clientes CRM</p>
                    <p className="text-lg font-bold mt-1 text-foreground">
                      {currentPlan?.max_clients ? `${currentPlan.max_clients}` : "Ilimitado"}
                    </p>
                  </div>
                </div>

                {/* Recursos inclusos */}
                {currentPlan?.features && currentPlan.features.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Recursos inclusos no seu plano:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentPlan.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{getFeatureLabel(f)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Comparativo de Planos & Upgrade */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">Planos Disponíveis</h3>
              <p className="text-xs text-muted-foreground">Escolha o plano ideal para a escala e faturamento da sua barbearia.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(p => {
                const isCurrent = (subscription?.plan_id || shop?.plan_id) === p.id || (!subscription?.plan_id && !shop?.plan_id && p.monthly_price === 0);
                const isPro = p.name?.toUpperCase().includes("PRO");

                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isPro
                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/5 relative"
                        : "bg-card border-border/50 hover:border-border"
                    }`}
                  >
                    {isPro && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full bg-primary text-primary-foreground tracking-wide uppercase">
                        Mais Escolhido
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-lg">{p.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description || "Plano completo TrimUp"}</p>
                      </div>

                      <div>
                        <span className="text-3xl font-black text-foreground">
                          {p.monthly_price > 0 ? `R$ ${Number(p.monthly_price).toFixed(2)}` : "Grátis"}
                        </span>
                        {p.monthly_price > 0 && <span className="text-xs text-muted-foreground"> /mês</span>}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>Até {p.max_barbers || "∞"} barbeiros</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>{p.max_clients ? `Até ${p.max_clients} clientes` : "Clientes ilimitados"}</span>
                        </div>
                        {(p.features || []).slice(0, 4).map(f => (
                          <div key={f} className="flex items-center gap-2 text-muted-foreground">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="truncate">{getFeatureLabel(f)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6">
                      {isCurrent ? (
                        <Button disabled variant="outline" className="w-full rounded-xl text-xs font-semibold">
                          Plano Atual
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setCheckoutPlan(p)}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" /> Fazer Upgrade via Pix
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Checkout Pix B2B */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-primary/20 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">Assinatura B2B via Pix</h3>
              </div>
              <button
                onClick={() => setCheckoutPlan(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Você está contratando o plano</p>
              <h2 className="text-2xl font-black text-foreground">{checkoutPlan.name}</h2>
              <p className="text-xl font-bold text-primary">
                R$ {Number(checkoutPlan.monthly_price).toFixed(2)} <span className="text-xs text-muted-foreground font-normal">/ mês</span>
              </p>
            </div>

            {/* Simulated Pix QR Code */}
            <div className="p-4 rounded-xl bg-white flex flex-col items-center justify-center max-w-[200px] mx-auto shadow-inner">
              <svg viewBox="0 0 100 100" className="w-36 h-36">
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="10" y="10" width="25" height="25" fill="#000000" />
                <rect x="14" y="14" width="17" height="17" fill="#ffffff" />
                <rect x="17" y="17" width="11" height="11" fill="#000000" />

                <rect x="65" y="10" width="25" height="25" fill="#000000" />
                <rect x="69" y="14" width="17" height="17" fill="#ffffff" />
                <rect x="72" y="17" width="11" height="11" fill="#000000" />

                <rect x="10" y="65" width="25" height="25" fill="#000000" />
                <rect x="14" y="69" width="17" height="17" fill="#ffffff" />
                <rect x="17" y="72" width="11" height="11" fill="#000000" />

                <rect x="40" y="15" width="10" height="5" fill="#000000" />
                <rect x="45" y="25" width="5" height="10" fill="#000000" />
                <rect x="20" y="42" width="10" height="8" fill="#000000" />
                <rect x="42" y="42" width="16" height="16" fill="#000000" rx="3" />
                <rect x="65" y="45" width="15" height="6" fill="#000000" />
                <rect x="45" y="65" width="10" height="10" fill="#000000" />
                <rect x="65" y="65" width="8" height="18" fill="#000000" />
                <rect x="78" y="75" width="12" height="8" fill="#000000" />
              </svg>
              <span className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Pix Copia e Cola / QR Code</span>
            </div>

            {/* Pix Copy & Paste Key */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Código Pix Copia e Cola</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`00020126580014br.gov.bcb.pix0136trimup-b2b-${(checkoutPlan.id || 'pro').slice(0, 8)}520400005303986540${Number(checkoutPlan.monthly_price).toFixed(2)}5802BR5916TRIMUP BARBER6009SAO PAULO62070503***6304`}
                  className="bg-muted text-[10px] font-mono select-all rounded-xl border-border/50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const code = `00020126580014br.gov.bcb.pix0136trimup-b2b-${(checkoutPlan.id || 'pro').slice(0, 8)}520400005303986540${Number(checkoutPlan.monthly_price).toFixed(2)}5802BR5916TRIMUP BARBER6009SAO PAULO62070503***6304`;
                    navigator.clipboard.writeText(code);
                    toast.success("Código Pix copiado com sucesso!");
                  }}
                  className="rounded-xl flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={confirmPixPayment}
                disabled={simulatingPix}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {simulatingPix ? "Processando Ativação..." : "Simular Pagamento Pix (Ativar Imediatamente)"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setCheckoutPlan(null)}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Voltar / Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}