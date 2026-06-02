import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgmzvlmyrppvfmkhzaak.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnbXp2bG15cnBwdmZta2h6YWFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQwNjU0MCwiZXhwIjoyMDk1OTgyNTQwfQ.WPtKRUmirvFVEQH_UXc9__lCzEFVRjL_eHxsSgYaLQk';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRLS() {
  const { data: rlsStatus, error } = await supabase.rpc('inspect_rls_status');
  // Since we don't have rpc, let's query via REST using supabase.rpc or direct REST if possible.
  // Wait, we can run a SQL fragment inside a postgres query if we have an RPC like 'exec_sql'. But we don't.
  // Wait! Let's check if we can insert a barber_link_request using the authenticated user context or if we can see any error.
  // Let's try to simulate a link request insert using the service role key and then using the user's token.
  // We can get the user's session or profile. Yan's email is ygoncalvesmota@gmail.com and profile id is 9640cc1b-5122-4cbc-8b06-4a6b9a9c7ba5.
  
  console.log('--- Simulating Barber Link Request Insert with Service Role ---');
  const { data, error: insertError } = await supabase.from('barber_link_requests').insert({
    shop_id: '8c8886e7-3b35-446e-ab4c-d8d0059ed2e9',
    profile_id: '9640cc1b-5122-4cbc-8b06-4a6b9a9c7ba5',
    barber_id: '405677c0-6bae-4a19-837a-82072621f581',
    status: 'pending'
  }).select();
  
  console.log('Insert success:', data);
  if (insertError) {
    console.error('Insert error:', insertError);
  } else {
    // Delete it so we don't pollute
    await supabase.from('barber_link_requests').delete().eq('id', data[0].id);
  }
}

checkRLS();
