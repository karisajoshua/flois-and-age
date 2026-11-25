import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createRsvpHandler} from '../server/rsvp.mjs';
import {createTestDatabase} from '../server/test-db.mjs';
import {validateRsvp} from '../shared/rsvp.mjs';

let db, handler;
const origin = 'https://flois-and-age.vercel.app';
const env = {SUPABASE_URL: 'https://test.invalid', SUPABASE_SECRET_KEY: 'sb_secret_test_only', VERCEL: '1', RSVP_ALLOWED_ORIGIN: origin};
const good = {action: 'submit', name: 'Demo Guest', partnerName: '', email: 'demo@example.com', attending: true, dietary: 'Vegetarian', song: 'A song'};
let ip = 1;
const request = (body, cookie = '', headers = {}) => new Request(`${origin}/api/rsvp`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin, 'x-vercel-forwarded-for': `198.51.100.${ip++}`, Cookie: cookie, ...headers}, body: JSON.stringify(body)});
const ownGet = cookie => handler(new Request(`${origin}/api/rsvp`, {headers: {Cookie: cookie}}));
const receipt = async () => (await ownGet('')).headers.get('Set-Cookie').split(';')[0];
before(async () => {const setup = await createTestDatabase(); db = setup.db; handler = createRsvpHandler({env, fetchImpl: setup.fetchRpc});});
after(async () => {await db?.close();});

test('direct RSVP needs no invitation code; couples, repeat saves and declines keep one response', async () => {
  const owner = await receipt();
  assert.match(owner, /^fa_rsvp=[A-Za-z0-9_-]{43}$/);
  const first = await handler(request(good, owner));
  assert.equal(first.status, 200); assert.equal((await first.json()).guestCount, 1);
  assert.match(first.headers.get('Set-Cookie'), /HttpOnly; SameSite=Lax; Max-Age=31536000; Secure/);
  const couple = {...good, partnerName: 'Demo Partner'};
  for (let i = 0; i < 2; i++) assert.equal((await (await handler(request(couple, owner))).json()).guestCount, 2);
  assert.equal((await db.query('select count(*)::int as n from public.wedding_guest_responses')).rows[0].n, 1);
  const found = await (await ownGet(owner)).json(); assert.equal(found.response.partnerName, 'Demo Partner');
  const decline = await handler(request({...couple, attending: false}, owner));
  assert.equal((await decline.json()).guestCount, 0);
  const row = (await db.query('select * from public.wedding_guest_responses')).rows[0];
  assert.equal(row.partner_name, 'Demo Partner'); assert.equal(row.dietary, ''); assert.equal(row.song, ''); assert.equal(row.guest_count, 0);
  const single = await handler(request({...good, partnerName: ''}, owner)); assert.equal((await single.json()).guestCount, 1);
});

test('email alone cannot read or overwrite another response', async () => {
  const other = await receipt();
  assert.equal((await (await ownGet(other)).json()).response, null);
  assert.equal((await handler(request({...good, name: 'Another Person'}, other))).status, 409);
  assert.equal((await handler(request({action: 'lookup', email: good.email}, other))).status, 400);
  assert.equal((await db.query('select guest_name from public.wedding_guest_responses')).rows[0].guest_name, 'Demo Guest');
});

test('simultaneous retries are idempotent and cannot create duplicate response rows', async () => {
  const owner = await receipt(); const input = {...good, email: 'retry@example.com', partnerName: 'Demo Partner'};
  const responses = await Promise.all(Array.from({length: 4}, () => handler(request(input, owner))));
  assert.ok(responses.every(r => r.status === 200));
  assert.equal((await db.query('select count(*)::int as n from public.wedding_guest_responses where email = $1', [input.email])).rows[0].n, 1);
});

test('two named guests is the limit, enforced by validation and generated database count', async () => {
  const owner = await receipt();
  for (const extra of [{guestCount: 3}, {attendees: ['A','B','C']}, {partnerName: ['A', 'B']}, {plusOne: true}]) {
    assert.equal(validateRsvp({...good, ...extra}).ok, false);
    assert.equal((await handler(request({...good, ...extra}, owner))).status, 400);
  }
  await assert.rejects(db.query('update public.wedding_guest_responses set guest_count = 3'), {code: '428C9'});
  await assert.rejects(db.query("update public.wedding_guest_responses set partner_name = 'X'"), {code: '23514'});
  assert.equal(validateRsvp({...good, name: ' Åge ', partnerName: ' Flois ', email: ' COUPLE@EXAMPLE.COM '}).value.email, 'couple@example.com');
});

test('anon and ordinary signed-in users cannot read private tables or execute RSVP/dashboard/story functions', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['wedding_guest_responses','wedding_story','wedding_rsvps','wedding_invitations']) await assert.rejects(db.transaction(async tx => {await tx.exec(`set local role ${role}`); await tx.query(`select * from public.${table}`);}), {code: '42501'});
    for (const call of ["wedding_direct_lookup('" + 'a'.repeat(64) + "')", 'wedding_dashboard()', 'wedding_story_read(true)']) await assert.rejects(db.transaction(async tx => {await tx.exec(`set local role ${role}`); await tx.query(`select public.${call}`);}), {code: '42501'});
  }
  const rows = (await db.query("select relname, relrowsecurity from pg_class where relname in ('wedding_guest_responses','wedding_story','wedding_rsvps','wedding_invitations','wedding_rsvp_attempts')")).rows;
  assert.equal(rows.length, 5); assert.ok(rows.every(r => r.relrowsecurity));
});

test('rate limiting persists across requests without storing raw IP addresses', async () => {
  const owner = await receipt(); const headers = {'x-vercel-forwarded-for': '203.0.113.8'};
  for (let i = 0; i < 30; i++) assert.equal((await handler(request({...good, email: 'limit@example.com'}, owner, headers))).status, 200);
  const response = await handler(request(good, owner, headers));
  assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '900');
  assert.equal((await db.query("select count(*)::int as n from public.wedding_rsvp_attempts where key_hash = '203.0.113.8'")).rows[0].n, 0);
});

test('origin, method, oversized payloads, malformed input and unavailable storage cannot falsely confirm', async () => {
  assert.equal((await handler(request(good, '', {Origin: 'https://other.invalid'}))).status, 403);
  assert.equal((await handler(new Request(`${origin}/api/rsvp`, {method: 'DELETE'}))).status, 405);
  assert.equal((await handler(request({...good, dietary: 'x'.repeat(5000)}))).status, 413);
  for (const extra of [{email: 'invalid'}, {attending: 'yes'}, {website: 'spam'}, {dietary: 'x'.repeat(501)}]) assert.equal((await handler(request({...good, ...extra}))).status, 400);
  const unconfigured = createRsvpHandler({env: {}});
  assert.equal((await (await unconfigured(new Request(`${origin}/api/rsvp`))).json()).available, false);
  assert.equal((await unconfigured(request(good))).status, 503);
  const broken = createRsvpHandler({env, fetchImpl: async () => {throw new Error(env.SUPABASE_SECRET_KEY);}});
  const response = await broken(request(good)); const text = await response.text();
  assert.equal(response.status, 503); assert.ok(!text.includes(env.SUPABASE_SECRET_KEY)); assert.ok(!text.includes('saved'));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
