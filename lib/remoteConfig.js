import { getSupabaseServerClient } from './supabase.js';

let loaded = false;

/**
 * app_config 테이블의 key/value를 process.env에 채워넣는다.
 * 이미 .env.local(또는 다른 방식)로 설정된 값은 덮어쓰지 않는다 — 로컬에서 임시로
 * 다른 키를 테스트하고 싶을 때 .env.local이 항상 우선하도록.
 * 파이프라인/서버가 시작할 때 한 번만 실행하면 되므로 프로세스당 한 번만 조회한다.
 */
export async function loadRemoteConfig() {
  if (loaded) return;
  loaded = true;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('app_config').select('key, value');
  if (error) {
    console.error('[remoteConfig] app_config 조회 실패, .env.local 값만 사용:', error.message);
    return;
  }

  for (const { key, value } of data || []) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
