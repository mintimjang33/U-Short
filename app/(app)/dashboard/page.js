import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';
import DashboardClient from './DashboardClient.jsx';

export const dynamic = 'force-dynamic';

async function loadProjects() {
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('projects')
    .select('*, jobs(*)')
    .order('created_at', { ascending: false })
    .limit(60);
  if (user) query = query.eq('user_id', user.id);
  const { data, error } = await query;

  if (error) throw new Error(`프로젝트 목록을 불러오지 못했습니다: ${error.message}`);

  const projects = (data || []).map((project) => {
    const jobs = [...(project.jobs || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return { ...project, latestJob: jobs[0] || null };
  });

  let folders = [];
  if (user) {
    const { data: folderData } = await supabase.from('folders').select('*').eq('user_id', user.id).order('created_at');
    folders = folderData || [];
  }

  return { projects, folders };
}

export default async function DashboardPage() {
  let projects = [];
  let folders = [];
  let loadError = null;
  try {
    ({ projects, folders } = await loadProjects());
  } catch (err) {
    loadError = err.message;
  }

  const totalCredits = projects.reduce(
    (sum, p) => sum + (p.jobs || []).reduce((s, j) => s + (j.credits_used || 0), 0),
    0
  );
  const completedCount = projects.filter((p) => p.latestJob?.status === 'completed').length;

  return (
    <div>
      <h1 className="page-title">내 프로젝트</h1>
      <p className="page-sub">URL만 넣으면 AI가 쇼츠 영상을 자동으로 만들어줘요.</p>

      {!loadError && projects.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#9c9cb5', fontWeight: 700 }}>완료된 영상</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{completedCount}개</div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#9c9cb5', fontWeight: 700 }}>누적 사용 크레딧</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{totalCredits}</div>
            <div style={{ fontSize: 11, color: '#9c9cb5', marginTop: 2 }}>
              지금은 실제 과금/제한은 없고 기록용이에요 (짧게=1, 길게=2)
            </div>
          </div>
        </div>
      )}

      {loadError && (
        <div className="card" style={{ marginBottom: 20, color: '#fda4af' }}>
          {loadError}
          <div style={{ fontSize: 12, color: '#9c9cb5', marginTop: 6 }}>
            Supabase 연결이 아직 안 됐다면 .env.local과 supabase/schema.sql 적용 여부를 확인하세요.
          </div>
        </div>
      )}

      {!loadError && <DashboardClient projects={projects} folders={folders} />}
    </div>
  );
}
