import db from '@/lib/db';

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { Star, MapPin, Instagram, Phone, Clock, ArrowLeft, Scissors, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShopPage() {
  const { slug } = useParams();
  const [shop, setShop] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("barbeiros");

  useEffect(() => {
    async function load() {
      const shops = await db.entities.Shop.filter({ slug });
      if (shops.length === 0) { setLoading(false); return; }
      const s = shops[0];
      setShop(s);
      const [b, sv] = await Promise.all([
        db.entities.Barber.filter({ shop_id: s.id }, "-rating", 20),
        db.entities.Service.filter({ barber_id: { $in: [] } }, "-price", 20).catch(() => []),
      ]);
      setBarbers(b);
      setServices(sv);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground text-lg">Barbearia não encontrada</p>
        <Link to="/"><Button variant="outline">Voltar ao marketplace</Button></Link>
      </div>
    );
  }

  const primary = shop.primary_color || "#D4A017";
  const secondary = shop.secondary_color || "#1a1a2e";

  return (
    <div className="min-h-screen bg-background">
      {/* Back */}
      <div className="fixed top-4 left-4 z-50">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60">
            <ArrowLeft className="w-4 h-4 text-white" />
          </Button>
        </Link>
      </div>

      {/* Banner Hero */}
      <div className="relative h-64 md:h-80 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}33, ${secondary})` }}>
        {shop.banner ? (
          <img src={shop.banner} alt={shop.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${primary}22 0%, ${secondary} 100%)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Shop Identity */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 flex items-center justify-center bg-black/60 backdrop-blur-sm shrink-0"
              style={{ borderColor: `${primary}44` }}>
              {shop.logo ? (
                <img src={shop.logo} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-2xl md:text-3xl font-bold" style={{ color: primary }}>{shop.name[0]}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{shop.name}</h1>
              {shop.slogan && <p className="text-sm text-white/70 italic mt-0.5">"{shop.slogan}"</p>}
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" style={{ color: primary }} />
                  <span className="text-sm font-semibold text-white">{shop.rating?.toFixed(1) || "5.0"}</span>
                  <span className="text-xs text-white/60">({shop.total_reviews || 0})</span>
                </div>
                {shop.neighborhood && (
                  <div className="flex items-center gap-1 text-xs text-white/60">
                    <MapPin className="w-3 h-3" />
                    {shop.neighborhood}, {shop.city}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <Link to={`/booking?shop=${shop.id}`} className="flex-1">
            <Button className="w-full h-12 rounded-xl font-semibold text-base" style={{ background: primary, color: "#000" }}>
              <Scissors className="w-4 h-4 mr-2" />
              Agendar agora
            </Button>
          </Link>
          {shop.whatsapp && (
            <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/50">
                <Phone className="w-4 h-4" />
              </Button>
            </a>
          )}
          {shop.instagram && (
            <a href={`https://instagram.com/${shop.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/50">
                <Instagram className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>

        {/* Description */}
        {shop.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 p-4 rounded-xl bg-card/50 border border-border/30">
            {shop.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Clientes", value: shop.total_clients || "—" },
            { label: "Avaliações", value: shop.total_reviews || "—" },
            { label: "Retenção", value: shop.retention_rate ? `${shop.retention_rate}%` : "—" },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-card/50 border border-border/30">
              <div className="text-xl font-bold" style={{ color: primary }}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 mb-6">
          {["barbeiros", "serviços"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Barbeiros */}
        {activeTab === "barbeiros" && (
          <div className="space-y-3">
            {barbers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Nenhum barbeiro cadastrado</p>
              </div>
            ) : (
              barbers.map(barber => (
                <div key={barber.id} className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-primary/20 transition-all">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {barber.photo ? (
                      <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xl text-muted-foreground">{barber.name?.[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{barber.name}</h3>
                    {barber.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{barber.bio}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      <span className="text-xs font-medium">{barber.rating?.toFixed(1) || "5.0"}</span>
                      {barber.specialties?.slice(0, 2).map((s, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-1">{s}</span>
                      ))}
                    </div>
                  </div>
                  <Link to={`/booking?barber=${barber.id}&shop=${shop.id}`}>
                    <Button size="sm" variant="outline" className="rounded-lg text-xs shrink-0">Agendar</Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {/* Serviços */}
        {activeTab === "serviços" && (
          <div className="space-y-3">
            {services.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Scissors className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Nenhum serviço cadastrado</p>
              </div>
            ) : (
              services.map(sv => (
                <div key={sv.id} className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/30">
                  <div>
                    <h3 className="font-medium">{sv.name}</h3>
                    {sv.description && <p className="text-xs text-muted-foreground mt-0.5">{sv.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{sv.duration_minutes} min</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: primary }}>R$ {sv.price?.toFixed(2)}</div>
                    <Link to={`/booking?shop=${shop.id}&service=${sv.id}`}>
                      <Button size="sm" className="mt-1 text-xs rounded-lg" style={{ background: primary, color: "#000" }}>
                        Agendar
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}