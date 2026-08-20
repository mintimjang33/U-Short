import { getSupabaseServerClient } from '../../../lib/supabase.js';
import { getCurrentUser } from '../../../lib/supabaseServerAuth.js';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = {
  queued: '대기중',
  processing: '제작중',
  completed: '완료',
  failed: '실패',
};

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

  return (data || []).map((project) => {
    const jobs = [...(project.jobs || [])].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return { ...project, latestJob: jobs[0] || null };
  });
}

export default async function DashboardPage() {
  let projects = [];
  let loadError = null;
  try {
    projects = await loadProjects();
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
      <p className="page-sub">블로그 링크만 넣으면 AI가 쇼츠 영상을 자동으로 만들어줘요.</p>

      {!loadError && projects.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>완료된 영상</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{completedCount}개</div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>누적 사용 크레딧</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{totalCredits}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              지금은 실제 과금/제한은 없고 기록용이에요 (짧게=1, 길게=2)
            </div>
          </div>
        </div>
      )}

      {loadError && (
        <div className="card" style={{ marginBottom: 20, color: '#b91c1c' }}>
          {loadError}
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            Supabase 연결이 아직 안 됐다면 .env.local과 supabase/schema.sql 적용 여부를 확인하세요.
          </div>
        </div>
      )}

      {!loadError && projects.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ marginBottom: 16, color: '#6b7280' }}>아직 프로젝트가 없어요.</p>
          <a className="primary-btn" href="/new">
            + 첫 프로젝트 만들기
          </a>
        </div>
      )}

      {!loadError && projects.length > 0 && (
        <div className="project-grid">
          {projects.map((project) => {
            const status = project.latestJob?.status || 'queued';
            return (
              <a key={project.id} className="project-card" href={`/projects/${project.id}`}>
                <div className="project-thumb">
                  {project.latestJob?.video_url ? (
                    <video src={project.latestJob.video_url} muted />
                  ) : (
                    <span>{STATUS_LABEL[status]}</span>
                  )}
                </div>
                <div className="project-meta">
                  <div className="title">
                    {project.title_line1 || project.source_url || '제목 없음'}
                  </div>
                  <span className={`badge ${status}`}>{STATUS_LABEL[status] || status}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
