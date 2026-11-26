export function validateRsvp(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {ok: false, error: 'Please check your response.'};
  const allowed = new Set(['action', 'name', 'partnerName', 'email', 'attending', 'dietary', 'song', 'website']);
  if (Object.keys(value).some(key => !allowed.has(key))) return {ok: false, error: 'Please include at most two named guests.'};
  if (value.website) return {ok: false, error: 'We could not accept this response. Please try again.'};
  const name = typeof value.name === 'string' ? value.name.trim().replace(/\s+/g, ' ') : '';
  const partnerName = typeof value.partnerName === 'string' ? value.partnerName.trim().replace(/\s+/g, ' ') : '';
  const validName = name => name.length >= 2 && name.length <= 100 && !/[\u0000-\u001f\u007f]/.test(name);
  if (!validName(name)) return {ok: false, error: 'Please enter your full name (2–100 characters).'};
  if ((value.partnerName != null && typeof value.partnerName !== 'string') || (partnerName && !validName(partnerName))) return {ok: false, error: 'Please enter your partner’s full name (2–100 characters).'};
  if (partnerName && name.toLowerCase() === partnerName.toLowerCase()) return {ok:false,error:'Please enter two different guest names.'};
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {ok: false, error: 'Please enter a valid email address.'};
  if (typeof value.attending !== 'boolean') return {ok: false, error: 'Please choose whether you can attend.'};
  const dietary = typeof value.dietary === 'string' ? value.dietary.trim() : '';
  const song = typeof value.song === 'string' ? value.song.trim() : '';
  if (dietary.length > 500 || song.length > 200) return {ok: false, error: 'Please keep dietary requests within 500 characters and song requests within 200.'};
  return {ok: true, value: {name, partnerName, email, attending: value.attending, dietary: value.attending ? dietary : '', song: value.attending ? song : ''}};
}
