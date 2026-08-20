import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';
import { getSupabaseServerClient } from '../../../lib/supabase.js';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.email !== process.env.OWNER_EMAIL) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = data.users
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
      provider: u.app_metadata?.provider || 'email',
      displayName: u.user_metadata?.full_name || u.user_metadata?.name || null,
    }));

  return NextResponse.json({ users });
}
