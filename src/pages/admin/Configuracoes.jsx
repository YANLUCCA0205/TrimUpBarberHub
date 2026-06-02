import db from '@/lib/db';

import { useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import { Bell, Lock, Smartphone, Globe, Palette, LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SECTION = ({ icon: Icon, title, children }) => (
  <div className="p-5 rounded-2xl bg-card border border-border/50">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="font-semibold">{title}</h3>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-5" : "left-1"}`} />
    </button>
  </div>
);

const RowLink = ({ icon: Icon, label, description, badge, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-muted/30 transition-all text-left group">
    {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {badge && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{badge}</span>}
    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);

export default function Configuracoes() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({ email: true, push: false, whatsapp: true });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });

  async function savePassword() {
    if (passwordForm.new !== passwordForm.confirm) { toast.error("As senhas não coincidem."); return; }
    if (passwordForm.new.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    toast.success("Senha alterada com sucesso!");
    setShowPasswordForm(false);
    setPasswordForm({ current: "", new: "", confirm: "" });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie preferências e configurações do sistema.</p>
      </div>

      {/* Notificações */}
      <SECTION icon={Bell} title="Notificações">
        <Toggle label="Notificações por e-mail" description="Receber confirmações e lembretes por e-mail" checked={notifications.email} onChange={v => setNotifications(n => ({ ...n, email: v }))} />
        <Toggle label="Notificações push" description="Alertas em tempo real no navegador" checked={notifications.push} onChange={v => setNotifications(n => ({ ...n, push: v }))} />
        <Toggle label="Mensagens via WhatsApp" description="Confirmações automáticas para clientes" checked={notifications.whatsapp} onChange={v => setNotifications(n => ({ ...n, whatsapp: v }))} />
      </SECTION>

      {/* Segurança */}
      <SECTION icon={Lock} title="Segurança da conta">
        <div className="py-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">Alterar senha</p>
              <p className="text-xs text-muted-foreground">Última alteração: nunca</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowPasswordForm(!showPasswordForm)} className="rounded-xl border-border/50 text-xs">
              {showPasswordForm ? "Cancelar" : "Alterar"}
            </Button>
          </div>
          {showPasswordForm && (
            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/30">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Senha atual</Label>
                <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Nova senha</Label>
                <Input type="password" value={passwordForm.new} onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Confirmar nova senha</Label>
                <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} className="bg-muted border-border/50 rounded-xl" />
              </div>
              <Button onClick={savePassword} className="bg-primary text-primary-foreground rounded-xl text-sm">Salvar nova senha</Button>
            </div>
          )}
        </div>
        <RowLink icon={Smartphone} label="Verificação em duas etapas" description="Adicione uma camada extra de segurança" badge="Em breve" onClick={() => {}} />
      </SECTION>

      {/* Preferências */}
      <SECTION icon={Palette} title="Preferências">
        <RowLink icon={Globe} label="Idioma" description="Português (Brasil)" onClick={() => {}} />
        <RowLink icon={Moon} label="Tema" description="Escuro (padrão)" onClick={() => {}} />
        <RowLink icon={Bell} label="Sons do sistema" description="Alertas sonoros para novos agendamentos" onClick={() => {}} />
      </SECTION>

      {/* Agenda */}
      <SECTION icon={Bell} title="Preferências da agenda">
        <RowLink label="Intervalo padrão entre atendimentos" description="30 minutos" onClick={() => {}} />
        <RowLink label="Horário de funcionamento padrão" description="09:00 – 20:00" onClick={() => {}} />
        <RowLink label="Confirmação automática" description="Confirmar agendamentos automaticamente" onClick={() => {}} />
        <RowLink label="Mensagens automáticas" description="Lembretes e confirmações para clientes" onClick={() => {}} />
      </SECTION>

      {/* Integrações */}
      <SECTION icon={Smartphone} title="Integrações">
        <RowLink label="WhatsApp Business" description="Conectar para envio de mensagens automáticas" badge="Em breve" onClick={() => {}} />
        <RowLink label="Instagram" description="Sincronizar perfil e portfólio" badge="Em breve" onClick={() => {}} />
        <RowLink label="Pagamentos" description="Integrar com sistemas de pagamento" badge="Em breve" onClick={() => {}} />
      </SECTION>

      {/* Conta */}
      <SECTION icon={Lock} title="Conta">
        <div className="py-1">
          <p className="text-sm text-muted-foreground">Logado como <span className="text-foreground font-medium">{user?.email}</span></p>
        </div>
        <RowLink label="Assinatura e plano" description="Gerenciar plano atual" badge="Free" onClick={() => {}} />
        <RowLink label="Backup de dados" description="Exportar dados da barbearia" onClick={() => {}} />
      </SECTION>

      <Button onClick={() => db.auth.logout()} variant="outline" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 gap-2">
        <LogOut className="w-4 h-4" /> Sair da conta
      </Button>
    </div>
  );
}