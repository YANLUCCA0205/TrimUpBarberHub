import db from '@/lib/db';
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, hashDocument, getLast4Digits } from '@/lib/cpfCnpjUtils';
import { supabase } from "@/lib/supabase";
import { formatCEP, validateCEP, fetchAddressByCEP } from '@/utils/cepUtils';
import { BRAZILIAN_STATES } from '@/utils/brazilianStates';

import { useAuth } from "@/lib/AuthContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntityQuery, useEntityGet, useEntityCreate } from "@/hooks/useSupabaseQuery";

import ImageUpload from '../components/ImageUpload';
import { User, Calendar, Save, LogOut, MapPin, Edit2, Trash2, Shield, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";

const STATUS_LABELS = {
  agendado: "Agendado", confirmado: "Confirmado", em_andamento: "Em andamento",
  concluido: "Concluído", cancelado: "Cancelado", faltou: "Faltou"
};
const STATUS_COLORS = {
  concluido: "bg-emerald-500/10 text-emerald-400", cancelado: "bg-red-500/10 text-red-400",
  faltou: "bg-muted text-muted-foreground", agendado: "bg-blue-500/10 text-blue-400",
  confirmado: "bg-primary/10 text-primary", em_andamento: "bg-amber-500/10 text-amber-400"
};

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const isCpfRequired = user?.role && user.role !== 'user';

  const [form, setForm] = useState(/** @type {any} */ ({}));
  const [tab, setTab] = useState("historico");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);

  const [selectedShopId, setSelectedShopId] = useState("");
  const [barberForm, setBarberForm] = useState({ name: "", bio: "", specialties: "", photo: "", career: "", whatsapp: "", instagram: "" });
  const [shopForm, setShopForm] = useState({
    name: "",
    razao_social: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    phone: "",
    whatsapp: "",
    cnpj: "",
    startTime: "08:00",
    endTime: "19:00"
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [cpfInput, setCpfInput] = useState("");
  const [cpfSaved, setCpfSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [shopCepLoading, setShopCepLoading] = useState(false);
  const [showCancelBarberModal, setShowCancelBarberModal] = useState(false);
  const [cancelConsent, setCancelConsent] = useState(false);
  const [cancelingBarber, setCancelingBarber] = useState(false);

  // Queries
  // 1. Profile Data from profiles table
  const { data: profileData, isLoading: profileLoading } = useEntityGet(
    'profiles',
    user?.id,
    { enabled: !!user?.id }
  );

  // 2. Client Record
  const { data: clientList = [], isLoading: clientLoading } = useEntityQuery(
    'Client',
    user?.email ? { email: user.email } : {},
    { enabled: !!user?.email }
  );
  const client = clientList[0] || null;

  // 3. Appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useEntityQuery(
    'Appointment',
    user?.email ? { client_email: user.email } : {},
    {
      enabled: !!user?.email,
      order: '-date',
      limit: 50
    }
  );

  // 4. Available Shops
  const { data: availableShops = [], isLoading: availableShopsLoading } = useEntityQuery('Shop');

  // 5. User's Owned Shops
  const { data: userShops = [], isLoading: userShopsLoading } = useEntityQuery(
    'Shop',
    user?.id ? { owner_id: user.id } : {},
    { enabled: !!user?.id }
  );

  // 6. Barber Profile
  const { data: barbers = [], isLoading: barberQueryLoading } = useEntityQuery(
    'Barber',
    user?.id ? { profile_id: user.id } : {},
    { enabled: !!user?.id }
  );
  const barberProfile = barbers[0] || null;

  // 7. Barber Link Request
  const { data: linkRequests = [], isLoading: linkRequestLoading } = useEntityQuery(
    'BarberLinkRequest',
    user?.id ? { profile_id: user.id, status: 'pending' } : {},
    { enabled: !!user?.id && !!barberProfile }
  );
  const linkRequest = linkRequests[0] || null;

  // 8. Barber Link History
  const { data: barberHistoryData = [], isLoading: barberHistoryLoading } = useEntityQuery(
    'BarberLinkHistory',
    user?.id ? { profile_id: user.id } : {},
    { enabled: !!user?.id && !!barberProfile }
  );

  // Auto-creation of Client record if it doesn't exist
  const createClientMutation = useEntityCreate('Client');

  useEffect(() => {
    if (user && !clientLoading && !appointmentsLoading && clientList.length === 0 && !createClientMutation.isPending) {
      createClientMutation.mutate({
        profile_id: user.id,
        name: user.full_name || user.email.split("@")[0],
        email: user.email,
        total_visits: appointments.filter(a => a.status === "concluido").length,
        total_spent: appointments.filter(a => a.status === "concluido").reduce((s, a) => s + (a.price || 0), 0),
      });
    }
  }, [clientLoading, appointmentsLoading, clientList, user, appointments, createClientMutation.isPending]);

  // Sync avatarUrl
  useEffect(() => {
    if (profileData?.avatar_url) {
      setAvatarUrl(profileData.avatar_url);
    } else if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    } else {
      setAvatarUrl("");
    }
  }, [profileData, user]);

  // Sync CPF Info
  useEffect(() => {
    if (profileData?.cpf_last4) {
      setCpfInput('***.***.*' + profileData.cpf_last4.slice(0, 1) + '*-' + profileData.cpf_last4.slice(-2));
      setCpfSaved(true);
    } else {
      setCpfInput("");
      setCpfSaved(false);
    }
  }, [profileData]);

  // Sync client form
  useEffect(() => {
    if (client && !editing) {
      setForm(client);
    }
  }, [client, editing]);

  // Sync barber form
  useEffect(() => {
    if (barberProfile) {
      setBarberForm({
        name: barberProfile.name || "",
        bio: barberProfile.bio || "",
        specialties: barberProfile.specialties ? barberProfile.specialties.join(", ") : ""
      });
    } else if (user) {
      setBarberForm(prev => ({
        ...prev,
        name: prev.name || user.full_name || ""
      }));
    }
  }, [barberProfile, user]);

  // Derived barber history (enriched with shop name)
  const barberHistory = barberHistoryData.map(h => {
    const shop = availableShops.find(s => s.id === h.shop_id);
    return { ...h, shop_name: shop?.name || 'Barbearia desconhecida' };
  });

  // Mutations
  const saveProfileMutation = useMutation({
    mutationFn: async ({ clientId, clientData, profileId, profileData }) => {
      // 1. Update Client
      const updatedClient = await db.entities.Client.update(clientId, clientData);

      // 2. Update profiles table
      const { error } = await supabase.from('profiles').update(profileData).eq('id', profileId);
      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate') || error.code === '23505') {
          throw new Error("Este CPF já está vinculado a outra conta.");
        }
        throw error;
      }
      return updatedClient;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['Client'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });

      if (variables.cpfIsNew) {
        const last4 = getLast4Digits(variables.cpfCleaned);
        setCpfInput('***.***.*' + last4.slice(0, 1) + '*-' + last4.slice(-2));
        setCpfSaved(true);
      }

      setEditing(false);
      toast.success("Perfil atualizado!");
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.message || "Erro ao salvar perfil");
    }
  });

  async function saveProfile() {
    // Validate CPF if it was changed (not masked)
    const cpfCleaned = cpfInput.replace(/\D/g, '');
    const cpfIsNew = cpfCleaned.length === 11; // Only validate if user typed a full CPF (not masked)
    if (isCpfRequired && !cpfSaved && !cpfIsNew) {
      toast.error("Para este tipo de conta, o CPF é obrigatório. Preencha seu CPF para salvar.");
      return;
    }

    if (cpfIsNew && cpfCleaned.length < 11) {
      toast.error('CPF incompleto. Informe todos os 11 dígitos.');
      return;
    }

    if (cpfIsNew && !validateCPF(cpfCleaned)) {
      toast.error("CPF inválido. Verifique o número informado.");
      return;
    }

    // Build profile update payload
    const profileUpdate = {
      full_name: form.name,
      phone: form.phone
    };

    // Save CPF if user typed a new one
    if (cpfIsNew) {
      const hash = await hashDocument(cpfCleaned);
      const last4 = getLast4Digits(cpfCleaned);
      profileUpdate.cpf_hash = hash;
      profileUpdate.cpf_last4 = last4;
      profileUpdate.lgpd_consent = true;
      profileUpdate.lgpd_consent_date = new Date().toISOString();
    }

    saveProfileMutation.mutate({
      clientId: client.id,
      clientData: form,
      profileId: user.id,
      profileData: profileUpdate,
      cpfIsNew,
      cpfCleaned
    });
  }

  const createBarberMutation = useEntityCreate('Barber');

  async function handleCreateBarber(e) {
    e.preventDefault();

    if (!barberForm.name?.trim()) {
      toast.error("Por favor, preencha o Nome Profissional.");
      return;
    }
    if (!barberForm.photo) {
      toast.error("Por favor, envie sua Foto Profissional.");
      return;
    }
    if (!barberForm.bio?.trim()) {
      toast.error("Por favor, preencha o campo Quem sou eu / Bio.");
      return;
    }
    if (!barberForm.career?.trim()) {
      toast.error("Por favor, preencha o campo Carreira e Experiência.");
      return;
    }
    if (!barberForm.whatsapp?.trim()) {
      toast.error("Por favor, insira seu número de WhatsApp.");
      return;
    }
    const specs = barberForm.specialties ? barberForm.specialties.split(",").map(s => s.trim()).filter(Boolean) : [];
    if (specs.length === 0) {
      toast.error("Por favor, informe ao menos uma Especialidade.");
      return;
    }

    createBarberMutation.mutate({
      profile_id: user.id,
      owner_email: user.email,
      name: barberForm.name.trim(),
      photo: barberForm.photo,
      bio: barberForm.bio.trim(),
      career: barberForm.career.trim(),
      whatsapp: barberForm.whatsapp.trim(),
      instagram: barberForm.instagram?.trim() || "",
      specialties: specs,
      is_active: false
    }, {
      onSuccess: async () => {
        toast.success("Perfil de barbeiro criado com sucesso!");
        await refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['Barber'] });
      },
      onError: (err) => {
        console.error(err);
        toast.error("Erro ao criar perfil de barbeiro: " + (err.message || ""));
      }
    });
  }

  const requestLinkMutation = useEntityCreate('BarberLinkRequest');

  async function handleRequestLink(e) {
    e.preventDefault();
    if (!selectedShopId) {
      toast.error("Por favor, selecione uma barbearia.");
      return;
    }
    requestLinkMutation.mutate({
      shop_id: selectedShopId,
      profile_id: user.id,
      barber_id: barberProfile.id,
      status: "pending"
    }, {
      onSuccess: () => {
        toast.success("Solicitação de vínculo enviada!");
      },
      onError: (err) => {
        console.error(err);
        toast.error("Erro ao enviar solicitação.");
      }
    });
  }

  const unlinkBarberMutation = useMutation({
    mutationFn: async () => {
      if (!barberProfile || !barberProfile.shop_id) return;
      const oldShopId = barberProfile.shop_id;
      // 1. Update barber's shop_id to null
      await db.entities.Barber.update(barberProfile.id, { shop_id: null });
      // 2. Remove from shop_memberships
      await supabase
        .from('shop_memberships')
        .delete()
        .eq('shop_id', oldShopId)
        .eq('profile_id', user.id)
        .eq('role', 'barber');
      
      // 3. Create BarberLinkHistory record
      await db.entities.BarberLinkHistory.create({
        shop_id: oldShopId,
        profile_id: user.id,
        barber_id: barberProfile.id,
        action: 'unlinked',
        notes: 'Desvinculado pelo próprio profissional.'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Barber'] });
      queryClient.invalidateQueries({ queryKey: ['BarberLinkRequest'] });
      queryClient.invalidateQueries({ queryKey: ['BarberLinkHistory'] });
      toast.success("Desvinculado da barbearia com sucesso!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao se desvincular da barbearia.");
    }
  });

  async function handleUnlinkBarber() {
    unlinkBarberMutation.mutate();
  }

  function handleStartCancelBarber() {
    if (!barberProfile) return;
    if (barberProfile.shop_id) {
      toast.error("Não é possível cancelar seu perfil profissional enquanto estiver vinculado a uma barbearia. Por favor, desvincule-se primeiro.");
      return;
    }
    setCancelConsent(false);
    setShowCancelBarberModal(true);
  }

  async function handleCancelBarberProfile() {
    if (!barberProfile) return;
    if (!cancelConsent) {
      toast.error("Você precisa aceitar os termos marcando a caixa de consentimento.");
      return;
    }
    setCancelingBarber(true);
    try {
      // Excluir perfil do barbeiro
      await db.entities.Barber.delete(barberProfile.id);
      
      toast.success("Perfil profissional cancelado com sucesso!");
      setShowCancelBarberModal(false);
      setCancelConsent(false);
      
      // Atualizar dados de sessão e caches
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['Barber'] });
      queryClient.invalidateQueries({ queryKey: ['BarberLinkRequest'] });
      queryClient.invalidateQueries({ queryKey: ['BarberLinkHistory'] });
      
      // Forçar recarregamento da página para limpar o estado e rotas
      window.location.reload();
    } catch (err) {
      console.error("Erro ao desativar perfil de barbeiro:", err);
      toast.error("Erro ao cancelar o perfil: " + (err.message || ""));
    } finally {
      setCancelingBarber(false);
    }
  }

  const createShopMutation = useEntityCreate('Shop');

  async function handleCreateShop(e) {
    e.preventDefault();
    if (!shopForm.name || !shopForm.razao_social || !shopForm.phone || !shopForm.cnpj || !shopForm.cep || !shopForm.street || !shopForm.number || !shopForm.neighborhood || !shopForm.city || !shopForm.state) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    // Verificar se já possui barbearia
    if (userShops.length > 0) {
      toast.error("Você já possui uma barbearia cadastrada. Apenas uma por conta.");
      return;
    }
    // Validar CNPJ
    const cleanedCNPJ = shopForm.cnpj.replace(/\D/g, '');
    if (cleanedCNPJ.length !== 14 || !validateCNPJ(cleanedCNPJ)) {
      toast.error("CNPJ inválido. Informe um CNPJ válido de 14 dígitos.");
      return;
    }

    const slug = shopForm.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-4);
    const workingHours = {
      monday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
      tuesday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
      wednesday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
      thursday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
      friday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
      saturday: { start: shopForm.startTime, end: shopForm.endTime, active: true },
      sunday: { start: shopForm.startTime, end: shopForm.endTime, active: false }
    };

    const cnpjHash = await hashDocument(cleanedCNPJ);
    const cnpjLast4 = getLast4Digits(cleanedCNPJ);
    
    const fullAddress = `${shopForm.street}, ${shopForm.number}${shopForm.complement ? ` - ${shopForm.complement}` : ''} - ${shopForm.neighborhood}, ${shopForm.city} - ${shopForm.state}, CEP: ${shopForm.cep}`;

    createShopMutation.mutate({
      owner_id: user.id,
      owner_email: user.email,
      name: shopForm.name,
      razao_social: shopForm.razao_social,
      address: fullAddress,
      phone: shopForm.phone,
      whatsapp: shopForm.whatsapp || shopForm.phone,
      neighborhood: shopForm.neighborhood,
      city: shopForm.city,
      slug: slug,
      working_hours: workingHours,
      is_active: true,
      cnpj_hash: cnpjHash,
      cnpj_last4: cnpjLast4
    }, {
      onSuccess: () => {
        toast.success("Barbearia criada! Você agora é administrador.");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1500);
      },
      onError: (err) => {
        console.error(err);
        toast.error("Erro ao criar barbearia.");
      }
    });
  }

  const saving = saveProfileMutation.isPending;
  const barberLoading = createBarberMutation.isPending || requestLinkMutation.isPending || unlinkBarberMutation.isPending;
  const shopLoading = createShopMutation.isPending;
  const loading = !user || profileLoading || clientLoading || appointmentsLoading || availableShopsLoading || barberQueryLoading || clientList.length === 0 || createClientMutation.isPending;

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleCepChange(value) {
    const formatted = formatCEP(value);
    setF('cep', formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8 && validateCEP(clean)) {
      setCepLoading(true);
      try {
        const address = await fetchAddressByCEP(clean);
        if (address) {
          setForm(f => ({
            ...f,
            cep: formatted,
            street: address.logradouro || f.street || '',
            neighborhood: address.bairro || f.neighborhood || '',
            city: address.localidade || f.city || '',
            state: address.uf || f.state || '',
          }));
          toast.success('Endereço encontrado!');
        } else {
          toast.error('CEP não encontrado. Preencha manualmente.');
        }
      } catch {
        toast.error('Erro ao buscar CEP. Preencha manualmente.');
      } finally {
        setCepLoading(false);
      }
    }
  }

  async function handleShopCepChange(value) {
    const formatted = formatCEP(value);
    setShopForm(f => ({ ...f, cep: formatted }));
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8 && validateCEP(clean)) {
      setShopCepLoading(true);
      try {
        const address = await fetchAddressByCEP(clean);
        if (address) {
          setShopForm(f => ({
            ...f,
            cep: formatted,
            street: address.logradouro || f.street || '',
            neighborhood: address.bairro || f.neighborhood || '',
            city: address.localidade || f.city || '',
            state: address.uf || f.state || '',
          }));
          toast.success('Endereço da barbearia encontrado!');
        } else {
          toast.error('CEP não encontrado. Preencha manualmente.');
        }
      } catch {
        toast.error('Erro ao buscar CEP. Preencha manualmente.');
      } finally {
        setShopCepLoading(false);
      }
    }
  }

  const completed = appointments.filter(a => a.status === "concluido");
  const totalSpent = completed.reduce((s, a) => s + (a.price || 0), 0);
  const avgTicket = completed.length > 0 ? (totalSpent / completed.length).toFixed(0) : 0;
  const upcoming = appointments.filter(a => ["agendado", "confirmado"].includes(a.status));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        {editing ? (
          <div className="flex justify-center mb-4">
            <ImageUpload
              value={avatarUrl}
              onChange={async (url) => {
                await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
                setAvatarUrl(url);
                toast.success('Foto atualizada!');
              }}
              onRemove={async () => {
                await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
                setAvatarUrl("");
                toast.success('Foto removida!');
              }}
              label="Foto de Perfil"
              aspect="square"
              maxSizeMB={5}
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-primary/50" />
            )}
          </div>
        )}
        <h1 className="text-xl font-bold">{client?.name || user?.full_name || "Meu Perfil"}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        {client?.is_vip && <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">⭐ Cliente VIP</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Cortes", value: completed.length },
          { label: "Total gasto", value: `R$${totalSpent}` },
          { label: "Ticket médio", value: `R$${avgTicket}` },
          { label: "Próximos", value: upcoming.length },
        ].map((s, i) => (
          <div key={i} className="text-center p-3 rounded-2xl bg-card border border-border/50">
            <div className="text-lg font-bold text-primary">{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
        {[["historico", "Histórico"], ["perfil", "Meus dados"], ["endereco", "Endereço"], ["equipe", "Junte-se à equipe"], ...(barberProfile ? [["carreira", "Carreira"]] : [])].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: Histórico */}
      {tab === "historico" && (
        <div>
          {upcoming.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Próximos agendamentos</h3>
              <div className="space-y-2">
                {upcoming.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/15">
                    <div>
                      <p className="font-medium text-sm">{a.service_name}</p>
                      <p className="text-xs text-muted-foreground">{a.barber_name} • {new Date(a.date + "T12:00").toLocaleDateString("pt-BR")} às {a.time}</p>
                    </div>
                    <div className="text-right">
                      {a.price && <p className="font-semibold text-primary">R${a.price}</p>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || ""}`}>{STATUS_LABELS[a.status] || a.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Histórico completo</h3>
          {appointments.filter(a => !["agendado", "confirmado"].includes(a.status)).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
              <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Nenhum agendamento ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.filter(a => !["agendado", "confirmado"].includes(a.status)).map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
                  <div>
                    <p className="font-medium text-sm">{a.service_name}</p>
                    <p className="text-xs text-muted-foreground">{a.barber_name} • {new Date(a.date + "T12:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    {a.price && <p className="font-medium text-sm text-primary">R${a.price}</p>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || "bg-muted text-muted-foreground"}`}>{STATUS_LABELS[a.status] || a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Dados pessoais */}
      {tab === "perfil" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Dados pessoais</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Nome completo</Label>
            <Input value={form.name || ""} onChange={e => setF("name", e.target.value)} disabled={!editing} className="bg-muted/20 border-border/40 disabled:opacity-70" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Telefone</Label>
              <Input value={form.phone || ""} onChange={e => setF("phone", e.target.value)} disabled={!editing} placeholder="(11) 00000-0000" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp</Label>
              <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", e.target.value)} disabled={!editing} placeholder="(11) 00000-0000" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Data de nascimento</Label>
            <Input type="date" value={form.birthday || ""} onChange={e => setF("birthday", e.target.value)} disabled={!editing} className="bg-muted/20 border-border/40 disabled:opacity-70" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Observações / preferências</Label>
            <Textarea value={form.notes || ""} onChange={e => setF("notes", e.target.value)} disabled={!editing} rows={3} className="bg-muted/20 border-border/40 disabled:opacity-70 resize-none" placeholder="Ex: prefere corte degradê, alérgico a certos produtos..." />
          </div>

          {/* CPF Field */}
          <div className={`mt-4 p-4 rounded-xl border ${isCpfRequired && !cpfSaved ? 'bg-red-500/5 border-red-500/30' : 'bg-primary/5 border-primary/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <Label className={`text-xs font-semibold ${isCpfRequired && !cpfSaved ? 'text-red-400' : 'text-primary'}`}>
                CPF {isCpfRequired ? '(obrigatório)' : '(opcional)'}
              </Label>
            </div>
            {isCpfRequired && !cpfSaved && (
              <p className="text-[10px] text-red-400 mb-2 font-medium">⚠️ Contas profissionais devem informar o CPF para fins de cadastro e prevenção de duplicidade.</p>
            )}
            <p className="text-[10px] text-muted-foreground mb-3">Armazenado de forma segura (hash SHA-256). Apenas os últimos dígitos ficam visíveis.</p>
            <Input
              value={cpfInput}
              onChange={e => setCpfInput(formatCPF(e.target.value))}
              disabled={!editing || cpfSaved}
              placeholder="000.000.000-00"
              maxLength={14}
              className="bg-muted/20 border-border/40 text-sm font-mono disabled:opacity-70"
            />
            {cpfSaved && <p className="text-[10px] text-emerald-400 mt-2">✅ CPF verificado e salvo com segurança.</p>}
          </div>

          {editing && (
            <div className="flex gap-2">
              <Button onClick={saveProfile} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl gap-2">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar dados"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(client); }} className="rounded-xl">Cancelar</Button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Endereço */}
      {tab === "endereco" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Endereço</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Seus dados de endereço melhoram sua experiência e ajudam na análise de atendimento na sua região.</p>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">CEP</Label>
            <div className="relative">
              <Input 
                value={form.cep || ""} 
                onChange={e => handleCepChange(e.target.value)} 
                disabled={!editing} 
                placeholder="00000-000" 
                className="bg-muted/20 border-border/40 disabled:opacity-70" 
                maxLength={9} 
              />
              {cepLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Rua / Avenida</Label>
              <Input value={form.street || ""} onChange={e => setF("street", e.target.value)} disabled={!editing} placeholder="Ex: Rua das Flores" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Número</Label>
              <Input value={form.street_number || ""} onChange={e => setF("street_number", e.target.value)} disabled={!editing} placeholder="123" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Complemento</Label>
            <Input value={form.complement || ""} onChange={e => setF("complement", e.target.value)} disabled={!editing} placeholder="Apto, bloco, casa..." className="bg-muted/20 border-border/40 disabled:opacity-70" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Bairro</Label>
              <Input value={form.neighborhood || ""} onChange={e => setF("neighborhood", e.target.value)} disabled={!editing} placeholder="Ex: Pinheiros" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cidade</Label>
              <Input value={form.city || ""} onChange={e => setF("city", e.target.value)} disabled={!editing} placeholder="Ex: São Paulo" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Estado</Label>
            {editing ? (
              <Select value={form.state || ''} onValueChange={(val) => setF('state', val)} disabled={!editing}>
                <SelectTrigger className="bg-muted/20 border-border/40">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.value} — {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.state || ''} disabled placeholder="UF" className="bg-muted/20 border-border/40 disabled:opacity-70" />
            )}
          </div>

          {editing && (
            <div className="flex gap-2">
              <Button onClick={saveProfile} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl gap-2">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar endereço"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(client); }} className="rounded-xl">Cancelar</Button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Junte-se à equipe */}
      {tab === "equipe" && (
        <div className="space-y-6">
          <div className="bg-card border border-border/50 p-6 rounded-2xl">
            <h3 className="font-bold text-lg mb-2">Junte-se à nossa equipe</h3>
            <p className="text-sm text-muted-foreground">
              Escolha uma das opções abaixo para evoluir sua conta e começar a usar as ferramentas profissionais do TrimUp.
            </p>
          </div>

          {(user.roles?.includes("barber") || user.roles?.includes("admin") || user.role === "barber" || user.role === "admin") && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl text-emerald-400 text-sm">
              <p className="font-semibold mb-1">Você já possui acesso profissional:</p>
              <ul className="list-disc pl-5 space-y-1">
                {(user.roles?.includes("admin") || user.role === "admin") && <li><strong>Administrador:</strong> Você gerencia uma ou mais barbearias. Acesso ao <Link to="/admin" className="underline font-bold">Painel Admin</Link> liberado.</li>}
                {(user.roles?.includes("barber") || user.role === "barber") && <li><strong>Barbeiro:</strong> Você está vinculado a uma equipe. Acesso ao <Link to="/barber-dashboard" className="underline font-bold">Painel do Barbeiro</Link> liberado.</li>}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CARD 1: TORNAR-SE BARBEIRO */}
            <div className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-base mb-1">Quero ser Barbeiro</h4>
                <p className="text-xs text-muted-foreground mb-4">Crie seu perfil profissional, defina especialidades e associe-se a uma barbearia parceira.</p>

                {barberProfile ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-1">
                      <p><strong>Nome Profissional:</strong> {barberProfile.name}</p>
                      <p><strong>Status:</strong> {barberProfile.shop_id ? "Vinculado a uma barbearia" : "Sem vínculo ativo"}</p>
                    </div>

                    {!barberProfile.shop_id ? (
                      <div className="space-y-3 mt-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs">
                          Você ainda não está vinculado a uma barbearia.
                        </div>

                        {linkRequest ? (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs">
                            Solicitação de vínculo pendente para a barbearia: 
                            <strong className="block mt-1">{availableShops.find(s => s.id === linkRequest.shop_id)?.name || "Barbearia"}</strong>
                          </div>
                        ) : (
                          <form onSubmit={handleRequestLink} className="space-y-3">
                            <Label className="text-xs text-muted-foreground">Selecione a Barbearia:</Label>
                            <select 
                              value={selectedShopId} 
                              onChange={e => setSelectedShopId(e.target.value)}
                              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            >
                              <option value="">Selecione...</option>
                              {availableShops.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.address})</option>
                              ))}
                            </select>
                            <Button type="submit" disabled={barberLoading} className="w-full text-xs h-9">
                              Solicitar Vínculo
                            </Button>
                            {/* Botão de Excluir Perfil Profissional */}
                            <div className="pt-4 border-t border-border/20 mt-4">
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={handleStartCancelBarber}
                                className="w-full text-xs h-9 bg-red-950/20 text-red-400 hover:bg-red-900/30 border border-red-500/20 rounded-lg"
                              >
                                Cancelar Perfil Profissional
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                       <div className="space-y-3">
                         <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                           Vinculado com sucesso à barbearia <strong>{availableShops.find(s => s.id === barberProfile.shop_id)?.name}</strong>!
                         </div>
                         <Button 
                           type="button"
                           onClick={handleUnlinkBarber} 
                           disabled={barberLoading} 
                           variant="destructive" 
                           className="w-full text-xs h-9 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                         >
                           {barberLoading ? "Desvinculando..." : "Desvincular da Barbearia"}
                         </Button>
                       </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleCreateBarber} className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Nome Profissional *</Label>
                      <Input value={barberForm.name || ""} onChange={e => setBarberForm({ ...barberForm, name: e.target.value })} required placeholder="Ex: Barber João" className="h-9 text-xs bg-muted/20 border-border/40" />
                    </div>
                    <div className="pt-1">
                      <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Foto Profissional *</Label>
                      <ImageUpload
                        value={barberForm.photo || ""}
                        onChange={(url) => setBarberForm(prev => ({ ...prev, photo: url }))}
                        onRemove={() => setBarberForm(prev => ({ ...prev, photo: '' }))}
                        label="Foto Profissional"
                        aspect="square"
                        maxSizeMB={5}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Quem sou eu / Bio *</Label>
                      <Textarea value={barberForm.bio || ""} onChange={e => setBarberForm({ ...barberForm, bio: e.target.value })} placeholder="Ex: Especialista em corte degradê e barba clássica..." className="text-xs h-16 resize-none bg-muted/20 border-border/40" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Carreira e Experiência *</Label>
                      <Textarea value={barberForm.career || ""} onChange={e => setBarberForm({ ...barberForm, career: e.target.value })} placeholder="Trajetória profissional, formações, conquistas..." className="text-xs h-16 resize-none bg-muted/20 border-border/40" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp *</Label>
                        <Input value={barberForm.whatsapp || ""} onChange={e => setBarberForm({ ...barberForm, whatsapp: e.target.value })} placeholder="5511999999999" className="h-9 text-xs bg-muted/20 border-border/40" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Instagram (Opcional)</Label>
                        <Input value={barberForm.instagram || ""} onChange={e => setBarberForm({ ...barberForm, instagram: e.target.value })} placeholder="@barbeiro" className="h-9 text-xs bg-muted/20 border-border/40" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Especialidades (separadas por vírgula) *</Label>
                      <Input value={barberForm.specialties || ""} onChange={e => setBarberForm({ ...barberForm, specialties: e.target.value })} placeholder="Ex: Degradê, Barba, Pigmentação" className="h-9 text-xs bg-muted/20 border-border/40" />
                    </div>
                    <Button type="submit" disabled={barberLoading} className="w-full text-xs h-9 mt-2">
                      Criar Perfil Profissional
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* CARD 2: TORNAR-SE ADMIN (CRIAR BARBEARIA) */}
            {barberProfile && barberProfile.shop_id ? (
              <div className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base mb-1">Cadastrar Barbearia</h4>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs mt-3">
                    Barbeiros vinculados a uma barbearia não podem cadastrar outra.
                  </div>
                </div>
              </div>
            ) : (
            <div className="bg-card border border-border/50 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-base mb-1">Cadastrar Barbearia</h4>
                <p className="text-xs text-muted-foreground mb-4">Crie sua barbearia para começar a gerenciar sua agenda, equipe e faturamento.</p>

                <form onSubmit={handleCreateShop} className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Nome Fantasia *</Label>
                    <Input value={shopForm.name} onChange={e => setShopForm({ ...shopForm, name: e.target.value })} required placeholder="Ex: Barbearia Premium" className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Razão Social *</Label>
                    <Input value={shopForm.razao_social} onChange={e => setShopForm({ ...shopForm, razao_social: e.target.value })} required placeholder="Ex: Premium Barber LTDA" className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">CNPJ *</Label>
                    <Input value={shopForm.cnpj} onChange={e => {
                      const v = e.target.value.replace(/\D/g, '');
                      setShopForm({ ...shopForm, cnpj: formatCNPJ(v) });
                    }} placeholder="00.000.000/0000-00" className="h-9 text-xs font-mono" required maxLength={18} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Telefone Comercial *</Label>
                      <Input value={shopForm.phone} onChange={e => setShopForm({ ...shopForm, phone: e.target.value })} required placeholder="(11) 99999-9999" className="h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">WhatsApp (Opcional)</Label>
                      <Input value={shopForm.whatsapp} onChange={e => setShopForm({ ...shopForm, whatsapp: e.target.value })} placeholder="Mesmo que o telefone" className="h-9 text-xs" />
                    </div>
                  </div>

                  {/* Endereço Expandido com CEP inteligente */}
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
                    <p className="text-xs font-semibold text-foreground">Endereço da Barbearia</p>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">CEP *</Label>
                      <div className="relative">
                        <Input 
                          value={shopForm.cep || ""} 
                          onChange={e => handleShopCepChange(e.target.value)} 
                          required
                          placeholder="00000-000" 
                          className="h-9 text-xs" 
                          maxLength={9} 
                        />
                        {shopCepLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">Rua *</Label>
                        <Input value={shopForm.street || ""} onChange={e => setShopForm({ ...shopForm, street: e.target.value })} required className="h-9 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Número *</Label>
                        <Input value={shopForm.number || ""} onChange={e => setShopForm({ ...shopForm, number: e.target.value })} required className="h-9 text-xs" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Complemento</Label>
                      <Input value={shopForm.complement || ""} onChange={e => setShopForm({ ...shopForm, complement: e.target.value })} className="h-9 text-xs" placeholder="Ex: Sala 42" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Bairro *</Label>
                        <Input value={shopForm.neighborhood || ""} onChange={e => setShopForm({ ...shopForm, neighborhood: e.target.value })} required className="h-9 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Cidade *</Label>
                        <Input value={shopForm.city || ""} onChange={e => setShopForm({ ...shopForm, city: e.target.value })} required className="h-9 text-xs" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Estado *</Label>
                      <Select value={shopForm.state || ''} onValueChange={(val) => setShopForm(f => ({ ...f, state: val }))}>
                        <SelectTrigger className="h-9 text-xs bg-muted/20 border-border/40">
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.value} — {s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Abre às</Label>
                      <Input type="time" value={shopForm.startTime} onChange={e => setShopForm({ ...shopForm, startTime: e.target.value })} required className="h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Fecha às</Label>
                      <Input type="time" value={shopForm.endTime} onChange={e => setShopForm({ ...shopForm, endTime: e.target.value })} required className="h-9 text-xs" />
                    </div>
                  </div>
                  <Button type="submit" disabled={shopLoading} className="w-full text-xs h-9 mt-2">
                    Criar Barbearia & Ser Admin
                  </Button>
                </form>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Carreira */}
      {tab === "carreira" && barberProfile && (
        <div className="space-y-4">
          <div className="bg-card border border-border/50 p-5 rounded-2xl">
            <h3 className="font-bold text-base mb-1">Histórico Profissional</h3>
            <p className="text-xs text-muted-foreground">Barbearias por onde você passou e seu status de vínculo.</p>
          </div>

          {barberProfile.shop_id && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-lg">🏠</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{availableShops.find(s => s.id === barberProfile.shop_id)?.name || 'Barbearia atual'}</p>
                  <p className="text-[10px] text-emerald-400">✅ Vinculado atualmente</p>
                </div>
              </div>
            </div>
          )}

          {barberHistory.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico de vínculos</h4>
              {barberHistory
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map(h => (
                <div key={h.id} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${h.action === 'accepted' ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
                    <span className="text-lg">{h.action === 'accepted' ? '🤝' : '👋'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{h.shop_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {h.action === 'accepted' ? 'Vinculado' : h.action === 'unlinked' ? 'Desvinculado' : h.action === 'rejected' ? 'Rejeitado' : h.action}
                      {' • '}
                      {new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {h.notes && <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !barberProfile.shop_id && (
              <div className="text-center py-12 text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum histórico profissional ainda.</p>
                <p className="text-xs mt-1">Vincule-se a uma barbearia para começar!</p>
              </div>
            )
          )}
        </div>
      )}

      <Button onClick={() => db.auth.logout()} variant="outline" className="w-full mt-8 rounded-xl border-border/50 text-muted-foreground hover:text-destructive">
        <LogOut className="w-4 h-4 mr-2" /> Sair da conta
      </Button>

      {!showDeleteConfirm ? (
        <button onClick={() => setShowDeleteConfirm(true)}
          className="w-full mt-3 text-xs text-muted-foreground/40 hover:text-destructive transition-colors text-center py-2">
          Excluir conta
        </button>
      ) : (
        <div className="mt-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
          <p className="text-sm text-center text-destructive mb-1 font-medium">Excluir conta permanentemente?</p>
          <p className="text-xs text-center text-muted-foreground mb-4">Todos os seus dados serão removidos. Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl text-xs h-9">Cancelar</Button>
            <Button onClick={() => { toast.error("Para excluir sua conta, entre em contato: suporte@trimup.com"); setShowDeleteConfirm(false); }}
              className="flex-1 rounded-xl text-xs h-9 bg-destructive hover:bg-destructive/90 text-white">
              <Trash2 className="w-3 h-3 mr-1" /> Confirmar exclusão
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento de Perfil Profissional */}
      {showCancelBarberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowCancelBarberModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 text-red-500 border border-red-500/25">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Cancelar Perfil Profissional</h3>
              <p className="text-sm text-muted-foreground mt-1 font-normal">Esta ação é irreversível</p>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground mb-6 bg-muted/20 border border-border/30 p-4 rounded-xl">
              <p className="text-left">Ao confirmar o cancelamento, seu perfil de barbeiro será excluído:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-left">
                <li>Sua biografia, foto e especialidades serão removidas.</li>
                <li>Seus vínculos e histórico profissional serão apagados.</li>
                <li>Seus horários de atendimento e serviços serão deletados.</li>
              </ul>
              <p className="text-xs text-red-400 font-medium border-t border-border/20 pt-2.5 mt-2 text-left">
                A sua conta principal de cliente continuará ativa e intocada para agendamentos.
              </p>
            </div>

            <div className="flex items-start gap-2 mb-6 select-none cursor-pointer text-left">
              <input
                id="consent-checkbox"
                type="checkbox"
                checked={cancelConsent}
                onChange={(e) => setCancelConsent(e.target.checked)}
                className="mt-0.5 rounded border-border/50 bg-background text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <label htmlFor="consent-checkbox" className="text-xs text-foreground cursor-pointer font-medium leading-tight">
                Estou ciente de que perderei os dados do meu perfil profissional de barbeiro.
              </label>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowCancelBarberModal(false)}
                className="flex-1 rounded-xl text-xs h-10"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleCancelBarberProfile}
                disabled={!cancelConsent || cancelingBarber}
                className="flex-1 rounded-xl text-xs h-10 bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {cancelingBarber ? "Cancelando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}