import {readFileSync, readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

export async function createTestDatabase() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);');
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const filename of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(filename, migrations), 'utf8'));
  const objects = new Map();
  const fetchRpc = async (url, init) => {
    const path = new URL(url).pathname;
    if (path.startsWith('/storage/v1/object/sign/wedding-assets/')) return Response.json({signedURL: `/object/sign/wedding-assets/${path.split('/wedding-assets/')[1]}?token=local-only`});
    if (path.startsWith('/storage/v1/object/wedding-assets/')) {objects.set(path.split('/wedding-assets/')[1], {bytes: init.body, type: init.headers['Content-Type']}); return Response.json({Key: path});}
    const name = path.split('/').pop();
    const argumentsByName = {
      wedding_rsvp_rate_limit: ['p_key'], wedding_rsvp_lookup: ['p_token_hash'],
      wedding_rsvp_save: ['p_token_hash', 'p_name', 'p_email', 'p_attending', 'p_dietary'],
      wedding_direct_lookup: ['p_receipt'], wedding_direct_save: ['p_receipt', 'p_name', 'p_partner', 'p_email', 'p_attending', 'p_dietary', 'p_song'],
      wedding_dashboard: [], wedding_story_read: ['p_admin'], wedding_story_save: ['p_title', 'p_body', 'p_photos', 'p_published'],
    };
    if (!argumentsByName[name]) return Response.json({code: '42883'}, {status: 404});
    const body = JSON.parse(init.body);
    try {
      const value = await db.transaction(async tx => {
        await tx.exec('set local role service_role');
        const result = await tx.query(`select public.${name}(${argumentsByName[name].map((_, i) => '$' + (i + 1)).join(',')}) as value`, argumentsByName[name].map(k => k === 'p_photos' ? JSON.stringify(body[k]) : body[k]));
        return result.rows[0].value;
      });
      return Response.json(value ?? null);
    } catch (error) { return Response.json({code: error.code, message: error.message}, {status: 400}); }
  };
  return {db, fetchRpc, objects};
}
