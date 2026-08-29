/**
 * fal.ai(Google Nano Banana = Gemini 2.5 Flash Image)로 정적 이미지를 생성한다.
 * referenceImageUrls가 있으면 그 이미지들을 편집/재구성하는 방식으로 캐릭터·구도 일관성을
 * 유지하고(fal-ai/nano-banana/edit), 없으면 순수 텍스트→이미지로 생성한다(fal-ai/nano-banana).
 * TTS/영상클립 생성과 같은 FAL_KEY를 재사용한다(새 계정 불필요).
 */
const TEXT_TO_IMAGE_URL = 'https://fal.run/fal-ai/nano-banana';
const EDIT_URL = 'https://fal.run/fal-ai/nano-banana/edit';

/**
 * @param {object} params
 * @param {string} params.prompt - 이미지 프롬프트(영어 권장)
 * @param {string[]} [params.referenceImageUrls] - 캐릭터/스타일 일관성을 위해 참고할 이미지 URL(최대 2장). 있으면 image-to-image(edit) 모드.
 * @param {'auto'|'1:1'|'9:16'|'16:9'|'3:4'|'4:3'} [params.aspectRatio] - 기본 9:16(쇼츠 세로 기준)
 * @returns {Promise<{imageUrl: string, width: number, height: number}>}
 */
export async function generateImage({ prompt, referenceImageUrls, aspectRatio = '9:16' }) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    throw new Error('FAL_KEY 환경변수가 필요합니다.');
  }
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('generateImage: prompt가 비어있습니다.');
  }

  const useEdit = referenceImageUrls && referenceImageUrls.length > 0;
  const url = useEdit ? EDIT_URL : TEXT_TO_IMAGE_URL;
  const body = useEdit
    ? { prompt, image_urls: referenceImageUrls.slice(0, 2), aspect_ratio: aspectRatio, output_format: 'png' }
    : { prompt, aspect_ratio: aspectRatio === 'auto' ? '1:1' : aspectRatio, output_format: 'png' };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`fal 이미지 생성 요청 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const image = json.images?.[0];
  if (!image?.url) {
    throw new Error(`fal 응답에 이미지 URL이 없습니다: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return { imageUrl: image.url, width: image.width, height: image.height };
}
