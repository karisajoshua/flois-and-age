import {answer, configured, database} from './common.mjs';
import {signedStory} from './admin.mjs';
export function createStoryHandler({env = process.env, fetchImpl = fetch} = {}) {
  return async request => {
    if (request.method !== 'GET') return answer(405, {error: 'Method not allowed.'}, {Allow: 'GET'});
    if (!configured(env)) return answer(200, {story: null});
    try {
      const db = database(env, fetchImpl);
      return answer(200, {story: await signedStory(await db.rpc('wedding_story_read', {p_admin: false}), db, env)});
    } catch { return answer(503, {story: null, error: 'Our story is temporarily unavailable.'}); }
  };
}
