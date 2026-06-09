import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import RegistrationModal from './RegistrationModal';

function isProfileIncomplete(user, profile) {
  if (!user || !profile) return false;

  const name = profile.full_name;
  const hasName = name && name.trim() !== '' && name !== 'Usuário';
  const hasPhone = profile.phone && profile.phone.trim() !== '';

  if (user.role === 'user') {
    return !hasName || !hasPhone;
  } else {
    // Para todas as demais roles (barbeiro, proprietário da barbearia, administrador, etc.), o CPF é obrigatório
    const hasCpf = profile.cpf_hash && profile.cpf_hash.trim() !== '';
    return !hasName || !hasPhone || !hasCpf;
  }
}

export default function RegistrationGuard({ children }) {
  const { user, profile, isAuthenticated } = useAuth();

  const showModal = isAuthenticated && isProfileIncomplete(user, profile);

  return (
    <>
      {children}
      <RegistrationModal isOpen={showModal} />
    </>
  );
}
