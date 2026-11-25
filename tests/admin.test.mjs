import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTestDatabase} from '../server/test-db.mjs';
import {adminSession, createAdminHandler, createPhotoHandler} from '../server/admin.mjs';
import {createStoryHandler} from '../server/story.mjs';
import {responsesCsv} from '../shared/csv.mjs';
let db, admin, photo, story, cookie, setup;
const origin = 'https://flois-and-age.vercel.app';
const env = {SUPABASE_URL: 'https://test.invalid', SUPABASE_SECRET_KEY: 'sb_secret_test_only', WEDDING_ADMIN_PASSWORD: 'test-only-organiser-password', VERCEL: '1'};
let ip = 1;
const get = cookie => new Request(`${origin}/api/admin`, {headers: {Cookie: cookie || ''}});
const post = (body, cookie = '', extra = {}) => new Request(`${origin}/api/admin`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin, Cookie: cookie, 'x-vercel-forwarded-for': `192.0.2.${ip++}`, ...extra}, body: JSON.stringify(body)});
before(async () => {
  setup = await createTestDatabase(); db = setup.db;
  admin = createAdminHandler({env, fetchImpl: setup.fetchRpc}); photo = createPhotoHandler({env, fetchImpl: setup.fetchRpc}); story = createStoryHandler({env, fetchImpl: setup.fetchRpc});
});
after(async () => {await db?.close();});

test('private dashboard requires a server verified session and protects password login', async () => {
  assert.equal((await admin(get())).status, 401);
  assert.equal((await admin(post({action: 'login', password: 'wrong'}))).status, 401);
  assert.equal((await admin(post({action: 'login', password: env.WEDDING_ADMIN_PASSWORD}, '', {Origin: 'https://attacker.invalid'}))).status, 403);
  const login = await admin(post({action: 'login', password: env.WEDDING_ADMIN_PASSWORD}));
  assert.equal(login.status, 200); assert.match(login.headers.get('Set-Cookie'), /HttpOnly; SameSite=Lax; Max-Age=14400; Secure/);
  cookie = login.headers.get('Set-Cookie').split(';')[0];
  assert.equal(adminSession(get(cookie), env), true);
  assert.equal(adminSession(get(cookie), env, Date.now() + 14401000), false);
  assert.equal(adminSession(get(cookie + 'X'), env), false);
  assert.equal(adminSession(get(cookie), {...env, WEDDING_ADMIN_PASSWORD: 'a-different-password'}), false);
  assert.equal((await admin(get(cookie))).status, 200);
  assert.equal((await createAdminHandler({env: {...env, WEDDING_ADMIN_PASSWORD: ''}})(get())).status, 503);
});

test('dashboard returns both names and server calculated headcount without receipt hashes', async () => {
  await db.query("select public.wedding_direct_save($1,'Demo Guest','Demo Partner','demo@example.com',true,'Vegetarian','A song')", ['a'.repeat(64)]);
  const response = await admin(get(cookie)); const data = await response.json();
  assert.equal(data.responses.length, 1); assert.equal(data.responses[0].partnerName, 'Demo Partner'); assert.equal(data.responses[0].guestCount, 2);
  assert.ok(!JSON.stringify(data).includes('receipt_hash')); assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('draft story stays private; only approved story and photos are returned to guests', async () => {
  assert.equal((await (await story(get())).json()).story, null);
  const body = {action: 'story', title: 'Our story', text: 'Local demonstration copy for the story editor.', photos: [], published: false};
  assert.equal((await admin(post(body))).status, 401);
  assert.equal((await admin(post(body, cookie))).status, 200);
  assert.equal((await (await story(get())).json()).story, null);
  const published = await admin(post({...body, published: true}, cookie)); assert.equal(published.status, 200);
  assert.equal((await (await story(get())).json()).story.body, body.text);
  for (const extra of [{text: ''}, {photos: [{path: 'https://evil.invalid/photo.svg', caption: 'Bad'}]}, {photos: Array(7).fill({path: 'story/00000000-0000-0000-0000-000000000000.jpg', caption: 'Too many'})}]) assert.equal((await admin(post({...body, published: true, ...extra}, cookie))).status, 400);
});

test('photo upload is authenticated, size/type checked and served with a signed URL', async () => {
  const upload = (bytes, type, auth = cookie) => new Request(`${origin}/api/photo`, {method: 'POST', headers: {Origin: origin, Cookie: auth, 'Content-Type': type}, body: bytes});
  assert.equal((await photo(upload(new Uint8Array(20), 'image/png', ''))).status, 401);
  assert.equal((await photo(upload(new Uint8Array(20), 'image/svg+xml'))).status, 415);
  assert.equal((await photo(upload(new Uint8Array(3000001), 'image/png'))).status, 413);
  assert.equal((await photo(upload(new Uint8Array(20), 'image/png'))).status, 415);
  const bytes = readFileSync(new URL('../public/assets/branding/monogram-fa.png', import.meta.url));
  const response = await photo(upload(bytes, 'image/png')); assert.equal(response.status, 200);
  const {photo: uploaded} = await response.json(); assert.match(uploaded.path, /^story\/[0-9a-f-]{36}\.png$/); assert.match(uploaded.url, /^https:\/\/test.invalid\/storage\/v1\/object\/sign\/wedding-assets\//);
  assert.equal(setup.objects.size, 1);
  const save = await admin(post({action: 'story', title: 'Our story', text: 'Local demonstration copy for the story editor.', published: true, photos: [{path: uploaded.path, caption: 'Local demonstration artwork'}]}, cookie));
  assert.equal(save.status, 200); assert.equal((await (await story(get())).json()).story.photos.length, 1);
  const bucket = (await db.query("select public, file_size_limit from storage.buckets where id = 'wedding-assets'")).rows[0]; assert.equal(bucket.public, false); assert.equal(Number(bucket.file_size_limit), 3000000);
});

test('CSV retains both names, quotes commas/newlines and neutralises spreadsheet formulas', () => {
  const text = responsesCsv([{name: ' =HYPERLINK("bad")', partnerName: 'Demo, Partner', email: 'demo@example.com', attending: true, guestCount: 2, dietary: 'One\nTwo', song: '+SUM(1,2)', updatedAt: '2026-11-25T12:00:00Z'}]);
  assert.match(text, /"' =HYPERLINK\(""bad""\)"/); assert.match(text, /"Demo, Partner"/); assert.match(text, /"'\+SUM\(1,2\)"/); assert.match(text, /15:00/);
});

test('logout expires the session cookie and password attempts are limited', async () => {
  const response = await admin(post({action: 'logout'}, cookie)); assert.equal(response.status, 200); assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  for (let i = 0; i < 30; i++) assert.equal((await admin(post({action: 'login', password: 'wrong'}, '', {'x-vercel-forwarded-for': '203.0.113.9'}))).status, 401);
  assert.equal((await admin(post({action: 'login', password: 'wrong'}, '', {'x-vercel-forwarded-for': '203.0.113.9'}))).status, 429);
});
