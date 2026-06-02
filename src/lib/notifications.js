import db from './db';

export async function notifyNewAppointment(profileId, { barberName, serviceName, date, time }) {
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Novo Agendamento',
    content: `Seu agendamento de ${serviceName} com ${barberName} foi confirmado para ${date} às ${time}.`,
    is_read: false
  });
}

export async function notifyAppointmentCancelled(profileId, { serviceName, date, time }) {
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Agendamento Cancelado',
    content: `O agendamento de ${serviceName} em ${date} às ${time} foi cancelado.`,
    is_read: false
  });
}

export async function notifyBarberLinked(profileId, shopName) {
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Vínculo Aprovado',
    content: `Seu vínculo com ${shopName} foi aprovado! Você já pode acessar sua agenda.`,
    is_read: false
  });
}

export async function notifyBarberUnlinked(profileId, shopName) {
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Desvinculado',
    content: `Você foi desvinculado de ${shopName}.`,
    is_read: false
  });
}

export async function notifyAppointmentStatusChange(profileId, { serviceName, date, time, newStatus }) {
  const statusMap = { concluido: 'concluído', confirmado: 'confirmado', cancelado: 'cancelado' };
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Status do Agendamento Atualizado',
    content: `Seu agendamento de ${serviceName} em ${date} às ${time} foi ${statusMap[newStatus] || newStatus}.`,
    is_read: false
  });
}
