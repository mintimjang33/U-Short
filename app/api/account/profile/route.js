import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/supabaseServerAuth.js';
import { getSupabaseServerClient } from '../../../../lib/supabase.js';

// /account "프로필" 탭 — 이름 수정, 계정 삭제(탈퇴).
export async function PATCH(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { name } = await request.json().catch(() => ({}));
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name이 필요합니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, full_name: name.trim(), name: name.trim() },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  // projects는 auth.users를 FK로 두지 않으므로(우리 스키마), 프로젝트/job은 그대로 남는다 —
  // 실사이트처럼 완전 삭제까지 하려면 나중에 필요할 때 확장.
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
