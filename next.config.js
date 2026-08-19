/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion의 서버사이드 렌더링 패키지들은 자체 번들러(esbuild/rspack)와 네이티브 바이너리를
  // 포함하고 있어서 Next.js의 webpack이 그대로 번들링하려 하면 깨진다.
  // API 라우트에서는 이 패키지들을 번들링하지 말고 그냥 require()로 불러오도록 제외한다.
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    '@remotion/cli',
    'remotion',
  ],
};

export default nextConfig;
