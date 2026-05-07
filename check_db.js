import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhsiitymizkueqhrpfs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHNpaXR5bWl6a3VlcWhycGZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA0OTk5NywiZXhwIjoyMDkzNjI1OTk3fQ.cttYoTuVB4jjd5MaCzVaQSjrFTPr3-KXziBnvYhAWnQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const json = await res.json();
  console.log('Cash Transactions Columns:');
  console.log(Object.keys(json.definitions.cash_transactions.properties));
}

main();
