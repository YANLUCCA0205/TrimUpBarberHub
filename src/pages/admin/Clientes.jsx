import db from '@/lib/db';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntityQuery, useEntityCreate, useEntityUpdate, useEntityDelete } from "@/hooks/useSupabaseQuery";
import { formatCEP, validateCEP, fetchAddressByCEP } from '@/utils/cepUtils';
import { BRAZILIAN_STATES } from '@/utils/brazilianStates';
import { validateCPF, formatCPF } from '@/lib/cpfCnpjUtils';

import { useAuth } from "@/lib/AuthContext";
import { Plus, Edit2, Trash2, X, Check, Users, Search, Star, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

  const createClientMutation = useEntityCreate('Client');
  const updateClientMutation = useEntityUpdate('Client');
  const deleteClientMutation = useEntityDelete('Client');

  const loading = loadingShops || loadingClients || loadingBarbers || (barberIds.length > 0 && loadingAppointments);
  const isSaving = createClientMutation.isPending || updateClientMutation.isPending;

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => { setEditingClient(null); setForm(emptyForm); setShowForm(true); setSelectedClient(null); }}
          className="bg-primary text-primary-foreground rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Novo cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total de clientes", value: clients.length, icon: Users },
          { label: "Bairros mapeados", value: Object.keys(neighborhoodMap).length, icon: MapPin },
          { label: "Clientes VIP", value: clients.filter(c => c.is_vip).length, icon: Star },
          { label: "Com WhatsApp", value: clients.filter(c => c.whatsapp).length, icon: Phone },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card border border-border/50">
            <s.icon className="w-4 h-4 text-primary mb-2" />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

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
                return (
                  <div key={c.id}>
                    <button onClick={() => setSelectedClient(isSelected ? null : c)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${isSelected ? "bg-primary/5 border-primary/20" : "bg-card border-border/50 hover:border-border"}`}>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-primary/60">{c.name?.[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.is_vip && <Star className="w-3 h-3 text-primary fill-primary" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {c.neighborhood && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.neighborhood}</span>}
                          {c.whatsapp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.whatsapp}</span>}
                          {history.length > 0 && <span>{history.length} visita(s)</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); editClient(c); }} className="p-1.5 text-muted-foreground hover:text-foreground">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteClient(c.id); }} className="p-1.5 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </button>

                    {isSelected && (
                      <div className="ml-4 mt-1 mb-2 p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
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
                        {c.notes && <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">{c.notes}</p>}
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
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Concentração por bairro</h3>
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
    </div>
  );
}