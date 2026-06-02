import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scissors, Calendar, TrendingUp, Users, Sparkles, ArrowRight, ChevronRight, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import db from "@/lib/db";

const features = [
  { icon: Calendar, title: "Agendamento Inteligente", desc: "IA sugere horários, barbeiros e cortes ideais baseados no seu perfil." },
  { icon: TrendingUp, title: "BI & Analytics", desc: "Dashboards estratégicos com heatmaps, métricas e previsões de demanda." },
  { icon: Users, title: "CRM Integrado", desc: "Gestão completa de clientes com fidelização, cashback e gamificação." },
  { icon: Sparkles, title: "IA Estratégica", desc: "Recomendações automáticas de promoções, campanhas e retenção." },
  { icon: Shield, title: "Marketplace", desc: "Venda produtos diretamente pela plataforma com controle de estoque." },
  { icon: Zap, title: "Pagamentos", desc: "PIX, cartão e split automático entre barbeiro e barbearia." }];

const stats = [
  { value: "50k+", label: "Cortes realizados" },
  { value: "2.5k+", label: "Barbeiros ativos" },
  { value: "98%", label: "Taxa de satisfação" },
  { value: "40%", label: "Aumento em retenção" }];

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const fallbackPlans = [
  { name: "Free", monthly_price: 0, features: ["Até 50 agendamentos/mês", "1 barbeiro", "Perfil básico", "Agendamento online"] },
  { name: "Pro", monthly_price: 89, popular: true, features: ["Agendamentos ilimitados", "Até 5 barbeiros", "BI & Analytics", "Marketplace", "CRM completo", "IA de recomendações"] },
  { name: "Premium", monthly_price: 199, features: ["Tudo do Pro", "Barbeiros ilimitados", "IA estratégica avançada", "Heatmap de clientes", "API & integrações", "Suporte prioritário"] }
];

export default function Landing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const p = await db.entities.Plan.list();
        const active = p.filter(x => x.is_active !== false);
        setPlans(active);
      } catch (err) {
        console.error("Erro ao carregar planos na Landing page:", err);
      }
    }
    load();
  }, []);

  const displayPlans = plans.length > 0 ? plans : fallbackPlans;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide">TrimUp</h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">BARBER</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#stats" className="hover:text-foreground transition-colors">Resultados</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                Começar grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>
        <motion.div className="max-w-4xl mx-auto text-center relative z-10" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Plataforma #1 para barbearias inteligentes
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            O futuro da sua{" "}
            <span className="text-gradient">barbearia</span>{" "}
            começa aqui
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Agendamento inteligente, CRM, marketplace, BI e IA — tudo em uma plataforma premium feita para barbeiros que pensam grande.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 h-12 text-base group">
                Começar gratuitamente
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="rounded-xl px-8 h-12 text-base border-border/50 bg-card/50">
                Conhecer recursos
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-6 border-y border-border/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) =>
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que sua barbearia precisa</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Uma plataforma completa que transforma a gestão do seu negócio com tecnologia de ponta.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) =>
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300">

                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos que crescem com você</h2>
            <p className="text-muted-foreground">Comece grátis e evolua conforme seu negócio cresce.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {displayPlans.map((plan, i) => {
              const isPopular = plan.popular || plan.name?.toLowerCase() === "pro";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative p-8 rounded-2xl border transition-all ${isPopular ? "bg-card border-primary/50 shadow-lg shadow-primary/5" : "bg-card/50 border-border/50"
                    }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      Mais popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">R${plan.monthly_price}</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {(plan.features || []).map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="w-3.5 h-3.5 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button className={`w-full rounded-xl ${isPopular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                      Começar agora
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">TrimUp Barber</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026  TrimUp Barber. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>);

}