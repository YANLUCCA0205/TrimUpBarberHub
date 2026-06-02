import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { MapPin, Users, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Geocode a neighborhood+city via Nominatim (OpenStreetMap, free, no key required)
async function geocodeNeighborhood(neighborhood, city) {
  const q = city ? `${neighborhood}, ${city}, Brasil` : `${neighborhood}, Brasil`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`;
  const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

// Inner component: auto-fit map to visible points
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [40, 40] }
    );
  }, [points]);
  return null;
}

export default function ClientHeatmap({ clients = [] }) {
  const [geoCache, setGeoCache] = useState({});   // "Bairro|Cidade" → {lat, lng} | null
  const [geocoding, setGeocoding] = useState(false);

  // Build neighborhood groups from real clients
  const groups = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      const nb = c.neighborhood;
      if (!nb) return;
      const key = `${nb}|${c.city || ""}`;
      if (!map[key]) map[key] = { name: nb, city: c.city || "", clients: 0, totalSpent: 0 };
      map[key].clients++;
      map[key].totalSpent += c.total_spent || 0;
    });
    return Object.entries(map).map(([key, v]) => ({
      key,
      name: v.name,
      city: v.city,
      clients: v.clients,
      totalSpent: v.totalSpent,
      avgTicket: v.clients > 0 ? Math.round(v.totalSpent / v.clients) : 0,
    })).sort((a, b) => b.clients - a.clients);
  }, [clients]);

  // Geocode any groups we haven't seen yet
  useEffect(() => {
    const missing = groups.filter(g => !(g.key in geoCache));
    if (missing.length === 0) return;

    let cancelled = false;
    setGeocoding(true);

    // Stagger requests to respect Nominatim rate limits (1 req/sec)
    async function runGeocode() {
      const updates = {};
      for (let i = 0; i < missing.length; i++) {
        if (cancelled) break;
        const g = missing[i];
        const coords = await geocodeNeighborhood(g.name, g.city);
        updates[g.key] = coords; // null if not found
        if (i < missing.length - 1) await new Promise(r => setTimeout(r, 1100));
      }
      if (!cancelled) {
        setGeoCache(prev => ({ ...prev, ...updates }));
        setGeocoding(false);
      }
    }
    runGeocode();
    return () => { cancelled = true; };
  }, [groups]);

  // Build mappable points (groups that have valid coordinates)
  const points = useMemo(() => {
    return groups
      .map(g => ({ ...g, ...(geoCache[g.key] || {}) }))
      .filter(g => g.lat && g.lng);
  }, [groups, geoCache]);

  const totalClients = clients.length;
  const withNeighborhood = clients.filter(c => c.neighborhood).length;
  const totalRevenue = clients.reduce((s, c) => s + (c.total_spent || 0), 0);
  const avgTicket = totalClients > 0
    ? Math.round(clients.reduce((s, c) => s + (c.avg_ticket || 0), 0) / totalClients)
    : 0;

  const maxClients = points.length > 0 ? Math.max(...points.map(p => p.clients)) : 1;

  // Empty states
  if (totalClients === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-12 text-center">
        <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <h3 className="font-semibold mb-1">Mapa Territorial</h3>
        <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
      </div>
    );
  }

  if (withNeighborhood === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-12 text-center">
        <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <h3 className="font-semibold mb-1">Dados insuficientes para gerar mapa territorial.</h3>
        <p className="text-sm text-muted-foreground">
          {totalClients} cliente(s) cadastrado(s), mas nenhum possui bairro preenchido.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Peça que os clientes preencham o bairro no perfil, ou preencha no cadastro do CRM.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border/30 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Mapa Territorial de Clientes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalClients} clientes · {withNeighborhood} com bairro · {points.length} bairros mapeados
            {geocoding && <span className="ml-2 text-primary animate-pulse">· geocodificando...</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {geocoding && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          {!geocoding && points.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              {points.length} bairros no mapa
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-px bg-border/20">
        {[
          { icon: Users, label: "Clientes", value: totalClients, color: "#6366f1" },
          { icon: DollarSign, label: "Receita total", value: `R$${totalRevenue.toLocaleString()}`, color: "#D4A017" },
          { icon: TrendingUp, label: "Ticket médio", value: `R$${avgTicket}`, color: "#10b981" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-card">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.color + "20" }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="font-bold text-sm">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      {points.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground bg-muted/10">
          {geocoding ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Geocodificando {groups.length} bairro(s)...</p>
              <p className="text-xs opacity-60">Usando OpenStreetMap Nominatim</p>
            </>
          ) : (
            <>
              <MapPin className="w-8 h-8 opacity-30" />
              <p className="text-sm">Não foi possível geocodificar os bairros cadastrados.</p>
              <p className="text-xs opacity-60">Verifique se os nomes de bairro e cidade estão corretos.</p>
            </>
          )}
        </div>
      ) : (
        <MapContainer
          style={{ height: "400px", width: "100%", background: "#0a0a14" }}
          {.../** @type {any} */ ({ center: [points[0].lat, points[0].lng] })}
          zoom={12}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" {.../** @type {any} */ ({ maxZoom: 18 })} />
          <FitBounds points={points} />
          {points.map(p => {
            const normalized = maxClients > 1 ? (p.clients - 1) / (maxClients - 1) : 1;
            const radius = Math.max(800, normalized * 3000);
            const radiusPx = Math.max(16, normalized * 40);
            const opacity = 0.2 + normalized * 0.5;
            return (
              <CircleMarker
                key={p.key}
                center={[p.lat, p.lng]}
                {.../** @type {any} */ ({ radius: radiusPx })}
                pathOptions={{
                  color: "hsl(38,92%,50%)",
                  fillColor: "hsl(38,92%,50%)",
                  fillOpacity: opacity,
                  weight: 1.5,
                  opacity: 0.8,
                }}
              >
                <Popup {.../** @type {any} */ ({ className: "leaflet-popup-dark" })}>
                  <div style={{ background: "#12131f", border: "1px solid #2a2b3d", borderRadius: "10px", padding: "12px 14px", minWidth: "160px", color: "#f5f5f5", fontFamily: "Inter, sans-serif" }}>
                    <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>{p.name}{p.city ? `, ${p.city}` : ""}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#888" }}>Clientes</span>
                        <span style={{ fontWeight: 600 }}>{p.clients}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#888" }}>Receita</span>
                        <span style={{ fontWeight: 600, color: "hsl(38,92%,50%)" }}>R${p.totalSpent.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#888" }}>Ticket médio</span>
                        <span style={{ fontWeight: 600, color: "#10b981" }}>R${p.avgTicket}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}

      {/* Neighborhood ranking */}
      {groups.length > 0 && (
        <div className="p-5 border-t border-border/30">
          <h4 className="text-sm font-semibold mb-3">Ranking de bairros</h4>
          <div className="space-y-2">
            {groups.slice(0, 6).map((g, i) => {
              const pct = Math.round((g.clients / (groups[0]?.clients || 1)) * 100);
              const mapped = !!geoCache[g.key];
              return (
                <div key={g.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-medium truncate">{g.name}{g.city ? ` · ${g.city}` : ""}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {mapped ? <span className="text-emerald-400">📍</span> : <span className="text-muted-foreground/40">○</span>}
                        <span className="text-muted-foreground">{g.clients} cliente(s) · R${g.avgTicket} ticket</span>
                      </div>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}