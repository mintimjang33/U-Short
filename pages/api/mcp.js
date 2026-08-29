// 원격 MCP 엔드포인트 (Vercel 서버리스 함수). 이 PC의 로컬 stdio MCP(mcp-server/index.js)와
// 최대한 같은 도구를 제공해서, 어디서든(claude.ai 등) 접속해 같은 Supabase 데이터를 다룰 수 있게 한다.
// MCP_SHARED_SECRET 환경변수로 접근을 제한한다(공개 인터넷에 떠 있으므로).
//
// 렌더링은 여기서 하지 않는다 — create_shorts/retry_job은 job을 queued로 만들기만 하고,
// 실제 렌더링은 이 PC에서 상시 실행 중인 scripts/worker.js가 폴링해서 처리한다.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import * as OPTIONS from '../../lib/options.js';
import { searchNaverNews } from '../../lib/naverNews.js';

const GITHUB_REPO = 'mintimjang33/U-Short';
const TABLES = ['projects', 'jobs', 'templates'];
const ACCESS_TOKEN = process.env.MCP_SHARED_SECRET;

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function ghHeaders() {
  const h = { 'User-Agent': 'supershorts-mcp-remote' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}
async function ghFetchFile(path, ref) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  return res.json();
}

function textResult(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}
function errorResult(err) {
  return { content: [{ type: 'text', text: `에러: ${err.message || err}` }], isError: true };
}

// 소유자 계정(OWNER_EMAIL)의 automation_defaults를 조회해 create_shorts에서 생략된 필드에 채워넣는다.
async function getOwnerDefaults(supabase) {
  try {
    if (!process.env.OWNER_EMAIL) return null;
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 200 });
    const owner = userList?.users?.find((u) => u.email === process.env.OWNER_EMAIL);
    if (!owner) return null;
    const { data } = await supabase.from('automation_defaults').select('*').eq('user_id', owner.id).maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

