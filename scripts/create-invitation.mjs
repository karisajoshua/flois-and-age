import {randomBytes, createHash} from 'node:crypto';
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!process.env.SUPABASE_URL || !key) throw new Error('Set the server-only Supabase environment variables first.');
let input = '';
for await (const chunk of process.stdin) input += chunk;
const guest = JSON.parse(input);
if (typeof guest.name !== 'string' || guest.name.trim().length < 2 || guest.name.trim().length > 100) throw new Error('Provide one guest name as JSON on stdin.');
const token = randomBytes(32).toString('base64url');
const headers = {'Content-Type': 'application/json', apikey: key, Prefer: 'return=minimal'};
if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/wedding_invitations`, {method: 'POST', headers,
  body: JSON.stringify({token_hash: createHash('sha256').update(token).digest('hex'), guest_name: guest.name.trim(), allocation: 1}), signal: AbortSignal.timeout(10000)});
if (!response.ok) throw new Error(`Invitation could not be created (${response.status}).`);
const origin = process.env.RSVP_ALLOWED_ORIGIN || 'https://flois-and-age.vercel.app';
process.stdout.write(JSON.stringify({name: guest.name.trim(), invitation: `${origin}/#invite=${token}`}) + '\n');
