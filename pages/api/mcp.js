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
import { analyzeScriptStyle } from '../../lib/analyzeScriptStyle.js';
import { generateImage } from '../../lib/generateImage.js';
import { loadRemoteConfig } from '../../lib/remoteConfig.js';
import { extractBlogContent } from '../../lib/extract.js';
import { generateScript } from '../../lib/generateScript.js';
import crypto from 'node:crypto';

const GITHUB_REPO = 'mintimjang33/U-Short';
const TABLES = ['projects', 'jobs', 'templates', 'script_styles', 'image_style_sets', 'instatoon_projects'];
const BUCKET = 'shorts';
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
        scriptStyleId: z.string().optional().describe('save_script_style로 저장해둔 커스텀 대본 스타일 id. 지정하면 style 대신 그 스타일로 대본을 쓴다'),
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

        let customStyleDescription;
        if (args.scriptStyleId) {
          const { data: styleRow, error: styleError } = await supabase
            .from('script_styles')
            .select('style_description')
            .eq('id', args.scriptStyleId)
            .maybeSingle();
          if (styleError) throw new Error(`스타일 조회 실패: ${styleError.message}`);
          if (!styleRow) throw new Error(`scriptStyleId를 찾을 수 없습니다: ${args.scriptStyleId}`);
          customStyleDescription = styleRow.style_description;
        }

        const options = {
          planningMode: args.planningMode || (args.sourceText && !args.sourceUrl ? 'direct' : 'auto'),
          style: args.style || defaults.style || 'summary',
          outputLanguage: args.outputLanguage || defaults.output_language || 'original',
          lengthMode: args.lengthMode || defaults.length_mode || 'shortform',
          targetChars: args.targetChars || null,
          customStyleDescription: customStyleDescription || null,
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
    'create_video_edit',
    {
      title: '숏폼/롱폼 편집 요청 (큐에 등록)',
      description:
        '사용자가 직접 찍은 영상을 그대로 쓰면서 그 영상의 실제 음성을 Whisper로 받아써서 자막만 입힌다(TTS 안 씀). ' +
        'job을 큐에 넣기만 하고 바로 반환 — 실제 처리는 PC 워커가 담당.',
      inputSchema: {
        videoUrl: z.string().describe('편집할 영상 URL'),
        outputLanguage: z.enum(['original', 'ko', 'en', 'ja']).optional(),
        captionPresetId: z.string().optional(),
        titlePresetId: z.string().optional(),
        extraInfoText: z.string().optional(),
        introEnabled: z.boolean().optional(),
        introTemplateId: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            layout_id: 'video-edit',
            content_template_id: args.captionPresetId || 'existing-preset-bold-white-outline',
            background: { color: '#0a0a0a', videoUrl: args.videoUrl, imageUrl: null },
            extra_info: args.extraInfoText ? [{ text: args.extraInfoText, x: 24, y: 24 }] : [],
            options: {
              outputLanguage: args.outputLanguage || 'original',
              titlePresetId: args.titlePresetId || null,
              introEnabled: args.introEnabled ?? false,
              introTemplateId: args.introTemplateId || null,
              introDisplayOnly: true,
            },
          })
          .select()
          .single();
        if (projectError) throw new Error(`프로젝트 생성 실패: ${projectError.message}`);

        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert({ project_id: project.id, status: 'queued', kind: 'video_edit' })
          .select()
          .single();
        if (jobError) throw new Error(`job 생성 실패: ${jobError.message}`);

        return textResult({ projectId: project.id, jobId: job.id, status: 'queued', note: 'PC의 워커(npm run worker)가 켜져 있어야 처리됩니다. get_job_status(jobId)로 확인.' });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'regenerate_voice',
    {
      title: '음성만 재생성 (큐에 등록)',
      description:
        '⑩ 파이프라인 단계별 분리 실행: 완료된 프로젝트의 대본/장면은 그대로 두고 음성만 다시 만든다. ' +
        'job을 큐에 넣기만 하고 바로 반환 — 실제 처리(음성+자막+렌더링)는 PC 워커가 담당.',
      inputSchema: {
        projectId: z.string(),
        voiceProvider: z.enum(['fal', 'elevenlabs', 'clova']).optional(),
        voice: z.string().optional(),
        voiceSpeed: z.number().min(0.7).max(1.2).optional(),
      },
    },
    async ({ projectId, voiceProvider, voice, voiceSpeed }) => {
      try {
        const { data: project, error: fetchError } = await supabase.from('projects').select('options').eq('id', projectId).maybeSingle();
        if (fetchError) throw new Error(fetchError.message);
        if (!project) throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);

        const overrides = {};
        if (voiceProvider) overrides.voiceProvider = voiceProvider;
        if (voice) overrides.voice = voice;
        if (voiceSpeed) overrides.voiceSpeed = voiceSpeed;
        const nextOptions = { ...(project.options || {}), ...overrides };

        const { error: updateError } = await supabase.from('projects').update({ options: nextOptions }).eq('id', projectId);
        if (updateError) throw new Error(updateError.message);

        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert({ project_id: projectId, status: 'queued', kind: 'voice_update' })
          .select()
          .single();
        if (jobError) throw new Error(`job 생성 실패: ${jobError.message}`);

        return textResult({ jobId: job.id, status: 'queued', note: 'PC의 워커(npm run worker)가 켜져 있어야 처리됩니다. get_job_status(jobId)로 확인.' });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'preview_script_regenerate',
    {
      title: '대본 미리보기 재생성',
      description:
        '⑩ 파이프라인 단계별 분리 실행: 이 프로젝트의 원본 소스로 대본만 다시 만들어서 미리보기로 돌려준다. ' +
        'DB를 건드리지 않고 렌더링도 하지 않는다.',
      inputSchema: {
        projectId: z.string(),
        style: z.enum(['summary', 'hook', 'list', 'shopping', 'twist-reveal']).optional(),
        targetChars: z.number().int().min(30).optional(),
        scriptStyleId: z.string().optional(),
      },
    },
    async ({ projectId, style, targetChars, scriptStyleId }) => {
      try {
        const { data: project, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!project) throw new Error(`프로젝트를 찾을 수 없습니다: ${projectId}`);

        let sourceText = project.source_text || null;
        if (project.source_url) {
          const extracted = await extractBlogContent(project.source_url);
          sourceText = sourceText || extracted.text;
        }
        if (!sourceText) throw new Error('이 프로젝트는 원본 텍스트가 없어서 대본을 다시 만들 수 없습니다.');

        let customStyleDescription;
        if (scriptStyleId) {
          const { data: styleRow } = await supabase.from('script_styles').select('style_description').eq('id', scriptStyleId).maybeSingle();
          customStyleDescription = styleRow?.style_description;
        }

        const options = project.options || {};
        const script = await generateScript({
          sourceText,
          planningMode: options.planningMode || 'auto',
          style: style || options.style || 'summary',
          outputLanguage: options.outputLanguage || 'original',
          lengthMode: options.lengthMode || 'shortform',
          targetChars: targetChars || options.targetChars || undefined,
          customStyleDescription,
          provider: options.scriptProvider,
        });

        return textResult(script);
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
    'save_script_style',
    {
      title: '커스텀 대본 스타일 학습·저장',
      description:
        '레퍼런스 대본을 분석해서 말투/톤/구조를 뽑아내고 이름을 붙여 저장한다. create_shorts의 scriptStyleId로 재사용 가능.',
      inputSchema: {
        name: z.string().describe('스타일 이름'),
        referenceText: z.string().describe('레퍼런스 대본 원문(최소 30자, 최대 20,000자)'),
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
    { title: '저장된 대본 스타일 목록', description: 'save_script_style로 저장해둔 커스텀 대본 스타일 목록을 보여준다.' },
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
      title: '레퍼런스 이미지 세트 저장',
      description:
        '캐릭터/화풍 일관성을 위한 레퍼런스 이미지 세트를 저장한다. generate_image의 styleSetId로 재사용 가능.',
      inputSchema: {
        name: z.string().describe('세트 이름'),
        referenceImageUrls: z.array(z.string()).min(1).max(2).describe('레퍼런스 이미지 URL 1~2장'),
        artStyleId: z.enum(OPTIONS.ART_STYLE_PRESETS.map((p) => p.id)).optional().describe('그림체 프리셋, list_options의 artStylePresets 참고'),
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
    { title: '저장된 레퍼런스 이미지 세트 목록', description: 'create_image_style_set으로 저장해둔 세트 목록을 보여준다.' },
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
      title: '이미지 생성 (fal Nano Banana)',
      description:
        '프롬프트로 정적 이미지를 생성한다. styleSetId를 주면 레퍼런스 이미지 편집 방식으로 캐릭터·구도 일관성을 유지한다.',
      inputSchema: {
        prompt: z.string().describe('이미지 프롬프트(영어 권장)'),
        styleSetId: z.string().optional().describe('list_image_style_sets로 확인 가능'),
        artStyleId: z.enum(OPTIONS.ART_STYLE_PRESETS.map((p) => p.id)).optional().describe('styleSetId 없이 화풍만 지정하고 싶을 때'),
        aspectRatio: z.enum(['auto', '1:1', '9:16', '16:9', '3:4', '4:3']).optional().describe('기본 9:16'),
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
      title: '인스타툰(N컷 카드형 웹툰) 제작 요청 (큐에 등록)',
      description:
        '주제를 인스타툰(N컷)으로 제작 요청한다. job을 큐에 넣기만 하고 바로 반환 — 실제 처리는 PC 워커(npm run worker)가 담당. ' +
        'get_instatoon_status(projectId)로 진행 상황 확인. characterStyleSetId 생략시 1컷 결과를 자동으로 이후 컷 레퍼런스로 재사용.',
      inputSchema: {
        topic: z.string().describe('인스타툰 주제'),
        panelCount: z.number().int().min(2).max(10).optional().describe('컷 수, 기본 6'),
        characterStyleSetId: z.string().optional().describe('create_image_style_set으로 저장해둔 캐릭터 세트 id'),
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
        return textResult({ projectId: data.id, status: 'queued', note: 'PC의 워커(npm run worker)가 켜져 있어야 처리됩니다. get_instatoon_status(projectId)로 확인.' });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    'get_instatoon_status',
    {
      title: '인스타툰 진행 상태 조회',
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
    { title: '유효 옵션 목록', description: '레이아웃/자막프리셋/provider 등 create_shorts에 쓸 수 있는 값 목록.' },
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

  await loadRemoteConfig();
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