function buildServer() {
  const server = new McpServer({ name: 'supershorts-mcp-remote', version: '0.1.0' });
  const supabase = getSupabase();

  server.registerTool(
    'create_shorts',
    {
      title: '쇼츠 제작 요청 (큐에 등록)',
      description:
        '블로그 URL 또는 직접 대본으로 쇼츠 제작을 요청한다. 이 도구는 job을 큐에 넣기만 하고 바로 반환한다 — ' +
        '실제 렌더링은 이 회원님 PC에서 상시 실행 중인 워커가 처리하므로, PC가 켜져 있고 워커(npm run worker)가 ' +
        '돌고 있어야 실제로 완성된다. get_job_status(jobId)로 진행 상황을 확인할 것.',
      inputSchema: {
        sourceUrl: z.string().optional(),
        sourceText: z.string().optional(),
        planningMode: z.enum(['auto', 'direct']).optional(),
        style: z.enum(['summary', 'hook', 'list']).optional(),
        outputLanguage: z.enum(['original', 'ko', 'en', 'ja']).optional(),
        lengthMode: z.enum(['shortform', 'longform', 'extended']).optional(),
        targetChars: z.number().int().min(30).optional().describe('대본 목표 글자수 자유 입력(30자 이상). 지정하면 lengthMode 대신 이 값 기준으로 분량을 맞춘다'),
        layoutId: z.enum(['info', 'card', 'full-focused', 'image-dark', 'viral-mint']).optional(),
        captionPresetId: z.string().optional(),
        scriptProvider: z.enum(['claude', 'gemini', 'gpt']).optional(),
        voiceProvider: z.enum(['fal', 'elevenlabs', 'clova']).optional(),
        voice: z
          .enum(['seoa', 'hajun', 'taeo', 'ina', 'doyun', 'jihoon', 'yuna', 'minjae', 'luna', 'harin', 'seojun', 'daon', 'mio', 'haru', 'ren', 'oliver', 'noah', 'emma', 'liam', 'ava', 'chloe', 'adam', 'jay'])
          .optional()
          .describe('음성 페르소나(voiceProvider가 fal일 때만 적용). list_options의 voicePresets로 확인 가능'),
        voiceSpeed: z.number().min(0.7).max(1.2).optional().describe('재생 속도, 0.7(느림)~1.2(빠름), 기본 1.0'),
        backgroundColor: z.string().optional(),
        backgroundImageUrl: z.string().optional(),
        backgroundVideoUrl: z.string().optional().describe('viral-mint 레이아웃 전용, 인물 영상 URL'),
        extraInfoText: z.string().optional(),
        introEnabled: z.boolean().optional().describe('기본 false. true면 본문 전에 1.8초 제목 전용 인트로보드를 붙임'),
        introTemplateId: z.string().optional().describe('list_options로 전체 10종 확인 가능'),
      },
    },
    async (args) => {
      try {
        if (!args.sourceUrl && !args.sourceText) throw new Error('sourceUrl 또는 sourceText 중 하나는 필요합니다.');

        const defaults = (await getOwnerDefaults(supabase)) || {};

        const options = {
          planningMode: args.planningMode || (args.sourceText && !args.sourceUrl ? 'direct' : 'auto'),
          style: args.style || defaults.style || 'summary',
          outputLanguage: args.outputLanguage || defaults.output_language || 'original',
          lengthMode: args.lengthMode || defaults.length_mode || 'shortform',
          targetChars: args.targetChars || null,
          scriptProvider: args.scriptProvider || defaults.script_provider || 'claude',
          voiceProvider: args.voiceProvider || defaults.voice_provider || 'fal',
          voice: args.voice || defaults.voice_id || null,
          voiceSpeed: args.voiceSpeed || null,
          introEnabled: args.introEnabled ?? defaults.intro_enabled ?? false,
          introTemplateId: args.introTemplateId || defaults.intro_template_id || null,
          introDisplayOnly: true,
        };

        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            source_url: args.sourceUrl || null,
            source_text: args.sourceText || null,
            layout_id: args.layoutId || defaults.layout_id || 'info',
            content_template_id: args.captionPresetId || defaults.caption_preset_id || 'existing-preset-bold-white-outline',
            background: {
              color: args.backgroundColor || '#0a0a0a',
              imageUrl: args.backgroundImageUrl || null,
              videoUrl: args.backgroundVideoUrl || null,
            },
            extra_info: args.extraInfoText ? [{ text: args.extraInfoText, x: 24, y: 24 }] : [],
            options,
          })
          .select()
          .single();
        if (projectError) throw new Error(`프로젝트 생성 실패: ${projectError.message}`);

        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert({ project_id: project.id, status: 'queued' })
          .select()
          .single();
        if (jobError) throw new Error(`job 생성 실패: ${jobError.message}`);

        return textResult({
          projectId: project.id,
          jobId: job.id,
          status: 'queued',
          note: 'PC의 워커(npm run worker)가 켜져 있어야 처리됩니다. get_job_status(jobId)로 진행상황 확인.',
        });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'retry_job',
    {
      title: '실패한 job 재시도 (큐에 등록)',
      description: '실패한(또는 완료된) job을 같은 설정으로 다시 큐에 넣는다. 실제 처리는 PC 워커가 담당.',
      inputSchema: { jobId: z.string() },
    },
    async ({ jobId }) => {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('jobs')
          .select('project_id')
          .eq('id', jobId)
          .maybeSingle();
        if (fetchError) throw new Error(fetchError.message);
        if (!existing) throw new Error(`job을 찾을 수 없습니다: ${jobId}`);

        const { data: newJob, error: insertError } = await supabase
          .from('jobs')
          .insert({ project_id: existing.project_id, status: 'queued' })
          .select()
          .single();
        if (insertError) throw new Error(insertError.message);

        return textResult({ newJobId: newJob.id, status: 'queued' });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'get_job_status',
    {
      title: 'job 상태 조회',
      description: '특정 job의 진행 상태(stage/status/에러/완성된 영상 URL)를 조회한다.',
      inputSchema: { jobId: z.string() },
    },
    async ({ jobId }) => {
      try {
        const { data, error } = await supabase.from('jobs').select('*, projects(*)').eq('id', jobId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error(`job을 찾을 수 없습니다: ${jobId}`);
        return textResult({
          jobId: data.id,
          status: data.status,
          stage: data.stage,
          errorMessage: data.error_message,
          videoUrl: data.video_url,
          title: [data.projects?.title_line1, data.projects?.title_line2].filter(Boolean).join(' / '),
        });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'list_options',
    { title: '유효 옵션 목록', description: '레이아웃/자막프리셋/provider 등 create_shorts에 쓸 수 있는 값 목록.' },
    async () =>
      textResult({
        layouts: OPTIONS.LAYOUTS,
        captionPresets: OPTIONS.CAPTION_PRESET_LIST,
        introTemplates: OPTIONS.INTRO_TEMPLATE_LIST,
        scriptProviders: OPTIONS.SCRIPT_PROVIDERS,
        voiceProviders: OPTIONS.VOICE_PROVIDERS,
        voicePresets: OPTIONS.VOICE_PRESET_LIST,
        scriptStyles: OPTIONS.SCRIPT_STYLES,
        outputLanguages: OPTIONS.OUTPUT_LANGUAGES,
        lengthModes: OPTIONS.LENGTH_MODES,
      })
  );

  server.registerTool(
    'search_naver_news',
    {
      title: '네이버 뉴스 검색',
      description:
        '네이버 뉴스 검색 오픈API로 기사 제목·링크·발행일·요약을 가져온다. 쇼츠로 만들 만한 최신 이슈나 ' +
        '뉴스 소재를 찾을 때 쓴다 (sort:"date"로 최신순 조회하면 지금 뜨는 이슈 파악에 유용). 결과의 link를 ' +
        'create_shorts의 sourceUrl로 바로 넘기면 그 기사를 쇼츠로 만들 수 있다.',
      inputSchema: {
        query: z.string().describe('검색어. 예: "여름 휴가철 사고"'),
        display: z.number().int().min(1).max(100).optional().describe('가져올 기사 개수 (기본 10, 최대 100)'),
        sort: z.enum(['sim', 'date']).optional().describe('정렬 방식: sim=정확도순(기본), date=최신순(트렌드 파악용)'),
      },
    },
    async ({ query, display, sort }) => {
      try {
        const result = await searchNaverNews({ query, display, sort });
        if (!result.items.length) return textResult(`"${query}" 검색 결과 없음`);
        return textResult(result);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'list_tables',
    { title: 'DB 테이블 목록', description: '슈퍼쇼츠 Supabase DB의 테이블 목록.' },
    async () => textResult(TABLES)
  );

  server.registerTool(
    'get_rows',
    {
      title: '테이블 행 조회',
      description: 'projects/jobs/templates 테이블에서 행을 조회한다.',
      inputSchema: {
        table: z.enum(TABLES),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ table, limit }) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit || 50);
        if (error) throw new Error(error.message);
        return textResult(data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'list_projects_summary',
    {
      title: '전체 프로젝트 요약',
      description: '모든 프로젝트를 최신순으로, 최근 job 상태와 함께 요약해서 보여준다.',
      inputSchema: { limit: z.number().int().min(1).max(100).optional() },
    },
    async ({ limit }) => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title_line1, source_url, layout_id, created_at, jobs(id, status, stage, error_message, video_url, created_at)')
          .order('created_at', { ascending: false })
          .limit(limit || 30);
        if (error) throw new Error(error.message);
        const summary = (data || []).map((p) => {
          const jobs = [...(p.jobs || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const latest = jobs[0];
          return {
            projectId: p.id,
            title: p.title_line1 || p.source_url || '(제목 없음)',
            status: latest?.status || 'no-job',
            videoUrl: latest?.video_url,
            createdAt: p.created_at,
          };
        });
        return textResult(summary);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'list_github_files',
    {
      title: 'GitHub 저장소 파일 목록',
      description: `${GITHUB_REPO} 저장소의 특정 경로에 어떤 파일·폴더가 있는지 조회한다.`,
      inputSchema: { path: z.string().optional(), ref: z.string().optional() },
    },
    async ({ path: p, ref }) => {
      try {
        const data = await ghFetchFile(p ?? '', ref);
        const list = Array.isArray(data) ? data : [data];
        const text = list.map((f) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}${f.type === 'file' ? ` (${f.size} bytes)` : ''}`).join('\n');
        return textResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'get_github_file',
    {
      title: 'GitHub 파일 내용 조회',
      description: `${GITHUB_REPO} 저장소의 특정 파일 내용을 텍스트로 가져온다.`,
      inputSchema: { path: z.string(), ref: z.string().optional() },
    },
    async ({ path: p, ref }) => {
      try {
        const data = await ghFetchFile(p, ref);
        if (data.type !== 'file') throw new Error('파일이 아닙니다.');
        return textResult(Buffer.from(data.content, 'base64').toString('utf8'));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'get_plan',
    { title: 'PLAN.md 조회', description: '슈퍼쇼츠 기획서(PLAN.md, 저장소 루트) 전체 내용을 GitHub에서 가져온다.' },
    async () => {
      try {
        const data = await ghFetchFile('PLAN.md');
        return textResult(Buffer.from(data.content, 'base64').toString('utf8'));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  return server;
}

// claude.ai 커스텀 커넥터는 헤더 인증 입력칸이 없고, 완전 무인증이면 OAuth DCR을 강제 시도하다
// 연결이 실패하는 문제가 있어서(슈퍼파인더에서 확인된 것과 동일) URL 쿼리파라미터로 인증한다:
// https://<배포도메인>/api/mcp?key=<MCP_SHARED_SECRET>
export default async function handler(req, res) {
  if (!ACCESS_TOKEN) {
    res.statusCode = 500;
    res.end('MCP_SHARED_SECRET not configured');
    return;
  }
  const url = new URL(req.url, `https://${req.headers.host}`);
  const key = url.searchParams.get('key');
  if (key !== ACCESS_TOKEN) {
    res.statusCode = 401;
    res.end('Unauthorized (key 쿼리파라미터 확인)');
    return;
  }

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
