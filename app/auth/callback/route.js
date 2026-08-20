import { NextResponse } from 'next/server';
import { getSupabaseServerAuthClient } from '../../../lib/supabaseServerAuth.js';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await getSupabaseServerAuthClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
