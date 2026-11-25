import {createRsvpHandler} from './rsvp.mjs';

export function rsvpDevPlugin(env) {
  return {name: 'local-rsvp', async configureServer(server) {
    let demo;
    if (env.RSVP_QA_MODE === '1') demo = await (await import('./test-db.mjs')).createTestDatabase();
    const ordinary = createRsvpHandler({env: {...env, NODE_ENV: 'development'}});
    const simulated = demo && createRsvpHandler({env: {...env, NODE_ENV: 'development', SUPABASE_URL: 'https://local-qa.invalid', SUPABASE_SECRET_KEY: 'sb_secret_local_fixture_only'}, fetchImpl: demo.fetchRpc});
    server.httpServer?.once('close', () => { void demo?.db.close(); });
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/api/rsvp') return next();
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const requestHeaders = Object.fromEntries(Object.entries(req.headers).filter(([, value]) => value !== undefined).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]));
        const request = new Request(`http://${req.headers.host}${req.url}`, {method: req.method, headers: requestHeaders, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks)});
        const handler = simulated && req.headers['x-rsvp-qa'] === '1' ? simulated : ordinary;
        const result = await handler(request);
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(await result.text());
      } catch { res.statusCode = 503; res.end('{"error":"RSVP is temporarily unavailable."}'); }
    });
  }};
}
