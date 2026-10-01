import db from '@/lib/db';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntityQuery, useEntityCreate, useEntityUpdate, useEntityDelete } from "@/hooks/useSupabaseQuery";
import { formatCEP, validateCEP, fetchAddressByCEP } from '@/utils/cepUtils';
import { BRAZILIAN_STATES } from '@/utils/brazilianStates';
import { validateCPF, formatCPF } from '@/lib/cpfCnpjUtils';

import { useAuth } from "@/lib/AuthContext";
import { Plus, Edit2, Trash2, X, Check, Users, Search, Star, MapPin, Phone, AlertTriangle, GitMerge, ShieldCheck, Sparkles, Send, Map, UserCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ClientHeatmap from "@/components/dashboard/ClientHeatmap";
import { generateWhatsAppLink } from "@/lib/notifications";

const SOURCES = ["indicação", "instagram", "google", "passagem", "whatsapp", "outro"];

const emptyForm = {
  name: "", phone: "", whatsapp: "", email: "", cpf: "",
  street: "", street_number: "", complement: "",
  neighborhood: "", city: "", cep: "", state: "", notes: "",
  birthday: "", source: "indicação", is_vip: false,
};

export default function Clientes() {
  const { user } = useAuth();
  
  // React Query queries
  const { data: shops = [], isLoading: loadingShops } = useEntityQuery(
    'Shop',
    { owner_email: user?.email },
    { enabled: !!user?.email }
  );
  const shop = shops[0] || null;

  const { data: clients = [], isLoading: loadingClients } = useEntityQuery(
    'Client',
    { shop_id: shop?.id },
    { enabled: !!shop?.id }
  );

  const { data: barbers = [], isLoading: loadingBarbers } = useEntityQuery(
    'Barber',
    { shop_id: shop?.id },
    { enabled: !!shop?.id }
  );

  const barberIds = barbers.map(b => b.id);
  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', barberIds],
    queryFn: async () => {
      const allAppts = [];
      for (const bId of barberIds) {
        const a = await db.entities.Appointment.filter({ barber_id: bId }, "-date", 200);
        allAppts.push(...a);
      }
      return allAppts;
    },
    enabled: barberIds.length > 0,
  });

  const { data: allProfiles = [] } = useEntityQuery(
    'Profile',
    {},
    { enabled: true }
  );

  const createClientMutation = useEntityCreate('Client');
  const updateClientMutation = useEntityUpdate('Client');
  const deleteClientMutation = useEntityDelete('Client');

  const loading = loadingShops || loadingClients || loadingBarbers || (barberIds.length > 0 && loadingAppointments);
  const isSaving = createClientMutation.isPending || updateClientMutation.isPending;

  const [activeTab, setActiveTab] = useState("list"); // "list" | "heatmap"
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [mergeModalClient, setMergeModalClient] = useState(null);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [merging, setMerging] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function findMatchingProfile(client) {
    if (!client || client.profile_id) return null;
    const cleanPhone = (val) => val ? val.replace(/\D/g, '') : '';
    const cPhone = cleanPhone(client.phone || client.whatsapp);
    const cEmail = client.email?.trim().toLowerCase();

    return allProfiles.find(p => {
      const pPhone = cleanPhone(p.phone);
      const pEmail = p.email?.trim().toLowerCase();
      if (cEmail && pEmail && cEmail === pEmail) return true;
      if (cPhone && pPhone && cPhone.length >= 8 && pPhone.length >= 8 && (cPhone.endsWith(pPhone.slice(-8)) || pPhone.endsWith(cPhone.slice(-8)))) {
        return true;
      }
      return false;
    }) || null;
  }

  async function handleConfirmMerge(client, profile) {
    setMerging(true);
    try {
      await updateClientMutation.mutateAsync({
        id: client.id,
        data: {
          profile_id: profile.id,
          email: client.email || profile.email || "",
          notes: client.notes 
            ? `${client.notes} | [Conta oficial vinculada: ${profile.full_name || 'Usuário'} em ${new Date().toLocaleDateString('pt-BR')}]` 
            : `[Conta oficial vinculada: ${profile.full_name || 'Usuário'} em ${new Date().toLocaleDateString('pt-BR')}]`
        }
      });
      toast.success(`Cadastro de "${client.name}" promovido para Conta Oficial! Histórico de atendimentos preservado.`);
      setMergeModalClient(null);
      setMatchedProfile(null);
    } catch (err) {
      toast.error("Erro ao vincular conta oficial.");
    } finally {
      setMerging(false);
    }
  }

  async function handleMarkSharedPhone(client, profile) {
    setMerging(true);
    try {
      await updateClientMutation.mutateAsync({
        id: client.id,
        data: {
          notes: client.notes 
            ? `${client.notes} | [Telefone compartilhado com ${profile.full_name || 'familiar'} (${profile.email || ''})]` 
            : `[Telefone compartilhado com ${profile.full_name || 'familiar'} (${profile.email || ''})]`
        }
      });
      toast.success("Marcado como telefone de recado/compartilhado. Os cadastros foram mantidos separados!");
      setMergeModalClient(null);
      setMatchedProfile(null);
    } catch (err) {
      toast.error("Erro ao salvar observação.");
    } finally {
      setMerging(false);
    }
  }

  async function handleCepChange(value) {
    const formatted = formatCEP(value);
    set('cep', formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8 && validateCEP(clean)) {
      setCepLoading(true);
      try {
        const address = await fetchAddressByCEP(clean);
        if (address) {
          setForm(f => ({
            ...f,
            cep: formatted,
            street: address.logradouro || f.street || '',
            neighborhood: address.bairro || f.neighborhood || '',
            city: address.localidade || f.city || '',
            state: address.uf || f.state || '',
          }));
          toast.success('Endereço encontrado!');
        } else {
          toast.error('CEP não encontrado. Preencha manualmente.');
        }
      } catch {
        toast.error('Erro ao buscar CEP. Preencha manualmente.');
      } finally {
        setCepLoading(false);
      }
    }
  }

  async function saveClient() {
    if (!form.name) { toast.error("Nome é obrigatório."); return; }
    
    // CPF Validation
    if (form.cpf) {
      const clean = form.cpf.replace(/\D/g, '');
      if (clean.length > 0 && clean.length < 11) {
        toast.error("CPF incompleto. Informe todos os 11 dígitos.");
        return;
      }
      if (clean.length === 11 && !validateCPF(clean)) {
        toast.error("CPF inválido. Verifique o número informado.");
        return;
      }
    }

    // Duplicate checks
    const cleanPhone = (val) => val ? val.replace(/\D/g, '') : '';
    const cleanCpf = (val) => val ? val.replace(/\D/g, '') : '';

    const newPhone = cleanPhone(form.phone);
    const newWhatsapp = cleanPhone(form.whatsapp);
    const newCpf = cleanCpf(form.cpf);
    const newEmail = form.email?.trim().toLowerCase();

    const duplicate = clients.find(c => {
      if (editingClient && c.id === editingClient.id) return false;

      if (newEmail && c.email?.trim().toLowerCase() === newEmail) return true;
      if (newCpf && cleanCpf(c.cpf) === newCpf) return true;
      
      const cPhone = cleanPhone(c.phone);
      const cWhatsapp = cleanPhone(c.whatsapp);
      if (newPhone && (cPhone === newPhone || cWhatsapp === newPhone)) return true;
      if (newWhatsapp && (cPhone === newWhatsapp || cWhatsapp === newWhatsapp)) return true;

      return false;
    });

    if (duplicate) {
      let duplicateField = "";
      if (newEmail && duplicate.email?.trim().toLowerCase() === newEmail) {
        duplicateField = `e-mail (${newEmail})`;
      } else if (newCpf && cleanCpf(duplicate.cpf) === newCpf) {
        duplicateField = `CPF (${form.cpf})`;
      } else {
        duplicateField = `telefone/WhatsApp`;
      }
      toast.error(`Já existe um cliente cadastrado com este ${duplicateField}.`);
      return;
    }

    const data = { ...form, shop_id: shop?.id };
    
    try {
      if (editingClient) {
        await updateClientMutation.mutateAsync({ id: editingClient.id, data });
        toast.success("Cliente atualizado!");
      } else {
        await createClientMutation.mutateAsync(data);
        toast.success("Cliente cadastrado!");
      }
      setShowForm(false);
      setEditingClient(null);
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar cliente.");
    }
  }

  async function deleteClient(id) {
    try {
      await deleteClientMutation.mutateAsync(id);
      if (selectedClient?.id === id) setSelectedClient(null);
      toast.success("Cliente removido.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover cliente.");
    }
  }

  function editClient(c) {
    setEditingClient(c);
    setForm({ ...emptyForm, ...c });
    setShowForm(true);
    setSelectedClient(null);
  }

  // Get appointment history for a client
  function getClientHistory(client) {
    return appointments.filter(a =>
      a.client_email === client.email ||
      a.client_name?.toLowerCase() === client.name?.toLowerCase()
    ).sort((a, b) => b.date?.localeCompare(a.date));
  }

  const filtered = clients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Neighborhood stats for insights
  const neighborhoodMap = {};
  clients.forEach(c => {
    if (c.neighborhood) {
      neighborhoodMap[c.neighborhood] = (neighborhoodMap[c.neighborhood] || 0) + 1;
    }
  });
  const topNeighborhoods = Object.entries(neighborhoodMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes & CRM</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clients.length} cliente(s) cadastrado(s) na barbearia</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex rounded-xl bg-muted p-1 border border-border/50">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "list" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Lista & CRM
            </button>
            <button
              onClick={() => setActiveTab("heatmap")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "heatmap" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="w-3.5 h-3.5 text-primary" /> Mapa Territorial (LGPD)
            </button>
          </div>

          <Button onClick={() => { setEditingClient(null); setForm(emptyForm); setShowForm(true); setSelectedClient(null); }}
            className="bg-primary text-primary-foreground rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Novo cliente
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total de clientes", value: clients.length, icon: Users },
          { label: "Contas Verificadas", value: clients.filter(c => c.profile_id).length, icon: UserCheck },
          { label: "Cadastros Frágeis (Balcão)", value: clients.filter(c => !c.profile_id).length, icon: Shield },
          { label: "Com WhatsApp", value: clients.filter(c => c.whatsapp || c.phone).length, icon: Phone },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card border border-border/50">
            <s.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* HEATMAP VIEW */}
      {activeTab === "heatmap" && (
        <div className="mb-8">
          <ClientHeatmap clients={clients} />
        </div>
      )}

      {/* LIST VIEW */}
      {activeTab === "list" && (

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Client list */}
        <div className="lg:col-span-2">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, bairro, telefone..." className="pl-9 bg-muted border-border/50 rounded-xl" />
          </div>

          {/* Form */}
          {showForm && (
            <div className="mb-4 p-5 rounded-2xl bg-card border border-primary/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{editingClient ? "Editar cliente" : "Novo cliente"}</h3>
                <button onClick={() => { setShowForm(false); setEditingClient(null); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Nome *</Label>
                  <Input value={form.name} onChange={e => set("name", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label>
                  <Input value={form.whatsapp || ""} onChange={e => set("whatsapp", e.target.value)} placeholder="(11) 00000-0000" className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
                  <Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">CPF</Label>
                  <Input value={form.cpf || ""} onChange={e => set("cpf", formatCPF(e.target.value))} placeholder="000.000.000-00" className="bg-muted border-border/50 rounded-xl" maxLength={14} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">CEP</Label>
                  <div className="relative">
                    <Input 
                      value={form.cep || ""} 
                      onChange={e => handleCepChange(e.target.value)} 
                      placeholder="00000-000" 
                      className="bg-muted border-border/50 rounded-xl pr-9" 
                      maxLength={9} 
                    />
                    {cepLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    )}
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Rua / Avenida</Label>
                    <Input value={form.street || ""} onChange={e => set("street", e.target.value)} placeholder="Ex: Rua das Flores" className="bg-muted border-border/50 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Número</Label>
                    <Input value={form.street_number || ""} onChange={e => set("street_number", e.target.value)} placeholder="123" className="bg-muted border-border/50 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Complemento</Label>
                  <Input value={form.complement || ""} onChange={e => set("complement", e.target.value)} placeholder="Apto, bloco..." className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Bairro</Label>
                  <Input value={form.neighborhood || ""} onChange={e => set("neighborhood", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Cidade</Label>
                  <Input value={form.city || ""} onChange={e => set("city", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Estado</Label>
                  <Select value={form.state || ""} onValueChange={v => set("state", v)}>
                    <SelectTrigger className="bg-muted border-border/50 rounded-xl">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.value} — {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Origem</Label>
                  <Select value={form.source || "indicação"} onValueChange={v => set("source", v)}>
                    <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Aniversário</Label>
                  <Input type="date" value={form.birthday || ""} onChange={e => set("birthday", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
                  <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} className="bg-muted border-border/50 rounded-xl resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="vip" checked={!!form.is_vip} onChange={e => set("is_vip", e.target.checked)} className="rounded" />
                  <label htmlFor="vip" className="text-sm flex items-center gap-1"><Star className="w-3 h-3 text-primary" /> Cliente VIP</label>
                </div>
              </div>
              <Button onClick={saveClient} disabled={isSaving} className="bg-primary text-primary-foreground rounded-xl gap-2">
                <Check className="w-4 h-4" /> {isSaving ? "Salvando..." : (editingClient ? "Salvar" : "Cadastrar")}
              </Button>
            </div>
          )}

          {/* Client list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>{search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => {
                const history = getClientHistory(c);
                const isSelected = selectedClient?.id === c.id;
                const isShadow = !c.profile_id;
                const matched = isShadow ? findMatchingProfile(c) : null;
                const wppLink = generateWhatsAppLink({
                  phone: c.whatsapp || c.phone,
                  clientName: c.name,
                  shopName: shop?.name || "Nossa Barbearia",
                  type: "reactivation"
                });

                return (
                  <div key={c.id} className="rounded-2xl border border-border/50 bg-card overflow-hidden transition-all hover:border-border">
                    <div
                      className={`p-4 flex items-center gap-3 cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedClient(isSelected ? null : c)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-primary/80">{c.name?.[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm text-foreground">{c.name}</p>
                          {c.is_vip && <Star className="w-3 h-3 text-primary fill-primary" />}
                          
                          {/* Badges de tipo de perfil */}
                          {isShadow ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> Cadastro Frágil (Balcão)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5" /> Conta Verificada
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                          {c.neighborhood && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.neighborhood}</span>}
                          {c.whatsapp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.whatsapp}</span>}
                          {history.length > 0 && <span>{history.length} visita(s)</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {wppLink && (
                          <a
                            href={wppLink}
                            target="_blank"
                            rel="noreferrer"
                            title="Enviar WhatsApp"
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => editClient(c)} className="p-1.5 text-muted-foreground hover:text-foreground">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteClient(c.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* ALERTA DE FUSÃO / MATCHING DETECTADO */}
                    {matched && (
                      <div className="mx-4 mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <div className="text-xs">
                            <span className="font-semibold text-amber-300">Conta oficial do TrimUp encontrada: </span>
                            <span className="text-slate-200">{matched.full_name} ({matched.phone || matched.email})</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMergeModalClient(c);
                            setMatchedProfile(matched);
                          }}
                          className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1 rounded-lg"
                        >
                          <GitMerge className="w-3 h-3" /> Analisar Fusão ("Estouro")
                        </Button>
                      </div>
                    )}

                    {/* DETALHES EXPANDIDOS */}
                    {isSelected && (
                      <div className="p-4 bg-muted/20 border-t border-border/30 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-lg font-bold">{history.length}</p>
                            <p className="text-[10px] text-muted-foreground">Visitas</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-primary">R${history.filter(a => a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0)}</p>
                            <p className="text-[10px] text-muted-foreground">Total gasto</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{history[0]?.date ? new Date(history[0].date + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : "—"}</p>
                            <p className="text-[10px] text-muted-foreground">Última visita</p>
                          </div>
                        </div>
                        {history.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2">Últimas visitas</p>
                            <div className="space-y-1.5">
                              {history.slice(0, 4).map((a, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{new Date(a.date + "T12:00").toLocaleDateString("pt-BR")} {a.time}</span>
                                  <span className="font-medium">{a.service_name}</span>
                                  <span className="text-primary">R${a.price || 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {c.notes && <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">📌 Notas: {c.notes}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: Territorial insights */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Concentração por bairro</h3>
              </div>
              <button onClick={() => setActiveTab("heatmap")} className="text-xs text-primary hover:underline">
                Ver mapa
              </button>
            </div>
            {topNeighborhoods.length === 0 ? (
              <p className="text-xs text-muted-foreground">Cadastre clientes com bairro para ver a distribuição geográfica.</p>
            ) : (
              <div className="space-y-3">
                {topNeighborhoods.map(([n, count]) => {
                  const max = topNeighborhoods[0][1];
                  return (
                    <div key={n}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{n}</span>
                        <span className="text-muted-foreground">{count} cliente(s)</span>
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
            <h3 className="font-semibold mb-3">Origem dos clientes</h3>
            {(() => {
              const sourceMap = {};
              clients.forEach(c => { if (c.source) sourceMap[c.source] = (sourceMap[c.source] || 0) + 1; });
              const entries = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);
              return entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">Dados de origem aparecerão aqui.</p>
              ) : (
                <div className="space-y-2">
                  {entries.map(([src, count]) => (
                    <div key={src} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{src}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <h3 className="font-semibold mb-3">Aniversariantes do mês</h3>
            {(() => {
              const currentMonth = new Date().getMonth() + 1;
              const birthdays = clients.filter(c => {
                if (!c.birthday) return false;
                const month = parseInt(c.birthday.split("-")[1]);
                return month === currentMonth;
              });
              return birthdays.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum aniversariante este mês.</p>
              ) : (
                <div className="space-y-2">
                  {birthdays.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="text-base">🎂</span>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(c.birthday + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      )}

      {/* MODAL DE FUSÃO / "ESTOURO" DO CADASTRO FRÁGIL */}
      {mergeModalClient && matchedProfile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Unificação de Perfil ("Estouro")</h3>
                  <p className="text-xs text-muted-foreground">Detecção de conta oficial do TrimUp</p>
                </div>
              </div>
              <button onClick={() => { setMergeModalClient(null); setMatchedProfile(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Identificamos que o telefone <strong>{mergeModalClient.phone || mergeModalClient.whatsapp}</strong> foi cadastrado em uma conta oficial do TrimUp.
              </p>

              {/* Comparativo */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/50">
                <div className="space-y-1">
                  <span className="font-bold text-amber-400 uppercase text-[10px] block">Ficha da Barbearia (Frágil)</span>
                  <p className="font-semibold text-sm">{mergeModalClient.name}</p>
                  <p className="text-muted-foreground">{mergeModalClient.phone || "Sem telefone"}</p>
                  <p className="text-muted-foreground">{getClientHistory(mergeModalClient).length} agendamentos registrados</p>
                </div>
                <div className="space-y-1 border-l border-border/50 pl-3">
                  <span className="font-bold text-emerald-400 uppercase text-[10px] block">Conta TrimUp Encontrada</span>
                  <p className="font-semibold text-sm">{matchedProfile.full_name || "Usuário"}</p>
                  <p className="text-muted-foreground">{matchedProfile.email || "Sem e-mail"}</p>
                  <p className="text-emerald-400 font-medium">✓ Telefone validado via OTP</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Preservação Total de Dados
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ao vincular, todo o histórico anterior de cortes, preferências e faturamento do cliente é transferido intacto para a conta oficial.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <Button
                onClick={() => handleConfirmMerge(mergeModalClient, matchedProfile)}
                disabled={merging}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 rounded-xl"
              >
                <UserCheck className="w-4 h-4" />
                {merging ? "Vinculando..." : "Sim, vincular e promover a Conta Oficial"}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleMarkSharedPhone(mergeModalClient, matchedProfile)}
                disabled={merging}
                className="w-full border-border/60 text-muted-foreground hover:text-foreground text-xs rounded-xl"
              >
                Telefone Compartilhado (Ex: Neto usando tel para o Avô)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}