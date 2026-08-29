#!/usr/bin/env node
/**
 * 슈퍼쇼츠 클론 프로젝트 전용 MCP 서버.
 * 프레시시즌 등 다른 프로젝트의 MCP 서버 패턴을 참고해서 만듦 — 그쪽의 핵심은 단순 테이블
 * 조회(get_rows 등)가 아니라 create_blog_post처럼 "실제 작업을 한 번에 끝내는 도구"였음.
 * 그래서 이 서버도 DB 조회/수정 도구뿐 아니라, Claude가 언제든 접속해서 사용자 대신
 * 실제로 쇼츠를 만들어줄 수 있는 create_shorts 도구를 핵심으로 제공한다.
 *
 * create_shorts/retry_job은 Next.js 개발 서버(npm run dev)에 의존하지 않는다 —
 * lib/pipeline.js의 runPipeline()을 이 프로세스가 직접 import해서 실행하기 때문에,
 * Next 서버가 켜져 있지 않아도 동작한다 (렌더링에 필요한 @remotion/* 등은 전부
 * 프로젝트 루트 node_modules에서 그대로 resolve됨 — Node의 상대경로 import는 파일 위치
 * 기준으로 node_modules를 찾기 때문).
 *
 * 실행: node mcp-server/index.js (프로젝트 루트의 .env.local을 읽어서 접속)
 * 등록: 프로젝트 루트(Downloads)의 .mcp.json에 stdio 서버로 등록되어 있음.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// 프로젝트 루트의 lib/*를 그대로 재사용한다 (중복 구현 안 함) — dotenv.config()가 먼저 실행돼서
// 이 모듈들이 process.env를 읽을 때 이미 .env.local 값이 채워져 있다.
const { getSupabaseServerClient } = await import('../lib/supabase.js');
const { runPipeline } = await import('../lib/pipeline.js');
const OPTIONS = await import('../lib/options.js');
const { DEFAULT_CAPTION_PRESET_ID } = await import('../remotion/src/captionPresets.js');
const { searchNaverNews } = await import('../lib/naverNews.js');
const { analyzeScriptStyle } = await import('../lib/analyzeScriptStyle.js');
const { generateImage } = await import('../lib/generateImage.js');

let supabase;
try {
  supabase = getSupabaseServerClient();
} catch (err) {
  console.error(`[supershorts-mcp] ${err.message}`);
  process.exit(1);
}

// 소유자 계정(OWNER_EMAIL)의 automation_defaults를 조회해 create_shorts에서 생략된 필드에 채워넣는다.
// 이 MCP는 개인용 도구라 "로그인 세션"이 없으므로, 소유자 계정 기준으로 기본값을 찾는다.
let cachedDefaults;
async function getOwnerDefaults() {
  if (cachedDefaults !== undefined) return cachedDefaults;
  cachedDefaults = null;
  try {
    if (!process.env.OWNER_EMAIL) return cachedDefaults;
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 200 });
    const owner = userList?.users?.find((u) => u.email === process.env.OWNER_EMAIL);
    if (!owner) return cachedDefaults;
    const { data } = await supabase.from('automation_defaults').select('*').eq('user_id', owner.id).maybeSingle();
    cachedDefaults = data || null;
  } catch (err) {
    console.error('[supershorts-mcp] 자동화 기본값 조회 실패:', err.message);
  }
  return cachedDefaults;
}

const BUCKET = 'shorts';
const TABLES = ['projects', 'jobs', 'templates', 'app_config'];
const TABLE_SCHEMA = {
  projects: {
    columns:
      'id, user_id, source_url, source_text, title_line1, title_line2, layout_id, content_template_id, title_style, caption_style, background, extra_info, options, created_at, updated_at',
    note: '레이아웃(info/card), 자막 프리셋, 배경, 부가정보, 대본/음성 provider 등 새 프로젝트 화면에서 넣은 설정 전체.',
  },
  jobs: {
    columns:
      'id, project_id, status(queued/processing/completed/failed), stage, error_message, credits_used, video_url, idempotency_key, created_at, updated_at',
    note: '프로젝트 1건을 실제로 파이프라인에 태운 실행 기록. 한 프로젝트에 여러 job(재시도 포함)이 있을 수 있음.',
  },
  templates: {
    columns: 'id, user_id, name, layout_id, config(jsonb), created_at',
    note: '템플릿 에디터에서 저장한 내 템플릿(제목/자막/배경 스타일 프리셋).',
  },
  app_config: {
    columns: 'key, value, updated_at',
    note:
      'SCRIPT_PROVIDER/ANTHROPIC_API_KEY/GEMINI_API_KEY/OPENAI_API_KEY/TTS_PROVIDER/FAL_KEY/ELEVENLABS_API_KEY/ELEVENLABS_VOICE_ID/NAVER_CLOVA_CLIENT_ID/NAVER_CLOVA_CLIENT_SECRET 등 ' +
      'lib/remoteConfig.js가 파이프라인 시작 시 자동으로 불러오는 전역 키·설정값. key 컬럼이 .env.local.example의 환경변수 이름과 1:1 대응. ' +
      'upsert_row로 { table:"app_config", row:{ key:"...", value:"..." } } 형태로 추가/수정. Vercel 환경변수와 달리 재배포 없이 즉시 반영되고, 로컬 워커(scripts/worker.js)와 Vercel 배포본 둘 다 이 테이블을 통해 값을 읽는다 — Vercel 프로젝트 설정에만 넣으면 로컬 워커는 못 읽으니 주의.',
  },
};

function assertKnownTable(table) {
  if (!TABLES.includes(table)) {
    throw new Error(`알 수 없는 테이블: ${table} (사용 가능: ${TABLES.join(', ')})`);
  }
}

function textResult(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function errorResult(err) {
  return { content: [{ type: 'text', text: `에러: ${err.message || err}` }], isError: true };
}

async function fetchJobWithProject(jobId) {
  const { data, error } = await supabase.from('jobs').select('*, projects(*)').eq('id', jobId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`job을 찾을 수 없습니다: ${jobId}`);
  return data;
}

const server = new McpServer(
  { name: 'supershorts-clone', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

// ── 실제 작업 수행 도구 ──────────────────────────────────────────

server.registerTool(
  'create_shorts',
  {
    description:
      '블로그 URL 또는 직접 대본으로 쇼츠 영상을 처음부터 끝까지(추출→대본→음성→자막→렌더링→업로드) 실제로 만든다. ' +
      'Next.js 서버가 켜져 있지 않아도 이 도구 자체가 파이프라인을 실행한다. wait=true(기본)면 완료까지 기다렸다가 ' +
      '영상 URL을 바로 돌려주고(보통 30초~2분 소요), wait=false면 job만 만들어두고 바로 반환하니 get_job_status로 나중에 확인한다.',
    inputSchema: {
      sourceUrl: z.string().optional().describe('블로그 글 URL (네이버블로그/티스토리 등)'),
      sourceText: z.string().optional().describe('URL 대신 직접 줄 대본/원본 텍스트'),
      planningMode: z.enum(['auto', 'direct']).optional().describe('direct면 sourceText를 그대로 쓰고 제목만 생성, 생략시 sourceText만 있으면 자동으로 direct'),
      style: z.enum(['summary', 'hook', 'list', 'twist-reveal']).optional().describe('기본 summary. twist-reveal은 "신비한 건축사전"류 반전 지식형 — videoMode:ai-generated와 궁합이 좋음'),
      outputLanguage: z.enum(['original', 'ko', 'en', 'ja']).optional().describe('기본 original(원문유지)'),
      lengthMode: z.enum(['shortform', 'longform', 'extended']).optional().describe('기본 shortform. targetChars를 주면 이 값은 무시됨'),
      targetChars: z.number().int().min(30).optional().describe('대본 목표 글자수 자유 입력(30자 이상). 지정하면 lengthMode 대신 이 값 기준으로 분량을 맞춘다'),
      scriptStyleId: z.string().optional().describe('save_script_style로 저장해둔 커스텀 대본 스타일 id. 지정하면 style(프리셋) 대신 그 스타일로 대본을 쓴다. list_script_styles로 목록 확인 가능'),
      layoutId: z.enum(['info', 'card', 'full-focused', 'image-dark', 'viral-mint']).optional().describe('기본 info'),
      captionPresetId: z.string().optional().describe('기본 existing-preset-bold-white-outline, list_options로 전체 목록 확인 가능'),
      scriptProvider: z.enum(['claude', 'gemini', 'gpt']).optional().describe('기본 claude'),
      voiceProvider: z.enum(['fal', 'elevenlabs', 'clova']).optional().describe('기본 fal'),
      voice: z
        .enum(['seoa', 'hajun', 'taeo', 'ina', 'doyun', 'jihoon', 'yuna', 'minjae', 'luna', 'harin', 'seojun', 'daon', 'mio', 'haru', 'ren', 'oliver', 'noah', 'emma', 'liam', 'ava', 'chloe', 'adam', 'jay'])
        .optional()
        .describe('음성 페르소나(voiceProvider가 fal일 때만 적용). 생략시 기본 보이스. list_options의 voicePresets로 이름/설명 확인 가능'),
      voiceSpeed: z.number().min(0.7).max(1.2).optional().describe('재생 속도, 0.7(느림)~1.2(빠름), 기본 1.0. fal/elevenlabs/clova 전부 지원'),
      backgroundColor: z.string().optional().describe('기본 #0a0a0a'),
      backgroundImageUrl: z.string().optional().describe('비우면 대표 이미지를 자동으로 씀 (videoMode:ai-generated면 무시됨)'),
      backgroundVideoUrl: z.string().optional().describe('viral-mint 레이아웃 전용, 인물 영상 URL (upload_asset으로 먼저 업로드)'),
      videoMode: z.enum(['static', 'ai-generated']).optional().describe(
        '기본 static(정적 이미지/영상). ai-generated면 내레이션을 장면 단위로 쪼개서 AI가 각 장면 영상을 자동 생성한다 ' +
        '(list_options의 videoModes/videoProviders 참고). layoutId를 지정 안 하면 이 모드에선 full-focused를 기본으로 쓴다. ' +
        '⚠️ 클립마다 실비용이 든다(기본 wan 기준 8초당 약 $0.4) — 짧은 영상도 클립 2~3개가 필요하니 미리 감안할 것.'
      ),
      videoProvider: z.enum(['wan', 'kling', 'seedance', 'veo']).optional().describe('videoMode가 ai-generated일 때만 적용. 기본 wan(가성비 1순위), veo가 가장 고품질·고가. list_options의 videoProviders로 상세 비교 확인'),
      extraInfoText: z.string().optional().describe('좌상단에 계속 뜨는 워터마크 텍스트 (예: 채널명)'),
      introEnabled: z.boolean().optional().describe('기본 false. true면 본문 전에 1.8초 제목 전용 인트로보드를 붙임'),
      introTemplateId: z.string().optional().describe('list_options로 전체 10종 확인 가능, 기본 cool-living-room-intro'),
      wait: z.boolean().optional().describe('기본 true'),
    },
  },
  async (args) => {
    try {
      const {
        sourceUrl,
        sourceText,
        planningMode,
        style,
        outputLanguage,
        lengthMode,
        targetChars,
        scriptStyleId,
        layoutId,
        captionPresetId,
        scriptProvider,
        voiceProvider,
        voice,
        voiceSpeed,
        backgroundColor,
        backgroundImageUrl,
        backgroundVideoUrl,
        videoMode,
        videoProvider,
        extraInfoText,
        introEnabled,
        introTemplateId,
        wait,
      } = args;

      if (!sourceUrl && !sourceText) {
        throw new Error('sourceUrl 또는 sourceText 중 하나는 필요합니다.');
      }

      const defaults = (await getOwnerDefaults()) || {};

      let customStyleDescription;
      if (scriptStyleId) {
        const { data: styleRow, error: styleError } = await supabase
          .from('script_styles')
          .select('style_description')
          .eq('id', scriptStyleId)
          .maybeSingle();
        if (styleError) throw new Error(`스타일 조회 실패: ${styleError.message}`);
        if (!styleRow) throw new Error(`scriptStyleId를 찾을 수 없습니다: ${scriptStyleId}`);
        customStyleDescription = styleRow.style_description;
      }

      const options = {
        planningMode: planningMode || (sourceText && !sourceUrl ? 'direct' : 'auto'),
        style: style || defaults.style || 'summary',
        outputLanguage: outputLanguage || defaults.output_language || 'original',
        lengthMode: lengthMode || defaults.length_mode || 'shortform',
        targetChars: targetChars || null,
        customStyleDescription: customStyleDescription || null,
        scriptProvider: scriptProvider || defaults.script_provider || 'claude',
        voiceProvider: voiceProvider || defaults.voice_provider || 'fal',
        voice: voice || defaults.voice_id || null,
        voiceSpeed: voiceSpeed || null,
        introEnabled: introEnabled ?? defaults.intro_enabled ?? false,
        introTemplateId: introTemplateId || defaults.intro_template_id || null,
        introDisplayOnly: true,
        videoMode: videoMode || 'static',
        videoProvider: videoProvider || 'wan',
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          source_url: sourceUrl || null,
          source_text: sourceText || null,
          // AI 영상 생성 모드는 배경을 scenes[]로 채우므로, 별도 layoutId를 안 줬으면
          // 화면을 꽉 채우는 full-focused가 정적 모드의 'info'보다 잘 맞는다.
          layout_id: layoutId || defaults.layout_id || (videoMode === 'ai-generated' ? 'full-focused' : 'info'),
          content_template_id: captionPresetId || defaults.caption_preset_id || DEFAULT_CAPTION_PRESET_ID,
          background: {
            color: backgroundColor || '#0a0a0a',
            imageUrl: backgroundImageUrl || null,
            videoUrl: backgroundVideoUrl || null,
          },
          extra_info: extraInfoText ? [{ text: extraInfoText, x: 24, y: 24 }] : [],
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

      if (wait === false) {
        runPipeline({ projectId: project.id, jobId: job.id }).catch((err) =>
          console.error('[create_shorts] 백그라운드 파이프라인 실패', err)
        );
        return textResult({
          projectId: project.id,
          jobId: job.id,
          status: 'queued',
          note: '백그라운드로 처리 중입니다. get_job_status(jobId)로 진행 상황을 확인하세요.',
        });
      }

      await runPipeline({ projectId: project.id, jobId: job.id });

      const finalJob = await fetchJobWithProject(job.id);
      return textResult({
        projectId: project.id,
        jobId: job.id,
        status: finalJob.status,
        stage: finalJob.stage,
        videoUrl: finalJob.video_url,
        errorMessage: finalJob.error_message,
        title: [finalJob.projects?.title_line1, finalJob.projects?.title_line2].filter(Boolean).join(' / '),
      });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'retry_job',
  {
    description: '실패한(또는 완료된) job을 같은 프로젝트 설정으로 다시 실행한다. 이 서버가 파이프라인을 직접 돌리므로 Next 서버 없이도 동작한다.',
    inputSchema: { jobId: z.string(), wait: z.boolean().optional().describe('기본 true') },
  },
  async ({ jobId, wait }) => {
    try {
      const existing = await fetchJobWithProject(jobId);

      const { data: newJob, error: insertError } = await supabase
        .from('jobs')
        .insert({ project_id: existing.project_id, status: 'queued' })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);

      if (wait === false) {
        runPipeline({ projectId: existing.project_id, jobId: newJob.id }).catch((err) =>
          console.error('[retry_job] 백그라운드 파이프라인 실패', err)
        );
        return textResult({ newJobId: newJob.id, status: 'queued', note: '백그라운드로 처리 중' });
      }

      await runPipeline({ projectId: existing.project_id, jobId: newJob.id });
      const finalJob = await fetchJobWithProject(newJob.id);
      return textResult({
        newJobId: newJob.id,
        status: finalJob.status,
        videoUrl: finalJob.video_url,
        errorMessage: finalJob.error_message,
      });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'get_job_status',
  {
    description: '특정 job의 현재 진행 상태(stage/status/에러/완성된 영상 URL)를 조회한다.',
    inputSchema: { jobId: z.string() },
  },
  async ({ jobId }) => {
    try {
      const job = await fetchJobWithProject(jobId);
      return textResult({
        jobId: job.id,
        status: job.status,
        stage: job.stage,
        errorMessage: job.error_message,
        videoUrl: job.video_url,
        creditsUsed: job.credits_used,
        project: {
          id: job.projects?.id,
          title: [job.projects?.title_line1, job.projects?.title_line2].filter(Boolean).join(' / '),
          sourceUrl: job.projects?.source_url,
        },
      });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'upload_asset',
  {
    description:
      '로컬 이미지/영상 파일 경로 또는 원격 URL을 Supabase Storage(shorts 버킷)에 올리고 공개 URL을 돌려준다. ' +
      'create_shorts의 backgroundImageUrl(이미지) 또는 backgroundVideoUrl(viral-mint용 인물 영상)로 바로 쓸 수 있다.',
    inputSchema: { source: z.string().describe('로컬 파일 절대경로 또는 http(s) URL') },
  },
  async ({ source }) => {
    try {
      let buffer;
      let ext = path.extname(source).replace('.', '') || 'png';
      const contentTypeMap = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
      };

      if (/^https?:\/\//i.test(source)) {
        const res = await fetch(source);
        if (!res.ok) throw new Error(`원격 파일 다운로드 실패 (${res.status}): ${source}`);
        buffer = Buffer.from(await res.arrayBuffer());
        const urlExt = path.extname(new URL(source).pathname).replace('.', '');
        if (urlExt) ext = urlExt;
      } else {
        if (!fs.existsSync(source)) throw new Error(`파일을 찾을 수 없습니다: ${source}`);
        buffer = fs.readFileSync(source);
      }

      const storagePath = `uploads/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: contentTypeMap[ext.toLowerCase()] || 'application/octet-stream' });
      if (error) throw new Error(`업로드 실패: ${error.message}`);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      return textResult({ url: data.publicUrl });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'save_script_style',
  {
    description:
      '레퍼런스 대본(기존에 쓰던 대본 예시)을 분석해서 말투/톤/구조를 뽑아내고, 이름을 붙여 저장한다. ' +
      '저장된 스타일은 create_shorts의 scriptStyleId로 재사용할 수 있다(매번 레퍼런스를 다시 붙여넣지 않아도 됨). ' +
      'Qventor 등에서 "대본 스타일 관리"라고 부르는 기능과 같다.',
    inputSchema: {
      name: z.string().describe('이 스타일을 나중에 알아볼 이름 (예: "내 유튜브 채널 톤")'),
      referenceText: z.string().describe('참고할 레퍼런스 대본 원문 (최소 30자, 최대 20,000자)'),
    },
  },
  async ({ name, referenceText }) => {
    try {
      const styleDescription = await analyzeScriptStyle(referenceText);
      const { data, error } = await supabase
        .from('script_styles')
        .insert({ name, reference_text: referenceText, style_description: styleDescription })
        .select()
        .single();
      if (error) throw new Error(`저장 실패: ${error.message}`);
      return textResult({ id: data.id, name: data.name, styleDescription: data.style_description });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'list_script_styles',
  {
    description: 'save_script_style로 저장해둔 커스텀 대본 스타일 목록을 보여준다.',
    inputSchema: {},
  },
  async () => {
    try {
      const { data, error } = await supabase.from('script_styles').select('id, name, style_description, created_at').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'create_image_style_set',
  {
    description:
      '캐릭터/화풍 일관성을 위한 레퍼런스 이미지 세트를 저장한다(Qventor의 "레퍼런스 이미지 세트"와 같은 개념). ' +
      '이미지는 미리 upload_asset으로 올려서 URL을 받아둘 것(최대 2장). generate_image의 styleSetId로 재사용 가능.',
    inputSchema: {
      name: z.string().describe('세트 이름 (예: "내 캐릭터")'),
      referenceImageUrls: z.array(z.string()).min(1).max(2).describe('레퍼런스 이미지 URL 1~2장 (upload_asset으로 먼저 업로드)'),
      artStyleId: z
        .enum(OPTIONS.ART_STYLE_PRESETS.map((p) => p.id))
        .optional()
        .describe('그림체 프리셋(list_options의 artStylePresets 참고). 지정하면 generate_image 프롬프트에 자동으로 화풍 지시문이 붙는다'),
    },
  },
  async ({ name, referenceImageUrls, artStyleId }) => {
    try {
      const { data, error } = await supabase
        .from('image_style_sets')
        .insert({ name, reference_image_urls: referenceImageUrls, art_style_id: artStyleId || null })
        .select()
        .single();
      if (error) throw new Error(`저장 실패: ${error.message}`);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'list_image_style_sets',
  { description: 'create_image_style_set으로 저장해둔 레퍼런스 이미지 세트 목록을 보여준다.', inputSchema: {} },
  async () => {
    try {
      const { data, error } = await supabase.from('image_style_sets').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'generate_image',
  {
    description:
      '프롬프트로 정적 이미지를 생성한다(fal.ai Nano Banana/Gemini 2.5 Flash Image). ' +
      'styleSetId를 주면 그 레퍼런스 이미지를 편집/재구성하는 방식으로 캐릭터·구도 일관성을 유지하고, ' +
      '화풍 프리셋도 자동으로 프롬프트에 반영된다. 인스타툰처럼 같은 캐릭터로 여러 장 만들 때 매번 같은 styleSetId를 쓸 것.',
    inputSchema: {
      prompt: z.string().describe('이미지 프롬프트(영어 권장)'),
      styleSetId: z.string().optional().describe('list_image_style_sets로 확인 가능. 지정하면 레퍼런스 이미지+화풍이 자동 적용됨'),
      artStyleId: z
        .enum(OPTIONS.ART_STYLE_PRESETS.map((p) => p.id))
        .optional()
        .describe('styleSetId 없이 화풍만 지정하고 싶을 때(레퍼런스 이미지 없이 텍스트→이미지)'),
      aspectRatio: z.enum(['auto', '1:1', '9:16', '16:9', '3:4', '4:3']).optional().describe('기본 9:16(쇼츠 세로)'),
    },
  },
  async ({ prompt, styleSetId, artStyleId, aspectRatio }) => {
    try {
      let referenceImageUrls = [];
      let fullPrompt = prompt;

      if (styleSetId) {
        const { data: set, error } = await supabase.from('image_style_sets').select('*').eq('id', styleSetId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!set) throw new Error(`styleSetId를 찾을 수 없습니다: ${styleSetId}`);
        referenceImageUrls = set.reference_image_urls || [];
        const preset = OPTIONS.ART_STYLE_PRESETS.find((p) => p.id === set.art_style_id);
        if (preset) fullPrompt = `${fullPrompt}, ${preset.promptModifier}`;
      } else if (artStyleId) {
        const preset = OPTIONS.ART_STYLE_PRESETS.find((p) => p.id === artStyleId);
        if (preset) fullPrompt = `${fullPrompt}, ${preset.promptModifier}`;
      }

      const { imageUrl } = await generateImage({ prompt: fullPrompt, referenceImageUrls, aspectRatio: aspectRatio || '9:16' });

      // fal 임시 URL은 만료될 수 있으므로 우리 Storage로 옮겨서 영구 URL을 돌려준다.
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`생성된 이미지 다운로드 실패 (${imgRes.status})`);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const storagePath = `generated-images/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType: 'image/png' });
      if (uploadError) throw new Error(`Storage 업로드 실패: ${uploadError.message}`);
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      return textResult({ url: pub.publicUrl });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'create_instatoon',
  {
    description:
      '주제를 인스타툰(카드형 웹툰, N컷)으로 자동 제작한다. 이 도구는 큐에 넣기만 하고 바로 반환한다 — ' +
      '실제 기획+이미지 생성은 워커(npm run worker)가 처리하므로, PC가 켜져 있고 워커가 돌고 있어야 완성된다. ' +
      'get_instatoon_status(projectId)로 진행 상황을 확인할 것. ' +
      'characterStyleSetId를 안 주면 1컷을 먼저 만든 뒤 그 결과를 자동으로 이후 컷들의 캐릭터 레퍼런스로 재사용한다(Qventor 방식과 동일).',
    inputSchema: {
      topic: z.string().describe('인스타툰 주제(예: "월요일 출근길 직장인의 마음")'),
      panelCount: z.number().int().min(2).max(10).optional().describe('컷 수, 기본 6'),
      characterStyleSetId: z.string().optional().describe('create_image_style_set으로 미리 저장해둔 캐릭터 세트 id. 생략하면 자동으로 첫 컷을 기준 캐릭터로 씀'),
    },
  },
  async ({ topic, panelCount, characterStyleSetId }) => {
    try {
      const { data, error } = await supabase
        .from('instatoon_projects')
        .insert({ topic, panel_count: panelCount || 6, character_style_set_id: characterStyleSetId || null, status: 'queued' })
        .select()
        .single();
      if (error) throw new Error(`프로젝트 생성 실패: ${error.message}`);
      return textResult({ projectId: data.id, status: 'queued', note: '워커가 처리 중입니다. get_instatoon_status(projectId)로 진행 상황을 확인하세요.' });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'get_instatoon_status',
  {
    description: '인스타툰 프로젝트의 진행 상태(stage/status/컷별 이미지 URL)를 조회한다.',
    inputSchema: { projectId: z.string() },
  },
  async ({ projectId }) => {
    try {
      const { data, error } = await supabase.from('instatoon_projects').select('*').eq('id', projectId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);
      return textResult({ status: data.status, stage: data.stage, errorMessage: data.error_message, panels: data.panels });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'list_options',
  {
    description: 'create_shorts/upsert_row에 쓸 수 있는 유효한 값 목록(레이아웃, 자막 프리셋, provider, 스타일, 언어 등)을 보여준다.',
    inputSchema: {},
  },
  async () =>
    textResult({
      layouts: OPTIONS.LAYOUTS,
      artStylePresets: OPTIONS.ART_STYLE_PRESETS,
      captionPresets: OPTIONS.CAPTION_PRESET_LIST,
      introTemplates: OPTIONS.INTRO_TEMPLATE_LIST,
      scriptProviders: OPTIONS.SCRIPT_PROVIDERS,
      voiceProviders: OPTIONS.VOICE_PROVIDERS,
      voicePresets: OPTIONS.VOICE_PRESET_LIST,
      scriptStyles: OPTIONS.SCRIPT_STYLES,
      outputLanguages: OPTIONS.OUTPUT_LANGUAGES,
      lengthModes: OPTIONS.LENGTH_MODES,
      videoModes: OPTIONS.VIDEO_MODES,
      videoProviders: OPTIONS.VIDEO_PROVIDERS,
    })
);

server.registerTool(
  'search_naver_news',
  {
    description:
      '네이버 뉴스 검색 오픈API로 기사 제목·링크·발행일·요약을 가져온다. 쇼츠로 만들 만한 최신 이슈나 ' +
      '뉴스 소재를 찾을 때 쓴다 (sort:"date"로 최신순 조회하면 지금 뜨는 이슈 파악에 유용). 결과의 link를 ' +
      'create_shorts의 sourceUrl로 바로 넘기면 그 기사를 쇼츠로 만들 수 있다. ' +
      'NAVER_CLIENT_ID/SECRET 환경변수가 필요하다.',
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

// ── 범용 DB 조회/수정 도구 (프레시시즌 패턴) ──────────────────────

server.registerTool(
  'list_tables',
  { description: '이 프로젝트 Supabase DB의 테이블 목록과 각 테이블의 컬럼/용도를 설명한다.', inputSchema: {} },
  async () => textResult(TABLE_SCHEMA)
);

server.registerTool(
  'get_rows',
  {
    description: 'projects/jobs/templates 테이블에서 행을 조회한다. filters는 { 컬럼: 값 } 형태의 단순 등호 조건.',
    inputSchema: {
      table: z.enum(TABLES),
      filters: z.record(z.string(), z.any()).optional(),
      limit: z.number().int().min(1).max(200).optional(),
      orderBy: z.string().optional(),
      ascending: z.boolean().optional(),
    },
  },
  async ({ table, filters, limit, orderBy, ascending }) => {
    try {
      assertKnownTable(table);
      let query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(filters || {})) {
        query = query.eq(key, value);
      }
      query = query.order(orderBy || 'created_at', { ascending: ascending ?? false }).limit(limit || 50);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'upsert_row',
  {
    description:
      'projects/jobs/templates 테이블에 행을 추가하거나(신규) id를 포함하면 업데이트한다. 실제 쇼츠 제작은 create_shorts를 쓰고, ' +
      '이 도구는 세부 필드를 직접 고치고 싶을 때만 쓴다.',
    inputSchema: { table: z.enum(TABLES), row: z.record(z.string(), z.any()) },
  },
  async ({ table, row }) => {
    try {
      assertKnownTable(table);
      const { data, error } = await supabase.from(table).upsert(row).select().single();
      if (error) throw new Error(error.message);
      return textResult(data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'delete_row',
  {
    description: 'projects/jobs/templates 테이블에서 id로 행 하나를 삭제한다. projects 삭제 시 연결된 jobs도 같이 삭제된다(FK cascade). Storage 파일은 안 지워지니 필요하면 따로 정리할 것.',
    inputSchema: { table: z.enum(TABLES), id: z.string() },
  },
  async ({ table, id }) => {
    try {
      assertKnownTable(table);
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return textResult({ ok: true, table, id });
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'run_sql',
  {
    description: '읽기전용(SELECT만) SQL을 직접 실행한다. JOIN 등 get_rows로 안 되는 복잡한 조회에 쓴다. INSERT/UPDATE/DELETE/DDL은 거부된다.',
    inputSchema: { query: z.string() },
  },
  async ({ query }) => {
    try {
      const { data, error } = await supabase.rpc('exec_readonly_sql', { query });
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
    description: '모든 프로젝트를 최신순으로, 최근 job 상태와 함께 한눈에 보기 좋은 요약으로 반환한다.',
    inputSchema: { limit: z.number().int().min(1).max(100).optional() },
  },
  async ({ limit }) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id, title_line1, source_url, layout_id, created_at, jobs(id, status, stage, error_message, video_url, credits_used, created_at)'
        )
        .order('created_at', { ascending: false })
        .limit(limit || 30);
      if (error) throw new Error(error.message);

      const summary = (data || []).map((p) => {
        const jobs = [...(p.jobs || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const latest = jobs[0];
        return {
          projectId: p.id,
          title: p.title_line1 || p.source_url || '(제목 없음)',
          layout: p.layout_id,
          status: latest?.status || 'no-job',
          stage: latest?.stage,
          error: latest?.error_message,
          videoUrl: latest?.video_url,
          jobCount: jobs.length,
          createdAt: p.created_at,
        };
      });
      return textResult(summary);
    } catch (err) {
      return errorResult(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[supershorts-mcp] 서버 시작됨 (stdio) — create_shorts로 직접 쇼츠 제작 가능');
}

main().catch((err) => {
  console.error('[supershorts-mcp] 서버 시작 실패:', err);
  process.exit(1);
});
