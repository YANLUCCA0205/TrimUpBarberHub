const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh.jsx";

import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Search, MapPin, TrendingUp, Sparkles, Star, ArrowRight, Scissors, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import ShopCard from "@/components/ShopCard";

const CATEGORIES = [
  { label: "Todos", value: null },
  { label: "Degradê", value: "Degradê" },
  { label: "Barba", value: "Barba" },
  { label: "Combo", value: "Combo" },
  { label: "Afro", value: "Afro" },
  { label: "Clássico", value: "Clássico" },
];

export default function Home() {

  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadShops = useCallback(async () => {
    const s = await db.entities.Shop.list("-rating", 30);
    setShops(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadShops(); }, [loadShops]);

  const { indicator } = usePullToRefresh(loadShops);

  const filtered = shops.filter(s => {
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory ||
      s.specialties?.some(sp => sp.toLowerCase().includes(activeCategory.toLowerCase()));
    return matchSearch && matchCat;
  });

  const featured = shops.filter(s => s.is_featured || s.plan === "premium").slice(0, 4);
  const topRated = [...shops].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      {indicator}
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">Descubra os melhores</p>
        <h1 className="text-2xl md:text-3xl font-bold">Barbearias perto de você ✂️</h1>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar barbearia, bairro ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-card border-border/50 text-base"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat.label}
            onClick={() => setActiveCategory(cat.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured */}
      {!search && !activeCategory && featured.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-lg">Em destaque</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map(shop => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        </div>
      )}

      {/* AI Banner */}
      {!search && !activeCategory && (
        <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-medium text-sm text-primary">Recomendação IA</h3>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Baseado nas tendências da sua região, os horários com menor espera são
            terças e quartas entre 14h–16h. Degrade e barba artesanal estão em alta essa semana.
          </p>
        </div>
      )}

      {/* All Shops */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-lg">
              {search || activeCategory ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}` : "Todas as barbearias"}
            </h2>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-1">Nenhuma barbearia encontrada</p>
            <p className="text-sm">Tente buscar por outro termo.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(shop => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}