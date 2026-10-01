/**
 * TrimUp Barber Hub - Sandbox Database
 * Isolamento 100% em memória local (localStorage) para o modo Simulador do Site Owner.
 * Garante que nenhuma operação de teste afete o Supabase / PostgreSQL de produção.
 */

const SANDBOX_STORAGE_KEY = "trimup_sandbox_db";

const DEFAULT_SANDBOX_DATA = {
  shops: [
    {
      id: "sandbox-shop-1",
      owner_id: "sandbox-owner-1",
      name: "Barbearia Vintage Hub (Demo)",
      slug: "vintage-hub-demo",
      logo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200",
      banner: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1000",
      address: "Rua Augusta, 1500 - Consolação, São Paulo - SP",
      lat: -23.555,
      lng: -46.662,
      rating: 4.9,
      is_active: true,
      specialties: ["Degradê", "Barboterapia", "Navalhado"],
      working_hours: {
        monday: { open: "09:00", close: "20:00" },
        tuesday: { open: "09:00", close: "20:00" },
        wednesday: { open: "09:00", close: "20:00" },
        thursday: { open: "09:00", close: "20:00" },
        friday: { open: "09:00", close: "20:00" },
        saturday: { open: "09:00", close: "18:00" },
        sunday: null
      },
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  ],

  barbers: [
    {
      id: "sandbox-barber-1",
      profile_id: "sandbox-barber-prof-1",
      shop_id: "sandbox-shop-1",
      name: "Carlos Barbeiro Sênior (Demo)",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      bio: "Especialista em tesoura e degradê clássico há 8 anos.",
      specialties: ["Degradê", "Barba Terapia", "Navalhado"],
      rating: 4.9,
      is_active: true,
      whatsapp: "(11) 97777-6666",
      career: "Formado pela Barber Academy SP, ex-chefe na Barbearia Paulista.",
      working_hours: { "1": "09:00-19:00", "2": "09:00-19:00", "3": "09:00-19:00", "4": "09:00-19:00", "5": "09:00-19:00" },
      created_at: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: "sandbox-barber-2",
      profile_id: "sandbox-barber-prof-2",
      shop_id: "sandbox-shop-1",
      name: "Matheus Silva (Demo)",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      bio: "Focado em cortes modernos, freestyle e pigmentação.",
      specialties: ["Freestyle", "Pigmentação", "Corte Infantil"],
      rating: 4.8,
      is_active: true,
      whatsapp: "(11) 96666-5555",
      career: "Especialista em visagismo e design de barba.",
      working_hours: { "1": "10:00-20:00", "2": "10:00-20:00", "3": "10:00-20:00", "4": "10:00-20:00", "5": "10:00-20:00" },
      created_at: new Date(Date.now() - 20 * 86400000).toISOString()
    }
  ],

  services: [
    {
      id: "sandbox-svc-1",
      shop_id: "sandbox-shop-1",
      barber_id: "sandbox-barber-1",
      name: "Corte Degradê Navalhado",
      price: 50.00,
      duration_minutes: 35,
      category: "Cabelo",
      is_active: true
    },
    {
      id: "sandbox-svc-2",
      shop_id: "sandbox-shop-1",
      barber_id: "sandbox-barber-1",
      name: "Barba Terapia com Toalha Quente",
      price: 45.00,
      duration_minutes: 30,
      category: "Barba",
      is_active: true
    },
    {
      id: "sandbox-svc-3",
      shop_id: "sandbox-shop-1",
      barber_id: null,
      name: "Combo Corte + Barba Completo",
      price: 85.00,
      duration_minutes: 60,
      category: "Combo",
      is_active: true
    }
  ],

  products: [
    {
      id: "sandbox-prod-1",
      shop_id: "sandbox-shop-1",
      name: "Pomada Modeladora Efeito Matte (Demo)",
      price: 45.00,
      stock: 12,
      category: "Finalizadores",
      is_active: true
    },
    {
      id: "sandbox-prod-2",
      shop_id: "sandbox-shop-1",
      name: "Óleo Hidratante para Barba 30ml (Demo)",
      price: 38.00,
      stock: 6,
      category: "Barba",
      is_active: true
    }
  ],

  client_records: [
    {
      id: "sandbox-client-1",
      shop_id: "sandbox-shop-1",
      profile_id: null, // CADASTRO FRÁGIL (Sem conta app)
      name: "Sr. João Silva",
      phone: "(11) 3321-3321",
      whatsapp: "(11) 93321-3321",
      email: "",
      address: "Alameda Gloriosa, 70",
      city: "São Paulo",
      neighborhood: "Consolação",
      notes: "Cliente idoso de balcão. Prefere café sem açúcar e corte 100% tesoura.",
      is_vip: false,
      total_visits: 5,
      total_spent: 250.00,
      avg_ticket: 50.00,
      last_visit: new Date(Date.now() - 7 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: "sandbox-client-2",
      shop_id: "sandbox-shop-1",
      profile_id: "sandbox-profile-lucas", // CONTA APP VERIFICADA
      name: "Lucas Medeiros",
      phone: "(11) 98888-7777",
      whatsapp: "(11) 98888-7777",
      email: "lucas.medeiros@exemplo.com",
      address: "Rua Bela Cintra, 450",
      city: "São Paulo",
      neighborhood: "Cerqueira César",
      notes: "Cliente frequente via app. Costuma agendar às sextas.",
      is_vip: true,
      total_visits: 12,
      total_spent: 600.00,
      avg_ticket: 50.00,
      last_visit: new Date(Date.now() - 3 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 120 * 86400000).toISOString()
    }
  ],

  appointments: [
    {
      id: "sandbox-appt-1",
      shop_id: "sandbox-shop-1",
      barber_id: "sandbox-barber-1",
      barber_name: "Carlos Barbeiro Sênior (Demo)",
      client_name: "Sr. João Silva",
      client_email: "",
      client_id: null,
      service_id: "sandbox-svc-1",
      service_name: "Corte Degradê Navalhado",
      price: 50.00,
      date: new Date().toISOString().slice(0, 10),
      time: "14:00",
      status: "agendado",
      notes: "Agendamento de balcão (Cadastro Frágil)",
      created_at: new Date().toISOString()
    },
    {
      id: "sandbox-appt-2",
      shop_id: "sandbox-shop-1",
      barber_id: "sandbox-barber-1",
      barber_name: "Carlos Barbeiro Sênior (Demo)",
      client_name: "Lucas Medeiros",
      client_email: "lucas.medeiros@exemplo.com",
      client_id: "sandbox-profile-lucas",
      service_id: "sandbox-svc-3",
      service_name: "Combo Corte + Barba Completo",
      price: 85.00,
      date: new Date().toISOString().slice(0, 10),
      time: "16:00",
      status: "confirmado",
      notes: "Confirmado via app",
      created_at: new Date().toISOString()
    }
  ],

  plans: [
    {
      id: "sandbox-plan-1",
      name: "FREE",
      description: "Plano inicial gratuito",
      monthly_price: 0,
      annual_price: 0,
      max_barbers: 1,
      max_clients: 50,
      features: ["agenda_online", "crm_cadastro"]
    },
    {
      id: "sandbox-plan-2",
      name: "PRO",
      description: "Plano ideal para barbearias em expansão",
      monthly_price: 79.90,
      annual_price: 799.00,
      max_barbers: 5,
      max_clients: 9999,
      features: ["agenda_online", "crm_cadastro", "mkt_whatsapp", "fin_relatorios"]
    },
    {
      id: "sandbox-plan-3",
      name: "PREMIUM",
      description: "Multi-unidades e recursos completos",
      monthly_price: 149.90,
      annual_price: 1499.00,
      max_barbers: 15,
      max_clients: 9999,
      features: ["agenda_online", "crm_cadastro", "mkt_whatsapp", "fin_relatorios", "sys_multi", "mkt_campanhas"]
    }
  ],

  subscriptions: [
    {
      id: "sandbox-sub-1",
      shop_id: "sandbox-shop-1",
      plan_id: "sandbox-plan-2",
      status: "active",
      monthly_value: 79.90,
      start_date: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      auto_renew: true
    }
  ],

  profiles: [
    {
      id: "sandbox-profile-lucas",
      full_name: "Lucas Medeiros",
      email: "lucas.medeiros@exemplo.com",
      phone: "(11) 98888-7777",
      avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
    },
    {
      id: "sandbox-profile-neto",
      full_name: "Lucas Neto (Parente do Sr. João)",
      email: "lucas.neto@exemplo.com",
      phone: "(11) 93321-3321", // Mesmo telefone do Sr. João para teste de fusão/conflito
      avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200"
    }
  ],

  notifications: []
};

function getStorage() {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(DEFAULT_SANDBOX_DATA));
      return { ...DEFAULT_SANDBOX_DATA };
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao ler sandbox storage:", err);
    return { ...DEFAULT_SANDBOX_DATA };
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Erro ao salvar sandbox storage:", err);
  }
}

