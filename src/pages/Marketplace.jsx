import { useEntityQuery } from '@/hooks/useSupabaseQuery';

import { useState } from "react";

import { ShoppingBag, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const categories = ["Todos", "pomada", "óleo", "perfume", "shampoo", "condicionador", "máquina", "acessório", "kit"];

export default function Marketplace() {
  const { data: products = [], isLoading: loading } = useEntityQuery('Product', {});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || p.category === category;
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Marketplace</h1>
        <p className="text-sm text-muted-foreground">Produtos premium selecionados pelos melhores barbeiros.</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl bg-card border-border/50" />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              category === c ? "bg-primary text-primary-foreground" : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
            }`}>
            {c === "Todos" ? c : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(p => (
            <div key={p.id} className="group rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all">
              <div className="aspect-square bg-muted relative overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <ShoppingBag className="w-10 h-10 text-primary/20" />
                  </div>
                )}
                {p.category && (
                  <span className="absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white font-medium">
                    {p.category}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1 truncate">{p.name}</h3>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">R${p.price}</span>
                  <Button size="sm" className="rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs"
                    onClick={() => toast.success(`${p.name} adicionado ao carrinho!`)}>
                    Comprar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}