import {createHash, createHmac, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {answer, configured, cookie, database, rateLimit, readJson, sameOrigin, secretKey, setCookie} from './common.mjs';
const SESSION_SECONDS = 14400;
const digest = value => createHash('sha256').update(value).digest();
const equal = (a, b) => timingSafeEqual(digest(a), digest(b));
const adminReady = env => configured(env) && typeof env.WEDDING_ADMIN_PASSWORD === 'string' && env.WEDDING_ADMIN_PASSWORD.length >= 16;
const signature = (payload, env) => createHmac('sha256', `${secretKey(env)}:${env.WEDDING_ADMIN_PASSWORD}`).update(payload).digest('base64url');
export function adminSession(request, env, now = Date.now()) {
  if (!adminReady(env)) return false;
  const value = cookie(request, 'fa_admin');
  const parts = value.split('.');
  if (parts.length !== 3 || !/^\d{13}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{22}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return false;
  const expires = Number(parts[0]);
  return expires > now && expires <= now + SESSION_SECONDS * 1000 && equal(parts[2], signature(`${parts[0]}.${parts[1]}`, env));
}
export async function signedStory(story, db, env) {
  if (!story) return null;
  const photos = await Promise.all(story.photos.map(async photo => {
    const signed = await db.call(`/storage/v1/object/sign/wedding-assets/${photo.path}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({expiresIn: 3600})});
    if (typeof signed.signedURL !== 'string' || !signed.signedURL.startsWith('/object/sign/')) throw new Error('Invalid image response');
    return {...photo, url: `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1${signed.signedURL}`};
  }));
  return {...story, photos};
}
export function createAdminHandler({env = process.env, fetchImpl = fetch, now = () => Date.now()} = {}) {
  return async request => {
    if (!['GET', 'POST'].includes(request.method)) return answer(405, {error: 'Method not allowed.'}, {Allow: 'GET, POST'});
    if (request.method === 'POST' && !sameOrigin(request, env)) return answer(403, {error: 'Please use the wedding dashboard.'});
    if (!adminReady(env)) return answer(503, {error: 'The organiser dashboard is awaiting secure setup.'});
    const db = database(env, fetchImpl);
    try {
      if (request.method === 'GET') {
        if (!adminSession(request, env, now())) return answer(401, {error: 'Please sign in.'});
        const [responses, story] = await Promise.all([db.rpc('wedding_dashboard'), db.rpc('wedding_story_read', {p_admin: true})]);
        return answer(200, {responses, story: await signedStory(story, db, env)});
      }
      const body = await readJson(request);
      if (body?.action === 'login') {
        if (!await rateLimit(request, env, db.rpc, 'admin-login')) return answer(429, {error: 'Please try again in 15 minutes.'}, {'Retry-After': '900'});
        if (typeof body.password !== 'string' || !equal(body.password, env.WEDDING_ADMIN_PASSWORD)) return answer(401, {error: 'Please check the organiser password.'});
        const payload = `${now() + SESSION_SECONDS * 1000}.${randomBytes(16).toString('base64url')}`;
        return answer(200, {signedIn: true}, {'Set-Cookie': setCookie(request, 'fa_admin', `${payload}.${signature(payload, env)}`, SESSION_SECONDS)});
      }
      if (!adminSession(request, env, now())) return answer(401, {error: 'Your session has ended. Please sign in again.'});
      if (body?.action === 'logout') return answer(200, {signedIn: false}, {'Set-Cookie': setCookie(request, 'fa_admin', '', 0)});
      if (body?.action !== 'story') return answer(400, {error: 'Please use the dashboard controls.'});
      const {title, text, photos, published} = body;
      if (typeof title !== 'string' || title.trim().length < 2 || title.length > 100 || typeof text !== 'string' || text.length > 4000 || (published && text.trim().length < 20) || typeof published !== 'boolean' || !Array.isArray(photos) || photos.length > 6 || photos.some(photo => !photo || typeof photo.path !== 'string' || !/^story\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(photo.path) || typeof photo.caption !== 'string' || photo.caption.trim().length < 2 || photo.caption.length > 150)) return answer(400, {error: 'Add a title, your story and a short description for each photo (maximum six).'});
      const story = await db.rpc('wedding_story_save', {p_title: title, p_body: text, p_photos: photos.map(({path, caption}) => ({path, caption: caption.trim()})), p_published: published});
      return answer(200, {story: await signedStory(story, db, env)});
    } catch (error) {
      return answer(error?.status || 503, {error: error?.status ? error.message : 'The dashboard could not complete this request. Please try again.'});
    }
  };
}
export function createPhotoHandler({env = process.env, fetchImpl = fetch} = {}) {
  return async request => {
    if (request.method !== 'POST') return answer(405, {error: 'Please use the photo uploader.'}, {Allow: 'POST'});
    if (!sameOrigin(request, env)) return answer(403, {error: 'Please use the dashboard.'});
    if (!adminSession(request, env)) return answer(401, {error: 'Please sign in before uploading photos.'});
    const type = request.headers.get('content-type');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return answer(415, {error: 'Choose a JPG, PNG or WebP photo.'});
    if (Number(request.headers.get('content-length')) > 3000000) return answer(413, {error: 'Choose a photo smaller than 3 MB.'});
    try {
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.length > 3000000 || bytes.length < 12) return answer(413, {error: 'Choose a valid photo smaller than 3 MB.'});
      const matches = type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : type === 'image/png' ? Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10])) : Buffer.from(bytes.slice(0,4)).toString() === 'RIFF' && Buffer.from(bytes.slice(8,12)).toString() === 'WEBP';
      if (!matches) return answer(415, {error: 'The photo format could not be verified. Please choose another file.'});
      const path = `story/${randomUUID()}.${type === 'image/jpeg' ? 'jpg' : type.split('/')[1]}`;
      const db = database(env, fetchImpl);
      await db.call(`/storage/v1/object/wedding-assets/${path}`, {method: 'POST', headers: {'Content-Type': type, 'x-upsert': 'false'}, body: bytes});
      const story = await signedStory({photos: [{path, caption: ''}]}, db, env);
      return answer(200, {photo: story.photos[0]});
    } catch { return answer(503, {error: 'The photo could not be uploaded. Please try again.'}); }
  };
}
