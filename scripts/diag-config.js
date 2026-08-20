import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { getSupabaseServerClient } = await import('../lib/supabase.js');
const supabase = getSupabaseServerClient();

const { data, error } = await supabase.from('app_config').select('key, value');
if (error) throw new Error(error.message);

for (const row of data) {
  const v = row.value;
  const codes = [...v].slice(0, 3).map((c) => c.charCodeAt(0));
  const lastCodes = [...v].slice(-3).map((c) => c.charCodeAt(0));
  console.log(
    `${row.key}: len=${v.length} startsWith=${JSON.stringify(v.slice(0, 6))} firstCodes=${codes} lastCodes=${lastCodes} hasWhitespace=${/\s/.test(v)}`
  );
}
