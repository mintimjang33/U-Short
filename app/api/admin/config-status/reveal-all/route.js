import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/supabaseServerAuth.js';

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OWNER_EMAIL',
  'MCP_SHARED_SECRET',
];

// 새 PC의 .env.local에 한 번에 붙여넣을 수 있도록 KEY=value 형식 전체를 반환한다.
// 눈 버튼 하나씩 여는 것과 달리 명시적으로 "전체 복사"를 눌렀을 때만 호출됨.
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.email !== process.env.OWNER_EMAIL) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  const text = ENV_KEYS.filter((k) => process.env[k]).map((k) => `${k}=${process.env[k]}`).join('\n');
  return NextResponse.json({ text });
}
