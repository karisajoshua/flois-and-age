import {createRsvpHandler} from './rsvp.mjs';
import {createAdminHandler, createPhotoHandler} from './admin.mjs';
import {createStoryHandler} from './story.mjs';
const factories = {'/api/rsvp': createRsvpHandler, '/api/admin': createAdminHandler, '/api/photo': createPhotoHandler, '/api/story': createStoryHandler};
export function rsvpDevPlugin(env) {
  return {name: 'local-wedding-api', async configureServer(server) {
    let demo;
    if (env.RSVP_QA_MODE === '1') demo = await (await import('./test-db.mjs')).createTestDatabase();
    const ordinary = Object.fromEntries(Object.entries(factories).map(([path, factory]) => [path, factory({env: {...env, NODE_ENV: 'development'}})]));
    server.httpServer?.once('close', () => { void demo?.db.close(); });
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0];
      if (demo && path?.startsWith('/storage/v1/object/sign/wedding-assets/')) {
        const photo = demo.objects.get(path.split('/wedding-assets/')[1]);
        if (!photo) {res.statusCode = 404; res.end(); return;}
        res.writeHead(200, {'Content-Type': photo.type}); res.end(photo.bytes); return;
      }
      const qaSession = demo && path === '/api/qa-session' && req.method === 'POST' && req.headers['x-rsvp-qa'] === '1';
      if (!factories[path] && !qaSession) return next();
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const requestHeaders = Object.fromEntries(Object.entries(req.headers).filter(([, value]) => value !== undefined).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]));
        const request = new Request(`http://${req.headers.host}${req.url}`, {method: req.method, headers: requestHeaders, body: ['GET', 'HEAD'].includes(req.method) ? undefined : qaSession ? JSON.stringify({action: 'login', password: 'local-only-demonstration-password'}) : Buffer.concat(chunks)});
        const handler = demo && req.headers['x-rsvp-qa'] === '1' ? (qaSession ? createAdminHandler : factories[path])({env: {NODE_ENV: 'development', SUPABASE_URL: `http://${req.headers.host}`, SUPABASE_SECRET_KEY: 'sb_secret_local_fixture_only', WEDDING_ADMIN_PASSWORD: 'local-only-demonstration-password'}, fetchImpl: demo.fetchRpc}) : ordinary[path];
        const result = await handler(request);
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(await result.text());
      } catch { res.statusCode = 503; res.end('{"error":"This request is temporarily unavailable."}'); }
    });
  }};
}
