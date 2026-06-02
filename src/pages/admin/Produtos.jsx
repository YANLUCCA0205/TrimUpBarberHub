const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";
import { Plus, Edit2, Trash2, X, Check, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = ["pomada", "óleo", "perfume", "shampoo", "condicionador", "máquina", "acessório", "kit"];

const emptyForm = {
  name: "", description: "", price: "", cost: "", stock: "0", stock_min: "5",
  category: "pomada", brand: "", sku: "", ean: "", image: "", is_active: true,
};

export default function Produtos() {
  const { user } = useAuth();
  const [barber, setBarber] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => {
    if (!user) return;
    async function load() {
      const barbers = await db.entities.Barber.filter({ owner_email: user.email });
      if (barbers.length > 0) {
        setBarber(barbers[0]);
        const p = await db.entities.Product.filter({ barber_id: barbers[0].id });
        setProducts(p);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function saveProduct() {
    if (!form.name || !form.price) { toast.error("Nome e preço são obrigatórios."); return; }
    if (!barber) { toast.error("Perfil de barbeiro não encontrado."); return; }
    const data = {
      ...form,
      barber_id: barber.id,
      price: parseFloat(form.price),
      cost: form.cost ? parseFloat(form.cost) : undefined,
      stock: parseInt(form.stock) || 0,
    };
    if (editingProduct) {
      const updated = await db.entities.Product.update(editingProduct.id, data);
      setProducts(ps => ps.map(p => p.id === editingProduct.id ? updated : p));
      toast.success("Produto atualizado!");
    } else {
      const created = await db.entities.Product.create(data);
      setProducts(ps => [...ps, created]);
      toast.success("Produto cadastrado!");
    }
    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  async function deleteProduct(id) {
    await db.entities.Product.delete(id);
    setProducts(ps => ps.filter(p => p.id !== id));
    toast.success("Produto removido.");
  }

  function editProduct(p) {
    setEditingProduct(p);
    setForm({ ...emptyForm, ...p, price: String(p.price), cost: String(p.cost || ""), stock: String(p.stock || 0) });
    setShowForm(true);
  }

  const filtered = products.filter(p => filterCat === "all" || p.category === filterCat);
  const lowStock = products.filter(p => (p.stock || 0) <= (p.stock_min || 5) && p.is_active !== false);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} produto(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setForm(emptyForm); setShowForm(true); }}
          className="bg-primary text-primary-foreground rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Novo produto
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400">
            <strong>{lowStock.length} produto(s)</strong> com estoque baixo: {lowStock.map(p => p.name).join(", ")}
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl bg-card border border-primary/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editingProduct ? "Editar produto" : "Novo produto"}</h3>
            <button onClick={() => { setShowForm(false); setEditingProduct(null); }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Categoria</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="bg-muted border-border/50 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Preço de venda (R$) *</Label>
              <Input type="number" value={form.price} onChange={e => set("price", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Custo (R$)</Label>
              <Input type="number" value={form.cost} onChange={e => set("cost", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Marca</Label>
              <Input value={form.brand || ""} onChange={e => set("brand", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Estoque atual</Label>
              <Input type="number" value={form.stock} onChange={e => set("stock", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Estoque mínimo</Label>
              <Input type="number" value={form.stock_min || "5"} onChange={e => set("stock_min", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">SKU</Label>
              <Input value={form.sku || ""} onChange={e => set("sku", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">EAN / Código de barras</Label>
              <Input value={form.ean || ""} onChange={e => set("ean", e.target.value)} className="bg-muted border-border/50 rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Foto (URL)</Label>
              <Input value={form.image || ""} onChange={e => set("image", e.target.value)} placeholder="https://..." className="bg-muted border-border/50 rounded-xl" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Descrição</Label>
            <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} className="bg-muted border-border/50 rounded-xl resize-none" />
          </div>

          <Button onClick={saveProduct} className="bg-primary text-primary-foreground rounded-xl gap-2">
            <Check className="w-4 h-4" /> {editingProduct ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {["all", ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterCat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            {cat === "all" ? "Todos" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
          <Package className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>Nenhum produto cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const isLow = (p.stock || 0) <= (p.stock_min || 5);
            return (
              <div key={p.id} className="p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand || p.category}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editProduct(p)} className="text-muted-foreground hover:text-foreground p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">R${p.price}</span>
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${isLow ? "bg-amber-500/10 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                    {isLow && <AlertTriangle className="w-3 h-3" />}
                    Estoque: {p.stock || 0}
                  </div>
                </div>
                {p.sku && <p className="text-[10px] text-muted-foreground/50 mt-1">SKU: {p.sku}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}