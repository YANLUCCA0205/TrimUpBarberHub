import { Star, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function BarberCard({ barber }) {
  return (
    <Link to={`/booking?barber=${barber.id}`} className="group block">
      <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300">
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {barber.photo ? (
            <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-4xl font-bold text-primary/30">{barber.name?.[0]}</span>
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-xs font-medium text-white">{barber.rating?.toFixed(1) || "5.0"}</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold mb-1">{barber.name}</h3>
          {barber.neighborhood && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {barber.neighborhood}, {barber.city}
            </p>
          )}
          {barber.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {barber.specialties.slice(0, 3).map((s, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}