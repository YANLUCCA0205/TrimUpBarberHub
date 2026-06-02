const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

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

const mockChart = [
  { day: "Seg", valor: 320 }, { day: "Ter", valor: 480 }, { day: "Qua", valor: 390 },
  { day: "Qui", valor: 520 }, { day: "Sex", valor: 680 }, { day: "Sáb", valor: 890 }, { day: "Dom", valor: 200 },
];

export default function BarberDashboard() {
  const { user } = useAuth();
  const [barber, setBarber] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "", duration_minutes: "30", category: "corte", description: "" });

  useEffect(() => {
    async function load() {
      if (!user) return;
      const barbers = await db.entities.Barber.filter({ owner_email: user.email });
      if (barbers.length > 0) {
        setBarber(barbers[0]);
        const [a, s] = await Promise.all([
          db.entities.Appointment.filter({ barber_id: barbers[0].id }, "-date", 20),
          db.entities.Service.filter({ barber_id: barbers[0].id }),
        ]);
        setAppointments(a);
        setServices(s);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function createBarberProfile() {
    const b = await db.entities.Barber.create({ name: user.full_name || "Meu Perfil", owner_email: user.email });
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

  const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split("T")[0]);
  const totalRevenue = appointments.filter(a => a.status === "concluido").reduce((sum, a) => sum + (a.price || 0), 0);

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
        <Link to="/shop-settings">
          <Button variant="outline" size="sm" className="rounded-xl border-border/50 gap-2">
            <Settings className="w-4 h-4" /> Configurar Barbearia
          </Button>
        </Link>
      </div>

      <StatsGrid stats={stats} />

      {/* Chart */}
      <div className="mt-6 p-6 rounded-2xl bg-card border border-border/50">
        <h3 className="font-semibold mb-4">Faturamento semanal</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChart}>
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