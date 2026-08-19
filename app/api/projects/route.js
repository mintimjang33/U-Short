import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { withApiErrorHandling } from '../../../lib/apiHandler.js';

export const GET = withApiErrorHandling(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*, jobs(*)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
});
