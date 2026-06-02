const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";

import {
  LayoutDashboard, CreditCard, FileText, Monitor,
  Zap, LogOut, Menu, X, ChevronRight, Store
} from "lucide-react";

const nav = [
  { to: "/siteowner", icon: LayoutDashboard, label: "Plataforma", exact: true },
  { to: "/siteowner/planos", icon: CreditCard, label: "Planos" },
  { to: "/siteowner/assinaturas", icon: FileText, label: "Assinaturas" },
  { to: "/siteowner/simulador", icon: Monitor, label: "Simulador" },
];

export default function SiteOwnerLayout() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (item) => item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-xl fixed h-full z-30">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">TrimUp</h1>
            <p className="text-[10px] text-primary tracking-[0.2em] uppercase">Site Owner</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(item) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive(item) && <ChevronRight className="w-3 h-3" />}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border/50 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
            <Store className="w-3.5 h-3.5" /> Ver marketplace
          </Link>
          <button
            onClick={() => db.auth.logout()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/siteowner" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">TrimUp Platform</span>
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="px-4 pb-4 space-y-1 border-t border-border/50 pt-3">
            {nav.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(item) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/50">
        <div className="flex justify-around py-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {nav.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                isActive(item) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 lg:ml-64 pt-16 pb-20 lg:pt-0 lg:pb-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}