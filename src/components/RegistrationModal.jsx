import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { validateCPF, formatCPF, hashDocument, getLast4Digits } from '@/lib/cpfCnpjUtils';
import { User, Phone, FileText, Check, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function formatPhone(value) {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
}

export default function RegistrationModal({ isOpen }) {
  const { user, profile, refreshProfile, logout } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setName(profile.full_name && profile.full_name !== 'Usuário' ? profile.full_name : '');
      setPhone(profile.phone || '');
      setInitialized(true);
    }
  }, [profile, initialized]);

  useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCpfRequired = user?.role && user.role !== 'user';

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === 'Usuário') {
      toast.error('Por favor, informe seu nome completo.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Por favor, informe um número de telefone celular ou fixo válido.');
      return;
    }

    let cpfHash = null;
    let cpfLast4 = null;

    if (isCpfRequired) {
      const cleanCpf = cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        toast.error('O CPF é obrigatório e deve conter 11 dígitos.');
        return;
      }
      if (!validateCPF(cleanCpf)) {
        toast.error('CPF inválido. Verifique o número informado.');
        return;
      }
      cpfHash = await hashDocument(cleanCpf);
      cpfLast4 = getLast4Digits(cleanCpf);
    }

    setIsSaving(true);
    try {
      const profileUpdate = {
        full_name: name,
        phone: phone,
      };

      if (isCpfRequired) {
        profileUpdate.cpf_hash = cpfHash;
        profileUpdate.cpf_last4 = cpfLast4;
        profileUpdate.lgpd_consent = true;
        profileUpdate.lgpd_consent_date = new Date().toISOString();
      }

      // 1. Atualizar profiles no Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (profileError) {
        if (profileError.message?.includes('unique') || profileError.message?.includes('duplicate') || profileError.code === '23505') {
          toast.error('Este CPF já está vinculado a outra conta profissional.');
          setIsSaving(false);
          return;
        }
        throw profileError;
      }

      // 2. Sincronizar client_records do usuário logado se existir
      await supabase
        .from('client_records')
        .update({ name: name, phone: phone })
        .eq('profile_id', user.id);

      toast.success('Perfil completado e atualizado!');
      await refreshProfile();
    } catch (err) {
      console.error('Erro ao salvar dados de complementação:', err);
      toast.error('Erro ao salvar informações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 220 }}
          className="glass rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative border border-border/40 text-foreground overflow-hidden flex flex-col space-y-6"
        >
          {/* Decorative background gradients */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10" />

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldAlert className="w-6 h-6 text-primary-foreground animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-gradient leading-tight pt-1">
              Complete seu Cadastro
            </h3>
            <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
              Precisamos de mais algumas informações para você continuar utilizando o TrimUp.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="modalName" className="text-xs text-muted-foreground font-semibold">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="modalName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="pl-10 bg-muted/20 border-border/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modalPhone" className="text-xs text-muted-foreground font-semibold">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="modalPhone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="pl-10 bg-muted/20 border-border/40 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11"
                  required
                  disabled={isSaving}
                  maxLength={15}
                />
              </div>
            </div>

            {isCpfRequired && (
              <div className="space-y-1.5">
                <Label htmlFor="modalCpf" className="text-xs text-red-400 font-semibold flex items-center gap-1">
                  CPF <span className="text-[10px] text-red-400/80 font-normal">(obrigatório para contas profissionais)</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="modalCpf"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="pl-10 bg-red-500/5 border-red-500/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl h-11 font-mono"
                    required
                    disabled={isSaving}
                    maxLength={14}
                  />
                </div>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground leading-normal text-center pt-2">
              Ao continuar, você concorda com nossos termos de privacidade em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </div>

            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-11 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Salvar e Continuar
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={logout}
                variant="outline"
                disabled={isSaving}
                className="w-full border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-xl h-11 text-muted-foreground transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sair da conta
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
