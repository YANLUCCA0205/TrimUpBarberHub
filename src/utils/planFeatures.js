export const AVAILABLE_FEATURES = [
  // Agenda
  { id: "agenda_online", label: "Agendamento online", category: "Agenda" },
  { id: "agenda_reagendamento", label: "Reagendamento", category: "Agenda" },
  { id: "agenda_cancelamento", label: "Cancelamento", category: "Agenda" },
  { id: "agenda_bloqueio", label: "Bloqueio de horários", category: "Agenda" },
  { id: "agenda_personalizada", label: "Horários personalizados", category: "Agenda" },

  // Clientes
  { id: "crm_cadastro", label: "Cadastro de clientes", category: "Clientes" },
  { id: "crm_historico", label: "Histórico de atendimentos", category: "Clientes" },
  { id: "crm_observacoes", label: "Observações do cliente", category: "Clientes" },
  { id: "crm_favoritos", label: "Lista de favoritos", category: "Clientes" },

  // Barbeiros
  { id: "barber_cadastro", label: "Cadastro de barbeiros", category: "Barbeiros" },
  { id: "barber_agenda", label: "Agenda individual", category: "Barbeiros" },
  { id: "barber_comissao", label: "Comissão", category: "Barbeiros" },
  { id: "barber_horarios", label: "Horários próprios", category: "Barbeiros" },

  // Financeiro
  { id: "fin_receitas", label: "Controle de receitas", category: "Financeiro" },
  { id: "fin_despesas", label: "Controle de despesas", category: "Financeiro" },
  { id: "fin_relatorios", label: "Relatórios financeiros", category: "Financeiro" },
  { id: "fin_fluxo", label: "Fluxo de caixa", category: "Financeiro" },

  // Assinaturas
  { id: "plan_limite_barbers", label: "Limite de barbeiros", category: "Assinaturas" },
  { id: "plan_limite_clients", label: "Limite de clientes", category: "Assinaturas" },
  { id: "plan_limite_agendamentos", label: "Limite de agendamentos mensais", category: "Assinaturas" },
  { id: "plan_personalizacao", label: "Personalização da página", category: "Assinaturas" },

  // Marketing
  { id: "mkt_whatsapp", label: "WhatsApp integrado", category: "Marketing" },
  { id: "mkt_lembretes", label: "Lembretes automáticos", category: "Marketing" },
  { id: "mkt_confirmacao", label: "Confirmação de presença", category: "Marketing" },
  { id: "mkt_campanhas", label: "Campanhas promocionais", category: "Marketing" },

  // Sistema
  { id: "sys_multi", label: "Multiusuário", category: "Sistema" },
  { id: "sys_permissions", label: "Controle de permissões por role", category: "Sistema" },
  { id: "sys_dashboard", label: "Dashboard", category: "Sistema" },
  { id: "sys_relatorios", label: "Relatórios", category: "Sistema" },
  { id: "sys_backup", label: "Backup", category: "Sistema" },
  { id: "sys_export", label: "Exportação de dados", category: "Sistema" },
  { id: "sys_theme", label: "Tema claro/escuro", category: "Sistema" },
  { id: "sys_logs", label: "Logs", category: "Sistema" },
];

const OLD_FEATURES_MAP = {
  "online": "agenda_online",
  "reagendamento": "agenda_reagendamento",
  "cancelamento": "agenda_cancelamento",
  "bloqueio": "agenda_bloqueio",
  "funcionamento": "agenda_personalizada",
  "crm": "crm_cadastro",
  "cadastro de clientes": "crm_cadastro",
  "atendimentos": "crm_historico",
  "observações": "crm_observacoes",
  "favoritos": "crm_favoritos",
  "barbeiros": "barber_cadastro",
  "agenda individual": "barber_agenda",
  "comissão": "barber_comissao",
  "comissões": "barber_comissao",
  "horários próprios": "barber_horarios",
  "receitas": "fin_receitas",
  "despesas": "fin_despesas",
  "relatórios financeiros": "fin_relatorios",
  "fluxo de caixa": "fin_fluxo",
  "limite de barbeiros": "plan_limite_barbers",
  "limite de clientes": "plan_limite_clients",
  "agendamentos mensais": "plan_limite_agendamentos",
  "personalização": "plan_personalizacao",
  "whatsapp": "mkt_whatsapp",
  "lembretes": "mkt_lembretes",
  "presença": "mkt_confirmacao",
  "promocionais": "mkt_campanhas",
  "multiusuário": "sys_multi",
  "role": "sys_permissions",
  "permissões": "sys_permissions",
  "dashboard": "sys_dashboard",
  "backup": "sys_backup",
  "exportação": "sys_export",
  "tema": "sys_theme",
  "logs": "sys_logs"
};

export function migrateFeatureStringToId(featureStr) {
  if (!featureStr) return "sys_dashboard";
  const lower = featureStr.toLowerCase().trim();
  
  if (AVAILABLE_FEATURES.some(f => f.id === featureStr)) return featureStr;
  
  for (const [term, id] of Object.entries(OLD_FEATURES_MAP)) {
    if (lower.includes(term)) {
      return id;
    }
  }
  return "sys_dashboard";
}

export function getFeatureLabel(featureIdOrStr) {
  const feat = AVAILABLE_FEATURES.find(f => f.id === featureIdOrStr);
  return feat ? feat.label : featureIdOrStr;
}
