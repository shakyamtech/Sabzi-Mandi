import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhsiitymizkueqhrpfs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHNpaXR5bWl6a3VlcWhycGZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA0OTk5NywiZXhwIjoyMDkzNjI1OTk3fQ.cttYoTuVB4jjd5MaCzVaQSjrFTPr3-KXziBnvYhAWnQ';

async function main() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const json = await res.json();
  const table = json.definitions.product_ingredients;
  console.log('product_ingredients definitions:');
  console.log(JSON.stringify(table, null, 2));
  
  console.log('Checking checkout_sale RPC parameters...');
  console.log(JSON.stringify(json.paths['/rpc/checkout_sale'], null, 2));
}
main();
