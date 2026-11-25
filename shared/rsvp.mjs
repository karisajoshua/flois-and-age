export const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function invitationToken(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (INVITATION_TOKEN_PATTERN.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed, 'https://flois-and-age.vercel.app');
    const token = new URLSearchParams(url.hash.slice(1)).get('invite') || url.pathname.match(/^\/invite\/([^/]+)\/?$/)?.[1] || '';
    return INVITATION_TOKEN_PATTERN.test(token) ? token : '';
  } catch { return ''; }
}

export function validateRsvp(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {ok: false, error: 'Please check your response.'};
  const allowed = new Set(['action', 'token', 'name', 'email', 'attending', 'dietary', 'website']);
  if (Object.keys(value).some(key => !allowed.has(key))) return {ok: false, error: 'Each invitation is for one guest. Please send only your own response.'};
  if (typeof value.token !== 'string' || !INVITATION_TOKEN_PATTERN.test(value.token)) return {ok: false, error: 'Please use your personal invitation link or code.'};
  if (value.website) return {ok: false, error: 'We could not accept this response. Please try again.'};
  const name = typeof value.name === 'string' ? value.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) return {ok: false, error: 'Please enter your name (2–100 characters).'};
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {ok: false, error: 'Please enter a valid email address.'};
  if (typeof value.attending !== 'boolean') return {ok: false, error: 'Please choose whether you can attend.'};
  const dietary = typeof value.dietary === 'string' ? value.dietary.trim() : '';
  if (dietary.length > 500) return {ok: false, error: 'Please keep dietary requests within 500 characters.'};
  return {ok: true, value: {token: value.token, name, email, attending: value.attending, dietary: value.attending ? dietary : ''}};
}
