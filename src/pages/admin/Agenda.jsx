import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEntityQuery, useEntityMutation } from "@/hooks/useSupabaseQuery";

import { useAuth } from "@/lib/AuthContext";
import { Plus, ChevronLeft, ChevronRight, Check, X, Edit2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "agendado",     label: "Agendado",        color: "bg-blue-500/10 text-blue-400" },
  { value: "confirmado",   label: "Confirmado",      color: "bg-primary/10 text-primary" },
  { value: "em_andamento", label: "Em andamento",    color: "bg-amber-500/10 text-amber-400" },
  { value: "concluido",    label: "Concluído",       color: "bg-emerald-500/10 text-emerald-400" },
  { value: "cancelado",    label: "Cancelado",       color: "bg-red-500/10 text-red-400" },
  { value: "faltou",       label: "Faltou/Ausente",  color: "bg-muted text-muted-foreground" },
];

const TIMES = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];

const VIEW_MODES = ["Dia", "Semana", "Mês"];

function getWeekDates(date) {
  const d = new Date(date + "T12:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(d);
    nd.setDate(diff + i);
    return nd.toISOString().split("T")[0];
  });
}

function MonthView({ selectedDate, filteredAppts, setSelectedDate, setViewMode, openEdit }) {
  const yearMonth = selectedDate.slice(0, 7);
  const firstDay = new Date(yearMonth + "-01T12:00");
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }, (_, idx) => {
          const dayNum = idx - startDow + 1;
          if (dayNum < 1 || dayNum > lastDay.getDate()) return <div key={idx} className="min-h-[80px]" />;
          const dateStr = `${yearMonth}-${String(dayNum).padStart(2, "0")}`;
          const dayAppts = filteredAppts.filter(a => a.date === dateStr);
          const isToday = dateStr === today;
          return (
            <div key={idx}
              onClick={() => { setSelectedDate(dateStr); setViewMode(0); }}
              className={`min-h-[80px] p-1.5 rounded-xl cursor-pointer transition-all border ${
                isToday ? "bg-primary/5 border-primary/30" : "bg-card border-border/30 hover:border-border"
              }`}>
              <span className={`text-xs font-semibold block mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}>{dayNum}</span>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map(a => {
                  const st = STATUS_OPTIONS.find(s => s.value === a.status);
                  return (
                    <div key={a.id}
                      onClick={e => { e.stopPropagation(); openEdit(a); }}
                      className={`text-[9px] px-1 py-0.5 rounded truncate leading-tight ${st?.color || "bg-primary/10 text-primary"}`}>
                      {a.time} {a.client_name?.split(" ")[0]}
                    </div>
                  );
                })}
                {dayAppts.length > 3 && <div className="text-[9px] text-muted-foreground pl-1">+{dayAppts.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ weekDates, filteredAppts, openEdit }) {
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map(date => {
        const dayAppts = filteredAppts.filter(a => a.date === date);
        const isToday = date === today;
        const d = new Date(date + "T12:00");
        return (
          <div key={date} className={`rounded-2xl p-3 min-h-32 ${isToday ? "bg-primary/5 border border-primary/20" : "bg-card border border-border/50"}`}>
            <p className={`text-xs font-semibold mb-2 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
              {d.toLocaleDateString("pt-BR", { weekday: "short" })} {d.getDate()}
            </p>
            <div className="space-y-1.5">
              {dayAppts.slice(0, 4).map(a => {
                const st = STATUS_OPTIONS.find(s => s.value === a.status);
                return (
                  <div key={a.id}
                    className={`text-[10px] px-2 py-1 rounded-lg truncate cursor-pointer ${st?.color || "bg-primary/10 text-primary"} hover:opacity-80`}
                    onClick={() => openEdit(a)}>
                    {a.time} {a.client_name?.split(" ")[0] || "—"}
                  </div>
                );
              })}
              {dayAppts.length > 4 && <p className="text-[10px] text-muted-foreground pl-1">+{dayAppts.length - 4}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ filteredAppts, openEdit, updateStatus, openNew }) {
  if (filteredAppts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p>Nenhum agendamento neste período.</p>
        <button onClick={openNew} className="mt-3 text-sm text-primary hover:underline">Criar agendamento</button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {filteredAppts.map(a => {
        const st = STATUS_OPTIONS.find(s => s.value === a.status) || STATUS_OPTIONS[0];
        return (
          <div key={a.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all group">
            <span className="text-sm font-mono text-muted-foreground w-12 flex-shrink-0">{a.time}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{a.client_name || a.client_email}</p>
              <p className="text-xs text-muted-foreground">{a.service_name}{a.price ? ` • R$${a.price}` : ""}{a.barber_name ? ` • ${a.barber_name}` : ""}</p>
              {a.notes && <p className="text-xs text-muted-foreground/60 mt-0.5 italic truncate">{a.notes}</p>}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${st.color}`}>{st.label}</span>
            <div className="hidden group-hover:flex items-center gap-1">
              {a.status !== "concluido" && (
                <button onClick={() => updateStatus(a.id, "concluido")} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg hover:bg-emerald-500/20">✓ Concluir</button>
              )}
              {a.status !== "cancelado" && (
                <button onClick={() => updateStatus(a.id, "cancelado")} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/20">Cancelar</button>
              )}
              {a.status !== "faltou" && (
                <button onClick={() => updateStatus(a.id, "faltou")} className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-lg hover:text-foreground">Faltou</button>
              )}
              <button onClick={() => openEdit(a)} className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-lg hover:text-foreground">
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Agenda() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedBarber, setSelectedBarber] = useState("all");
  const [viewMode, setViewMode] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [form, setForm] = useState(/** @type {any} */ ({ status: "agendado" }));

  // React Query Queries
  const { data: shops = [], isLoading: loadingShops } = useEntityQuery(
    'Shop',
    { owner_email: user?.email },
    { enabled: !!user?.email }
  );
  const shop = shops[0] || null;

  const { data: barbers = [], isLoading: loadingBarbers } = useEntityQuery(
    'Barber',
    { shop_id: shop?.id },
    { enabled: !!shop?.id }
  );

  const barberIds = barbers.map(b => b.id);
  const { data: appointments = [], isLoading: loadingAppointments } = useEntityQuery(
    'Appointment',
    { barber_id: barberIds },
    { enabled: barberIds.length > 0, order: "-date", limit: 500 }
  );

  const { data: services = [] } = useEntityQuery(
    'Service',
    { barber_id: barberIds },
    { enabled: barberIds.length > 0 }
  );

  const { data: clients = [] } = useEntityQuery(
    'Client',
    { shop_id: shop?.id },
    { enabled: !!shop?.id }
  );

  const barberServices = services.filter(s => s.barber_id === form.barber_id && s.is_active !== false);

  // React Query Mutations
  const createMutation = useEntityMutation('Appointment', 'create');
  const updateMutation = useEntityMutation('Appointment', 'update');

  const loading = loadingShops || loadingBarbers || loadingAppointments;

  async function saveAppointment() {
    if (!shop) { toast.error('Barbearia não encontrada'); return; }
    if (!form.barber_id || !form.client_name || !form.service_name || !form.date || !form.time) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (form.date < todayStr || (form.date === todayStr && form.time < nowTimeStr)) {
      if (["agendado", "confirmado", "em_andamento"].includes(form.status)) {
        toast.error("Não é possível agendar horários pendentes ou futuros no passado!");
        return;
      }
    }

    const conflict = appointments.find(a =>
      a.barber_id === form.barber_id &&
      a.date === form.date &&
      a.time === form.time &&
      a.id !== editingAppt?.id &&
      !["cancelado", "faltou"].includes(a.status)
    );
    if (conflict) {
      toast.error(`Conflito de horário! ${conflict.client_name || "Cliente"} já está agendado às ${conflict.time}.`);
      return;
    }
    const barber = barbers.find(b => b.id === form.barber_id);
    const data = { ...form, barber_name: barber?.name, client_email: form.client_email || "", shop_id: shop.id };
    
    try {
      if (editingAppt) {
        await updateMutation.mutateAsync({ id: editingAppt.id, data });
        toast.success("Agendamento atualizado!");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Agendamento criado!");
      }
      queryClient.invalidateQueries({ queryKey: ['Appointment'] });
      setShowForm(false);
      setEditingAppt(null);
      setForm({ status: "agendado" });
      setClientSuggestions([]);
    } catch (err) {
      toast.error("Erro ao salvar agendamento");
    }
  }

  async function updateStatus(id, status) {
    try {
      await updateMutation.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: ['Appointment'] });
      toast.success("Status atualizado!");
    } catch (err) {
      toast.error("Erro ao atualizar o status");
    }
  }

  function openEdit(appt) {
    setEditingAppt(appt);
    setForm({ ...appt });
    setShowForm(true);
  }

  function openNew() {
    setEditingAppt(null);
    setForm({ status: "agendado", date: selectedDate });
    setClientSuggestions([]);
    setShowForm(true);
  }

  function handleClientNameChange(val) {
    setForm(f => ({ ...f, client_name: val }));
    if (val.length < 2) { setClientSuggestions([]); return; }
    const lv = val.toLowerCase();
    const clientMatches = clients
      .filter(c => c.name?.toLowerCase().includes(lv) || c.phone?.includes(val) || c.email?.toLowerCase().includes(lv))
      .slice(0, 5)
      .map(c => ({ client_name: c.name, client_email: c.email, _phone: c.whatsapp || c.phone, _source: "crm" }));
    const seen = new Set(clientMatches.map(c => c.client_name?.toLowerCase()));
    const apptMatches = appointments
      .filter(a => a.client_name?.toLowerCase().includes(lv))
      .filter(a => { if (seen.has(a.client_name?.toLowerCase())) return false; seen.add(a.client_name?.toLowerCase()); return true; })
      .slice(0, 3)
      .map(a => ({ client_name: a.client_name, client_email: a.client_email, _source: "historico" }));
    setClientSuggestions([...clientMatches, ...apptMatches]);
  }

  function selectClientSuggestion(c) {
    setForm(f => ({ ...f, client_name: c.client_name, client_email: c.client_email || f.client_email }));
    setClientSuggestions([]);
  }

  function selectService(svc) {
    setForm(f => ({ ...f, service_name: svc.name, price: svc.price, service_id: svc.id }));
  }

  const navigateDate = (dir) => {
    const d = new Date(selectedDate + "T12:00");
    if (viewMode === 0) d.setDate(d.getDate() + dir);
    else if (viewMode === 1) d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const weekDates = getWeekDates(selectedDate);
  const visibleDates = viewMode === 0 ? [selectedDate] : viewMode === 1 ? weekDates : [];

  const filteredAppts = appointments.filter(a => {
    const dateMatch = viewMode === 2
      ? a.date?.startsWith(selectedDate.slice(0, 7))
      : visibleDates.includes(a.date);
    const barberMatch = selectedBarber === "all" || a.barber_id === selectedBarber;
    return dateMatch && barberMatch;
  }).sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Button onClick={openNew} className="bg-primary text-primary-foreground rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Novo agendamento
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {VIEW_MODES.map((m, i) => (
            <button key={m} onClick={() => setViewMode(i)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${viewMode === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-36 text-center">
            {viewMode === 0
              ? new Date(selectedDate + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
              : viewMode === 1
              ? `${new Date(weekDates[0] + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${new Date(weekDates[6] + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`
              : new Date(selectedDate + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
            }
          </span>
          <button onClick={() => navigateDate(1)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className="px-3 py-1.5 text-xs bg-muted rounded-lg text-muted-foreground hover:text-foreground">
            Hoje
          </button>
        </div>

        {barbers.length > 1 && (
          <select value={selectedBarber} onChange={e => setSelectedBarber(e.target.value)}
            className="text-sm bg-muted border-0 rounded-xl px-3 py-2 text-muted-foreground">
            <option value="all">Todos os barbeiros</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl bg-card border border-primary/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editingAppt ? "Editar agendamento" : "Novo agendamento"}</h3>
            <button onClick={() => { setShowForm(false); setEditingAppt(null); setClientSuggestions([]); }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Barbeiro *</Label>
              <Select value={form.barber_id || ""} onValueChange={v => setForm(f => ({ ...f, barber_id: v }))}>
                <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>{barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data *</Label>
              <Input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Horário *</Label>
              <Select value={form.time || ""} onValueChange={v => setForm(f => ({ ...f, time: v }))}>
                <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue placeholder="--:--" /></SelectTrigger>
                <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Cliente com autocomplete CRM + histórico */}
            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome do cliente *</Label>
              <Input
                value={form.client_name || ""}
                onChange={e => handleClientNameChange(e.target.value)}
                placeholder="Digite para buscar..."
                className="bg-muted border-border/50 rounded-xl"
                autoComplete="off"
              />
              {clientSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {clientSuggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => selectClientSuggestion(s)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {s.client_name?.[0]}
                      </span>
                      <div>
                        <p className="font-medium text-xs">{s.client_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s._phone && `${s._phone} · `}{s.client_email}
                          {s._source === "crm" && <span className="ml-1 text-primary font-medium">CRM</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Email do cliente</Label>
              <Input value={form.client_email || ""} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Serviço *</Label>
              {barberServices.length > 0 ? (
                <Select value={form.service_id || ""} onValueChange={v => { const svc = barberServices.find(s => s.id === v); if (svc) selectService(svc); }}>
                  <SelectTrigger className="bg-muted border-border/50 rounded-xl">
                    <SelectValue placeholder={form.service_name || "Selecionar serviço..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {barberServices.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — R${s.price} ({s.duration_minutes}min)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.service_name || ""} onChange={e => setForm(f => ({ ...f, service_name: e.target.value }))} placeholder="Nome do serviço" className="bg-muted border-border/50 rounded-xl" />
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Preço (R$)</Label>
              <Input type="number" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) }))} className="bg-muted border-border/50 rounded-xl" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={form.status || "agendado"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Observações internas</Label>
            <Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="bg-muted border-border/50 rounded-xl resize-none" placeholder="Preferências, alergias, observações..." />
          </div>

          <Button onClick={saveAppointment} className="bg-primary text-primary-foreground rounded-xl gap-2">
            <Check className="w-4 h-4" /> {editingAppt ? "Salvar alterações" : "Criar agendamento"}
          </Button>
        </div>
      )}

      {/* Views */}
      {viewMode === 2 ? (
        <MonthView
          selectedDate={selectedDate}
          filteredAppts={filteredAppts}
          setSelectedDate={setSelectedDate}
          setViewMode={setViewMode}
          openEdit={openEdit}
        />
      ) : viewMode === 1 ? (
        <WeekView weekDates={weekDates} filteredAppts={filteredAppts} openEdit={openEdit} />
      ) : (
        <DayView filteredAppts={filteredAppts} openEdit={openEdit} updateStatus={updateStatus} openNew={openNew} />
      )}
    </div>
  );
}