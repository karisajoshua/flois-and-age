import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

export const demoToken = 'A'.repeat(43);
export async function createTestDatabase() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('../supabase/migrations/20261125074252_single_guest_rsvp.sql', import.meta.url), 'utf8'));
  await db.query('insert into public.wedding_invitations(token_hash, guest_name) values($1, $2)', [createHash('sha256').update(demoToken).digest('hex'), 'Demo Guest']);
  const fetchRpc = async (url, init) => {
    const name = new URL(url).pathname.split('/').pop();
    const argumentsByName = {
      wedding_rsvp_rate_limit: ['p_key'], wedding_rsvp_lookup: ['p_token_hash'],
      wedding_rsvp_save: ['p_token_hash', 'p_name', 'p_email', 'p_attending', 'p_dietary'],
    };
    if (!argumentsByName[name]) return Response.json({code: '42883'}, {status: 404});
    const body = JSON.parse(init.body);
    try {
      const value = await db.transaction(async tx => {
        await tx.exec('set local role service_role');
        const result = await tx.query(`select public.${name}(${argumentsByName[name].map((_, i) => '$' + (i + 1)).join(',')}) as value`, argumentsByName[name].map(k => body[k]));
        return result.rows[0].value;
      });
      return Response.json(value);
    } catch (error) { return Response.json({code: error.code, message: error.message}, {status: 400}); }
  };
  return {db, fetchRpc};
}
