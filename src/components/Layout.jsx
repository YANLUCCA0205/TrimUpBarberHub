import db from '@/lib/db';

import { Outlet, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getSimulation } from "@/lib/simulation";
import SimulationBanner from "./SimulationBanner";
import NotificationBell from "./NotificationBell";
import { useAuth } from "@/lib/AuthContext";
import { Home, Calendar, BarChart3, User, Scissors, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useEntityQuery } from '@/hooks/useSupabaseQuery';
import ProfileCompletionBar from './ProfileCompletionBar';

const clientNav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Meu Painel" },
  { to: "/explore", icon: Home, label: "Explorar" },
  { to: "/booking", icon: Calendar, label: "Agendar" },
  { to: "/profile", icon: User, label: "Perfil" },
];

const barberNav = [
  { to: "/barber-dashboard", icon: LayoutDashboard, label: "Minha Agenda" },
  { to: "/explore", icon: Home, label: "Barbearias" },
  { to: "/profile", icon: User, label: "Perfil" },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const simulation = getSimulation();
  const effectiveRole = simulation?.active ? simulation.role : user?.role;
  
  const navItems = [...(effectiveRole === "barber" ? barberNav : clientNav)];
  
  const { data: clients = [] } = useEntityQuery('Client', user?.email ? { email: user.email } : {}, { enabled: !!user?.email });
  const client = clients[0] || null;

  // Dynamically show panels if user has appropriate roles and simulation is not active
  if (!simulation?.active) {
    const isSiteOwner = user?.roles?.includes("siteowner");
    if (!isSiteOwner && user?.roles?.includes("barber") && !navItems.find(x => x.to === "/barber-dashboard")) {
      navItems.push({ to: "/barber-dashboard", icon: LayoutDashboard, label: "Minha Agenda" });
    }
    if (!isSiteOwner && user?.roles?.includes("admin") && !navItems.find(x => x.to === "/admin")) {
      navItems.push({ to: "/admin", icon: BarChart3, label: "Painel Admin" });
    }
    if (isSiteOwner && !navItems.find(x => x.to === "/siteowner")) {
      navItems.push({ to: "/siteowner", icon: BarChart3, label: "Painel SiteOwner" });
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-xl fixed h-full z-30">
        <Link to="/" className="flex items-center gap-3 px-6 py-6 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">TrimUp Barber</h1>
            <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Hub</p>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                pathname === item.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-2">
          <NotificationBell />
        </div>
        <div className="p-4 border-t border-border/50">
          <button
            onClick={() => db.auth.logout()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-border/50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">TrimUp Barber</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="px-4 pb-4 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname === item.to ? "bg-primary/10 text-primary" : "text-muted-foreground"
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50">
        <div className="flex justify-around py-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {navItems.slice(0, 5).map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                pathname === item.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 pb-20 lg:pt-0 lg:pb-0">
        {simulation?.active && <SimulationBanner role={simulation.role} />}
        {user && (
          <div className="max-w-7xl mx-auto px-4 pt-6 lg:px-8">
            <ProfileCompletionBar profile={user} client={client} />
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}