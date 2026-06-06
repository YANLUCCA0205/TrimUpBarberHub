import db from '@/lib/db';
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ChevronLeft, ChevronRight, Check, Star, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useEntityQuery, useEntityGet, useEntityMutation } from "@/hooks/useSupabaseQuery";

const timeSlots = ["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];

const STEPS = ["Barbearia", "Barbeiro", "Serviço", "Horário", "Confirmar"];

export default function Booking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null); // null = sem preferência
  const [noPreference, setNoPreference] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [booking, setBooking] = useState(false);
  const [isBarberBooking, setIsBarberBooking] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 1. Initial queries to detect if current user is a barber with a shop profile
  const isUserBarber = user?.roles?.includes("barber") || user?.role === "barber";
  
  const { data: barberProfiles = [], isLoading: barberLoading } = useEntityQuery(
    "Barber",
    user?.id ? { profile_id: user.id } : {},
    { enabled: !!user?.id && isUserBarber }
  );
  
  const activeBarberProfile = barberProfiles[0];
  
  const { data: activeBarberShop, isLoading: barberShopLoading } = useEntityGet(
    "Shop",
    activeBarberProfile?.shop_id,
    { enabled: !!activeBarberProfile?.shop_id }
  );

  // 2. Initial queries for URL parameters
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlShopId = params.get("shop");
  const urlBarberId = params.get("barber");

  const { data: urlShop, isLoading: urlShopLoading } = useEntityGet(
    "Shop",
    urlShopId,
    { enabled: !!urlShopId }
  );

  const { data: urlBarber, isLoading: urlBarberLoading } = useEntityGet(
    "Barber",
    urlBarberId,
    { enabled: !!urlBarberId }
  );

  // 3. React Query hooks for fetching standard options
  // List of active shops
  const { data: rawShops = [] } = useEntityQuery(
    "Shop",
    {},
    { order: "-rating" }
  );
  const shops = useMemo(() => rawShops.filter(x => x.is_active !== false), [rawShops]);

  // List of active barbers for selected shop
  const { data: rawBarbers = [] } = useEntityQuery(
    "Barber",
    selectedShop?.id ? { shop_id: selectedShop.id } : {},
    { enabled: !!selectedShop?.id }
  );
  const barbers = useMemo(() => rawBarbers.filter(x => x.is_active !== false), [rawBarbers]);

  // List of services for chosen barber or all barbers in shop (no preference)
  const barberIds = useMemo(() => barbers.map(b => b.id), [barbers]);

  const serviceFilters = useMemo(() => {
    if (noPreference) {
      return barberIds.length > 0 ? { barber_id: { $in: barberIds } } : null;
    }
    return selectedBarber?.id ? { barber_id: selectedBarber.id } : null;
  }, [noPreference, barberIds, selectedBarber]);

  const { data: rawServices = [] } = useEntityQuery(
    "Service",
    serviceFilters || {},
    { enabled: !!serviceFilters }
  );

  const services = useMemo(() => {
    const active = rawServices.filter(x => x.is_active !== false);
    if (!noPreference) return active;

    const allServices = [];
    active.forEach(svc => {
      if (!allServices.find(x => x.name === svc.name)) {
        const b = barbers.find(barber => barber.id === svc.barber_id);
        allServices.push({ ...svc, _barber: b });
      }
    });
    return allServices;
  }, [rawServices, noPreference, barbers]);

  // 4. React Query hook for taken slots on a specific date for selected barber
  const appointmentFilters = useMemo(() => {
    if (selectedBarber?.id && selectedDate) {
      return { barber_id: selectedBarber.id, date: selectedDate };
    }
    return null;
  }, [selectedBarber?.id, selectedDate]);

  const { data: appointmentSlots = [] } = useEntityQuery(
    "Appointment",
    appointmentFilters || {},
    { enabled: !!appointmentFilters }
  );

  const takenSlots = useMemo(() => {
    return appointmentSlots
      .filter(a => !["cancelado", "faltou"].includes(a.status))
      .map(a => a.time);
  }, [appointmentSlots]);

  // Mutations
  const createAppointmentMutation = useEntityMutation("Appointment", "create");
  const createClientMutation = useEntityMutation("Client", "create");
  const updateClientMutation = useEntityMutation("Client", "update");

  // Effect to handle initialization from auth status or url query params
  useEffect(() => {
    if (!user) return;

    if (isUserBarber && (barberLoading || (activeBarberProfile?.shop_id && barberShopLoading))) {
      return;
    }
    if (urlShopId && urlShopLoading) return;
    if (urlBarberId && urlBarberLoading) return;

    if (initialLoaded) return;

    if (isUserBarber && activeBarberProfile && activeBarberShop) {
      setSelectedShop(activeBarberShop);
      setSelectedBarber(activeBarberProfile);
      setIsBarberBooking(true);
      setStep(2);
    } else if (urlShopId && urlShop) {
      setSelectedShop(urlShop);
      if (urlBarberId && urlBarber) {
        setSelectedBarber(urlBarber);
        setStep(2);
      } else {
        setStep(1);
      }
    }
    
    setInitialLoaded(true);
  }, [
    user,
    isUserBarber,
    barberLoading,
    activeBarberProfile,
    barberShopLoading,
    activeBarberShop,
    urlShopId,
    urlShopLoading,
    urlShop,
    urlBarberId,
    urlBarberLoading,
    urlBarber,
    initialLoaded
  ]);

  function selectShop(shop) {
    setSelectedShop(shop);
    setStep(1);
  }

  function selectBarber(barber) {
    setSelectedBarber(barber);
    setNoPreference(false);
    setStep(2);
  }

  function selectNoPreference() {
    setNoPreference(true);
    setSelectedBarber(null);
    setStep(2);
  }

  function selectService(service) {
    setSelectedService(service);
    if (noPreference && service._barber) {
      setSelectedBarber(service._barber);
    }
    setStep(3);
  }

  async function confirmBooking() {
    // 1. Secure conflict check: fetch fresh list from db right before creating the appointment to avoid race conditions
    const latestAppts = await db.entities.Appointment.filter({
      barber_id: selectedBarber.id,
      date: selectedDate
    });
    
    const isSlotTaken = latestAppts.some(
      a => a.time === selectedTime && !["cancelado", "faltou"].includes(a.status)
    );
    
    if (isSlotTaken) {
      toast.error("Este horário já foi reservado por outro cliente. Por favor, escolha outro.");
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["Appointment"] });
      return;
    }

    // 2. Secure past booking check: ensure time has not passed
    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (selectedDate < todayStr || (selectedDate === todayStr && selectedTime <= nowTimeStr)) {
      toast.error("Você não pode agendar um horário no passado!");
      setStep(3);
      return;
    }

    setBooking(true);
    try {
      await createAppointmentMutation.mutateAsync({
        barber_id: selectedBarber.id,
        barber_name: selectedBarber.name,
        client_id: user.id,
        client_email: user.email,
        client_name: user.full_name,
        shop_id: selectedShop.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate,
        time: selectedTime,
        price: selectedService.price,
        status: "agendado",
      });

      // Upsert Client CRM record with updated stats for this specific shop
      const existingClients = await db.entities.Client.filter({ shop_id: selectedShop.id, email: user.email });
      if (existingClients.length > 0) {
        const c = existingClients[0];
        const newVisits = (c.total_visits || 0) + 1;
        const newSpent = (c.total_spent || 0) + (selectedService.price || 0);
        await updateClientMutation.mutateAsync({
          id: c.id,
          data: {
            last_visit: selectedDate,
            total_visits: newVisits,
            total_spent: newSpent,
            avg_ticket: newVisits > 0 ? Math.round(newSpent / newVisits) : 0,
            shop_id: selectedShop.id,
            barber_id: selectedBarber.id,
            profile_id: user.id
          }
        });
      } else {
        await createClientMutation.mutateAsync({
          name: user.full_name || user.email,
          email: user.email,
          profile_id: user.id,
          shop_id: selectedShop.id,
          barber_id: selectedBarber.id,
          last_visit: selectedDate,
          total_visits: 1,
          total_spent: selectedService.price || 0,
          avg_ticket: selectedService.price || 0,
        });
      }

      toast.success("Agendamento confirmado!");
      setStep(5);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao confirmar agendamento. Tente novamente.");
    } finally {
      setBooking(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().split("T")[0], label: d.toLocaleDateString("pt-BR", { weekday: "short" }), day: d.getDate() };
  });

  function reset() {
    setStep(0);
    setSelectedShop(null);
    setSelectedBarber(null);
    setNoPreference(false);
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime("");
  }

  if (!initialLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
      {/* Progress */}
      {step < 5 && (
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Escolha a Barbearia */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-bold mb-6">Escolha a barbearia</h2>
          <div className="space-y-3">
            {shops.map(shop => (
              <button key={shop.id} onClick={() => selectShop(shop)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all text-left">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {shop.logo ? <img src={shop.logo} className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-primary/50">{shop.name?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{shop.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {shop.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-primary fill-primary" />{shop.rating.toFixed(1)}</span>}
                    {shop.neighborhood && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{shop.neighborhood}{shop.city ? `, ${shop.city}` : ""}</span>}
                  </div>
                  {shop.slogan && <p className="text-xs text-muted-foreground/70 mt-1 truncate">{shop.slogan}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
            {shops.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p>Nenhuma barbearia disponível no momento.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Escolha o Barbeiro */}
      {step === 1 && (
        <div>
          <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-xl font-bold mb-2">Escolha seu barbeiro</h2>
          <p className="text-sm text-muted-foreground mb-6">{selectedShop?.name}</p>

          {/* Sem preferência */}
          <button onClick={selectNoPreference}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 hover:border-primary/50 transition-all text-left mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-primary/60" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">Sem preferência</h3>
              <p className="text-xs text-muted-foreground mt-1">Escolha pelo melhor horário disponível</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary ml-auto" />
          </button>

          <div className="space-y-3">
            {barbers.map(b => (
              <button key={b.id} onClick={() => selectBarber(b)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all text-left">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {b.photo ? <img src={b.photo} className="w-full h-full object-cover rounded-xl" /> : <span className="text-xl font-bold text-primary/50">{b.name?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{b.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {b.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-primary fill-primary" />{b.rating.toFixed(1)}</span>}
                    {b.specialties?.length > 0 && <span>{b.specialties.slice(0, 2).join(", ")}</span>}
                  </div>
                  {b.bio && <p className="text-xs text-muted-foreground/70 mt-1 truncate">{b.bio}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Link to={`/barber/${b.id}`} onClick={e => e.stopPropagation()}
                    className="text-[10px] text-primary hover:underline">Ver perfil</Link>
                </div>
              </button>
            ))}
            {barbers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum barbeiro cadastrado nesta barbearia.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Serviço */}
      {step === 2 && (
        <div>
          {!isBarberBooking && (
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <h2 className="text-xl font-bold mb-2">Escolha o serviço</h2>
          <p className="text-sm text-muted-foreground mb-6">{noPreference ? "Todos os serviços disponíveis" : selectedBarber?.name}</p>
          <div className="space-y-3">
            {services.map((s, i) => (
              <button key={s.id || i} onClick={() => selectService(s)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all text-left">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.duration_minutes} min • {s.category}</p>
                  {s.description && <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">{s.description}</p>}
                  {noPreference && s._barber && <p className="text-xs text-primary mt-1">com {s._barber.name}</p>}
                </div>
                <span className="text-primary font-bold flex-shrink-0">R${s.price}</span>
              </button>
            ))}
            {services.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p>Nenhum serviço disponível.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Data e Horário */}
      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-xl font-bold mb-6">Escolha data e horário</h2>
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Data</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map(d => (
                <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedTime(""); }}
                  className={`flex flex-col items-center px-4 py-3 rounded-xl min-w-[60px] transition-all ${
                    selectedDate === d.date ? "bg-primary text-primary-foreground" : "bg-card border border-border/50 hover:border-primary/30"
                  }`}>
                  <span className="text-[10px] uppercase">{d.label}</span>
                  <span className="text-lg font-bold">{d.day}</span>
                </button>
              ))}
            </div>
          </div>
          {selectedDate && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Horário</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {timeSlots.map(t => {
                  const isPast = selectedDate === today && t <= nowTime;
                  const isTaken = takenSlots.includes(t);
                  const isDisabledStyle = isPast || isTaken;
                  return (
                    <button key={t}
                      onClick={() => {
                        if (isPast) {
                          toast.error("Não é possível agendar: este horário já passou!");
                          return;
                        }
                        if (isTaken) {
                          toast.error("Não é possível agendar: este horário já foi reservado!");
                          return;
                        }
                        setSelectedTime(t);
                      }}
                      title={isTaken ? "Horário ocupado" : isPast ? "Horário passado" : ""}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                        isDisabledStyle
                          ? "bg-muted/20 text-muted-foreground/30 cursor-not-allowed"
                          : selectedTime === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border/50 hover:border-primary/30"
                      }`}>
                      {t}
                      {isTaken && <span className="absolute top-0.5 right-1 text-[8px] text-red-400">✗</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {selectedDate && selectedTime && (
            <Button onClick={() => setStep(4)} className="w-full mt-8 bg-primary text-primary-foreground rounded-xl h-12">
              Continuar
            </Button>
          )}
        </div>
      )}

      {/* Step 4: Confirmar */}
      {step === 4 && (
        <div>
          <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-xl font-bold mb-6">Confirme seu agendamento</h2>
          <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
            <div className="flex justify-between"><span className="text-muted-foreground">Barbearia</span><span className="font-medium">{selectedShop?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Barbeiro</span><span className="font-medium">{selectedBarber?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Serviço</span><span className="font-medium">{selectedService?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="font-medium">{new Date(selectedDate + "T12:00").toLocaleDateString("pt-BR")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Horário</span><span className="font-medium">{selectedTime}</span></div>
            <div className="border-t border-border/50 pt-4 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">R${selectedService?.price}</span>
            </div>
          </div>
          <Button onClick={confirmBooking} disabled={booking} className="w-full mt-6 bg-primary text-primary-foreground rounded-xl h-12">
            {booking ? "Confirmando..." : "Confirmar agendamento"}
          </Button>
        </div>
      )}

      {/* Step 5: Sucesso */}
      {step === 5 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Agendamento confirmado!</h2>
          <p className="text-muted-foreground mb-8">Você receberá uma confirmação por e-mail.</p>
          <Button onClick={reset} variant="outline" className="rounded-xl">
            Novo agendamento
          </Button>
        </div>
      )}
    </div>
  );
}