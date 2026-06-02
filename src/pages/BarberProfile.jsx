const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Star, MapPin, Instagram, Phone, ChevronLeft, Scissors, Award, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BarberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [barber, setBarber] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const b = await db.entities.Barber.get(id);
      setBarber(b);
      const s = await db.entities.Service.filter({ barber_id: id });
      setServices(s.filter(x => x.is_active !== false));
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-muted-foreground">
        <p>Barbeiro não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Hero */}
      <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {barber.photo
              ? <img src={barber.photo} className="w-full h-full object-cover" />
              : <span className="text-4xl font-bold text-primary/40">{barber.name?.[0]}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{barber.name}</h1>
            {barber.rating && (
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="font-semibold">{barber.rating.toFixed(1)}</span>
                {barber.total_reviews > 0 && <span className="text-sm text-muted-foreground">({barber.total_reviews} avaliações)</span>}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {barber.neighborhood && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />{barber.neighborhood}
                </span>
              )}
            </div>
            {barber.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {barber.specialties.map(sp => (
                  <span key={sp} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">{sp}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Social */}
        <div className="flex gap-3 mt-5 pt-5 border-t border-border/50">
          {barber.whatsapp && (
            <a href={`https://wa.me/${barber.whatsapp}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-xl gap-2 border-border/50">
                <Phone className="w-3.5 h-3.5" /> WhatsApp
              </Button>
            </a>
          )}
          {barber.instagram && (
            <a href={`https://instagram.com/${barber.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-xl gap-2 border-border/50">
                <Instagram className="w-3.5 h-3.5" /> Instagram
              </Button>
            </a>
          )}
          <Button onClick={() => navigate(`/booking?barber=${barber.id}`)} className="ml-auto bg-primary text-primary-foreground rounded-xl" size="sm">
            Agendar agora
          </Button>
        </div>
      </div>

      {/* Quem sou eu */}
      {barber.bio && (
        <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Quem sou eu</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{barber.bio}</p>
        </div>
      )}

      {/* Carreira */}
      {barber.career && (
        <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Carreira e Experiência</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{barber.career}</p>
        </div>
      )}

      {/* Portfólio */}
      {barber.portfolio?.length > 0 && (
        <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
          <h2 className="font-semibold mb-4">Portfólio</h2>
          <div className="grid grid-cols-3 gap-2">
            {barber.portfolio.map((img, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={img} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Serviços */}
      {services.length > 0 && (
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Serviços</h2>
          </div>
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="flex items-start justify-between gap-4 py-3 border-b border-border/30 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{s.name}</p>
                  {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{s.duration_minutes} min</p>
                </div>
                <span className="text-primary font-bold flex-shrink-0">R${s.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}