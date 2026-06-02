import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgmzvlmyrppvfmkhzaak.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbXp2bG15cnBwdmZta2h6YWFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQwNjU0MCwiZXhwIjoyMDk1OTgyNTQwfQ.WPtKRUmirvFVEQH_UXc9__lCzEFVRjL_eHxsSgYaLQk';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debug() {
  console.log('--- Shops ---');
  const { data: shops } = await supabase.from('shops').select('*');
  console.log(JSON.stringify(shops, null, 2));

  console.log('--- Barbers ---');
  const { data: barbers } = await supabase.from('barbers').select('*');
  console.log(JSON.stringify(barbers, null, 2));

  console.log('--- Link Requests ---');
  const { data: reqs } = await supabase.from('barber_link_requests').select('*');
  console.log(JSON.stringify(reqs, null, 2));
}

debug();
