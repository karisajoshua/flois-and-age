export const wedding = {
  names: 'Flois & Åge',
  dateLabel: 'Saturday, 9 January 2027',
  date: '2027-01-09',
  venue: 'Glee Hotel, Nairobi',
  music: import.meta.env?.VITE_WEDDING_MUSIC_URL || '',
  directions: 'https://www.google.com/maps/dir/?api=1&destination=Glee+Hotel+Nairobi',
};

// Calendar-day countdown in the wedding's timezone; no ceremony time is implied.
export function daysUntilWedding(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const today = Date.UTC(part('year'), part('month') - 1, part('day'));
  return Math.max(0, Math.round((Date.UTC(2027, 0, 9) - today) / 86_400_000));
}

export const asset = (path: string) => '/assets/optimized/' + path.replace(/\.png$/, '.webp');
