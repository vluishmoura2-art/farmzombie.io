export function serverConfig(env = process.env) {
  const render = env.RENDER === 'true';
  const production = env.NODE_ENV === 'production' || render;
  const port = Number(env.PORT || 7777);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT must be an integer between 1 and 65535');
  const host = env.HOST || (production ? '0.0.0.0' : '127.0.0.1');
  let publicOrigin;
  if (production) {
    try {
      const url = new URL(env.PUBLIC_ORIGIN || (render ? env.RENDER_EXTERNAL_URL : ''));
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Invalid origin');
      publicOrigin = url.origin;
    } catch {
      throw Error('Production requires an HTTPS PUBLIC_ORIGIN, or RENDER_EXTERNAL_URL when running on Render');
    }
  }
  const origins = production ? [publicOrigin] : [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
  // The Render URL remains a valid entry point when PUBLIC_ORIGIN names a custom domain.
  if (render && env.RENDER_EXTERNAL_URL) {
    const url = new URL(env.RENDER_EXTERNAL_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw Error('RENDER_EXTERNAL_URL must be an HTTPS origin');
    }
    if (!origins.includes(url.origin)) origins.push(url.origin);
  }
  return {
    port, host, production, publicOrigin,
    origins,
    trustProxy: env.TRUST_PROXY === '1' || (render && env.TRUST_PROXY !== '0'),
  };
}
