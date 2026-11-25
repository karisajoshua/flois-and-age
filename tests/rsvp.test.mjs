import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRsvpHandler} from '../server/rsvp.mjs';
import {createTestDatabase, demoToken} from '../server/test-db.mjs';
import {invitationToken, validateRsvp} from '../shared/rsvp.mjs';

let db, handler;
const env = {SUPABASE_URL: 'https://test.invalid', SUPABASE_SECRET_KEY: 'sb_secret_test_only', VERCEL: '1', RSVP_ALLOWED_ORIGIN: 'https://flois-and-age.vercel.app'};
const good = {action: 'submit', token: demoToken, name: 'Demo Guest', email: 'demo@example.com', attending: true, dietary: 'Vegetarian'};
let ip = 1;
const request = (body, headers = {}) => new Request('https://flois-and-age.vercel.app/api/rsvp', {method: 'POST', headers: {'Content-Type': 'application/json', Origin: env.RSVP_ALLOWED_ORIGIN, 'x-vercel-forwarded-for': `198.51.100.${ip++}`, ...headers}, body: JSON.stringify(body)});

before(async () => {
  const setup = await createTestDatabase(); db = setup.db;
  handler = createRsvpHandler({env, fetchImpl: setup.fetchRpc});
});
after(async () => { await db?.close(); });

test('personal invitation links and codes retain the opaque token', () => {
  assert.equal(invitationToken(`https://flois-and-age.vercel.app/#invite=${demoToken}`), demoToken);
  assert.equal(invitationToken(`https://flois-and-age.vercel.app/invite/${demoToken}`), demoToken);
  assert.equal(invitationToken(demoToken), demoToken);
  assert.equal(invitationToken('not-an-invitation'), '');
});

test('submit, retry and decline update one row with at most one guest', async () => {
  for (let i = 0; i < 2; i++) {
    const response = await handler(request(good));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).guestCount, 1);
  }
  assert.equal((await db.query('select count(*)::int as n from public.wedding_rsvps')).rows[0].n, 1);
  const decline = await handler(request({...good, attending: false}));
  assert.equal((await decline.json()).guestCount, 0);
  const row = (await db.query('select * from public.wedding_rsvps')).rows[0];
  assert.equal(row.attending, false); assert.equal(row.dietary, ''); assert.equal(row.guest_count, 0);
  const lookup = await handler(request({action: 'lookup', token: demoToken}));
  assert.equal((await lookup.json()).response.attending, false);
});

test('simultaneous submissions cannot create duplicate rows', async () => {
  const responses = await Promise.all(Array.from({length: 4}, () => handler(request(good))));
  assert.ok(responses.every(r => r.status === 200));
  assert.equal((await db.query('select count(*)::int as n from public.wedding_rsvps')).rows[0].n, 1);
});

test('client and server reject added guest fields', async () => {
  for (const extra of [{guestCount: 2}, {attendees: ['Another']}, {plusOne: true}]) {
    assert.equal(validateRsvp({...good, ...extra}).ok, false);
    assert.equal((await handler(request({...good, ...extra}))).status, 400);
  }
  await assert.rejects(db.query("insert into public.wedding_invitations(token_hash, guest_name, allocation) values($1, 'Invalid', 2)", ['b'.repeat(64)]), {code: '23514'});
  await assert.rejects(db.query('update public.wedding_rsvps set guest_count = 2'), {code: '428C9'});
});

test('invalid, expired and revoked invitations cannot read or write responses', async () => {
  assert.equal((await handler(request({...good, token: 'B'.repeat(43)}))).status, 404);
  const hash = createHash('sha256').update(demoToken).digest('hex');
  await db.query('update public.wedding_invitations set active = false where token_hash = $1', [hash]);
  assert.equal((await handler(request(good))).status, 404);
  await db.query("update public.wedding_invitations set active = true, expires_at = now() - interval '1 minute' where token_hash = $1", [hash]);
  assert.equal((await handler(request({action: 'lookup', token: demoToken}))).status, 404);
  await db.query('update public.wedding_invitations set expires_at = null where token_hash = $1', [hash]);
});

test('anonymous and ordinary signed-in roles cannot read tables or execute RSVP RPCs', async () => {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.transaction(async tx => { await tx.exec(`set local role ${role}`); await tx.query('select * from public.wedding_rsvps'); }), {code: '42501'});
    await assert.rejects(db.transaction(async tx => { await tx.exec(`set local role ${role}`); await tx.query('select public.wedding_rsvp_lookup($1)', ['a'.repeat(64)]); }), {code: '42501'});
  }
  const rows = (await db.query("select relname, relrowsecurity from pg_class where relname in ('wedding_rsvps','wedding_invitations','wedding_rsvp_attempts')")).rows;
  assert.equal(rows.length, 3); assert.ok(rows.every(r => r.relrowsecurity));
});

test('rate limiting persists across handler instances', async () => {
  const client = {'x-vercel-forwarded-for': '203.0.113.8'};
  for (let i = 0; i < 30; i++) assert.equal((await handler(request({action: 'lookup', token: demoToken}, client))).status, 200);
  const response = await handler(request(good, client));
  assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '900');
  assert.equal((await db.query("select count(*)::int as n from public.wedding_rsvp_attempts where key_hash = '203.0.113.8'")).rows[0].n, 0);
});

test('origin, method, payload and availability checks never falsely confirm', async () => {
  assert.equal((await handler(request(good, {Origin: 'https://other.invalid'}))).status, 403);
  assert.equal((await handler(new Request('https://flois-and-age.vercel.app/api/rsvp', {method: 'DELETE'}))).status, 405);
  assert.equal((await handler(request({...good, dietary: 'x'.repeat(5000)}))).status, 413);
  assert.equal((await handler(request({...good, email: 'invalid'}))).status, 400);
  assert.equal((await handler(request({...good, token: [demoToken]}))).status, 400);
  assert.equal((await handler(request({...good, website: 'spam'}))).status, 400);
  const unconfigured = createRsvpHandler({env: {}});
  assert.deepEqual(await (await unconfigured(new Request('https://flois-and-age.vercel.app/api/rsvp'))).json(), {available: false});
  const response = await unconfigured(request(good));
  assert.equal(response.status, 503); assert.equal((await response.json()).saved, undefined);
});

test('storage errors return no secrets or saved state', async () => {
  const broken = createRsvpHandler({env, fetchImpl: async () => { throw new Error(env.SUPABASE_SECRET_KEY); }});
  const response = await broken(request(good)); const text = await response.text();
  assert.equal(response.status, 503); assert.ok(!text.includes(env.SUPABASE_SECRET_KEY)); assert.ok(!text.includes(demoToken));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
