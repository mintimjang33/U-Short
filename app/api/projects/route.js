import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('projects')
    .select('*, jobs(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});
