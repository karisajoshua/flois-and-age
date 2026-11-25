// Quote every field and neutralise spreadsheet formula injection, including leading whitespace.
const cell = value => {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export function responsesCsv(rows) {
  const columns = ['Guest name', 'Partner name', 'Email', 'Attendance', 'Places', 'Dietary requirements', 'Song request', 'Updated (Africa/Nairobi)'];
  const date = value => new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi'}).format(new Date(value));
  return '\uFEFF' + [columns, ...rows.map(r => [r.name, r.partnerName, r.email, r.attending ? 'Attending' : 'Declined', r.guestCount, r.dietary, r.song, date(r.updatedAt)])].map(row => row.map(cell).join(',')).join('\r\n');
}
