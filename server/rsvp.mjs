import {createHash, createHmac} from 'node:crypto';
import {INVITATION_TOKEN_PATTERN, validateRsvp} from '../shared/rsvp.mjs';

const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'};
const answer = (status, body, extra = {}) => new Response(JSON.stringify(body), {status, headers: {...headers, ...extra}});

export function createRsvpHandler({env = process.env, fetchImpl = fetch} = {}) {
  return async function handle(request) {
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    const configured = Boolean(env.SUPABASE_URL && key);
    if (request.method === 'GET') return answer(200, {available: configured});
    if (request.method !== 'POST') return answer(405, {error: 'Please use the RSVP form.'}, {Allow: 'GET, POST'});
    const origins = new Set([env.RSVP_ALLOWED_ORIGIN || 'https://flois-and-age.vercel.app']);
    if (env.VERCEL_URL) origins.add(`https://${env.VERCEL_URL}`);
    if (env.VERCEL_BRANCH_URL) origins.add(`https://${env.VERCEL_BRANCH_URL}`);
    if (env.VERCEL_BRANCH_URL) origins.add(`https://${env.VERCEL_BRANCH_URL}`);
    if (env.NODE_ENV === 'development') origins.add(new URL(request.url).origin);
    if (!origins.has(request.headers.get('origin'))) return answer(403, {error: 'Please respond from the wedding invitation.'});
    if (!configured) return answer(503, {error: 'RSVP is being prepared. Your response has not been sent. Please check back soon.'});
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return answer(415, {error: 'Please use the RSVP form.'});
    if (Number(request.headers.get('content-length')) > 4096) return answer(413, {error: 'Your response is too long.'});

    async function rpc(name, input) {
      const requestHeaders = {'Content-Type': 'application/json', apikey: key};
      if (!key.startsWith('sb_secret_')) requestHeaders.Authorization = `Bearer ${key}`;
      const response = await fetchImpl(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: requestHeaders, body: JSON.stringify(input), signal: AbortSignal.timeout(8000),
      });
      const payload = await response.json();
      if (!response.ok) {
        const error = new Error('RSVP storage request failed');
        error.code = payload?.code;
        error.detail = payload?.message;
        throw error;
      }
      return payload;
    }

    try {
      const raw = await request.text();
      if (Buffer.byteLength(raw, 'utf8') > 4096) return answer(413, {error: 'Your response is too long.'});
      let body;
      try { body = JSON.parse(raw); } catch { return answer(400, {error: 'Please check your response and try again.'}); }
      const identity = env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'development';
      const bucketKey = createHmac('sha256', env.RSVP_RATE_LIMIT_SECRET || key).update(identity).digest('hex');
      if (!await rpc('wedding_rsvp_rate_limit', {p_key: bucketKey})) return answer(429, {error: 'A few too many attempts. Please try again in 15 minutes.'}, {'Retry-After': '900'});
      if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.token !== 'string' || !INVITATION_TOKEN_PATTERN.test(body.token)) return answer(400, {error: 'Please use your personal invitation link or code.'});
      const hash = createHash('sha256').update(body.token).digest('hex');
      if (body.action === 'lookup') return answer(200, await rpc('wedding_rsvp_lookup', {p_token_hash: hash}));
      if (body.action !== 'submit') return answer(400, {error: 'Please use the RSVP form.'});
      const validated = validateRsvp(body);
      if (!validated.ok) return answer(400, {error: validated.error});
      const input = validated.value;
      const saved = await rpc('wedding_rsvp_save', {p_token_hash: hash, p_name: input.name, p_email: input.email, p_attending: input.attending, p_dietary: input.dietary});
      if (saved?.saved !== true || saved.guestCount !== (input.attending ? 1 : 0)) throw new Error('Unexpected RSVP storage response');
      return answer(200, saved);
    } catch (error) {
      if (error?.code === 'P0001' && error.detail === 'invalid_invitation') return answer(404, {error: 'We could not find an active invitation. Please check the link or code supplied by the couple.'});
      if (error?.code === '22023') return answer(400, {error: 'Please check your name, email address and attendance choice.'});
      return answer(503, {error: 'We could not save your response right now. Please try again. No confirmation has been issued.'});
    }
  };
}