export function resetSandboxDb() {
  localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(DEFAULT_SANDBOX_DATA));
  return { ...DEFAULT_SANDBOX_DATA };
}

export function getSandboxData() {
  return getStorage();
}

/**
 * Retorna um handler compatível com db.entities para uma tabela no ambiente Sandbox
 */
export function createSandboxEntityHandler(tableName) {
  return {
    filter: async (filters = {}, order = null, limit = null) => {
      const data = getStorage();
      let items = (data[tableName] || []).slice();

      // Aplicar filtros simples
      for (const [key, val] of Object.entries(filters)) {
        if (val === undefined || val === null) continue;
        if (Array.isArray(val)) {
          items = items.filter(item => val.includes(item[key]));
        } else {
          items = items.filter(item => String(item[key]) === String(val));
        }
      }

      // Ordenação
      if (order) {
        const isDesc = order.startsWith("-");
        const col = isDesc ? order.substring(1) : order;
        items.sort((a, b) => {
          const valA = a[col] ?? "";
          const valB = b[col] ?? "";
          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
          return 0;
        });
      }

      if (limit && limit > 0) {
        items = items.slice(0, limit);
      }

      return items;
    },

    list: async (order = null, limit = null) => {
      const data = getStorage();
      let items = (data[tableName] || []).slice();

      if (order) {
        const isDesc = order.startsWith("-");
        const col = isDesc ? order.substring(1) : order;
        items.sort((a, b) => {
          const valA = a[col] ?? "";
          const valB = b[col] ?? "";
          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
          return 0;
        });
      }

      if (limit && limit > 0) {
        items = items.slice(0, limit);
      }

      return items;
    },

    get: async (id) => {
      if (!id) return null;
      const data = getStorage();
      const items = data[tableName] || [];
      return items.find(item => item.id === id) || null;
    },

    create: async (itemData = {}) => {
      const data = getStorage();
      if (!data[tableName]) data[tableName] = [];

      const newItem = {
        ...itemData,
        id: itemData.id || `sandbox-${tableName}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        created_at: new Date().toISOString()
      };

      data[tableName].push(newItem);
      saveStorage(data);
      return newItem;
    },

    update: async (id, updateData = {}) => {
      const data = getStorage();
      const items = data[tableName] || [];
      const idx = items.findIndex(item => item.id === id);

      if (idx === -1) {
        throw new Error(`Item ${id} não encontrado na tabela sandbox ${tableName}`);
      }

      const updated = {
        ...items[idx],
        ...updateData,
        id // Preserva ID
      };

      items[idx] = updated;
      data[tableName] = items;
      saveStorage(data);
      return updated;
    },

    delete: async (id) => {
      const data = getStorage();
      if (!data[tableName]) return true;

      data[tableName] = data[tableName].filter(item => item.id !== id);
      saveStorage(data);
      return true;
    }
  };
}
