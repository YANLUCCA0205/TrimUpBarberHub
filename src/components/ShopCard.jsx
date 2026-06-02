import { Star, MapPin, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const PLAN_LABELS = { premium: "Premium", pro: "Pro", free: "Free" };

export default function ShopCard({ shop }) {
  return (
    <Link to={`/shop/${shop.slug}`} className="group block">
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        {/* Banner */}
        <div className="aspect-[16/7] relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${shop.primary_color || "#D4A017"}22, ${shop.secondary_color || "#1a1a2e"})` }}>
          {shop.banner ? (
            <img src={shop.banner} alt={shop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold opacity-20" style={{ color: shop.primary_color || "#D4A017" }}>
                {shop.name?.[0]}
              </span>
            </div>
          )}
          {/* Logo */}
          <div className="absolute bottom-3 left-3">
            <div className="w-12 h-12 rounded-xl border-2 border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
              {shop.logo ? (
                <img src={shop.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-white text-lg">{shop.name?.[0]}</span>
              )}
            </div>
          </div>
          {/* Featured badge */}
          {shop.is_featured && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wider">
              DESTAQUE
            </div>
          )}
          {/* Plan badge */}
          {shop.plan && shop.plan !== "free" && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="text-[10px] bg-black/60 backdrop-blur-sm border-white/10 text-white">
                {PLAN_LABELS[shop.plan]}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-base leading-tight">{shop.name}</h3>
              {shop.slogan && <p className="text-xs text-muted-foreground mt-0.5 italic">"{shop.slogan}"</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-xs font-semibold">{shop.rating?.toFixed(1) || "5.0"}</span>
              <span className="text-xs text-muted-foreground">({shop.total_reviews || 0})</span>
            </div>
          </div>

          {shop.neighborhood && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
              <MapPin className="w-3 h-3" />
              {shop.neighborhood}, {shop.city}
            </p>
          )}

          {shop.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {shop.specialties.slice(0, 3).map((s, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {shop.total_clients || 0} clientes
            </div>
            <span className="text-xs text-primary flex items-center gap-1 font-medium group-hover:gap-2 transition-all">
              Ver barbearia <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}