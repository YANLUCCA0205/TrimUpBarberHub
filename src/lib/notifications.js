import db from './db';

export async function notifyNewAppointment(profileId, { barberName, serviceName, date, time }) {
  if (!profileId) return null;
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Novo Agendamento',
    content: `Seu agendamento de ${serviceName} com ${barberName} foi confirmado para ${date} às ${time}.`,
    is_read: false
  });
}

export async function notifyAppointmentCancelled(profileId, { serviceName, date, time }) {
  if (!profileId) return null;
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Agendamento Cancelado',
    content: `O agendamento de ${serviceName} em ${date} às ${time} foi cancelado.`,
    is_read: false
  });
}

export async function notifyBarberLinked(profileId, shopName) {
  if (!profileId) return null;
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Vínculo Aprovado',
    content: `Seu vínculo com ${shopName} foi aprovado! Você já pode acessar sua agenda.`,
    is_read: false
  });
}

export async function notifyBarberUnlinked(profileId, shopName) {
  if (!profileId) return null;
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Desvinculado',
    content: `Você foi desvinculado de ${shopName}.`,
    is_read: false
  });
}

export async function notifyAppointmentStatusChange(profileId, { serviceName, date, time, newStatus }) {
  if (!profileId) return null;
  const statusMap = { concluido: 'concluído', confirmado: 'confirmado', cancelado: 'cancelado' };
  return db.entities.Notification.create({
    profile_id: profileId,
    title: 'Status do Agendamento Atualizado',
    content: `Seu agendamento de ${serviceName} em ${date} às ${time} foi ${statusMap[newStatus] || newStatus}.`,
    is_read: false
  });
}

/**
 * Gera URL direta para envio de WhatsApp com mensagem pré-formatada (wa.me)
 */
export function generateWhatsAppLink({ phone, clientName = "Cliente", shopName = "TrimUp", barberName = "Barbeiro", serviceName = "Serviço", date = "", time = "", type = "confirmation" }) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

  let message = "";
  if (type === "confirmation") {
    message = `💈 *${shopName}* - Agendamento Confirmado!\n\nOlá, *${clientName}*! Seu horário para *${serviceName}* com o profissional *${barberName}* está agendado para o dia *${date}* às *${time}*.\n\nTe esperamos lá! ✂️`;
  } else if (type === "reminder_2h") {
    message = `⏰ *Lembrete de Horário - ${shopName}*\n\nOlá, *${clientName}*! Passando para lembrar do seu atendimento hoje às *${time}* com *${barberName}* (*${serviceName}*).\n\nCaso precise remarcar, por favor nos avise por aqui com antecedência!`;
  } else if (type === "cancelled") {
    message = `⚠️ *Agendamento Cancelado - ${shopName}*\n\nOlá, *${clientName}*, seu agendamento de *${serviceName}* para *${date}* às *${time}* foi cancelado. Se desejar remarcar, estamos à disposição!`;
  } else if (type === "reactivation") {
    message = `✂️ *Saudades de você na ${shopName}!*\n\nOlá, *${clientName}*! Já faz algum tempo desde o seu último corte com a gente. Que tal renovar o visual esta semana? Responda esta mensagem para garantir o seu horário!`;
  }

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Filtra agendamentos marcados para as próximas 2 horas da data de hoje
 */
export function filterUpcoming2HourAppointments(appointments = []) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return appointments.filter(a => {
    if (a.date !== todayStr) return false;
    if (["cancelado", "faltou", "concluido"].includes(a.status)) return false;
    if (!a.time) return false;

    const [h, m] = a.time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return false;

    const apptMinutes = h * 60 + m;
    const diff = apptMinutes - currentMinutes;
    // Dentro da janela de 0 a 120 minutos (2 horas)
    return diff >= 0 && diff <= 120;
  });
}

