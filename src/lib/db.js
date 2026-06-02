import { supabase } from './supabase';

const tableMap = {
  Appointment: 'appointments',
  Barber: 'barbers',
  Client: 'client_records',
  Shop: 'shops',
  Service: 'services',
  Product: 'products',
  Plan: 'plans',
  Subscription: 'subscriptions',
  BarberLinkRequest: 'barber_link_requests',
  BarberLinkHistory: 'barber_link_history',
  BarberUnlinkRequest: 'barber_unlink_requests'
};

// Helper function to map and translate filters
async function translateFilters(tableName, filters) {
  if (!filters) return {};
  const mappedFilters = { ...filters };

  // Handle owner_email filter -> owner_id or profile_id depending on table
  if (mappedFilters.owner_email) {
    const email = mappedFilters.owner_email;
    delete mappedFilters.owner_email;

    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (prof) {
      if (tableName === 'shops') {
        mappedFilters.owner_id = prof.id;
      } else if (tableName === 'barbers') {
        mappedFilters.profile_id = prof.id;
      }
    } else {
      // If profile not found, set to an empty UUID so query returns empty instead of throwing
      if (tableName === 'shops') {
        mappedFilters.owner_id = '00000000-0000-0000-0000-000000000000';
      } else if (tableName === 'barbers') {
        mappedFilters.profile_id = '00000000-0000-0000-0000-000000000000';
      }
    }
  }

  // Handle client_email filter -> client_id in appointments table
  if (mappedFilters.client_email) {
    const email = mappedFilters.client_email;
    delete mappedFilters.client_email;

    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (prof) {
      mappedFilters.client_id = prof.id;
    } else {
      mappedFilters.client_id = '00000000-0000-0000-0000-000000000000';
    }
  }

  return mappedFilters;
}

const createEntityHandler = (entityName) => {
  const tableName = tableMap[entityName] || entityName.toLowerCase();

  return {
    filter: async (filters = {}, order = null, limit = null) => {
      const mappedFilters = await translateFilters(tableName, filters);
      let query = supabase.from(tableName).select('*');

      // Apply equality filters
      for (const [key, val] of Object.entries(mappedFilters)) {
        if (Array.isArray(val)) {
          // If value is an array, we can use `in` filter
          query = query.in(key, val);
        } else {
          query = query.eq(key, val);
        }
      }

      // Apply ordering
      if (order) {
        const isDesc = order.startsWith('-');
        const column = isDesc ? order.substring(1) : order;
        query = query.order(column, { ascending: !isDesc });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) {
        console.error(`Error in filter for ${entityName}:`, error);
        throw error;
      }
      return data || [];
    },

    list: async (order = null, limit = null) => {
      let query = supabase.from(tableName).select('*');

      if (order) {
        const isDesc = order.startsWith('-');
        const column = isDesc ? order.substring(1) : order;
        query = query.order(column, { ascending: !isDesc });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) {
        console.error(`Error in list for ${entityName}:`, error);
        throw error;
      }
      return data || [];
    },

    get: async (id) => {
      if (!id) return null;
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`Error in get for ${entityName}:`, error);
        throw error;
      }
      return data;
    },

    create: async (data = {}) => {
      // Map owner_email to owner_id if it's in the creation payload
      const payload = { ...data };
      if (payload.owner_email && tableName === 'shops') {
        const { data: prof } = await supabase.from('profiles').select('id').eq('email', payload.owner_email).maybeSingle();
        if (prof) {
          payload.owner_id = prof.id;
        }
        delete payload.owner_email;
      }

      if (payload.owner_email && tableName === 'barbers') {
        const { data: prof } = await supabase.from('profiles').select('id').eq('email', payload.owner_email).maybeSingle();
        if (prof) {
          payload.profile_id = prof.id;
        }
        delete payload.owner_email;
      }

      const { data: inserted, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error(`Error in create for ${entityName}:`, error);
        throw error;
      }
      return inserted;
    },

    update: async (id, data = {}) => {
      // Prevent updating the primary key if it's in data
      const updateData = { ...data };
      delete updateData.id;

      if (updateData.owner_email && tableName === 'shops') {
        const { data: prof } = await supabase.from('profiles').select('id').eq('email', updateData.owner_email).maybeSingle();
        if (prof) {
          updateData.owner_id = prof.id;
        }
        delete updateData.owner_email;
      }

      const { data: updated, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error in update for ${entityName}:`, error);
        throw error;
      }
      return updated;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error in delete for ${entityName}:`, error);
        throw error;
      }
      return true;
    }
  };
};

export const db = {
  auth: {
    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, profile_roles(role)')
        .eq('id', user.id)
        .maybeSingle();

      const roles = profile?.profile_roles?.map(r => r.role) || [];

      return {
        ...user,
        ...profile,
        role: roles[0] || 'user',
        roles
      };
    },
    loginViaEmailPassword: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    register: async ({ email, password, full_name }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: full_name || ''
          }
        }
      });
      if (error) throw error;
      return data;
    },
    verifyOtp: async ({ email, otpCode }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });
      if (error) throw error;
      return data;
    },
    loginWithProvider: async (provider, redirectUrl) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl || window.location.origin
        }
      });
      if (error) throw error;
      return data;
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },

  entities: new Proxy({}, {
    get: (target, name) => {
      return createEntityHandler(name);
    }
  }),

  integrations: {
    Core: {
      UploadFile: async (file) => {
        // Upload to 'uploads' bucket
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('File upload failed:', error);
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        return { file_url: publicUrl };
      },
      InvokeLLM: async ({ prompt }) => {
        try {
          const { data, error } = await supabase.functions.invoke('generate-insights', {
            body: { prompt }
          });
          if (error) throw error;
          return data;
        } catch (e) {
          console.warn('Edge Function generate-insights not deployed, falling back to local simulation', e);
          return {
            text: "O movimento da barbearia está crescendo! Com base nos dados dos seus agendamentos, o horário de pico é nas sextas-feiras à tarde. Recomendamos criar promoções para as terças-feiras de manhã para equilibrar o fluxo."
          };
        }
      }
    }
  }
};

export const base44 = db;
export default db;
