import {createHmac} from 'node:crypto';

export const answer = (status, body, extra = {}) => new Response(JSON.stringify(body), {status, headers: {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...extra,
}});
export const secretKey = env => env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
export const configured = env => Boolean(env.SUPABASE_URL && secretKey(env));
export function sameOrigin(request, env) {
  const origins = new Set([env.RSVP_ALLOWED_ORIGIN || 'https://flois-and-age.vercel.app']);
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) if (host) origins.add(`https://${host}`);
  if (env.NODE_ENV === 'development') origins.add(new URL(request.url).origin);
  return origins.has(request.headers.get('origin'));
}
export function cookie(request, name) {
  return request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}
export function setCookie(request, name, value, age) {
  return `${name}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function database(env, fetchImpl = fetch) {
  const key = secretKey(env);
  const headers = {apikey: key};
  if (key && !key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  async function call(path, init = {}) {
    const response = await fetchImpl(`${env.SUPABASE_URL.replace(/\/$/, '')}${path}`, {...init, headers: {...headers, ...init.headers}, signal: AbortSignal.timeout(10000)});
    const payload = await response.json();
    if (!response.ok) { const error = new Error('Storage request failed'); error.code = payload?.code; error.detail = payload?.message; throw error; }
    return payload;
  }
  return {call, rpc: (name, input = {}) => call(`/rest/v1/rpc/${name}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input)})};
}
export async function rateLimit(request, env, rpc, scope) {
  const identity = env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'development';
  const hash = createHmac('sha256', env.RSVP_RATE_LIMIT_SECRET || secretKey(env)).update(`${scope}:${identity}`).digest('hex');
  return rpc('wedding_rsvp_rate_limit', {p_key: hash});
}
export async function readJson(request, max = 12000) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw Object.assign(new Error('Please use the form.'), {status: 415});
  if (Number(request.headers.get('content-length')) > max) throw Object.assign(new Error('Your response is too long.'), {status: 413});
  const raw = await request.text();
  if (Buffer.byteLength(raw) > max) throw Object.assign(new Error('Your response is too long.'), {status: 413});
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('Please check the form and try again.'), {status: 400}); }
}
