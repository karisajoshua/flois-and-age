import {createHash, randomBytes} from 'node:crypto';
import {validateRsvp} from '../shared/rsvp.mjs';
import {answer, configured, cookie, database, rateLimit, readJson, sameOrigin, setCookie} from './common.mjs';

export function createRsvpHandler({env = process.env, fetchImpl = fetch} = {}) {
  return async function handle(request) {
    if (!['GET', 'POST'].includes(request.method)) return answer(405, {error: 'Please use the RSVP form.'}, {Allow: 'GET, POST'});
    if (request.method === 'POST' && !sameOrigin(request, env)) return answer(403, {error: 'Please respond from the wedding invitation.'});
    if (!configured(env)) return answer(request.method === 'GET' ? 200 : 503, {available: false, error: 'RSVP is being prepared. Your response has not been sent.'});
    const stored = cookie(request, 'fa_rsvp');
    const receipt = /^[A-Za-z0-9_-]{43}$/.test(stored) ? stored : randomBytes(32).toString('base64url');
    const receiptHash = createHash('sha256').update(receipt).digest('hex');
    const cookies = {'Set-Cookie': setCookie(request, 'fa_rsvp', receipt, 31536000)};
    const {rpc} = database(env, fetchImpl);
    try {
      if (request.method === 'GET') return answer(200, {available: true, response: await rpc('wedding_direct_lookup', {p_receipt: receiptHash})}, cookies);
      if (!await rateLimit(request, env, rpc, 'rsvp')) return answer(429, {error: 'A few too many attempts. Please try again in 15 minutes.'}, {'Retry-After': '900'});
      const body = await readJson(request, 4096);
      if (body?.action !== 'submit') return answer(400, {error: 'Please use the RSVP form.'});
      const checked = validateRsvp(body);
      if (!checked.ok) return answer(400, {error: checked.error});
      const input = checked.value;
      const saved = await rpc('wedding_direct_save', {p_receipt: receiptHash, p_name: input.name, p_partner: input.partnerName, p_email: input.email, p_attending: input.attending, p_dietary: input.dietary, p_song: input.song});
      const count = input.attending ? (input.partnerName ? 2 : 1) : 0;
      if (saved?.saved !== true || saved.guestCount !== count) throw new Error('Unexpected RSVP storage response');
      return answer(200, saved, cookies);
    } catch (error) {
      if (error?.status) return answer(error.status, {error: error.message});
      if (error?.code === '23505') return answer(409, {error: 'A response already uses this email. To update it, return on the original browser or contact the couple.'});
      if (error?.code === '22023') return answer(400, {error: 'Please check the names, email address and attendance choice.'});
      return answer(503, {error: 'We could not save your response right now. Please try again. No confirmation has been issued.'});
    }
  };
}
