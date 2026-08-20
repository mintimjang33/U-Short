'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseBrowser.js';

export default function SignOutButton() {
  const router = useRouter();

  async function onSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={onSignOut}
      style={{
        fontSize: 12,
        color: '#6b7280',
        background: 'none',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '6px 10px',
        cursor: 'pointer',
      }}
    >
      로그아웃
    </button>
  );
}
