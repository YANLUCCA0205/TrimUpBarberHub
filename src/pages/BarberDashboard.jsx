import db from '@/lib/db';
import { supabase } from "@/lib/supabase";

import { useState, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";
import { DollarSign, Users, Calendar, Percent, Plus, Star, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ClientHeatmap from "@/components/dashboard/ClientHeatmap";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { notifyNewAppointment } from "../lib/notifications";

// Calculate real weekly revenue from appointments
function getWeeklyRevenue(appointments) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();
  const weekData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayRevenue = appointments
      .filter(a => a.date === dateStr && a.status === 'concluido')
      .reduce((sum, a) => sum + (a.price || 0), 0);
    weekData.push({ day: days[d.getDay()], valor: dayRevenue });
  }
  return weekData;
}

export default function BarberDashboard() {
  const { user } = useAuth();
  const [barber, setBarber] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "", duration_minutes: "30", category: "corte", description: "" });
  const [isAdmin, setIsAdmin] = useState(false);

  const [shopClients, setShopClients] = useState([]);
  const [showApptDialog, setShowApptDialog] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", email: "", phone: "" });
  const [apptForm, setApptForm] = useState({ service_id: "", date: new Date().toISOString().split('T')[0], time: "09:00", notes: "" });
  const [savingAppt, setSavingAppt] = useState(false);

  const TIMES = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
    "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];

  useEffect(() => {
    async function load() {
      if (!user) return;
      const barbers = await db.entities.Barber.filter({ profile_id: user.id });
      if (barbers.length > 0) {
        const currentBarber = barbers[0];
        setBarber(currentBarber);
        const [a, s, membershipRes, clientsRes] = await Promise.all([
          db.entities.Appointment.filter({ barber_id: currentBarber.id }, "-date", 500),
          db.entities.Service.filter({ barber_id: currentBarber.id }),
          currentBarber.shop_id 
            ? supabase.from('shop_memberships').select('role').eq('shop_id', currentBarber.shop_id).eq('profile_id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
          currentBarber.shop_id
            ? db.entities.Client.filter({ shop_id: currentBarber.shop_id })
            : Promise.resolve([])
        ]);
        setAppointments(a);
        setServices(s);
        setShopClients(clientsRes || []);
        const isShopAdmin = membershipRes?.data?.role === 'owner' || membershipRes?.data?.role === 'admin' || user?.roles?.includes('siteowner');
        setIsAdmin(isShopAdmin);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function createBarberProfile() {
    const b = await db.entities.Barber.create({ name: user.full_name || "Meu Perfil", owner_email: user.email, profile_id: user.id });
    setBarber(b);
  }

  async function addService() {
    if (!newService.name || !newService.price) return;
    const s = await db.entities.Service.create({
      ...newService,
      price: parseFloat(newService.price),
      duration_minutes: parseInt(newService.duration_minutes),
      barber_id: barber.id,
    });
    setServices([...services, s]);
    setNewService({ name: "", price: "", duration_minutes: "30", category: "corte", description: "" });
    setShowServiceDialog(false);
  }

  const handleClientSearch = (val) => {
    setClientSearch(val);
    if (val.length < 2) {
      setClientSuggestions([]);
      return;
    }
    const lv = val.toLowerCase();
    const matches = shopClients.filter(c =>
      c.name?.toLowerCase().includes(lv) ||
      c.phone?.includes(val) ||
      c.email?.toLowerCase().includes(lv)
    );
    setClientSuggestions(matches.slice(0, 5));
  };

  const selectClient = (c) => {
    setSelectedClient(c);
    setClientSearch(c.name);
    setClientSuggestions([]);
    setIsNewClient(false);
  };

  async function saveAppointment() {
    if (!barber?.shop_id) { toast.error("Você precisa estar vinculado a uma barbearia"); return; }
    
    let clientRecord = selectedClient;

    if (isNewClient) {
      const trimmedName = newClientForm.name?.trim();
      const trimmedEmail = newClientForm.email?.trim().toLowerCase();
      const trimmedPhone = newClientForm.phone?.trim();

      if (!trimmedName) {
        toast.error("Nome do cliente é obrigatório");
        return;
      }

      // Check for existing client with same email or phone
      setSavingAppt(true);
      try {
        if (trimmedEmail || trimmedPhone) {
          const existingClients = await db.entities.Client.filter({ shop_id: barber.shop_id });
          const duplicate = existingClients.find(c => 
            (trimmedEmail && c.email?.toLowerCase() === trimmedEmail.toLowerCase()) ||
            (trimmedPhone && c.phone === trimmedPhone)
          );
          if (duplicate) {
            clientRecord = duplicate;
            toast.info(`Cliente existente encontrado: ${duplicate.name}`);
          }
        }

        if (!clientRecord) {
          clientRecord = await db.entities.Client.create({
            shop_id: barber.shop_id,
            name: trimmedName,
            email: trimmedEmail || null,
            phone: trimmedPhone || null,
            source: 'manual'
          });
          setShopClients(prev => [...prev, clientRecord]);
        }
      } catch (err) {
        console.error("Error creating client record:", err);
        toast.error("Erro ao cadastrar cliente");
        setSavingAppt(false);
        return;
      }
    }

    if (!clientRecord) {
      toast.error("Selecione ou cadastre um cliente");
      return;
    }

    if (!apptForm.service_id || !apptForm.date || !apptForm.time) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    // Check conflict
    const conflict = appointments.find(a =>
      a.barber_id === barber.id &&
      a.date === apptForm.date &&
      a.time === apptForm.time &&
      !["cancelado", "faltou"].includes(a.status)
    );

    if (conflict) {
      toast.error(`Horário conflitante! O cliente ${conflict.client_name} já está agendado neste horário.`);
      return;
    }

    setSavingAppt(true);
    try {
      const selectedService = services.find(s => s.id === apptForm.service_id);
      const apptData = {
        barber_id: barber.id,
        barber_name: barber.name,
        shop_id: barber.shop_id,
        client_id: clientRecord.profile_id || null,
        client_name: clientRecord.name,
        client_email: clientRecord.email || "",
        service_id: apptForm.service_id,
        service_name: selectedService?.name || "Serviço",
        price: selectedService?.price || 0,
        date: apptForm.date,
        time: apptForm.time,
        notes: apptForm.notes || "",
        status: "confirmado"
      };

      const created = await db.entities.Appointment.create(apptData);
      setAppointments(prev => [created, ...prev]);

      if (clientRecord.profile_id) {
        try {
          await notifyNewAppointment(clientRecord.profile_id, {
            barberName: barber.name,
            serviceName: apptData.service_name,
            date: apptData.date,
            time: apptData.time
          });
        } catch (nErr) {
          console.warn("Failed to notify client:", nErr);
        }
      }

      toast.success("Agendamento criado!");
      setShowApptDialog(false);
      // Reset form
      setClientSearch("");
      setSelectedClient(null);
      setIsNewClient(false);
      setNewClientForm({ name: "", email: "", phone: "" });
      setApptForm({ service_id: "", date: new Date().toISOString().split('T')[0], time: "09:00", notes: "" });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar agendamento");
    } finally {
      setSavingAppt(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Star className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Crie seu perfil de barbeiro</h2>
        <p className="text-muted-foreground mb-8">Configure seu perfil profissional e comece a receber agendamentos.</p>
        <Button onClick={createBarberProfile} className="bg-primary text-primary-foreground rounded-xl px-8">
          Criar perfil
        </Button>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === today).sort((a, b) => a.time?.localeCompare(b.time));
  const totalRevenue = appointments.filter(a => a.status === "concluido").reduce((sum, a) => sum + (a.price || 0), 0);
  const chartData = getWeeklyRevenue(appointments);

  const stats = [
    { icon: DollarSign, value: `R$${totalRevenue.toLocaleString()}`, label: "Faturamento", trend: 12 },
    { icon: Users, value: barber.total_clients || appointments.length, label: "Clientes", trend: 8 },
    { icon: Calendar, value: todayAppointments.length, label: "Hoje", trend: null },
    { icon: Percent, value: `${barber.retention_rate || 85}%`, label: "Retenção", trend: 3 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Painel</h1>
          <p className="text-sm text-muted-foreground">{barber.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showApptDialog} onOpenChange={setShowApptDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground rounded-xl flex items-center gap-2">
                <Plus className="w-4.5 h-4.5" /> Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Seleção ou Cadastro de Cliente */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm">Cliente</Label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsNewClient(!isNewClient);
                        setSelectedClient(null);
                        setClientSearch("");
                      }}
                      className="text-xs text-amber-500 hover:underline font-medium"
                    >
                      {isNewClient ? "Buscar Existente" : "Cadastrar Novo"}
                    </button>
                  </div>

                  {!isNewClient ? (
                    <div className="relative">
                      <Input
                        value={clientSearch}
                        onChange={e => handleClientSearch(e.target.value)}
                        placeholder="Buscar por nome, e-mail ou telefone..."
                        className="bg-muted border-border/50 rounded-xl"
                      />
                      {clientSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                          {clientSuggestions.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectClient(c)}
                              className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-900 transition-colors border-b border-zinc-900 last:border-0"
                            >
                              <p className="font-semibold text-white">{c.name}</p>
                              <p className="text-[10px] text-zinc-500">{c.phone || "Sem telefone"} • {c.email || "Sem e-mail"}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedClient && (
                        <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1 font-medium">
                          ✓ Selecionado: {selectedClient.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 p-3.5 bg-muted/30 rounded-xl border border-border/50">
                      <div>
                        <Label className="text-[11px] text-zinc-400">Nome Completo</Label>
                        <Input
                          value={newClientForm.name}
                          onChange={e => setNewClientForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Ex: Carlos Silva"
                          className="bg-muted border-border/50 rounded-xl h-9 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <Label className="text-[11px] text-zinc-400">Celular / WhatsApp</Label>
                          <Input
                            value={newClientForm.phone}
                            onChange={e => setNewClientForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="Ex: (11) 99999-9999"
                            className="bg-muted border-border/50 rounded-xl h-9 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-zinc-400">E-mail</Label>
                          <Input
                            value={newClientForm.email}
                            type="email"
                            onChange={e => setNewClientForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="Ex: carlos@email.com"
                            className="bg-muted border-border/50 rounded-xl h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seleção de Serviço */}
                <div>
                  <Label className="text-sm block mb-1.5">Serviço</Label>
                  <Select 
                    value={apptForm.service_id} 
                    onValueChange={v => setApptForm(f => ({ ...f, service_id: v }))}
                  >
                    <SelectTrigger className="bg-muted border-border/50 rounded-xl">
                      <SelectValue placeholder="Selecione um serviço..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (R${s.price} • {s.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm block mb-1.5">Data</Label>
                    <Input
                      type="date"
                      value={apptForm.date}
                      onChange={e => setApptForm(f => ({ ...f, date: e.target.value }))}
                      className="bg-muted border-border/50 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm block mb-1.5">Horário</Label>
                    <Select
                      value={apptForm.time}
                      onValueChange={v => setApptForm(f => ({ ...f, time: v }))}
                    >
                      <SelectTrigger className="bg-muted border-border/50 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <Label className="text-sm block mb-1.5">Observações (opcional)</Label>
                  <Textarea
                    value={apptForm.notes}
                    onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Algum detalhe sobre o corte..."
                    className="bg-muted border-border/50 rounded-xl resize-none h-16 text-xs"
                  />
                </div>

                <Button 
                  onClick={saveAppointment} 
                  disabled={savingAppt} 
                  className="w-full bg-primary text-primary-foreground rounded-xl font-medium"
                >
                  {savingAppt ? "Criando..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {isAdmin && (
            <Link to="/shop-settings">
              <Button variant="outline" size="sm" className="rounded-xl border-border/50 gap-2 h-10">
                <Settings className="w-4 h-4" /> Configurar Barbearia
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Agenda de Hoje */}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          Agenda de Hoje
        </h2>
        {todayAppointments.length === 0 ? (
          <p className="text-zinc-400 text-sm">Nenhum agendamento para hoje.</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map(appt => (
              <div key={appt.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="text-white font-medium">{appt.client_name}</p>
                  <p className="text-zinc-400 text-sm">{appt.service_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-500 font-medium">{appt.time}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${appt.status === 'concluido' ? 'bg-green-500/20 text-green-400' : appt.status === 'confirmado' ? 'bg-blue-500/20 text-blue-400' : appt.status === 'cancelado' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {appt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StatsGrid stats={stats} />

      {/* Chart */}
      <div className="mt-6 p-6 rounded-2xl bg-card border border-border/50">
        <h3 className="font-semibold mb-4">Faturamento semanal</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,55%)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,55%)", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,10%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "12px", color: "#fff" }} />
              <Area type="monotone" dataKey="valor" stroke="hsl(38,92%,50%)" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="mt-8">
        <ClientHeatmap />
      </div>

      {/* Services */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Serviços</h3>
          <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader>
                <DialogTitle>Novo Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="bg-muted border-border/50 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preço (R$)</Label>
                    <Input type="number" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} className="bg-muted border-border/50 rounded-xl" />
                  </div>
                  <div>
                    <Label>Duração (min)</Label>
                    <Input type="number" value={newService.duration_minutes} onChange={e => setNewService({...newService, duration_minutes: e.target.value})} className="bg-muted border-border/50 rounded-xl" />
                  </div>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={newService.category} onValueChange={v => setNewService({...newService, category: v})}>
                    <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["corte","barba","combo","tratamento","coloração","outros"].map(c => (
                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="bg-muted border-border/50 rounded-xl" />
                </div>
                <Button onClick={addService} className="w-full bg-primary text-primary-foreground rounded-xl">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
            <p>Nenhum serviço cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-card border border-border/50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{s.name}</h4>
                  <span className="text-primary font-bold">R${s.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.duration_minutes} min • {s.category}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Appointments */}
      <div className="mt-8">
        <h3 className="font-semibold text-lg mb-4">Agendamentos recentes</h3>
        {appointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
            <p>Nenhum agendamento ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
                <div>
                  <p className="font-medium text-sm">{a.client_name || a.client_email}</p>
                  <p className="text-xs text-muted-foreground">{a.service_name} • {a.date} às {a.time}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  a.status === "concluido" ? "bg-emerald-500/10 text-emerald-400" :
                  a.status === "cancelado" ? "bg-red-500/10 text-red-400" :
                  "bg-primary/10 text-primary"
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}